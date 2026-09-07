import os
import uuid
from typing import Optional, List
from fastapi import UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from models import Application, Job, User, UserRole, ApplicationStatus
from auth import auth_handler
from services.storage_service import storage_service
import logging

logger = logging.getLogger(__name__)

class ApplicationService:
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    ALLOWED_EXTENSIONS = [".pdf", ".docx"]

    @classmethod
    async def _process_resume_upload(cls, resume: UploadFile) -> str:
        """Validates and securely saves the resume file."""
        file_content = await resume.read()
        if len(file_content) > cls.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        if resume.content_type not in cls.ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")

        file_extension = os.path.splitext(resume.filename)[1].lower()
        if file_extension not in cls.ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Invalid file extension. Only .pdf and .docx files are allowed")

        secure_filename = f"{uuid.uuid4().hex}{file_extension}"
        
        resume_path = storage_service.save_file(
            file_content=file_content,
            filename=secure_filename,
            content_type=resume.content_type
        )
        return resume_path

    @classmethod
    async def _queue_post_application_tasks(cls, application_id: int, background_tasks: BackgroundTasks, candidate_user: User, job_title: str):
        """Queues resume parsing and welcome emails safely."""
        try:
            from tasks.resume_tasks import process_resume_directly
            background_tasks.add_task(process_resume_directly, application_id)
            logger.info(f"Resume processing queued for application {application_id}")
        except Exception as e:
            logger.error(f"Failed to queue resume processing: {e}")

        # Send welcome email via FastAPI BackgroundTasks (more reliable on Cloud Run than Celery)
        try:
            from tasks.email_tasks import send_welcome_email_task
            # We call the function directly within the background task
            background_tasks.add_task(send_welcome_email_task, None, application_id)
            logger.info(f"Welcome email queued via BackgroundTasks for application {application_id}")
        except Exception as e:
            logger.error(f"Failed to queue welcome email: {e}")

    @classmethod
    async def apply_guest(
        cls, 
        job_id: int, 
        name: str, 
        email: str, 
        resume: UploadFile, 
        background_tasks: BackgroundTasks, 
        db: AsyncSession, 
        cover_letter: Optional[str] = None
    ) -> Application:
        """Processes a guest application, creating a shadow account if needed."""
        # 1. Validate Job
        result = await db.execute(select(Job).filter(Job.id == job_id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # 2. Extract and Validate Resume
        resume_path = await cls._process_resume_upload(resume)

        # 3. Create or Fetch Shadow User
        email_clean = email.strip().lower()
        result = await db.execute(select(User).filter(User.email == email_clean, User.role == UserRole.CANDIDATE))
        candidate = result.scalars().first()
        
        if not candidate:
            random_password = uuid.uuid4().hex + uuid.uuid4().hex[:8]
            hashed_password = auth_handler.hash_password(random_password)
            candidate = User(
                name=name.strip(),
                email=email_clean,
                password_hash=hashed_password,
                role=UserRole.CANDIDATE,
                is_approved=True,
                approval_status="approved"
            )
            db.add(candidate)
            await db.flush()
        else:
            candidate.name = name.strip()
            await db.flush()

        # 4. Check for duplicates
        result = await db.execute(
            select(Application).filter(
                Application.job_id == job_id,
                Application.candidate_id == candidate.id
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Already applied to this job")

        # 5. Save Application
        application = Application(
            job_id=job_id,
            candidate_id=candidate.id,
            cover_letter=cover_letter,
            resume_path=resume_path,
            status=ApplicationStatus.APPLIED
        )
        db.add(application)
        await db.flush()
        app_id = application.id
        await db.commit()
        
        # 6. Hydrate full relationships for return
        result = await db.execute(
            select(Application).options(
                selectinload(Application.job).selectinload(Job.recruiter),
                selectinload(Application.candidate)
            ).filter(Application.id == app_id)
        )
        application = result.scalars().first()

        # 7. Post processing tasks
        await cls._queue_post_application_tasks(application.id, background_tasks, candidate, job.title)

        return application

    @classmethod
    async def apply_authenticated(
        cls,
        job_id: int,
        current_user: User,
        background_tasks: BackgroundTasks,
        db: AsyncSession,
        resume: Optional[UploadFile] = None,
        cover_letter: Optional[str] = None
    ) -> Application:
        """Processes an application for an already authenticated candidate."""
        # 1. Validate Job
        result = await db.execute(select(Job).filter(Job.id == job_id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # 2. Check for duplicates
        result = await db.execute(
            select(Application).filter(
                Application.job_id == job_id,
                Application.candidate_id == current_user.id
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Already applied to this job")

        # 3. Extract and Validate Resume (if provided)
        resume_path = None
        if resume:
            resume_path = await cls._process_resume_upload(resume)

        # 4. Save Application
        application = Application(
            job_id=job_id,
            candidate_id=current_user.id,
            cover_letter=cover_letter,
            resume_path=resume_path,
            status=ApplicationStatus.APPLIED
        )
        db.add(application)
        await db.flush()
        app_id = application.id
        await db.commit()
        
        # 5. Hydrate full relationships for return
        result = await db.execute(
            select(Application).options(
                selectinload(Application.job).selectinload(Job.recruiter),
                selectinload(Application.candidate)
            ).filter(Application.id == app_id)
        )
        application = result.scalars().first()

        # 6. Post processing tasks
        await cls._queue_post_application_tasks(application.id, background_tasks, current_user, job.title)

        return application

    @classmethod
    async def _queue_post_application_tasks(
        cls, 
        application_id: int, 
        background_tasks: BackgroundTasks, 
        candidate: User, 
        job_title: str
    ):
        """Queues background tasks after a successful application."""
        try:
            # 1. Send Welcome Email (FastAPI BackgroundTask)
            from tasks.email_tasks import send_welcome_email_task
            background_tasks.add_task(send_welcome_email_task, application_id)
            logger.info(f"Welcome email task queued for application {application_id}")
            
            # 2. Run AI Resume Parsing + Match Scoring (FastAPI BackgroundTask)
            from tasks.resume_tasks import process_resume_directly
            background_tasks.add_task(process_resume_directly, application_id)
            logger.info(f"Resume processing BackgroundTask queued for application {application_id}")
            
        except Exception as e:
            logger.error(f"Failed to queue post-application tasks: {e}")

    @classmethod
    async def update_status(
        cls,
        application_id: int,
        new_status: ApplicationStatus,
        current_user: User,
        db: AsyncSession,
        background_tasks: BackgroundTasks
    ) -> Application:
        """Updates an application's status securely and dispatches emails if required."""
        # Find application and verify recruiter owns the job
        result = await db.execute(
            select(Application).options(
                selectinload(Application.job).selectinload(Job.recruiter),
                selectinload(Application.candidate)
            ).join(Job).filter(
                Application.id == application_id,
                Job.recruiter_id == current_user.id
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found or not authorized")
        
        # Validate status - reject shortlisted and hired
        if new_status.value in ['shortlisted', 'hired']:
            raise HTTPException(status_code=400, detail="Status 'shortlisted' and 'hired' are not allowed. Use 'applied', 'interview', 'offer', or 'rejected'.")

        # Update status
        old_status = application.status
        application.status = new_status
        await db.commit()
        
        # Reload with proper eager relationships instead of refresh() to prevent async greenlet errors
        result = await db.execute(
            select(Application).options(
                selectinload(Application.job).selectinload(Job.recruiter),
                selectinload(Application.candidate)
            ).filter(Application.id == application_id)
        )
        application = result.scalars().first()

        # Send status update email if status changed (except for interview status)
        if old_status != new_status and new_status.value != 'interview':
            try:
                from tasks.email_tasks import send_status_update_email_task
                background_tasks.add_task(send_status_update_email_task, application_id, new_status.value)
                logger.info(f"Status update email queued via BackgroundTasks for application {application_id}")
            except Exception as e:
                logger.error(f"Failed to queue status update email: {e}")
        elif new_status.value == 'interview':
            logger.info(f"Status changed to interview for application {application.id} - email will be sent when interview is scheduled")

        return application

    @classmethod
    async def bulk_update_status(
        cls,
        application_ids: List[int],
        status_string: str,
        current_user: User,
        db: AsyncSession
    ) -> int:
        """Bulk-updates the status of multiple applications."""
        try:
            new_status = ApplicationStatus(status_string)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status '{status_string}'")

        result = await db.execute(
            select(Application)
            .join(Job)
            .filter(
                Application.id.in_(application_ids),
                Job.recruiter_id == current_user.id,
            )
        )
        applications = result.scalars().all()

        if not applications:
            raise HTTPException(status_code=404, detail="No matching applications found")

        for app in applications:
            app.status = new_status

        await db.commit()
        return len(applications)
