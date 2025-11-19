"""Tests for DocumentService"""
import pytest
from unittest.mock import Mock, patch
from backend.services.document_service import DocumentService
from backend.services.embedding_service import EmbeddingService
from backend.exceptions import DatabaseError, EmbeddingError
from backend.database.models import Document


class TestDocumentService:
    """Test cases for DocumentService"""
    
    @pytest.fixture
    def mock_embedding_service(self, mock_api_key, sample_embedding):
        """Mock embedding service fixture"""
        with patch('backend.services.embedding_service.genai'):
            service = Mock(spec=EmbeddingService)
            service.generate_embedding.return_value = sample_embedding
            service.generate_query_embedding.return_value = sample_embedding
            return service
    
    def test_create_document_success(
        self, 
        mock_db_session, 
        mock_embedding_service, 
        sample_document_data,
        sample_embedding
    ):
        """Test successful document creation"""
        # Mock query to return no existing document
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        service = DocumentService(mock_db_session, mock_embedding_service)
        
        result = service.create_document(**sample_document_data)
        
        # Verify embedding was generated
        mock_embedding_service.generate_embedding.assert_called_once_with(
            sample_document_data['content']
        )
        
        # Verify document was added and committed
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
    
    def test_create_document_embedding_failure(
        self,
        mock_db_session,
        mock_embedding_service,
        sample_document_data
    ):
        """Test document creation when embedding fails"""
        # Mock query to return no existing document
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        # Mock embedding service to raise error
        mock_embedding_service.generate_embedding.side_effect = EmbeddingError("Embedding failed")
        
        service = DocumentService(mock_db_session, mock_embedding_service)
        
        with pytest.raises(EmbeddingError):
            service.create_document(**sample_document_data)
        
        # Verify rollback was called
        mock_db_session.rollback.assert_called_once()
    
    def test_delete_document_success(self, mock_db_session, mock_embedding_service):
        """Test successful document deletion"""
        # Mock existing document
        mock_doc = Mock(spec=Document)
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_doc
        
        service = DocumentService(mock_db_session, mock_embedding_service)
        result = service.delete_document("files/test_123")
        
        assert result is True
        mock_db_session.delete.assert_called_once_with(mock_doc)
        mock_db_session.commit.assert_called_once()
    
    def test_delete_document_not_found(self, mock_db_session, mock_embedding_service):
        """Test document deletion when document not found"""
        # Mock no document found
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        service = DocumentService(mock_db_session, mock_embedding_service)
        result = service.delete_document("files/nonexistent")
        
        assert result is False
        mock_db_session.delete.assert_not_called()
    
    def test_get_document_count(self, mock_db_session, mock_embedding_service):
        """Test getting document count"""
        mock_db_session.query.return_value.scalar.return_value = 5
        
        service = DocumentService(mock_db_session, mock_embedding_service)
        count = service.get_document_count()
        
        assert count == 5
    
    def test_list_documents(self, mock_db_session, mock_embedding_service):
        """Test listing documents with pagination"""
        mock_docs = [Mock(spec=Document) for _ in range(3)]
        mock_db_session.query.return_value.offset.return_value.limit.return_value.all.return_value = mock_docs
        
        service = DocumentService(mock_db_session, mock_embedding_service)
        results = service.list_documents(limit=10, offset=0)
        
        assert len(results) == 3
