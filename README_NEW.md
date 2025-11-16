# Gemini RAG Chat Application

全功能的 RAG (檢索增強生成) 聊天應用，使用 Google Gemini API、FastAPI 後端和 React 前端。

## 🌟 功能特色

- 💬 **即時聊天界面** - 流暢的問答體驗
- 📁 **檔案管理** - 上傳、刪除和管理 RAG 資料來源
- 🤖 **Gemini 2.5 Flash** - 使用 Google 最新的 AI 模型
- 🐳 **Docker 支援** - 完整的容器化部署
- 🎨 **現代化 UI** - 響應式設計，支援手機和桌面

## 📦 專案結構

```
RAG_by_Google/
├── backend/                 # FastAPI 後端
│   ├── main.py             # API 主程式
│   ├── services/           # 業務邏輯
│   │   └── rag_service.py  # RAG 服務
│   ├── routers/            # API 路由
│   │   ├── chat.py         # 聊天端點
│   │   └── files.py        # 檔案管理端點
│   ├── models/             # 資料模型
│   │   └── schemas.py      # Pydantic schemas
│   ├── requirements.txt    # Python 依賴
│   └── Dockerfile          # 後端 Docker 配置
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # React 組件
│   │   │   ├── ChatInterface.js
│   │   │   └── FileManager.js
│   │   ├── services/       # API 服務
│   │   │   └── api.js
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile          # 前端 Docker 配置
├── test-data/              # 測試資料檔案
├── docker-compose.yml      # Docker Compose 配置
├── .env                    # 環境變數 (需自行建立)
└── README.md
```

## 🚀 快速開始

### 方法 1: Docker (推薦)

1. **設定環境變數**
```bash
# 建立 .env 檔案
echo "GOOGLE_API_KEY=your-api-key-here" > .env
```

2. **啟動服務**
```bash
docker-compose up --build
```

3. **訪問應用**
- 前端: http://localhost:3000
- 後端 API: http://localhost:8000
- API 文件: http://localhost:8000/docs

### 方法 2: 本地開發

#### 後端設定

```bash
# 進入後端目錄
cd backend

# 建立虛擬環境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安裝依賴
pip install -r requirements.txt

# 設定環境變數
export GOOGLE_API_KEY=your-api-key-here

# 啟動後端
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端設定

```bash
# 在新終端機中，進入前端目錄
cd frontend

# 安裝依賴
npm install

# 啟動前端
npm start
```

前端會在 http://localhost:3000 啟動

## 🔑 取得 Google API Key

1. 前往 [Google AI Studio](https://ai.google.dev/)
2. 登入您的 Google 帳號
3. 點擊 "Get API Key"
4. 複製 API Key 並設定到 `.env` 檔案

## 📡 API 端點

### 聊天

- `POST /api/chat` - 發送訊息並取得回應
  ```json
  {
    "message": "誰有 CISSP 證照？"
  }
  ```

### 檔案管理

- `GET /api/files` - 列出所有已上傳的檔案
- `POST /api/files/upload` - 上傳新檔案
- `DELETE /api/files/{file_name}` - 刪除指定檔案
- `DELETE /api/files` - 清除所有檔案

### 健康檢查

- `GET /` - 檢查 API 狀態

## 🎯 使用方式

1. **啟動應用** - 使用 Docker 或本地開發模式
2. **檢查檔案** - 點擊「管理檔案」查看已上傳的檔案
3. **上傳資料** - 在檔案管理中上傳您的文件 (支援 .txt, .pdf, .doc, .docx)
4. **開始聊天** - 返回聊天界面，輸入問題
5. **取得回答** - AI 會根據上傳的檔案內容回答您的問題

## 🧪 測試資料

專案包含 20 個測試檔案 (`test-data/person_*.txt`)，包含人員資訊：
- 姓名
- 證照
- 年齡

範例問題：
- "誰有 CISSP 證照？"
- "共有幾張 ISC2 證照？"
- "列出所有人的年齡"

## 🐳 Docker 指令

```bash
# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 重新建置
docker-compose up --build

# 清除所有資料
docker-compose down -v
```

## 🛠️ 技術棧

### 後端
- **FastAPI** - 現代 Python Web 框架
- **Google Generative AI** - Gemini 2.5 Flash 模型
- **Uvicorn** - ASGI 伺服器
- **Pydantic** - 資料驗證

### 前端
- **React** - UI 框架
- **Axios** - HTTP 客戶端
- **CSS3** - 現代化樣式

### DevOps
- **Docker** - 容器化
- **Docker Compose** - 多容器編排
- **Nginx** - 前端靜態檔案服務

## 📝 環境變數

| 變數名稱 | 說明 | 必填 |
|---------|------|------|
| `GOOGLE_API_KEY` | Google Gemini API 金鑰 | ✅ |
| `REACT_APP_API_URL` | 後端 API URL (預設: http://localhost:8000) | ❌ |

## 🚨 注意事項

1. **API 配額限制** - Gemini API 有使用限制，如遇 429 錯誤請等待 60 秒
2. **檔案大小** - 上傳檔案大小依 Gemini API 限制
3. **安全性** - 請勿將 `.env` 檔案提交到版本控制
4. **生產環境** - 建議使用 HTTPS 和環境變數管理工具

## 🔧 開發

### 熱重載

後端和前端都支援熱重載：
- 後端: 修改程式碼會自動重啟
- 前端: 修改程式碼會自動更新瀏覽器

### 除錯

- 後端 API 文件: http://localhost:8000/docs
- 瀏覽器開發者工具: F12
- 後端日誌: 終端機輸出或 `docker-compose logs backend`

## 📄 授權

MIT License

## 👨‍💻 作者

建立於 2025 年，使用 Google Gemini API

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📞 支援

如有問題，請查看：
- [Google AI 文件](https://ai.google.dev/docs)
- [FastAPI 文件](https://fastapi.tiangolo.com/)
- [React 文件](https://react.dev/)
