"""Pytest configuration and fixtures"""
import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set environment variables for testing
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("JWT_SECRET", "test-secret-key")


def create_mock_supabase_client():
    """Create a properly chained mock Supabase client"""
    client = MagicMock()

    # Helper to create mock query builders
    def create_query_mock(data=None, error=None):
        query = MagicMock()
        query.execute = MagicMock(return_value=MagicMock(data=data or [], error=error))

        # Chainable methods
        query.select = MagicMock(return_value=query)
        query.eq = MagicMock(return_value=query)
        query.range = MagicMock(return_value=query)
        query.order = MagicMock(return_value=query)
        query.limit = MagicMock(return_value=query)
        query.insert = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(
            data=[{"id": "test-id"}], error=None
        ))))
        query.update = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(
            data=[{"id": "test-id"}], error=None
        ))))
        query.delete = MagicMock(return_value=MagicMock(execute=MagicMock(return_value=MagicMock(
            data=[], error=None
        ))))
        return query

    def table_side_effect(table_name):
        return create_query_mock()

    client.from_ = MagicMock(side_effect=table_side_effect)
    client.table = MagicMock(side_effect=table_side_effect)
    client.storage = MagicMock()
    client.auth = MagicMock()

    return client


# Create reusable mock clients
_mock_supabase_instance = create_mock_supabase_client()
_mock_supabase_admin_instance = create_mock_supabase_client()


@pytest.fixture
def mock_supabase():
    """Mock Supabase client for all tests"""
    return _mock_supabase_instance


@pytest.fixture
def mock_supabase_admin():
    """Mock Supabase admin client for all tests"""
    return _mock_supabase_admin_instance


@pytest.fixture
def mock_supabase_client():
    """Alias for mock_supabase for compatibility"""
    return _mock_supabase_instance


@pytest.fixture
def mock_supabase_admin_client():
    """Alias for mock_supabase_admin for compatibility"""
    return _mock_supabase_admin_instance


@pytest.fixture
def mock_current_user():
    """Mock current authenticated user"""
    from app.dependencies import TokenPayload
    return TokenPayload(
        sub="test-user-id",
        role="admin",
        app_metadata={"role": "admin"},
        aud="authenticated",
    )


@pytest.fixture
def mock_staff_user():
    """Mock staff user"""
    from app.dependencies import TokenPayload
    return TokenPayload(
        sub="staff-user-id",
        role="staff",
        app_metadata={"role": "staff"},
        aud="authenticated",
    )


@pytest.fixture
def mock_learner_user():
    """Mock learner user"""
    from app.dependencies import TokenPayload
    return TokenPayload(
        sub="learner-user-id",
        role="learner",
        app_metadata={"role": "learner"},
        aud="authenticated",
    )


@pytest.fixture(scope="module")
def client():
    """Create test client with mocked Supabase clients"""
    # Patch before importing app
    with patch("supabase.create_client") as mock_create:
        def create_client_side_effect(url, key):
            if "service_role" in str(key) or "admin" in str(key):
                return _mock_supabase_admin_instance
            return _mock_supabase_instance
        mock_create.side_effect = create_client_side_effect

        # Also patch get_supabase functions
        with patch("app.dependencies.get_supabase_client", return_value=_mock_supabase_instance):
            with patch("app.dependencies.get_supabase_admin_client", return_value=_mock_supabase_admin_instance):
                from app.main import app
                with TestClient(app) as test_client:
                    yield test_client


def create_test_token(user_id: str, role: str, expired: bool = False) -> str:
    """Helper to create test JWT tokens"""
    import jwt
    from datetime import datetime, timedelta

    exp_time = datetime.utcnow() - timedelta(hours=1) if expired else datetime.utcnow() + timedelta(hours=1)

    payload = {
        "sub": user_id,
        "role": role,
        "app_metadata": {"role": role},
        "aud": "authenticated",
        "exp": exp_time,
        "iat": datetime.utcnow(),
    }

    return jwt.encode(payload, "test-secret-key", algorithm="HS256")
