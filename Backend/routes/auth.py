from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, UserRole
from auth import auth_handler
from cache import cache
import logging
from services.admin_service import AdminService

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# Pydantic models for request/response
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    company_name: str | None = None
    company_website: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class DeleteAccountRequest(BaseModel):
    password: str

@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user_data.email.strip().lower()))
    existing_user = result.scalars().first()

    # Existing user: allow CANDIDATE to "claim account" (e.g. after guest apply)
    if existing_user:
        if existing_user.role == UserRole.CANDIDATE:
            # Claim account: set password and optionally update name
            existing_user.password_hash = auth_handler.hash_password(user_data.password)
            existing_user.name = user_data.name.strip()
            await db.commit()
            await db.refresh(existing_user)
            token = auth_handler.encode_token(existing_user.id, existing_user.role.value)
            return TokenResponse(
                access_token=token,
                user=UserResponse(
                    id=existing_user.id,
                    name=existing_user.name,
                    email=existing_user.email,
                    role=existing_user.role.value
                )
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password and create new user
    hashed_password = auth_handler.hash_password(user_data.password)

    if user_data.role == UserRole.CANDIDATE:
        is_approved = True
        approval_status = "approved"
    elif user_data.role == UserRole.ADMIN:
        is_approved = True
        approval_status = "approved"
    else:
        is_approved = False
        approval_status = "pending"

    user = User(
        name=user_data.name.strip(),
        email=user_data.email.strip().lower(),
        password_hash=hashed_password,
        role=user_data.role,
        is_approved=is_approved,
        approval_status=approval_status,
        company_name=user_data.company_name.strip() if user_data.company_name else None,
        company_website=user_data.company_website.strip() if user_data.company_website else None
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # For pending recruiters, return a special response without token
    if user.role == UserRole.RECRUITER and not user.is_approved:
        # Return a response that frontend can handle to show pending approval message
        return {
            "access_token": "",  # Empty token for pending users
            "token_type": "bearer",
            "status": "pending_approval",
            "message": "Your recruiter account has been created and is pending admin approval.",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role.value
            }
        }
    
    # Generate token for approved users
    token = auth_handler.encode_token(user.id, user.role.value)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email, role=user.role.value)
    )

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).filter(User.email == user_data.email))
    user = result.scalars().first()
    if not user or not auth_handler.verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check recruiter approval status
    if user.role == UserRole.RECRUITER and not user.is_approved:
        if user.approval_status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your recruiter account was rejected. Reason: {user.rejection_reason or 'Contact support for details.'}"
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your recruiter account is pending admin approval. You'll be notified once approved."
        )
    
    # Generate token
    token = auth_handler.encode_token(user.id, user.role.value)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email, role=user.role.value)
    )

# Dependency to get current user from token
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), db: AsyncSession = Depends(get_db)):
    if not credentials:
        logger.warning("AUTH FAILURE: No Authorization header provided in request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated: Missing Authorization Header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    logger.info(f"DEBUG: Processing token starting with: {token[:10]}...")
    
    try:
        current_user_data = auth_handler.get_current_user(token)
    except HTTPException as e:
        logger.error(f"Auth handler failed: {e.detail}")
        raise
    
    # Convert user_id from string back to int for database query
    try:
        user_id = int(current_user_data["user_id"])
        logger.debug(f"Converted user_id to int: {user_id}")
    except (ValueError, TypeError) as e:
        logger.error(f"Failed to convert user_id to int: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: malformed user ID"
        )
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    logger.debug(f"Database query result: {user}")
    if not user:
        logger.error(f"User not found in database for user_id: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    logger.debug(f"Successfully authenticated user: {user.name} (role: {user.role.value})")
    return user

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value
    )

@router.put("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change the current user's password"""
    if not auth_handler.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )
    current_user.password_hash = auth_handler.hash_password(body.new_password)
    await db.commit()
    logger.info(f"Password changed for user {current_user.email}")
    return {"message": "Password updated successfully"}

@router.delete("/delete-account")
async def delete_account(
    body: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete the current user's account and all associated data"""
    if not auth_handler.verify_password(body.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )
    await db.delete(current_user)
    await db.commit()
    logger.info(f"Account deleted: {current_user.email}")
    return {"message": "Account deleted successfully"}

# Dependencies for role-based access
async def get_current_candidate(user: User = Depends(get_current_user)):
    # Use string comparison for robustness with Enums
    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)
    if role_val != "candidate":
        logger.error(f"Access denied: user {user.name} has role {role_val}, but candidate required")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate access required"
        )
    return user

async def get_current_recruiter(user: User = Depends(get_current_user)):
    # Use string comparison for robustness with Enums
    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)
    
    # Allow admins to access recruiter endpoints
    if role_val == "admin":
        return user
    
    if role_val != "recruiter":
        logger.error(f"Access denied: user {user.name} has role {role_val}, but recruiter required")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiter access required"
        )
    
    # Check if recruiter is approved
    if not user.is_approved:
        logger.error(f"Access denied: recruiter {user.name} is not approved (status: {user.approval_status})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your recruiter account is pending approval. Please wait for admin verification."
        )
    
    logger.debug(f"Recruiter access granted for user: {user.name}")
    return user

async def get_current_admin(user: User = Depends(get_current_user)):
    logger.debug(f"get_current_admin called for user: {user.name} (role: {user.role.value})")
    if user.role != UserRole.ADMIN:
        logger.error(f"Access denied: user {user.name} has role {user.role.value}, but admin role required")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this resource"
        )
    logger.debug(f"Admin access granted for user: {user.name}")
    return user


# ==================== ADMIN ENDPOINTS ====================
# Note: In production, these should be protected with admin-only authentication

@router.get("/admin/pending-recruiters")
async def get_pending_recruiters(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending recruiter applications (Admin only)"""
    pending_users = await AdminService.get_pending_recruiters(db)
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company_name": user.company_name,
            "company_website": user.company_website,
            "created_at": user.created_at.isoformat()
        }
        for user in pending_users
    ]

@router.post("/admin/approve-recruiter/{user_id}")
async def approve_recruiter(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Approve a recruiter account (Admin only)"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != UserRole.RECRUITER:
        raise HTTPException(status_code=400, detail="User is not a recruiter")
    
    response = await AdminService.approve_recruiter(user, current_admin.name, db)
    return response

@router.post("/admin/reject-recruiter/{user_id}")
async def reject_recruiter(
    user_id: int, 
    reason: str = "Account verification failed",
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reject a recruiter account (Admin only)"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != UserRole.RECRUITER:
        raise HTTPException(status_code=400, detail="User is not a recruiter")
    
    response = await AdminService.reject_recruiter(user, reason, current_admin.name, db)
    return response

@router.get("/admin/all-recruiters")
async def get_all_recruiters(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all recruiters with their approval status (Admin only)"""
    recruiters = await AdminService.get_all_recruiters(db)
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "approval_status": user.approval_status,
            "is_approved": user.is_approved,
            "company_name": user.company_name,
            "company_website": user.company_website,
            "created_at": user.created_at.isoformat(),
            "rejection_reason": user.rejection_reason
        }
        for user in recruiters
    ]

@router.get("/admin/stats")
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    stats = await AdminService.get_admin_dashboard_stats(db)
    return stats

@router.get("/admin/all-candidates")
async def get_all_candidates(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all candidates (Admin only)"""
    candidates = await AdminService.get_all_candidates(db)
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "location": user.location,
            "phone": user.phone,
            "created_at": user.created_at.isoformat(),
        }
        for user in candidates
    ]
