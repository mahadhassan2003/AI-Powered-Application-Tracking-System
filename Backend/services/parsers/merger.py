import logging
from typing import Dict, Any

from .strategies.regex_strategy import extract_email_regex, extract_phone_regex, extract_years_experience, extract_tech_skills_regex

logger = logging.getLogger(__name__)

class ParsingMerger:
    @staticmethod
    def create_fallback_resume_data(text: str) -> Dict[str, Any]:
        email = extract_email_regex(text)
        phone = extract_phone_regex(text)
        experience_years = extract_years_experience(text)
        
        tech_skills = extract_tech_skills_regex(text)
        
        return {
            "personal_info": {
                "name": "Unknown",
                "email": email,
                "phone": phone,
                "location": None,
                "linkedin": None,
                "website": None
            },
            "skills": tech_skills,
            "experience": [],
            "education": [],
            "certifications": [],
            "total_experience_years": experience_years,
            "education_level": "other",
            "languages": ["English"],
            "summary": "Resume parsing failed - manual review required"
        }

    @staticmethod
    def merge_parsing_results(llm_data: Dict[str, Any], spacy_data: Dict[str, Any], 
                            regex_data: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        if llm_data and isinstance(llm_data, dict):
            result = llm_data.copy()
        else:
            result = ParsingMerger.create_fallback_resume_data(raw_text)
        
        personal_info = result.get("personal_info", {})
        
        if regex_data.get("email") and not personal_info.get("email"):
            personal_info["email"] = regex_data["email"]
        if regex_data.get("phone") and not personal_info.get("phone"):
            personal_info["phone"] = regex_data["phone"]
        
        if not personal_info.get("name") or personal_info.get("name") == "Unknown":
            if spacy_data.get("persons"):
                personal_info["name"] = spacy_data["persons"][0]
        
        if not personal_info.get("location") and spacy_data.get("locations"):
            personal_info["location"] = spacy_data["locations"][0]
        
        result["personal_info"] = personal_info
        
        if regex_data.get("experience_years", 0) > result.get("total_experience_years", 0):
            result["total_experience_years"] = regex_data["experience_years"]
        
        experience_list = result.get("experience", [])
        if not experience_list and spacy_data.get("organizations"):
            for org in spacy_data["organizations"][:3]:
                experience_list.append({
                    "company": org,
                    "role": "Unknown",
                    "start_date": None,
                    "end_date": None,
                    "duration_months": 0,
                    "description": "Extracted from text",
                    "technologies": []
                })
            result["experience"] = experience_list
        
        skills = result.get("skills", [])
        if len(skills) < 3:
            tech_skills = extract_tech_skills_regex(raw_text)
            for skill in tech_skills:
                if skill not in skills:
                    skills.append(skill)
            result["skills"] = skills[:15]
        
        return result
