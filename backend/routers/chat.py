from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.models.schemas import ChatRequest, ChatResponse, ModelsResponse, ModelInfo
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
import os

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize services - now using global instances
from backend.services.rag_service import rag_service

API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

embedding_service = EmbeddingService()


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Send a message and get RAG-based response with model selection"""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="訊息不能為空")
    
    # Query with specified model and files
    result = rag_service.query(
        prompt=request.message,
        model_name=request.model,
        selected_file_names=request.selected_files
    )
    
    # Log the query
    doc_service = DocumentService(db, embedding_service)
    doc_service.log_query(
        query=request.message,
        model_used=result.get("model_used", request.model),
        files_used=result.get("files_used", 0),
        selected_files=request.selected_files,
        response_length=len(result.get("response", "")) if result.get("response") else 0,
        success=result["success"],
        error_message=result.get("message") if not result["success"] else None
    )
    
    if not result["success"] and result.get("error_type") == "rate_limit":
        raise HTTPException(status_code=429, detail=result["message"])
    
    return ChatResponse(**result)


@router.get("/models", response_model=ModelsResponse)
async def get_available_models():
    """Get list of available Gemini models"""
    models = rag_service.get_available_models()
    
    model_list = [
        ModelInfo(
            model_id=model["model_id"],
            name=model["name"],
            description=model["description"]
        )
        for model in models
    ]
    
    return ModelsResponse(models=model_list)
