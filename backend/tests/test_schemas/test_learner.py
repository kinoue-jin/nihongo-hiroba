"""Tests for learner.py - Learner schemas"""
import pytest
from uuid import uuid4


class TestLearnerSchema:
    """Learner schemas with proper field selection"""
    
    def test_learner_with_all_fields(self):
        from app.schemas.learner import Learner, LearnerCreate, LearnerUpdate, PublicLearnerResponse
        learner_id = str(uuid4())
        
        learner = Learner(
            id=learner_id,
            nickname="タロー",
            origin_country="Brazil",
            arrived_japan="2024-03-15",
            joined_at="2024-04-01",
            japanese_level="N3",
            self_intro="Hello!",
            is_public=True,
            profile_media_id=None,
            supabase_user_id=str(uuid4()),
            email="tarou@example.com",
            invitation_status="active"
        )
        assert learner.nickname == "タロー"
        assert learner.email == "tarou@example.com"
    
    def test_public_learner_response_excludes_sensitive_fields(self):
        from app.schemas.learner import PublicLearnerResponse
        learner_id = str(uuid4())
        
        public = PublicLearnerResponse(
            id=learner_id,
            nickname="タロー",
            origin_country="Brazil",
            arrived_japan="2024-03-15",
            japanese_level="N3",
            self_intro="Hello!",
            profile_media_id=None
        )
        assert not hasattr(public, "email")
        assert not hasattr(public, "supabase_user_id")
        assert public.nickname == "タロー"
    
    def test_learner_create(self):
        from app.schemas.learner import LearnerCreate
        learner = LearnerCreate(
            nickname="花子",
            origin_country="Vietnam",
            arrived_japan="2023-09-01",
            joined_at="2023-10-01",
            email="hanako@example.com"
        )
        assert learner.nickname == "花子"
    
    def test_invitation_status_validation(self):
        from app.schemas.learner import Learner, LearnerCreate
        # Valid statuses
        for status in ["pending", "invited", "active", "expired"]:
            learner = Learner(
                nickname="test",
                origin_country="Brazil",
                arrived_japan="2024-03-15",
                joined_at="2024-04-01",
                email="test@example.com",
                supabase_user_id=str(uuid4()),
                invitation_status=status
            )
            assert learner.invitation_status == status
        
        # Invalid status
        with pytest.raises(ValueError):
            Learner(
                nickname="test",
                origin_country="Brazil",
                arrived_japan="2024-03-15",
                joined_at="2024-04-01",
                email="test@example.com",
                supabase_user_id=str(uuid4()),
                invitation_status="invalid"
            )
