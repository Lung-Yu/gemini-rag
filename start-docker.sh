#!/bin/bash

echo "🐳 啟動 Gemini RAG Chat Application (Docker 模式)"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ 錯誤: .env 檔案不存在"
    echo "請先建立 .env 檔案:"
    echo "  cp .env.example .env"
    echo "  然後編輯 .env 並設定您的 GOOGLE_API_KEY"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ 錯誤: Docker 未運行"
    echo "請先啟動 Docker Desktop"
    exit 1
fi

echo "✓ Docker 已運行"
echo "✓ 環境變數檔案已找到"
echo ""

# Build and start containers
echo "📦 建置和啟動容器..."
docker-compose up --build -d

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "🎉 應用程式已啟動！"
    echo ""
    echo "前端: http://localhost:3000"
    echo "後端: http://localhost:8000"
    echo "API 文件: http://localhost:8000/docs"
    echo ""
    echo "查看日誌: docker-compose logs -f"
    echo "停止服務: docker-compose down"
    echo "=================================================="
else
    echo ""
    echo "❌ 啟動失敗，請檢查錯誤訊息"
    exit 1
fi
