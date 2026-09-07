

import smtplib
import logging
import email.mime.text
import email.mime.multipart
import email.mime.base
import email.encoders
from typing import Optional, List
from datetime import datetime, timedelta
import os
from pathlib import Path
import socket

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, smtp_server=None, smtp_port=None, smtp_email=None, smtp_password=None, smtp_from_name=None):
        # Use provided credentials or fallback to .env or hardcoded credentials
        self.smtp_server = smtp_server or os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
        self.email = smtp_email or os.getenv("SMTP_EMAIL", "hassanmahad770@gmail.com")
        self.password = smtp_password or os.getenv("SMTP_PASSWORD", "")  # No hardcoded fallback - use .env only
        self.from_name = smtp_from_name or os.getenv("EMAIL_FROM_NAME", "ATS Hiring Team")
        self.timeout = 30  # 30 second timeout for SMTP operations
        
    def _create_smtp_connection(self):
        """Create SMTP connection with proper timeout handling"""
        try:
            # Create socket with timeout
            server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=self.timeout)
            server.starttls()
            server.login(self.email, self.password)
            logger.info(f"SMTP connection successful to {self.smtp_server}:{self.smtp_port}")
            return server
        except socket.timeout:
            logger.error(f"SMTP connection timeout - could not connect to {self.smtp_server}:{self.smtp_port} within {self.timeout}s. Check network/firewall settings.")
            raise
        except smtplib.SMTPAuthenticationError:
            logger.error(f"SMTP authentication failed - check email credentials")
            raise
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            raise
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None, attachments: Optional[List[str]] = None):
        """Send an email"""
        try:
            # Create message
            msg = email.mime.multipart.MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add text content
            if text_content:
                text_part = email.mime.text.MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            # Add HTML content
            html_part = email.mime.text.MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, "rb") as attachment:
                            part = email.mime.base.MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                        
                        email.encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {os.path.basename(file_path)}'
                        )
                        msg.attach(part)
            
            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_welcome_email(self, candidate_name: str, candidate_email: str, job_title: str, company_name: str = "Our Company"):
        """Send welcome email when candidate applies"""
        subject = f"Application Received - {job_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Application Received</h1>
                </div>
                <div class="content">
                    <h2>Dear {candidate_name},</h2>
                    <p>Thank you for your interest in the <strong>{job_title}</strong> position at {company_name}.</p>
                    <p>We have successfully received your application and our team will review it shortly. Here's what happens next:</p>
                    <ul>
                        <li>Our recruiting team will review your application within 2-3 business days</li>
                        <li>If your profile matches our requirements, we'll contact you for next steps</li>
                        <li>You can track your application status in your candidate dashboard</li>
                    </ul>
                    <p>We appreciate your interest in joining our team and will be in touch soon.</p>
                    <p>Best regards,<br>The Hiring Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Dear {candidate_name},
        
        Thank you for your interest in the {job_title} position at {company_name}.
        
        We have successfully received your application and our team will review it shortly.
        
        Our recruiting team will review your application within 2-3 business days.
        If your profile matches our requirements, we'll contact you for next steps.
        
        Best regards,
        The Hiring Team
        """
        
        return self.send_email(candidate_email, subject, html_content, text_content)
    
    def send_status_update_email(self, candidate_name: str, candidate_email: str, job_title: str, status: str):
        """Send email when application status changes"""
        status_messages = {
            'shortlisted': {
                'subject': f"Good News! You've been shortlisted - {job_title}",
                'message': "Congratulations! Your application has been shortlisted for further review.",
                'next_steps': "Our team will contact you soon to schedule an interview."
            },
            'interview': {
                'subject': f"Interview Invitation - {job_title}",
                'message': "Great news! We would like to invite you for an interview.",
                'next_steps': "You will receive a separate email with interview details shortly."
            },
            'rejected': {
                'subject': f"Update on your application - {job_title}",
                'message': "Thank you for your interest in our company. After careful consideration, we have decided to move forward with other candidates.",
                'next_steps': "We encourage you to apply for other positions that match your skills."
            },
            'hired': {
                'subject': f"Congratulations! Job Offer - {job_title}",
                'message': "Congratulations! We are pleased to offer you the position.",
                'next_steps': "You will receive a detailed offer letter shortly. Welcome to the team!"
            },
            'interview_rescheduled': {
                'subject': f"Interview Rescheduled - {job_title}",
                'message': "Your interview has been successfully rescheduled to a new time.",
                'next_steps': "Please log in to your candidate portal to view and confirm the newly scheduled date and time."
            },
            'negotiation_accepted': {
                'subject': f"Good News! Offer Terms Accepted - {job_title}",
                'message': "We are pleased to inform you that your proposed offer terms have been accepted.",
                'next_steps': "The recruiter will send over an updated offer letter shortly for your final review."
            },
            'negotiation_declined': {
                'subject': f"Update on Offer Terms - {job_title}",
                'message': "Thank you for your proposal. After consideration, we are unable to accommodate the requested terms.",
                'next_steps': "Your original offer remains available for your review in the candidate portal."
            }
        }
        
        status_info = status_messages.get(status, {
            'subject': f"Application Status Update - {job_title}",
            'message': f"Your application status has been updated to: {status}",
            'next_steps': "We will keep you informed of any further updates."
        })
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {'#28a745' if status in ['shortlisted', 'interview', 'hired', 'interview_rescheduled', 'negotiation_accepted'] else '#6c757d'}; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                .status {{ display: inline-block; padding: 5px 15px; border-radius: 20px; background-color: {'#28a745' if status in ['shortlisted', 'interview', 'hired', 'interview_rescheduled', 'negotiation_accepted'] else '#6c757d'}; color: white; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Application Update</h1>
                </div>
                <div class="content">
                    <h2>Dear {candidate_name},</h2>
                    <p>We have an update regarding your application for the <strong>{job_title}</strong> position.</p>
                    <p><span class="status">{status.replace('_', ' ').title()}</span></p>
                    <p>{status_info['message']}</p>
                    <p>{status_info['next_steps']}</p>
                    <p>Thank you for your continued interest.</p>
                    <p>Best regards,<br>The Hiring Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(candidate_email, status_info['subject'], html_content)
    
    def send_interview_reminder(self, candidate_name: str, candidate_email: str, job_title: str, interview_date: datetime, interview_type: str = "interview", additional_details: str = ""):
        """Send interview reminder email"""
        formatted_date = interview_date.strftime("%A, %B %d, %Y at %I:%M %p")
        
        subject = f"Interview Reminder - {job_title} - {interview_date.strftime('%m/%d/%Y')}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #17a2b8; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                .interview-details {{ background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .important {{ color: #dc3545; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Interview Reminder</h1>
                </div>
                <div class="content">
                    <h2>Dear {candidate_name},</h2>
                    <p>This is a friendly reminder about your upcoming interview for the <strong>{job_title}</strong> position.</p>
                    
                    <div class="interview-details">
                        <h3>Interview Details:</h3>
                        <p><strong>Date & Time:</strong> {formatted_date}</p>
                        <p><strong>Type:</strong> {interview_type.title()}</p>
                        {f"<p><strong>Additional Details:</strong> {additional_details}</p>" if additional_details else ""}
                    </div>
                    
                    <p class="important">Please confirm your attendance and arrive 10 minutes early.</p>
                    
                    <p>If you need to reschedule or have any questions, please contact us as soon as possible.</p>
                    
                    <p>We look forward to speaking with you!</p>
                    
                    <p>Best regards,<br>The Hiring Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Dear {candidate_name},
        
        This is a reminder about your upcoming interview for the {job_title} position.
        
        Interview Details:
        Date & Time: {formatted_date}
        Type: {interview_type.title()}
        {f"Additional Details: {additional_details}" if additional_details else ""}
        
        Please confirm your attendance and arrive 10 minutes early.
        
        If you need to reschedule or have any questions, please contact us as soon as possible.
        
        Best regards,
        The Hiring Team
        """
        
        return self.send_email(candidate_email, subject, html_content, text_content)
    
    def send_rejection_email(self, candidate_name: str, candidate_email: str, job_title: str, personalized_message: Optional[str] = None):
        """Send rejection notification email"""
        subject = f"Thank you for your interest - {job_title}"
        
        default_message = "After careful consideration of your application and qualifications, we have decided to move forward with candidates whose experience more closely matches our current requirements."
        message = personalized_message if personalized_message else default_message
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #6c757d; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                .encouragement {{ background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Your Interest</h1>
                </div>
                <div class="content">
                    <h2>Dear {candidate_name},</h2>
                    <p>Thank you for taking the time to apply for the <strong>{job_title}</strong> position with our company.</p>
                    
                    <p>{message}</p>
                    
                    <div class="encouragement">
                        <p><strong>We encourage you to:</strong></p>
                        <ul>
                            <li>Apply for other positions that match your skills and experience</li>
                            <li>Connect with us on professional networks</li>
                            <li>Check our careers page regularly for new opportunities</li>
                        </ul>
                    </div>
                    
                    <p>We appreciate your interest in our company and wish you the best in your job search.</p>
                    
                    <p>Best regards,<br>The Hiring Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Dear {candidate_name},
        
        Thank you for taking the time to apply for the {job_title} position with our company.
        
        {message}
        
        We encourage you to:
        - Apply for other positions that match your skills and experience
        - Connect with us on professional networks
        - Check our careers page regularly for new opportunities
        
        We appreciate your interest in our company and wish you the best in your job search.
        
        Best regards,
        The Hiring Team
        """
        
        return self.send_email(candidate_email, subject, html_content, text_content)

    def send_custom_email(self, candidate_name: str, candidate_email: str, subject: str, raw_body: str):
        """Send a custom email, automatically linkifying URLs and handling placeholders."""
        import re

        # 1. Handle common placeholders if they haven't been handled yet
        # (Though most are handled in the task/route layer, we add portal_link here for convenience)
        portal_url = os.getenv("FRONTEND_URL", "https://ai-ats-portal-1014622097831.us-central1.run.app")
        processed_body = raw_body.replace('{{portal_link}}', portal_url)

        # 2. Convert raw URLs to clickable HTML links
        # Matches http/https links
        url_pattern = r'(https?://[^\s<>"]+|www\.[^\s<>"]+)'
        
        def link_repl(match):
            url = match.group(0)
            href = url if url.startswith('http') else f'http://{url}'
            return f'<a href="{href}" style="color: #0066cc; text-decoration: underline;">{url}</a>'
        
        # Replace line breaks with HTML breaks for HTML version
        html_body = processed_body.replace('\n', '<br>')
        # Apply linkification
        html_body = re.sub(url_pattern, link_repl, html_body)
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .content {{ padding: 20px; }}
                a {{ color: #0066cc; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    {html_body}
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(candidate_email, subject, html_content, processed_body)

# Global email service instance
email_service = EmailService()

