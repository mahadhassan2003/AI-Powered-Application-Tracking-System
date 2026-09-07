from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks, Query, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, Text, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import uuid
import mimetypes
import csv
import io
from pathlib import Path
from datetime import datetime
from database import get_db
from models import Application, ApplicationStatus, Job, User, UserRole, ResumeData, CandidateRanking, ProcessingStatus
from routes.auth import get_current_user, get_current_candidate, get_current_recruiter
from auth import auth_handler
# NOTE: tasks.resume_tasks is imported lazily where needed to avoid
# pulling in celery_app / redis / spacy at module-load time.
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class ApplicationCreate(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    recruiter_name: str
    candidate_name: str
    candidate_email: str
    status: str
    cover_letter: Optional[str]
    resume_path: Optional[str]
    applied_at: str
    updated_at: str
    match_score: Optional[float] = None
    skill_match_score: Optional[float] = None
    experience_match_score: Optional[float] = None
    semantic_similarity_score: Optional[float] = None

    class Config:
        from_attributes = True

class StatusUpdate(BaseModel):
    status: ApplicationStatus


@router.post("/apply/{job_id}/guest", response_model=ApplicationResponse)
async def apply_to_job_guest(
    job_id: int,
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    cover_letter: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    from services.application_service import ApplicationService
    
    application = await ApplicationService.apply_guest(
        job_id=job_id,
        name=name,
        email=email,
        resume=resume,
        background_tasks=background_tasks,
        db=db,
        cover_letter=cover_letter
    )

    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title,
        recruiter_name=application.job.recruiter.name,
        candidate_name=application.candidate.name,
        candidate_email=application.candidate.email,
        status=application.status.value,
        cover_letter=application.cover_letter,
        resume_path=application.resume_path,
        applied_at=application.applied_at.isoformat(),
        updated_at=application.updated_at.isoformat(),
        match_score=application.match_score,
        skill_match_score=application.skill_match_score,
        experience_match_score=application.experience_match_score,
        semantic_similarity_score=application.semantic_similarity_score
    )
    


@router.post("/apply/{job_id}", response_model=ApplicationResponse)
async def apply_to_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    cover_letter: Optional[str] = None,
    resume: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    from services.application_service import ApplicationService
    
    application = await ApplicationService.apply_authenticated(
        job_id=job_id,
        current_user=current_user,
        background_tasks=background_tasks,
        db=db,
        resume=resume,
        cover_letter=cover_letter
    )

    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title if hasattr(application, 'job') and application.job else "",
        recruiter_name=application.job.recruiter.name if hasattr(application, 'job') and application.job and application.job.recruiter else "",
        candidate_name=application.candidate.name if hasattr(application, 'candidate') and application.candidate else "",
        candidate_email=application.candidate.email if hasattr(application, 'candidate') and application.candidate else "",
        status=application.status.value if hasattr(application.status, 'value') else str(application.status),
        cover_letter=application.cover_letter,
        resume_path=application.resume_path,
        applied_at=application.applied_at.isoformat() if hasattr(application.applied_at, 'isoformat') else str(application.applied_at),
        updated_at=application.updated_at.isoformat() if hasattr(application.updated_at, 'isoformat') else str(application.updated_at),
        match_score=application.match_score,
        skill_match_score=application.skill_match_score,
        experience_match_score=application.experience_match_score,
        semantic_similarity_score=application.semantic_similarity_score
    )

@router.get("/my-applications", response_model=List[ApplicationResponse])
async def get_my_applications(
    current_user: User = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application).options(
            selectinload(Application.job).selectinload(Job.recruiter),
            selectinload(Application.candidate)
        ).filter(
            Application.candidate_id == current_user.id
        ).order_by(Application.applied_at.desc())
    )
    applications = result.scalars().all()

    return [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=app.job.title,
            recruiter_name=app.job.recruiter.name,
            candidate_name=app.candidate.name,
            candidate_email=app.candidate.email,
            status=app.status.value,
            cover_letter=app.cover_letter,
            resume_path=app.resume_path,
            applied_at=app.applied_at.isoformat(),
            updated_at=app.updated_at.isoformat(),
            match_score=app.match_score,
            skill_match_score=app.skill_match_score,
            experience_match_score=app.experience_match_score,
            semantic_similarity_score=app.semantic_similarity_score
        )
        for app in applications
    ]

