# RAG 系統時序圖

## 1. 系統啟動與文件上傳流程

```mermaid
sequenceDiagram
    participant User as 使用者
    participant API as FastAPI Server
    participant RAG as RAGService
    participant Embed as EmbeddingService
    participant Doc as DocumentService
    participant DB as PostgreSQL (pgvector)
    participant Gemini as Google Gemini API

    Note over API,Gemini: 系統啟動階段
    
    API->>API: 載入環境變數 (GOOGLE_API_KEY)
    API->>DB: init_db() 初始化資料庫
    DB-->>API: 資料庫就緒
    
    API->>RAG: 初始化 RAGService
    RAG->>Gemini: configure API & 獲取可用模型列表
    Gemini-->>RAG: 返回模型列表 (gemini-1.5-flash, gemini-1.5-pro...)
    RAG-->>API: 服務就緒
    
    Note over API,Gemini: 自動上傳測試資料
    
    API->>RAG: 檢查 Gemini 已上傳檔案
    RAG->>Gemini: list_files()
    Gemini-->>RAG: 返回已上傳檔案列表
    
    alt 檔案未上傳
        API->>RAG: upload_folder(test-data/)
        loop 遍歷每個檔案
            RAG->>Gemini: upload_file(file_path)
            Gemini-->>RAG: 返回檔案元數據 (name, uri, state)
            
            RAG->>Doc: create_document(file_name, content)
            Doc->>Embed: generate_embedding(content)
            Embed->>Gemini: embed_content(text, task_type="retrieval_document")
            Gemini-->>Embed: 返回 768 維向量
            Embed-->>Doc: 返回 embedding
            
            Doc->>DB: 儲存 (gemini_file_name, content, embedding)
            DB-->>Doc: 儲存成功
        end
    end
    
    API-->>User: 系統啟動完成
```

## 2. 聊天查詢流程 (使用檔案上下文)

```mermaid
sequenceDiagram
    participant User as 使用者/前端
    participant Chat as ChatRouter
    participant RAG as RAGService
    participant Doc as DocumentService
    participant DB as PostgreSQL
    participant Gemini as Google Gemini API

    Note over User,Gemini: 使用者發送查詢
    
    User->>Chat: POST /api/chat<br/>{message, model, selected_files, system_prompt}
    
    Chat->>Chat: 驗證請求參數
    Chat->>RAG: 驗證模型是否可用
    RAG-->>Chat: 模型有效
    
    Chat->>RAG: query(query, model_name, selected_file_names, system_prompt)
    
    alt 有選擇特定檔案
        RAG->>RAG: list_files() 獲取所有檔案
        loop 遍歷選擇的檔案
            RAG->>Gemini: get_file(file_name)
            Gemini-->>RAG: 返回檔案物件
            RAG->>RAG: 加入 prompt_parts
        end
    end
    
    RAG->>RAG: 構建完整 prompt<br/>(system_prompt + files + query)
    
    RAG->>Gemini: generate_content(prompt_parts, generation_config)
    Note over Gemini: 模型處理:<br/>1. 讀取檔案內容<br/>2. 理解查詢意圖<br/>3. 基於檔案上下文生成回答
    Gemini-->>RAG: 返回生成結果 + token 使用量
    
    RAG-->>Chat: {success, response, model_used, files_used, tokens}
    
    Chat->>Doc: log_query() 記錄查詢日誌
    Doc->>DB: INSERT query_logs
    DB-->>Doc: 記錄成功
    
    Chat-->>User: ChatResponse<br/>{message, model_used, files_used, token_usage}
```

## 3. 語義搜尋流程

```mermaid
sequenceDiagram
    participant User as 使用者/前端
    participant Search as SearchRouter
    participant Doc as DocumentService
    participant Embed as EmbeddingService
    participant DB as PostgreSQL (pgvector)
    participant Gemini as Google Gemini API

    Note over User,Gemini: 語義搜尋請求
    
    User->>Search: POST /api/search<br/>{query, top_k, similarity_threshold}
    
    Search->>Search: 驗證查詢參數
    
    Search->>Doc: search_similar_documents(query, top_k, threshold)
    
    Doc->>Embed: generate_query_embedding(query)
    Embed->>Gemini: embed_content(query, task_type="retrieval_query")
    Note over Gemini: 生成查詢向量<br/>(768 維)
    Gemini-->>Embed: 返回 query embedding
    Embed-->>Doc: 返回 query_embedding
    
    Doc->>DB: SELECT with cosine_distance<br/>ORDER BY similarity DESC<br/>LIMIT top_k
    Note over DB: pgvector 執行:<br/>1. 計算餘弦相似度<br/>2. 排序並過濾<br/>3. 返回最相關文件
    DB-->>Doc: 返回 [(document, similarity_score), ...]
    
    Doc->>Doc: 過濾低於閾值的結果
    Doc-->>Search: 返回相似文件列表
    
    Search->>Search: 格式化結果 (preview, score)
    Search-->>User: SearchResponse<br/>{results: [{document, similarity_score}]}
```

## 4. 文件管理流程

