"""Tests for news router"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def create_mock_query(data=None, error=None):
    """Create a fresh mock query with chainable methods"""
    query = MagicMock()
    query.execute = MagicMock(return_value=MagicMock(data=data or [], error=error))
    query.select = MagicMock(return_value=query)
    query.eq = MagicMock(return_value=query)
    query.range = MagicMock(return_value=query)
    query.order = MagicMock(return_value=query)
    query.limit = MagicMock(return_value=query)
    return query


class MockSupabaseClient:
    """Mock Supabase client that returns consistent mock queries"""
    def __init__(self):
        self._news_query = create_mock_query()

    def from_(self, table_name):
        if table_name == "news":
            return self._news_query
        return create_mock_query()


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    with patch("app.routers.news.get_supabase_client") as mock:
        client = MockSupabaseClient()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_supabase_admin():
    """Mock Supabase admin client"""
    with patch("app.routers.news.get_supabase_admin_client") as mock:
        client = MockSupabaseClient()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_current_user():
    """Mock current user dependency"""
    with patch("app.routers.news.require_staff") as mock:
        yield mock


@pytest.fixture
def client():
    """Create test client"""
    from app.main import app
    return TestClient(app)


class TestListNews:
    """Tests for GET /news/"""

    def test_list_news_success(self, client, mock_supabase):
        """Test listing published news"""
        mock_supabase.from_("news").select("*").eq().order().range().execute.return_value = MagicMock(
            data=[
                {"id": "news-1", "title": "Test News 1", "body": "Body 1", "category_id": "12345678-1234-1234-1234-123456789abc", "published_at": "2024-01-01T00:00:00", "author": "author-1", "is_published": True},
                {"id": "news-2", "title": "Test News 2", "body": "Body 2", "category_id": "12345678-1234-1234-1234-123456789abc", "published_at": "2024-01-02T00:00:00", "author": "author-2", "is_published": True},
            ]
        )

        response = client.get("/news/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_news_empty(self, client, mock_supabase):
        """Test listing news when none exist"""
        mock_supabase.from_("news").select("*").eq().order().range().execute.return_value = MagicMock(
            data=[]
        )

        response = client.get("/news/")

        assert response.status_code == 200
        assert response.json() == []


class TestGetNews:
    """Tests for GET /news/{news_id}"""

    def test_get_news_success(self, client, mock_supabase):
        """Test getting a single news item"""
        mock_supabase.from_("news").select("*").eq().eq().execute.return_value = MagicMock(
            data=[{"id": "12345678-1234-1234-1234-123456789001", "title": "Test News", "body": "Body", "category_id": "12345678-1234-1234-1234-123456789abc", "published_at": "2024-01-01T00:00:00", "author": "author-1", "is_published": True}]
        )

        response = client.get("/news/12345678-1234-1234-1234-123456789001")

        assert response.status_code == 200
        assert response.json()["id"] == "12345678-1234-1234-1234-123456789001"

    def test_get_news_not_found(self, client, mock_supabase):
        """Test getting a non-existent news item"""
        mock_supabase.from_("news").select("*").eq().eq().execute.return_value = MagicMock(
            data=[]
        )

        response = client.get("/news/12345678-1234-1234-1234-123456789999")

        assert response.status_code == 404
