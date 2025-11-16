#!/bin/bash

echo "🚀 啟動 Gemini RAG Chat Application (本地開發模式)"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ 錯誤: .env 檔案不存在"
    echo "請先建立 .env 檔案:"
    echo "  cp .env.example .env"
    echo "  然後編輯 .env 並設定您的 GOOGLE_API_KEY"
    exit 1
fi

# Load .env
export $(cat .env | grep -v '^#' | xargs)

if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ 錯誤: GOOGLE_API_KEY 未設定"
    echo "請在 .env 檔案中設定您的 Google API Key"
    exit 1
fi

echo "✓ 環境變數已載入"

# Start backend
echo ""
echo "📡 啟動後端 (FastAPI)..."
cd backend

if [ ! -d "venv" ]; then
    echo "建立 Python 虛擬環境..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo "✓ 後端依賴已安裝"
echo "✓ 後端啟動於 http://localhost:8000"
echo ""

# Start backend in background
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# Start frontend
echo "🎨 啟動前端 (React)..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "安裝前端依賴..."
    npm install
fi

echo "✓ 前端依賴已安裝"
echo "✓ 前端啟動於 http://localhost:3000"
echo ""
echo "=================================================="
echo "🎉 應用程式已啟動！"
echo ""
echo "前端: http://localhost:3000"
echo "後端: http://localhost:8000"
echo "API 文件: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服務"
echo "=================================================="

# Start frontend (this will block)
npm start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
