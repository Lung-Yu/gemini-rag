from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.models.schemas import FileListResponse, FileInfo, UploadResponse, DeleteResponse
from backend.services.rag_service import RAGService
import os
import tempfile

router = APIRouter(prefix="/api/files", tags=["files"])

# Initialize RAG service
API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

rag_service = RAGService(API_KEY)


@router.get("", response_model=FileListResponse)
async def list_files():
    """List all uploaded files"""
    files = rag_service.list_files()
    return FileListResponse(
        files=[FileInfo(**f) for f in files],
        count=len(files)
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a file to RAG system"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Upload to Gemini
        result = rag_service.upload_file(tmp_file_path)
        
        # Clean up temp file
        os.unlink(tmp_file_path)
        
        return UploadResponse(
            success=True,
            message="檔案上傳成功",
            file=FileInfo(**result)
        )
    except Exception as e:
        # Clean up temp file on error
        if 'tmp_file_path' in locals():
            try:
                os.unlink(tmp_file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{file_name}", response_model=DeleteResponse)
async def delete_file(file_name: str):
    """Delete a file from RAG system"""
    try:
        success = rag_service.delete_file(file_name)
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
