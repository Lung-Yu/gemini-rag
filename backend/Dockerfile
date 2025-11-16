# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt ./backend/

# Install dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy entire project (backend will be in backend/ subdirectory)
COPY . .

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
