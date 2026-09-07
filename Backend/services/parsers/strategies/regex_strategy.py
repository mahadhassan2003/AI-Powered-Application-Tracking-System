import re
from typing import List, Optional

def extract_email_regex(text: str) -> Optional[str]:
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    matches = re.findall(email_pattern, text)
    return matches[0] if matches else None

def extract_phone_regex(text: str) -> Optional[str]:
    phone_patterns = [
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        r'\(\d{3}\)\s*\d{3}[-.]?\d{4}',
        r'\b\d{3}\s\d{3}\s\d{4}\b'
    ]
    
    for pattern in phone_patterns:
        matches = re.findall(pattern, text)
        if matches:
            return matches[0]
    return None

def normalize_skill_name(skill: str) -> str:
    normalizations = {
        'node.js': 'Node.js',
        'machine learning': 'Machine Learning',
        'deep learning': 'Deep Learning',
        'artificial intelligence': 'Artificial Intelligence',
        'data science': 'Data Science',
        'computer vision': 'Computer Vision',
        'natural language processing': 'Natural Language Processing',
        'react native': 'React Native',
        'power bi': 'Power BI',
        'c++': 'C++',
        'c#': 'C#'
    }
    return normalizations.get(skill, skill.title())

def extract_context_skills(text: str) -> List[str]:
    context_skills = set()
    
    cert_patterns = [
        r'certified.*?(aws|azure|google cloud|salesforce|cisco|microsoft)',
        r'(aws|azure|gcp).*?certified',
        r'(scrum master|product owner|pmp).*?certified?'
    ]
    
    for pattern in cert_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                for m in match:
                    if m:
                        context_skills.add(m.title())
            else:
                context_skills.add(match.title())
    
    exp_patterns = [
        r'(\d+)\+?\s*years?.*?(python|java|javascript|react|aws|machine learning)',
        r'experience.*?with\s+([\w\s,]+?)(?:\.|,|;)',
        r'proficient.*?in\s+([\w\s,]+?)(?:\.|,|;)',
        r'skilled.*?in\s+([\w\s,]+?)(?:\.|,|;)'
    ]
    
    for pattern in exp_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple) and len(match) > 1:
                skills_text = match[1]
            else:
                skills_text = match if isinstance(match, str) else str(match)
            
            potential_skills = [s.strip() for s in re.split(r'[,\sand\s&]', skills_text) if s.strip()]
            for skill in potential_skills:
                if len(skill) > 2 and skill.isalpha():
                    context_skills.add(skill.title())
    
    return list(context_skills)

def extract_tech_skills_regex(text: str) -> List[str]:
    from knowledge.resume_regex_constants import RESUME_SKILLS_DATABASE
    
    text_lower = text.lower()
    found_skills = set()
    
    for category, skills_dict in RESUME_SKILLS_DATABASE.items():
        for skill_name, variations in skills_dict.items():
            for variation in variations:
                if variation in text_lower:
                    found_skills.add(normalize_skill_name(skill_name))
                    break
    
    context_skills = extract_context_skills(text_lower)
    found_skills.update(context_skills)
    
    return list(found_skills)

def extract_years_experience(text: str) -> float:
    patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:of\s*)?experience',
        r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)',
        r'experience.*?(\d+(?:\.\d+)?)\s*(?:years?|yrs?)'
    ]
    
    total_years = 0.0
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                years = float(match)
                total_years = max(total_years, years)
            except ValueError:
                continue
    return total_years
