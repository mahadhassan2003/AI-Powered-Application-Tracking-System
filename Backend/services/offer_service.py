"""
Offer Management Service - Handles PDF generation, offer logic, and employee records
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from pathlib import Path
import uuid

# PDF generation
try:
    from jinja2 import Environment, FileSystemLoader, Template
    JINJA2_AVAILABLE = True
except ImportError:
    JINJA2_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

logger = logging.getLogger(__name__)

class OfferService:
    """Service for managing job offers and employee records"""
    
    def __init__(self, upload_dir: str = "uploads/offers"):
        """Initialize offer service"""
        self.upload_dir = upload_dir
        
        # Create directories if they don't exist
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)
        
        if not REPORTLAB_AVAILABLE:
            logger.warning("ReportLab not installed. PDF generation will be limited. Install with: pip install reportlab")
    
    def generate_offer_letter_pdf(
        self,
        offer_data: Dict[str, Any],
        company_name: str = "ATS Company",
        company_logo_path: Optional[str] = None
    ) -> str:
        """
        Generate offer letter PDF using ReportLab
        
        Args:
            offer_data: Dictionary with offer details
            company_name: Company name for letterhead
            company_logo_path: Path to company logo image
            
        Returns:
            Path to generated PDF file
        """
        if not REPORTLAB_AVAILABLE:
            logger.error("ReportLab not available for PDF generation")
            return self._generate_html_offer_letter(offer_data, company_name)
        
        try:
            # Generate unique filename
            offer_id = offer_data.get('id', str(uuid.uuid4()))
            filename = f"offer_{offer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            filepath = os.path.join(self.upload_dir, filename)
            
            # Create PDF
            doc = SimpleDocTemplate(
                filepath,
                pagesize=letter,
                rightMargin=0.5*inch,
                leftMargin=0.5*inch,
                topMargin=0.75*inch,
                bottomMargin=0.75*inch
            )
            
            # Story elements for PDF
            story = []
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=14,
                textColor=colors.HexColor('#1F2937'),
                spaceAfter=12,
                alignment=TA_CENTER
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=11,
                textColor=colors.HexColor('#374151'),
                spaceAfter=6,
                spaceBefore=12,
                bold=True
            )
            
            body_style = ParagraphStyle(
                'CustomBody',
                parent=styles['BodyText'],
                fontSize=10,
                leading=14,
                textColor=colors.HexColor('#4B5563'),
                spaceAfter=6
            )
            
            # Header
            story.append(Paragraph(f"{company_name}", title_style))
            story.append(Paragraph("Job Offer Letter", styles['Heading2']))
            story.append(Spacer(1, 0.3*inch))
            
            # Offer details
            candidate_name = offer_data.get('candidate_name', 'Candidate')
            position_title = offer_data.get('position_title', 'Position')
            base_salary = offer_data.get('base_salary', 0)
            currency = offer_data.get('currency', 'USD')
            start_date = offer_data.get('start_date', '')
            location = offer_data.get('location', '')
            employment_type = offer_data.get('employment_type', 'Full-time')
            
            story.append(Paragraph(f"Dear {candidate_name},", body_style))
            story.append(Spacer(1, 0.1*inch))
            
            # Main offer content
            main_text = f"""
            We are delighted to offer you the position of <b>{position_title}</b> at {company_name}.
            We believe your skills and experience will make a valuable contribution to our team.
            <br/><br/>
            Below are the details of our offer:
            """
            story.append(Paragraph(main_text, body_style))
            story.append(Spacer(1, 0.2*inch))
            
            # Offer details table
            offer_table_data = [
                ['Position Title', position_title],
                ['Employment Type', employment_type],
                ['Location', location],
                ['Start Date', str(start_date)],
                ['Annual Salary', f"{currency} {base_salary:,.2f}"],
            ]
            
            if offer_data.get('signing_bonus', 0) > 0:
                offer_table_data.append(['Signing Bonus', f"{currency} {offer_data['signing_bonus']:,.2f}"])
            
            if offer_data.get('stock_options', 0) > 0:
                offer_table_data.append(['Stock Options', f"{offer_data['stock_options']} shares"])
            
            table = Table(offer_table_data, colWidths=[2*inch, 4*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E5E7EB')),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.2*inch))
            
            # Benefits
            if offer_data.get('benefits_summary'):
                story.append(Paragraph("Benefits", heading_style))
                benefits_text = offer_data.get('benefits_summary', '')
                story.append(Paragraph(benefits_text, body_style))
                story.append(Spacer(1, 0.2*inch))
            
            # Custom message
            if offer_data.get('custom_message'):
                story.append(Paragraph("Additional Information", heading_style))
                story.append(Paragraph(offer_data.get('custom_message', ''), body_style))
                story.append(Spacer(1, 0.2*inch))
            
            # Expiry information
            expires_at = offer_data.get('expires_at', '')
            story.append(Paragraph("Offer Details", heading_style))
            expiry_text = f"""
            This offer is contingent upon successful background verification and other standard pre-employment checks.
            <br/><br/>
            <b>This offer expires on: {expires_at}</b>
            <br/><br/>
            Please confirm your acceptance by clicking the acceptance link in the email or replying to this offer.
            """
            story.append(Paragraph(expiry_text, body_style))
            story.append(Spacer(1, 0.3*inch))
            
            # Closing
            story.append(Paragraph("We are excited to welcome you to our team!", body_style))
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("Best regards,<br/><br/>", body_style))
            story.append(Paragraph(f"{company_name} Team", body_style))
            
            # Build PDF
            doc.build(story)
            logger.info(f"Offer letter PDF generated: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise
    
    def _generate_html_offer_letter(
        self,
        offer_data: Dict[str, Any],
        company_name: str
    ) -> str:
        """Fallback HTML offer letter generation"""
        logger.info("Generating HTML offer letter (PDF library not available)")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; color: #333; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .title {{ font-size: 24px; font-weight: bold; margin-bottom: 10px; }}
                .subtitle {{ font-size: 16px; color: #666; }}
                .section {{ margin-bottom: 20px; }}
                .section-title {{ font-size: 14px; font-weight: bold; margin-bottom: 10px; }}
                table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
                th, td {{ padding: 10px; text-align: left; border: 1px solid #ddd; }}
                th {{ background-color: #f0f0f0; font-weight: bold; }}
                .signature {{ margin-top: 40px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">{company_name}</div>
                <div class="subtitle">Job Offer Letter</div>
            </div>
            
            <p>Dear {offer_data.get('candidate_name', 'Candidate')},</p>
            
            <p>We are delighted to offer you the position of <strong>{offer_data.get('position_title', 'Position')}</strong>.</p>
            
            <div class="section">
                <div class="section-title">Offer Details:</div>
                <table>
                    <tr>
                        <th>Attribute</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>Position Title</td>
                        <td>{offer_data.get('position_title', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td>Employment Type</td>
                        <td>{offer_data.get('employment_type', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td>Location</td>
                        <td>{offer_data.get('location', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td>Start Date</td>
                        <td>{str(offer_data.get('start_date', 'N/A'))}</td>
                    </tr>
                    <tr>
                        <td>Annual Salary</td>
                        <td>{offer_data.get('currency', 'USD')} {offer_data.get('base_salary', 0):,.2f}</td>
                    </tr>
                </table>
            </div>
            
            {f'''<div class="section">
                <div class="section-title">Benefits:</div>
                <p>{offer_data.get('benefits_summary', '')}</p>
            </div>''' if offer_data.get('benefits_summary') else ''}
            
            <p><strong>This offer expires on: {offer_data.get('expires_at', 'N/A')}</strong></p>
            
            <p>Please confirm your acceptance by clicking the acceptance link in the email.</p>
            
            <div class="signature">
                <p>Best regards,<br/><br/>{company_name} Team</p>
            </div>
        </body>
        </html>
        """
        
        # Save HTML file as fallback
        offer_id = offer_data.get('id', str(uuid.uuid4()))
        filename = f"offer_{offer_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        filepath = os.path.join(self.upload_dir, filename)
        
        with open(filepath, 'w') as f:
            f.write(html_content)
        
        return filepath
    
    def generate_employee_id(self) -> str:
        """Generate unique employee ID"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_suffix = str(uuid.uuid4())[:8].upper()
        return f"EMP-{timestamp}-{random_suffix}"
    
    def calculate_offer_expiry(self, days: int = 7) -> datetime:
        """Calculate offer expiry date"""
        return datetime.utcnow() + timedelta(days=days)
    
    def validate_offer_acceptance(
        self,
        offer: Any,
        check_expiry: bool = True
    ) -> tuple[bool, str]:
        """
        Validate if offer can still be accepted
        
        Returns:
            (is_valid, message)
        """
        if offer.status == "withdrawn":
            return False, "This offer has been withdrawn"
        
        if offer.status == "declined":
            return False, "This offer has been declined"
        
        if offer.status == "accepted":
            return False, "This offer has already been accepted"
        
        if check_expiry and offer.expires_at:
            if datetime.utcnow() > offer.expires_at:
                return False, "This offer has expired"
        
        return True, "Offer is valid"
    
    def format_salary(self, amount: float, currency: str = "USD") -> str:
        """Format salary for display"""
        return f"{currency} {amount:,.2f}"
    
    def get_offer_analytics(self, offers_list: list) -> Dict[str, Any]:
        """Calculate analytics from list of offers"""
        total = len(offers_list)
        if total == 0:
            return {
                "total_offers": 0,
                "accepted": 0,
                "declined": 0,
                "pending": 0,
                "expired": 0,
                "acceptance_rate": 0,
                "avg_response_time": None
            }
        
        accepted = sum(1 for o in offers_list if o.status == "accepted")
        declined = sum(1 for o in offers_list if o.status == "declined")
        pending = sum(1 for o in offers_list if o.status in ["sent", "viewed"])
        expired = sum(1 for o in offers_list if o.status == "expired")
        
        # Calculate average response time
        response_times = []
        for offer in offers_list:
            if offer.responded_at and offer.sent_at:
                delta = (offer.responded_at - offer.sent_at).total_seconds() / 3600  # hours
                response_times.append(delta)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else None
        
        return {
            "total_offers": total,
            "accepted": accepted,
            "declined": declined,
            "pending": pending,
            "expired": expired,
            "acceptance_rate": (accepted / total * 100) if total > 0 else 0,
            "avg_response_time_hours": round(avg_response_time, 2) if avg_response_time else None
        }

# Initialize service
offer_service = OfferService()
