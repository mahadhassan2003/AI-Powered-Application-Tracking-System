"""
Celery tasks for offer-related async operations.

Includes cron tasks (driven by Celery Beat) for offer expiry
and reminder emails, plus on-demand tasks for offer notifications.
"""

import logging
from datetime import datetime, timedelta, timezone

from celery_app import app
from models import Offer, OfferStatus
from services.email_service import email_service
from tasks.db import task_db_session

logger = logging.getLogger(__name__)


# ─── Retry policies ─────────────────────────────────────────────────────
EMAIL_RETRY = dict(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)

CRON_RETRY = dict(
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    acks_late=True,
)


@app.task(**EMAIL_RETRY, name='ats_offer_tasks.send_offer_reminder')
def send_offer_reminder_task(self, offer_id: int):
    """Send reminder email to candidate about expiring offer (3 days before expiry)."""
    logger.info(f"Sending offer reminder for offer {offer_id}")

    with task_db_session() as db:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            logger.error(f"Offer {offer_id} not found")
            return {"error": "Offer not found"}

        candidate = offer.candidate
        position_title = offer.position_title

        subject = f"Reminder: Your Job Offer Expires Soon - {position_title}"
        html_content = f"""
        <h2>Offer Expiration Reminder</h2>
        <p>Dear {candidate.name},</p>
        <p>This is a reminder that your job offer for the position of <strong>{position_title}</strong>
        will expire on <strong>{offer.expires_at.strftime('%B %d, %Y')}</strong>.</p>
        <p>Please review the offer details and let us know if you have any questions.</p>
        <p>Click below to respond to your offer:</p>
        <a href="http://localhost:5173/offers/respond/{offer_id}">View Your Offer</a>
        <p>Best regards,<br/>ATS Hiring Team</p>
        """

        email_service.send_email(
            to_email=candidate.email,
            subject=subject,
            html_content=html_content,
        )

        logger.info(f"Offer reminder sent to {candidate.email}")
        return {"status": "success", "offer_id": offer_id}


@app.task(**CRON_RETRY, name='ats_offer_tasks.check_and_expire_offers')
def check_and_expire_offers_task(self):
    """Daily cron task to check and expire offers that have passed their expiry date."""
    logger.info("Checking for expired offers...")

    with task_db_session() as db:
        expired_offers = db.query(Offer).filter(
            Offer.expires_at < datetime.utcnow(),
            Offer.status.in_([OfferStatus.SENT, OfferStatus.VIEWED]),
        ).all()

        count = 0
        for offer in expired_offers:
            offer.status = OfferStatus.EXPIRED

            # Send expiry notification to recruiter
            try:
                subject = f"Offer Expired - {offer.candidate.name}"
                html_content = f"""
                <h2>Offer Expired</h2>
                <p>The job offer sent to {offer.candidate.name} for the position of
                {offer.position_title} has expired.</p>
                <p>You may need to create a new offer or continue with other candidates.</p>
                """
                email_service.send_email(
                    to_email=offer.recruiter.email,
                    subject=subject,
                    html_content=html_content,
                )
            except Exception as e:
                logger.error(f"Error sending expiry email for offer {offer.id}: {e}")

            count += 1

        logger.info(f"Expired {count} offers")
        return {"status": "success", "expired_count": count}


@app.task(**CRON_RETRY, name='ats_offer_tasks.send_offer_about_to_expire')
def send_about_to_expire_reminder_task(self):
    """Daily cron task to send reminders to candidates about offers expiring in 3 days."""
    logger.info("Sending about-to-expire reminders...")

    with task_db_session() as db:
        three_days = datetime.utcnow() + timedelta(days=3)
        four_days = datetime.utcnow() + timedelta(days=4)

        about_to_expire = db.query(Offer).filter(
            Offer.expires_at >= three_days,
            Offer.expires_at < four_days,
            Offer.status.in_([OfferStatus.SENT, OfferStatus.VIEWED]),
        ).all()

        count = 0
        for offer in about_to_expire:
            try:
                candidate = offer.candidate
                subject = f"Final Reminder: Your Job Offer Expires on {offer.expires_at.strftime('%B %d')}"
                html_content = f"""
                <h2>Final Offer Reminder</h2>
                <p>Dear {candidate.name},</p>
                <p>Your job offer for the position of <strong>{offer.position_title}</strong>
                will expire on <strong>{offer.expires_at.strftime('%B %d, %Y')}</strong>.</p>
                <p>This is your final reminder to respond to the offer. Please accept, decline,
                or negotiate as soon as possible.</p>
                <a href="http://localhost:5173/offers/respond/{offer.id}">Respond to Offer</a>
                <p>Best regards,<br/>ATS Hiring Team</p>
                """

                email_service.send_email(
                    to_email=candidate.email,
                    subject=subject,
                    html_content=html_content,
                )
                count += 1
                logger.info(f"About-to-expire reminder sent to {candidate.email}")
            except Exception as e:
                logger.error(f"Error sending reminder for offer {offer.id}: {e}")

        logger.info(f"Sent {count} about-to-expire reminders")
        return {"status": "success", "reminder_count": count}


