# 多模型支援與語意搜尋實作完成

## ✅ 已完成功能

### 1. PostgreSQL 向量資料庫架構 ✅
- **Docker Compose**: 新增 pgvector/pgvector:pg16 PostgreSQL 服務
- **資料庫 Schema**: 
  - `documents` 表：儲存文件內容與 768 維 embedding 向量
  - `query_logs` 表：記錄查詢歷史與使用統計
  - IVFFlat 索引：加速向量相似度搜尋
- **ORM Models**: SQLAlchemy 模型定義
- **連接管理**: 連接池與 session 管理

### 2. Embedding 服務與文件索引 ✅
- **EmbeddingService**: 
  - 使用 Gemini `text-embedding-004` 模型
  - 產生 768 維向量
  - 支援文件與查詢兩種任務類型
- **DocumentService**:
  - 文件 CRUD 操作
  - 自動產生 embedding 並儲存
  - 向量相似度搜尋 (cosine distance)
  - 查詢日誌記錄
- **檔案上傳整合**: 上傳時自動索引文件內容

### 3. 多模型動態切換機制 ✅
- **支援模型**:
  - `gemini-2.5-flash`: 快速回應
  - `gemini-1.5-pro`: 進階推理
  - `gemini-1.5-flash`: 平衡選擇
- **RAGService 更新**:
  - 動態模型選擇
  - 模型白名單驗證
  - 選擇性檔案查詢
- **API**: `GET /api/chat/models` 取得可用模型列表

### 4. 前端模型選擇與搜尋 UI ✅
- **模型選擇器**: 
  - 下拉選單選擇模型
  - 顯示模型描述
  - localStorage 儲存偏好
- **語意搜尋介面**:
  - 🔍 搜尋按鈕觸發語意搜尋
  - 顯示相關文件列表
  - 相似度分數顯示
  - Checkbox 選擇要查詢的檔案
- **檔案選擇面板**:
  - 文件預覽
  - 全選/清除功能
  - 視覺化相似度

### 5. 語意搜尋 API 與整合 ✅
- **Search Router**: `POST /api/search`
  - 接收查詢文字
  - 返回 top-k 相關文件
  - 可調整相似度閾值
- **ChatRequest 擴充**:
  - `model`: 指定使用的模型
  - `selected_files`: 選定的檔案列表
- **智慧查詢流程**:
  1. 使用者輸入問題
  2. 點擊搜尋找出相關文件
  3. 選擇要查詢的檔案
  4. 使用選定模型進行查詢

### 6. 使用統計與監控 ✅
- **Stats Router**: `GET /api/stats`
  - 總查詢次數
  - 成功率
  - 各模型使用次數
  - 平均檔案使用數
- **StatsPanel 組件**:
  - 4 個統計卡片
  - 模型使用分布圖表
  - 即時刷新功能
- **自動日誌**: 每次查詢自動記錄到資料庫

## 📁 新增檔案

### Backend
```
backend/
├── database/
│   ├── __init__.py          # 資料庫套件初始化
│   ├── connection.py        # SQLAlchemy 連接管理
│   ├── models.py            # ORM 模型定義
│   └── init.sql            # PostgreSQL 初始化 Schema
├── services/
│   ├── embedding_service.py # Embedding 產生服務
│   └── document_service.py  # 文件管理服務
└── routers/
    ├── search.py           # 語意搜尋 API
    └── stats.py            # 統計資料 API
```

### Frontend
```
frontend/src/components/
├── StatsPanel.js           # 統計面板組件
└── StatsPanel.css         # 統計面板樣式
```

## 🔧 修改檔案

### Backend
- `docker-compose.yml`: 新增 PostgreSQL 服務
- `backend/requirements.txt`: 新增資料庫相關依賴
- `backend/main.py`: 註冊新路由、初始化資料庫
- `backend/services/rag_service.py`: 多模型支援、檔案選擇
- `backend/routers/chat.py`: 擴充 ChatRequest、整合日誌
- `backend/routers/files.py`: 檔案上傳時建立索引
- `backend/models/schemas.py`: 新增 Request/Response schemas

