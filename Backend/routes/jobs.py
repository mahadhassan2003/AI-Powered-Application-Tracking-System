from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Job, User, UserRole, Tag, JobCategory
from routes.auth import get_current_user, get_current_recruiter

router = APIRouter()

# Pydantic models
class JobCreate(BaseModel):
    title: str
    description: str
    requirements: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    category: JobCategory = JobCategory.OTHER
    tags: Optional[List[str]] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    category: Optional[JobCategory] = None
    tags: Optional[List[str]] = None

class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    requirements: str
    location: Optional[str]
    salary_range: Optional[str]
    category: str
    tags: List[str]
    recruiter_name: str
    created_at: str
    applicant_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[dict])
async def get_jobs(
    skip: int = 0,
    limit: int = 100,
    category: Optional[JobCategory] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all jobs - Public endpoint for landing page and authenticated users"""
    
    stmt = select(Job).options(selectinload(Job.tags), selectinload(Job.applications))
    
    if category:
        stmt = stmt.filter(Job.category == category)
    
    if search:
        stmt = stmt.filter(
            or_(
                Job.title.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%")
            )
        )
    
    # Order by most recent first
    stmt = stmt.order_by(Job.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().unique().all()
    
    # Convert to dict
    jobs_data = [
        {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements,
            "location": job.location,
            "salary_range": job.salary_range,
            "category": job.category.value if job.category else None,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "recruiter_id": job.recruiter_id,
            "tags": [tag.name for tag in job.tags] if job.tags else [],
            "applicant_count": len(job.applications) if job.applications else 0
        }
        for job in jobs
    ]
    
    return jobs_data


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Job).options(
            selectinload(Job.tags),
            selectinload(Job.applications),
            selectinload(Job.recruiter)
        ).filter(Job.id == job_id)
    )
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        requirements=job.requirements,
        location=job.location,
        salary_range=job.salary_range,
        category=job.category.value,
        tags=[tag.name for tag in job.tags],
        recruiter_name=job.recruiter.name,
        created_at=job.created_at.isoformat(),
        applicant_count=len(job.applications) if job.applications else 0
    )

async def get_or_create_tags(db: AsyncSession, tag_names: List[str]) -> List[Tag]:
    """Helper function to get existing tags or create new ones"""
    tags = []
    for tag_name in tag_names:
        tag_name = tag_name.strip().lower()
        if tag_name:
            result = await db.execute(select(Tag).filter(Tag.name == tag_name))
            tag = result.scalars().first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
            tags.append(tag)
    return tags

@router.post("", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    job = Job(
        recruiter_id=current_user.id,
        title=job_data.title,
        description=job_data.description,
        requirements=job_data.requirements,
        location=job_data.location,
        salary_range=job_data.salary_range,
        category=job_data.category
    )
    
    db.add(job)
    await db.flush()  # Get the ID without committing
    
    # Handle tags
    if job_data.tags:
        job_tags = await get_or_create_tags(db, job_data.tags)
        job.tags.extend(job_tags)
    
    job_id = job.id
    recruiter_name = current_user.name
    await db.commit()
    
    # Reload job with tags relationship eagerly loaded
    result = await db.execute(
        select(Job).options(selectinload(Job.tags)).filter(Job.id == job_id)
    )
    job = result.scalars().first()
    
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        requirements=job.requirements,
        location=job.location,
        salary_range=job.salary_range,
        category=job.category.value,
        tags=[tag.name for tag in job.tags],
        recruiter_name=recruiter_name,
        created_at=job.created_at.isoformat()
    )

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Job).options(selectinload(Job.tags)).filter(Job.id == job_id, Job.recruiter_id == current_user.id)
    )
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    
    # Update basic fields
    update_data = job_data.dict(exclude_unset=True, exclude={'tags'})
    for field, value in update_data.items():
        setattr(job, field, value)
    
    # Handle tags separately
    if job_data.tags is not None:
        # Clear existing tags
        job.tags.clear()
        if job_data.tags:
            new_tags = await get_or_create_tags(db, job_data.tags)
            job.tags.extend(new_tags)
    
    recruiter_name = current_user.name
    await db.commit()
    
    # Reload job with tags relationship eagerly loaded
    result = await db.execute(
        select(Job).options(selectinload(Job.tags)).filter(Job.id == job_id)
    )
    job = result.scalars().first()
    
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        requirements=job.requirements,
        location=job.location,
        salary_range=job.salary_range,
        category=job.category.value,
        tags=[tag.name for tag in job.tags],
        recruiter_name=recruiter_name,
        created_at=job.created_at.isoformat()
    )

@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    
    await db.delete(job)
    await db.commit()
    
    return {"message": "Job deleted successfully"}

@router.get("/recruiter/my-jobs", response_model=List[JobResponse])
async def get_my_jobs(
    current_user: User = Depends(get_current_recruiter),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Job).options(selectinload(Job.tags), selectinload(Job.applications)).filter(
            Job.recruiter_id == current_user.id
        ).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    
    return [
        JobResponse(
            id=job.id,
            title=job.title,
            description=job.description,
            requirements=job.requirements,
            location=job.location,
            salary_range=job.salary_range,
            category=job.category.value if hasattr(job.category, 'value') else job.category,
            tags=[tag.name for tag in job.tags],
            recruiter_name=current_user.name,
            created_at=job.created_at.isoformat() if hasattr(job.created_at, 'isoformat') else str(job.created_at),
            applicant_count=len(job.applications) if hasattr(job, 'applications') else 0
        )
        for job in jobs
    ]