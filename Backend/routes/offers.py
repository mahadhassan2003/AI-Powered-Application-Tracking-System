"""
Offer Management Routes - Handle job offers, negotiations, and employee records
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import logging

from database import get_db
from models import (
    Offer, OfferStatus, OfferNegotiation,
    User, UserRole, Application, Job
)
from auth import auth_handler
from routes.auth import get_current_user, get_current_recruiter, get_current_candidate
from services.offer_service import offer_service
from services.negotiation_service import NegotiationService

from cache import cache
from tasks.offer_tasks import send_offer_email_task

logger = logging.getLogger(__name__)
router = APIRouter()

# ==================== PYDANTIC MODELS ====================

class OfferCreate(BaseModel):
    application_id: int
    position_title: str
    base_salary: float
    currency: str = "USD"
    start_date: datetime
    employment_type: str = "full_time"
    location: Optional[str] = None
    signing_bonus: float = 0
    stock_options: float = 0
    benefits_summary: Optional[str] = None
    custom_message: Optional[str] = None
    expires_in_days: int = 7

class OfferUpdate(BaseModel):
    position_title: Optional[str] = None
    base_salary: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    signing_bonus: Optional[float] = None
    stock_options: Optional[float] = None
    benefits_summary: Optional[str] = None
    custom_message: Optional[str] = None

class OfferResponse(BaseModel):
    id: int
    application_id: int
    job_id: int
    candidate_id: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    position_title: str
    base_salary: float
    currency: str
    start_date: datetime
    employment_type: str
    location: Optional[str]
    signing_bonus: float
    stock_options: float
    benefits_summary: Optional[str]
    status: str
    created_at: datetime
    sent_at: Optional[datetime]
    viewed_at: Optional[datetime]
    expires_at: Optional[datetime]
    responded_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class NegotiationCreate(BaseModel):
    initiated_by: str  # "candidate" or "recruiter"
    proposed_salary: Optional[float] = None
    proposed_benefits: Optional[str] = None
    proposed_signing_bonus: Optional[float] = None
    proposed_stock_options: Optional[float] = None
    reasoning: str

class NegotiationResponse(BaseModel):
    id: int
    offer_id: int
    initiated_by: str
    proposed_salary: Optional[float]
    proposed_benefits: Optional[str]
    proposed_signing_bonus: Optional[float]
    proposed_stock_options: Optional[float]
    reasoning: str
    status: str
    round_number: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class EmployeeRecordCreate(BaseModel):
    department: Optional[str] = None
    manager_id: Optional[int] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_email: Optional[str] = None

class AIAssessRequest(BaseModel):
    position_title: str
    location: str
    base_salary: float
    currency: str = "USD"

class AIDraftRequest(BaseModel):
    candidate_name: str
    position_title: str
    base_salary: float
    currency: str = "USD"
    signing_bonus: float = 0
    stock_options: float = 0
    benefits_summary: str = ""
    employment_type: str = "full_time"
    start_date: str = ""
    expires_in_days: int = 7
def _offer_to_response(o: Offer) -> OfferResponse:
    """Helper to convert an Offer ORM object to an OfferResponse."""
    return OfferResponse(
        id=o.id,
        application_id=o.application_id,
        job_id=o.job_id,
        candidate_id=o.candidate_id,
        candidate_name=o.candidate.name if o.candidate else None,
        candidate_email=o.candidate.email if o.candidate else None,
        position_title=o.position_title,
        base_salary=o.base_salary,
        currency=o.currency,
        start_date=o.start_date,
        employment_type=o.employment_type.value if hasattr(o.employment_type, 'value') else str(o.employment_type),
        location=o.location,
        signing_bonus=o.signing_bonus or 0,
        stock_options=o.stock_options or 0,
        benefits_summary=o.benefits_summary,
        status=o.status.value if hasattr(o.status, 'value') else str(o.status),
        created_at=o.created_at,
        sent_at=o.sent_at,
        viewed_at=o.viewed_at,
        expires_at=o.expires_at,
        responded_at=o.responded_at,
    )


# ==================== OFFER ENDPOINTS ====================

@router.post("/ai/assess")
async def ai_assess_offer(request: AIAssessRequest, current_user: User = Depends(get_current_recruiter)):
    from services.offer_llm_service import offer_llm_service
    analysis = offer_llm_service.analyze_offer_competitiveness(
        position=request.position_title,
        location=request.location,
        salary=request.base_salary,
        currency=request.currency
    )
    return analysis

@router.post("/ai/generate")
async def ai_generate_draft(request: AIDraftRequest, current_user: User = Depends(get_current_recruiter)):
    from services.offer_llm_service import offer_llm_service
    draft = offer_llm_service.generate_offer_draft(
        candidate_name=request.candidate_name,
        position=request.position_title,
        salary=request.base_salary,
        currency=request.currency,
        stock=request.stock_options,
        sign_on=request.signing_bonus,
        benefits=request.benefits_summary,
        employment_type=request.employment_type,
        start_date=request.start_date,
        expires_in_days=request.expires_in_days
    )
    return {"draft": draft}

@router.post("/create", response_model=OfferResponse)
async def create_offer(
    offer_data: OfferCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Create a new job offer (recruiter only)"""
    
    # Verify application exists and belongs to a job posted by this recruiter
    result = await db.execute(select(Application).filter(Application.id == offer_data.application_id))
    application = result.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    result = await db.execute(select(Job).filter(Job.id == application.job_id))
    job = result.scalars().first()
    if not job or job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create offers for your own job postings")
    
    # Check if offer already exists for this application
    result = await db.execute(select(Offer).filter(Offer.application_id == offer_data.application_id))
    existing_offer = result.scalars().first()
    if existing_offer:
        raise HTTPException(status_code=400, detail="Offer already exists for this application")
    
    # Calculate expiry date
    expires_at = offer_service.calculate_offer_expiry(offer_data.expires_in_days)
    
    # Create offer
    try:
        # Strip timezone info for naive TIMESTAMP columns
        naive_start_date = offer_data.start_date.replace(tzinfo=None) if offer_data.start_date.tzinfo else offer_data.start_date
        
        offer = Offer(
            application_id=offer_data.application_id,
            job_id=application.job_id,
            candidate_id=application.candidate_id,
            recruiter_id=current_user.id,
            position_title=offer_data.position_title,
            base_salary=offer_data.base_salary,
            currency=offer_data.currency,
            start_date=naive_start_date,
            employment_type=offer_data.employment_type,
            location=offer_data.location or job.location,
            signing_bonus=offer_data.signing_bonus,
            stock_options=offer_data.stock_options,
            benefits_summary=offer_data.benefits_summary,
            custom_message=offer_data.custom_message,
            status=OfferStatus.DRAFT,
            expires_at=expires_at
        )
        
        db.add(offer)
        await db.flush()  # Flush to get the ID without expiring
        offer_id = offer.id
        await db.commit()
        
        # Requery with candidate loaded for response
        result = await db.execute(
            select(Offer).options(selectinload(Offer.candidate)).filter(Offer.id == offer_id)
        )
        offer = result.scalars().first()
        
        logger.info(f"Offer {offer.id} created for application {offer_data.application_id}")
        
        return _offer_to_response(offer)
    except Exception as e:
        import traceback
        logger.error(f"Offer creation failed: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Offer creation failed: {type(e).__name__}: {str(e)}")

