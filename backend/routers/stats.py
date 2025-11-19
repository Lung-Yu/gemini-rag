from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.models.schemas import StatsResponse, QueryHistoryResponse
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
from backend.config import get_settings, Settings

router = APIRouter(prefix="/api/stats", tags=["statistics"])


# Dependency functions
def get_embedding_service(settings: Settings = Depends(get_settings)) -> EmbeddingService:
    """Get embedding service instance"""
    return EmbeddingService(settings.GOOGLE_API_KEY)


def get_document_service(
    db: Session = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
) -> DocumentService:
    """Get document service instance"""
    return DocumentService(db, embedding_service)


@router.get("", response_model=StatsResponse)
async def get_statistics(doc_service: DocumentService = Depends(get_document_service)):
    """
    Get usage statistics
    
    Returns query counts, model usage, and other metrics
    """
    return doc_service.get_query_stats()


@router.get("/history", response_model=QueryHistoryResponse)
async def get_query_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    order: str = Query('desc', regex='^(asc|desc)$', description="Sort order"),
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Get query history with pagination
    
    Returns list of previous queries with token usage details
    """
    return doc_service.get_query_history(page=page, page_size=page_size, order_by=order)
