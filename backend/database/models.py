from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ARRAY
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .connection import Base


class Document(Base):
    """Document model with vector embeddings"""
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, index=True)
    gemini_file_name = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768))  # Gemini text-embedding-004 produces 768-dim vectors
    file_size = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'gemini_file_name': self.gemini_file_name,
            'display_name': self.display_name,
            'content_preview': self.content[:200] + '...' if len(self.content) > 200 else self.content,
            'file_size': self.file_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class QueryLog(Base):
    """Query log model for usage statistics"""
    __tablename__ = 'query_logs'

    id = Column(Integer, primary_key=True, index=True)
    query = Column(Text, nullable=False)
    model_used = Column(String(100), nullable=False, index=True)
    files_used = Column(Integer, default=0)
    selected_files = Column(ARRAY(Text))
    response_length = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'query': self.query,
            'model_used': self.model_used,
            'files_used': self.files_used,
            'selected_files': self.selected_files,
            'response_length': self.response_length,
            'success': self.success,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
