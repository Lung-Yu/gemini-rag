import google.generativeai as genai
import os
from typing import List, Optional


class RAGService:
    """Service for managing RAG operations with Google Gemini API"""
    
    # Available Gemini models
import google.generativeai as genai
from typing import List, Optional, Dict, Any
import os
from functools import lru_cache

# Cache for available models to avoid repeated API calls
_cached_models = None    DEFAULT_MODEL = "gemini-2.5-flash"
    
    def __init__(self):
        """初始化 RAG 服務"""
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("未找到 GOOGLE_API_KEY 環境變數")
        
        genai.configure(api_key=api_key)
        print(f"✓ API Key 已載入: {api_key[:10]}...")
        
        # Initialize available models cache
        self._load_available_models()
    
    def list_files(self) -> List[dict]:
        """List all uploaded files"""
        files = []
        for file in genai.list_files():
            files.append({
                "name": file.name,
                "display_name": file.display_name,
                "state": file.state.name,
                "uri": file.uri
            })
        return files
    
    def upload_file(self, file_path: str) -> Optional[dict]:
        """Upload a file to Gemini"""
        try:
            uploaded_file = genai.upload_file(path=file_path)
            return {
                "name": uploaded_file.name,
                "display_name": uploaded_file.display_name,
                "uri": uploaded_file.uri,
                "state": uploaded_file.state.name
            }
        except Exception as e:
            raise Exception(f"上傳檔案錯誤: {str(e)}")
    
    def delete_file(self, file_name: str) -> bool:
        """Delete a specific file by name"""
        try:
            for file in genai.list_files():
                if file.name == file_name or file.display_name == file_name:
                    genai.delete_file(file)
                    return True
            return False
        except Exception as e:
            raise Exception(f"刪除檔案錯誤: {str(e)}")
    
    def clear_all_files(self) -> int:
        """Delete all uploaded files"""
        count = 0
        for file in genai.list_files():
            genai.delete_file(file)
            count += 1
        return count
    
    def query(
        self, 
        prompt: str, 
        model_name: Optional[str] = None,
        selected_file_names: Optional[List[str]] = None
    ) -> dict:
        """
        Query the RAG system with a prompt
        
        Args:
            prompt: User query
            model_name: Model to use (default: gemini-2.5-flash)
            selected_file_names: List of specific file names to query (None = all files)
        """
        try:
        # Validate model
        available_model_ids = [m['model_id'] for m in self.get_available_models()]
        if model_name not in available_model_ids:
            raise ValueError(f"不支援的模型: {model_name}。可用模型: {', '.join(available_model_ids)}")            model_to_use = model_name or self.DEFAULT_MODEL
            model = genai.GenerativeModel(model_to_use)
            
            # Get all files
            all_files = list(genai.list_files())
            
            if not all_files:
                return {
                    "success": False,
                    "message": "沒有已上傳的檔案可供查詢",
                    "response": None
                }
            
            # Filter files if specific files are selected
            if selected_file_names:
                files_to_use = [
                    f for f in all_files 
                    if f.name in selected_file_names or f.display_name in selected_file_names
                ]
                
                if not files_to_use:
                    return {
                        "success": False,
                        "message": "找不到指定的檔案",
                        "response": None
                    }
            else:
                files_to_use = all_files
            
            # Generate response
            response = model.generate_content([
                prompt,
                *files_to_use
            ])
            
            return {
                "success": True,
                "message": "查詢成功",
                "response": response.text,
                "files_used": len(files_to_use),
                "model_used": model_to_use
            }
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                return {
                    "success": False,
                    "message": "API 配額已達上限，請等待約 60 秒後再試",
                    "response": None,
                    "error_type": "rate_limit"
                }
            else:
                return {
                    "success": False,
                    "message": f"查詢錯誤: {error_msg}",
                    "response": None,
                    "error_type": "general"
                }
    
    @classmethod
    @lru_cache(maxsize=1)
    def _load_available_models(self) -> List[Dict[str, str]]:
        """從 Google AI API 獲取可用模型列表"""
        global _cached_models
        if _cached_models is not None:
            return _cached_models
            
        try:
            # 獲取所有模型
            models = genai.list_models()
            available_models = []
            
            for model in models:
                # 只選擇支持 generateContent 的 Gemini 模型
                if ('generateContent' in model.supported_generation_methods and 
                    'gemini' in model.name.lower()):
                    
                    model_id = model.name.replace('models/', '')
                    
                    # 根據模型名稱設置描述
                    description = self._get_model_description(model_id)
                    
                    available_models.append({
                        'model_id': model_id,
                        'name': model.display_name or model_id,
                        'description': description
                    })
            
            # 按名稱排序，優先顯示最新版本
            available_models.sort(key=lambda x: (x['model_id'].replace('-', ''), x['model_id']))
            
            _cached_models = available_models
            print(f"✓ 載入 {len(available_models)} 個可用模型")
            return available_models
            
        except Exception as e:
            print(f"⚠️ 無法載入模型列表: {e}")
            # 回退到基本模型列表
            fallback_models = [
                {
                    'model_id': 'gemini-1.5-flash',
                    'name': 'Gemini 1.5 Flash',
                    'description': '快速模型 - 適合日常對話'
                }
            ]
            _cached_models = fallback_models
            return fallback_models
    
    def _get_model_description(self, model_id: str) -> str:
        """根據模型 ID 返回描述"""
        descriptions = {
            'gemini-2.0-flash-exp': '實驗版最新模型 - 最佳性能',
            'gemini-1.5-pro': '專業版 - 複雜推理分析',
            'gemini-1.5-flash': '快速版 - 平衡速度與品質',
            'gemini-1.0-pro': '標準版 - 穩定可靠'
        }
        
        # 嘗試精確匹配
        if model_id in descriptions:
            return descriptions[model_id]
            
        # 模糊匹配
        for key, desc in descriptions.items():
            if key in model_id:
                return desc
                
        # 默認描述
        if 'pro' in model_id:
            return '專業版模型 - 高品質輸出'
        elif 'flash' in model_id:
            return '快速模型 - 高效回應'
        else:
            return '標準 Gemini 模型'
    
    def get_available_models(self) -> List[Dict[str, str]]:
        """獲取可用的模型列表"""
        return self._load_available_models()
    
    def upload_folder(self, folder_path: str) -> dict:
        """Upload all files from a folder"""
        uploaded = []
        failed = []
        
        if not os.path.exists(folder_path):
            raise Exception(f"資料夾不存在: {folder_path}")
        
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                try:
                    result = self.upload_file(file_path)
                    uploaded.append(result)
                except Exception as e:
                    failed.append({"filename": filename, "error": str(e)})
        
        return {
            "uploaded_count": len(uploaded),
            "failed_count": len(failed),
            "uploaded": uploaded,
            "failed": failed
        }
