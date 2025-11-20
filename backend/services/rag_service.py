import google.generativeai as genai
from google import genai as genai_client
from typing import List, Optional, Dict, Any, Generator
import os
from backend.config import DEFAULT_MODEL, MAX_OUTPUT_TOKENS
from backend.exceptions import ModelValidationError, FileUploadError
from backend.utils.logger import get_logger


class RAGService:
    """Service for managing RAG operations with Google Gemini API"""
    
    def __init__(self, api_key: str):
        """
        Initialize RAG service
        
        Args:
            api_key: Google API key for authentication
        """
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.logger = get_logger(__name__)
        
        # Configure legacy API for compatibility
        genai.configure(api_key=api_key)
        
        # Initialize new client for model listing
        self.client = genai_client.Client(api_key=api_key)
        
        self.logger.info(f"API Key loaded: {api_key[:10]}...")
        
        # Initialize available models
        self._load_available_models()
    
    def _load_available_models(self) -> List[Dict[str, str]]:
        """Load available models from Google AI API"""
        try:
            available_models = []
            
            for model in self.client.models.list():
                # Only select Gemini models that support generateContent
                if 'generateContent' in model.supported_actions and 'gemini' in model.name.lower():
                    
                    model_id = model.name.replace('models/', '')
                    description = self._get_model_description(model_id)
                    
                    available_models.append({
                        'model_id': model_id,
                        'name': model.display_name or model_id,
                        'description': description
                    })
            
            # Sort by name, prioritize latest versions
            available_models.sort(key=lambda x: (x['model_id'].replace('-', ''), x['model_id']))
            
            self.logger.info(f"Loaded {len(available_models)} available models")
            return available_models
            
        except Exception as e:
            self.logger.warning(f"Could not load model list: {e}", exc_info=True)
            
            # Fallback to basic model list
            fallback_models = [
                {
                    'model_id': 'gemini-1.5-flash',
                    'name': 'Gemini 1.5 Flash',
                    'description': 'Fast model - Balanced speed and quality'
                }
            ]
            return fallback_models
    
    def _get_model_description(self, model_id: str) -> str:
        """Get model description based on model ID"""
        descriptions = {
            'gemini-2.0-flash-exp': 'Latest experimental model - Best performance',
            'gemini-1.5-pro': 'Pro version - Complex reasoning',
            'gemini-1.5-flash': 'Flash version - Balanced speed and quality',
            'gemini-1.0-pro': 'Standard version - Stable and reliable'
        }
        
        # Try exact match
        if model_id in descriptions:
            return descriptions[model_id]
            
        # Fuzzy match
        for key, desc in descriptions.items():
            if key in model_id:
                return desc
                
        # Default description
        if 'pro' in model_id:
            return 'Pro model - High quality output'
        elif 'flash' in model_id:
            return 'Fast model - Efficient response'
        else:
            return 'Standard Gemini model'
    
    def get_available_models(self) -> List[Dict[str, str]]:
        """Get list of available models"""
        return self._load_available_models()
    
    def list_files(self) -> List[Dict[str, Any]]:
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
            self.logger.error(f"Error listing files: {e}")
            return []
    
    def upload_file(self, file_path: str, display_name: Optional[str] = None) -> Dict[str, Any]:
        """Upload a file to Gemini"""
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
    
    def delete_file(self, file_name: str) -> bool:
        """Delete a file from Gemini"""
        try:
            genai.delete_file(file_name)
            self.logger.info(f"Deleted file: {file_name}")
            return True
        except Exception as e:
            self.logger.error(f"Error deleting file {file_name}: {e}")
            return False
    
    def clear_all_files(self) -> int:
        """Clear all uploaded files"""
        files = self.list_files()
        count = 0
        for file in files:
            if self.delete_file(file['name']):
                count += 1
        self.logger.info(f"Cleared {count} files")
        return count
    
    def query(
        self, 
        query: str, 
        model_name: Optional[str] = None, 
        selected_file_names: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
        max_output_tokens: int = MAX_OUTPUT_TOKENS
    ) -> Dict[str, Any]:
        """
        Query the model with optional file context and custom system prompt
        
        Args:
            query: User query text
            model_name: Model to use (defaults to DEFAULT_MODEL)
            selected_file_names: List of file names to include as context
            system_prompt: Custom system prompt (uses default if None)
            max_output_tokens: Maximum tokens in response
            
        Returns:
            Dict containing success status, response, and metadata
            
        Raises:
            ModelValidationError: If model is not available
        """
        if not model_name:
            model_name = DEFAULT_MODEL
        
        # Validate model
        available_model_ids = [m['model_id'] for m in self.get_available_models()]
        if model_name not in available_model_ids:
            raise ModelValidationError(
                f"Unsupported model: {model_name}. Available models: {', '.join(available_model_ids)}"
            )
        
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
            default_system_prompt = """The documents provided have been sorted by relevance to your question (most relevant first).

Please carefully read through all document contents to find information that answers the following question:

{query}

If you find relevant information, please cite the specific document name(s) in your answer. If none of the documents contain relevant information, please state that clearly."""
            
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
    
    def query_stream(
        self, 
        query: str, 
        model_name: Optional[str] = None, 
        selected_file_names: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
        max_output_tokens: int = MAX_OUTPUT_TOKENS
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Query the model with streaming response - yields chunks as they arrive
        
        Args:
            query: User query text
            model_name: Model to use (defaults to DEFAULT_MODEL)
            selected_file_names: List of file names to include as context
            system_prompt: Custom system prompt (uses default if None)
            max_output_tokens: Maximum tokens in response
            
        Yields:
            Dict containing chunk data or error information
        """
        if not model_name:
            model_name = DEFAULT_MODEL
        
        # Validate model
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
            default_system_prompt = """The documents provided have been sorted by relevance to your question (most relevant first).

Please carefully read through all document contents to find information that answers the following question:

{query}

If you find relevant information, please cite the specific document name(s) in your answer. If none of the documents contain relevant information, please state that clearly."""
            
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
    
    def upload_folder(self, folder_path: str) -> Dict[str, Any]:
        """
        Upload all files from a folder to Gemini
        
        Args:
            folder_path: Path to folder containing files to upload
            
        Returns:
            Dict containing upload results
        """
        import glob
        
        uploaded = []
        failed = []
        
        try:
            # Get all text files from folder
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