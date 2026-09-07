from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List, Dict
import json
import enum
from database import get_db
from models import Base, User
from routes.auth import get_current_user

router = APIRouter()

class NotificationType(str, enum.Enum):
    APPLICATION_RECEIVED = "application_received"
    STATUS_UPDATED = "status_updated"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    MESSAGE_RECEIVED = "message_received"
    DEADLINE_REMINDER = "deadline_reminder"

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200))
    message = Column(Text)
    type = Column(String(50))
    read = Column(Boolean, default=False)
    data = Column(Text)  # JSON data for additional context
    created_at = Column(DateTime, default=lambda: datetime.utcnow())

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    read: bool
    data: dict
    created_at: datetime

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
            except:
                # Connection closed, remove it
                self.disconnect(user_id)

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming websocket data if needed
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user notifications"""
    stmt = select(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        stmt = stmt.filter(Notification.read == False)

    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    return [
        NotificationResponse(
            id=notif.id,
            title=notif.title,
            message=notif.message,
            type=notif.type,
            read=notif.read,
            data=json.loads(notif.data) if notif.data else {},
            created_at=notif.created_at
        ) for notif in notifications
    ]

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark notification as read"""
    result = await db.execute(
        select(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalars().first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.read = True
    await db.commit()

    return {"message": "Notification marked as read"}

@router.put("/mark-all-read")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read"""
    await db.execute(
        update(Notification).where(
            Notification.user_id == current_user.id,
            Notification.read == False
        ).values(read=True)
    )
    await db.commit()

    return {"message": "All notifications marked as read"}

async def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    data: dict = None,
    db: AsyncSession = None
):
    """Helper function to create and send notifications"""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        data=json.dumps(data) if data else None
    )

    if db:
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

    # Send real-time notification via WebSocket
    notification_data = {
        "id": notification.id,
        "title": title,
        "message": message,
        "type": notification_type,
        "data": data or {},
        "created_at": notification.created_at.isoformat()
    }

    await manager.send_personal_message(
        json.dumps(notification_data),
        user_id
    )

    return notification