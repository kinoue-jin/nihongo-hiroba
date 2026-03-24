"""Tests for auth router"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# JWT secret used by the app (from conftest.py environment)
JWT_SECRET = "test-secret-key"


def create_mock_query(data=None, error=None):
    """Create a fresh mock query with chainable methods"""
    query = MagicMock()
    # execute() returns a MagicMock with data attribute
    query.execute = MagicMock(return_value=MagicMock(data=data or [], error=error))
    # Chainable methods return the query itself
    query.select = MagicMock(return_value=query)
    query.eq = MagicMock(return_value=query)
    query.range = MagicMock(return_value=query)
    query.order = MagicMock(return_value=query)
    query.limit = MagicMock(return_value=query)
    return query


class MockAuthUser:
    """Mock user object from Supabase Auth"""
    def __init__(self, user_id: str, email: str):
        self.id = user_id
        self.email = email


class MockAuthSession:
    """Mock session object from Supabase Auth"""
    def __init__(self, access_token: str):
        self.access_token = access_token


class MockAuth:
    """Mock Supabase Auth client"""
    def sign_in_with_password(self, credentials: dict):
        """Mock password sign-in - accepts dict with email and password"""
        # For testing: accept any password, look up user by email
        email = credentials.get("email")
        return MagicMock(
            user=MockAuthUser(user_id="supabase-auth-uuid", email=email),
            session=MagicMock(access_token="mock-access-token")
        )


class MockSupabaseAdmin:
    """Mock Supabase admin client that returns consistent mock queries"""
    def __init__(self):
        self._members_query = create_mock_query()
        self._learners_query = create_mock_query()
        self.auth = MockAuth()

    def from_(self, table_name):
        if table_name == "members":
            return self._members_query
        elif table_name == "learners":
            return self._learners_query
        return create_mock_query()


def create_mock_supabase_admin():
    """Create a properly chained mock Supabase admin client"""
    return MockSupabaseAdmin()


@pytest.fixture
def mock_supabase_admin():
    """Mock Supabase admin client - creates fresh mock for each test"""
    with patch("app.routers.auth.get_supabase_admin_client") as mock:
        client = create_mock_supabase_admin()
        mock.return_value = client
        yield client


@pytest.fixture
def client(mock_supabase_admin):
    """Create test client with mocked dependencies"""
    with patch("supabase.create_client") as mock_create:
        mock_create.return_value = mock_supabase_admin
        from app.main import app
        with TestClient(app) as tc:
            yield tc


class TestLogin:
    """Tests for POST /auth/login"""

    def test_login_success_member(self, client, mock_supabase_admin):
        """Test successful login for a member"""
        # MockAuth returns user with id="supabase-auth-uuid"
        # Then we look up by supabase_user_id
        mock_supabase_admin.from_("members").select("*").eq("supabase_user_id", "supabase-auth-uuid").execute.return_value = MagicMock(
            data=[{
                "id": "member-123",
                "email": "member@test.com",
                "admin_role": False,
                "supabase_user_id": "supabase-auth-uuid",
            }]
        )

        response = client.post("/auth/login", json={
            "email": "member@test.com",
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "member@test.com"
        assert data["user"]["role"] == "staff"

    def test_login_success_admin(self, client, mock_supabase_admin):
        """Test successful login for an admin"""
        mock_supabase_admin.from_("members").select("*").eq("supabase_user_id", "supabase-auth-uuid").execute.return_value = MagicMock(
            data=[{
                "id": "admin-123",
                "email": "admin@test.com",
                "admin_role": True,
                "supabase_user_id": "supabase-auth-uuid",
            }]
        )

        response = client.post("/auth/login", json={
            "email": "admin@test.com",
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"

    def test_login_success_learner(self, client, mock_supabase_admin):
        """Test successful login for a learner"""
        # Member lookup returns empty
        mock_supabase_admin.from_("members").select("*").eq("supabase_user_id", "supabase-auth-uuid").execute.return_value = MagicMock(
            data=[]
        )
        # Learner lookup returns learner
        mock_supabase_admin.from_("learners").select("*").eq("supabase_user_id", "supabase-auth-uuid").execute.return_value = MagicMock(
            data=[{
                "id": "learner-123",
                "email": "learner@test.com",
                "supabase_user_id": "supabase-auth-uuid",
            }]
        )

        response = client.post("/auth/login", json={
            "email": "learner@test.com",
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "learner"

    def test_login_invalid_credentials(self, client, mock_supabase_admin):
        """Test login with invalid credentials - mock auth failure"""
        # Make sign_in_with_password raise an error
        mock_supabase_admin.auth.sign_in_with_password = MagicMock(
            side_effect=Exception("Invalid login credentials")
        )

        response = client.post("/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword",
        })

        assert response.status_code == 401
        assert "認証に失敗しました" in response.json()["detail"]


class TestGetMe:
    """Tests for GET /auth/me"""

    def test_get_me_success(self, client):
        """Test getting current user info with valid token"""
        # Create a valid token
        import jwt
        from datetime import datetime, timedelta

        token = jwt.encode(
            {
                "sub": "user-123",
                "email": "test@example.com",
                "role": "admin",
                "app_metadata": {"role": "admin"},
                "aud": "authenticated",
                "exp": datetime.utcnow() + timedelta(hours=1),
                "iat": datetime.utcnow(),
            },
            JWT_SECRET,
            algorithm="HS256",
        )

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "user-123"
        assert data["role"] == "admin"

    def test_get_me_no_token(self, client):
        """Test getting current user without token"""
        response = client.get("/auth/me")

        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_get_me_expired_token(self, client):
        """Test getting current user with expired token"""
        import jwt
        from datetime import datetime, timedelta

        token = jwt.encode(
            {
                "sub": "user-123",
                "email": "test@example.com",
                "role": "admin",
                "app_metadata": {"role": "admin"},
                "aud": "authenticated",
                "exp": datetime.utcnow() - timedelta(hours=1),  # Expired
                "iat": datetime.utcnow() - timedelta(hours=2),
            },
            JWT_SECRET,
            algorithm="HS256",
        )

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()


class TestRefreshToken:
    """Tests for POST /auth/refresh"""

    def test_refresh_token_success(self, client):
        """Test refreshing a valid token"""
        import jwt
        from datetime import datetime, timedelta

        token = jwt.encode(
            {
                "sub": "user-123",
                "email": "test@example.com",
                "role": "staff",
                "app_metadata": {"role": "staff"},
                "aud": "authenticated",
                "exp": datetime.utcnow() + timedelta(hours=1),
                "iat": datetime.utcnow(),
            },
            JWT_SECRET,
            algorithm="HS256",
        )

        response = client.post("/auth/refresh", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_token_no_token(self, client):
        """Test refreshing without token"""
        response = client.post("/auth/refresh")

        assert response.status_code == 401
