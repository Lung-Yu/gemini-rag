"""Script to clear all Gemini files and re-upload from test-data"""
import sys
import os

# Add backend to path
sys.path.insert(0, '/app')

from backend.services.rag_service import RAGService
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Get API key
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    logger.error("GOOGLE_API_KEY not found")
    sys.exit(1)

# Initialize service
rag_service = RAGService(api_key=api_key)

# Get all files
files = rag_service.list_files()
logger.info(f"Found {len(files)} files in Gemini, deleting...")

# Delete all files
deleted_count = 0
for file in files:
    try:
        rag_service.delete_file(file['name'])
        deleted_count += 1
        logger.info(f"Deleted: {file['display_name']}")
    except Exception as e:
        logger.error(f"Failed to delete {file['display_name']}: {e}")

logger.info(f"Successfully deleted {deleted_count}/{len(files)} files")
logger.info("Restart the backend container to trigger auto-upload from test-data")
