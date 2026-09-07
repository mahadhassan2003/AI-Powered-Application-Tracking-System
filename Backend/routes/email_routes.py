
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from database import get_db
from models import Application, User, Job, UserRole
from routes.auth import get_current_recruiter
from tasks.email_tasks import send_interview_reminder_task, send_bulk_interview_reminders_task, send_rejection_email_task
from services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter()

class InterviewReminderRequest(BaseModel):
    application_ids: List[int]
    interview_datetime: str  # ISO format datetime string
    interview_type: str = "interview"
    additional_details: Optional[str] = ""

class BulkRejectionRequest(BaseModel):
    application_ids: List[int]
    personalized_message: Optional[str] = None

class TestEmailRequest(BaseModel):
    email_type: str  # "welcome", "status_update", "interview_reminder", "rejection"
    recipient_email: str
    test_data: dict = {}

@router.post("/send-interview-reminders")
async def send_interview_reminders(
    request: InterviewReminderRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Send interview reminders to selected candidates"""
    try:
        # Validate that all applications belong to current recruiter's jobs
        result = await db.execute(
            select(Application).join(Job).filter(
                Application.id.in_(request.application_ids),
                Job.recruiter_id == current_user.id
            )
        )
        applications = result.scalars().all()
        
        if len(applications) != len(request.application_ids):
            raise HTTPException(status_code=403, detail="Some applications don't belong to your jobs")
        
        # Parse datetime
        try:
            interview_date = datetime.fromisoformat(request.interview_datetime)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format.")
        
        # Send bulk reminders via BackgroundTasks (bypass Celery worker)
        background_tasks.add_task(
            send_bulk_interview_reminders_task,
            None,
            request.application_ids,
            request.interview_datetime,
            request.interview_type,
            request.additional_details
        )
        
        return {
            "message": "Interview reminders queued successfully",
            "application_count": len(request.application_ids),
            "interview_datetime": request.interview_datetime
        }
        
    except Exception as e:
        logger.error(f"Error sending interview reminders: {e}")
        raise HTTPException(status_code=500, detail="Failed to send interview reminders")

@router.post("/send-bulk-rejections")
async def send_bulk_rejections(
    request: BulkRejectionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Send rejection emails to selected candidates"""
    try:
        # Validate that all applications belong to current recruiter's jobs
        result = await db.execute(
            select(Application).join(Job).filter(
                Application.id.in_(request.application_ids),
                Job.recruiter_id == current_user.id
            )
        )
        applications = result.scalars().all()
        
        if len(applications) != len(request.application_ids):
            raise HTTPException(status_code=403, detail="Some applications don't belong to your jobs")
        
        # Send rejection emails via BackgroundTasks (bypass Celery worker)
        for app_id in request.application_ids:
            background_tasks.add_task(
                send_rejection_email_task, None, app_id, request.personalized_message
            )
        
        return {
            "message": "Rejection emails queued successfully",
            "application_count": len(request.application_ids)
        }
        
    except Exception as e:
        logger.error(f"Error sending bulk rejections: {e}")
        raise HTTPException(status_code=500, detail="Failed to send rejection emails")

@router.post("/send-individual-reminder/{application_id}")
async def send_individual_reminder(
    application_id: int,
    interview_datetime: str,
    interview_type: str = "interview",
    additional_details: str = "",
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Send interview reminder to individual candidate"""
    try:
        # Validate application belongs to current recruiter
        result = await db.execute(
            select(Application).join(Job).filter(
                Application.id == application_id,
                Job.recruiter_id == current_user.id
            )
        )
        application = result.scalars().first()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found or not authorized")
        
        # Parse datetime
        try:
            interview_date = datetime.fromisoformat(interview_datetime)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format.")
        
        # Send reminder
        if background_tasks:
            background_tasks.add_task(
                send_interview_reminder_task, None, application_id, interview_datetime, interview_type, additional_details
            )
            return {"message": "Interview reminder queued successfully"}
        else:
            # Send immediately
            result = send_interview_reminder_task(application_id, interview_datetime, interview_type, additional_details)
            return {"message": "Interview reminder sent", "result": result}
        
    except Exception as e:
        logger.error(f"Error sending individual reminder: {e}")
        raise HTTPException(status_code=500, detail="Failed to send interview reminder")

@router.post("/test-email")
async def test_email(
    request: TestEmailRequest,
    current_user: User = Depends(get_current_recruiter)
):
    """Send test email to verify email configuration"""
    try:
        if request.email_type == "welcome":
            success = email_service.send_welcome_email(
                candidate_name=request.test_data.get("candidate_name", "Test Candidate"),
                candidate_email=request.recipient_email,
                job_title=request.test_data.get("job_title", "Test Position"),
                company_name="ATS Company"
            )
        elif request.email_type == "status_update":
            success = email_service.send_status_update_email(
                candidate_name=request.test_data.get("candidate_name", "Test Candidate"),
                candidate_email=request.recipient_email,
                job_title=request.test_data.get("job_title", "Test Position"),
                status=request.test_data.get("status", "shortlisted")
            )
        elif request.email_type == "interview_reminder":
            interview_date = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)
            success = email_service.send_interview_reminder(
                candidate_name=request.test_data.get("candidate_name", "Test Candidate"),
                candidate_email=request.recipient_email,
                job_title=request.test_data.get("job_title", "Test Position"),
                interview_date=interview_date,
                interview_type="video call"
            )
        elif request.email_type == "rejection":
            success = email_service.send_rejection_email(
                candidate_name=request.test_data.get("candidate_name", "Test Candidate"),
                candidate_email=request.recipient_email,
                job_title=request.test_data.get("job_title", "Test Position")
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid email type")
        
        if success:
            return {"message": f"Test {request.email_type} email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
    except Exception as e:
        logger.error(f"Error sending test email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")

@router.get("/email-stats")
async def get_email_stats(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Get email statistics for recruiter's jobs"""
    try:
        # Get all applications for recruiter's jobs
        result = await db.execute(
            select(Application).join(Job).filter(
                Job.recruiter_id == current_user.id
            )
        )
        applications = result.scalars().all()
        
        total_applications = len(applications)
        status_counts = {}
        
        for app in applications:
            status = app.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "total_applications": total_applications,
            "status_breakdown": status_counts,
            "email_automation": {
                "welcome_emails": total_applications,
                "status_updates": sum(1 for app in applications if app.status.value != "applied"),
                "potential_interview_reminders": status_counts.get("interview", 0),
                "potential_rejections": status_counts.get("rejected", 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting email stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get email statistics")

# ==================== AI CAMPAIGN & TEMPLATE ENDPOINTS ====================

from models import EmailTemplate

class CampaignGenerateRequest(BaseModel):
    topic: str
    tone: str = "professional"

class TemplateSaveRequest(BaseModel):
    campaign_name: str
    subject: str
    body_content: str
    category: str = "outreach"

class SmtpUpdateConfig(BaseModel):
    smtp_email: str
    smtp_server: str
    smtp_port: str
    smtp_password: str

@router.get("/smtp-status")
async def get_smtp_status(current_user: User = Depends(get_current_recruiter)):
    return {
        "configured": bool(current_user.smtp_email and current_user.smtp_password),
        "smtp_email": current_user.smtp_email or "",
        "smtp_server": current_user.smtp_server or "smtp.gmail.com",
        "smtp_port": str(current_user.smtp_port) if current_user.smtp_port else "587"
    }

@router.post("/smtp-update")
async def update_smtp_config(
    request: SmtpUpdateConfig, 
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    try:
        current_user.smtp_email = request.smtp_email
        current_user.smtp_server = request.smtp_server
        
        # Handle port conversion safely
        try:
            current_user.smtp_port = int(request.smtp_port)
        except (ValueError, TypeError):
            current_user.smtp_port = 587
            
        # Only update password if provided and not just dots/stars (placeholder)
        new_password = request.smtp_password.strip() if request.smtp_password else ""
        if new_password and not all(c in ".*•" for c in new_password):
            current_user.smtp_password = new_password
            
        current_user.smtp_enabled = True
        current_user.smtp_from_name = current_user.name # Default to recruiter name
        
        await db.commit()
        return {"message": "SMTP configuration updated successfully."}
    except Exception as e:
        logger.error(f"Error updating SMTP config: {e}")
        raise HTTPException(status_code=500, detail="Failed to update SMTP configuration")

@router.post("/smtp-test")
async def test_smtp_connection(
    request: SmtpUpdateConfig,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Test SMTP connection with provided or saved credentials"""
    import smtplib
    
    server = request.smtp_server
    try:
        port = int(request.smtp_port)
    except:
        port = 587
        
    email = request.smtp_email
    
    # Use provided password or fall back to saved one if placeholder provided
    password = request.smtp_password.strip() if request.smtp_password else ""
    if not password or all(c in ".*•" for c in password):
        password = current_user.smtp_password
        
    if not password:
        raise HTTPException(status_code=400, detail="Password is required for testing")

    try:
        # Simple connection test
        if port == 465:
            smtp = smtplib.SMTP_SSL(server, port, timeout=10)
        else:
            smtp = smtplib.SMTP(server, port, timeout=10)
            smtp.starttls()
            
        smtp.login(email, password)
        smtp.quit()
        return {"status": "success", "message": "Connection successful!"}
    except Exception as e:
        logger.error(f"SMTP Test failed: {e}")
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": str(e)}
        )

@router.post("/ai/generate")
async def generate_ai_campaign(request: CampaignGenerateRequest, current_user: User = Depends(get_current_recruiter)):
    from services.email_llm_service import email_llm_service
    result = email_llm_service.generate_campaign(topic=request.topic, tone=request.tone)
    return result

@router.get("/templates")
async def get_templates(current_user: User = Depends(get_current_recruiter), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmailTemplate).filter(EmailTemplate.recruiter_id == current_user.id).order_by(EmailTemplate.created_at.desc()))
    templates = result.scalars().all()
    
    # Auto-seed SMTP defaults if they don't exist yet
    ideal_defaults = [
        ("Welcome Email (System Default)", "Application Received - {{job_title}}", "welcome", "Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}.\n\nWe have successfully received your application and our team will review it shortly.\n\nBest regards,\nThe Hiring Team"),
        ("Interview Reminder (System Default)", "Interview Reminder - {{job_title}}", "reminder", "Dear {{candidate_name}},\n\nThis is a friendly reminder about your upcoming interview for the {{job_title}} position.\n\nPlease confirm your attendance and arrive 10 minutes early.\n\nBest regards,\nThe Hiring Team"),
        ("Rejection Notification (System Default)", "Update on your application - {{job_title}}", "rejection", "Dear {{candidate_name}},\n\nThank you for taking the time to apply for the {{job_title}} position.\n\nAfter careful consideration, we have decided to move forward with other candidates.\n\nWe appreciate your interest in our company.\n\nBest regards,\nThe Hiring Team"),
        ("Shortlisted Notification (System Default)", "Good News! You've been shortlisted - {{job_title}}", "outreach", "Dear {{candidate_name}},\n\nCongratulations! Your application has been shortlisted for further review for the {{job_title}} position at {{company_name}}.\n\nOur team will contact you soon to schedule an interview.\n\nBest regards,\nThe Hiring Team"),
        ("Interview Invitation (System Default)", "Interview Invitation - {{job_title}}", "outreach", "Dear {{candidate_name}},\n\nGreat news! We would like to invite you for an interview for the {{job_title}} position.\n\nYou will receive a separate email with interview details shortly.\n\nBest regards,\nThe Hiring Team"),
        ("Job Offer Notification (System Default)", "Congratulations! Job Offer - {{job_title}}", "outreach", "Dear {{candidate_name}},\n\nCongratulations! We are pleased to offer you the {{job_title}} position at {{company_name}}.\n\nYou will receive a detailed offer letter shortly. Welcome to the team!\n\nBest regards,\nThe Hiring Team"),
        ("Interview Rescheduled (System Default)", "Interview Rescheduled - {{job_title}}", "reminder", "Dear {{candidate_name}},\n\nYour interview for the {{job_title}} position has been successfully rescheduled to a new time.\n\nPlease log in to your candidate portal to view and confirm the newly scheduled date and time.\n\nBest regards,\nThe Hiring Team"),
        ("Negotiation Accepted (System Default)", "Good News! Offer Terms Accepted - {{job_title}}", "follow_up", "Dear {{candidate_name}},\n\nWe are pleased to inform you that your proposed offer terms for the {{job_title}} position have been accepted.\n\nThe recruiter will send over an updated offer letter shortly for your final review.\n\nBest regards,\nThe Hiring Team"),
        ("Negotiation Declined (System Default)", "Update on Offer Terms - {{job_title}}", "follow_up", "Dear {{candidate_name}},\n\nThank you for your proposal regarding the {{job_title}} position.\n\nAfter consideration, we are unable to accommodate the requested terms. Your original offer remains available for your review in the candidate portal.\n\nBest regards,\nThe Hiring Team")
    ]
    
    existing_template_names = {t.campaign_name for t in templates}
    defaults_to_insert = []
    
    for name, subj, cat, body in ideal_defaults:
        if name not in existing_template_names:
            defaults_to_insert.append(
                EmailTemplate(
                    recruiter_id=current_user.id,
                    campaign_name=name,
                    subject=subj,
                    category=cat,
                    body_content=body
                )
            )
            
    if defaults_to_insert:
        db.add_all(defaults_to_insert)
        await db.commit()
        
        # Re-fetch after seeding
        result = await db.execute(select(EmailTemplate).filter(EmailTemplate.recruiter_id == current_user.id).order_by(EmailTemplate.created_at.desc()))
        templates = result.scalars().all()

    return templates

@router.post("/templates")
async def save_template(request: TemplateSaveRequest, current_user: User = Depends(get_current_recruiter), db: AsyncSession = Depends(get_db)):
    template = EmailTemplate(
        recruiter_id=current_user.id,
        campaign_name=request.campaign_name,
        subject=request.subject,
        body_content=request.body_content,
        category=request.category
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.delete("/templates/{template_id}")
async def delete_template(template_id: int, current_user: User = Depends(get_current_recruiter), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmailTemplate).filter(EmailTemplate.id == template_id, EmailTemplate.recruiter_id == current_user.id))
    template = result.scalars().first()
    if not template:
         raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()
    return {"message": "Deleted"}

# ==================== DISPATCH CAMPAIGNS ====================

from models import EmailCampaign
from sqlalchemy.orm import selectinload

class CampaignSendRequest(BaseModel):
    template_id: int
    application_ids: List[int]
    campaign_name: Optional[str] = None

@router.post("/campaigns/send")
async def send_custom_campaign(
    request: CampaignSendRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Validate template
        result = await db.execute(select(EmailTemplate).filter(EmailTemplate.id == request.template_id, EmailTemplate.recruiter_id == current_user.id))
        template = result.scalars().first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
            
        # Create persistent campaign tracking object
        campaign = EmailCampaign(
            recruiter_id=current_user.id,
            template_id=template.id,
            campaign_name=request.campaign_name or f"Campaign: {template.campaign_name}",
            target_application_ids=request.application_ids,
            audience_count=len(request.application_ids)
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        
        # Dispatch via BackgroundTasks (bypass Celery worker)
        background_tasks.add_task(
            send_custom_campaign_task, None, campaign.id
        )
        
        return {"message": "Campaign queued successfully", "campaign_id": campaign.id}
        
    except Exception as e:
        logger.error(f"Error launching campaign: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize campaign dispatcher")

@router.get("/campaigns")
async def get_my_campaigns(current_user: User = Depends(get_current_recruiter), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmailCampaign)
        .options(selectinload(EmailCampaign.template))
        .filter(EmailCampaign.recruiter_id == current_user.id)
        .order_by(EmailCampaign.created_at.desc())
    )
    campaigns = result.scalars().all()
    
    return [
        {
            "id": c.id,
            "campaign_name": c.campaign_name,
            "status": c.status,
            "audience_count": c.audience_count,
            "sent_count": c.sent_count,
            "failed_count": c.failed_count,
            "created_at": c.created_at,
            "template_name": c.template.campaign_name if c.template else None
        }
        for c in campaigns
    ]
