from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.models.schemas import FileListResponse, FileInfo, UploadResponse, DeleteResponse
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
import os
import tempfile

router = APIRouter(prefix="/api/files", tags=["files"])

# Initialize services - now using global instances
from backend.services.rag_service import rag_service

API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

embedding_service = EmbeddingService()


@router.get("", response_model=FileListResponse)
async def list_files():
    """List all uploaded files"""
    files = rag_service.list_files()
    return FileListResponse(
        files=[FileInfo(**f) for f in files],
        count=len(files)
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a file to RAG system and index it"""
    try:
        # Read file content
        content = await file.read()
        content_text = content.decode('utf-8', errors='ignore')
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Upload to Gemini
        result = rag_service.upload_file(tmp_file_path)
        
        # Index document in database with embedding
        doc_service = DocumentService(db, embedding_service)
        doc_service.create_document(
            gemini_file_name=result['name'],
            display_name=result['display_name'],
            content=content_text,
            file_size=len(content)
        )
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        return UploadResponse(
            success=True,
            message="檔案上傳並索引成功",
            file_name=result['name']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_name}", response_model=DeleteResponse)
async def delete_file(file_name: str, db: Session = Depends(get_db)):
    """Delete a file from RAG system and database"""
    try:
        # Delete from Gemini
        success = rag_service.delete_file(file_name)
        
        # Delete from database
        doc_service = DocumentService(db, embedding_service)
        doc_service.delete_document(file_name)
        
        if success:
            return DeleteResponse(success=True, message="檔案已刪除")
        else:
            raise HTTPException(status_code=404, detail="找不到指定的檔案")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("", response_model=DeleteResponse)
async def clear_all_files():
    """Clear all uploaded files"""
    try:
        count = rag_service.clear_all_files()
        return DeleteResponse(
            success=True,
            message=f"已刪除 {count} 個檔案"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
