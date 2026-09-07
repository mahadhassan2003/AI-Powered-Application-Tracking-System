from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, JSON, Float, Boolean, UniqueConstraint, Index, Table
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

class Base(DeclarativeBase):
    pass

class UserRole(str, enum.Enum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    ADMIN = "admin"

class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    HIRED = "hired"

class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class JobCategory(str, enum.Enum):
    IT = "it"
    FINANCE = "finance"
    MARKETING = "marketing"
    SALES = "sales"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    ENGINEERING = "engineering"
    DESIGN = "design"
    OPERATIONS = "operations"
    HR = "hr"
    OTHER = "other"

# Many-to-many table for jobs and tags
job_tags_table = Table(
    'job_tags', Base.metadata,
    Column('job_id', Integer, ForeignKey('jobs.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    skills = Column(Text)  # For candidates
    experience = Column(Text)  # For candidates
    phone = Column(String(50))
    location = Column(String(200))
    bio = Column(Text)

    # Approval system for recruiters
    is_approved = Column(Boolean, default=True)  # Auto-approve candidates
    approval_status = Column(String(20), default="approved")  # pending, approved, rejected
    company_name = Column(String(200))  # For recruiter verification
    company_website = Column(String(200))  # For recruiter verification
    rejection_reason = Column(Text)  # If rejected, why
    
    # SMTP Configuration for recruiters
    smtp_server = Column(String(200))
    smtp_port = Column(Integer)
    smtp_email = Column(String(200))
    smtp_password = Column(String(500))  # Encrypted in production
    smtp_from_name = Column(String(200))
    smtp_enabled = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    
    # Relationships
    jobs_posted = relationship("Job", back_populates="recruiter", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")
    resume_data = relationship("ResumeData", back_populates="candidate", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    
    # Relationships
    jobs = relationship("Job", secondary=job_tags_table, back_populates="tags")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    location = Column(String(100))
    salary_range = Column(String(50))
    category = Column(Enum(JobCategory), default=JobCategory.OTHER, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    
    # Relationships
    recruiter = relationship("User", back_populates="jobs_posted")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=job_tags_table, back_populates="jobs")
    # New: Job embeddings for semantic matching
    job_embedding = relationship("JobEmbedding", back_populates="job", uselist=False, cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_path = Column(String(255))
    cover_letter = Column(Text)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.APPLIED)
    applied_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    
    # New fields for enhanced ATS functionality
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    match_score = Column(Float)  # Precomputed match score (0-100)
    skill_match_score = Column(Float)  # Skills-specific match score
    experience_match_score = Column(Float)  # Experience-specific match score
    semantic_similarity_score = Column(Float)  # Embedding-based similarity
    parsed_at = Column(DateTime)  # When resume parsing was completed
    
    # Relationships
    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", back_populates="applications")
    resume_data = relationship("ResumeData", back_populates="application", uselist=False, cascade="all, delete-orphan")

class ResumeData(Base):
    """Stores structured data extracted from resume parsing"""
    __tablename__ = "resume_data"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"))  # Optional: specific to application
    
    # Raw content
    raw_text = Column(Text)  # Extracted text from PDF/DOCX
    original_filename = Column(String(255))
    
    # Parsed structured data (JSON fields)
    skills = Column(JSON)  # ["Python", "Machine Learning", ...]
    experience = Column(JSON)  # [{"company": "...", "role": "...", "years": 2}, ...]
    education = Column(JSON)  # [{"degree": "...", "university": "...", "year": 2020}, ...]
    personal_info = Column(JSON)  # {"name": "...", "email": "...", "phone": "..."}
    work_history = Column(JSON)  # Detailed work history
    certifications = Column(JSON)  # Professional certifications
    
    # Computed metrics
    total_experience_years = Column(Float)
    education_level = Column(String(50))  # "bachelor", "master", "phd", etc.
    
    # Processing metadata
    processed_at = Column(DateTime, default=lambda: datetime.utcnow())
    processing_model = Column(String(100))  # Which LLM model was used
    confidence_score = Column(Float)  # Overall parsing confidence
    
    # Embedding storage
    text_embedding = Column(JSON)  # Serialized embedding vector
    skills_embedding = Column(JSON)  # Skills-specific embedding
    
    # Relationships
    candidate = relationship("User", back_populates="resume_data")
    application = relationship("Application", back_populates="resume_data")
    
    # Table indexes for performance
    __table_args__ = (
        Index('idx_resume_data_candidate', 'candidate_id'),
        Index('idx_resume_data_application', 'application_id'),
    )

class JobEmbedding(Base):
    """Stores job description embeddings for semantic matching"""
    __tablename__ = "job_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, unique=True)
    
    # Job processing data
    processed_text = Column(Text)  # Cleaned and processed job description
    required_skills = Column(JSON)  # Extracted required skills
    preferred_skills = Column(JSON)  # Extracted preferred skills
    
    # Embeddings
    description_embedding = Column(JSON)  # Job description embedding
    requirements_embedding = Column(JSON)  # Requirements-specific embedding
    
    # Processing metadata
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    processing_model = Column(String(100))
    
    # Relationships
    job = relationship("Job", back_populates="job_embedding")

class CandidateRanking(Base):
    """Stores precomputed candidate rankings for jobs"""
    __tablename__ = "candidate_rankings"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    
    # Ranking metrics
    overall_rank = Column(Integer)  # 1, 2, 3, ... within this job
    percentile_rank = Column(Float)  # 0-100 percentile
    
    # Detailed scoring breakdown
    skill_match_count = Column(Integer)  # Number of matching skills
    required_skills_matched = Column(Integer)
    total_required_skills = Column(Integer)
    experience_gap = Column(Float)  # Years difference from requirement
    
    # Composite scores
    technical_score = Column(Float)
    experience_score = Column(Float)
    education_score = Column(Float)
    overall_fit_score = Column(Float)
    
    # Metadata
    computed_at = Column(DateTime, default=lambda: datetime.utcnow())
    is_current = Column(Boolean, default=True)  # For tracking ranking updates
    
    # Relationships
    job = relationship("Job")
    application = relationship("Application")
    
    # Table constraints and indexes
    __table_args__ = (
        UniqueConstraint('job_id', 'application_id', name='unique_job_application_ranking'),
        Index('idx_candidate_rankings_job_id', 'job_id'),
        Index('idx_candidate_rankings_job_rank', 'job_id', 'overall_rank'),
        Index('idx_candidate_rankings_job_score', 'job_id', 'overall_fit_score')
    )

class InterviewType(str, enum.Enum):
    PHONE = "phone"
    VIDEO = "video"
    IN_PERSON = "in_person"
    TECHNICAL = "technical"

class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"
    RESCHEDULE_REQUESTED = "reschedule_requested"

class Interview(Base):
    __tablename__ = "interviews"
    
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    interviewer_id = Column(Integer, ForeignKey("users.id"))
    scheduled_at = Column(DateTime)
    proposed_time = Column(DateTime, nullable=True)
    reschedule_reason = Column(String(1000), nullable=True)
    decline_reason = Column(String(1000), nullable=True)
    duration_minutes = Column(Integer, default=60)
    interview_type = Column(Enum(InterviewType))
    status = Column(Enum(InterviewStatus), default=InterviewStatus.SCHEDULED)
    meeting_link = Column(String(500))
    location = Column(String(200))
    notes = Column(String(2000))
    candidate_confirmed = Column(Boolean, default=False)
    allow_reschedule = Column(Boolean, default=True)
    reschedule_window_start = Column(DateTime, nullable=True)
    reschedule_window_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    
    # Relationships
    application = relationship("Application")
    interviewer = relationship("User")


# ==================== OFFER MANAGEMENT MODELS ====================

class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"

class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    TEMPORARY = "temporary"
    INTERNSHIP = "internship"

class Offer(Base):
    """Job offer record"""
    __tablename__ = "offers"
    
    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Offer Details
    position_title = Column(String(255), nullable=False)
    base_salary = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    start_date = Column(DateTime, nullable=False)
    employment_type = Column(Enum(EmploymentType), default=EmploymentType.FULL_TIME)
    location = Column(String(200))
    
    # Additional Benefits
    signing_bonus = Column(Float, default=0)
    stock_options = Column(Float, default=0)
    benefits_summary = Column(Text)
    custom_message = Column(Text)
    
    # Offer Status
    status = Column(Enum(OfferStatus), default=OfferStatus.DRAFT, index=True)
    offer_letter_path = Column(String(255))
    
    # Timeline
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    sent_at = Column(DateTime)
    viewed_at = Column(DateTime)
    expires_at = Column(DateTime)
    
    # Response
    responded_at = Column(DateTime)
    response_notes = Column(Text)
    response_action = Column(String(50))  # "accepted", "declined", "negotiated"
    
    # Relationships
    application = relationship("Application", back_populates="offer")
    job = relationship("Job")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="offers_received")
    recruiter = relationship("User", foreign_keys=[recruiter_id], back_populates="offers_created")
    negotiations = relationship("OfferNegotiation", back_populates="offer", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_offer_status', 'status'),
        Index('idx_offer_candidate_id', 'candidate_id'),
        Index('idx_offer_job_id', 'job_id'),
        Index('idx_offer_expires_at', 'expires_at'),
    )

class OfferNegotiation(Base):
    """Salary and benefits negotiation history"""
    __tablename__ = "offer_negotiations"
    
    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    
    # Who initiated
    initiated_by = Column(String(50), nullable=False)  # "recruiter" or "candidate"
    
    # Proposed changes
    proposed_salary = Column(Float)
    proposed_benefits = Column(Text)
    proposed_signing_bonus = Column(Float)
    proposed_stock_options = Column(Float)
    reasoning = Column(Text)
    
    # Response tracking
    status = Column(String(20), default="pending")  # "pending", "accepted", "rejected", "counter"
    responded_at = Column(DateTime)
    response_notes = Column(Text)
    
    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    round_number = Column(Integer, default=1)  # Which round of negotiation
    
    # Relationships
    offer = relationship("Offer", back_populates="negotiations")
    
    __table_args__ = (
        Index('idx_negotiation_offer_id', 'offer_id'),
        Index('idx_negotiation_status', 'status'),
    )

class EmployeeRecord(Base):
    """Employee record after offer accepted"""
    __tablename__ = "employee_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    offer_id = Column(Integer, ForeignKey("offers.id"), nullable=False)
    
    # Employee details
    employee_id = Column(String(50), unique=True, nullable=False)  # EMP-2025-001
    department = Column(String(100))
    manager_id = Column(Integer, ForeignKey("users.id"))
    
    # Employment info
    start_date = Column(DateTime, nullable=False)
    employment_type = Column(Enum(EmploymentType))
    contract_path = Column(String(255))  # Signed contract PDF path
    
    # Personal info collection
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(20))
    emergency_contact_email = Column(String(100))
    emergency_contact_relationship = Column(String(50))
    
    # Document collection
    tax_form_w4_path = Column(String(255))
    i9_form_path = Column(String(255))
    nda_signed = Column(Boolean, default=False)
    handbook_acknowledged = Column(Boolean, default=False)
    
    # Status
    onboarding_status = Column(String(20), default="pending")  # "pending", "in_progress", "completed"
    onboarding_completed_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="employee_records")
    offer = relationship("Offer", backref="employee_record")
    manager = relationship("User", foreign_keys=[manager_id], backref="managed_employees")
    
    __table_args__ = (
        Index('idx_employee_record_user_id', 'user_id'),
        Index('idx_employee_record_employee_id', 'employee_id'),
    )


# Add relationships to User model (cascade so deleting user removes their offers)
User.offers_received = relationship("Offer", foreign_keys=[Offer.candidate_id], back_populates="candidate", cascade="all, delete-orphan")
User.offers_created = relationship("Offer", foreign_keys=[Offer.recruiter_id], back_populates="recruiter", cascade="all, delete-orphan")

# Add relationship to Application model
Application.offer = relationship("Offer", back_populates="application", uselist=False)

# ==================== EMAIL MANAGEMENT MODELS ====================

class EmailTemplate(Base):
    """Stores AI generated or custom email templates/campaigns"""
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Template contents
    campaign_name = Column(String(200), nullable=False)
    subject = Column(String(255), nullable=False)
    body_content = Column(Text, nullable=False)
    category = Column(String(50), default="outreach")
    
    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())
    
    # Relationships
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    campaigns = relationship("EmailCampaign", back_populates="template", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_template_recruiter', 'recruiter_id'),
    )

class EmailCampaign(Base):
    """Tracks a bulk email dispatch event and its progress"""
    __tablename__ = "email_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=False)
    
    # Configuration
    campaign_name = Column(String(200), nullable=False)
    target_application_ids = Column(JSON, nullable=False)  # Array of application IDs
    
    # Execution Metrics
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    audience_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.utcnow())
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    template = relationship("EmailTemplate", back_populates="campaigns")
    
    __table_args__ = (
        Index('idx_campaign_recruiter', 'recruiter_id'),
        Index('idx_campaign_status', 'status'),
    )