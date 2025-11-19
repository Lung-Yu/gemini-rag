import google.generativeai as genai
from google import genai as genai_client
from typing import List, Optional, Dict, Any
import os
from functools import lru_cache

# Cache for available models to avoid repeated API calls
_cached_models = None


class RAGService:
    """Service for managing RAG operations with Google Gemini API"""
    
    DEFAULT_MODEL = "gemini-1.5-flash"
    
    def __init__(self):
        """初始化 RAG 服務"""
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("未找到 GOOGLE_API_KEY 環境變數")
        
        # Configure legacy API for compatibility
        genai.configure(api_key=api_key)
        
        # Initialize new client for model listing
        self.client = genai_client.Client(api_key=api_key)
        
        print(f"✓ API Key 已載入: {api_key[:10]}...")
        
        # Initialize available models cache
        self._load_available_models()
    
    @lru_cache(maxsize=1)
    def _load_available_models(self) -> List[Dict[str, str]]:
        """從 Google AI API 獲取可用模型列表"""
        global _cached_models
        if _cached_models is not None:
            return _cached_models
            
        try:
            # 使用新的 Client API 獲取所有模型
            available_models = []
            
            for model in self.client.models.list():
                # 只選擇支持 generateContent 的 Gemini 模型
                if 'generateContent' in model.supported_actions and 'gemini' in model.name.lower():
                    
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
            import traceback
            traceback.print_exc()
            
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
    
    def list_files(self) -> List[dict]:
        """List all uploaded files"""
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
            print(f"Error listing files: {e}")
            return []
    
    def upload_file(self, file_path: str, display_name: Optional[str] = None) -> dict:
        """Upload a file to Gemini"""
        try:
            uploaded_file = genai.upload_file(
                path=file_path,
                display_name=display_name
            )
            
            return {
                'name': uploaded_file.name,
                'display_name': uploaded_file.display_name,
                'uri': uploaded_file.uri if hasattr(uploaded_file, 'uri') else None,
                'size_bytes': uploaded_file.size_bytes,
                'create_time': uploaded_file.create_time.isoformat() if uploaded_file.create_time else None,
                'state': uploaded_file.state.name if hasattr(uploaded_file.state, 'name') else 'ACTIVE'
            }
        except Exception as e:
            raise Exception(f"Failed to upload file: {e}")
    
    def delete_file(self, file_name: str) -> bool:
        """Delete a file from Gemini"""
        try:
            genai.delete_file(file_name)
            return True
        except Exception as e:
            print(f"Error deleting file {file_name}: {e}")
            return False
    
    def clear_all_files(self) -> int:
        """Clear all uploaded files"""
        files = self.list_files()
        count = 0
        for file in files:
            if self.delete_file(file['name']):
                count += 1
        return count
    
    def query(self, 
              query: str, 
              model_name: str = None, 
              selected_file_names: List[str] = None,
              system_prompt: str = None,
              max_output_tokens: int = 8192) -> dict:
        """Query the model with optional file context and custom system prompt"""
        if not model_name:
            model_name = self.DEFAULT_MODEL
        
        # Validate model
        available_model_ids = [m['model_id'] for m in self.get_available_models()]
        if model_name not in available_model_ids:
            raise ValueError(f"不支持的模型: {model_name}。可用模型: {', '.join(available_model_ids)}")
        
        try:
            model = genai.GenerativeModel(model_name)
            
            # Build prompt content
            prompt_parts = []
            
            # Add files if selected
            files_used = 0
            if selected_file_names:
                all_files = self.list_files()
                file_map = {f['name']: f for f in all_files}
                
                for file_name in selected_file_names:
                    if file_name in file_map:
                        # Add file reference
                        file_obj = genai.get_file(file_name)
                        prompt_parts.append(file_obj)
                        files_used += 1
            
            # Add the actual query with custom or default system prompt
            default_system_prompt = """基於提供的文件內容，請回答以下問題：

{query}

如果文件中沒有相關信息，請明確說明並提供一般性的回答。"""
            
            final_prompt = system_prompt if system_prompt else default_system_prompt
            prompt_parts.append(final_prompt.format(query=query))
            
            # Generate response
            response = model.generate_content(
                prompt_parts,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_output_tokens,
                    temperature=0.7,
                )
            )
            
            # Extract token usage from response
            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0
            if hasattr(response, 'usage_metadata'):
                prompt_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
                completion_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
                total_tokens = getattr(response.usage_metadata, 'total_token_count', 0)
            
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
            return {
                'success': False,
                'response': f"查詢失敗: {str(e)}",
                'model_used': model_name,
                'files_used': 0,
                'error': str(e)
            }
    
    def query_stream(self, 
                     query: str, 
                     model_name: str = None, 
                     selected_file_names: List[str] = None,
                     system_prompt: str = None,
                     max_output_tokens: int = 8192):
        """Query the model with streaming response - yields chunks as they arrive"""
        if not model_name:
            model_name = self.DEFAULT_MODEL
        
        # Validate model
        available_model_ids = [m['model_id'] for m in self.get_available_models()]
        if model_name not in available_model_ids:
            yield {
                'type': 'error',
                'error': f"不支持的模型: {model_name}",
                'model_used': model_name
            }
            return
        
        try:
            model = genai.GenerativeModel(model_name)
            
            # Build prompt content
            prompt_parts = []
            
            # Add files if selected
            files_used = 0
            if selected_file_names:
                all_files = self.list_files()
                file_map = {f['name']: f for f in all_files}
                
                for file_name in selected_file_names:
                    if file_name in file_map:
                        # Add file reference
                        file_obj = genai.get_file(file_name)
                        prompt_parts.append(file_obj)
                        files_used += 1
            
            # Add the actual query with custom or default system prompt
            default_system_prompt = """基於提供的文件內容，請回答以下問題：

{query}

如果文件中沒有相關信息，請明確說明並提供一般性的回答。"""
            
            final_prompt = system_prompt if system_prompt else default_system_prompt
            prompt_parts.append(final_prompt.format(query=query))
            
            # Generate streaming response
            response_stream = model.generate_content(
                prompt_parts,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_output_tokens,
                    temperature=0.7,
                ),
                stream=True  # Enable streaming
            )
            
            # Yield chunks as they arrive
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
            
            # Send completion with token usage
            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0
            if hasattr(response_stream, 'usage_metadata'):
                prompt_tokens = getattr(response_stream.usage_metadata, 'prompt_token_count', 0)
                completion_tokens = getattr(response_stream.usage_metadata, 'candidates_token_count', 0)
                total_tokens = getattr(response_stream.usage_metadata, 'total_token_count', 0)
            
            yield {
                'type': 'complete',
                'full_response': full_response,
                'system_prompt_used': system_prompt if system_prompt else default_system_prompt.format(query=query),
                'prompt_tokens': prompt_tokens,
                'completion_tokens': completion_tokens,
                'total_tokens': total_tokens
            }
            
        except Exception as e:
            yield {
                'type': 'error',
                'error': str(e),
                'model_used': model_name
            }


# Global instance
rag_service = RAGService()