
"""
Celery tasks for automated email sequences.

All email tasks use exponential backoff retries (max 3 attempts)
and route to the 'emails' queue via celery_app task_routes.
"""

import os
import logging
from typing import Optional
from datetime import datetime

from services.email_service import email_service
from models import Application, User, Job
from tasks.db import task_db_session

logger = logging.getLogger(__name__)


def send_welcome_email_task(application_id: int):
    """Send welcome email when candidate applies for a job."""
    logger.info(f"Sending welcome email for application {application_id}")

    with task_db_session() as db:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return {"error": "Application not found"}

        candidate = application.candidate
        job = application.job
        recruiter = job.recruiter

        # Use recruiter's SMTP if configured, otherwise use default
        if recruiter.smtp_enabled and recruiter.smtp_server:
            from services.email_service import EmailService
            svc = EmailService(
                smtp_server=recruiter.smtp_server,
                smtp_port=recruiter.smtp_port,
                smtp_email=recruiter.smtp_email,
                smtp_password=recruiter.smtp_password,
                smtp_from_name=recruiter.smtp_from_name,
            )
        else:
            svc = email_service

        success = svc.send_welcome_email(
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            job_title=job.title,
            company_name=recruiter.company_name or "ATS Company",
        )

        if success:
            logger.info(f"Welcome email sent for application {application_id}")
            return {"status": "success", "application_id": application_id}

        logger.error(f"Failed to send welcome email for application {application_id}")
        return {"error": "Email sending failed"}


def send_status_update_email_task(application_id: int, new_status: str):
    """Send email when application status changes."""
    logger.info(f"Sending status update email for application {application_id}, status: {new_status}")

    with task_db_session() as db:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return {"error": "Application not found"}

        candidate = application.candidate
        job = application.job
        recruiter = job.recruiter

        if recruiter.smtp_enabled and recruiter.smtp_server:
            from services.email_service import EmailService
            svc = EmailService(
                smtp_server=recruiter.smtp_server,
                smtp_port=recruiter.smtp_port,
                smtp_email=recruiter.smtp_email,
                smtp_password=recruiter.smtp_password,
                smtp_from_name=recruiter.smtp_from_name,
            )
        else:
            svc = email_service

        success = svc.send_status_update_email(
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            job_title=job.title,
            status=new_status,
        )

        if success:
            logger.info(f"Status update email sent for application {application_id}")
            return {"status": "success", "application_id": application_id, "new_status": new_status}

        logger.error(f"Failed to send status update email for application {application_id}")
        return {"error": "Email sending failed"}


def send_recruiter_notification_task(application_id: int, message: str):
    """Send an email notification directly to the recruiter."""
    logger.info(f"Sending recruiter notification for application {application_id}")

    with task_db_session() as db:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return {"error": "Application not found"}

        job = application.job
        recruiter = job.recruiter

        success = email_service.send_status_update_email(
            candidate_name=recruiter.name,
            candidate_email=recruiter.email,
            job_title=job.title,
            status=message,
        )

        if success:
            return {"status": "success", "application_id": application_id}
        return {"error": "Email sending failed"}


def send_interview_reminder_task(
    application_id: int,
    interview_datetime: str,
    interview_type: str = "interview",
    additional_details: str = "",
):
    """Send interview reminder email."""
    logger.info(f"Sending interview reminder for application {application_id}")

    with task_db_session() as db:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return {"error": "Application not found"}

        candidate = application.candidate
        job = application.job
        recruiter = job.recruiter

        interview_date = datetime.fromisoformat(interview_datetime)

        if recruiter.smtp_enabled and recruiter.smtp_server:
            from services.email_service import EmailService
            svc = EmailService(
                smtp_server=recruiter.smtp_server,
                smtp_port=recruiter.smtp_port,
                smtp_email=recruiter.smtp_email,
                smtp_password=recruiter.smtp_password,
                smtp_from_name=recruiter.smtp_from_name,
            )
        else:
            svc = email_service

        success = svc.send_interview_reminder(
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            job_title=job.title,
            interview_date=interview_date,
            interview_type=interview_type,
            additional_details=additional_details,
        )

        if success:
            logger.info(f"Interview reminder sent for application {application_id}")
            return {"status": "success", "application_id": application_id}

        logger.error(f"Failed to send interview reminder for application {application_id}")
        return {"error": "Email sending failed"}


