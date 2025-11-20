"""Startup initialization utilities"""
from typing import TYPE_CHECKING
from backend.utils.logger import get_logger
import os

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from backend.services.rag_service import RAGService
    from backend.services.document_service import DocumentService

logger = get_logger(__name__)


def initialize_app(
    db: "Session",
    rag_service: "RAGService",
    doc_service: "DocumentService"
) -> None:
    """
    Initialize application on startup
    
    Args:
        db: Database session
        rag_service: RAG service instance
        doc_service: Document service instance
    """
    # Check if files already uploaded to Gemini
    try:
        existing_files = rag_service.list_files()
        existing_docs = doc_service.list_documents()
        
        if existing_files:
            logger.info(f"Found {len(existing_files)} existing files in Gemini")
            
            # Check if documents are indexed in database
            indexed_count = len(existing_docs)
            missing_count = len(existing_files) - indexed_count
            
            if missing_count > 0:
                logger.info(f"Database has {indexed_count}/{len(existing_files)} files indexed, syncing {missing_count} missing files...")
                synced_count = doc_service.sync_gemini_files_to_db(existing_files)
                if synced_count > 0:
                    logger.info(f"Successfully synced {synced_count} files from cache")
                if synced_count < missing_count:
                    logger.warning(f"{missing_count - synced_count} files could not be synced (no cache found)")
            else:
                logger.info(f"All {indexed_count} files already indexed")
            
            # If database still empty after sync attempt, upload test-data
            if len(doc_service.list_documents()) == 0:
                logger.info("Database still empty after sync, will try uploading test-data...")
            else:
                return
        
        # Auto-upload test-data folder if it exists
        test_data_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "test-data"
        )
        
        if os.path.exists(test_data_path):
            logger.info(f"Auto-uploading test data from: {test_data_path}")
            result = rag_service.upload_folder(test_data_path)
            
            # Index uploaded files AND cache their content
            if result['uploaded_count'] > 0:
                logger.info(f"Indexing and caching {result['uploaded_count']} uploaded files...")
                
                # Setup cache directory
                cache_dir = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    '.file_cache'
                )
                os.makedirs(cache_dir, exist_ok=True)
                
                for uploaded_file in result['uploaded']:
                    try:
                        # Read file content
                        file_path = os.path.join(test_data_path, uploaded_file['display_name'])
                        if os.path.exists(file_path):
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            # Create document in database
                            doc_service.create_document(
                                gemini_file_name=uploaded_file['name'],
                                display_name=uploaded_file['display_name'],
                                content=content,
                                file_size=len(content)
                            )
                            
                            # Cache content for future sync
                            cache_file_path = os.path.join(cache_dir, f"{uploaded_file['name']}.txt")
                            os.makedirs(os.path.dirname(cache_file_path), exist_ok=True)
                            with open(cache_file_path, 'w', encoding='utf-8') as cache_f:
                                cache_f.write(content)
                            
                    except Exception as e:
                        logger.error(f"Error indexing {uploaded_file['display_name']}: {e}")
                
                logger.info(f"Successfully uploaded, indexed and cached {result['uploaded_count']} files")
                if result['failed_count'] > 0:
                    logger.warning(f"{result['failed_count']} files failed to upload")
        else:
            logger.info("No test-data folder found, skipping auto-upload")
            
    except Exception as e:
        logger.error(f"Error during startup initialization: {e}")
