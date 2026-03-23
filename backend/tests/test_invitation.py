"""Tests for invitation service"""
import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4


@pytest.fixture
def mock_supabase_admin():
    """Mock Supabase admin client"""
    return MagicMock()


@pytest.fixture
def invitation_service(mock_supabase_admin):
    """Create InvitationService with mocked client"""
    from app.services.invitation import InvitationService
    return InvitationService(mock_supabase_admin)


class TestInviteLearner:
    """Tests for invite_learner method"""

    def test_invite_learner_success(self, invitation_service, mock_supabase_admin):
        """Test successful learner invitation"""
        learner_id = str(uuid4())
        email = "newlearner@test.com"

        # Mock learner exists
        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "email": email, "supabase_user_id": None}]
        )

        # Mock invitation
        mock_invite_response = MagicMock()
        mock_invite_response.user.id = "new-user-id"
        mock_supabase_admin.auth.admin.invite_user_by_email.return_value = mock_invite_response

        # Mock update
        mock_supabase_admin.from_("learners").update().eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "invitation_status": "invited"}]
        )

        result = invitation_service.invite_learner(uuid4(), email)

        assert result["invitation_status"] == "invited"

    def test_invite_learner_not_found(self, invitation_service, mock_supabase_admin):
        """Test invitation for non-existent learner"""
        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[]
        )

        with pytest.raises(ValueError, match="Learner not found"):
            invitation_service.invite_learner(uuid4(), "test@test.com")

    def test_invite_learner_cleans_up_existing_user(self, invitation_service, mock_supabase_admin):
        """Test that existing user is cleaned up before new invitation"""
        learner_id = str(uuid4())
        existing_user_id = str(uuid4())
        email = "learner@test.com"

        # Mock learner with existing user
        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "email": email, "supabase_user_id": existing_user_id}]
        )

        # Mock user deletion (may fail but should be ignored)
        mock_supabase_admin.auth.admin.delete_user.side_effect = Exception("User already deleted")

        # Mock invitation
        mock_invite_response = MagicMock()
        mock_invite_response.user.id = "new-user-id"
        mock_supabase_admin.auth.admin.invite_user_by_email.return_value = mock_invite_response

        mock_supabase_admin.from_("learners").update().eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "invitation_status": "invited"}]
        )

        # Should not raise despite delete_user failure
        result = invitation_service.invite_learner(uuid4(), email)
        assert result["invitation_status"] == "invited"


class TestResendInvitation:
    """Tests for resend_invitation method"""

    def test_resend_invitation_success(self, invitation_service, mock_supabase_admin):
        """Test successful invitation resend"""
        learner_id = str(uuid4())
        email = "learner@test.com"

        # Mock learner exists with invited status
        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "email": email, "invitation_status": "invited", "supabase_user_id": "old-id"}]
        )

        # Mock new invitation
        mock_invite_response = MagicMock()
        mock_invite_response.user.id = "new-user-id"
        mock_supabase_admin.auth.admin.invite_user_by_email.return_value = mock_invite_response

        result = invitation_service.resend_invitation(uuid4())

        assert result["status"] == "success"

    def test_resend_invitation_invalid_status(self, invitation_service, mock_supabase_admin):
        """Test resend invitation for learner with invalid status"""
        # Mock learner with active status (not invited/expired)
        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": str(uuid4()), "email": "test@test.com", "invitation_status": "active"}]
        )

        with pytest.raises(ValueError, match="Cannot resend invitation"):
            invitation_service.resend_invitation(uuid4())


class TestActivateLearner:
    """Tests for activate_learner method"""

    def test_activate_learner_success(self, invitation_service, mock_supabase_admin):
        """Test successful learner activation"""
        learner_id = str(uuid4())

        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "invitation_status": "invited"}]
        )

        mock_supabase_admin.from_("learners").update().eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "invitation_status": "active"}]
        )

        result = invitation_service.activate_learner(uuid4())

        assert result["invitation_status"] == "active"


class TestExpireInvitation:
    """Tests for expire_invitation method"""

    def test_expire_invitation_success(self, invitation_service, mock_supabase_admin):
        """Test successful invitation expiration"""
        learner_id = str(uuid4())

        mock_supabase_admin.from_("learners").select("*").eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "invitation_status": "invited"}]
        )

        mock_supabase_admin.from_("learners").update().eq().execute.return_value = MagicMock(
            data=[{"id": learner_id, "invitation_status": "expired"}]
        )

        result = invitation_service.expire_invitation(uuid4())

        assert result["invitation_status"] == "expired"
