
import bcrypt
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from typing import Optional
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class AuthHandler:
    def __init__(self):
        # Enforce explicitly configured secrets in production
        secret = os.getenv("JWT_SECRET_KEY")
        if not secret:
            if os.getenv("ENV", "development") == "production":
                raise ValueError("FATAL: JWT_SECRET_KEY environment variable is critically missing in production.")
            logger.warning("WARNING: Using insecure default JWT secret for fallback testing.")
            secret = "local_development_secret_key_32_chars_minimum_for_security_hardcoded"
        self.secret = secret
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def encode_token(self, user_id: int, role: str) -> str:
        """Create a JWT token"""
        payload = {
            'exp': datetime.utcnow() + timedelta(days=1),
            'iat': datetime.utcnow(),
            'sub': str(user_id),  # Convert to string for JWT spec compliance
            'role': role
        }
        return jwt.encode(payload, self.secret, algorithm='HS256')
    
    def decode_token(self, token: str) -> dict:
        """Decode and verify a JWT token"""
        logger.debug(f"Attempting to decode token: {token[:20]}...")
        try:
            payload = jwt.decode(token, self.secret, algorithms=['HS256'])
            logger.debug(f"Token decoded successfully: {payload}")
            return payload
        except ExpiredSignatureError as e:
            logger.error(f"Token expired: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Token has expired'
            )
        except JWTError as e:
            logger.error(f"Invalid token error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token'
            )
    
    def get_current_user(self, token: str) -> dict:
        """Get current user from token"""
        logger.debug(f"Getting current user from token")
        payload = self.decode_token(token)
        user_data = {
            'user_id': payload['sub'],
            'role': payload['role']
        }
        logger.debug(f"Current user data from token: {user_data}")
        return user_data

auth_handler = AuthHandler()
