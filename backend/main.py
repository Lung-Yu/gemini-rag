from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.routers import chat, files, search, stats
from backend.models.schemas import HealthResponse, ErrorResponse
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db_context, init_db
from backend.config import get_settings
from backend.exceptions import (
    ServiceException,
    EmbeddingError,
    DatabaseError,
    ModelValidationError,
    FileUploadError
)
from backend.utils.logger import get_logger
from backend.utils.startup import initialize_app
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

app = FastAPI(
    title="Gemini RAG Chat API",
    description="RAG-based chat API with multi-model support and semantic search",
    version="2.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(EmbeddingError)
async def embedding_error_handler(request: Request, exc: EmbeddingError):
    """Handle embedding generation errors"""
    logger.error(f"Embedding error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": "embedding_error"}
    )


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    """Handle database operation errors"""
    logger.error(f"Database error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": "database_error"}
    )


@app.exception_handler(ModelValidationError)
async def model_validation_error_handler(request: Request, exc: ModelValidationError):
    """Handle model validation errors"""
    logger.warning(f"Model validation error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": "model_validation_error"}
    )


@app.exception_handler(FileUploadError)
async def file_upload_error_handler(request: Request, exc: FileUploadError):
    """Handle file upload errors"""
    logger.error(f"File upload error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": "file_upload_error"}
    )


@app.exception_handler(ServiceException)
async def service_exception_handler(request: Request, exc: ServiceException):
    """Handle generic service exceptions"""
    logger.error(f"Service error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_type": "service_error"}
    )


# Include routers
app.include_router(chat.router)
app.include_router(files.router)
app.include_router(search.router)
app.include_router(stats.router)


@app.on_event("startup")
async def startup_event():
    """Initialize on startup - database and auto-upload test data"""
    try:
        settings = get_settings()
        logger.info(f"API Key loaded: {settings.GOOGLE_API_KEY[:10]}...")
        
        # Initialize database
        try:
            init_db()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization error: {e}", exc_info=True)
            return
        
        # Initialize services and run startup tasks
        try:
            with get_db_context() as db:
                rag_service = RAGService(settings.GOOGLE_API_KEY)
                embedding_service = EmbeddingService(settings.GOOGLE_API_KEY)
                doc_service = DocumentService(db, embedding_service)
                
                initialize_app(db, rag_service, doc_service)
        except Exception as e:
            logger.error(f"Startup initialization error: {e}", exc_info=True)
            
    except Exception as e:
        logger.error(f"Fatal startup error: {e}", exc_info=True)


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        settings = get_settings()
        api_configured = bool(settings.GOOGLE_API_KEY)
        
        files_count = 0
        try:
            rag_service = RAGService(settings.GOOGLE_API_KEY)
            files_count = len(rag_service.list_files())
        except Exception as e:
            logger.warning(f"Could not get file count: {e}")
        
        return HealthResponse(
            status="healthy",
            api_configured=api_configured,
            uploaded_files_count=files_count
        )
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthResponse(
            status="unhealthy",
            api_configured=False,
            uploaded_files_count=0
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
