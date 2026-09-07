
"""
Storage service supporting both local filesystem and S3-compatible cloud storage
"""

import os
import logging
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import datetime, timedelta
import mimetypes

logger = logging.getLogger(__name__)

class StorageService:
    """
    Unified storage interface supporting local and S3 storage
    """
    
    def __init__(self):
        self.storage_type = os.getenv("STORAGE_TYPE", "local")  # "local" or "s3"
        
        if self.storage_type == "s3":
            self._init_s3()
        else:
            self._init_local()
    
    def _init_local(self):
        """Initialize local file storage"""
        self.upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
        self.upload_dir.mkdir(exist_ok=True)
        logger.info("Storage service initialized: LOCAL")
    
    def _init_s3(self):
        """Initialize S3 storage"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            self.s3_bucket = os.getenv("S3_BUCKET_NAME")
            self.s3_region = os.getenv("S3_REGION", "us-east-1")
            self.s3_endpoint = os.getenv("S3_ENDPOINT_URL")  # For S3-compatible services
            
            if not self.s3_bucket:
                raise ValueError("S3_BUCKET_NAME environment variable is required for S3 storage")
            
            # Initialize S3 client
            s3_config = {
                "region_name": self.s3_region
            }
            
            # Support for S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
            if self.s3_endpoint:
                s3_config["endpoint_url"] = self.s3_endpoint
            
            # Use AWS credentials from environment or IAM role
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            
            if aws_access_key and aws_secret_key:
                s3_config["aws_access_key_id"] = aws_access_key
                s3_config["aws_secret_access_key"] = aws_secret_key
            
            self.s3_client = boto3.client("s3", **s3_config)
            self.ClientError = ClientError
            
            # Verify bucket exists
            try:
                self.s3_client.head_bucket(Bucket=self.s3_bucket)
                logger.info(f"Storage service initialized: S3 (bucket: {self.s3_bucket})")
            except ClientError as e:
                logger.error(f"S3 bucket {self.s3_bucket} not accessible: {e}")
                raise
                
        except ImportError:
            logger.error("boto3 library not installed. Install with: pip install boto3")
            raise
    
    def save_file(self, file_content: bytes, filename: str, content_type: Optional[str] = None) -> str:
        """
        Save file to storage
        
        Args:
            file_content: File content as bytes
            filename: Filename to save as
            content_type: MIME type of the file
            
        Returns:
            Path/key of saved file
        """
        if self.storage_type == "s3":
            return self._save_to_s3(file_content, filename, content_type)
        else:
            return self._save_to_local(file_content, filename)
    
    def _save_to_local(self, file_content: bytes, filename: str) -> str:
        """Save file to local filesystem"""
        file_path = self.upload_dir / filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return str(file_path)
    
    def _save_to_s3(self, file_content: bytes, filename: str, content_type: Optional[str] = None) -> str:
        """Save file to S3"""
        # Organize files by date for better management
        date_prefix = datetime.now().strftime("%Y/%m/%d")
        s3_key = f"resumes/{date_prefix}/{filename}"
        
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type:
                content_type = "application/octet-stream"
        
        try:
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type,
                ServerSideEncryption="AES256"  # Encrypt at rest
            )
            
            logger.info(f"File uploaded to S3: {s3_key}")
            return s3_key
            
        except self.ClientError as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise
    
    def get_file(self, file_path: str) -> bytes:
        """
        Retrieve file from storage
        
        Args:
            file_path: Path/key of file to retrieve
            
        Returns:
            File content as bytes
        """
        if self.storage_type == "s3":
            return self._get_from_s3(file_path)
        else:
            return self._get_from_local(file_path)
    
    def _get_from_local(self, file_path: str) -> bytes:
        """Get file from local filesystem"""
        with open(file_path, "rb") as f:
            return f.read()
    
    def _get_from_s3(self, s3_key: str) -> bytes:
        """Get file from S3"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.s3_bucket,
                Key=s3_key
            )
            return response["Body"].read()
            
        except self.ClientError as e:
            logger.error(f"Failed to retrieve from S3: {e}")
            raise
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_path: Path/key of file to delete
            
        Returns:
            True if successful
        """
        if self.storage_type == "s3":
            return self._delete_from_s3(file_path)
        else:
            return self._delete_from_local(file_path)
    
    def _delete_from_local(self, file_path: str) -> bool:
        """Delete file from local filesystem"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete local file: {e}")
            return False
    
    def _delete_from_s3(self, s3_key: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.s3_bucket,
                Key=s3_key
            )
            logger.info(f"File deleted from S3: {s3_key}")
            return True
            
        except self.ClientError as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False
    
    def get_presigned_url(self, file_path: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate presigned URL for direct file access (S3 only)
        
        Args:
            file_path: S3 key of file
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL or None for local storage
        """
        if self.storage_type != "s3":
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.s3_bucket,
                    "Key": file_path
                },
                ExpiresIn=expiration
            )
            return url
            
        except self.ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None
    
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists in storage"""
        if self.storage_type == "s3":
            return self._exists_in_s3(file_path)
        else:
            return self._exists_locally(file_path)
    
    def _exists_locally(self, file_path: str) -> bool:
        """Check if file exists locally"""
        return Path(file_path).exists()
    
    def _exists_in_s3(self, s3_key: str) -> bool:
        """Check if file exists in S3"""
        try:
            self.s3_client.head_object(
                Bucket=self.s3_bucket,
                Key=s3_key
            )
            return True
        except self.ClientError:
            return False


# Global storage service instance
storage_service = StorageService()
