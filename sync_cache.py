"""Sync test-data files to cache based on Gemini API file names"""
import sys
import os

# Add backend to Python path
sys.path.insert(0, '/Users/tygr/Desktop/projects/RAG_by_Google')

from backend.services.rag_service import RAGService

# Get API key from environment
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    print("Error: GOOGLE_API_KEY not found in environment")
    sys.exit(1)

# Initialize RAG service
rag_service = RAGService(api_key=api_key)

# Get list of files from Gemini
gemini_files = rag_service.list_files()
print(f"Found {len(gemini_files)} files in Gemini API:\n")

# Setup paths
test_data_dir = "/Users/tygr/Desktop/projects/RAG_by_Google/test-data"
cache_dir = "/Users/tygr/Desktop/projects/RAG_by_Google/.file_cache"

# Create cache directory
os.makedirs(cache_dir, exist_ok=True)

# Match and cache files
synced_count = 0
for gemini_file in gemini_files:
    gemini_name = gemini_file['name']
    display_name = gemini_file['display_name']
    
    print(f"Processing: {display_name} (Gemini name: {gemini_name})")
    
    # Find matching file in test-data
    source_path = os.path.join(test_data_dir, display_name)
    
    if os.path.exists(source_path):
        # Read source content
        with open(source_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Write to cache with Gemini file name
        cache_path = os.path.join(cache_dir, f"{gemini_name}.txt")
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        
        with open(cache_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        synced_count += 1
        print(f"  ✓ Cached to: {gemini_name}.txt ({len(content)} chars)\n")
    else:
        print(f"  ✗ Source file not found in test-data: {display_name}\n")

print(f"\nSummary: Successfully cached {synced_count}/{len(gemini_files)} files")
