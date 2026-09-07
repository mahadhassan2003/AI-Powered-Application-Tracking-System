import re
import logging
from typing import Dict, List
import numpy as np

try:
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    cosine_similarity = None

from models import ResumeData, Job, JobEmbedding

logger = logging.getLogger(__name__)

class ScoringEngine:
    @staticmethod
    def extract_job_skills(text: str) -> List[str]:
        """Extract skills from job description using standard keyword matching."""
        tech_skills = [
            'python', 'java', 'javascript', 'react', 'node.js', 'sql', 'aws', 'docker',
            'kubernetes', 'git', 'machine learning', 'data science', 'tensorflow',
            'pandas', 'numpy', 'django', 'flask', 'fastapi', 'postgresql', 'mongodb',
            'redis', 'microservices', 'api', 'rest', 'graphql', 'typescript', 'angular',
            'vue.js', 'bootstrap', 'css', 'html', 'scss', 'webpack', 'jest', 'testing'
        ]
        
        found_skills = []
        text_lower = text.lower()
        
        for skill in tech_skills:
            if skill in text_lower:
                found_skills.append(skill)
        return found_skills

    @staticmethod
    def calculate_keyword_semantic_score(resume_data: ResumeData, job: Job) -> float:
        """Calculate semantic score based on keyword matching logic."""
        resume_text = resume_data.raw_text.lower() if resume_data.raw_text else ""
        job_text = f"{job.title} {job.description} {job.requirements}".lower()
        
        important_terms = {
            'machine learning': 15, 'deep learning': 15, 'artificial intelligence': 12,
            'neural network': 10, 'tensorflow': 8, 'pytorch': 8, 'python': 10,
            'algorithm': 8, 'data science': 12, 'computer vision': 10, 'nlp': 8
        }
        
        score = 0
        for term, weight in important_terms.items():
            if term in job_text and term in resume_text:
                score += weight
        
        general_terms = ['software', 'development', 'programming', 'technical', 'system', 'analysis']
        for term in general_terms:
            if term in job_text and term in resume_text:
                score += 3
        
        return min(score, 100)

    @classmethod
    def calculate_basic_match_scores(cls, resume_data: ResumeData, job: Job) -> Dict[str, float]:
        """Fallback comprehensive match scores without utilizing dense vector embeddings."""
        scores = {'skill_score': 0.0, 'experience_score': 0.0, 'semantic_score': 0.0, 'overall_score': 0.0}
        
        resume_text = resume_data.raw_text.lower() if resume_data.raw_text else ""
        job_text = f"{job.title} {job.description} {job.requirements}".lower()
        
        candidate_skills = set()
        if resume_data.skills:
            for skill in resume_data.skills:
                if skill and isinstance(skill, str):
                    candidate_skills.add(skill.lower().strip())
        
        ai_ml_keywords = {
            'python': ['python', 'py'], 'java': ['java'], 'javascript': ['javascript', 'js'],
            'typescript': ['typescript', 'ts'], 'c++': ['c++', 'cpp'], 'c#': ['c#', 'csharp'],
            'r': [' r ', 'r programming'], 'sql': ['sql', 'mysql', 'postgresql'],
            'machine learning': ['machine learning', 'ml', 'artificial intelligence', 'ai'],
            'deep learning': ['deep learning', 'dl'], 'tensorflow': ['tensorflow', 'tf'],
            'pytorch': ['pytorch', 'torch'], 'scikit-learn': ['scikit-learn', 'sklearn', 'sci-kit'],
            'keras': ['keras'], 'pandas': ['pandas'], 'numpy': ['numpy', 'np'],
            'opencv': ['opencv', 'cv2'], 'nltk': ['nltk'], 'spacy': ['spacy'],
            'data science': ['data science', 'data scientist', 'data analysis'],
            'data analysis': ['data analysis', 'data analyst'], 'statistics': ['statistics', 'statistical'],
            'mathematics': ['mathematics', 'math', 'mathematical'], 'algorithms': ['algorithms', 'algorithm'],
            'computer vision': ['computer vision', 'cv', 'image processing'],
            'nlp': ['nlp', 'natural language processing', 'text processing'],
            'neural networks': ['neural networks', 'neural network', 'nn'],
            'reinforcement learning': ['reinforcement learning', 'rl'],
            'aws': ['aws', 'amazon web services'], 'azure': ['azure', 'microsoft azure'],
            'gcp': ['gcp', 'google cloud'], 'docker': ['docker', 'containerization'],
            'kubernetes': ['kubernetes', 'k8s'], 'git': ['git', 'github', 'gitlab'],
            'jupyter': ['jupyter', 'notebook'], 'api': ['api', 'rest api', 'restful'],
            'linux': ['linux', 'unix'], 'react': ['react', 'reactjs'],
            'node.js': ['node.js', 'nodejs', 'node'], 'django': ['django'], 'flask': ['flask'],
            'html': ['html', 'html5'], 'css': ['css', 'css3']
        }
        
        for skill_category, keywords in ai_ml_keywords.items():
            for keyword in keywords:
                if keyword in resume_text:
                    candidate_skills.add(skill_category)
                    break
        
        job_required_skills = set()
        for skill_category, keywords in ai_ml_keywords.items():
            for keyword in keywords:
                if keyword in job_text:
                    job_required_skills.add(skill_category)
                    break
        
        if job_required_skills:
            matching_skills = candidate_skills.intersection(job_required_skills)
            skill_match_ratio = len(matching_skills) / len(job_required_skills)
            scores['skill_score'] = skill_match_ratio * 100
        else:
            general_tech_keywords = ['programming', 'software', 'development', 'technical', 'coding']
            tech_matches = sum(1 for keyword in general_tech_keywords if keyword in resume_text and keyword in job_text)
            scores['skill_score'] = min(tech_matches * 20, 100)
        
        total_experience = resume_data.total_experience_years or 0
        if resume_data.raw_text:
            exp_patterns = [
                r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
                r'(?:experience|exp).*?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)',
                r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)', r'(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)',
                r'over\s+(\d+)\s*(?:years?|yrs?)', r'more than\s+(\d+)\s*(?:years?|yrs?)'
            ]
            max_years = 0
            for pattern in exp_patterns:
                matches = re.findall(pattern, resume_data.raw_text.lower())
                for match in matches:
                    try:
                        years = float(match[1]) if isinstance(match, tuple) else float(match)
                        max_years = max(max_years, years)
                    except (ValueError, IndexError):
                        continue
            job_titles = ['engineer', 'developer', 'analyst', 'scientist', 'manager', 'lead', 'senior']
            job_count = sum(1 for title in job_titles if title in resume_text)
            total_experience = max(total_experience, max_years, job_count * 1.5)
        
        if total_experience >= 8: scores['experience_score'] = 100.0
        elif total_experience >= 5: scores['experience_score'] = 90.0
        elif total_experience >= 3: scores['experience_score'] = 75.0
        elif total_experience >= 2: scores['experience_score'] = 60.0
        elif total_experience >= 1: scores['experience_score'] = 45.0
        elif total_experience >= 0.5: scores['experience_score'] = 30.0
        else:
            if any(word in resume_text for word in ['intern', 'internship', 'graduate', 'university', 'college', 'degree', 'bachelor', 'master', 'phd']):
                scores['experience_score'] = 25.0
            else:
                scores['experience_score'] = 10.0
        
        semantic_score = cls.calculate_keyword_semantic_score(resume_data, job)
        scores['semantic_score'] = semantic_score
        
        scores['overall_score'] = (scores['skill_score'] * 0.4 + scores['experience_score'] * 0.35 + scores['semantic_score'] * 0.25)
        
        education_bonus = 0
        if resume_data.education_level:
            if resume_data.education_level in ['master', 'phd']: education_bonus = 3
            elif resume_data.education_level == 'bachelor': education_bonus = 2
        
        scores['overall_score'] = min(scores['overall_score'] + education_bonus, 100)
        return scores

    @classmethod
    def calculate_comprehensive_match_scores(cls, resume_data: ResumeData, job: Job, job_embedding: JobEmbedding) -> Dict[str, float]:
        """Calculates exact similarity matches utilizing numpy text embeddings if available."""
        scores = {'skill_score': 0.0, 'experience_score': 0.0, 'semantic_score': 0.0, 'overall_score': 0.0}
        
        try:
            candidate_skills = [skill.lower().strip() for skill in (resume_data.skills or [])]
            required_skills = [skill.lower().strip() for skill in (job_embedding.required_skills or [])]
            
            if not candidate_skills and resume_data.raw_text:
                ai_keywords = ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'artificial intelligence', 'ai', 'ml', 'data science', 'neural networks', 'computer vision', 'nlp', 'java', 'c++', 'algorithms']
                resume_text_lower = resume_data.raw_text.lower()
                candidate_skills = [keyword for keyword in ai_keywords if keyword in resume_text_lower]
            
            if required_skills and candidate_skills:
                matching_skills = set(candidate_skills) & set(required_skills)
                skill_match_ratio = len(matching_skills) / len(required_skills)
                
                fuzzy_matches = 0
                for req_skill in required_skills:
                    for cand_skill in candidate_skills:
                        if (req_skill in cand_skill or cand_skill in req_skill or any(word in req_skill for word in cand_skill.split()) or any(word in cand_skill for word in req_skill.split())):
                            fuzzy_matches += 1
                            break
                fuzzy_ratio = fuzzy_matches / len(required_skills)
                scores['skill_score'] = max(skill_match_ratio, fuzzy_ratio) * 100
                
            elif required_skills:
                resume_text_lower = resume_data.raw_text.lower() if resume_data.raw_text else ""
                text_matches = sum(1 for skill in required_skills if skill in resume_text_lower)
                scores['skill_score'] = (text_matches / len(required_skills)) * 100
            else:
                job_text = f"{job.title} {job.description} {job.requirements}".lower()
                ai_keywords = ['python', 'machine learning', 'ai', 'data science', 'algorithm']
                resume_text_lower = resume_data.raw_text.lower() if resume_data.raw_text else ""
                keyword_matches = sum(1 for keyword in ai_keywords if keyword in resume_text_lower and keyword in job_text)
                job_keywords = sum(1 for keyword in ai_keywords if keyword in job_text)
                scores['skill_score'] = (keyword_matches / job_keywords * 100) if job_keywords > 0 else 40.0
            
            total_experience = resume_data.total_experience_years or 0
            if total_experience == 0 and resume_data.raw_text:
                exp_patterns = [r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)', r'(?:experience|exp).*?(\d+)\+?\s*(?:years?|yrs?)']
                max_years = 0
                for pattern in exp_patterns:
                    matches = re.findall(pattern, resume_data.raw_text.lower())
                    for match in matches:
                        try: max_years = max(max_years, int(match))
                        except ValueError: continue
                total_experience = max(total_experience, max_years)
            
            if total_experience >= 5: scores['experience_score'] = 100.0
            elif total_experience >= 3: scores['experience_score'] = 85.0
            elif total_experience >= 2: scores['experience_score'] = 70.0
            elif total_experience >= 1: scores['experience_score'] = 55.0
            elif total_experience >= 0.5: scores['experience_score'] = 40.0
            else:
                resume_text_lower = resume_data.raw_text.lower() if resume_data.raw_text else ""
                if any(word in resume_text_lower for word in ['intern', 'project', 'graduate', 'university']):
                    scores['experience_score'] = 35.0
                else: scores['experience_score'] = 20.0
            
            if (resume_data.text_embedding and job_embedding.description_embedding and np is not None and cosine_similarity is not None):
                try:
                    candidate_emb = np.array(resume_data.text_embedding).reshape(1, -1)
                    job_emb = np.array(job_embedding.description_embedding).reshape(1, -1)
                    similarity = cosine_similarity(candidate_emb, job_emb)[0][0]
                    scores['semantic_score'] = max(0, similarity * 100)
                except Exception as e:
                    logger.warning(f"Semantic similarity calculation failed: {e}")
                    scores['semantic_score'] = cls.calculate_keyword_semantic_score(resume_data, job)
            else:
                scores['semantic_score'] = cls.calculate_keyword_semantic_score(resume_data, job)
            
            scores['overall_score'] = (scores['skill_score'] * 0.5 + scores['experience_score'] * 0.3 + scores['semantic_score'] * 0.2)
            
            if resume_data.education_level in ['master', 'phd']: scores['overall_score'] = min(scores['overall_score'] + 5, 100)
            elif resume_data.education_level == 'bachelor': scores['overall_score'] = min(scores['overall_score'] + 3, 100)
            
        except Exception as e:
            logger.error(f"Error in comprehensive score calculation: {e}")
            return cls.calculate_basic_match_scores(resume_data, job)
            
        return scores
