import json
import re
import os
import logging
from typing import Dict, Any

try:
    from groq import Groq
except ImportError:
    Groq = None

from ..exceptions import ResumeParsingError

logger = logging.getLogger(__name__)

class LLMStrategy:
    def __init__(self):
        if Groq is None:
            raise ImportError("Groq library not installed.")
            
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            logger.warning("GROQ_API_KEY is not set in the environment.")
            
        self.client = Groq(api_key=self.groq_api_key)
        self.model = "llama-3.3-70b-versatile"
        
        self.extraction_prompt = """
You are an expert ATS resume parser. Extract structured information from the resume text below.

IMPORTANT: You must return ONLY a valid JSON object, nothing else. No explanations, no markdown formatting, just the JSON.

Return a JSON object with exactly this structure:
{
    "personal_info": {
        "name": "Full Name",
        "email": "email@example.com",
        "phone": "phone number",
        "location": "city, state/country",
        "linkedin": "linkedin url if present",
        "website": "personal website if present"
    },
    "skills": [
        "skill1", "skill2", "skill3"
    ],
    "experience": [
        {
            "company": "Company Name",
            "role": "Job Title", 
            "start_date": "YYYY-MM or YYYY",
            "end_date": "YYYY-MM or YYYY or Present",
            "duration_months": 24,
            "description": "Brief description of role and achievements",
            "technologies": ["tech1", "tech2"]
        }
    ],
    "education": [
        {
            "degree": "Degree Name",
            "field": "Field of Study",
            "institution": "University/College Name",
            "graduation_year": "YYYY",
            "gpa": "3.8"
        }
    ],
    "certifications": [
        {
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "year": "YYYY",
            "expiry": "YYYY"
        }
    ],
    "total_experience_years": 5.5,
    "education_level": "bachelor|master|phd|associate|high_school|other",
    "languages": ["English", "Spanish"],
    "summary": "Brief professional summary based on the resume"
}

Important guidelines:
1. Extract actual information only - don't make up data
2. For missing fields, use null or empty arrays
3. Calculate total experience by summing all job durations
4. Normalize skill names (e.g., "JavaScript" not "javascript")
5. For dates, try to extract month and year when possible
6. Education level should be the highest degree mentioned
7. Include technical skills, soft skills, and domain expertise
8. Be accurate with company names and job titles

Resume Text:
{resume_text}

CRITICAL: Return ONLY the JSON object starting with {{ and ending with }}. No other text, explanations, or formatting.
"""

    def parse(self, cleaned_text: str) -> Dict[str, Any]:
        full_prompt = self.extraction_prompt.format(resume_text=cleaned_text)
        max_retries = 3
        response = None
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    messages=[{"role": "user", "content": full_prompt}],
                    model=self.model,
                    temperature=0.1,
                    max_tokens=4000,
                    top_p=1,
                    frequency_penalty=0,
                    presence_penalty=0
                )
                break
            except Exception as api_error:
                logger.warning(f"Groq API attempt {attempt + 1} failed: {api_error}")
                if attempt == max_retries - 1:
                    logger.error(f"Groq API failed after {max_retries} attempts")
                    raise ResumeParsingError(f"Groq API failure: {api_error}")
                import time
                time.sleep(2 ** attempt)
        
        if response is None:
            raise ResumeParsingError("No response received from Groq API")
        
        llm_response = response.choices[0].message.content.strip()
        print(f"DEBUG: LLM Raw Response for resume parsing (first 100 chars): {llm_response[:100]}")

        
        parsed_data = None
        try:
            parsed_data = json.loads(llm_response)
        except json.JSONDecodeError as e:
            logger.warning(f"Initial JSON parsing failed: {e}")
            cleaned_response = llm_response.strip()
            
            json_start = cleaned_response.find('{')
            json_end = cleaned_response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = cleaned_response[json_start:json_end]
                try:
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    json_str = json_str.replace('\n', ' ').replace('\r', '')
                    json_str = re.sub(r'\s+', ' ', json_str)
                    parsed_data = json.loads(json_str)
                except json.JSONDecodeError as fix_error:
                    logger.warning(f"JSON fix attempt failed: {fix_error}")
                    raise ResumeParsingError("Failed to parse LLM JSON response even after repair")
            else:
                raise ResumeParsingError("Could not extract valid JSON structure from response")
                    
        return parsed_data
