
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import logging

from database import get_db
from models import User, UserRole
from routes.auth import get_current_recruiter

logger = logging.getLogger(__name__)
router = APIRouter()

class SMTPSettingsRequest(BaseModel):
    smtp_server: str
    smtp_port: int
    smtp_email: str
    smtp_password: str
    smtp_from_name: str
    smtp_enabled: bool = True

class SMTPSettingsResponse(BaseModel):
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_enabled: bool = False
    # Don't return password for security

@router.post("/settings")
async def save_smtp_settings(
    settings: SMTPSettingsRequest,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Save SMTP settings for recruiter"""
    try:
        current_user.smtp_server = settings.smtp_server
        current_user.smtp_port = settings.smtp_port
        current_user.smtp_email = settings.smtp_email
        
        # Only update password if a new one is provided
        if settings.smtp_password and settings.smtp_password.strip():
            current_user.smtp_password = settings.smtp_password
        
        current_user.smtp_from_name = settings.smtp_from_name
        current_user.smtp_enabled = settings.smtp_enabled
        
        await db.commit()
        
        logger.info(f"SMTP settings updated for recruiter: {current_user.name}")
        
        return {
            "message": "SMTP settings saved successfully",
            "smtp_enabled": settings.smtp_enabled
        }
        
    except Exception as e:
        logger.error(f"Error saving SMTP settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save SMTP settings")

@router.get("/settings", response_model=SMTPSettingsResponse)
async def get_smtp_settings(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Get SMTP settings for recruiter"""
    try:
        return SMTPSettingsResponse(
            smtp_server=current_user.smtp_server,
            smtp_port=current_user.smtp_port,
            smtp_email=current_user.smtp_email,
            smtp_from_name=current_user.smtp_from_name,
            smtp_enabled=current_user.smtp_enabled or False
        )
        
    except Exception as e:
        logger.error(f"Error retrieving SMTP settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve SMTP settings")

@router.post("/test")
async def test_smtp_connection(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Test SMTP connection with current settings"""
    try:
        if not current_user.smtp_enabled or not current_user.smtp_server:
            raise HTTPException(status_code=400, detail="SMTP settings not configured")
        
        from services.email_service import EmailService
        
        # Create temporary email service with recruiter's settings
        email_service = EmailService(
            smtp_server=current_user.smtp_server,
            smtp_port=current_user.smtp_port,
            smtp_email=current_user.smtp_email,
            smtp_password=current_user.smtp_password,
            smtp_from_name=current_user.smtp_from_name
        )
        
        # Try to create connection
        try:
            server = email_service._create_smtp_connection()
            server.quit()
            return {"message": "SMTP connection successful", "status": "success"}
        except Exception as conn_error:
            logger.error(f"SMTP connection failed: {conn_error}")
            raise HTTPException(status_code=400, detail=f"SMTP connection failed: {str(conn_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing SMTP connection: {e}")
        raise HTTPException(status_code=500, detail="Failed to test SMTP connection")
