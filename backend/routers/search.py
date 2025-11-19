from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.schemas import SearchRequest, SearchResponse, SearchResult
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
from backend.config import get_settings, Settings, CONTENT_PREVIEW_LENGTH

router = APIRouter(prefix="/api/search", tags=["search"])


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


@router.post("", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest,
    doc_service: DocumentService = Depends(get_document_service)
):
    """
    Search for documents using semantic similarity
    
    Returns documents ranked by relevance to the query
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    # Search using document service
    results = doc_service.search_similar_documents(
        query=request.query,
        top_k=request.top_k,
        similarity_threshold=request.similarity_threshold
    )
    
    # Format results
    search_results = [
        SearchResult(
            document_id=doc.id,
            display_name=doc.display_name,
            gemini_file_name=doc.gemini_file_name,
            content_preview=(
                doc.content[:CONTENT_PREVIEW_LENGTH] + "..." 
                if len(doc.content) > CONTENT_PREVIEW_LENGTH 
                else doc.content
            ),
            similarity_score=round(score, 4)
        )
        for doc, score in results
    ]
    
    return SearchResponse(
        success=True,
        results=search_results,
        count=len(search_results)
    )
