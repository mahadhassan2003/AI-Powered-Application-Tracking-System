from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models import User, UserRole
from routes.auth import get_current_user, get_current_candidate

router = APIRouter()

# Pydantic models
class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    skills: Optional[str] = None
    experience: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    skills: Optional[str] = None
    experience: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        skills=current_user.skills,
        experience=current_user.experience,
        phone=getattr(current_user, "phone", None),
        location=getattr(current_user, "location", None),
        bio=getattr(current_user, "bio", None),
    )

@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Update fields
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.value,
        skills=current_user.skills,
        experience=current_user.experience,
        phone=getattr(current_user, "phone", None),
        location=getattr(current_user, "location", None),
        bio=getattr(current_user, "bio", None),
    )