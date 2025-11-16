import google.generativeai as genai
import os
from typing import List, Optional


class RAGService:
    """Service for managing RAG operations with Google Gemini API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")
    
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
    
    def query(self, prompt: str) -> dict:
        """Query the RAG system with a prompt"""
        try:
            files = list(genai.list_files())
            
            if not files:
                return {
                    "success": False,
                    "message": "沒有已上傳的檔案可供查詢",
                    "response": None
                }
            
            response = self.model.generate_content([
                prompt,
                *files
            ])
            
            return {
                "success": True,
                "message": "查詢成功",
                "response": response.text,
                "files_used": len(files)
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
