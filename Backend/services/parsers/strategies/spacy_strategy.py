import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class SpacyStrategy:
    _nlp = None
    _loaded = False

    @classmethod
    def get_nlp(cls):
        if not cls._loaded:
            cls._loaded = True
            try:
                import spacy
                try:
                    cls._nlp = spacy.load("en_core_web_sm")
                except OSError:
                    cls._nlp = None
            except ImportError:
                cls._nlp = None
        return cls._nlp

    @staticmethod
    def extract_with_spacy(text: str) -> Dict[str, Any]:
        nlp = SpacyStrategy.get_nlp()
        if nlp is None:
            return {"entities": [], "persons": [], "organizations": [], "locations": []}
        
        try:
            doc = nlp(text)
            
            entities = []
            persons = []
            organizations = []
            locations = []
            
            for ent in doc.ents:
                entity_info = {
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char
                }
                entities.append(entity_info)
                
                if ent.label_ in ["PERSON"]:
                    persons.append(ent.text)
                elif ent.label_ in ["ORG"]:
                    organizations.append(ent.text)
                elif ent.label_ in ["GPE", "LOC"]:
                    locations.append(ent.text)
            
            return {
                "entities": entities,
                "persons": list(set(persons))[:5],  # Dedupe and limit
                "organizations": list(set(organizations))[:10],
                "locations": list(set(locations))[:5]
            }
            
        except Exception as e:
            logger.warning(f"spaCy extraction failed: {e}")
            return {"entities": [], "persons": [], "organizations": [], "locations": []}
