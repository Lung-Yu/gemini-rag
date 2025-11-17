from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.models.schemas import StatsResponse
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
import os

router = APIRouter(prefix="/api/stats", tags=["statistics"])

# Initialize services
API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

embedding_service = EmbeddingService()


@router.get("", response_model=StatsResponse)
async def get_statistics(db: Session = Depends(get_db)):
    """
    Get usage statistics
    
    Returns query counts, model usage, and other metrics
    """
    doc_service = DocumentService(db, embedding_service)
    stats = doc_service.get_query_stats()
    
    return StatsResponse(**stats)
