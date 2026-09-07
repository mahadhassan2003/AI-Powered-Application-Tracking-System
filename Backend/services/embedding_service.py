import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class EmbeddingService:
    _instance = None

    @classmethod
    def get_model(cls):
        """Lazy load embedding model into memory exactly once."""
        if cls._instance is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
                cls._instance = SentenceTransformer('all-MiniLM-L6-v2')
            except ImportError:
                logger.warning("sentence-transformers not installed; embeddings disabled.")
                cls._instance = False  # False means we tried and failed
        
        return cls._instance if cls._instance is not False else None

    @classmethod
    def generate_resume_embeddings(cls, parsing_result: Dict[str, Any]) -> Dict[str, List[float]]:
        """Generates text and skills embeddings safely handling fallback gracefully."""
        model = cls.get_model()
        if not model:
            return {"text_embedding": None, "skills_embedding": None}

        try:
            parsed_data = parsing_result.get('parsed_data', {})
            full_text = parsing_result.get('raw_text', '')[:1000]
            
            skills = parsed_data.get('skills', [])
            skills_text = ' '.join(skills) if skills else ""
            
            embeddings = {}
            
            if full_text.strip():
                embeddings['text_embedding'] = model.encode([full_text])[0].tolist()
            else:
                embeddings['text_embedding'] = None
                
            if skills_text.strip():
                embeddings['skills_embedding'] = model.encode([skills_text])[0].tolist()
            else:
                embeddings['skills_embedding'] = None
                
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to generate embeddings during operation: {e}")
            return {"text_embedding": None, "skills_embedding": None}