@router.get("/job/{job_id}/applications", response_model=List[ApplicationResponse])
async def get_job_applications(
    job_id: int,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    # Check if job exists
    result = await db.execute(select(Job).filter(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if job belongs to current recruiter
    if job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view applications for this job")

    result = await db.execute(
        select(Application).options(
            selectinload(Application.candidate)
        ).filter(
            Application.job_id == job_id
        ).order_by(Application.applied_at.desc())
    )
    applications = result.scalars().all()

    return [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=job.title,
            recruiter_name=current_user.name,
            candidate_name=app.candidate.name,
            candidate_email=app.candidate.email,
            status=app.status.value,
            cover_letter=app.cover_letter,
            resume_path=app.resume_path,
            applied_at=app.applied_at.isoformat(),
            updated_at=app.updated_at.isoformat(),
            match_score=app.match_score,
            skill_match_score=app.skill_match_score,
            experience_match_score=app.experience_match_score,
            semantic_similarity_score=app.semantic_similarity_score
        )
        for app in applications
    ]

@router.get("/recruiter/all-applications", response_model=List[ApplicationResponse])
async def get_all_applications_for_recruiter(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application).options(
            selectinload(Application.job).selectinload(Job.recruiter),
            selectinload(Application.candidate)
        ).join(Job).filter(
            Job.recruiter_id == current_user.id
        ).order_by(Application.applied_at.desc())
    )
    applications = result.scalars().all()

    return [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=app.job.title,
            recruiter_name=current_user.name,
            candidate_name=app.candidate.name,
            candidate_email=app.candidate.email,
            status=app.status.value,
            cover_letter=app.cover_letter,
            resume_path=app.resume_path,
            applied_at=app.applied_at.isoformat(),
            updated_at=app.updated_at.isoformat(),
            match_score=app.match_score,
            skill_match_score=app.skill_match_score,
            experience_match_score=app.experience_match_score,
            semantic_similarity_score=app.semantic_similarity_score
        )
        for app in applications
    ]

@router.put("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: int,
    status_update: StatusUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    from services.application_service import ApplicationService
    
    application = await ApplicationService.update_status(
        application_id=application_id,
        new_status=status_update.status,
        current_user=current_user,
        db=db,
        background_tasks=background_tasks
    )

    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title,
        recruiter_name=current_user.name,
        candidate_name=application.candidate.name,
        candidate_email=application.candidate.email,
        status=application.status.value,
        cover_letter=application.cover_letter,
        resume_path=application.resume_path,
        applied_at=application.applied_at.isoformat(),
        updated_at=application.updated_at.isoformat(),
        match_score=application.match_score,
        skill_match_score=application.skill_match_score,
        experience_match_score=application.experience_match_score,
        semantic_similarity_score=application.semantic_similarity_score
    )


class BulkStatusUpdate(BaseModel):
    ids: List[int]
    status: str


@router.patch("/bulk-update")
async def bulk_update_application_status(
    payload: BulkStatusUpdate,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-update the status of multiple applications (recruiter only).
    Only applications that belong to jobs owned by this recruiter are updated.
    """
    from services.application_service import ApplicationService
    
    updated_count = await ApplicationService.bulk_update_status(
        application_ids=payload.ids,
        status_string=payload.status,
        current_user=current_user,
        db=db
    )

    return {"updated": updated_count, "status": payload.status}


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single application by ID.
    Candidates can only retrieve their own applications.
    Recruiters can retrieve any application on a job they own.
    """
    stmt = select(Application).options(
        selectinload(Application.job).selectinload(Job.recruiter),
        selectinload(Application.candidate)
    ).join(Job)

    if current_user.role == UserRole.CANDIDATE:
        stmt = stmt.filter(
            Application.id == application_id,
            Application.candidate_id == current_user.id,
        )
    else:
        # recruiter or admin
        stmt = stmt.filter(Application.id == application_id)
        if current_user.role == UserRole.RECRUITER:
            stmt = stmt.filter(Job.recruiter_id == current_user.id)

    result = await db.execute(stmt)
    application = result.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found or not authorized")

    return ApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title,
        recruiter_name=application.job.recruiter.name if application.job.recruiter else "",
        candidate_name=application.candidate.name,
        candidate_email=application.candidate.email,
        status=application.status.value,
        cover_letter=application.cover_letter,
        resume_path=application.resume_path,
        applied_at=application.applied_at.isoformat(),
        updated_at=application.updated_at.isoformat(),
        match_score=application.match_score,
        skill_match_score=application.skill_match_score,
        experience_match_score=application.experience_match_score,
        semantic_similarity_score=application.semantic_similarity_score,
    )


