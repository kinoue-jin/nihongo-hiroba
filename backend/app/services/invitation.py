"""Invitation service with race condition handling"""
import logging
from typing import Optional
from uuid import UUID
from supabase import Client

logger = logging.getLogger(__name__)


class InvitationService:
    """
    Service for managing learner invitations.

    Handles the race condition scenario where:
    1. deleteUser may fail (user may already be deleted)
    2. Set supabase_user_id to NULL
    3. inviteUserByEmail creates a new user
    4. Update supabase_user_id with new UID
    """

    def __init__(self, supabase_admin: Client):
        self.supabase = supabase_admin

    def invite_learner(self, learner_id: UUID, email: str) -> dict:
        """
        Send invitation to a learner.

        Handles race conditions where the learner may have a stale supabase_user_id
        from a previous invitation that failed to complete.
        """
        # Get current learner state
        learner_response = self.supabase.from_("learners").select("*").eq("id", str(learner_id)).execute()

        if not learner_response.data:
            raise ValueError(f"Learner not found: {learner_id}")

        learner = learner_response.data[0]
        existing_user_id = learner.get("supabase_user_id")

        # If there's an existing user, we need to clean it up first
        if existing_user_id:
            self._cleanup_existing_user(existing_user_id)

        # Update learner to remove old supabase_user_id (if any)
        self.supabase.from_("learners").update(
            {"supabase_user_id": None, "invitation_status": "pending"}
        ).eq("id", str(learner_id)).execute()

        # Create new invitation
        try:
            invitation_response = self.supabase.auth.admin.invite_user_by_email(email)
            new_user_id = invitation_response.user.id if invitation_response.user else None

            if not new_user_id:
                raise ValueError("Failed to get new user ID from invitation")

            # Update learner with new supabase_user_id
            update_response = self.supabase.from_("learners").update(
                {
                    "supabase_user_id": new_user_id,
                    "invitation_status": "invited",
                }
            ).eq("id", str(learner_id)).execute()

            return update_response.data[0] if update_response.data else {}

        except Exception as e:
            logger.error(f"Failed to invite learner {learner_id}: {e}")
            # Revert to pending status
            self.supabase.from_("learners").update(
                {"invitation_status": "pending"}
            ).eq("id", str(learner_id)).execute()
            raise

    def _cleanup_existing_user(self, user_id: str) -> None:
        """
        Clean up existing user account.

        Attempts to delete the user, but failures are ignored since:
        - The user may have already been deleted
        - The user may not exist in auth anymore
        """
        try:
            self.supabase.auth.admin.delete_user(user_id)
            logger.info(f"Successfully deleted user {user_id}")
        except Exception as e:
            # Log but don't fail - user may already be gone
            logger.warning(f"Failed to delete user {user_id} (may already be deleted): {e}")

    def resend_invitation(self, learner_id: UUID) -> dict:
        """
        Resend invitation to a learner who has already been invited.

        This is used when an invitation has expired or the learner didn't receive it.
        """
        learner_response = self.supabase.from_("learners").select("*").eq("id", str(learner_id)).execute()

        if not learner_response.data:
            raise ValueError(f"Learner not found: {learner_id}")

        learner = learner_response.data[0]

        if learner["invitation_status"] not in ("invited", "expired"):
            raise ValueError(f"Cannot resend invitation for learner with status: {learner['invitation_status']}")

        email = learner["email"]
        existing_user_id = learner.get("supabase_user_id")

        # Clean up existing user if any
        if existing_user_id:
            self._cleanup_existing_user(existing_user_id)

        # Clear supabase_user_id
        self.supabase.from_("learners").update(
            {"supabase_user_id": None}
        ).eq("id", str(learner_id)).execute()

        # Send new invitation
        try:
            invitation_response = self.supabase.auth.admin.invite_user_by_email(email)
            new_user_id = invitation_response.user.id if invitation_response.user else None

            if new_user_id:
                self.supabase.from_("learners").update(
                    {"supabase_user_id": new_user_id}
                ).eq("id", str(learner_id)).execute()

            return {"status": "success", "message": "Invitation resent"}

        except Exception as e:
            logger.error(f"Failed to resend invitation for learner {learner_id}: {e}")
            raise

    def activate_learner(self, learner_id: UUID) -> dict:
        """
        Mark a learner as active (called when they complete sign-up).
        """
        learner_response = self.supabase.from_("learners").select("*").eq("id", str(learner_id)).execute()

        if not learner_response.data:
            raise ValueError(f"Learner not found: {learner_id}")

        update_response = self.supabase.from_("learners").update(
            {"invitation_status": "active"}
        ).eq("id", str(learner_id)).execute()

        return update_response.data[0] if update_response.data else {}

    def expire_invitation(self, learner_id: UUID) -> dict:
        """
        Mark a learner's invitation as expired.
        """
        learner_response = self.supabase.from_("learners").select("*").eq("id", str(learner_id)).execute()

        if not learner_response.data:
            raise ValueError(f"Learner not found: {learner_id}")

        update_response = self.supabase.from_("learners").update(
            {"invitation_status": "expired"}
        ).eq("id", str(learner_id)).execute()

        return update_response.data[0] if update_response.data else {}
