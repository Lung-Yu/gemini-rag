# Quick Start Guide - Gemini RAG Chat

## 🎯 三種啟動方式

### 1. 使用自動化腳本 (推薦新手)

#### 本地開發模式
```bash
./start-dev.sh
```
這會自動：
- ✓ 檢查環境變數
- ✓ 安裝 Python 依賴
- ✓ 安裝 Node.js 依賴  
- ✓ 啟動後端 (port 8000)
- ✓ 啟動前端 (port 3000)

#### Docker 模式
```bash
./start-docker.sh
```
這會自動：
- ✓ 檢查 Docker 狀態
- ✓ 建置容器映像
- ✓ 啟動所有服務

### 2. 手動啟動 (開發者模式)

#### 後端
```bash
# 1. 進入後端目錄
cd backend

# 2. 啟動虛擬環境
source venv/bin/activate

# 3. 載入環境變數
export $(cat ../.env | grep -v '^#' | xargs)

# 4. 啟動 FastAPI
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端 (開新終端機)
```bash
# 1. 進入前端目錄
cd frontend

# 2. 啟動 React
npm start
```

### 3. Docker Compose (生產模式)

```bash
# 啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止
docker-compose down
```

## 📋 前置需求

### 必要項目
- ✅ Python 3.12+
- ✅ Node.js 18+
- ✅ Google API Key ([取得方式](https://ai.google.dev/))

### 選擇性項目
- 🐳 Docker & Docker Compose (若使用 Docker 模式)

## 🔧 初次設定

### 1. 設定 API Key

```bash
# 複製範例檔案
cp .env.example .env

# 編輯 .env 檔案，加入你的 API Key
nano .env  # 或使用任何編輯器
```

`.env` 內容：
```
GOOGLE_API_KEY=AIzaSy...你的金鑰...
REACT_APP_API_URL=http://localhost:8000
```

### 2. 安裝依賴 (僅第一次)

#### 後端
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 前端
```bash
cd frontend
npm install
```

## 🎨 使用介面

### 啟動後訪問

- **前端**: http://localhost:3000
- **後端 API**: http://localhost:8000
- **API 文件**: http://localhost:8000/docs (Swagger UI)

### 功能說明

#### 1. 聊天介面 (預設頁面)
- 💬 輸入問題並獲得 AI 回答
- 📊 顯示使用的檔案數量
- ⏱️ 顯示訊息時間
- 📱 響應式設計

#### 2. 檔案管理 (點擊「管理檔案」)
- 📁 查看已上傳檔案
- ➕ 上傳新檔案
- 🗑️ 刪除單一檔案
- 🗑️ 清除所有檔案

## 🧪 測試範例

專案預設會自動上傳 `test-data/` 資料夾中的 20 個測試檔案。

### 範例問題

1. **查詢證照**
   ```
   誰有 CISSP 證照？
   ```

2. **統計資訊**
   ```
   共有幾張 ISC2 證照？
   ```

3. **年齡查詢**
   ```
   列出所有人的年齡
   ```

4. **綜合查詢**
   ```
   年紀最大的人是誰？
   ```

## 🐛 常見問題

### 1. 後端啟動失敗

**錯誤**: `GOOGLE_API_KEY environment variable is not set`

**解決**:
```bash
# 確認 .env 檔案存在
cat .env

# 確認環境變數已載入
echo $GOOGLE_API_KEY
```

### 2. 前端無法連接後端

**錯誤**: `Network Error` 或 CORS 錯誤

**解決**:
- 確認後端在 http://localhost:8000 運行
- 檢查 `REACT_APP_API_URL` 設定
- 清除瀏覽器快取

### 3. Docker 建置失敗

**解決**:
```bash
# 清除舊容器和映像
docker-compose down -v
docker system prune -a

# 重新建置
docker-compose up --build
```

### 4. API 配額錯誤

**錯誤**: `429 Too Many Requests`

**解決**:
- 等待 60 秒後重試
- 檢查 [API 使用量](https://ai.dev/usage?tab=rate-limit)
- 考慮升級 API 方案

### 5. 檔案上傳失敗

**可能原因**:
- 檔案格式不支援 (僅支援 .txt, .pdf, .doc, .docx)
- 檔案過大
- API 配額已滿

## 📊 效能優化

### 開發模式
- 後端熱重載: `--reload` 標記
- 前端熱更新: React Fast Refresh

### 生產模式
- 前端建置優化: `npm run build`
- Nginx 靜態檔案服務
- gzip 壓縮
- 快取策略

## 🔒 安全建議

1. **不要提交 .env 檔案**
   ```bash
   # 確認 .env 在 .gitignore 中
   git check-ignore .env
   ```

2. **使用環境變數管理工具** (生產環境)
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault

3. **HTTPS** (生產環境必須)
   - 使用 Let's Encrypt
   - Nginx SSL 設定

## 📝 開發流程

### 修改後端
1. 編輯 `backend/` 中的檔案
2. 儲存後自動重載 (使用 `--reload`)
3. 測試 API: http://localhost:8000/docs

### 修改前端
1. 編輯 `frontend/src/` 中的檔案
2. 儲存後瀏覽器自動更新
3. 檢查瀏覽器控制台 (F12)

### 新增 API 端點
1. 在 `backend/routers/` 新增路由
2. 在 `backend/services/` 新增業務邏輯
3. 在 `backend/models/schemas.py` 定義資料模型
4. 在 `backend/main.py` 註冊路由

### 新增前端組件
1. 在 `frontend/src/components/` 建立組件
2. 在 `frontend/src/services/api.js` 新增 API 呼叫
3. 在主要組件中使用

## 🚀 部署

### 本地測試
```bash
# Docker 模式最接近生產環境
./start-docker.sh
```

### 雲端部署 (未來考慮)

#### AWS
- ECS + ECR
- Elastic Beanstalk
- Lambda + API Gateway

#### Azure
- Container Apps
- App Service
- AKS

#### GCP
- Cloud Run
- GKE
- App Engine

## 📚 進階主題

### WebSocket 串流
未來版本將支援即時串流回應：
```python
# 後端
@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    ...
```

### 對話歷史持久化
```python
# 新增 SQLite 儲存
import sqlite3
# 儲存對話記錄
```

### 多語言支援
```javascript
// 前端國際化
import i18n from 'i18next';
```

## 🆘 取得幫助

1. 查看 [完整 README](README_NEW.md)
2. 查看 [API 文件](http://localhost:8000/docs)
3. 查看 [Google AI 文件](https://ai.google.dev/docs)

## ✅ 檢查清單

部署前確認：

- [ ] .env 檔案已設定
- [ ] 後端可正常啟動
- [ ] 前端可正常啟動
- [ ] API 連接正常
- [ ] 檔案上傳功能正常
- [ ] 聊天功能正常
- [ ] Docker 建置成功 (如使用)

---

**祝使用愉快！** 🎉