@app.task(**EMAIL_RETRY, name='ats_offer_tasks.send_onboarding_checklist')
def send_onboarding_checklist_task(self, employee_id: int):
    """Send onboarding checklist to newly hired employee."""
    logger.info(f"Sending onboarding checklist for employee {employee_id}")

    with task_db_session() as db:
        from models import EmployeeRecord

        employee = db.query(EmployeeRecord).filter(EmployeeRecord.id == employee_id).first()
        if not employee:
            logger.error(f"Employee {employee_id} not found")
            return {"error": "Employee not found"}

        user = employee.user
        offer = employee.offer

        subject = f"Welcome to {offer.recruiter.company_name or 'Our Company'}! - Onboarding Checklist"
        html_content = f"""
        <h2>Welcome Onboarding Checklist</h2>
        <p>Dear {user.name},</p>
        <p>Congratulations on accepting your offer! We're excited to have you join our team.</p>
        <p>Here are the tasks you need to complete before your start date of
        <strong>{offer.start_date.strftime('%B %d, %Y')}</strong>:</p>
        <ol>
            <li>Complete emergency contact information</li>
            <li>Upload tax form (W-4)</li>
            <li>Complete I-9 employment verification</li>
            <li>Review and sign employee handbook acknowledgment</li>
            <li>Complete NDA (if applicable)</li>
            <li>Enroll in benefits program</li>
            <li>Set up direct deposit information</li>
        </ol>
        <p>You can complete these tasks using your employee portal.</p>
        <p>If you have any questions, please reach out to our HR team.</p>
        <p>Best regards,<br/>HR Team</p>
        """

        email_service.send_email(
            to_email=user.email,
            subject=subject,
            html_content=html_content,
        )

        employee.onboarding_status = "in_progress"

        logger.info(f"Onboarding checklist sent to {user.email}")
        return {"status": "success", "employee_id": employee_id}


@app.task(**EMAIL_RETRY, name='ats_offer_tasks.send_offer_email')
def send_offer_email_task(self, offer_id: int):
    """Send offer email to candidate with offer details."""
    logger.info(f"Sending offer email for offer {offer_id}")

    with task_db_session() as db:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            logger.error(f"Offer {offer_id} not found")
            return {"error": "Offer not found"}

        candidate = offer.candidate
        recruiter = offer.recruiter
        position_title = offer.position_title

        subject = f"Job Offer - {position_title}"
        html_content = f"""
        <h2>Congratulations!</h2>
        <p>Dear {candidate.name},</p>
        <p>We are delighted to offer you the position of <strong>{position_title}</strong>.</p>
        <p>Please review the attached offer letter and the details below.</p>
        <p><strong>Offer Details:</strong></p>
        <ul>
            <li>Position: {position_title}</li>
            <li>Base Salary: ${offer.base_salary:,.2f} {offer.currency}</li>
            <li>Employment Type: {offer.employment_type}</li>
            <li>Start Date: {offer.start_date.strftime('%B %d, %Y')}</li>
            <li>Location: {offer.location}</li>
        </ul>
        <p>You can accept or negotiate this offer using your candidate portal.</p>
        <p>Best regards,<br/>ATS Hiring Team</p>
        """

        # Use recruiter's SMTP if configured
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

        email_sent = svc.send_email(
            to_email=candidate.email,
            subject=subject,
            html_content=html_content,
        )

        if not email_sent:
            logger.error(f"Failed to send offer email to {candidate.email}")
            return {
                "status": "failed",
                "offer_id": offer_id,
                "candidate_email": candidate.email,
                "error": "Email sending failed",
            }

        logger.info(f"Offer email sent to {candidate.email}")
        return {"status": "success", "offer_id": offer_id, "candidate_email": candidate.email}
