"""Tests for RAGService"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from backend.services.rag_service import RAGService
from backend.exceptions import ModelValidationError, FileUploadError


class TestRAGService:
    """Test cases for RAGService"""
    
    def test_init_with_valid_api_key(self, mock_api_key):
        """Test RAGService initialization with valid API key"""
        with patch('backend.services.rag_service.genai') as mock_genai, \
             patch('backend.services.rag_service.genai_client') as mock_client:
            
            service = RAGService(mock_api_key)
            
            assert service.api_key == mock_api_key
            mock_genai.configure.assert_called_once_with(api_key=mock_api_key)
    
    def test_init_without_api_key(self):
        """Test RAGService initialization without API key"""
        with pytest.raises(ValueError, match="API key is required"):
            RAGService("")
    
    def test_list_files_success(self, mock_api_key):
        """Test successful file listing"""
        with patch('backend.services.rag_service.genai') as mock_genai, \
             patch('backend.services.rag_service.genai_client'):
            
            # Mock file object
            mock_file = Mock()
            mock_file.name = "files/test_123"
            mock_file.display_name = "test.txt"
            mock_file.size_bytes = 1024
            mock_file.uri = "https://test.com/file"
            mock_file.create_time = None
            mock_file.state.name = "ACTIVE"
            
            mock_genai.list_files.return_value = [mock_file]
            
            service = RAGService(mock_api_key)
            files = service.list_files()
            
            assert len(files) == 1
            assert files[0]['name'] == "files/test_123"
            assert files[0]['display_name'] == "test.txt"
    
    def test_query_with_invalid_model(self, mock_api_key):
        """Test query with invalid model raises ModelValidationError"""
        with patch('backend.services.rag_service.genai'), \
             patch('backend.services.rag_service.genai_client'):
            
            service = RAGService(mock_api_key)
            
            # Mock get_available_models to return specific models
            service.get_available_models = Mock(return_value=[
                {'model_id': 'gemini-1.5-flash', 'name': 'Flash', 'description': 'Fast'}
            ])
            
            with pytest.raises(ModelValidationError):
                service.query("test query", model_name="invalid-model")
    
    def test_upload_file_success(self, mock_api_key):
        """Test successful file upload"""
        with patch('backend.services.rag_service.genai') as mock_genai, \
             patch('backend.services.rag_service.genai_client'):
            
            # Mock uploaded file
            mock_uploaded = Mock()
            mock_uploaded.name = "files/uploaded_123"
            mock_uploaded.display_name = "uploaded.txt"
            mock_uploaded.size_bytes = 512
            mock_uploaded.uri = "https://test.com/uploaded"
            mock_uploaded.create_time = None
            mock_uploaded.state.name = "ACTIVE"
            
            mock_genai.upload_file.return_value = mock_uploaded
            
            service = RAGService(mock_api_key)
            result = service.upload_file("/path/to/file.txt", "file.txt")
            
            assert result['name'] == "files/uploaded_123"
            assert result['display_name'] == "uploaded.txt"
    
    def test_upload_file_failure(self, mock_api_key):
        """Test file upload failure raises FileUploadError"""
        with patch('backend.services.rag_service.genai') as mock_genai, \
             patch('backend.services.rag_service.genai_client'):
            
            mock_genai.upload_file.side_effect = Exception("Upload failed")
            
            service = RAGService(mock_api_key)
            
            with pytest.raises(FileUploadError):
                service.upload_file("/path/to/file.txt")
