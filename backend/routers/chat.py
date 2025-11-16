from fastapi import APIRouter, HTTPException
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services.rag_service import RAGService
import os

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize RAG service
API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

rag_service = RAGService(API_KEY)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get RAG-based response"""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="訊息不能為空")
    
    result = rag_service.query(request.message)
    
    if not result["success"] and result.get("error_type") == "rate_limit":
        raise HTTPException(status_code=429, detail=result["message"])
    
    return ChatResponse(**result)
