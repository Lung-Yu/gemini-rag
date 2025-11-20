"""Populate file cache for existing test-data files"""
import os
import shutil

# Source and cache directories
test_data_dir = "/Users/tygr/Desktop/projects/RAG_by_Google/test-data"
cache_dir = "/Users/tygr/Desktop/projects/RAG_by_Google/.file_cache"

# Create cache directory
os.makedirs(cache_dir, exist_ok=True)

# Copy all test-data files to cache with Gemini naming pattern
for filename in os.listdir(test_data_dir):
    if filename.endswith('.txt'):
        source_path = os.path.join(test_data_dir, filename)
        
        # Gemini file names follow pattern: files/{hash}
        # We'll use a simplified pattern based on filename
        gemini_name = f"files/{filename.replace('.txt', '')}"
        cache_path = os.path.join(cache_dir, f"{gemini_name}.txt")
        
        # Create subdirectory if needed
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        
        # Copy file content
        with open(source_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        with open(cache_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Cached: {filename} -> {gemini_name}.txt")

print(f"\nTotal files cached: {len([f for f in os.listdir(test_data_dir) if f.endswith('.txt')])}")
