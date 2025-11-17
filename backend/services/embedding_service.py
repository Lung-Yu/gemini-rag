import google.generativeai as genai
from typing import List, Optional
import numpy as np
import os


class EmbeddingService:
    """Service for generating and managing embeddings using Gemini API"""
    
    def __init__(self):
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("未找到 GOOGLE_API_KEY 環境變數")
        
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.embedding_model = "models/text-embedding-004"
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding vector for given text
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector (768 dimensions)
        """
        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            print(f"❌ Embedding generation error: {e}")
            return None
    
    def generate_query_embedding(self, query: str) -> Optional[List[float]]:
        """
        Generate embedding vector for search query
        
        Args:
            query: Search query text
            
        Returns:
            List of floats representing the embedding vector (768 dimensions)
        """
        try:
            result = genai.embed_content(
                model=self.embedding_model,
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            print(f"❌ Query embedding generation error: {e}")
            return None
    
    def batch_generate_embeddings(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors
        
        Args:
            vec1: First vector
            vec2: Second vector
            
        Returns:
            Cosine similarity score (0-1)
        """
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
