from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional, Tuple
from backend.database.models import Document, QueryLog
from backend.services.embedding_service import EmbeddingService


class DocumentService:
    """Service for managing documents with embeddings"""
    
    def __init__(self, db: Session, embedding_service: EmbeddingService):
        self.db = db
        self.embedding_service = embedding_service
    
    def create_document(
        self,
        gemini_file_name: str,
        display_name: str,
        content: str,
        file_size: Optional[int] = None
    ) -> Optional[Document]:
        """
        Create a new document with embedding
        
        Args:
            gemini_file_name: Unique file name from Gemini API
            display_name: Human-readable file name
            content: File content
            file_size: File size in bytes
            
        Returns:
            Created document or None if failed
        """
        try:
            # Check if document already exists
            existing = self.db.query(Document).filter(
                Document.gemini_file_name == gemini_file_name
            ).first()
            
            if existing:
                print(f"⚠️  Document {display_name} already exists, updating...")
                return self.update_document(existing.id, content)
            
            # Generate embedding
            embedding = self.embedding_service.generate_embedding(content)
            
            if embedding is None:
                print(f"❌ Failed to generate embedding for {display_name}")
                return None
            
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
            
            print(f"✓ Document {display_name} indexed with embedding")
            return document
        
        except Exception as e:
            self.db.rollback()
            print(f"❌ Error creating document: {e}")
            return None
    
    def update_document(self, document_id: int, content: str) -> Optional[Document]:
        """Update document content and regenerate embedding"""
        try:
            document = self.db.query(Document).filter(Document.id == document_id).first()
            
            if not document:
                return None
            
            # Generate new embedding
            embedding = self.embedding_service.generate_embedding(content)
            
            if embedding is None:
                return None
            
            document.content = content
            document.embedding = embedding
            document.file_size = len(content)
            
            self.db.commit()
            self.db.refresh(document)
            
            return document
        
        except Exception as e:
            self.db.rollback()
            print(f"❌ Error updating document: {e}")
            return None
    
    def delete_document(self, gemini_file_name: str) -> bool:
        """Delete document by Gemini file name"""
        try:
            document = self.db.query(Document).filter(
                Document.gemini_file_name == gemini_file_name
            ).first()
            
            if document:
                self.db.delete(document)
                self.db.commit()
                return True
            
            return False
        
        except Exception as e:
            self.db.rollback()
            print(f"❌ Error deleting document: {e}")
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
        top_k: int = 5,
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
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.generate_query_embedding(query)
            
            if query_embedding is None:
                return []
            
            # Perform vector similarity search using pgvector
            # Using cosine distance (1 - cosine similarity)
            results = self.db.query(
                Document,
                (1 - Document.embedding.cosine_distance(query_embedding)).label('similarity')
            ).filter(
                Document.embedding.isnot(None)
            ).order_by(
                text('similarity DESC')
            ).limit(top_k).all()
            
            # Filter by similarity threshold
            filtered_results = [
                (doc, float(sim)) for doc, sim in results 
                if float(sim) >= similarity_threshold
            ]
            
            return filtered_results
        
        except Exception as e:
            print(f"❌ Error searching documents: {e}")
            return []
    
    def log_query(
        self,
        query: str,
        model_used: str,
        files_used: int = 0,
        selected_files: Optional[List[str]] = None,
        system_prompt_used: Optional[str] = None,
        response_length: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> Optional[QueryLog]:
        """Log a query for usage statistics"""
        try:
            log = QueryLog(
                query=query,
                model_used=model_used,
                files_used=files_used,
                selected_files=selected_files or [],
                system_prompt_used=system_prompt_used,
                response_length=response_length,
                success=success,
                error_message=error_message
            )
            
            self.db.add(log)
            self.db.commit()
            self.db.refresh(log)
            
            return log
        
        except Exception as e:
            self.db.rollback()
            print(f"❌ Error logging query: {e}")
            return None
    
    def get_query_stats(self) -> dict:
        """Get query usage statistics"""
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
            
            return {
                'total_queries': total_queries or 0,
                'successful_queries': successful or 0,
                'success_rate': (successful / total_queries * 100) if total_queries > 0 else 0,
                'model_usage': {model: count for model, count in model_stats},
                'avg_files_used': float(avg_files) if avg_files else 0
            }
        
        except Exception as e:
            print(f"❌ Error getting stats: {e}")
            return {}
