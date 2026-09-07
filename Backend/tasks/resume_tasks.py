"""
Celery tasks for background resume processing, parsing, and candidate scoring.

Uses centralized task_db_session for database access and includes
retry policies with exponential backoff.
"""

import os
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

# Import our models and services
from models import Application, ResumeData, Job, User, CandidateRanking, JobEmbedding, ProcessingStatus
from services.parsers.core_parser import ResumeParser
from services.parsers.exceptions import ResumeParsingError
from celery_app import app
from tasks.db import task_db_session

# ML processing has been extracted to EmbeddingService

# Setup logging
logger = logging.getLogger(__name__)

# ─── Retry policies ─────────────────────────────────────────────────────
RESUME_TASK_OPTS = dict(
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)

SCORING_TASK_OPTS = dict(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    acks_late=True,
)

# Backward-compat alias used by routes that call process_resume_directly
def get_task_db():
    """Deprecated — use task_db_session() context manager instead."""
    from database import SyncSessionLocal
    return SyncSessionLocal()

# Embedding initialization moved to Backend/services/embedding_service.py

def parse_resume_task(application_id: int):
    """
    Background task to parse uploaded resume and extract structured data
    
    Args:
        application_id: ID of the application with uploaded resume
    """
    logger.info(f"Starting resume parsing task for application {application_id}")
    
    db = get_task_db()
    try:
        # Update processing status
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return {"error": "Application not found"}
        
        if not application.resume_path:
            logger.error(f"No resume file found for application {application_id}")
            return {"error": "No resume file found"}
        
        application.processing_status = ProcessingStatus.PROCESSING
        db.commit()
        
        # Initialize resume parser
        try:
            parser = ResumeParser()
        except Exception as e:
            logger.error(f"Failed to initialize resume parser: {e}")
            application.processing_status = ProcessingStatus.FAILED
            db.commit()
            return {"error": f"Parser initialization failed: {str(e)}"}
        
        # Get file content from storage service
        from services.storage_service import storage_service
        try:
            file_content = storage_service.get_file(application.resume_path)
            filename = Path(application.resume_path).name
        except Exception as e:
            logger.error(f"Failed to retrieve file from storage: {e}")
            application.processing_status = ProcessingStatus.FAILED
            db.commit()
            return {"error": f"File retrieval failed: {str(e)}"}
        
        # Parse the resume with hybrid approach (LLM + spaCy + Regex)
        try:
            parsing_result = parser.parse_resume(application.resume_path, file_content)
            logger.info(f"Hybrid resume parsing completed for application {application_id}")
        except ResumeParsingError as e:
            logger.error(f"Resume parsing failed for application {application_id}: {e}")
            application.processing_status = ProcessingStatus.FAILED
            db.commit()
            
            # Try to create basic resume data even if parsing failed
            try:
                basic_resume_data = ResumeData(
                    candidate_id=application.candidate_id,
                    application_id=application.id,
                    raw_text="Resume parsing failed",
                    original_filename=Path(application.resume_path).name if application.resume_path else "unknown",
                    skills=[],
                    experience=[],
                    education=[],
                    personal_info={"name": "Unknown"},
                    work_history=[],
                    certifications=[],
                    total_experience_years=0.0,
                    education_level='other',
                    processed_at=datetime.utcnow(),
                    processing_model="failed",
                    confidence_score=0.0,
                    text_embedding=None,
                    skills_embedding=None
                )
                db.add(basic_resume_data)
                db.commit()
                logger.info(f"Created basic resume data record for failed parsing: application {application_id}")
            except Exception as fallback_error:
                logger.error(f"Failed to create basic resume data: {fallback_error}")
            
            return {"error": f"Resume parsing failed: {str(e)}"}
        
        try:
            from services.embedding_service import EmbeddingService
            embeddings = EmbeddingService.generate_resume_embeddings(parsing_result)
            logger.info(f"Embeddings generated for application {application_id}")
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            embeddings = {"text_embedding": None, "skills_embedding": None}
        
        # Save structured data to database
        parsed_data = parsing_result['parsed_data']
        resume_data = ResumeData(
            candidate_id=application.candidate_id,
            application_id=application.id,
            raw_text=parsing_result['raw_text'],
            original_filename=parsing_result['original_filename'],
            skills=parsed_data.get('skills', []),
            experience=parsed_data.get('experience', []),
            education=parsed_data.get('education', []),
            personal_info=parsed_data.get('personal_info', {}),
            work_history=parsed_data.get('experience', []),
            certifications=parsed_data.get('certifications', []),
            total_experience_years=parsed_data.get('total_experience_years', 0.0),
            education_level=parsed_data.get('education_level', 'other'),
            processed_at=parsing_result['processing_metadata']['processed_at'],
            processing_model=parsing_result['processing_metadata']['processing_model'],
            confidence_score=parsing_result['processing_metadata']['confidence_score'],
            text_embedding=embeddings.get('text_embedding'),
            skills_embedding=embeddings.get('skills_embedding')
        )
        
        db.add(resume_data)
        
        # Update application status
        application.processing_status = ProcessingStatus.COMPLETED
        application.parsed_at = resume_data.processed_at
        
        db.commit()
        
        # Trigger scoring task
        calculate_match_scores_task(application_id)
        
        logger.info(f"Resume parsing task completed successfully for application {application_id}")
        return {
            "status": "success",
            "application_id": application_id,
            "confidence_score": parsing_result['processing_metadata']['confidence_score']
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in resume parsing task: {e}")
        if application:
            application.processing_status = ProcessingStatus.FAILED
            db.commit()
        return {"error": f"Unexpected error: {str(e)}"}
    finally:
        db.close()

def calculate_match_scores_task(application_id: int):
    """
    Calculate match scores between candidate resume and job requirements
    
    Args:
        application_id: ID of the application to score
    """
    logger.info(f"Starting match score calculation for application {application_id}")
    
    db = get_task_db()
    try:
        # Get application with related data
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.error(f"Application {application_id} not found")
            return {"error": "Application not found"}
        
        resume_data = db.query(ResumeData).filter(ResumeData.application_id == application_id).first()
        if not resume_data:
            logger.error(f"Resume data not found for application {application_id}")
            return {"error": "Resume data not found"}
        
        job = application.job
        
        # Get or create job embedding
        job_embedding = get_or_create_job_embedding(job, db)
        
        # Calculate various match scores
        from services.scoring_engine import ScoringEngine
        scores = ScoringEngine.calculate_comprehensive_match_scores(resume_data, job, job_embedding)
        
        # Update application with scores
        application.match_score = scores['overall_score']
        application.skill_match_score = scores['skill_score']
        application.experience_match_score = scores['experience_score']
        application.semantic_similarity_score = scores['semantic_score']
        
        db.commit()
        
        # Update candidate rankings for this job
        update_candidate_rankings_task(job.id)
        
        logger.info(f"Match scores calculated for application {application_id}: {scores['overall_score']:.2f}")
        return {
            "status": "success",
            "application_id": application_id,
            "scores": scores
        }
        
    except Exception as e:
        logger.error(f"Error calculating match scores: {e}")
        return {"error": f"Match score calculation failed: {str(e)}"}
    finally:
        db.close()

def get_or_create_job_embedding(job: Job, db: Session) -> JobEmbedding:
    """Get existing job embedding or create new one"""
    job_embedding = db.query(JobEmbedding).filter(JobEmbedding.job_id == job.id).first()
    
    if not job_embedding:
        # Create new job embedding
        try:
            from services.embedding_service import EmbeddingService
            model = EmbeddingService.get_model()
            
            # Process job text
            job_text = f"{job.title} {job.description} {job.requirements}"
            processed_text = job_text[:1000]  # Limit length
            
            # Generate embeddings
            description_embedding = model.encode([processed_text])[0].tolist() if model else None
            requirements_embedding = model.encode([job.requirements[:500]])[0].tolist() if model else None
            
            # Extract skills
            from services.scoring_engine import ScoringEngine
            required_skills = ScoringEngine.extract_job_skills(job.requirements)
            preferred_skills = ScoringEngine.extract_job_skills(job.description)
            
            job_embedding = JobEmbedding(
                job_id=job.id,
                processed_text=processed_text,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                description_embedding=description_embedding,
                requirements_embedding=requirements_embedding,
                processing_model="all-MiniLM-L6-v2"
            )
            
            db.add(job_embedding)
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to create job embedding: {e}")
            # Create minimal embedding object
            job_embedding = JobEmbedding(
                job_id=job.id,
                processed_text=job.description[:500],
                required_skills=[],
                preferred_skills=[],
                description_embedding=None,
                requirements_embedding=None,
                processing_model="failed"
            )
            db.add(job_embedding)
            db.commit()
    
    return job_embedding



def process_resume_directly(application_id: int):
    """
    Direct resume processing without Celery for fallback
    """
    from datetime import datetime, timezone
    from pathlib import Path
    
    db = get_task_db()
    application = None
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application or not application.resume_path:
            print(f"Application {application_id} or resume path not found")
            return
        
        application.processing_status = ProcessingStatus.PROCESSING
        db.commit()
        
        # Initialize parser and process
        from services.parsers.core_parser import ResumeParser
        from services.storage_service import storage_service
        parser = ResumeParser()
        
        try:
            # Get file content from storage (works for both local and S3)
            file_content = storage_service.get_file(application.resume_path)
            filename = Path(application.resume_path).name
            
            parsing_result = parser.parse_resume(application.resume_path, file_content)
            print(f"Resume parsing completed for application {application_id}. Confidence: {parsing_result['processing_metadata']['confidence_score']:.2f}")
        except Exception as parse_error:
            print(f"Resume parsing failed for application {application_id}: {parse_error}")
            import traceback
            traceback.print_exc()
            print(f"Resume parsing failed, creating basic data: {parse_error}")
            # Create basic resume data even if parsing fails
            parsing_result = {
                'raw_text': 'Resume parsing failed',
                'original_filename': Path(application.resume_path).name if application.resume_path else 'unknown',
                'parsed_data': {
                    'personal_info': {'name': 'Unknown'},
                    'skills': [],
                    'experience': [],
                    'education': [],
                    'certifications': [],
                    'total_experience_years': 0.0,
                    'education_level': 'other'
                },
                'processing_metadata': {
                    'processing_model': 'fallback',
                    'confidence_score': 0.0
                }
            }
        
        # Generate simple embeddings (without sentence-transformers for now)
        embeddings = {"text_embedding": None, "skills_embedding": None}
        
        # Save to database
        parsed_data = parsing_result['parsed_data']
        resume_data = ResumeData(
            candidate_id=application.candidate_id,
            application_id=application.id,
            raw_text=parsing_result['raw_text'],
            original_filename=parsing_result['original_filename'],
            skills=parsed_data.get('skills', []),
            experience=parsed_data.get('experience', []),
            education=parsed_data.get('education', []),
            personal_info=parsed_data.get('personal_info', {}),
            work_history=parsed_data.get('experience', []),
            certifications=parsed_data.get('certifications', []),
            total_experience_years=parsed_data.get('total_experience_years', 0.0),
            education_level=parsed_data.get('education_level', 'other'),
            processed_at=datetime.utcnow(),
            processing_model=parsing_result['processing_metadata']['processing_model'],
            confidence_score=parsing_result['processing_metadata']['confidence_score'],
            text_embedding=embeddings.get('text_embedding'),
            skills_embedding=embeddings.get('skills_embedding')
        )
        
        db.add(resume_data)
        
        # Calculate basic match scores
        job = application.job
        from services.scoring_engine import ScoringEngine
        scores = ScoringEngine.calculate_basic_match_scores(resume_data, job)
        
        application.match_score = scores['overall_score']
        application.skill_match_score = scores['skill_score'] 
        application.experience_match_score = scores['experience_score']
        application.semantic_similarity_score = scores['semantic_score']
        application.processing_status = ProcessingStatus.COMPLETED
        application.parsed_at = datetime.utcnow()
        
        db.commit()
        print(f"Resume processed directly for application {application_id} with score {scores['overall_score']:.1f}")
        
    except Exception as e:
        print(f"Direct processing error: {e}")
        if application:
            application.processing_status = ProcessingStatus.FAILED
            db.commit()
    finally:
        db.close()



def update_candidate_rankings_task(job_id: int):
    """
    Update candidate rankings for a specific job
    
    Args:
        job_id: ID of the job to update rankings for
    """
    logger.info(f"Updating candidate rankings for job {job_id}")
    
    db = get_task_db()
    try:
        # Get all applications for this job with scores
        applications = db.query(Application).filter(
            Application.job_id == job_id,
            Application.match_score.isnot(None)
        ).order_by(Application.match_score.desc()).all()
        
        if not applications:
            logger.info(f"No scored applications found for job {job_id}")
            return {"status": "success", "ranked_candidates": 0}
        
        # Delete existing rankings for this job
        db.query(CandidateRanking).filter(CandidateRanking.job_id == job_id).delete()
        
        # Create new rankings
        total_applications = len(applications)
        
        for rank, application in enumerate(applications, 1):
            resume_data = db.query(ResumeData).filter(
                ResumeData.application_id == application.id
            ).first()
            
            # Calculate detailed metrics
            skill_match_count = 0
            if resume_data and resume_data.skills:
                job_embedding = db.query(JobEmbedding).filter(JobEmbedding.job_id == job_id).first()
                if job_embedding and job_embedding.required_skills:
                    candidate_skills = set(skill.lower() for skill in resume_data.skills)
                    required_skills = set(skill.lower() for skill in job_embedding.required_skills)
                    skill_match_count = len(candidate_skills & required_skills)
            
            ranking = CandidateRanking(
                job_id=job_id,
                application_id=application.id,
                overall_rank=rank,
                percentile_rank=((total_applications - rank + 1) / total_applications) * 100,
                skill_match_count=skill_match_count,
                required_skills_matched=skill_match_count,
                total_required_skills=len(job_embedding.required_skills) if job_embedding and job_embedding.required_skills else 0,
                experience_gap=0.0,  # Could calculate based on job requirements
                technical_score=application.skill_match_score or 0,
                experience_score=application.experience_match_score or 0,
                education_score=50.0,  # Default education score
                overall_fit_score=application.match_score or 0,
                is_current=True
            )
            
            db.add(ranking)
        
        db.commit()
        
        logger.info(f"Updated rankings for {total_applications} candidates in job {job_id}")
        return {
            "status": "success",
            "job_id": job_id,
            "ranked_candidates": total_applications
        }
        
    except Exception as e:
        logger.error(f"Error updating candidate rankings: {e}")
        return {"error": f"Ranking update failed: {str(e)}"}
    finally:
        db.close()

def process_job_embedding_task(job_id: int):
    """
    Background task to process job posting and create embeddings
    
    Args:
        job_id: ID of the job to process
    """
    logger.info(f"Processing job embedding for job {job_id}")
    
    db = get_task_db()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return {"error": "Job not found"}
        
        # Create job embedding
        job_embedding = get_or_create_job_embedding(job, db)
        
        logger.info(f"Job embedding processed for job {job_id}")
        return {"status": "success", "job_id": job_id}
        
    except Exception as e:
        logger.error(f"Error processing job embedding: {e}")
        return {"error": f"Job embedding processing failed: {str(e)}"}
    finally:
        db.close()

def recalculate_all_scores_task(job_id: int = None):
    """
    Recalculate match scores for all applications (or specific job)
    
    Args:
        job_id: Optional job ID to recalculate scores for specific job only
    """
    logger.info(f"Recalculating match scores for job {job_id if job_id else 'all jobs'}")
    
    db = get_task_db()
    try:
        # Get applications to recalculate
        query = db.query(Application).join(ResumeData, Application.id == ResumeData.application_id)
        if job_id:
            query = query.filter(Application.job_id == job_id)
        
        applications = query.all()
        recalculated_count = 0
        
        for application in applications:
            try:
                resume_data = db.query(ResumeData).filter(
                    ResumeData.application_id == application.id
                ).first()
                
                if not resume_data:
                    continue
                
                job = application.job
                
                # Recalculate scores with improved algorithm
                try:
                    job_embedding = get_or_create_job_embedding(job, db)
                    from services.scoring_engine import ScoringEngine
                    scores = ScoringEngine.calculate_comprehensive_match_scores(resume_data, job, job_embedding)
                except Exception:
                    from services.scoring_engine import ScoringEngine
                    scores = ScoringEngine.calculate_basic_match_scores(resume_data, job)
                
                # Update application with new scores
                application.match_score = scores['overall_score']
                application.skill_match_score = scores['skill_score']
                application.experience_match_score = scores['experience_score']
                application.semantic_similarity_score = scores['semantic_score']
                
                recalculated_count += 1
                
            except Exception as e:
                logger.error(f"Error recalculating scores for application {application.id}: {e}")
                continue
        
        db.commit()
        
        # Update rankings for affected jobs
        if job_id:
            update_candidate_rankings_task(job_id)
        else:
            # Update rankings for all jobs
            jobs = db.query(Job).all()
            for job in jobs:
                update_candidate_rankings_task(job.id)
        
        logger.info(f"Recalculated scores for {recalculated_count} applications")
        return {
            "status": "success",
            "recalculated_count": recalculated_count,
            "job_id": job_id
        }
        
    except Exception as e:
        logger.error(f"Error recalculating scores: {e}")
        return {"error": f"Score recalculation failed: {str(e)}"}
    finally:
        db.close()