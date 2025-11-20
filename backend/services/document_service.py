from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional, Tuple, Any
from backend.database.models import Document, QueryLog
from backend.services.embedding_service import EmbeddingService
from backend.models.schemas import StatsResponse, QueryHistoryResponse
from backend.exceptions import DatabaseError, EmbeddingError
from backend.utils.logger import get_logger
from backend.config import CONTENT_PREVIEW_LENGTH


class DocumentService:
    """Service for managing documents with embeddings"""
    
    def __init__(self, db: Session, embedding_service: EmbeddingService):
        self.db = db
        self.embedding_service = embedding_service
        self.logger = get_logger(__name__)
    
    def create_document(
        self,
        gemini_file_name: str,
        display_name: str,
        content: str,
        file_size: Optional[int] = None
    ) -> Document:
        """
        Create a new document with embedding
        
        Args:
            gemini_file_name: Unique file name from Gemini API
            display_name: Human-readable file name
            content: File content
            file_size: File size in bytes
            
        Returns:
            Created document
            
        Raises:
            DatabaseError: If document creation fails
            EmbeddingError: If embedding generation fails
        """
        try:
            # Check if document already exists
            existing = self.db.query(Document).filter(
                Document.gemini_file_name == gemini_file_name
            ).first()
            
            if existing:
                self.logger.info(f"Document {display_name} already exists, updating...")
                return self.update_document(existing.id, content)
            
            # Generate embedding (will raise EmbeddingError if fails)
            embedding = self.embedding_service.generate_embedding(content)
            
            # Create document
            document = Document(
                gemini_file_name=gemini_file_name,
                display_name=display_name,
                content=content,
                embedding=embedding,
                file_size=file_size or len(content)
            )
            
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)
            
            self.logger.info(f"Document {display_name} indexed with embedding")
            return document
        
        except EmbeddingError:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            self.logger.error(f"Error creating document {display_name}: {e}", exc_info=True)
            raise DatabaseError(f"Failed to create document: {e}")
    
    def update_document(self, document_id: int, content: str) -> Document:
        """
        Update document content and regenerate embedding
        
        Raises:
            DatabaseError: If document not found or update fails
            EmbeddingError: If embedding generation fails
        """
        try:
            document = self.db.query(Document).filter(Document.id == document_id).first()
            
            if not document:
                raise DatabaseError(f"Document with id {document_id} not found")
            
            # Generate new embedding (will raise EmbeddingError if fails)
            embedding = self.embedding_service.generate_embedding(content)
            
            document.content = content
            document.embedding = embedding
            document.file_size = len(content)
            
            self.db.commit()
            self.db.refresh(document)
            
            self.logger.info(f"Updated document {document.display_name}")
            return document
        
        except (DatabaseError, EmbeddingError):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            self.logger.error(f"Error updating document {document_id}: {e}", exc_info=True)
            raise DatabaseError(f"Failed to update document: {e}")
    
    def delete_document(self, gemini_file_name: str) -> bool:
        """Delete document by Gemini file name"""
        try:
            document = self.db.query(Document).filter(
                Document.gemini_file_name == gemini_file_name
            ).first()
            
            if document:
                self.db.delete(document)
                self.db.commit()
                self.logger.info(f"Deleted document: {gemini_file_name}")
                return True
            
            return False
        
        except Exception as e:
            self.db.rollback()
            self.logger.error(f"Error deleting document {gemini_file_name}: {e}", exc_info=True)
            return False
    
    def get_document_by_name(self, gemini_file_name: str) -> Optional[Document]:
        """Get document by Gemini file name"""
        return self.db.query(Document).filter(
            Document.gemini_file_name == gemini_file_name
        ).first()
    
    def get_document_by_gemini_name(self, gemini_file_name: str) -> Optional[Document]:
        """Alias for get_document_by_name"""
        return self.get_document_by_name(gemini_file_name)
    
    def get_document_count(self) -> int:
        """Get total number of documents"""
        return self.db.query(func.count(Document.id)).scalar() or 0
    
    def list_documents(self, limit: int = 100, offset: int = 0) -> List[Document]:
        """List all documents with pagination"""
        return self.db.query(Document).offset(offset).limit(limit).all()
    
    def search_similar_documents(
        self,
        query: str,
        top_k: Optional[int] = 5,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[Document, float]]:
        """
        Search for documents similar to query using vector similarity
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of (document, similarity_score) tuples
            
        Raises:
            EmbeddingError: If query embedding generation fails
            DatabaseError: If search fails
        """
        try:
            # Generate query embedding (will raise EmbeddingError if fails)
            query_embedding = self.embedding_service.generate_query_embedding(query)
            
            # Perform vector similarity search using pgvector
            # Using cosine distance (1 - cosine similarity)
            query_builder = self.db.query(
                Document,
                (1 - Document.embedding.cosine_distance(query_embedding)).label('similarity')
            ).filter(
                Document.embedding.isnot(None)
            ).order_by(
                text('similarity DESC')
            )
            
            # Apply limit only if top_k is specified (not None)
            if top_k is not None:
                results = query_builder.limit(top_k).all()
            else:
                # No limit - return all matching documents
                results = query_builder.all()
            
            # Filter by similarity threshold (if threshold > 0, otherwise return all)
            if similarity_threshold > 0:
                filtered_results = [
                    (doc, float(sim)) for doc, sim in results 
                    if float(sim) >= similarity_threshold
                ]
            else:
                # No filtering - return all results sorted by similarity
                filtered_results = [(doc, float(sim)) for doc, sim in results]
            
            self.logger.info(f"Search found {len(filtered_results)} results for query (threshold: {similarity_threshold})")
            return filtered_results
        
        except EmbeddingError:
            raise
        except Exception as e:
            self.logger.error(f"Error searching documents: {e}", exc_info=True)
            raise DatabaseError(f"Failed to search documents: {e}")
    
    def log_query(
        self,
        query: str,
        model_used: str,
        files_used: int = 0,
        selected_files: Optional[List[str]] = None,
        system_prompt_used: Optional[str] = None,
        response_length: Optional[int] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> QueryLog:
        """
        Log a query for usage statistics
        
        Raises:
            DatabaseError: If logging fails
        """
        try:
            log = QueryLog(
                query=query,
                model_used=model_used,
                files_used=files_used,
                selected_files=selected_files or [],
                system_prompt_used=system_prompt_used,
                response_length=response_length,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                success=success,
                error_message=error_message
            )
            
            self.db.add(log)
            self.db.commit()
            self.db.refresh(log)
            
            return log
        
        except Exception as e:
            self.db.rollback()
            self.logger.error(f"Error logging query: {e}", exc_info=True)
            raise DatabaseError(f"Failed to log query: {e}")
    
    def get_query_stats(self) -> StatsResponse:
        """
        Get query usage statistics
        
        Returns:
            StatsResponse with usage statistics
            
        Raises:
            DatabaseError: If stats retrieval fails
        """
        try:
            total_queries = self.db.query(func.count(QueryLog.id)).scalar()
            
            # Model usage stats
            model_stats = self.db.query(
                QueryLog.model_used,
                func.count(QueryLog.id).label('count')
            ).group_by(QueryLog.model_used).all()
            
            # Success rate
            successful = self.db.query(func.count(QueryLog.id)).filter(
                QueryLog.success == True
            ).scalar()
            
            # Average files used
            avg_files = self.db.query(func.avg(QueryLog.files_used)).scalar()
            
            # Token usage stats (only count queries with token data)
            total_tokens = self.db.query(func.sum(QueryLog.total_tokens)).filter(
                QueryLog.total_tokens.isnot(None)
            ).scalar()
            
            avg_tokens = self.db.query(func.avg(QueryLog.total_tokens)).filter(
                QueryLog.total_tokens.isnot(None)
            ).scalar()
            
            return StatsResponse(
                total_queries=total_queries or 0,
                successful_queries=successful or 0,
                success_rate=(successful / total_queries * 100) if total_queries > 0 else 0,
                model_usage={model: count for model, count in model_stats},
                avg_files_used=float(avg_files) if avg_files else 0,
                total_tokens_used=int(total_tokens) if total_tokens else 0,
                avg_tokens_per_query=float(avg_tokens) if avg_tokens else 0
            )
        
        except Exception as e:
            self.logger.error(f"Error getting stats: {e}", exc_info=True)
            raise DatabaseError(f"Failed to get query stats: {e}")
    
    def get_query_history(
        self,
        page: int = 1,
        page_size: int = 50,
        order_by: str = 'desc'
    ) -> QueryHistoryResponse:
        """
        Get query history with pagination
        
        Returns:
            QueryHistoryResponse with paginated history
            
        Raises:
            DatabaseError: If history retrieval fails
        """
        try:
            offset = (page - 1) * page_size
            
            # Get total count
            total = self.db.query(func.count(QueryLog.id)).scalar()
            
            # Get paginated history
            query = self.db.query(QueryLog)
            
            if order_by == 'desc':
                query = query.order_by(QueryLog.created_at.desc())
            else:
                query = query.order_by(QueryLog.created_at.asc())
            
            history = query.offset(offset).limit(page_size).all()
            
            return QueryHistoryResponse(
                history=[log.to_dict() for log in history],
                total=total or 0,
                page=page,
                page_size=page_size
            )
        
        except Exception as e:
            self.logger.error(f"Error getting query history: {e}", exc_info=True)
            raise DatabaseError(f"Failed to get query history: {e}")
    
    def sync_gemini_files_to_db(self, gemini_files: List[Any]) -> int:
        """
        Sync Gemini files to database
        
        Args:
            gemini_files: List of Gemini file objects or dicts
            
        Returns:
            Number of files synced
        """
        synced_count = 0
        
        # Get cache directory path
        import os
        cache_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            '.file_cache'
        )
        
        for file in gemini_files:
            try:
                # Handle both dict and object formats
                if isinstance(file, dict):
                    file_name = file.get('name')
                    display_name = file.get('display_name')
                    file_size = file.get('size_bytes', 0)
                else:
                    file_name = file.name
                    display_name = file.display_name
                    file_size = getattr(file, 'size_bytes', 0)
                
                # Check if already indexed
                existing = self.get_document_by_name(file_name)
                if existing:
                    self.logger.debug(f"File {display_name} already indexed, skipping")
                    continue
                
                # Try to read from cache
                cache_file_path = os.path.join(cache_dir, f"{file_name}.txt")
                if os.path.exists(cache_file_path):
                    try:
                        with open(cache_file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        # Create document with cached content
                        self.create_document(
                            gemini_file_name=file_name,
                            display_name=display_name,
                            content=content,
                            file_size=file_size
                        )
                        synced_count += 1
                        self.logger.info(f"Synced {display_name} from cache")
                        continue
                    except Exception as cache_error:
                        self.logger.warning(f"Failed to read cache for {display_name}: {cache_error}")
                
                # Gemini API doesn't provide file content download
                self.logger.warning(
                    f"File {display_name} not indexed (content not available, no cache found)"
                )
                
            except Exception as e:
                self.logger.error(f"Error syncing file {display_name}: {e}")
        
        return synced_count
