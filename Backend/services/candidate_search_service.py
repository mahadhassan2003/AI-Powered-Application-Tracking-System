from typing import List, Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, Text, func
from models import Application, User, UserRole, ResumeData
import logging

logger = logging.getLogger(__name__)

class CandidateSearchService:
    @classmethod
    async def search_candidates(
        cls,
        current_user: User,
        db: AsyncSession,
        skills: Optional[str] = None,
        min_experience: Optional[float] = None,
        max_experience: Optional[float] = None,
        education_level: Optional[str] = None,
        location: Optional[str] = None,
        has_resume: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """Searches across all candidate resumes and profiles, enforcing recruiter visibility constraints."""
        stmt = select(User).filter(User.role == UserRole.CANDIDATE)

        need_resume_join = any([skills, min_experience, max_experience, education_level, has_resume])

        if need_resume_join:
            if has_resume is False:
                subq = select(ResumeData.candidate_id).distinct()
                sub_result = await db.execute(subq)
                candidate_ids_with_resume = [r[0] for r in sub_result.all()]
                stmt = stmt.filter(~User.id.in_(candidate_ids_with_resume))
            else:
                stmt = stmt.join(ResumeData, User.id == ResumeData.candidate_id)

                if skills:
                    skill_list = [skill.strip().lower() for skill in skills.split(",")]
                    skill_filters = []
                    for skill in skill_list:
                        skill_filters.append(ResumeData.skills.cast(Text).ilike(f"%{skill}%"))
                    stmt = stmt.filter(or_(*skill_filters))

                if min_experience is not None:
                    stmt = stmt.filter(ResumeData.total_experience_years >= min_experience)

                if max_experience is not None:
                    stmt = stmt.filter(ResumeData.total_experience_years <= max_experience)

                if education_level:
                    stmt = stmt.filter(ResumeData.education_level.ilike(f"%{education_level}%"))
        elif has_resume is False:
            subq = select(ResumeData.candidate_id).distinct()
            sub_result = await db.execute(subq)
            candidate_ids_with_resume = [r[0] for r in sub_result.all()]
            stmt = stmt.filter(~User.id.in_(candidate_ids_with_resume))

        if skills and not need_resume_join:
            skill_list = [skill.strip() for skill in skills.split(",")]
            skill_filters = []
            for skill in skill_list:
                skill_filters.append(or_(
                    User.skills.ilike(f"%{skill}%"),
                    User.experience.ilike(f"%{skill}%")
                ))
            if skill_filters:
                stmt = stmt.filter(or_(*skill_filters))

        stmt = stmt.distinct()
        result = await db.execute(stmt)
        candidates = result.scalars().all()

        response_data = []
        for candidate in candidates:
            # Latest Resume
            result = await db.execute(
                select(ResumeData).filter(
                    ResumeData.candidate_id == candidate.id
                ).order_by(ResumeData.processed_at.desc())
            )
            latest_resume = result.scalars().first()

            # Applications
            result = await db.execute(
                select(Application).filter(
                    Application.candidate_id == candidate.id
                ).order_by(Application.applied_at.desc())
            )
            applications = result.scalars().all()

            latest_application_date = applications[0].applied_at.isoformat() if applications else None

            # Gather Skills
            candidate_skills = []
            if latest_resume and latest_resume.skills:
                candidate_skills = latest_resume.skills if isinstance(latest_resume.skills, list) else []
            elif candidate.skills:
                candidate_skills = [skill.strip() for skill in candidate.skills.split(',') if skill.strip()]

            response_data.append({
                "candidate_id": candidate.id,
                "name": candidate.name,
                "email": candidate.email,
                "skills": candidate_skills,
                "total_experience_years": latest_resume.total_experience_years if latest_resume else None,
                "education_level": latest_resume.education_level if latest_resume else None,
                "applications_count": len(applications),
                "latest_application_date": latest_application_date
            })

        # Sort by relevance
        response_data.sort(key=lambda x: (x["applications_count"], x["latest_application_date"] or ""), reverse=True)
        return response_data

    @classmethod
    async def get_available_skills(cls, db: AsyncSession) -> Dict[str, Any]:
        """Aids the search UI by aggregating a unique list of all candidate skills across the pool."""
        all_skills = set()

        result = await db.execute(select(ResumeData).filter(ResumeData.skills.isnot(None)))
        for entry in result.scalars().all():
            if entry.skills and isinstance(entry.skills, list):
                all_skills.update(entry.skills)

        result = await db.execute(select(User).filter(User.role == UserRole.CANDIDATE, User.skills.isnot(None)))
        for candidate in result.scalars().all():
            if candidate.skills:
                profile_skills = [skill.strip() for skill in candidate.skills.split(',') if skill.strip()]
                all_skills.update(profile_skills)

        skills_list = sorted(list(all_skills))[:100]

        return {
            "skills": skills_list,
            "total_unique_skills": len(skills_list)
        }
