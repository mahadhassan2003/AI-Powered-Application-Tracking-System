import os
import logging
from typing import Dict, Any, List

try:
    from groq import Groq
except ImportError:
    Groq = None

logger = logging.getLogger(__name__)

class EmailLLMService:
    def __init__(self):
        if Groq is None:
            logger.warning("Groq not installed.")
            self.client = None
            return
            
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            logger.warning("GROQ_API_KEY not found.")
            self.client = None
        else:
            self.client = Groq(api_key=self.groq_api_key)
            
    def generate_campaign(self, topic: str, tone: str) -> Dict[str, str]:
        """Generate a single highly optimized Email Outreach from a prompt"""
        if not self.client:
            return {"subject": "Connect regarding opportunities", "body_content": f"Hi there,\n\nI wanted to reach out regarding: {topic}\n\nLet's chat.\n\nBest,\nRecruiter"}
            
        prompt = f"""
You are an expert tech recruiter crafting a cold outreach email template.
Topic / Goal: {topic}
Tone: {tone}

Draft the perfect email to send. 
Important instructions:
1. When addressing the candidate, ALWAYS use the placeholder `{{{{candidate_name}}}}`.
2. For job titles, use `{{{{job_title}}}}`.
3. For company names, use `{{{{company_name}}}}`.
4. Return ONLY a raw valid JSON object with the following schema, and no other text or explanation. DO NOT wrap with Markdown codeblocks.

{{
  "subject": "The email subject line here",
  "body_content": "The actual email body here. Use \\n for line breaks."
}}
"""
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=600
            )
            content = response.choices[0].message.content.strip()
            
            # Clean possible markdown hooks
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            import json
            data = json.loads(content.strip())
            return {
                "subject": data.get("subject", "Connecting"),
                "body_content": data.get("body_content", "Following up.")
            }
        except Exception as e:
            logger.error(f"Failed to generate campaign via Groq: {e}")
            return {"subject": "Opportunity", "body_content": "We have an open role perfectly matching your background."}

email_llm_service = EmailLLMService()