@router.get("/download-resume/{application_id}")
async def download_resume(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated endpoint to download resume files"""
    # Find the application
    result = await db.execute(
        select(Application).options(
            selectinload(Application.job),
            selectinload(Application.candidate)
        ).filter(Application.id == application_id)
    )
    application = result.scalars().first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Check authorization: candidate can download their own resume, recruiter can download resumes for their jobs
    if current_user.role == UserRole.CANDIDATE:
        if application.candidate_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to download this resume")
    elif current_user.role == UserRole.RECRUITER:
        if application.job.recruiter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to download this resume")
    else:
        raise HTTPException(status_code=403, detail="Invalid user role")

    # Check if resume exists
    if not application.resume_path:
        raise HTTPException(status_code=404, detail="No resume found for this application")

    from services.storage_service import storage_service

    # Check if file exists in storage
    if not storage_service.file_exists(application.resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found in storage")

    # For S3, generate presigned URL for download
    if storage_service.storage_type == "s3":
        presigned_url = storage_service.get_presigned_url(application.resume_path, expiration=300)
        if presigned_url:
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=presigned_url)

    # For local storage or fallback, serve file directly
    file_content = storage_service.get_file(application.resume_path)

    # Determine content type and filename for download
    file_extension = Path(application.resume_path).suffix.lower()
    if file_extension == ".pdf":
        media_type = "application/pdf"
    elif file_extension == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"

    # Generate a clean filename for download
    candidate_name = application.candidate.name.replace(" ", "_")
    job_title = application.job.title.replace(" ", "_")
    download_filename = f"{candidate_name}_{job_title}_resume{file_extension}"

    from fastapi.responses import Response
    return Response(
        content=file_content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={download_filename}"}
    )

@router.get("/job/{job_id}/ranked-candidates")
async def get_ranked_candidates(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    """Get ranked candidates for a specific job"""
    try:
        # Get job
        result = await db.execute(select(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Get all applications for this job
        result = await db.execute(
            select(Application).options(
                selectinload(Application.candidate)
            ).filter(Application.job_id == job_id)
        )
        applications = result.scalars().all()

        total_candidates = len(applications)
        scored_candidates = 0
        pending_scoring = 0

        # Get ranked candidates from CandidateRanking table
        result = await db.execute(
            select(CandidateRanking).filter(
                CandidateRanking.job_id == job_id,
                CandidateRanking.is_current == True
            ).order_by(CandidateRanking.overall_rank)
        )
        rankings = result.scalars().all()

        ranked_candidates = []

        if rankings:
            # Use data from rankings table
            for ranking in rankings:
                result = await db.execute(
                    select(Application).options(
                        selectinload(Application.candidate)
                    ).filter(Application.id == ranking.application_id)
                )
                application = result.scalars().first()
                if application:
                    candidate = application.candidate
                    result = await db.execute(
                        select(ResumeData).filter(ResumeData.application_id == application.id)
                    )
                    resume_data = result.scalars().first()

                    # Determine processing status
                    has_resume = bool(application.resume_path)
                    processing_status = "completed"
                    if not has_resume:
                        processing_status = "no_resume"
                    elif application.processing_status:
                        processing_status = application.processing_status.value

                    candidate_info = {
                        "rank": ranking.overall_rank,
                        "candidate_name": candidate.name,
                        "candidate_email": candidate.email,
                        "application_id": application.id,
                        "overall_score": round(ranking.overall_fit_score or 0, 1),
                        "skill_score": round(ranking.technical_score or 0, 1),
                        "experience_score": round(ranking.experience_score or 0, 1),
                        "semantic_score": round(application.semantic_similarity_score or 0, 1),
                        "total_experience_years": resume_data.total_experience_years if resume_data else 0,
                        "education_level": resume_data.education_level if resume_data else "other",
                        "status": application.status.value,
                        "applied_at": application.applied_at.isoformat(),
                        "confidence_score": round((resume_data.confidence_score or 0) * 100, 0) if resume_data else 0,
                        "skills": resume_data.skills if resume_data and resume_data.skills else [],
                        "has_resume": has_resume,
                        "processing_status": processing_status
                    }
                    ranked_candidates.append(candidate_info)
                    if ranking.overall_fit_score and ranking.overall_fit_score > 0:
                        scored_candidates += 1
        else:
            # Fallback: use applications directly if no rankings exist
            for i, application in enumerate(applications, 1):
                candidate = application.candidate
                result = await db.execute(
                    select(ResumeData).filter(ResumeData.application_id == application.id)
                )
                resume_data = result.scalars().first()

                # Determine processing status
                has_resume = bool(application.resume_path)
                processing_status = "pending"
                if not has_resume:
                    processing_status = "no_resume"
                elif application.processing_status:
                    processing_status = application.processing_status.value

                overall_score = application.match_score or 0

                candidate_info = {
                    "rank": i,
                    "candidate_name": candidate.name,
                    "candidate_email": candidate.email,
                    "application_id": application.id,
                    "overall_score": round(overall_score, 1),
                    "skill_score": round(application.skill_match_score or 0, 1),
                    "experience_score": round(application.experience_match_score or 0, 1),
                    "semantic_score": round(application.semantic_similarity_score or 0, 1),
                    "total_experience_years": resume_data.total_experience_years if resume_data else 0,
                    "education_level": resume_data.education_level if resume_data else "other",
                    "status": application.status.value,
                    "applied_at": application.applied_at.isoformat(),
                    "confidence_score": round((resume_data.confidence_score or 0) * 100, 0) if resume_data else 0,
                    "skills": resume_data.skills if resume_data and resume_data.skills else [],
                    "has_resume": has_resume,
                    "processing_status": processing_status
                }
                ranked_candidates.append(candidate_info)
                if overall_score > 0:
                    scored_candidates += 1

        # Calculate pending scoring
        pending_scoring = total_candidates - scored_candidates

        result_data = {
            "job_title": job.title,
            "job": {
                "id": job.id,
                "title": job.title
            },
            "total_candidates": total_candidates,
            "scored_candidates": scored_candidates,
            "pending_scoring": pending_scoring,
            "ranked_candidates": ranked_candidates
        }

        return result_data

    except Exception as e:
        logger.error(f"Error getting ranked candidates for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get ranked candidates: {str(e)}")


@router.post("/job/{job_id}/recalculate-scores")
async def recalculate_job_scores(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    """Recalculate match scores for all applications to a specific job"""
    try:
        # Verify job ownership
        result = await db.execute(select(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Import the task functions
        from tasks.resume_tasks import calculate_basic_match_scores, update_candidate_rankings_task

        # Get all applications for this job that have resume data
        result = await db.execute(select(Application).filter(Application.job_id == job_id))
        applications = result.scalars().all()
        recalculated_count = 0

        for application in applications:
            result = await db.execute(
                select(ResumeData).filter(ResumeData.application_id == application.id)
            )
            resume_data = result.scalars().first()
            if not resume_data:
                continue

            try:
                # Recalculate scores with new algorithm
                scores = calculate_basic_match_scores(resume_data, job)

                # Update application with new scores
                application.match_score = scores['overall_score']
                application.skill_match_score = scores['skill_score']
                application.experience_match_score = scores['experience_score']
                application.semantic_similarity_score = scores['semantic_score']

                recalculated_count += 1

            except Exception as score_error:
                logger.error(f"Error recalculating scores for application {application.id}: {score_error}")
                continue

        await db.commit()

        # Update rankings
        try:
            update_candidate_rankings_task(None, job_id)  # self=None for direct call
        except Exception as ranking_error:
            logger.warning(f"Ranking update failed: {ranking_error}")

        return {
            "message": "Score recalculation completed",
            "job_id": job_id,
            "recalculated_count": recalculated_count
        }

    except Exception as e:
        logger.error(f"Error recalculating scores: {e}")
        raise HTTPException(status_code=500, detail="Failed to recalculate scores")


@router.post("/{application_id}/recalculate-score")
async def recalculate_single_application_score(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_recruiter)
):
    """Recalculate match score for a single application (recruiter only)."""
    try:
        # Verify the application exists and belongs to a job owned by this recruiter
        result = await db.execute(
            select(Application).options(
                selectinload(Application.job)
            ).join(Job).filter(
                Application.id == application_id,
                Job.recruiter_id == current_user.id
            )
        )
        application = result.scalars().first()

        if not application:
            raise HTTPException(status_code=404, detail="Application not found or not authorized")

        job = application.job

        # Check if resume data exists – scoring requires parsed resume
        result = await db.execute(
            select(ResumeData).filter(ResumeData.application_id == application_id)
        )
        resume_data = result.scalars().first()

        if not resume_data:
            raise HTTPException(
                status_code=400,
                detail="No parsed resume data found for this application. The resume may still be processing or failed to parse."
            )

        # Import scoring function
        from tasks.resume_tasks import calculate_basic_match_scores, update_candidate_rankings_task

        # Recalculate scores
        scores = calculate_basic_match_scores(resume_data, job)

        # Persist updated scores
        application.match_score = scores['overall_score']
        application.skill_match_score = scores['skill_score']
        application.experience_match_score = scores['experience_score']
        if 'semantic_score' in scores:
            application.semantic_similarity_score = scores['semantic_score']

        await db.commit()
        await db.refresh(application)

        # Refresh rankings for the job
        try:
            update_candidate_rankings_task(None, job.id)
        except Exception as ranking_error:
            logger.warning(f"Ranking update failed after single-score recalculation: {ranking_error}")

        return {
            "message": "Match score recalculated successfully",
            "application_id": application_id,
            "match_score": application.match_score,
            "skill_match_score": application.skill_match_score,
            "experience_match_score": application.experience_match_score,
            "semantic_similarity_score": application.semantic_similarity_score,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating score for application {application_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to recalculate match score")

# Pydantic models for candidate search
class CandidateSearchResponse(BaseModel):
    candidate_id: int
    name: str
    email: str
    skills: List[str]
    total_experience_years: Optional[float]
    education_level: Optional[str]
    applications_count: int
    latest_application_date: Optional[str]

    class Config:
        from_attributes = True

@router.get("/search-candidates", response_model=List[CandidateSearchResponse])
async def search_candidates(
    skills: Optional[str] = Query(None, description="Search by skills (comma-separated)"),
    min_experience: Optional[float] = Query(None, description="Minimum years of experience"),
    max_experience: Optional[float] = Query(None, description="Maximum years of experience"),
    education_level: Optional[str] = Query(None, description="Filter by education level (bachelor, master, phd, other)"),
    location: Optional[str] = Query(None, description="Search by location (from user profile)"),
    has_resume: Optional[bool] = Query(None, description="Filter candidates with/without resumes"),
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Search for candidates based on skills, experience, and other criteria"""
    try:
        from services.candidate_search_service import CandidateSearchService
        response_data = await CandidateSearchService.search_candidates(
            current_user=current_user,
            db=db,
            skills=skills,
            min_experience=min_experience,
            max_experience=max_experience,
            education_level=education_level,
            location=location,
            has_resume=has_resume
        )
        return [CandidateSearchResponse(**data) for data in response_data]

    except Exception as e:
        logger.error(f"Error searching candidates: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to search candidates: {str(e)}")

@router.get("/available-skills")
async def get_available_skills(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Get a list of all available skills from candidate profiles and resumes for search suggestions"""
    try:
        from services.candidate_search_service import CandidateSearchService
        return await CandidateSearchService.get_available_skills(db=db)
    except Exception as e:
        logger.error(f"Error getting available skills: {e}")
        raise HTTPException(status_code=500, detail="Failed to get available skills")

@router.get("/job/{job_id}/export-rankings")
async def export_candidate_rankings(
    job_id: int,
    format: str = Query("csv", description="Export format: csv or excel"),
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Export candidate rankings for a job as CSV or Excel"""
    try:
        from services.export_service import ExportService
        response, _ = await ExportService.export_job_rankings(
            job_id=job_id,
            current_user=current_user,
            db=db
        )
        return response
    except Exception as e:
        logger.error(f"Error exporting candidate rankings for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to export rankings: {str(e)}")

@router.get("/export-all-applications")
async def export_all_applications(
    format: str = Query("csv", description="Export format: csv"),
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Export all applications for recruiter's jobs"""
    try:
        from services.export_service import ExportService
        response, _ = await ExportService.export_all_applications(
            current_user=current_user,
            db=db
        )
        return response
    except Exception as e:
        logger.error(f"Error exporting all applications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export applications: {str(e)}")


# ==================== ADVANCE TOP CANDIDATES ====================

class AdvanceTopCandidatesRequest(BaseModel):
    mode: str = "top_n"  # 'top_n' or 'threshold'
    top_count: Optional[int] = 5
    interview_threshold: Optional[int] = 75
    reject_mode: str = "all_remaining" # 'all_remaining', 'below_threshold', 'none'
    reject_threshold: Optional[int] = 50
    ranking_basis: str = "match_score"
    send_interview_emails: bool = True
    send_rejection_emails: bool = True

class AdvanceTopCandidatesPreviewResponse(BaseModel):
    job_id: int
    job_title: str
    eligible_count: int
    selected_count: int
    rejected_count: int
    emails_queued: int
    skipped_count: int
    unchanged_count: int
    selected_candidates: list
    warnings: list

class AdvanceTopCandidatesResponse(BaseModel):
    job_id: int
    selected_count: int
    rejected_count: int
    emails_queued: int
    skipped_count: int
    unchanged_count: int
    status: str


@router.post("/job/{job_id}/advance-top-candidates/preview")
async def preview_advance_top_candidates(
    job_id: int,
    request: AdvanceTopCandidatesRequest,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Preview the advance-top-candidates operation without executing it."""
    try:
        # Verify job ownership
        result = await db.execute(select(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Fetch eligible applications (only 'applied' status)
        result = await db.execute(
            select(Application).options(
                selectinload(Application.candidate)
            ).filter(
                Application.job_id == job_id,
                Application.status == ApplicationStatus.APPLIED
            )
        )
        eligible = result.scalars().all()

        warnings = []
        if request.mode == "top_n" and (not request.top_count or request.top_count <= 0):
            raise HTTPException(status_code=400, detail="top_count must be > 0 in top_n mode")
            
        unscored = [a for a in eligible if a.match_score is None]
        if len(unscored) > 0:
            warnings.append(f"{len(unscored)} candidates have no AI match score. In Threshold mode they will default to remaining in Applied status, or rejected if you chose to reject all.")

        if request.mode == "top_n" and request.top_count and request.top_count >= len(eligible):
            warnings.append(f"top_count ({request.top_count}) >= eligible candidates ({len(eligible)}). No rejections will occur.")

        # Logic for partitioning
        selected = []
        rejected = []
        unchanged = []

        if request.mode == "top_n":
            scored = [a for a in eligible if a.match_score is not None]
            scored.sort(key=lambda a: (a.match_score or 0), reverse=True)
            unscored.sort(key=lambda a: a.applied_at)
            ranked = scored + unscored

            selected = ranked[:request.top_count]
            remaining = ranked[request.top_count:]

            if request.reject_mode in ["all_remaining", "below_threshold"]:
                rejected = remaining
            else:
                unchanged = remaining

        elif request.mode == "threshold":
            for app in eligible:
                if app.match_score is not None and app.match_score >= (request.interview_threshold or 0):
                    selected.append(app)
                else:
                    if request.reject_mode == "all_remaining":
                        rejected.append(app)
                    elif request.reject_mode == "below_threshold":
                        if app.match_score is not None and app.match_score < (request.reject_threshold or 0):
                            rejected.append(app)
                        else:
                            unchanged.append(app)
                    else:
                        unchanged.append(app)

        emails_queued = 0
        if request.send_interview_emails:
            emails_queued += len(selected)
        if request.send_rejection_emails and len(rejected) > 0:
            emails_queued += len(rejected)

        # Build preview list
        selected_preview = [
            {
                "application_id": a.id,
                "candidate_name": a.candidate.name,
                "candidate_email": a.candidate.email,
                "match_score": round(a.match_score or 0, 1) if a.match_score is not None else 0,
                "applied_at": a.applied_at.isoformat()
            }
            for a in selected
        ]

        return AdvanceTopCandidatesPreviewResponse(
            job_id=job_id,
            job_title=job.title,
            eligible_count=len(eligible),
            selected_count=len(selected),
            rejected_count=len(rejected),
            emails_queued=emails_queued,
            skipped_count=0,
            unchanged_count=len(unchanged),
            selected_candidates=selected_preview,
            warnings=warnings
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing advance-top-candidates for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate preview")


@router.post("/job/{job_id}/advance-top-candidates")
async def advance_top_candidates(
    job_id: int,
    request: AdvanceTopCandidatesRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """Execute the advance-top-candidates batch decision."""
    try:
        # Verify job ownership
        result = await db.execute(select(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if request.mode == "top_n" and (not request.top_count or request.top_count <= 0):
            raise HTTPException(status_code=400, detail="top_count must be > 0 in top_n mode")

        # Fetch eligible applications (only 'applied' status)
        result = await db.execute(
            select(Application).options(
                selectinload(Application.candidate)
            ).filter(
                Application.job_id == job_id,
                Application.status == ApplicationStatus.APPLIED
            )
        )
        eligible = result.scalars().all()

        # Logic for partitioning
        selected = []
        rejected = []
        unchanged = []

        if request.mode == "top_n":
            scored = [a for a in eligible if a.match_score is not None]
            scored.sort(key=lambda a: (a.match_score or 0), reverse=True)
            unscored = [a for a in eligible if a.match_score is None]
            unscored.sort(key=lambda a: a.applied_at)
            ranked = scored + unscored

            selected = ranked[:request.top_count]
            remaining = ranked[request.top_count:]

            if request.reject_mode in ["all_remaining", "below_threshold"]:
                rejected = remaining
            else:
                unchanged = remaining

        elif request.mode == "threshold":
            for app in eligible:
                if app.match_score is not None and app.match_score >= (request.interview_threshold or 0):
                    selected.append(app)
                else:
                    if request.reject_mode == "all_remaining":
                        rejected.append(app)
                    elif request.reject_mode == "below_threshold":
                        if app.match_score is not None and app.match_score < (request.reject_threshold or 0):
                            rejected.append(app)
                        else:
                            unchanged.append(app)
                    else:
                        unchanged.append(app)

        # Move selected to interview
        for app in selected:
            app.status = ApplicationStatus.INTERVIEW
            app.updated_at = datetime.utcnow()

        # Reject remaining if enabled
        for app in rejected:
            app.status = ApplicationStatus.REJECTED
            app.updated_at = datetime.utcnow()

        selected_ids = [app.id for app in selected]
        rejected_ids = [app.id for app in rejected]
        
        await db.commit()

        # Queue emails via background tasks
        emails_queued = 0
        from tasks.email_tasks import send_status_update_email_task, send_rejection_email_task

        if request.send_interview_emails:
            for aid in selected_ids:
                background_tasks.add_task(
                    send_status_update_email_task.delay, aid, "interview"
                )
                emails_queued += 1

        if request.send_rejection_emails:
            for aid in rejected_ids:
                background_tasks.add_task(
                    send_rejection_email_task.delay, aid
                )
                emails_queued += 1

        return AdvanceTopCandidatesResponse(
            job_id=job_id,
            selected_count=len(selected),
            rejected_count=len(rejected),
            emails_queued=emails_queued,
            skipped_count=0,
            unchanged_count=len(unchanged),
            status="completed"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error advancing top candidates for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to advance top candidates")


@router.delete("/{application_id}", status_code=status.HTTP_200_OK)
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a single application. Only the recruiter who owns the job can delete it.
    Cascades to related ResumeData and CandidateRanking records.
    """
    # Verify ownership
    result = await db.execute(
        select(Application)
        .join(Job)
        .filter(
            Application.id == application_id,
            Job.recruiter_id == current_user.id
        )
    )
    application = result.scalars().first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found or not authorized")

    # Delete related records first
    await db.execute(
        select(ResumeData).filter(ResumeData.application_id == application_id)
    )
    related_resumes = (await db.execute(
        select(ResumeData).filter(ResumeData.application_id == application_id)
    )).scalars().all()
    for r in related_resumes:
        await db.delete(r)

    related_rankings = (await db.execute(
        select(CandidateRanking).filter(CandidateRanking.application_id == application_id)
    )).scalars().all()
    for r in related_rankings:
        await db.delete(r)

    # Save IDs before commit to avoid MissingGreenlet on expired attributes
    recruiter_id = current_user.id
    
    await db.delete(application)
    await db.commit()

    logger.info(f"Application {application_id} deleted by recruiter {recruiter_id}")
    return {"detail": "Application deleted successfully", "application_id": application_id}