### Frontend
- `frontend/src/services/api.js`: 新增搜尋、統計、模型 API
- `frontend/src/components/ChatInterface.js`: 模型選擇、搜尋功能
- `frontend/src/components/ChatInterface.css`: 新增樣式
- `frontend/src/App.js`: 整合統計面板、導航按鈕
- `frontend/src/App.css`: 導航按鈕樣式

### Configuration
- `.env`: 新增 DATABASE_URL
- `.env.example`: 新增資料庫設定範例

## 🚀 啟動步驟

### 1. 停止舊服務
```bash
docker-compose down
```

### 2. 重建並啟動
```bash
docker-compose up --build -d
```

### 3. 查看日誌
```bash
docker-compose logs -f
```

### 4. 驗證服務
- 前端: http://localhost:3000
- 後端 API: http://localhost:8000
- API 文件: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## 🎯 使用流程

### 模型選擇
1. 打開聊天介面
2. 在頂部選擇 AI 模型
3. 偏好會自動儲存

### 語意搜尋
1. 輸入問題
2. 點擊 🔍 搜尋按鈕
3. 查看相關文件列表
4. 勾選要查詢的檔案
5. 發送訊息

### 查看統計
1. 點擊頂部「📊 統計」按鈕
2. 查看使用數據
3. 點擊 🔄 刷新最新數據

## 📊 資料庫 Schema

### documents 表
```sql
- id: SERIAL PRIMARY KEY
- gemini_file_name: VARCHAR(255) UNIQUE
- display_name: VARCHAR(255)
- content: TEXT
- embedding: vector(768)
- file_size: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### query_logs 表
```sql
- id: SERIAL PRIMARY KEY
- query: TEXT
- model_used: VARCHAR(100)
- files_used: INTEGER
- selected_files: TEXT[]
- response_length: INTEGER
- success: BOOLEAN
- error_message: TEXT
- created_at: TIMESTAMP
```

## 🔍 API 端點

### 新增端點
- `GET /api/chat/models` - 取得可用模型
- `POST /api/search` - 語意搜尋文件
- `GET /api/stats` - 取得使用統計

### 更新端點
- `POST /api/chat` - 支援 model 和 selected_files 參數
- `POST /api/files/upload` - 自動建立文件索引
- `DELETE /api/files/{name}` - 同步刪除資料庫記錄

## ⚙️ 技術特點

### 向量搜尋
- pgvector 擴充功能
- IVFFlat 索引加速
- Cosine distance 相似度計算
- 可調整 top-k 和相似度閾值

### Embedding
- Gemini text-embedding-004
- 768 維向量
- 任務類型區分 (document/query)
- 批次處理支援

### 效能優化
- PostgreSQL 連接池
- 向量索引加速搜尋
- 前端 localStorage 快取
- 條件式檔案載入

## 🎨 UI/UX 改進

### 視覺設計
- 模型選擇器整合在頂部
- 搜尋結果浮動面板
- 相似度進度條視覺化
- 統計卡片設計

### 互動優化
- 即時搜尋結果
- Checkbox 檔案選擇
- 模型偏好持久化
- 統計資料即時刷新

## 🐛 已知限制

1. **現有檔案索引**: 
   - 已上傳到 Gemini 的檔案無法自動索引
   - 需要重新上傳以建立 embedding

2. **大型檔案處理**:
   - 長文件建議分段處理
   - Embedding API 有 token 限制

3. **搜尋準確度**:
   - 依賴 embedding 品質
   - 短文件可能相似度較低

## 🔮 未來改進

1. **效能優化**:
   - Embedding 快取機制
   - 批次 embedding 處理
   - 查詢結果快取

2. **功能擴充**:
   - 混合搜尋 (BM25 + 向量)
   - 檔案分段索引
   - 多語言支援

3. **UI 增強**:
   - 搜尋歷史
   - 檔案標籤系統
   - 進階過濾選項

## ✅ 測試建議

1. **上傳新檔案**: 測試自動索引
2. **語意搜尋**: 測試相似度排序
3. **模型切換**: 測試不同模型回應
4. **統計面板**: 查看使用數據
5. **檔案選擇**: 測試選擇性查詢

---

**實作完成時間**: 2025-11-17
**版本**: 2.0.0
**核心功能**: ✅ 全部完成
