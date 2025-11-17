from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import chat, files, search, stats
from backend.models.schemas import HealthResponse
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db, init_db
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

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

# Include routers
app.include_router(chat.router)
app.include_router(files.router)
app.include_router(search.router)
app.include_router(stats.router)


@app.on_event("startup")
async def startup_event():
    """Initialize on startup - database and auto-upload test data"""
    API_KEY = os.environ.get('GOOGLE_API_KEY')
    if not API_KEY:
        print("⚠️  警告: GOOGLE_API_KEY 環境變數未設定")
        return
    
    print(f"✓ API Key 已載入: {API_KEY[:10]}...")
    
    # Initialize database
    try:
        init_db()
        print("✓ 資料庫初始化完成")
    except Exception as e:
        print(f"⚠️  資料庫初始化錯誤: {e}")
    
    # Auto-upload and index test-data folder if it exists
    test_data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test-data")
    if os.path.exists(test_data_path):
        try:
            rag_service = RAGService(API_KEY)
            embedding_service = EmbeddingService(API_KEY)
            
            # Check if files already uploaded to Gemini
            existing_files = rag_service.list_files()
            
            # Get database session
            db = next(get_db())
            doc_service = DocumentService(db, embedding_service)
            
            if existing_files:
                print(f"✓ 已有 {len(existing_files)} 個檔案在 Gemini")
                
                # Check if documents are indexed in database
                existing_docs = doc_service.list_documents()
                if len(existing_docs) < len(existing_files):
                    print(f"📊 索引現有檔案到資料庫...")
                    
                    # Index existing files
                    for file in existing_files:
                        try:
                            # Check if already indexed
                            if not doc_service.get_document_by_name(file.name):
                                # Download content (if possible) and index
                                # For now, skip as we can't easily get content from Gemini
                                print(f"⚠️  檔案 {file.display_name} 未索引（需重新上傳以建立索引）")
                        except Exception as e:
                            print(f"⚠️  索引 {file.display_name} 時發生錯誤: {e}")
                else:
                    print(f"✓ 所有檔案已索引")
                
                db.close()
                return
            
            print(f"📁 自動上傳並索引測試資料從: {test_data_path}")
            result = rag_service.upload_folder(test_data_path)
            
            # Index uploaded files
            if result['uploaded_count'] > 0:
                print(f"📊 正在為 {result['uploaded_count']} 個檔案建立索引...")
                
                for uploaded_file in result['uploaded']:
                    try:
                        # Read file content
                        file_path = os.path.join(test_data_path, uploaded_file['display_name'])
                        if os.path.exists(file_path):
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            doc_service.create_document(
                                gemini_file_name=uploaded_file['name'],
                                display_name=uploaded_file['display_name'],
                                content=content,
                                file_size=len(content)
                            )
                    except Exception as e:
                        print(f"⚠️  索引 {uploaded_file['display_name']} 時發生錯誤: {e}")
            
            print(f"✓ 成功上傳並索引 {result['uploaded_count']} 個檔案")
            if result['failed_count'] > 0:
                print(f"⚠️  {result['failed_count']} 個檔案上傳失敗")
            
            db.close()
        except Exception as e:
            print(f"⚠️  自動上傳錯誤: {e}")


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    API_KEY = os.environ.get('GOOGLE_API_KEY')
    
    files_count = 0
    if API_KEY:
        try:
            rag_service = RAGService(API_KEY)
            files_count = len(rag_service.list_files())
        except:
            pass
    
    return HealthResponse(
        status="healthy",
        api_configured=bool(API_KEY),
        uploaded_files_count=files_count
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
