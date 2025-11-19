from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.models.schemas import FileListResponse, FileInfo, UploadResponse, DeleteResponse
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
from backend.config import get_settings, Settings
from backend.utils.logger import get_logger
import os
import tempfile

router = APIRouter(prefix="/api/files", tags=["files"])
logger = get_logger(__name__)


# Dependency functions
def get_rag_service(settings: Settings = Depends(get_settings)) -> RAGService:
    """Get RAG service instance"""
    return RAGService(settings.GOOGLE_API_KEY)


def get_embedding_service(settings: Settings = Depends(get_settings)) -> EmbeddingService:
    """Get embedding service instance"""
    return EmbeddingService(settings.GOOGLE_API_KEY)


def get_document_service(
    db: Session = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
) -> DocumentService:
    """Get document service instance"""
    return DocumentService(db, embedding_service)


@router.get("", response_model=FileListResponse)
async def list_files(rag_service: RAGService = Depends(get_rag_service)):
    """List all uploaded files"""
    files = rag_service.list_files()
    return FileListResponse(
        files=[FileInfo(**f) for f in files],
        count=len(files)
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    rag_service: RAGService = Depends(get_rag_service),
    doc_service: DocumentService = Depends(get_document_service)
):
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
        result = rag_service.upload_file(tmp_file_path, display_name=file.filename)
        
        # Index document in database with embedding
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
            message="File uploaded and indexed successfully",
            file=FileInfo(**result)
        )
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_name}", response_model=DeleteResponse)
async def delete_file(
    file_name: str,
    rag_service: RAGService = Depends(get_rag_service),
    doc_service: DocumentService = Depends(get_document_service)
):
    """Delete a file from RAG system and database"""
    try:
        # Delete from Gemini
        success = rag_service.delete_file(file_name)
        
        # Delete from database
        doc_service.delete_document(file_name)
        
        if success:
            return DeleteResponse(success=True, message="File deleted successfully")
        else:
            raise HTTPException(status_code=404, detail="找不到指定的檔案")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("", response_model=DeleteResponse)
async def clear_all_files(rag_service: RAGService = Depends(get_rag_service)):
    """Clear all uploaded files"""
    try:
        count = rag_service.clear_all_files()
        return DeleteResponse(
            success=True,
            message=f"Deleted {count} files"
        )
    except Exception as e:
        logger.error(f"Error clearing files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync", response_model=dict)
async def sync_files(
    rag_service: RAGService = Depends(get_rag_service),
    doc_service: DocumentService = Depends(get_document_service)
):
    """Sync files from Gemini API to PostgreSQL database"""
    try:
        # Get all files from Gemini
        gemini_files = rag_service.list_files()
        
        # Use document service to sync files
        synced_count = doc_service.sync_gemini_files_to_db(gemini_files)
        
        return {
            "success": True,
            "message": "Files synced successfully",
            "synced": synced_count,
            "total": len(gemini_files)
        }
        
    except Exception as e:
        logger.error(f"Error syncing files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
