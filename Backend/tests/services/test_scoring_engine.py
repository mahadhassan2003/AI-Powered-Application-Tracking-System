import pytest
import numpy as np
from services.scoring_engine import ScoringEngine
from models import ResumeData, Job, JobEmbedding

class TestScoringEngine:
    def test_basic_match_skill_scoring(self):
        # Create mock data
        rd = ResumeData()
        rd.skills = ["python", "machine learning"]
        rd.raw_text = "Experienced in python and machine learning."
        rd.total_experience_years = 5.0
        
        job = Job()
        job.title = "Software Engineer"
        job.description = "Looking for python developer."
        job.requirements = "Must know python and machine learning."
        
        scores = ScoringEngine.calculate_basic_match_scores(rd, job)
        
        assert "overall_score" in scores
        assert scores["skill_score"] > 0
        assert scores["experience_score"] == 90.0
        
    def test_semantic_keyword_matching(self):
        rd = ResumeData()
        rd.raw_text = "I have 5 years experience with machine learning, tensorflow, and pytorch. Highly skilled in python."
        
        job = Job()
        job.title = "AI Engineer"
        job.description = "We need someone with machine learning."
        job.requirements = "python, tensorflow, deep learning."
        
        score = ScoringEngine.calculate_keyword_semantic_score(rd, job)
        
        # ML (15) + TF (8) + Python (10) should be included.
        assert score >= 33.0

    def test_calculate_comprehensive_fallback(self):
        # Test that without numpy array embeddings it relies on fallback correctly
        rd = ResumeData()
        rd.skills = ["java"]
        rd.raw_text = "Java developer."
        rd.total_experience_years = 2.0
        
        job = Job()
        job.title = "Java Dev"
        job.description = "Java needed."
        job.requirements = ""
        
        job_emb = JobEmbedding()
        job_emb.required_skills = ["java"]
        
        scores = ScoringEngine.calculate_comprehensive_match_scores(rd, job, job_emb)
        
        assert scores["skill_score"] == 100.0  # complete intersection of required skills
        assert scores["experience_score"] == 70.0
