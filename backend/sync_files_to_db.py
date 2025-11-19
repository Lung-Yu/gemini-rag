#!/usr/bin/env python3
"""
Sync files from Gemini API to PostgreSQL database
"""

import sys
from backend.config import get_settings
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db_context
from backend.utils.logger import get_logger

logger = get_logger(__name__)


def main():
    # Setup configuration
    try:
        settings = get_settings()
    except Exception as e:
        logger.error(f"Failed to load settings: {e}")
        print("❌ Failed to load configuration")
        sys.exit(1)
    
    # Setup services and database
    try:
        with get_db_context() as db:
            rag_service = RAGService(settings.GOOGLE_API_KEY)
            embedding_service = EmbeddingService(settings.GOOGLE_API_KEY)
            doc_service = DocumentService(db, embedding_service)
    
            # Get all files from Gemini
            gemini_files = rag_service.list_files()
            logger.info(f"Found {len(gemini_files)} Gemini files")
            print(f"📁 Found {len(gemini_files)} Gemini files")
            
            # Check existing files in database
            existing_count = doc_service.get_document_count()
            logger.info(f"Database has {existing_count} documents")
            print(f"💾 Database has {existing_count} documents")
            
            # Use document service to sync files
            synced_count = doc_service.sync_gemini_files_to_db(gemini_files)
            
            print(f"\n📊 Sync completed:")
            print(f"   ✅ Synced: {synced_count}")
            print(f"   📁 Total: {len(gemini_files)}")
            logger.info(f"Sync completed: {synced_count}/{len(gemini_files)} files")
            
    except Exception as e:
        logger.error(f"Error during sync process: {e}", exc_info=True)
        print(f"❌ Sync process error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
