import csv
import io
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi.responses import StreamingResponse
from fastapi import HTTPException
from models import Application, Job, User, ResumeData, CandidateRanking

class ExportService:
    @classmethod
    async def export_job_rankings(cls, job_id: int, current_user: User, db: AsyncSession) -> Tuple[StreamingResponse, str]:
        """Generates a CSV StreamingResponse for candidate rankings linked to a specific job."""
        # Verify job ownership
        result = await db.execute(select(Job).filter(Job.id == job_id, Job.recruiter_id == current_user.id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Get ranked candidates
        result = await db.execute(
            select(CandidateRanking).filter(
                CandidateRanking.job_id == job_id,
                CandidateRanking.is_current == True
            ).order_by(CandidateRanking.overall_rank)
        )
        rankings = result.scalars().all()
        export_data = []

        if rankings:
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

                    has_resume = bool(application.resume_path)
                    processing_status = "completed"
                    if not has_resume:
                        processing_status = "no_resume"
                    elif application.processing_status:
                        processing_status = application.processing_status.value

                    skills_str = ", ".join(resume_data.skills) if resume_data and resume_data.skills else ""

                    export_data.append({
                        "Rank": ranking.overall_rank,
                        "Candidate Name": candidate.name,
                        "Email": candidate.email,
                        "Overall Score": round(ranking.overall_fit_score or 0, 1),
                        "Skills Score": round(ranking.technical_score or 0, 1),
                        "Experience Score": round(ranking.experience_score or 0, 1),
                        "Semantic Score": round(application.semantic_similarity_score or 0, 1),
                        "Experience Years": resume_data.total_experience_years if resume_data else 0,
                        "Education Level": resume_data.education_level if resume_data else "",
                        "Status": application.status.value,
                        "Applied Date": application.applied_at.strftime("%Y-%m-%d"),
                        "Skills": skills_str,
                        "Confidence Score": round((resume_data.confidence_score or 0) * 100, 0) if resume_data else 0,
                        "Processing Status": processing_status,
                        "Has Resume": "Yes" if has_resume else "No"
                    })
        else:
            # Fallback: use applications directly if no rankings exist
            result = await db.execute(
                select(Application).options(
                    selectinload(Application.candidate)
                ).filter(Application.job_id == job_id)
            )
            applications = result.scalars().all()
            for i, application in enumerate(applications, 1):
                candidate = application.candidate
                result = await db.execute(select(ResumeData).filter(ResumeData.application_id == application.id))
                resume_data = result.scalars().first()

                has_resume = bool(application.resume_path)
                processing_status = "pending"
                if not has_resume:
                    processing_status = "no_resume"
                elif application.processing_status:
                    processing_status = application.processing_status.value

                skills_str = ", ".join(resume_data.skills) if resume_data and resume_data.skills else ""

                export_data.append({
                    "Rank": i,
                    "Candidate Name": candidate.name,
                    "Email": candidate.email,
                    "Overall Score": round(application.match_score or 0, 1),
                    "Skills Score": round(application.skill_match_score or 0, 1),
                    "Experience Score": round(application.experience_match_score or 0, 1),
                    "Semantic Score": round(application.semantic_similarity_score or 0, 1),
                    "Experience Years": resume_data.total_experience_years if resume_data else 0,
                    "Education Level": resume_data.education_level if resume_data else "",
                    "Status": application.status.value,
                    "Applied Date": application.applied_at.strftime("%Y-%m-%d"),
                    "Skills": skills_str,
                    "Confidence Score": round((resume_data.confidence_score or 0) * 100, 0) if resume_data else 0,
                    "Processing Status": processing_status,
                    "Has Resume": "Yes" if has_resume else "No"
                })

        if not export_data:
            raise HTTPException(status_code=404, detail="No candidate data found for export")

        job_title_clean = "".join(c for c in job.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"candidate_rankings_{job_title_clean}_{timestamp}.csv"

        return cls._create_streaming_response(export_data, filename), filename

    @classmethod
    async def export_all_applications(cls, current_user: User, db: AsyncSession) -> Tuple[StreamingResponse, str]:
        """Generates a CSV StreamingResponse for all applications submitted to jobs owned by the Recruiter."""
        result = await db.execute(
            select(Application).options(
                selectinload(Application.job),
                selectinload(Application.candidate)
            ).join(Job).filter(
                Job.recruiter_id == current_user.id
            ).order_by(Application.applied_at.desc())
        )
        applications = result.scalars().all()

        if not applications:
            raise HTTPException(status_code=404, detail="No applications found for export")

        export_data = []
        for application in applications:
            candidate = application.candidate
            job = application.job
            result = await db.execute(
                select(ResumeData).filter(ResumeData.application_id == application.id)
            )
            resume_data = result.scalars().first()

            skills_str = ", ".join(resume_data.skills) if resume_data and resume_data.skills else ""

            export_data.append({
                "Job Title": job.title,
                "Candidate Name": candidate.name,
                "Email": candidate.email,
                "Status": application.status.value,
                "Applied Date": application.applied_at.strftime("%Y-%m-%d %H:%M:%S"),
                "Updated Date": application.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
                "Overall Score": round(application.match_score or 0, 1),
                "Skills Score": round(application.skill_match_score or 0, 1),
                "Experience Score": round(application.experience_match_score or 0, 1),
                "Semantic Score": round(application.semantic_similarity_score or 0, 1),
                "Experience Years": resume_data.total_experience_years if resume_data else 0,
                "Education Level": resume_data.education_level if resume_data else "",
                "Skills": skills_str,
                "Cover Letter": application.cover_letter[:100] + "..." if application.cover_letter and len(application.cover_letter) > 100 else (application.cover_letter or ""),
                "Resume Available": "Yes" if application.resume_path else "No",
                "Processing Status": application.processing_status.value if application.processing_status else "pending"
            })

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"all_applications_{current_user.name.replace(' ', '_')}_{timestamp}.csv"

        return cls._create_streaming_response(export_data, filename), filename

    @staticmethod
    def _create_streaming_response(export_data: List[Dict[str, Any]], filename: str) -> StreamingResponse:
        """Helper to create standard CSV generator buffers."""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
        writer.writeheader()
        writer.writerows(export_data)

        response_content = output.getvalue()
        output.close()

        return StreamingResponse(
            io.BytesIO(response_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
