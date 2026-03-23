"""Tests for news.py - News schemas"""
import pytest
from uuid import uuid4


class TestNewsSchema:
    """News schemas"""
    
    def test_news_with_all_fields(self):
        from app.schemas.news import News, NewsCreate, NewsUpdate
        news_id = str(uuid4())
        category_id = str(uuid4())
        author_id = str(uuid4())
        
        news = News(
            id=news_id,
            title="テストニュース",
            body="本文です",
            category_id=category_id,
            published_at="2026-03-23T10:00:00",
            author=author_id,
            is_published=True
        )
        assert news.title == "テストニュース"
        assert news.body == "本文です"
        assert news.is_published is True
    
    def test_news_create(self):
        from app.schemas.news import NewsCreate
        category_id = str(uuid4())
        author_id = str(uuid4())
        
        news = NewsCreate(
            title="新しいニュース",
            body="内容",
            category_id=category_id,
            published_at="2026-03-23T10:00:00",
            author=author_id,
            is_published=False
        )
        assert news.title == "新しいニュース"
        assert news.is_published is False
    
    def test_news_update(self):
        from app.schemas.news import NewsUpdate
        update = NewsUpdate(title="更新タイトル", is_published=True)
        assert update.title == "更新タイトル"
        assert update.is_published is True