```mermaid
sequenceDiagram
    participant User as 使用者/前端
    participant Files as FilesRouter
    participant RAG as RAGService
    participant Doc as DocumentService
    participant Embed as EmbeddingService
    participant DB as PostgreSQL
    participant Gemini as Google Gemini API

    Note over User,Gemini: 上傳新檔案
    
    User->>Files: POST /api/files/upload<br/>(multipart file)
    
    Files->>Files: 儲存臨時檔案
    Files->>RAG: upload_file(file_path, display_name)
    RAG->>Gemini: upload_file(path, display_name)
    Note over Gemini: 處理並儲存檔案<br/>支援多種格式
    Gemini-->>RAG: 返回檔案元數據
    RAG-->>Files: {name, uri, state, size}
    
    Files->>Files: 讀取檔案內容
    Files->>Doc: create_document(gemini_file_name, content)
    Doc->>Embed: generate_embedding(content)
    Embed->>Gemini: embed_content(text)
    Gemini-->>Embed: 返回 embedding
    Embed-->>Doc: embedding vector
    
    Doc->>DB: INSERT document with embedding
    DB-->>Doc: 儲存成功
    
    Files-->>User: 上傳並索引成功
    
    Note over User,Gemini: 刪除檔案
    
    User->>Files: DELETE /api/files/{file_name}
    Files->>RAG: delete_file(file_name)
    RAG->>Gemini: delete_file(file_name)
    Gemini-->>RAG: 刪除成功
    
    Files->>Doc: delete_document(file_name)
    Doc->>DB: DELETE FROM documents
    DB-->>Doc: 刪除成功
    
    Files-->>User: 檔案刪除成功
    
    Note over User,Gemini: 列出所有檔案
    
    User->>Files: GET /api/files
    Files->>RAG: list_files()
    RAG->>Gemini: list_files()
    Gemini-->>RAG: 返回檔案列表
    
    Files->>Doc: list_documents()
    Doc->>DB: SELECT * FROM documents
    DB-->>Doc: 返回文件列表
    
    Files->>Files: 合併 Gemini 和 DB 資訊
    Files-->>User: 完整檔案列表 (狀態、大小、索引狀態)
```

## 5. WebSocket 即時聊天流程

```mermaid
sequenceDiagram
    participant User as 使用者/前端
    participant WS as WebSocket
    participant Chat as ChatRouter
    participant RAG as RAGService
    participant Doc as DocumentService
    participant Gemini as Google Gemini API

    Note over User,Gemini: 建立 WebSocket 連線
    
    User->>WS: ws://localhost:8000/api/chat/ws
    WS->>Chat: accept connection
    Chat->>Chat: 初始化 DB session
    Chat-->>User: 連線建立
    
    loop 持續對話
        User->>WS: send JSON<br/>{message, model, selected_files}
        WS->>Chat: 接收訊息
        
        Chat->>User: {type: 'status', message: '正在處理...'}
        
        Chat->>RAG: query(message, model, files)
        RAG->>Gemini: generate_content()
        Gemini-->>RAG: response
        RAG-->>Chat: result
        
        Chat->>Doc: log_query()
        
        alt 查詢成功
            Chat->>User: {type: 'response', success: true, message, tokens}
        else 查詢失敗
            Chat->>User: {type: 'response', success: false, error}
        end
    end
    
    Note over User,Chat: 斷開連線
    User->>WS: disconnect
    Chat->>Chat: close DB session
```

## 6. 統計資料流程

```mermaid
sequenceDiagram
    participant User as 使用者/前端
    participant Stats as StatsRouter
    participant Doc as DocumentService
    participant DB as PostgreSQL

    User->>Stats: GET /api/stats/query-stats
    Stats->>Doc: get_query_stats()
    Doc->>DB: 查詢統計資料<br/>COUNT, AVG, SUM, GROUP BY
    DB-->>Doc: 統計結果
    Doc-->>Stats: 格式化統計資料
    Stats-->>User: {<br/>  total_queries,<br/>  success_rate,<br/>  model_usage,<br/>  avg_tokens,<br/>  total_tokens<br/>}
    
    User->>Stats: GET /api/stats/query-history
    Stats->>Doc: get_query_history(page, page_size)
    Doc->>DB: SELECT * FROM query_logs<br/>ORDER BY created_at DESC<br/>LIMIT & OFFSET
    DB-->>Doc: 查詢歷史記錄
    Doc-->>Stats: 分頁結果
    Stats-->>User: {<br/>  history: [],<br/>  total,<br/>  page,<br/>  page_size<br/>}
```

## 系統架構重點

### 核心組件

1. **RAGService**: 管理與 Google Gemini API 的互動
   - 模型管理與驗證
   - 檔案上傳/刪除
   - 生成回答 (基於檔案上下文)

2. **EmbeddingService**: 生成與管理向量嵌入
   - 文件向量化 (task_type: retrieval_document)
   - 查詢向量化 (task_type: retrieval_query)
   - 使用 Gemini text-embedding-004 模型

3. **DocumentService**: 文件與查詢管理
   - 文件 CRUD 操作
   - 向量相似度搜尋 (pgvector)
   - 查詢日誌記錄

4. **PostgreSQL with pgvector**: 向量資料庫
   - 儲存文件內容與 768 維向量
   - 高效餘弦相似度搜尋
   - 查詢統計與歷史記錄

### 資料流

```
使用者查詢 → API Router → RAGService → Gemini API
                ↓
           DocumentService → EmbeddingService → Gemini Embedding API
                ↓
           PostgreSQL (pgvector)
```

### 特色功能

- **多模型支援**: 動態載入可用的 Gemini 模型
- **檔案選擇**: 可指定特定檔案作為上下文
- **自訂系統提示**: 彈性控制回答風格
- **語義搜尋**: 基於向量相似度的智慧搜尋
- **使用統計**: Token 使用量、查詢成功率追蹤
- **WebSocket 支援**: 即時聊天互動
