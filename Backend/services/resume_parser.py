"""
Compatibility shim for ResumeParser.
This module has been refactored and extracted into the `services.parsers` package.
Please import from `services.parsers.core_parser` in the future.
"""

from .parsers.core_parser import ResumeParser
from .parsers.exceptions import ResumeParsingError
from .parsers.strategies.regex_strategy import extract_email_regex, extract_phone_regex, extract_tech_skills_regex

# Re-export necessary components to preserve backward compatibility
__all__ = ['ResumeParser', 'ResumeParsingError', 'extract_email_regex', 'extract_phone_regex', 'extract_tech_skills_regex']
