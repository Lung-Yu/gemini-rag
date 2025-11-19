"""Custom exceptions for RAG application"""


class ServiceException(Exception):
    """Base exception for all service errors"""
    
    def __init__(self, detail: str, status_code: int = 500):
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)


class EmbeddingError(ServiceException):
    """Exception raised when embedding generation fails"""
    
    def __init__(self, detail: str):
        super().__init__(detail, status_code=500)


class DatabaseError(ServiceException):
    """Exception raised when database operations fail"""
    
    def __init__(self, detail: str):
        super().__init__(detail, status_code=500)


class ModelValidationError(ServiceException):
    """Exception raised when model validation fails"""
    
    def __init__(self, detail: str):
        super().__init__(detail, status_code=400)


class FileUploadError(ServiceException):
    """Exception raised when file upload fails"""
    
    def __init__(self, detail: str):
        super().__init__(detail, status_code=422)
