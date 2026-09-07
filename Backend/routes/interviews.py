from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import enum
from database import get_db
from models import Base, Application, User, Job, Interview, InterviewType, InterviewStatus
from routes.auth import get_current_user, get_current_recruiter, get_current_candidate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class InterviewCreate(BaseModel):
    application_id: int
    scheduled_at: datetime
    duration_minutes: int = 60
    interview_type: InterviewType
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    allow_reschedule: bool = True
    reschedule_window_start: Optional[datetime] = None
    reschedule_window_end: Optional[datetime] = None

class InterviewResponse(BaseModel):
    id: int
    application_id: int
    candidate_name: str
    job_title: str
    scheduled_at: datetime
    duration_minutes: int
    interview_type: str
    status: str
    meeting_link: Optional[str]
    location: Optional[str]
    notes: Optional[str]
    candidate_confirmed: bool
    allow_reschedule: bool
    reschedule_window_start: Optional[datetime]
    reschedule_window_end: Optional[datetime]
    proposed_time: Optional[datetime] = None
    reschedule_reason: Optional[str] = None
    decline_reason: Optional[str] = None
    application_status: Optional[str] = None

@router.post("/schedule", response_model=InterviewResponse)
async def schedule_interview(
    interview_data: InterviewCreate,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    try:
        """Schedule an interview"""
        result = await db.execute(
            select(Application).options(
                selectinload(Application.candidate),
                selectinload(Application.job).selectinload(Job.recruiter)
            ).join(Job).filter(
                Application.id == interview_data.application_id,
                Job.recruiter_id == current_user.id
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        interview = Interview(
            application_id=interview_data.application_id,
            interviewer_id=current_user.id,
            scheduled_at=interview_data.scheduled_at.replace(tzinfo=None),
            duration_minutes=interview_data.duration_minutes,
            interview_type=interview_data.interview_type,
            meeting_link=interview_data.meeting_link,
            location=interview_data.location,
            notes=interview_data.notes,
            allow_reschedule=interview_data.allow_reschedule,
            reschedule_window_start=interview_data.reschedule_window_start.replace(tzinfo=None) if interview_data.reschedule_window_start else None,
            reschedule_window_end=interview_data.reschedule_window_end.replace(tzinfo=None) if interview_data.reschedule_window_end else None
        )

        db.add(interview)
        
        # Cache variables to prevent MissingGreenlet errors after commit
        candidate_name = application.candidate.name
        candidate_email = application.candidate.email
        job_title = application.job.title
        recruiter = application.job.recruiter
        
        smtp_enabled = recruiter.smtp_enabled if recruiter else False
        smtp_server = recruiter.smtp_server if recruiter else None
        smtp_port = recruiter.smtp_port if recruiter else None
        smtp_email = recruiter.smtp_email if recruiter else None
        smtp_password = recruiter.smtp_password if recruiter else None
        smtp_from_name = recruiter.smtp_from_name if recruiter else None

        application_status = application.status.value if hasattr(application.status, 'value') else application.status
        await db.commit()
        await db.refresh(interview)

        # Send interview invitation email with all details
        try:
            from services.email_service import email_service

            additional_details_parts = []
            if interview.location:
                additional_details_parts.append(f"Location: {interview.location}")
            if interview.meeting_link:
                additional_details_parts.append(f"Meeting Link: {interview.meeting_link}")
            if interview.notes:
                additional_details_parts.append(f"Notes: {interview.notes}")

            additional_details = "\n".join(additional_details_parts) if additional_details_parts else ""

            if smtp_enabled and smtp_server:
                from services.email_service import EmailService
                recruiter_email_service = EmailService(
                    smtp_server=smtp_server,
                    smtp_port=smtp_port,
                    smtp_email=smtp_email,
                    smtp_password=smtp_password,
                    smtp_from_name=smtp_from_name
                )
                email_success = recruiter_email_service.send_interview_reminder(
                    candidate_name=candidate_name,
                    candidate_email=candidate_email,
                    job_title=job_title,
                    interview_date=interview.scheduled_at,
                    interview_type=interview.interview_type,
                    additional_details=additional_details
                )
            else:
                email_success = email_service.send_interview_reminder(
                    candidate_name=candidate_name,
                    candidate_email=candidate_email,
                    job_title=job_title,
                    interview_date=interview.scheduled_at,
                    interview_type=interview.interview_type,
                    additional_details=additional_details
                )

            if email_success:
                logger.info(f"Interview invitation email sent successfully for application {interview.application_id}")
            else:
                logger.error(f"Failed to send interview invitation email for application {interview.application_id}")

        except Exception as e:
            logger.error(f"Failed to send interview invitation email: {e}")

        # Also send status update email
        try:
            from services.email_service import email_service
            email_service.send_status_update_email(
                candidate_name=candidate_name,
                candidate_email=candidate_email,
                job_title=job_title,
                status='interview'
            )
            logger.info(f"Interview status update email sent for application {interview.application_id}")
        except Exception as e:
            logger.error(f"Failed to send interview status update email: {e}")

        return InterviewResponse(
            id=interview.id,
            application_id=interview.application_id,
            candidate_name=candidate_name,
            job_title=job_title,
            scheduled_at=interview.scheduled_at,
            duration_minutes=interview.duration_minutes,
            interview_type=interview.interview_type.value if hasattr(interview.interview_type, 'value') else interview.interview_type,
            status=interview.status.value if hasattr(interview.status, 'value') else interview.status,
            meeting_link=interview.meeting_link,
            location=interview.location,
            notes=interview.notes,
            candidate_confirmed=interview.candidate_confirmed,
            allow_reschedule=interview.allow_reschedule,
            reschedule_window_start=interview.reschedule_window_start,
            reschedule_window_end=interview.reschedule_window_end,
            proposed_time=interview.proposed_time,
            reschedule_reason=interview.reschedule_reason,
            decline_reason=interview.decline_reason,
            application_status=application_status
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print("====== INTERVIEW ERROR ======")
        print(error_details)
        print("=============================")
        raise HTTPException(status_code=500, detail=str(e) + " | Traceback: " + error_details)

@router.get("/my-interviews", response_model=List[InterviewResponse])
async def get_my_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get interviews for current user"""
    stmt = select(Interview).options(
        selectinload(Interview.application).selectinload(Application.candidate),
        selectinload(Interview.application).selectinload(Application.job)
    )

    if current_user.role == "recruiter":
        stmt = stmt.filter(Interview.interviewer_id == current_user.id)
    else:  # candidate
        stmt = stmt.join(Application).filter(Application.candidate_id == current_user.id)

    result = await db.execute(stmt)
    interviews = result.scalars().all()

    valid_interviews = [
        interview for interview in interviews 
        if interview.application and interview.application.candidate and interview.application.job
    ]

    return [
        InterviewResponse(
            id=interview.id,
            application_id=interview.application_id,
            candidate_name=interview.application.candidate.name,
            job_title=interview.application.job.title,
            scheduled_at=interview.scheduled_at,
            duration_minutes=interview.duration_minutes,
            interview_type=interview.interview_type.value,
            status=interview.status.value,
            meeting_link=interview.meeting_link,
            location=interview.location,
            notes=interview.notes,
            candidate_confirmed=interview.candidate_confirmed,
            allow_reschedule=interview.allow_reschedule,
            reschedule_window_start=interview.reschedule_window_start,
            reschedule_window_end=interview.reschedule_window_end,
            proposed_time=interview.proposed_time,
            reschedule_reason=interview.reschedule_reason,
            decline_reason=interview.decline_reason,
            application_status=interview.application.status.value if interview.application.status else None
        ) for interview in valid_interviews
    ]

@router.put("/{interview_id}/confirm")
async def confirm_interview(
    interview_id: int,
    current_user: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Candidate confirms interview attendance"""
    result = await db.execute(
        select(Interview).join(Application).filter(
            Interview.id == interview_id,
            Application.candidate_id == current_user.id
        )
    )
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.candidate_confirmed = True
    interview.status = InterviewStatus.CONFIRMED
    await db.commit()

    return {"message": "Interview confirmed successfully"}

class InterviewCompleteData(BaseModel):
    notes: Optional[str] = None

@router.put("/{interview_id}/complete")
async def complete_interview(
    interview_id: int,
    complete_data: InterviewCompleteData,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Mark interview as completed with notes"""
    result = await db.execute(
        select(Interview).filter(
            Interview.id == interview_id,
            Interview.interviewer_id == current_user.id
        )
    )
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    interview.status = InterviewStatus.COMPLETED
    if complete_data.notes:
        interview.notes = (interview.notes or "") + f"\n\nPost-Interview Feedback: {complete_data.notes}"
    await db.commit()

    return {"message": "Interview marked as completed"}

@router.put("/{interview_id}/cancel")
async def cancel_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an interview"""
    result = await db.execute(select(Interview).filter(Interview.id == interview_id))
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Check if user is authorized (either recruiter or the candidate)
    result = await db.execute(
        select(Application).options(selectinload(Application.job)).filter(Application.id == interview.application_id)
    )
    application = result.scalars().first()
    if current_user.role == 'recruiter':
        if application.job.recruiter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == 'candidate':
        if application.candidate_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    interview.status = InterviewStatus.CANCELLED
    await db.commit()

    return {"message": "Interview cancelled successfully"}

class RescheduleRequestData(BaseModel):
    proposed_time: datetime
    reason: Optional[str] = None

@router.put("/{interview_id}/reschedule/request")
async def request_reschedule(
    interview_id: int,
    reschedule_data: RescheduleRequestData,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    """Candidate requests to reschedule an interview"""
    result = await db.execute(
        select(Interview).join(Application).filter(
            Interview.id == interview_id,
            Application.candidate_id == current_user.id
        )
    )
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not interview.allow_reschedule:
        raise HTTPException(status_code=403, detail="Rescheduling is not permitted for this interview")

    proposed_naive = reschedule_data.proposed_time.replace(tzinfo=None)
    
    if interview.reschedule_window_start and proposed_naive < interview.reschedule_window_start:
        raise HTTPException(status_code=400, detail="Proposed time is before the allowed reschedule window")
        
    if interview.reschedule_window_end and proposed_naive > interview.reschedule_window_end:
        raise HTTPException(status_code=400, detail="Proposed time is after the allowed reschedule window")

    interview.proposed_time = proposed_naive
    interview.reschedule_reason = reschedule_data.reason
    interview.status = InterviewStatus.RESCHEDULE_REQUESTED
    interview.candidate_confirmed = False

    await db.commit()
    await db.refresh(interview)

    # Use background task for recruiter notification
    try:
        from tasks.email_tasks import send_recruiter_notification_task
        result = await db.execute(
            select(Application).options(
                selectinload(Application.candidate),
                selectinload(Application.job)
            ).filter(Application.id == interview.application_id)
        )
        application = result.scalars().first()
        
        message = f"Interview reschedule requested by {application.candidate.name} for {interview.proposed_time.strftime('%B %d, %Y at %I:%M %p')}\nReason: {reschedule_data.reason}"
        background_tasks.add_task(send_recruiter_notification_task, None, application.id, message)
        logger.info(f"Background reschedule notification queued for interview {interview_id}")
    except Exception as e:
        logger.error(f"Failed to queue reschedule notification: {e}")

    return {"message": "Reschedule request submitted successfully", "interview_id": interview.id}

class RescheduleApproveData(BaseModel):
    notes: Optional[str] = None

@router.put("/{interview_id}/reschedule/approve")
async def approve_reschedule(
    interview_id: int,
    approve_data: RescheduleApproveData,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Recruiter approves a candidate's reschedule request"""
    result = await db.execute(
        select(Interview).join(Application).join(Job).filter(
            Interview.id == interview_id,
            Job.recruiter_id == current_user.id
        )
    )
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found or unauthorized")
        
    if interview.status != InterviewStatus.RESCHEDULE_REQUESTED or not interview.proposed_time:
        raise HTTPException(status_code=400, detail="No active reschedule request found")

    interview.scheduled_at = interview.proposed_time
    interview.proposed_time = None
    interview.reschedule_reason = None
    interview.decline_reason = None
    if approve_data.notes:
        interview.notes = (interview.notes or "") + f"\n\nApproval Note: {approve_data.notes}"
        
    interview.status = InterviewStatus.RESCHEDULED
    interview.candidate_confirmed = True

    await db.commit()
    await db.refresh(interview)

    # Notify candidate of approval
    try:
        from tasks.email_tasks import send_status_update_email_task
        background_tasks.add_task(send_status_update_email_task, None, interview.application_id, "interview_rescheduled")
    except Exception as e:
        logger.error(f"Failed to queue candidate approval notification: {e}")

    return {"message": "Reschedule approved successfully", "interview_id": interview.id}

class AdminRescheduleData(BaseModel):
    scheduled_at: datetime
    notes: Optional[str] = None

@router.put("/{interview_id}/reschedule/admin")
async def admin_reschedule(
    interview_id: int,
    reschedule_data: AdminRescheduleData,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Recruiter forcefully reschedules candidate without request"""
    result = await db.execute(
        select(Interview).join(Application).join(Job).filter(
            Interview.id == interview_id,
            Job.recruiter_id == current_user.id
        )
    )
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found or unauthorized")

    interview.scheduled_at = reschedule_data.scheduled_at
    if reschedule_data.notes:
        interview.notes = (interview.notes or "") + f"\n\nRecruiter Reschedule: {reschedule_data.notes}"
        
    interview.status = InterviewStatus.RESCHEDULED
    interview.candidate_confirmed = False
    
    interview.proposed_time = None
    interview.reschedule_reason = None

    await db.commit()
    await db.refresh(interview)

    # Send candidate newly forced time
    try:
        from tasks.email_tasks import send_status_update_email_task
        background_tasks.add_task(send_status_update_email_task, None, interview.application_id, "interview_rescheduled")
    except Exception as e:
        logger.error(f"Failed to queue candidate forced reschedule notification: {e}")

    return {"message": "Interview forcibly rescheduled successfully", "interview_id": interview.id}

class RescheduleDeclineData(BaseModel):
    reason: str

@router.put("/{interview_id}/reschedule/decline")
async def decline_reschedule(
    interview_id: int,
    decline_data: RescheduleDeclineData,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Recruiter declines a candidate's reschedule request"""
    result = await db.execute(
        select(Interview).join(Application).join(Job).filter(
            Interview.id == interview_id,
            Job.recruiter_id == current_user.id
        )
    )
    interview = result.scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found or unauthorized")

    if interview.status != InterviewStatus.RESCHEDULE_REQUESTED:
        raise HTTPException(status_code=400, detail="No active reschedule request found")

    # Revert to scheduled, keep original time
    interview.status = InterviewStatus.SCHEDULED
    interview.proposed_time = None
    interview.reschedule_reason = None
    interview.decline_reason = decline_data.reason
    interview.candidate_confirmed = False

    await db.commit()
    await db.refresh(interview)

    # Notify candidate
    try:
        from tasks.email_tasks import send_status_update_email_task
        background_tasks.add_task(send_status_update_email_task, None, interview.application_id, "reschedule_declined")
    except Exception as e:
        logger.error(f"Failed to queue reschedule decline notification: {e}")

    return {"message": "Reschedule request declined", "interview_id": interview.id}