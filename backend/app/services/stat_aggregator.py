"""Stat aggregator service for computing session statistics"""
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import datetime, timedelta
from supabase import Client


class StatAggregatorService:
    """
    Service for aggregating learning session statistics.

    Computes statistics from:
    - schedule_sessions: Session data
    - learning_records: Individual learning records
    - member_session_registrations: Member registrations
    - learner_session_registrations: Learner registrations
    - session_pairings: Pairing data
    """

    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    def aggregate_session_stats(
        self,
        class_type_id: UUID,
        period_start: str,
        period_end: str,
        granularity: str = "monthly",
    ) -> Dict[str, Any]:
        """
        Aggregate statistics for a given class type and time period.

        Args:
            class_type_id: The class type to aggregate
            period_start: Start date (YYYY-MM-DD)
            period_end: End date (YYYY-MM-DD)
            granularity: "monthly" or "yearly"

        Returns:
            Dictionary with total_sessions, total_attendees, and breakdown
        """
        # Get all sessions in the period
        sessions_response = self.supabase.from_("schedule_sessions").select("*").eq(
            "class_type_id", str(class_type_id)
        ).gte("date", period_start).lte("date", period_end).execute()

        sessions = sessions_response.data
        total_sessions = len(sessions)

        # Count total attendees from learning records
        session_ids = [s["id"] for s in sessions]
        total_attendees = 0
        breakdown = {
            "by_status": {},
            "by_member": {},
            "by_learner": {},
        }

        if session_ids:
            records_response = self.supabase.from_("learning_records").select("*").in_(
                "session_id", session_ids
            ).eq("attended", True).execute()

            records = records_response.data
            total_attendees = len(records)

            # Count by status
            status_counts: Dict[str, int] = {}
            for session in sessions:
                status = session.get("session_status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
            breakdown["by_status"] = status_counts

            # Count by member
            member_counts: Dict[str, int] = {}
            for record in records:
                member_id = record.get("member_id")
                if member_id:
                    member_counts[member_id] = member_counts.get(member_id, 0) + 1
            breakdown["by_member"] = member_counts

            # Count by learner
            learner_counts: Dict[str, int] = {}
            for record in records:
                learner_id = record.get("learner_id")
                if learner_id:
                    learner_counts[learner_id] = learner_counts.get(learner_id, 0) + 1
            breakdown["by_learner"] = learner_counts

        return {
            "period_start": period_start,
            "period_end": period_end,
            "granularity": granularity,
            "class_type_id": str(class_type_id),
            "total_sessions": total_sessions,
            "total_attendees": total_attendees,
            "breakdown": breakdown,
            "is_manual_override": False,
        }

    def aggregate_monthly_stats(
        self,
        year: int,
        month: int,
        class_type_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Aggregate monthly statistics.

        Args:
            year: Year to aggregate
            month: Month to aggregate (1-12)
            class_type_id: Optional specific class type to filter

        Returns:
            List of stat dictionaries for each class type
        """
        # Calculate period boundaries
        period_start = f"{year}-{month:02d}-01"
        if month == 12:
            period_end = f"{year + 1}-01-31"
        else:
            period_end = f"{year}-{month + 1:02d}-01"

        # Get class types to aggregate
        if class_type_id:
            class_types_response = self.supabase.from_("master_items").select("*").eq(
                "group_key", "class_type"
            ).eq("id", str(class_type_id)).eq("is_active", True).execute()
        else:
            class_types_response = self.supabase.from_("master_items").select("*").eq(
                "group_key", "class_type"
            ).eq("is_active", True).execute()

        class_types = class_types_response.data
        results = []

        for ct in class_types:
            stats = self.aggregate_session_stats(
                class_type_id=UUID(ct["id"]),
                period_start=period_start,
                period_end=period_end,
                granularity="monthly",
            )
            results.append(stats)

        return results

    def aggregate_yearly_stats(
        self,
        year: int,
        class_type_id: Optional[UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Aggregate yearly statistics.

        Args:
            year: Year to aggregate
            class_type_id: Optional specific class type to filter

        Returns:
            List of stat dictionaries for each class type
        """
        period_start = f"{year}-01-01"
        period_end = f"{year}-12-31"

        # Get class types to aggregate
        if class_type_id:
            class_types_response = self.supabase.from_("master_items").select("*").eq(
                "group_key", "class_type"
            ).eq("id", str(class_type_id)).eq("is_active", True).execute()
        else:
            class_types_response = self.supabase.from_("master_items").select("*").eq(
                "group_key", "class_type"
            ).eq("is_active", True).execute()

        class_types = class_types_response.data
        results = []

        for ct in class_types:
            stats = self.aggregate_session_stats(
                class_type_id=UUID(ct["id"]),
                period_start=period_start,
                period_end=period_end,
                granularity="yearly",
            )
            results.append(stats)

        return results

    def get_session_attendance_detail(
        self,
        session_id: UUID,
    ) -> Dict[str, Any]:
        """
        Get detailed attendance information for a specific session.

        Returns breakdown of attendees, absentees, and pairing information.
        """
        # Get session info
        session_response = self.supabase.from_("schedule_sessions").select("*").eq(
            "id", str(session_id)
        ).execute()

        if not session_response.data:
            raise ValueError(f"Session not found: {session_id}")

        session = session_response.data[0]

        # Get learning records
        records_response = self.supabase.from_("learning_records").select("*").eq(
            "session_id", str(session_id)
        ).execute()

        records = records_response.data

        # Get pairings
        pairings_response = self.supabase.from_("session_pairings").select("*").eq(
            "session_id", str(session_id)
        ).execute()

        pairings = pairings_response.data

        # Get member registrations
        member_reg_response = self.supabase.from_("member_session_registrations").select("*").eq(
            "session_id", str(session_id)
        ).execute()

        # Get learner registrations
        learner_reg_response = self.supabase.from_("learner_session_registrations").select("*").eq(
            "session_id", str(session_id)
        ).execute()

        attended = [r for r in records if r.get("attended")]
        absent = [r for r in records if not r.get("attended")]

        return {
            "session": session,
            "total_registered_members": len(member_reg_response.data),
            "total_registered_learners": len(learner_reg_response.data),
            "total_pairings": len(pairings),
            "total_attended": len(attended),
            "total_absent": len(absent),
            "attended_records": attended,
            "absent_records": absent,
            "pairings": pairings,
        }