def send_rejection_email_task(application_id: int, personalized_message: Optional[str] = None):
    """Send rejection notification email."""
    logger.info(f"Sending rejection email for application {application_id}")

    with task_db_session() as db:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return {"error": "Application not found"}

        candidate = application.candidate
        job = application.job
        recruiter = job.recruiter

        if recruiter.smtp_enabled and recruiter.smtp_server:
            from services.email_service import EmailService
            svc = EmailService(
                smtp_server=recruiter.smtp_server,
                smtp_port=recruiter.smtp_port,
                smtp_email=recruiter.smtp_email,
                smtp_password=recruiter.smtp_password,
                smtp_from_name=recruiter.smtp_from_name,
            )
        else:
            svc = email_service

        success = svc.send_rejection_email(
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            job_title=job.title,
            personalized_message=personalized_message,
        )

        if success:
            logger.info(f"Rejection email sent for application {application_id}")
            return {"status": "success", "application_id": application_id}

        logger.error(f"Failed to send rejection email for application {application_id}")
        return {"error": "Email sending failed"}


def send_bulk_interview_reminders_task(
    application_ids: list,
    interview_datetime: str,
    interview_type: str = "interview",
    additional_details: str = "",
):
    """Send interview reminders to multiple candidates."""
    logger.info(f"Sending bulk interview reminders for {len(application_ids)} applications")

    results = []
    for app_id in application_ids:
        try:
            # Call directly (bypass Celery worker)
            result = send_interview_reminder_task(
                app_id, interview_datetime, interview_type, additional_details
            )
            results.append({"application_id": app_id, "status": "processed"})
        except Exception as e:
            logger.error(f"Failed to dispatch reminder for application {app_id}: {e}")
            results.append({"application_id": app_id, "error": str(e)})

    return {
        "status": "completed",
        "total_applications": len(application_ids),
        "results": results,
    }

def _send_single_custom_email_task(campaign_id: int, application_id: int):
    """Sends a single custom template email and safely increments the campaign counters."""
    logger.info(f"Sending custom email for campaign {campaign_id} to application {application_id}")
    
    from models import EmailCampaign
    
    with task_db_session() as db:
        application = db.query(Application).filter(Application.id == application_id).first()
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        
        if not application or not campaign:
            return {"error": "Application or Campaign not found"}
            
        template = campaign.template
        candidate = application.candidate
        job = application.job
        recruiter = campaign.recruiter
        
        # Prepare content replacements
        subject = template.subject
        body = template.body_content
        
        # Simple template interpolation
        replacements = {
            "{{candidate_name}}": candidate.name,
            "{{job_title}}": job.title,
            "{{company_name}}": recruiter.company_name or "Our Company"
        }
        
        for key, val in replacements.items():
            subject = subject.replace(key, val)
            body = body.replace(key, val)
            
        # Determine Email Service instance
        if recruiter.smtp_enabled and recruiter.smtp_server:
            from services.email_service import EmailService
            svc = EmailService(
                smtp_server=recruiter.smtp_server,
                smtp_port=recruiter.smtp_port,
                smtp_email=recruiter.smtp_email,
                smtp_password=recruiter.smtp_password,
                smtp_from_name=recruiter.smtp_from_name,
            )
        else:
            svc = email_service
            
        success = svc.send_custom_email(
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            subject=subject,
            raw_body=body
        )
        
        # Update Campaign metrics securely 
        if success:
            campaign.sent_count = EmailCampaign.sent_count + 1
        else:
            campaign.failed_count = EmailCampaign.failed_count + 1
            
        db.commit()
        return {"status": "success" if success else "failed"}

def send_custom_campaign_task(campaign_id: int):
    """Initiate a custom bulk email campaign by dispatching child tasks."""
    logger.info(f"Starting execution of campaign {campaign_id}")
    
    from models import EmailCampaign
    
    with task_db_session() as db:
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found")
            return {"error": "Campaign not found"}
            
        app_ids = campaign.target_application_ids or []
        
        campaign.status = "processing"
        db.commit()
        
    for app_id in app_ids:
        # Call directly since we are already in a background thread
        _send_single_custom_email_task(campaign_id, app_id)
        
    return {"status": "dispatched", "total_queued": len(app_ids)}
