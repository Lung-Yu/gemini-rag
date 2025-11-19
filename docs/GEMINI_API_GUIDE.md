# Google Generative AI (Gemini) API 使用教學

> 本文件結合實際專案 (RAG_by_Google) 的應用案例，完整介紹 Google Generative AI SDK 的使用方法

---

## 📚 目錄

1. [基礎設置](#1-基礎設置)
2. [模型管理](#2-模型管理)
3. [文件管理](#3-文件管理)
4. [內容生成](#4-內容生成)
5. [Embedding 嵌入向量](#5-embedding-嵌入向量)
6. [進階應用](#6-進階應用)
7. [最佳實踐](#7-最佳實踐)
8. [常見問題](#8-常見問題)

---

## 1. 基礎設置

### 1.1 安裝 SDK

```bash
pip install google-generativeai
```

### 1.2 API Key 配置

#### 方法 A：環境變數（推薦）

```python
import os
import google.generativeai as genai

# 從環境變數讀取
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)
```

#### 方法 B：直接設定

```python
import google.generativeai as genai

genai.configure(api_key='YOUR_API_KEY_HERE')
```

### 📌 專案實作參考

**檔案：** `backend/services/rag_service.py` (第 16-29 行)

```python
class RAGService:
    def __init__(self, api_key: str):
        """初始化 RAG 服務"""
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.logger = get_logger(__name__)
        
        # 配置 legacy API（兼容性）
        genai.configure(api_key=api_key)
        
        # 初始化新版 client（用於列出模型）
        self.client = genai_client.Client(api_key=api_key)
        
        self.logger.info(f"API Key loaded: {api_key[:10]}...")
```

**說明：**
- 本專案同時使用兩個 API 版本：`google.generativeai` 和 `google.genai`
- `genai.configure()` 用於舊版 API（文件上傳、內容生成）
- `genai_client.Client()` 用於新版 API（模型列表）

---

## 2. 模型管理

### 2.1 列出可用模型

```python
from google import genai

client = genai.Client(api_key='YOUR_API_KEY')

for model in client.models.list():
    print(f"Model: {model.name}")
    print(f"Display Name: {model.display_name}")
    print(f"Supported Actions: {model.supported_actions}")
    print("---")
```

### 2.2 模型選擇指南

| 模型 ID | 特點 | 適用場景 | 成本 |
|---------|------|----------|------|
| `gemini-2.0-flash-exp` | 實驗性最新版 | 測試新功能 | 免費（有限額） |
| `gemini-1.5-pro` | 高品質推理 | 複雜邏輯、長文分析 | 高 |
| `gemini-1.5-flash` | 速度與品質平衡 | 一般對話、RAG 應用 | 中 |
| `gemini-1.0-pro` | 穩定可靠 | 生產環境 | 低 |

### 📌 專案實作參考

**檔案：** `backend/services/rag_service.py` (第 33-89 行)

```python
def _load_available_models(self) -> List[Dict[str, str]]:
    """從 Google AI API 載入可用模型"""
    try:
        available_models = []
        
        for model in self.client.models.list():
            # 只選擇支援 generateContent 的 Gemini 模型
            if 'generateContent' in model.supported_actions and 'gemini' in model.name.lower():
                
                model_id = model.name.replace('models/', '')
                description = self._get_model_description(model_id)
                
                available_models.append({
                    'model_id': model_id,
                    'name': model.display_name or model_id,
                    'description': description
                })
        
        # 依名稱排序，優先顯示最新版本
        available_models.sort(key=lambda x: (x['model_id'].replace('-', ''), x['model_id']))
        
        self.logger.info(f"Loaded {len(available_models)} available models")
        return available_models
        
    except Exception as e:
        self.logger.warning(f"Could not load model list: {e}", exc_info=True)
        
        # 失敗時返回基本模型清單
        fallback_models = [
            {
                'model_id': 'gemini-1.5-flash',
                'name': 'Gemini 1.5 Flash',
                'description': 'Fast model - Balanced speed and quality'
            }
        ]
        return fallback_models

def _get_model_description(self, model_id: str) -> str:
    """根據模型 ID 取得描述"""
    descriptions = {
        'gemini-2.0-flash-exp': 'Latest experimental model - Best performance',
        'gemini-1.5-pro': 'Pro version - Complex reasoning',
        'gemini-1.5-flash': 'Flash version - Balanced speed and quality',
        'gemini-1.0-pro': 'Standard version - Stable and reliable'
    }
    
    # 嘗試精確匹配
    if model_id in descriptions:
        return descriptions[model_id]
        
    # 模糊匹配
    for key, desc in descriptions.items():
        if key in model_id:
            return desc
            
    # 預設描述
    if 'pro' in model_id:
        return 'Pro model - High quality output'
    elif 'flash' in model_id:
        return 'Fast model - Efficient response'
    else:
        return 'Standard Gemini model'
```

**重點說明：**
1. **動態載入模型列表**：自動取得最新可用模型
2. **過濾條件**：只選擇支援 `generateContent` 且名稱包含 `gemini` 的模型
3. **錯誤處理**：API 失敗時使用 fallback 模型清單
4. **用戶友善**：為每個模型提供中文描述

---

## 3. 文件管理

### 3.1 上傳文件

```python
import google.generativeai as genai

# 上傳本地文件
uploaded_file = genai.upload_file(
    path='./data/document.pdf',
    display_name='My Document'
)

print(f"Uploaded file: {uploaded_file.name}")
print(f"URI: {uploaded_file.uri}")
print(f"State: {uploaded_file.state.name}")
```

**支援的文件格式：**
- 文字：TXT, MD, CSV
- 文件：PDF, DOCX
- 圖片：PNG, JPEG, WEBP
- 影片：MP4, MOV
- 音訊：MP3, WAV

### 3.2 列出已上傳文件

```python
files = genai.list_files()

for file in files:
    print(f"Name: {file.display_name}")
    print(f"Size: {file.size_bytes} bytes")
    print(f"Created: {file.create_time}")
```

### 3.3 刪除文件

```python
genai.delete_file(file_name='files/abc123xyz')
```

### 📌 專案實作參考

**檔案：** `backend/services/rag_service.py`

#### A. 列出文件 (第 107-129 行)

```python
def list_files(self) -> List[Dict[str, Any]]:
    """列出所有已上傳文件"""
    try:
        files = genai.list_files()
        return [
            {
                'name': file.name,
                'display_name': file.display_name,
                'uri': file.uri if hasattr(file, 'uri') else None,
                'size_bytes': file.size_bytes,
                'create_time': file.create_time.isoformat() if file.create_time else None,
                'state': file.state.name if hasattr(file.state, 'name') else str(file.state)
            } 
            for file in files
        ]
    except Exception as e:
        self.logger.error(f"Error listing files: {e}")
        return []
```

#### B. 上傳文件 (第 131-156 行)

```python
def upload_file(self, file_path: str, display_name: Optional[str] = None) -> Dict[str, Any]:
    """上傳文件到 Gemini"""
    try:
        uploaded_file = genai.upload_file(
            path=file_path,
            display_name=display_name
        )
        
        self.logger.info(f"Successfully uploaded file: {display_name or file_path}")
        
        return {
            'name': uploaded_file.name,
            'display_name': uploaded_file.display_name,
            'uri': uploaded_file.uri if hasattr(uploaded_file, 'uri') else None,
            'size_bytes': uploaded_file.size_bytes,
            'create_time': uploaded_file.create_time.isoformat() if uploaded_file.create_time else None,
            'state': uploaded_file.state.name if hasattr(uploaded_file.state, 'name') else 'ACTIVE'
        }
    except Exception as e:
        self.logger.error(f"Failed to upload file {display_name or file_path}: {e}")
        raise FileUploadError(f"Failed to upload file: {e}")
```

#### C. 刪除文件 (第 158-167 行)

```python
def delete_file(self, file_name: str) -> bool:
    """從 Gemini 刪除文件"""
    try:
        genai.delete_file(file_name)
        self.logger.info(f"Deleted file: {file_name}")
        return True
    except Exception as e:
        self.logger.error(f"Error deleting file {file_name}: {e}")
        return False
```

#### D. 批次上傳資料夾 (第 393-444 行)

```python
def upload_folder(self, folder_path: str) -> Dict[str, Any]:
    """
    上傳資料夾內所有文件到 Gemini
    
    Args:
        folder_path: 包含文件的資料夾路徑
        
    Returns:
        Dict 包含上傳結果
    """
    import glob
    
    uploaded = []
    failed = []
    
    try:
        # 取得所有支援的文件
        file_patterns = [
            os.path.join(folder_path, '*.txt'),
            os.path.join(folder_path, '*.md'),
            os.path.join(folder_path, '*.pdf')
        ]
        
        files_to_upload = []
        for pattern in file_patterns:
            files_to_upload.extend(glob.glob(pattern))
        
        self.logger.info(f"Found {len(files_to_upload)} files to upload from {folder_path}")
        
        for file_path in files_to_upload:
            try:
                display_name = os.path.basename(file_path)
                result = self.upload_file(file_path, display_name)
                uploaded.append(result)
            except Exception as e:
                self.logger.error(f"Failed to upload {file_path}: {e}")
                failed.append({
                    'file_path': file_path,
                    'error': str(e)
                })
        
        return {
            'uploaded': uploaded,
            'uploaded_count': len(uploaded),
            'failed': failed,
            'failed_count': len(failed)
        }
        
    except Exception as e:
        self.logger.error(f"Error uploading folder {folder_path}: {e}")
        return {
            'uploaded': uploaded,
            'uploaded_count': len(uploaded),
            'failed': failed,
            'failed_count': len(failed),
            'error': str(e)
        }
```

**重點說明：**
1. **錯誤處理**：每個操作都有完整的 try-except
2. **日誌記錄**：記錄所有重要操作
3. **屬性檢查**：使用 `hasattr()` 避免屬性不存在錯誤
4. **批次處理**：`upload_folder()` 支援批次上傳並記錄成功/失敗

---

## 4. 內容生成

### 4.1 基本文字生成

```python
import google.generativeai as genai

# 初始化模型
model = genai.GenerativeModel('gemini-1.5-flash')

# 生成內容
response = model.generate_content("什麼是機器學習？")
print(response.text)
```

### 4.2 多模態輸入（文字 + 文件）

```python
# 取得已上傳的文件
file = genai.get_file('files/abc123xyz')

# 組合文件與提示詞
prompt_parts = [
    file,
    "請總結這份文件的重點"
]

response = model.generate_content(prompt_parts)
print(response.text)
```

### 4.3 串流響應（Streaming）

```python
response_stream = model.generate_content(
    "寫一篇關於 AI 的文章",
    stream=True  # 啟用串流
)

for chunk in response_stream:
    if chunk.text:
        print(chunk.text, end='', flush=True)
```

### 4.4 配置生成參數

```python
from google.generativeai.types import GenerationConfig

response = model.generate_content(
    "創作一首詩",
    generation_config=GenerationConfig(
        max_output_tokens=8192,  # 最大輸出 token 數
        temperature=0.7,         # 創造性（0-1）
        top_p=0.95,             # 核心採樣
        top_k=40                # Top-K 採樣
    )
)
```

**參數說明：**
- `temperature`：控制隨機性（0 = 確定性，1 = 最大創造性）
- `max_output_tokens`：限制回應長度
- `top_p`：核心採樣，保留累積機率達到 p 的 token
- `top_k`：只從機率最高的 k 個 token 中採樣

### 📌 專案實作參考

**檔案：** `backend/services/rag_service.py`

#### A. 非串流查詢 (第 176-259 行)

```python
def query(
    self, 
    query: str, 
    model_name: Optional[str] = None, 
    selected_file_names: Optional[List[str]] = None,
    system_prompt: Optional[str] = None,
    max_output_tokens: int = MAX_OUTPUT_TOKENS
) -> Dict[str, Any]:
    """
    使用可選的文件上下文和自訂系統提示詞查詢模型
    
    Args:
        query: 用戶查詢文字
        model_name: 使用的模型（預設為 DEFAULT_MODEL）
        selected_file_names: 要包含在上下文中的文件名稱列表
        system_prompt: 自訂系統提示詞（None 則使用預設）
        max_output_tokens: 回應的最大 token 數
        
    Returns:
        Dict 包含成功狀態、回應和元數據
        
    Raises:
        ModelValidationError: 如果模型不可用
    """
    if not model_name:
        model_name = DEFAULT_MODEL
    
    # 驗證模型
    available_model_ids = [m['model_id'] for m in self.get_available_models()]
    if model_name not in available_model_ids:
        raise ModelValidationError(
            f"Unsupported model: {model_name}. Available models: {', '.join(available_model_ids)}"
        )
    
    try:
        model = genai.GenerativeModel(model_name)
        
        # 建立提示詞內容
        prompt_parts = []
        
        # 加入選定的文件
        files_used = 0
        if selected_file_names:
            all_files = self.list_files()
            file_map = {f['name']: f for f in all_files}
            
            for file_name in selected_file_names:
                if file_name in file_map:
                    # 加入文件參考
                    file_obj = genai.get_file(file_name)
                    prompt_parts.append(file_obj)
                    files_used += 1
        
        # 加入實際查詢與自訂或預設系統提示詞
        default_system_prompt = """Based on the provided document content, please answer the following question:

{query}

If the documents don't contain relevant information, please state that clearly and provide a general answer."""
        
        final_prompt = system_prompt if system_prompt else default_system_prompt
        prompt_parts.append(final_prompt.format(query=query))
        
        # 生成回應
        response = model.generate_content(
            prompt_parts,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_output_tokens,
                temperature=0.7,
            )
        )
        
        # 從回應中提取 token 使用量
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        if hasattr(response, 'usage_metadata'):
            prompt_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
            completion_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
            total_tokens = getattr(response.usage_metadata, 'total_token_count', 0)
        
        self.logger.info(
            f"Query successful with model {model_name}, "
            f"files: {files_used}, tokens: {total_tokens}"
        )
        
        return {
            'success': True,
            'response': response.text,
            'model_used': model_name,
            'files_used': files_used,
            'system_prompt_used': system_prompt if system_prompt else default_system_prompt.format(query=query),
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'total_tokens': total_tokens
        }
        
    except Exception as e:
        self.logger.error(f"Query failed with model {model_name}: {e}", exc_info=True)
        return {
            'success': False,
            'response': f"Query failed: {str(e)}",
            'model_used': model_name,
            'files_used': 0,
            'error': str(e)
        }
```

#### B. 串流查詢 (第 261-391 行)

```python
def query_stream(
    self, 
    query: str, 
    model_name: Optional[str] = None, 
    selected_file_names: Optional[List[str]] = None,
    system_prompt: Optional[str] = None,
    max_output_tokens: int = MAX_OUTPUT_TOKENS
) -> Generator[Dict[str, Any], None, None]:
    """
    使用串流回應查詢模型 - 即時產生回應塊
    
    Args:
        query: 用戶查詢文字
        model_name: 使用的模型（預設為 DEFAULT_MODEL）
        selected_file_names: 要包含在上下文中的文件名稱列表
        system_prompt: 自訂系統提示詞（None 則使用預設）
        max_output_tokens: 回應的最大 token 數
        
    Yields:
        Dict 包含回應塊資料或錯誤訊息
    """
    if not model_name:
        model_name = DEFAULT_MODEL
    
    # 驗證模型
    available_model_ids = [m['model_id'] for m in self.get_available_models()]
    if model_name not in available_model_ids:
        self.logger.error(f"Unsupported model in stream: {model_name}")
        yield {
            'type': 'error',
            'error': f"Unsupported model: {model_name}",
            'model_used': model_name
        }
        return
    
    try:
        model = genai.GenerativeModel(model_name)
        
        # 建立提示詞內容
        prompt_parts = []
        
        # 加入選定的文件
        files_used = 0
        if selected_file_names:
            all_files = self.list_files()
            file_map = {f['name']: f for f in all_files}
            
            for file_name in selected_file_names:
                if file_name in file_map:
                    # 加入文件參考
                    file_obj = genai.get_file(file_name)
                    prompt_parts.append(file_obj)
                    files_used += 1
        
        # 加入實際查詢與自訂或預設系統提示詞
        default_system_prompt = """Based on the provided document content, please answer the following question:

{query}

If the documents don't contain relevant information, please state that clearly and provide a general answer."""
        
        final_prompt = system_prompt if system_prompt else default_system_prompt
        prompt_parts.append(final_prompt.format(query=query))
        
        # 生成串流回應
        response_stream = model.generate_content(
            prompt_parts,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_output_tokens,
                temperature=0.7,
            ),
            stream=True  # 啟用串流
        )
        
        # 即時產生回應塊
        full_response = ""
        for chunk in response_stream:
            if chunk.text:
                full_response += chunk.text
                yield {
                    'type': 'chunk',
                    'text': chunk.text,
                    'model_used': model_name,
                    'files_used': files_used
                }
        
        # 發送完成訊息與 token 使用量
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        if hasattr(response_stream, 'usage_metadata'):
            prompt_tokens = getattr(response_stream.usage_metadata, 'prompt_token_count', 0)
            completion_tokens = getattr(response_stream.usage_metadata, 'candidates_token_count', 0)
            total_tokens = getattr(response_stream.usage_metadata, 'total_token_count', 0)
        
        self.logger.info(
            f"Streaming query completed with model {model_name}, tokens: {total_tokens}"
        )
        
        yield {
            'type': 'complete',
            'full_response': full_response,
            'system_prompt_used': system_prompt if system_prompt else default_system_prompt.format(query=query),
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'total_tokens': total_tokens
        }
        
    except Exception as e:
        self.logger.error(f"Streaming query failed with model {model_name}: {e}", exc_info=True)
        yield {
            'type': 'error',
            'error': str(e),
            'model_used': model_name
        }
```

**重點說明：**
1. **RAG 模式**：結合文件上下文與用戶查詢
2. **System Prompt**：支援自訂提示詞，預設使用基於文件的提示
3. **Token 統計**：記錄 prompt、completion 和 total tokens
4. **串流支援**：`query_stream()` 使用 generator 即時回傳內容
5. **錯誤處理**：完整的異常捕捉與日誌記錄

---

## 5. Embedding 嵌入向量

### 5.1 生成文本 Embedding

```python
import google.generativeai as genai

# 生成文檔 embedding
result = genai.embed_content(
    model='models/text-embedding-004',
    content='機器學習是人工智慧的一個分支',
    task_type='retrieval_document'  # 用於文檔儲存
)

embedding = result['embedding']  # 768 維向量
print(f"Embedding 維度: {len(embedding)}")
```

### 5.2 生成查詢 Embedding

```python
# 生成查詢 embedding（與文檔檢索相關）
result = genai.embed_content(
    model='models/text-embedding-004',
    content='什麼是機器學習？',
    task_type='retrieval_query'  # 用於查詢
)

query_embedding = result['embedding']
```

### 5.3 Task Types 說明

| Task Type | 用途 | 說明 |
|-----------|------|------|
| `retrieval_document` | 文檔儲存 | 將文檔轉換為向量並儲存在資料庫 |
| `retrieval_query` | 查詢檢索 | 將查詢轉換為向量用於搜尋 |
| `semantic_similarity` | 語義相似度 | 計算兩個文本的相似度 |
| `classification` | 分類 | 文本分類任務 |
| `clustering` | 聚類 | 文本聚類分析 |

### 5.4 計算餘弦相似度

```python
import numpy as np

def cosine_similarity(vec1, vec2):
    """計算兩個向量的餘弦相似度"""
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    
    dot_product = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)

# 使用範例
doc_embedding = genai.embed_content(
    model='models/text-embedding-004',
    content='Python 是一種程式語言',
    task_type='retrieval_document'
)['embedding']

query_embedding = genai.embed_content(
    model='models/text-embedding-004',
    content='什麼是 Python？',
    task_type='retrieval_query'
)['embedding']

similarity = cosine_similarity(doc_embedding, query_embedding)
print(f"相似度: {similarity:.4f}")
```

### 📌 專案實作參考

**檔案：** `backend/services/embedding_service.py`

```python
import google.generativeai as genai
from typing import List, Optional
import numpy as np
from backend.config import EMBEDDING_MODEL
from backend.exceptions import EmbeddingError
from backend.utils.logger import get_logger


class EmbeddingService:
    """使用 Gemini API 生成和管理 embeddings 的服務"""
    
    def __init__(self, api_key: str):
        """
        初始化 embedding 服務
        
        Args:
            api_key: Google API key 用於驗證
        """
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.logger = get_logger(__name__)
        genai.configure(api_key=api_key)
        self.embedding_model = EMBEDDING_MODEL  # models/text-embedding-004
        
        self.logger.info(f"EmbeddingService initialized with model: {self.embedding_model}")
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        為給定文本生成 embedding 向量
        
        Args:
            text: 要嵌入的文本
            
        Returns:
            表示 embedding 向量的浮點數列表（768 維）
            
        Raises:
            EmbeddingError: 如果 embedding 生成失敗
        """
        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=text,
                task_type="retrieval_document"  # 用於文檔儲存
            )
            return result['embedding']
        except Exception as e:
            self.logger.error(f"Embedding generation error: {e}", exc_info=True)
            raise EmbeddingError(f"Failed to generate embedding: {e}")
    
    def generate_query_embedding(self, query: str) -> List[float]:
        """
        為搜尋查詢生成 embedding 向量
        
        Args:
            query: 搜尋查詢文本
            
        Returns:
            表示 embedding 向量的浮點數列表（768 維）
            
        Raises:
            EmbeddingError: 如果 embedding 生成失敗
        """
        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=query,
                task_type="retrieval_query"  # 用於查詢檢索
            )
            return result['embedding']
        except Exception as e:
            self.logger.error(f"Query embedding generation error: {e}", exc_info=True)
            raise EmbeddingError(f"Failed to generate query embedding: {e}")
    
    def batch_generate_embeddings(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        為多個文本生成 embeddings
        
        Args:
            texts: 要嵌入的文本列表
            
        Returns:
            embedding 向量列表
        """
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        計算兩個向量之間的餘弦相似度
        
        Args:
            vec1: 第一個向量
            vec2: 第二個向量
            
        Returns:
            餘弦相似度分數 (0-1)
        """
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
```

**重點說明：**
1. **不同 Task Types**：文檔使用 `retrieval_document`，查詢使用 `retrieval_query`
2. **錯誤處理**：使用自訂 `EmbeddingError` 異常
3. **批次處理**：支援批次生成 embeddings
4. **向量計算**：提供餘弦相似度靜態方法

---

## 6. 進階應用

### 6.1 向量相似度搜尋（RAG 核心）

本專案使用 PostgreSQL + pgvector 擴充實現向量搜尋。

**檔案：** `backend/services/document_service.py` (第 149-194 行)

```python
def search_similar_documents(
    self,
    query: str,
    top_k: int = 5,
    similarity_threshold: float = 0.7
) -> List[Tuple[Document, float]]:
    """
    使用向量相似度搜尋與查詢相似的文檔
    
    Args:
        query: 搜尋查詢文本
        top_k: 要返回的頂部結果數量
        similarity_threshold: 最小相似度分數 (0-1)
        
    Returns:
        (document, similarity_score) 元組列表
        
    Raises:
        EmbeddingError: 如果查詢 embedding 生成失敗
        DatabaseError: 如果搜尋失敗
    """
    try:
        # 生成查詢 embedding（會在失敗時拋出 EmbeddingError）
        query_embedding = self.embedding_service.generate_query_embedding(query)
        
        # 使用 pgvector 執行向量相似度搜尋
        # 使用餘弦距離 (1 - cosine similarity)
        results = self.db.query(
            Document,
            (1 - Document.embedding.cosine_distance(query_embedding)).label('similarity')
        ).filter(
            Document.embedding.isnot(None)
        ).order_by(
            text('similarity DESC')
        ).limit(top_k).all()
        
        # 依相似度閾值過濾
        filtered_results = [
            (doc, float(sim)) for doc, sim in results 
            if float(sim) >= similarity_threshold
        ]
        
        self.logger.info(f"Search found {len(filtered_results)} results for query")
        return filtered_results
    
    except EmbeddingError:
        raise
    except Exception as e:
        self.logger.error(f"Error searching documents: {e}", exc_info=True)
        raise DatabaseError(f"Failed to search documents: {e}")
```

**資料庫 Schema：** `backend/database/models.py` (第 7-30 行)

```python
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class Document(Base):
    """具有向量 embeddings 的文檔模型"""
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, index=True)
    gemini_file_name = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768))  # Gemini text-embedding-004 (768 維)
    file_size = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
```

**資料庫索引：** `backend/database/init.sql` (第 17 行)

```sql
-- 為向量搜尋建立 IVFFlat 索引
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**重點說明：**
1. **pgvector 擴充**：PostgreSQL 的向量搜尋擴充
2. **IVFFlat 索引**：加速向量搜尋（適合中等規模資料集）
3. **Cosine Distance**：`1 - cosine_similarity` 轉換為距離度量
4. **閾值過濾**：只返回相似度 ≥ threshold 的結果

### 6.2 完整 RAG 流程

```
使用者查詢 "誰有 CISSP 證照？"
        ↓
1. 生成查詢 embedding
   [EmbeddingService.generate_query_embedding()]
        ↓
2. 向量相似度搜尋
   [DocumentService.search_similar_documents()]
   → 找到 Top 5 最相關文檔
        ↓
3. 組合提示詞
   [RAGService.query()]
   → 文件內容 + 用戶查詢
        ↓
4. 呼叫 Gemini API
   [genai.GenerativeModel.generate_content()]
        ↓
5. 返回答案
   "Alice Johnson 和 Grace Lee 有 CISSP 證照"
```

### 6.3 系統提示詞設計

**預設提示詞：** `backend/services/rag_service.py` (第 221-225 行)

```python
default_system_prompt = """Based on the provided document content, please answer the following question:

{query}

If the documents don't contain relevant information, please state that clearly and provide a general answer."""
```

**自訂提示詞範例：**

```python
custom_prompt = """你是一位專業的人力資源分析師。
根據提供的員工資料，回答以下問題：

{query}

請以條列式呈現結果，並包含：
1. 符合條件的人員姓名
2. 相關證照與年資
3. 建議的職位或專案配置

如果資料中沒有相關資訊，請明確說明。"""

response = rag_service.query(
    query="誰適合擔任資安主管？",
    system_prompt=custom_prompt
)
```

---

## 7. 最佳實踐

### 7.1 成本優化

#### ❌ 不良做法（高成本）
```python
# 每次都傳送所有文件
all_files = rag_service.list_files()
all_file_names = [f['name'] for f in all_files]

response = rag_service.query(
    query="誰有 CISSP？",
    selected_file_names=all_file_names  # 傳送 20 個文件！
)
# Token 消耗: ~52,000
# 成本: ~$0.039/次
```

#### ✅ 良好做法（低成本）
```python
# 使用向量搜尋只取相關文件
similar_docs = doc_service.search_similar_documents(
    query="誰有 CISSP？",
    top_k=5,
    similarity_threshold=0.6
)

selected_files = [doc.gemini_file_name for doc, score in similar_docs]

response = rag_service.query(
    query="誰有 CISSP？",
    selected_file_names=selected_files  # 只傳送 5 個相關文件
)
# Token 消耗: ~8,000-13,000
# 成本: ~$0.006-0.01/次
# 節省: 75%
```

### 7.2 錯誤處理

```python
from backend.exceptions import ModelValidationError, EmbeddingError, DatabaseError

try:
    # 嘗試生成回應
    response = rag_service.query(
        query=user_query,
        model_name=selected_model
    )
    
    if response['success']:
        print(response['response'])
    else:
        print(f"查詢失敗: {response.get('error')}")
        
except ModelValidationError as e:
    print(f"模型不支援: {e}")
    
except EmbeddingError as e:
    print(f"Embedding 生成失敗: {e}")
    
except DatabaseError as e:
    print(f"資料庫錯誤: {e}")
    
except Exception as e:
    print(f"未預期的錯誤: {e}")
```

### 7.3 日誌記錄

專案使用結構化日誌記錄所有重要操作。

**檔案：** `backend/utils/logger.py`

```python
import logging
import sys

def get_logger(name: str) -> logging.Logger:
    """取得配置好的 logger"""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        
        logger.addHandler(handler)
    
    return logger
```

**使用範例：**

```python
from backend.utils.logger import get_logger

logger = get_logger(__name__)

logger.info("Starting document upload...")
logger.warning("Similarity threshold too low, adjusting...")
logger.error("API call failed", exc_info=True)  # 包含 stack trace
```

### 7.4 查詢日誌與統計

專案記錄每次查詢的詳細資訊用於分析。

**檔案：** `backend/services/document_service.py` (第 196-230 行)

```python
def log_query(
    self,
    query: str,
    model_used: str,
    files_used: int = 0,
    selected_files: Optional[List[str]] = None,
    system_prompt_used: Optional[str] = None,
    response_length: Optional[int] = None,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> QueryLog:
    """
    記錄查詢用於使用統計
    
    Raises:
        DatabaseError: 如果記錄失敗
    """
    try:
        log = QueryLog(
            query=query,
            model_used=model_used,
            files_used=files_used,
            selected_files=selected_files or [],
            system_prompt_used=system_prompt_used,
            response_length=response_length,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            success=success,
            error_message=error_message
        )
        
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        
        return log
    
    except Exception as e:
        self.db.rollback()
        self.logger.error(f"Error logging query: {e}", exc_info=True)
        raise DatabaseError(f"Failed to log query: {e}")
```

**統計分析：** 可查詢平均 token 使用量、成功率、熱門模型等。

---

## 8. 常見問題

### Q1: 如何選擇合適的模型？

**A:** 根據需求選擇：

| 需求 | 推薦模型 | 理由 |
|------|---------|------|
| 快速回應 + 低成本 | `gemini-1.5-flash` | 速度快，成本低 |
| 複雜推理 | `gemini-1.5-pro` | 推理能力強 |
| 測試新功能 | `gemini-2.0-flash-exp` | 最新實驗功能 |
| 生產環境 | `gemini-1.5-flash` | 穩定可靠 |

### Q2: Embedding 模型可以更換嗎？

**A:** 可以，但需注意：

1. **維度必須一致**：資料庫 schema 定義為 768 維
2. **需要重新生成**：所有文檔的 embedding 都要重新計算
3. **效能影響**：不同模型的語義理解能力不同

```python
# 如要更換模型
EMBEDDING_MODEL = "models/text-embedding-005"  # 假設未來推出

# 需要更新資料庫 schema
# ALTER TABLE documents ALTER COLUMN embedding TYPE vector(NEW_DIM);
```

### Q3: 相似度閾值如何設定？

**A:** 根據應用場景調整：

| 閾值 | 適用場景 | 說明 |
|------|---------|------|
| 0.9-1.0 | 精確匹配 | 只返回非常相關的文檔 |
| 0.7-0.9 | 一般檢索（推薦） | 平衡精確度與召回率 |
| 0.5-0.7 | 寬鬆檢索 | 可能包含弱相關文檔 |
| < 0.5 | 探索性搜尋 | 大量結果，需人工篩選 |

**專案預設：** `0.7`（在 `backend/config.py` 或前端設定）

### Q4: 文件上傳後多久可以搜尋？

**A:** 即時可搜尋。流程：

```
上傳文件 → 提取內容 → 生成 Embedding → 存入資料庫（with 向量）
                                                ↓
                                            立即可搜尋
```

時間：約 1-3 秒/文件（取決於文件大小）

### Q5: 如何處理大型文件？

**A:** 目前專案將整個文件作為一個文檔，建議優化：

#### 方案 A：文件分塊（Chunking）

```python
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """將文本切割成重疊的塊"""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    
    return chunks

# 使用
content = read_file('large_document.txt')
chunks = chunk_text(content, chunk_size=500)

for i, chunk in enumerate(chunks):
    doc_service.create_document(
        gemini_file_name=f'doc_chunk_{i}',
        display_name=f'Document Part {i+1}',
        content=chunk
    )
```

#### 方案 B：段落級檢索

```python
# 依段落分割
paragraphs = content.split('\n\n')

for i, para in enumerate(paragraphs):
    if para.strip():
        doc_service.create_document(
            gemini_file_name=f'doc_para_{i}',
            display_name=f'Paragraph {i+1}',
            content=para
        )
```

### Q6: API 配額超限怎麼辦？

**錯誤訊息：**
```
google.api_core.exceptions.ResourceExhausted: 429 Resource has been exhausted
```

**解決方案：**

1. **降低請求頻率**：加入 rate limiting
2. **使用其他模型**：某些模型有更高配額
3. **升級 API 方案**：聯絡 Google 增加配額
4. **實作快取機制**：相同查詢返回快取結果

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def cached_query(query_hash: str) -> str:
    """快取查詢結果"""
    # 實際查詢邏輯
    pass

# 使用
query_hash = hashlib.md5(user_query.encode()).hexdigest()
result = cached_query(query_hash)
```

### Q7: 如何監控 token 使用量？

**A:** 專案已實作完整的 token 追蹤。

```python
# 查詢時自動記錄
response = rag_service.query(query="...")

print(f"Prompt Tokens: {response['prompt_tokens']}")
print(f"Completion Tokens: {response['completion_tokens']}")
print(f"Total Tokens: {response['total_tokens']}")

# 查看統計
stats = doc_service.get_query_stats()
print(f"Total Tokens Used: {stats.total_tokens_used}")
print(f"Average per Query: {stats.avg_tokens_per_query}")
```

### Q8: 向量搜尋效能如何優化？

**A:** 多種優化策略：

#### 1. 資料庫索引優化

```sql
-- 當前使用 IVFFlat（適合 < 100 萬筆）
CREATE INDEX documents_embedding_idx 
ON documents USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- 大規模資料（> 100 萬筆）改用 HNSW
CREATE INDEX documents_embedding_idx 
ON documents USING hnsw (embedding vector_cosine_ops);
```

#### 2. 調整 lists 參數

```sql
-- lists = sqrt(總文檔數) 通常是最佳值
-- 1000 筆文檔 → lists = 32
-- 10000 筆文檔 → lists = 100
-- 100000 筆文檔 → lists = 316
```

#### 3. 定期 VACUUM

```sql
-- 定期清理與重建索引
VACUUM ANALYZE documents;
REINDEX INDEX documents_embedding_idx;
```

---

## 📖 延伸閱讀

### 官方文件
- [Google AI Python SDK](https://ai.google.dev/tutorials/python_quickstart)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Text Embeddings Guide](https://ai.google.dev/gemini-api/docs/embeddings)

### 相關技術
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [RAG (Retrieval-Augmented Generation)](https://arxiv.org/abs/2005.11401)
- [Vector Search Best Practices](https://www.pinecone.io/learn/vector-search/)

### 專案相關檔案
```
backend/
├── services/
│   ├── rag_service.py          # Gemini API 整合
│   ├── embedding_service.py    # Embedding 生成
│   └── document_service.py     # 向量搜尋
├── routers/
│   ├── chat.py                 # 聊天 API 端點
│   └── search.py               # 搜尋 API 端點
├── database/
│   ├── models.py               # 資料庫 schema
│   └── init.sql                # 初始化 SQL
└── config.py                   # 配置常數
```

---

## 🎯 總結

本文件涵蓋了 Google Generative AI SDK 的核心功能，並結合實際專案展示：

✅ **基礎設置**：API key 配置與初始化  
✅ **模型管理**：動態載入與選擇模型  
✅ **文件管理**：上傳、列表、刪除  
✅ **內容生成**：普通與串流查詢  
✅ **Embedding**：文檔與查詢向量化  
✅ **向量搜尋**：PostgreSQL + pgvector  
✅ **RAG 應用**：完整的檢索增強生成流程  
✅ **最佳實踐**：成本優化、錯誤處理、日誌記錄  

希望這份教學能幫助您快速上手 Gemini API 並應用到實際專案中！
