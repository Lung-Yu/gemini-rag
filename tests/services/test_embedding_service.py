"""Tests for EmbeddingService"""
import pytest
from unittest.mock import patch, Mock
from backend.services.embedding_service import EmbeddingService
from backend.exceptions import EmbeddingError


class TestEmbeddingService:
    """Test cases for EmbeddingService"""
    
    def test_init_with_valid_api_key(self, mock_api_key):
        """Test EmbeddingService initialization with valid API key"""
        with patch('backend.services.embedding_service.genai') as mock_genai:
            service = EmbeddingService(mock_api_key)
            
            assert service.api_key == mock_api_key
            mock_genai.configure.assert_called_once_with(api_key=mock_api_key)
    
    def test_init_without_api_key(self):
        """Test EmbeddingService initialization without API key"""
        with pytest.raises(ValueError, match="API key is required"):
            EmbeddingService("")
    
    def test_generate_embedding_success(self, mock_api_key, sample_embedding):
        """Test successful embedding generation"""
        with patch('backend.services.embedding_service.genai') as mock_genai:
            mock_genai.embed_content.return_value = {'embedding': sample_embedding}
            
            service = EmbeddingService(mock_api_key)
            result = service.generate_embedding("test text")
            
            assert result == sample_embedding
            assert len(result) == 768
    
    def test_generate_embedding_failure(self, mock_api_key):
        """Test embedding generation failure raises EmbeddingError"""
        with patch('backend.services.embedding_service.genai') as mock_genai:
            mock_genai.embed_content.side_effect = Exception("API error")
            
            service = EmbeddingService(mock_api_key)
            
            with pytest.raises(EmbeddingError):
                service.generate_embedding("test text")
    
    def test_generate_query_embedding_success(self, mock_api_key, sample_embedding):
        """Test successful query embedding generation"""
        with patch('backend.services.embedding_service.genai') as mock_genai:
            mock_genai.embed_content.return_value = {'embedding': sample_embedding}
            
            service = EmbeddingService(mock_api_key)
            result = service.generate_query_embedding("test query")
            
            assert result == sample_embedding
            mock_genai.embed_content.assert_called_once()
            
            # Verify task_type is 'retrieval_query' for queries
            call_args = mock_genai.embed_content.call_args
            assert call_args[1]['task_type'] == 'retrieval_query'
    
    def test_cosine_similarity(self, mock_api_key):
        """Test cosine similarity calculation"""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        vec3 = [1.0, 0.0, 0.0]
        
        # Perpendicular vectors should have similarity ~0
        similarity_perpendicular = EmbeddingService.cosine_similarity(vec1, vec2)
        assert abs(similarity_perpendicular) < 0.01
        
        # Identical vectors should have similarity 1.0
        similarity_identical = EmbeddingService.cosine_similarity(vec1, vec3)
        assert abs(similarity_identical - 1.0) < 0.01
