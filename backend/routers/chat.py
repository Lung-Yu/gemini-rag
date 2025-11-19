from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.models.schemas import ChatRequest, ChatResponse, ModelsResponse, ModelInfo
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
import os
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize services - now using global instances
from backend.services.rag_service import rag_service

API_KEY = os.environ.get('GOOGLE_API_KEY')
if not API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

embedding_service = EmbeddingService()


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Send a message and get RAG-based response with model selection"""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="訊息不能為空")
    
    # Validate model
    available_models = rag_service.get_available_models()
    available_model_ids = [m['model_id'] for m in available_models]
    
    if request.model not in available_model_ids:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的模型: {request.model}。請從模型列表中選擇可用的模型。"
        )
    
    # Query with specified model, files, and system prompt
    result = rag_service.query(
        query=request.message,
        model_name=request.model,
        selected_file_names=request.selected_files,
        system_prompt=request.system_prompt
    )
    
    # Log the query
    doc_service = DocumentService(db, embedding_service)
    try:
        doc_service.log_query(
            query=request.message,
            model_used=result.get("model_used", request.model),
            files_used=result.get("files_used", 0),
            selected_files=request.selected_files,
            system_prompt_used=result.get("system_prompt_used"),
            response_length=len(result.get("response", "")) if result.get("response") else 0,
            prompt_tokens=result.get("prompt_tokens"),
            completion_tokens=result.get("completion_tokens"),
            total_tokens=result.get("total_tokens"),
            success=result["success"],
            error_message=result.get("message") if not result["success"] else None
        )
    except Exception as log_error:
        print(f"⚠️ 記錄查詢失敗: {log_error}")
    
    if not result["success"]:
        if result.get("error_type") == "rate_limit":
            raise HTTPException(status_code=429, detail=result.get("message", "Rate limit exceeded"))
        raise HTTPException(status_code=500, detail=result.get("response", "查詢失敗"))
    
    return ChatResponse(
        success=result["success"],
        message=result.get("response", ""),
        response=result.get("response", ""),
        model_used=result.get("model_used"),
        files_used=result.get("files_used", 0),
        prompt_tokens=result.get("prompt_tokens"),
        completion_tokens=result.get("completion_tokens"),
        total_tokens=result.get("total_tokens")
    )


@router.get("/models", response_model=ModelsResponse)
async def get_available_models():
    """Get list of available Gemini models"""
    models = rag_service.get_available_models()
    
    model_list = [
        ModelInfo(
            model_id=model["model_id"],
            name=model["name"],
            description=model["description"]
        )
        for model in models
    ]
    
    return ModelsResponse(models=model_list)


@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat with streaming responses"""
    await websocket.accept()
    
    # Get database session for this connection
    db = next(get_db())
    doc_service = DocumentService(db, embedding_service)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Handle heartbeat ping/pong
            if data == 'ping':
                await websocket.send_text('pong')
                continue
            
            print(f"📨 WebSocket received raw data: {data[:100]}...")  # Debug log
            request_data = json.loads(data)
            
            message = request_data.get('message', '').strip()
            model = request_data.get('model', 'gemini-1.5-flash')
            selected_files = request_data.get('selected_files', None)
            system_prompt = request_data.get('system_prompt', None)
            
            if not message:
                await websocket.send_json({
                    'type': 'error',
                    'message': '訊息不能為空'
                })
                continue
            
            try:
                # Send status update
                await websocket.send_json({
                    'type': 'status',
                    'message': '正在處理您的請求...'
                })
                
                # Use streaming query for real-time response
                full_response = ""
                prompt_tokens = 0
                completion_tokens = 0
                total_tokens = 0
                files_used = 0
                system_prompt_used = None
                
                for chunk_data in rag_service.query_stream(
                    query=message,
                    model_name=model,
                    selected_file_names=selected_files,
                    system_prompt=system_prompt
                ):
                    if chunk_data['type'] == 'chunk':
                        # Send each chunk to client immediately
                        await websocket.send_json({
                            'type': 'stream',
                            'chunk': chunk_data['text'],
                            'model_used': chunk_data['model_used'],
                            'files_used': chunk_data['files_used']
                        })
                        full_response += chunk_data['text']
                        files_used = chunk_data['files_used']
                        
                    elif chunk_data['type'] == 'complete':
                        # Store completion metadata
                        prompt_tokens = chunk_data.get('prompt_tokens', 0)
                        completion_tokens = chunk_data.get('completion_tokens', 0)
                        total_tokens = chunk_data.get('total_tokens', 0)
                        system_prompt_used = chunk_data.get('system_prompt_used')
                        
                    elif chunk_data['type'] == 'error':
                        # Handle streaming error
                        await websocket.send_json({
                            'type': 'error',
                            'message': f'發生錯誤: {chunk_data["error"]}'
                        })
                        
                        # Log failed query
                        try:
                            doc_service.log_query(
                                query=message,
                                model_used=model,
                                success=False,
                                files_used=0,
                                selected_files=selected_files,
                                system_prompt_used=system_prompt,
                                error_message=chunk_data['error']
                            )
                        except Exception as log_error:
                            print(f"⚠️ 記錄查詢失敗: {log_error}")
                        break
                
                # If we got a full response, send completion signal
                if full_response:
                    await websocket.send_json({
                        'type': 'complete',
                        'success': True,
                        'full_response': full_response,
                        'model_used': model,
                        'files_used': files_used,
                        'prompt_tokens': prompt_tokens,
                        'completion_tokens': completion_tokens,
                        'total_tokens': total_tokens
                    })
                    
                    # Log successful query
                    try:
                        doc_service.log_query(
                            query=message,
                            model_used=model,
                            success=True,
                            files_used=files_used,
                            selected_files=selected_files,
                            system_prompt_used=system_prompt_used,
                            response_length=len(full_response),
                            prompt_tokens=prompt_tokens,
                            completion_tokens=completion_tokens,
                            total_tokens=total_tokens
                        )
                    except Exception as log_error:
                        print(f"⚠️ 記錄查詢失敗: {log_error}")
                    
            except ValueError as ve:
                await websocket.send_json({
                    'type': 'error',
                    'message': str(ve)
                })
            except Exception as e:
                await websocket.send_json({
                    'type': 'error',
                    'message': f'發生錯誤: {str(e)}'
                })
                
    except WebSocketDisconnect:
        print("WebSocket 客戶端斷開連接")
    except Exception as e:
        print(f"WebSocket 錯誤: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        db.close()
