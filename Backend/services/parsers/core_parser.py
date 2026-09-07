import json
import re
import os
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime

from .exceptions import ResumeParsingError
from .document_extractor import DocumentExtractor
from .strategies.spacy_strategy import SpacyStrategy
from .strategies.regex_strategy import extract_email_regex, extract_phone_regex, extract_years_experience
from .strategies.llm_strategy import LLMStrategy
from .merger import ParsingMerger

logger = logging.getLogger(__name__)

class ResumeParser:
    def __init__(self):
        self.spacy_strategy = SpacyStrategy()
        
        try:
            self.llm_strategy = LLMStrategy()
            self.model = self.llm_strategy.model
        except Exception as e:
            logger.warning(f"LLM Strategy initialization failed: {e}")
            self.llm_strategy = None
            self.model = "fallback-regex-spacy"

    def clean_text(self, text: str) -> str:
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s@.\-(),/:#+&]', ' ', text)
        text = re.sub(r'\s{2,}', ' ', text)
        return text.strip()

    def parse_resume_hybrid(self, resume_text: str) -> Dict[str, Any]:
        cleaned_text = self.clean_text(resume_text)
        
        spacy_data = self.spacy_strategy.extract_with_spacy(cleaned_text)
        
        regex_data = {
            "email": extract_email_regex(cleaned_text),
            "phone": extract_phone_regex(cleaned_text),
            "experience_years": extract_years_experience(cleaned_text)
        }
        
        llm_data = None
        if self.llm_strategy:
            try:
                llm_data = self.llm_strategy.parse(cleaned_text)
            except Exception as e:
                logger.warning(f"LLM parsing failed, using hybrid fallback: {e}")
        
        return ParsingMerger.merge_parsing_results(llm_data, spacy_data, regex_data, cleaned_text)

    def validate_parsed_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        required_keys = ['personal_info', 'skills', 'experience', 'education', 'certifications']
        for key in required_keys:
            if key not in data:
                data[key] = [] if key in ['skills', 'experience', 'education', 'certifications'] else {}
        
        if isinstance(data['skills'], list):
            data['skills'] = [skill.strip() for skill in data['skills'] if isinstance(skill, str) and skill.strip()]
        else:
            data['skills'] = []
        
        if 'total_experience_years' in data:
            try:
                data['total_experience_years'] = float(data['total_experience_years']) if data['total_experience_years'] else 0.0
            except (ValueError, TypeError):
                data['total_experience_years'] = 0.0
        else:
            data['total_experience_years'] = 0.0
        
        if 'education_level' not in data or not data['education_level']:
            data['education_level'] = 'other'
        
        if not isinstance(data['personal_info'], dict):
            data['personal_info'] = {}
        
        return data

    def calculate_confidence_score(self, parsed_data: Dict[str, Any], original_text: str) -> float:
        score = 0.0
        max_score = 0.0
        
        personal_info = parsed_data.get('personal_info', {})
        if personal_info.get('name'): score += 20
        if personal_info.get('email'): score += 15
        if personal_info.get('phone'): score += 10
        max_score += 45
        
        skills = parsed_data.get('skills', [])
        if len(skills) > 0: score += min(len(skills) * 2, 20)
        max_score += 20
        
        experience = parsed_data.get('experience', [])
        if len(experience) > 0: score += min(len(experience) * 10, 25)
        max_score += 25
        
        education = parsed_data.get('education', [])
        if len(education) > 0: score += 10
        max_score += 10
        
        return min(score / max_score, 1.0) if max_score > 0 else 0.0

    def parse_resume(self, file_path: str, file_content: Optional[bytes] = None) -> Dict[str, Any]:
        try:
            logger.info(f"Starting resume parsing for: {file_path}")
            
            if file_content:
                raw_text = DocumentExtractor.extract_text_from_bytes(file_content, file_path)
            else:
                raw_text = DocumentExtractor.extract_text_from_file(file_path)
                
            logger.info(f"Extracted {len(raw_text)} characters from resume")
            
            parsed_data = self.parse_resume_hybrid(raw_text)
            validated_data = self.validate_parsed_data(parsed_data)
            confidence_score = self.calculate_confidence_score(validated_data, raw_text)
            
            result = {
                'raw_text': raw_text,
                'original_filename': Path(file_path).name,
                'parsed_data': validated_data,
                'processing_metadata': {
                    'processed_at': datetime.utcnow().isoformat(),
                    'processing_model': self.model,
                    'confidence_score': confidence_score,
                    'file_size_bytes': os.path.getsize(file_path) if not file_content else len(file_content),
                    'text_length': len(raw_text)
                }
            }
            
            logger.info(f"Resume parsing completed with confidence score: {confidence_score:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Complete resume parsing failed for {file_path}: {e}")
            raise ResumeParsingError(f"Resume parsing pipeline failed: {str(e)}")
