from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import chat, files
from backend.models.schemas import HealthResponse
from backend.services.rag_service import RAGService
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Gemini RAG Chat API",
    description="RAG-based chat API using Google Gemini",
    version="1.0.0"
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


@app.on_event("startup")
async def startup_event():
    """Initialize on startup - auto-upload test data"""
    API_KEY = os.environ.get('GOOGLE_API_KEY')
    if not API_KEY:
        print("⚠️  警告: GOOGLE_API_KEY 環境變數未設定")
        return
    
    print(f"✓ API Key 已載入: {API_KEY[:10]}...")
    
    # Auto-upload test-data folder if it exists
    test_data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test-data")
    if os.path.exists(test_data_path):
        try:
            rag_service = RAGService(API_KEY)
            
            # Check if files already uploaded
            existing_files = rag_service.list_files()
            if existing_files:
                print(f"✓ 已有 {len(existing_files)} 個檔案上傳，跳過自動上傳")
                return
            
            print(f"📁 自動上傳測試資料從: {test_data_path}")
            result = rag_service.upload_folder(test_data_path)
            print(f"✓ 成功上傳 {result['uploaded_count']} 個檔案")
            if result['failed_count'] > 0:
                print(f"⚠️  {result['failed_count']} 個檔案上傳失敗")
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
