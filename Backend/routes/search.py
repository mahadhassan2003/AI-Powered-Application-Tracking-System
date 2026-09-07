
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func, String
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from database import get_db
from models import Job, User, Application, ResumeData, UserRole
from routes.auth import get_current_user

router = APIRouter()

@router.get("/jobs/advanced-search")
async def advanced_job_search(
    keywords: Optional[str] = Query(None, description="Job title or description keywords"),
    location: Optional[str] = Query(None),
    salary_min: Optional[int] = Query(None),
    salary_max: Optional[int] = Query(None),
    experience_level: Optional[str] = Query(None, description="entry,mid,senior,executive"),
    job_type: Optional[str] = Query(None, description="full-time,part-time,contract,remote"),
    company_size: Optional[str] = Query(None, description="startup,small,medium,large"),
    posted_within_days: Optional[int] = Query(None, description="Jobs posted within X days"),
    skills: Optional[str] = Query(None, description="Comma-separated required skills"),
    sort_by: Optional[str] = Query("relevance", description="relevance,date,salary"),
    db: AsyncSession = Depends(get_db)
):
    """Advanced job search with multiple filters"""
    stmt = select(Job).options(
        selectinload(Job.recruiter),
        selectinload(Job.applications)
    )
    
    # Keyword search
    if keywords:
        keywords_filter = or_(
            Job.title.ilike(f"%{keywords}%"),
            Job.description.ilike(f"%{keywords}%"),
            Job.requirements.ilike(f"%{keywords}%")
        )
        stmt = stmt.filter(keywords_filter)
    
    # Location filter
    if location:
        stmt = stmt.filter(Job.location.ilike(f"%{location}%"))
    
    # Date filter
    if posted_within_days:
        date_threshold = datetime.utcnow() - timedelta(days=posted_within_days)
        stmt = stmt.filter(Job.created_at >= date_threshold)
    
    # Skills filter
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
        for skill in skill_list:
            stmt = stmt.filter(
                or_(
                    Job.requirements.ilike(f"%{skill}%"),
                    Job.description.ilike(f"%{skill}%")
                )
            )
    
    # Sorting
    if sort_by == "date":
        stmt = stmt.order_by(Job.created_at.desc())
    elif sort_by == "salary":
        stmt = stmt.order_by(Job.salary_range.desc())
    else:  # relevance (default)
        stmt = stmt.order_by(Job.created_at.desc())
    
    stmt = stmt.limit(50)
    result = await db.execute(stmt)
    jobs = result.scalars().unique().all()
    
    return [{
        "id": job.id,
        "title": job.title,
        "description": job.description[:200] + "..." if len(job.description) > 200 else job.description,
        "location": job.location,
        "salary_range": job.salary_range,
        "company": job.recruiter.name,
        "posted_date": job.created_at.isoformat(),
        "applicant_count": len(job.applications)
    } for job in jobs]

@router.get("/candidates/advanced-search")
async def advanced_candidate_search(
    skills: Optional[str] = Query(None, description="Required skills"),
    experience_min: Optional[float] = Query(None),
    experience_max: Optional[float] = Query(None),
    education: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    availability: Optional[str] = Query(None, description="available,employed,not_looking"),
    last_active_days: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Advanced candidate search for recruiters"""
    if current_user.role != UserRole.RECRUITER:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only recruiters can search candidates")
    
    # Get candidates with resume data for better filtering
    stmt = select(User).options(
        selectinload(User.resume_data),
        selectinload(User.applications)
    ).filter(User.role == UserRole.CANDIDATE)
    stmt = stmt.outerjoin(ResumeData, User.id == ResumeData.candidate_id)
    
    filters = []
    
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        skill_filters = []
        for skill in skill_list:
            skill_filters.append(
                or_(
                    func.lower(User.skills).like(f"%{skill}%"),
                    ResumeData.skills.cast(String).ilike(f"%{skill}%")
                )
            )
        filters.extend(skill_filters)
    
    if experience_min is not None:
        filters.append(
            or_(
                ResumeData.total_experience_years >= experience_min,
                func.length(User.experience) > experience_min * 100
            )
        )
    
    if experience_max is not None:
        filters.append(
            or_(
                ResumeData.total_experience_years <= experience_max,
                func.length(User.experience) <= experience_max * 200
            )
        )
    
    if education:
        filters.append(
            or_(
                ResumeData.education_level.ilike(f"%{education}%"),
                User.experience.ilike(f"%{education}%")
            )
        )
    
    if filters:
        stmt = stmt.filter(and_(*filters))
    
    stmt = stmt.distinct().limit(50)
    result = await db.execute(stmt)
    candidates = result.scalars().unique().all()
    
    return [{
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "skills": candidate.skills,
        "experience_years": getattr(candidate.resume_data[0], 'total_experience_years', None) if candidate.resume_data else None,
        "education_level": getattr(candidate.resume_data[0], 'education_level', None) if candidate.resume_data else None,
        "application_count": len(candidate.applications),
        "last_application": candidate.applications[0].applied_at.isoformat() if candidate.applications else None
    } for candidate in candidates]