@router.get("/", response_model=List[OfferResponse])
async def list_offers(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List offers - Recruiter sees their offers, candidates see their received offers"""
    
    stmt = select(Offer).options(selectinload(Offer.candidate))
    
    if current_user.role == UserRole.RECRUITER:
        stmt = stmt.filter(Offer.recruiter_id == current_user.id)
    elif current_user.role == UserRole.CANDIDATE:
        stmt = stmt.filter(Offer.candidate_id == current_user.id)
    # Admin can see all offers
    
    if status_filter:
        stmt = stmt.filter(Offer.status == status_filter)
    
    stmt = stmt.order_by(Offer.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    offers = result.scalars().all()
    
    return [_offer_to_response(o) for o in offers]

@router.get("/{offer_id}", response_model=OfferResponse)
async def get_offer(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific offer details"""
    
    result = await db.execute(
        select(Offer).options(selectinload(Offer.candidate)).filter(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Authorization check
    if current_user.role == UserRole.RECRUITER and offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this offer")
    elif current_user.role == UserRole.CANDIDATE and offer.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this offer")
    
    return _offer_to_response(offer)

@router.put("/{offer_id}", response_model=OfferResponse)
async def update_offer(
    offer_id: int,
    offer_data: OfferUpdate,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Update offer details (draft only)"""
    
    result = await db.execute(select(Offer).filter(Offer.id == offer_id))
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this offer")
    
    if offer.status != OfferStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only edit draft offers")
    
    # Update fields
    update_data = offer_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(offer, field):
            setattr(offer, field, value)
    
    await db.commit()
    await db.refresh(offer)
    
    logger.info(f"Offer {offer_id} updated")

    # Reload with candidate for response
    result = await db.execute(
        select(Offer).options(selectinload(Offer.candidate)).filter(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    return _offer_to_response(offer)

@router.post("/{offer_id}/send")
async def send_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Send offer to candidate"""
    
    result = await db.execute(
        select(Offer).options(
            selectinload(Offer.candidate),
            selectinload(Offer.recruiter)
        ).filter(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to send this offer")
    
    if offer.status != OfferStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only send draft offers")
    
    # Generate offer letter PDF
    try:
        offer_dict = {
            'id': offer.id,
            'candidate_name': offer.candidate.name,
            'position_title': offer.position_title,
            'base_salary': offer.base_salary,
            'currency': offer.currency,
            'start_date': offer.start_date.strftime('%B %d, %Y') if offer.start_date else 'TBD',
            'location': offer.location,
            'signing_bonus': offer.signing_bonus,
            'stock_options': offer.stock_options,
            'employment_type': offer.employment_type,
            'benefits_summary': offer.benefits_summary,
            'custom_message': offer.custom_message,
            'expires_at': offer.expires_at.strftime('%B %d, %Y') if offer.expires_at else 'TBD'
        }
        
        pdf_path = offer_service.generate_offer_letter_pdf(offer_dict, current_user.company_name or "ATS Company")
        offer.offer_letter_path = pdf_path
    except Exception as e:
        logger.error(f"Error generating PDF for offer {offer_id}: {e}")
    
    # Update status
    offer.status = OfferStatus.SENT
    offer.sent_at = datetime.utcnow()
    await db.commit()
    
    # Send email via BackgroundTasks (bypass Celery worker)
    background_tasks.add_task(send_offer_email_task, None, offer.id)
    
    logger.info(f"Offer {offer_id} sent to {offer.candidate.email}")
    
    return {
        "status": "success",
        "message": f"Offer sent to {offer.candidate.email}",
        "offer_id": offer_id
    }

@router.post("/{offer_id}/accept")
async def accept_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Candidate accepts offer"""
    
    result = await db.execute(
        select(Offer).options(
            selectinload(Offer.candidate),
            selectinload(Offer.recruiter)
        ).filter(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="This offer is not for you")
    
    # Validate offer
    is_valid, message = offer_service.validate_offer_acceptance(offer)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Delegate to NegotiationService for DB transitions
    success, return_message, employee_id_val = await NegotiationService.process_offer_acceptance(offer, current_user, db)
    
    # Extract values for background tasks
    offer_id_val = offer.id
    recruiter_email = offer.recruiter.email
    await db.commit()
    
    # Send confirmation emails
    background_tasks.add_task(
        NegotiationService.send_offer_accepted_email,
        offer_id=offer_id_val,
        candidate_email=current_user.email,
        candidate_name=current_user.name,
    )
    
    background_tasks.add_task(
        NegotiationService.send_offer_accepted_recruiter_email,
        offer_id=offer_id_val,
        recruiter_email=recruiter_email,
        candidate_name=current_user.name,
    )
    
    logger.info(f"Candidate {current_user.id} accepted offer {offer_id_val}")
    
    return {
        "status": "success",
        "message": return_message,
        "employee_id": employee_id_val
    }

@router.post("/{offer_id}/decline")
async def decline_offer(
    offer_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_candidate),
    reason: str = "",
    db: AsyncSession = Depends(get_db)
):
    """Candidate declines offer"""
    
    result = await db.execute(
        select(Offer).options(
            selectinload(Offer.recruiter)
        ).filter(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="This offer is not for you")
    
    # Validate offer can be declined
    is_valid, message = offer_service.validate_offer_acceptance(offer)
    if not is_valid and offer.status == "accepted":
        raise HTTPException(status_code=400, detail="Cannot decline an already accepted offer")
    
    # Apply DB transitions via NegotiationService
    await NegotiationService.process_offer_decline(offer, reason, db)
    
    # Extract values before commit
    offer_id_val = offer.id
    recruiter_email = offer.recruiter.email
    await db.commit()
    
    # Send email to recruiter
    background_tasks.add_task(
        NegotiationService.send_offer_declined_email,
        offer_id=offer_id_val,
        recruiter_email=recruiter_email,
        candidate_name=current_user.name,
        reason=reason,
    )
    
    logger.info(f"Candidate {current_user.id} declined offer {offer_id_val}")
    
    return {
        "status": "success",
        "message": "Offer declined"
    }

@router.post("/{offer_id}/negotiate", response_model=NegotiationResponse)
async def propose_negotiation(
    offer_id: int,
    negotiation: NegotiationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Propose salary/benefits negotiation"""
    
    result = await db.execute(
        select(Offer).options(
            selectinload(Offer.candidate),
            selectinload(Offer.recruiter)
        ).filter(Offer.id == offer_id)
    )
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Check authorization
    if negotiation.initiated_by == "candidate" and offer.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Candidates can only negotiate their own offers")
    elif negotiation.initiated_by == "recruiter" and offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Recruiters can only negotiate their own offers")
    
    # Validate offer is still negotiable
    if offer.status not in [OfferStatus.SENT, OfferStatus.VIEWED]:
        raise HTTPException(status_code=400, detail="Cannot negotiate on this offer status")
    
    # Create negotiation record
    negotiation_obj = OfferNegotiation(
        offer_id=offer_id,
        initiated_by=negotiation.initiated_by,
        proposed_salary=negotiation.proposed_salary,
        proposed_benefits=negotiation.proposed_benefits,
        proposed_signing_bonus=negotiation.proposed_signing_bonus,
        proposed_stock_options=negotiation.proposed_stock_options,
        reasoning=negotiation.reasoning,
        status="pending"
    )
    
    if negotiation.initiated_by == "candidate":
        recipient_email = offer.recruiter.email
        recipient_name = offer.recruiter.name
    else:
        recipient_email = offer.candidate.email
        recipient_name = offer.candidate.name
        
    db.add(negotiation_obj)
    await db.flush()  # to get ID
    neg_id_val = negotiation_obj.id
    await db.commit()
    await db.refresh(negotiation_obj)
    
    background_tasks.add_task(
        NegotiationService.send_negotiation_email,
        negotiation_id=neg_id_val,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        initiated_by=negotiation.initiated_by,
    )
    
    logger.info(f"Negotiation {neg_id_val} created for offer {offer_id}")
    return negotiation_obj

@router.get("/{offer_id}/negotiations", response_model=List[NegotiationResponse])
async def get_negotiations(
    offer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get negotiation history for an offer"""
    
    result = await db.execute(select(Offer).filter(Offer.id == offer_id))
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Authorization
    if current_user.role == UserRole.RECRUITER and offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.CANDIDATE and offer.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(
        select(OfferNegotiation).filter(OfferNegotiation.offer_id == offer_id).order_by(OfferNegotiation.created_at)
    )
    negotiations = result.scalars().all()
    return negotiations

@router.post("/{offer_id}/negotiations/{negotiation_id}/accept")
async def accept_negotiation(
    offer_id: int,
    negotiation_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Recruiter accepts a candidate's negotiation proposal"""
    result = await db.execute(select(Offer).filter(Offer.id == offer_id))
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    if offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(
        select(OfferNegotiation).filter(
            OfferNegotiation.id == negotiation_id,
            OfferNegotiation.offer_id == offer_id
        )
    )
    negotiation = result.scalars().first()
    
    if not negotiation or negotiation.status != "pending":
        raise HTTPException(status_code=400, detail="Negotiation not found or not pending")
        
    # Apply terms via abstract Service
    await NegotiationService.apply_negotiation_terms_to_offer(offer, negotiation, db)
    await db.commit()
    
    # Notify candidate
    try:
        from tasks.email_tasks import send_status_update_email_task
        send_status_update_email_task.delay(offer.application_id, "negotiation_accepted")
    except Exception as e:
        logger.error(f"Failed to queue negotiation accepted notification: {e}")
    
    return {"status": "success", "message": "Negotiation terms applied and offer reverted to DRAFT for resending"}

@router.post("/{offer_id}/negotiations/{negotiation_id}/decline")
async def decline_negotiation(
    offer_id: int,
    negotiation_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Recruiter declines a candidate's negotiation proposal"""
    result = await db.execute(select(Offer).filter(Offer.id == offer_id))
    offer = result.scalars().first()
    if not offer or offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=404, detail="Offer not found or unauthorized")
        
    result = await db.execute(
        select(OfferNegotiation).filter(
            OfferNegotiation.id == negotiation_id,
            OfferNegotiation.offer_id == offer_id
        )
    )
    negotiation = result.scalars().first()
    
    if not negotiation or negotiation.status != "pending":
        raise HTTPException(status_code=400, detail="Negotiation not found or not pending")
        
    negotiation.status = "declined"
    negotiation.responded_at = datetime.utcnow()
    await db.commit()
    
    # Notify candidate
    try:
        from tasks.email_tasks import send_status_update_email_task
        send_status_update_email_task.delay(offer.application_id, "negotiation_declined")
    except Exception as e:
        logger.error(f"Failed to queue negotiation declined notification: {e}")
    
    return {"status": "success", "message": "Negotiation declined"}

@router.post("/{offer_id}/mark-viewed")
async def mark_offer_viewed(
    offer_id: int,
    current_user: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Mark offer as viewed (tracked from email link)"""
    
    result = await db.execute(select(Offer).filter(Offer.id == offer_id))
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="This offer is not for you")
    
    if not offer.viewed_at:
        offer.viewed_at = datetime.utcnow()
        if offer.status == OfferStatus.SENT:
            offer.status = OfferStatus.VIEWED
        await db.commit()
    
    return {"status": "success"}

@router.post("/{offer_id}/withdraw")
async def withdraw_offer(
    offer_id: int,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Recruiter withdraws an offer that has not yet been accepted/declined"""

    result = await db.execute(select(Offer).filter(Offer.id == offer_id))
    offer = result.scalars().first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    if offer.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to withdraw this offer")

    if offer.status in [OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.EXPIRED, OfferStatus.WITHDRAWN]:
        raise HTTPException(status_code=400, detail=f"Cannot withdraw an offer that is already {offer.status.value}")

    offer.status = OfferStatus.WITHDRAWN
    offer.responded_at = datetime.utcnow()
    offer.response_action = "withdrawn"
    await db.commit()

    logger.info(f"Offer {offer_id} withdrawn by recruiter {current_user.id}")

    return {"status": "success", "message": "Offer withdrawn successfully"}

@router.get("/analytics/summary")
async def get_offers_analytics(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Get offer analytics for recruiter"""
    
    result = await db.execute(select(Offer).filter(Offer.recruiter_id == current_user.id))
    offers = result.scalars().all()
    analytics = offer_service.get_offer_analytics(offers)
    
    return analytics


