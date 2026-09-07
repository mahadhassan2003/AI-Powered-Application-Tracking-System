import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models import Offer, OfferStatus, OfferNegotiation, Application, ApplicationStatus, User
from services.negotiation_service import NegotiationService
from datetime import datetime

class TestNegotiationService:
    @pytest.mark.asyncio
    async def test_process_offer_decline(self):
        mock_db = AsyncMock()
        mock_offer = Offer(
            id=1, 
            status=OfferStatus.SENT
        )
        
        reason = "Salary too low"
        result = await NegotiationService.process_offer_decline(mock_offer, reason, mock_db)
        
        assert result is True
        assert mock_offer.status == OfferStatus.DECLINED
        assert mock_offer.response_action == "declined"
        assert mock_offer.response_notes == "Salary too low"
        mock_db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_apply_negotiation_terms(self):
        mock_db = AsyncMock()
        mock_offer = Offer(
            id=2, 
            status=OfferStatus.SENT,
            base_salary=100000,
            signing_bonus=0,
            stock_options=100
        )
        
        mock_neg = OfferNegotiation(
            proposed_salary=120000,
            proposed_signing_bonus=5000,
            proposed_stock_options=200,
            proposed_benefits="More PTO"
        )
        
        result = await NegotiationService.apply_negotiation_terms_to_offer(mock_offer, mock_neg, mock_db)
        
        assert result is True
        
        # Verify the offer reverted to draft state
        assert mock_offer.status == OfferStatus.DRAFT
        assert mock_offer.sent_at is None
        assert mock_offer.viewed_at is None
        
        # Verify the fields mutated correctly based on negotiation array
        assert mock_offer.base_salary == 120000
        assert mock_offer.signing_bonus == 5000
        assert mock_offer.stock_options == 200
        assert mock_offer.benefits_summary == "More PTO"
        
        # Verify negotiation array updated status
        assert mock_neg.status == "accepted"
