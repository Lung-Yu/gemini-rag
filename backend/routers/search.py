from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.schemas import SearchRequest, SearchResponse, SearchResult
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
import os

router = APIRouter(prefix="/api/search", tags=["search"])

# Initialize services
API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

embedding_service = EmbeddingService()


@router.post("", response_model=SearchResponse)
async def search_documents(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Search for documents using semantic similarity
    
    Returns documents ranked by relevance to the query
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="搜尋查詢不能為空")
    
    # Search using document service
    doc_service = DocumentService(db, embedding_service)
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
            content_preview=doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
            similarity_score=round(score, 4)
        )
        for doc, score in results
    ]
    
    return SearchResponse(
        success=True,
        results=search_results,
        count=len(search_results)
    )
