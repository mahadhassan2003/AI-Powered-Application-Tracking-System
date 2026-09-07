
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
import time
from typing import Dict, Optional
import logging
import redis
import os
import json

logger = logging.getLogger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent API abuse.
    Implements a sliding window algorithm with Redis for distributed rate limiting.
    Falls back to in-memory if Redis is unavailable.
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        
        # Try to connect to Redis
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')
            _ssl_kwargs = {"ssl_cert_reqs": "none"} if redis_url.startswith("rediss://") else {}
            self.redis_client = redis.from_url(redis_url, decode_responses=True, **_ssl_kwargs)
            self.redis_client.ping()
            self.use_redis = True
            logger.info("Rate limiting using Redis (distributed)")
        except Exception as e:
            logger.warning(f"Redis unavailable, using in-memory rate limiting: {e}")
            self.use_redis = False
            from collections import defaultdict
            self.request_history: Dict[str, list] = defaultdict(list)
        
        # Different rate limits for different endpoint types
        self.endpoint_limits = {
            "/auth/login": 5,  # 5 requests per minute for login
            "/auth/signup": 3,  # 3 requests per minute for signup
            "/applications/": 30,  # 30 requests per minute for applications
            "/jobs/": 60,  # 60 requests per minute for job browsing
            "/emails/": 10,  # 10 requests per minute for email operations
            "/interviews/": 30,  # 30 requests per minute for interviews
        }
        
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def get_rate_limit(self, path: str) -> int:
        """Get rate limit for specific endpoint"""
        for endpoint_prefix, limit in self.endpoint_limits.items():
            if path.startswith(endpoint_prefix):
                return limit
        return self.requests_per_minute
    
    def get_redis_key(self, ip: str, path: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"rate_limit:{ip}:{path}"
    
    async def check_rate_limit_redis(self, ip: str, path: str, rate_limit: int) -> tuple[bool, int]:
        """Check rate limit using Redis (sliding window)"""
        key = self.get_redis_key(ip, path)
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window
        
        try:
            # Remove old entries outside the window
            self.redis_client.zremrangebyscore(key, 0, window_start)
            
            # Count requests in current window
            request_count = self.redis_client.zcard(key)
            
            if request_count >= rate_limit:
                # Get oldest request to calculate retry_after
                oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    oldest_timestamp = oldest[0][1]
                    retry_after = int(60 - (current_time - oldest_timestamp))
                    return False, retry_after
                return False, 60
            
            # Add current request
            self.redis_client.zadd(key, {str(current_time): current_time})
            
            # Set expiry on key (2 minutes to be safe)
            self.redis_client.expire(key, 120)
            
            return True, 0
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fall back to allowing the request if Redis fails
            return True, 0
    
    async def check_rate_limit_memory(self, ip: str, path: str, rate_limit: int, current_time: float) -> tuple[bool, int]:
        """Check rate limit using in-memory storage (fallback)"""
        key = f"{ip}:{path}"
        
        # Initialize if not exists
        if key not in self.request_history:
            self.request_history[key] = []
        
        # Clean old requests
        one_minute_ago = current_time - 60
        self.request_history[key] = [
            ts for ts in self.request_history[key]
            if ts > one_minute_ago
        ]
        
        # Check limit
        if len(self.request_history[key]) >= rate_limit:
            oldest_request = min(self.request_history[key])
            retry_after = int(60 - (current_time - oldest_request))
            return False, retry_after
        
        # Record request
        self.request_history[key].append(current_time)
        
        return True, 0
    
    async def dispatch(self, request: Request, call_next):
        """Process request and apply rate limiting"""
        
        # Skip rate limiting for static files and health checks
        if request.url.path.startswith("/static") or request.url.path == "/":
            return await call_next(request)
        
        client_ip = self.get_client_ip(request)
        current_time = time.time()
        path = request.url.path
        rate_limit = self.get_rate_limit(path)
        
        # Check rate limit (Redis or in-memory)
        if self.use_redis:
            allowed, retry_after = await self.check_rate_limit_redis(client_ip, path, rate_limit)
        else:
            allowed, retry_after = await self.check_rate_limit_memory(client_ip, path, rate_limit, current_time)
        
        if not allowed:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on endpoint {path}. "
                f"Limit: {rate_limit}/min"
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    "retry_after": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        
        # Calculate remaining requests
        if self.use_redis:
            try:
                key = self.get_redis_key(client_ip, path)
                current_count = self.redis_client.zcard(key)
                remaining = rate_limit - current_count
            except:
                remaining = rate_limit - 1
        else:
            key = f"{client_ip}:{path}"
            current_count = len(self.request_history.get(key, []))
            remaining = rate_limit - current_count
        
        response.headers["X-RateLimit-Limit"] = str(rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response
