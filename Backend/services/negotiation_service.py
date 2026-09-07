from datetime import datetime
from typing import Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Offer, OfferStatus, OfferNegotiation, Application, ApplicationStatus, EmployeeRecord, User
import logging

from tasks.email_tasks import send_status_update_email_task
from services.email_service import email_service
from services.offer_service import offer_service

logger = logging.getLogger(__name__)

class NegotiationService:
    @classmethod
    async def process_offer_acceptance(
        cls, offer: Offer, current_user: User, db: AsyncSession
    ) -> Tuple[bool, str, str]:
        """Handles the complex lifecycle transition when a candidate accepts an offer."""
        offer.status = OfferStatus.ACCEPTED
        offer.responded_at = datetime.utcnow()
        offer.response_action = "accepted"

        result = await db.execute(select(Application).filter(Application.id == offer.application_id))
        application = result.scalars().first()
        if application:
            application.status = ApplicationStatus.HIRED
            application.updated_at = datetime.utcnow()

        employee = EmployeeRecord(
            user_id=current_user.id,
            offer_id=offer.id,
            employee_id=offer_service.generate_employee_id(),
            start_date=offer.start_date,
            employment_type=offer.employment_type,
            onboarding_status="pending"
        )
        db.add(employee)
        await db.flush()
        
        employee_id_val = employee.employee_id
        
        return True, "Offer accepted! Welcome to our team!", employee_id_val

    @classmethod
    async def process_offer_decline(
        cls, offer: Offer, reason: str, db: AsyncSession
    ) -> bool:
        """Handles the lifecycle transition when a candidate declines an offer."""
        offer.status = OfferStatus.DECLINED
        offer.responded_at = datetime.utcnow()
        offer.response_action = "declined"
        offer.response_notes = reason
        await db.flush()
        return True

    @classmethod
    async def apply_negotiation_terms_to_offer(
        cls, offer: Offer, negotiation: OfferNegotiation, db: AsyncSession
    ) -> bool:
        """Applies the counter-offer terms and readies the offer to be sent as DRAFT again."""
        if negotiation.proposed_salary is not None:
            offer.base_salary = negotiation.proposed_salary
        if negotiation.proposed_benefits is not None:
            offer.benefits_summary = negotiation.proposed_benefits
        if negotiation.proposed_signing_bonus is not None:
            offer.signing_bonus = negotiation.proposed_signing_bonus
        if negotiation.proposed_stock_options is not None:
            offer.stock_options = negotiation.proposed_stock_options
            
        offer.status = OfferStatus.DRAFT
        offer.sent_at = None
        offer.viewed_at = None
        
        negotiation.status = "accepted"
        negotiation.responded_at = datetime.utcnow()
        
        return True

    @staticmethod
    def send_offer_email(offer_id: int, candidate_email: str, candidate_name: str, position_title: str):
        try:
            subject = f"Job Offer - {position_title}"
            html_content = f"<h2>Congratulations!</h2><p>Dear {candidate_name},</p><p>We are delighted to offer you the position of <strong>{position_title}</strong>.</p><p>Please review the attached offer letter and the details below.</p><p>You can accept or negotiate this offer by clicking the link in the email.</p><p>Best regards,<br/>ATS Hiring Team</p>"
            email_service.send_email(to_email=candidate_email, subject=subject, html_content=html_content)
        except Exception as e:
            logger.error(f"Error sending offer email: {e}")

    @staticmethod
    def send_offer_accepted_email(offer_id: int, candidate_email: str, candidate_name: str):
        try:
            subject = "Welcome to Our Team!"
            html_content = f"<h2>Welcome!</h2><p>Dear {candidate_name},</p><p>Thank you for accepting our offer! We're excited to have you join our team.</p><p>Our HR team will be in touch shortly with onboarding information and next steps.</p><p>Best regards,<br/>ATS Hiring Team</p>"
            email_service.send_email(to_email=candidate_email, subject=subject, html_content=html_content)
        except Exception as e:
            logger.error(f"Error sending acceptance email: {e}")

    @staticmethod
    def send_offer_accepted_recruiter_email(offer_id: int, recruiter_email: str, candidate_name: str):
        try:
            subject = f"Offer Accepted - {candidate_name}"
            html_content = f"<h2>Offer Accepted!</h2><p>Great news! {candidate_name} has accepted the job offer.</p><p>Please proceed with onboarding and integration planning.</p>"
            email_service.send_email(to_email=recruiter_email, subject=subject, html_content=html_content)
        except Exception as e:
            logger.error(f"Error sending recruiter notification: {e}")

    @staticmethod
    def send_offer_declined_email(offer_id: int, recruiter_email: str, candidate_name: str, reason: str):
        try:
            subject = f"Offer Declined - {candidate_name}"
            html_content = f"<h2>Offer Declined</h2><p>{candidate_name} has declined the job offer.</p><p>Reason: {reason if reason else 'Not provided'}</p><p>Please continue with other candidates or adjust your offer.</p>"
            email_service.send_email(to_email=recruiter_email, subject=subject, html_content=html_content)
        except Exception as e:
            logger.error(f"Error sending decline email: {e}")

    @staticmethod
    def send_negotiation_email(negotiation_id: int, recipient_email: str, recipient_name: str, initiated_by: str):
        try:
            action = "proposed" if initiated_by == "candidate" else "offered"
            subject = "Offer Negotiation"
            html_content = f"<h2>Offer Negotiation</h2><p>Dear {recipient_name},</p><p>A negotiation proposal has been {action} regarding your job offer.</p><p>Please review the proposed terms and respond accordingly.</p><p>Best regards,<br/>ATS Hiring Team</p>"
            email_service.send_email(to_email=recipient_email, subject=subject, html_content=html_content)
        except Exception as e:
            logger.error(f"Error sending negotiation email: {e}")
