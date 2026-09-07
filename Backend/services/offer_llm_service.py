import os
import logging
from typing import Dict, Any, Optional

try:
    from groq import Groq
except ImportError:
    Groq = None

logger = logging.getLogger(__name__)

class OfferLLMService:
    def __init__(self):
        if Groq is None:
            logger.warning("Groq not installed, fallback logic will apply.")
            self.client = None
            return
            
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            logger.warning("GROQ_API_KEY not found.")
            self.client = None
        else:
            self.client = Groq(api_key=self.groq_api_key)
            
    def generate_offer_draft(self, candidate_name: str, position: str, salary: float, currency: str, stock: float, sign_on: float, benefits: str, employment_type: str = "full_time", start_date: str = "", expires_in_days: int = 7) -> str:
        if not self.client:
            return f"Dear {candidate_name},\n\nWe are absolutely delighted to offer you the position of {position}."
            
        prompt = f"""
You are an expert HR Executive creating a formal, high-quality offer letter draft.

Candidate Name: {candidate_name}
Position: {position}
Employment Type: {employment_type.replace('_', ' ').title()}
Start Date: {start_date}

Compensation Details:
- Base Salary: {salary:,} {currency}
- Sign-on Bonus: {sign_on:,} {currency}
- Stock/Equity: {stock:,}
- Additional Benefits: {benefits}

Offer Expiry: The candidate must respond within {expires_in_days} days.

Task:
Write a beautifully structured, highly professional offer letter draft using Markdown format. 
DO NOT INCLUDE ANY CONVERSATIONAL TEXT OUTSIDE OF THE LETTER. Provide only the Markdown itself.

Please ensure the letter includes:
1. An exciting, warm and professional welcome paragraph.
2. A clear breakdown of the position details (Title, Type, Start Date).
3. A distinct "Compensation Package" section using markdown bullet points for salary, bonus, equity, and benefits.
4. Next Steps & Deadline (instructing the candidate how to accept before the expiry period).
5. A professional sign-off ("Best regards, [Company Name] Team").
"""
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=1000
            )
            content = response.choices[0].message.content.strip()
            
            # Clean off any potential conversational wrappers sometimes output by models
            if content.startswith("```markdown"):
                content = content[11:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
                
            return content
        except Exception as e:
            logger.error(f"Failed to generate offer draft via Groq: {e}")
            return f"Dear {candidate_name},\n\nWe are absolutely delighted to offer you the position of {position}."
            
    def analyze_offer_competitiveness(self, position: str, location: str, salary: float, currency: str) -> Dict[str, Any]:
        if not self.client:
            return {"status": "unknown", "message": "Market analysis requires AI connection."}
            
        prompt = f"""
Given the following job offer:
Position: {position}
Location: {location}
Base Salary: {salary} {currency}

Analyze the competitiveness of this base salary for the specified role and location (ignoring bonuses). 
Return exactly a JSON object matching this schema:
{{
  "status": "below_market" | "competitive" | "above_market",
  "message": "A detailed 1-2 sentence explanation including an estimation of the typical market range for this role and location."
}}

Provide ONLY the valid JSON object. No reasoning before or after.
"""
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=300,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content.strip()
            
            import json
            return json.loads(content)
        except Exception as e:
            logger.error(f"Failed to analyze competitiveness via Groq: {e}")
            # Fallback JSON extraction if json_object format isn't respected by an older model or failed
            try:
                import re
                import json
                match = re.search(r'\{.*\}', str(e), re.DOTALL)
                if match:
                    return json.loads(match.group(0))
            except Exception:
                pass
            return {"status": "unknown", "message": "Error processing market data. Could not determine competitiveness."}

offer_llm_service = OfferLLMService()
