import asyncio
from sqlalchemy import update
from database import AsyncSessionLocal
from models import User

async def approve():
    async with AsyncSessionLocal() as session:
        result = await session.execute(update(User).where(User.email == 'hr@gmail.com').values(is_approved=True, approval_status='approved'))
        await session.commit()
        print(f'Approved hr@gmail.com')

asyncio.run(approve())
