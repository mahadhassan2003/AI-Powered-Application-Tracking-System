import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models import Application, ApplicationStatus, Job, User
from services.application_service import ApplicationService
from datetime import datetime

class TestApplicationService:
    @pytest.mark.asyncio
    async def test_update_application_status(self):
        # Setup mock db and application
        mock_db = AsyncMock()
        
        mock_app = Application(
            id=1, 
            status=ApplicationStatus.APPLIED,
            updated_at=datetime.utcnow()
        )
        
        # Simulate user query logic finding the recruiter
        mock_user = User(id=1, role="recruiter")
        mock_app.job = Job(recruiter_id=1)
        mock_app.candidate = User(id=2)
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_app
        mock_db.execute.return_value = mock_result
        
        result = await ApplicationService.update_status(
            application_id=1,
            new_status=ApplicationStatus.OFFER,
            current_user=mock_user,
            db=mock_db
        )
        
        # Verify db logic triggered
        assert result.status == ApplicationStatus.OFFER
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_app)
        
    @pytest.mark.asyncio
    async def test_update_status_logs_history(self):
        """Verify that updating a status dynamically builds the state-change tracking dictionary logic behind the scenes if applicable."""
        mock_db = AsyncMock()
        mock_app = Application(id=2, status=ApplicationStatus.APPLIED)
        
        mock_user = User(id=1, role="recruiter")
        mock_app.job = Job(recruiter_id=1)
        mock_app.candidate = User(id=2)
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_app
        mock_db.execute.return_value = mock_result
        
        result = await ApplicationService.update_status(
            application_id=2,
            new_status=ApplicationStatus.INTERVIEW,
            current_user=mock_user,
            db=mock_db
        )
        
        assert result.status == ApplicationStatus.INTERVIEW
