from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.models.schemas import ChatRequest, ChatResponse, ModelsResponse, ModelInfo
from backend.services.rag_service import RAGService
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import get_db
from backend.config import get_settings, Settings
from backend.utils.logger import get_logger
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = get_logger(__name__)


# Dependency functions
def get_rag_service(settings: Settings = Depends(get_settings)) -> RAGService:
    """Get RAG service instance"""
    return RAGService(settings.GOOGLE_API_KEY)


def get_embedding_service(settings: Settings = Depends(get_settings)) -> EmbeddingService:
    """Get embedding service instance"""
    return EmbeddingService(settings.GOOGLE_API_KEY)


def get_document_service(
    db: Session = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
) -> DocumentService:
    """Get document service instance"""
    return DocumentService(db, embedding_service)


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    rag_service: RAGService = Depends(get_rag_service),
    doc_service: DocumentService = Depends(get_document_service)
):
    """Send a message and get RAG-based response with model selection"""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Validate model
    available_models = rag_service.get_available_models()
    available_model_ids = [m['model_id'] for m in available_models]
    
    if request.model not in available_model_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported model: {request.model}. Please choose from available models."
        )
    
    # Auto-retrieve relevant documents using vector search if no files manually selected
    selected_files = request.selected_files
    retrieved_files_info = None
    
    if not selected_files and request.enable_auto_retrieval:
        try:
            similar_docs = doc_service.search_similar_documents(
                query=request.message,
                top_k=request.top_k,
                similarity_threshold=request.similarity_threshold
            )
            if similar_docs:
                selected_files = [doc.gemini_file_name for doc, score in similar_docs]
                retrieved_files_info = [(doc.gemini_file_name, doc.display_name, float(score)) for doc, score in similar_docs]
                logger.info(f"Auto-retrieved {len(retrieved_files_info)} documents for query")
        except Exception as e:
            logger.warning(f"Auto-retrieval failed: {e}")
    
    # Query with specified model, files, and system prompt
    result = rag_service.query(
        query=request.message,
        model_name=request.model,
        selected_file_names=selected_files,
        system_prompt=request.system_prompt
    )
    
    # Add retrieval info to result
    if retrieved_files_info:
        result['retrieved_files'] = retrieved_files_info
        result['auto_retrieval_enabled'] = True
    else:
        result['auto_retrieval_enabled'] = request.enable_auto_retrieval and not request.selected_files
    
    # Log the query
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
        logger.warning(f"Failed to log query: {log_error}")
    
    if not result["success"]:
        if result.get("error_type") == "rate_limit":
            raise HTTPException(status_code=429, detail=result.get("message", "Rate limit exceeded"))
        raise HTTPException(status_code=500, detail=result.get("response", "Query failed"))
    
    # Convert retrieved_files to RetrievedFile objects
    from backend.models.schemas import RetrievedFile
    retrieved_files_data = None
    if result.get("retrieved_files"):
        retrieved_files_data = [
            RetrievedFile(
                gemini_file_name=f[0],
                display_name=f[1],
                similarity_score=f[2]
            )
            for f in result["retrieved_files"]
        ]
    
    return ChatResponse(
        success=result["success"],
        message=result.get("response", ""),
        response=result.get("response", ""),
        model_used=result.get("model_used"),
        files_used=result.get("files_used", 0),
        retrieved_files=retrieved_files_data,
        auto_retrieval_enabled=result.get("auto_retrieval_enabled"),
        prompt_tokens=result.get("prompt_tokens"),
        completion_tokens=result.get("completion_tokens"),
        total_tokens=result.get("total_tokens")
    )


@router.get("/models", response_model=ModelsResponse)
async def get_available_models(rag_service: RAGService = Depends(get_rag_service)):
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
async def websocket_chat(
    websocket: WebSocket,
    settings: Settings = Depends(get_settings)
):
    """WebSocket endpoint for real-time chat with streaming responses"""
    await websocket.accept()
    
    # Initialize services for this connection
    rag_service = RAGService(settings.GOOGLE_API_KEY)
    embedding_service = EmbeddingService(settings.GOOGLE_API_KEY)
    
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
            
            logger.debug(f"WebSocket received data: {data[:100]}...")
            request_data = json.loads(data)
            
            message = request_data.get('message', '').strip()
            model = request_data.get('model', 'gemini-1.5-flash')
            selected_files = request_data.get('selected_files', None)
            system_prompt = request_data.get('system_prompt', None)
            enable_auto_retrieval = request_data.get('enable_auto_retrieval', True)
            top_k = request_data.get('top_k', 5)
            similarity_threshold = request_data.get('similarity_threshold', 0.7)
            
            # Debug logging for retrieval parameters
            logger.info(f"WebSocket retrieval params - top_k: {top_k} (type: {type(top_k)}), similarity_threshold: {similarity_threshold}")
            
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
                
                # Auto-retrieve relevant documents using vector search if no files manually selected
                retrieved_files = None
                auto_retrieval_enabled_result = False
                
                if not selected_files and enable_auto_retrieval:
                    try:
                        similar_docs = doc_service.search_similar_documents(
                            query=message,
                            top_k=top_k,
                            similarity_threshold=similarity_threshold
                        )
                        if similar_docs:
                            selected_files = [doc.gemini_file_name for doc, score in similar_docs]
                            retrieved_files = [(doc.gemini_file_name, doc.display_name, float(score)) for doc, score in similar_docs]
                            auto_retrieval_enabled_result = True
                            logger.info(f"Auto-retrieved {len(retrieved_files)} documents for WebSocket query")
                    except Exception as e:
                        logger.warning(f"Auto-retrieval failed: {e}")
                
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
                    completion_data = {
                        'type': 'complete',
                        'success': True,
                        'full_response': full_response,
                        'model_used': model,
                        'files_used': files_used,
                        'prompt_tokens': prompt_tokens,
                        'completion_tokens': completion_tokens,
                        'total_tokens': total_tokens,
                        'auto_retrieval_enabled': auto_retrieval_enabled_result
                    }
                    
                    # Add retrieved files info if available
                    if retrieved_files:
                        completion_data['retrieved_files'] = [
                            {
                                'gemini_file_name': f[0],
                                'display_name': f[1],
                                'similarity_score': f[2]
                            }
                            for f in retrieved_files
                        ]
                    
                    await websocket.send_json(completion_data)
                    
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
                        logger.warning(f"Failed to log query: {log_error}")
                    
            except ValueError as ve:
                await websocket.send_json({
                    'type': 'error',
                    'message': str(ve)
                })
                logger.error(f"Error in WebSocket: {ve}")
            except Exception as e:
                logger.error(f"Unexpected error in WebSocket: {e}", exc_info=True)
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Error occurred: {str(e)}'
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass
    finally:
        db.close()
