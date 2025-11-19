"""Test configuration and fixtures"""
import pytest
from unittest.mock import Mock, MagicMock
from sqlalchemy.orm import Session
from backend.config import Settings


@pytest.fixture
def mock_settings():
    """Mock settings fixture"""
    settings = Mock(spec=Settings)
    settings.GOOGLE_API_KEY = "test_api_key_1234567890"
    settings.DATABASE_URL = "postgresql://test:test@localhost/test_db"
    return settings


@pytest.fixture
def mock_db_session():
    """Mock database session fixture"""
    session = MagicMock(spec=Session)
    session.query = Mock()
    session.add = Mock()
    session.commit = Mock()
    session.rollback = Mock()
    session.refresh = Mock()
    session.close = Mock()
    return session


@pytest.fixture
def mock_api_key():
    """Mock API key fixture"""
    return "test_google_api_key_abcdefghij"


@pytest.fixture
def sample_embedding():
    """Sample embedding vector fixture"""
    return [0.1] * 768  # 768-dimensional vector


@pytest.fixture
def sample_document_data():
    """Sample document data fixture"""
    return {
        "gemini_file_name": "files/test_file_123",
        "display_name": "test_document.txt",
        "content": "This is a test document content for testing purposes.",
        "file_size": 100
    }
