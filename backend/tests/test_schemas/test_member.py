"""Tests for member.py - Member schemas"""
import pytest
from uuid import uuid4


class TestMemberSchema:
    """Member schemas with proper field selection"""

    def test_member_with_all_fields(self):
        from app.schemas.member import Member, MemberCreate, MemberUpdate, PublicMemberResponse
        from uuid import UUID
        member_id = uuid4()
        role_id = uuid4()
        profile_media_id = uuid4()
        supabase_user_id = uuid4()

        member = Member(
            id=member_id,
            name="田中太郎",
            role_id=role_id,
            contact="090-1234-5678",
            joined_at="2024-01-15",
            is_active=True,
            profile_media_id=profile_media_id,
            supabase_user_id=supabase_user_id,
            email="tanaka@example.com",
            admin_role=False
        )
        assert member.name == "田中太郎"
        assert member.email == "tanaka@example.com"
        assert member.supabase_user_id == supabase_user_id
        assert isinstance(member.supabase_user_id, UUID)
    
    def test_public_member_response_excludes_sensitive_fields(self):
        from app.schemas.member import PublicMemberResponse
        member_id = str(uuid4())
        role_id = str(uuid4())
        
        # PublicMemberResponse should NOT have email or supabase_user_id
        public = PublicMemberResponse(
            id=member_id,
            name="田中太郎",
            role_id=role_id,
            is_active=True,
            profile_media_id=None
        )
        assert not hasattr(public, "email")
        assert not hasattr(public, "supabase_user_id")
        assert public.name == "田中太郎"
    
    def test_member_create(self):
        from app.schemas.member import MemberCreate
        member = MemberCreate(
            name="鈴木花子",
            role_id=str(uuid4()),
            email="suzuki@example.com",
            supabase_user_id=str(uuid4()),
            contact="080-9876-5432",
            joined_at="2024-02-01",
            is_active=True,
            admin_role=False
        )
        assert member.name == "鈴木花子"
    
    def test_member_update(self):
        from app.schemas.member import MemberUpdate
        update = MemberUpdate(name="田中太郎更新", is_active=False)
        assert update.name == "田中太郎更新"
        assert update.is_active is False
