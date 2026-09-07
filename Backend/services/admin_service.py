from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import User, UserRole
import logging

logger = logging.getLogger(__name__)

class AdminService:
    @staticmethod
    async def get_pending_recruiters(db: AsyncSession):
        result = await db.execute(
            select(User).filter(User.role == UserRole.RECRUITER, User.approval_status == "pending")
        )
        return result.scalars().all()

    @staticmethod
    async def approve_recruiter(user: User, admin_name: str, db: AsyncSession):
        user.is_approved = True
        user.approval_status = "approved"
        user.rejection_reason = None
        await db.commit()
        logger.info(f"Recruiter approved by {admin_name}: {user.name} ({user.email})")
        return {"message": f"Recruiter {user.name} has been approved successfully"}

    @staticmethod
    async def reject_recruiter(user: User, reason: str, admin_name: str, db: AsyncSession):
        user.is_approved = False
        user.approval_status = "rejected"
        user.rejection_reason = reason
        await db.commit()
        logger.info(f"Recruiter rejected by {admin_name}: {user.name} ({user.email}) - Reason: {reason}")
        return {"message": f"Recruiter {user.name} has been rejected"}

    @staticmethod
    async def get_all_recruiters(db: AsyncSession):
        result = await db.execute(select(User).filter(User.role == UserRole.RECRUITER))
        return result.scalars().all()

    @staticmethod
    async def get_all_candidates(db: AsyncSession):
        result = await db.execute(select(User).filter(User.role == UserRole.CANDIDATE))
        return result.scalars().all()

    @staticmethod
    async def get_admin_dashboard_stats(db: AsyncSession):
        total_users = (await db.execute(select(func.count(User.id)))).scalar()
        total_recruiters = (await db.execute(select(func.count(User.id)).filter(User.role == UserRole.RECRUITER))).scalar()
        
        pending_recruiters = (await db.execute(
            select(func.count(User.id)).filter(
                User.role == UserRole.RECRUITER, User.approval_status == "pending"
            )
        )).scalar()
        
        approved_recruiters = (await db.execute(
            select(func.count(User.id)).filter(
                User.role == UserRole.RECRUITER, User.approval_status == "approved"
            )
        )).scalar()

        return {
            "total_users": total_users,
            "total_recruiters": total_recruiters,
            "pending_recruiters": pending_recruiters,
            "approved_recruiters": approved_recruiters
        }
