#!/usr/bin/env python3
"""
Sync files from Gemini API to PostgreSQL database
將 Gemini API 上的檔案同步到 PostgreSQL 資料庫
"""

import os
import sys
import google.generativeai as genai
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.services.embedding_service import EmbeddingService
from backend.services.document_service import DocumentService
from backend.database.connection import DATABASE_URL

def main():
    # Setup API key
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        print("❌ GOOGLE_API_KEY 環境變數未設定")
        sys.exit(1)
    
    genai.configure(api_key=api_key)
    
    # Setup database
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # Setup services
    embedding_service = EmbeddingService()
    doc_service = DocumentService(db, embedding_service)
    
    try:
        # Get all files from Gemini
        gemini_files = list(genai.list_files())
        print(f"📁 找到 {len(gemini_files)} 個 Gemini 檔案")
        
        # Check existing files in database
        existing_count = doc_service.get_document_count()
        print(f"💾 資料庫中已有 {existing_count} 個文件")
        
        synced_count = 0
        skipped_count = 0
        error_count = 0
        
        for gemini_file in gemini_files:
            try:
                # Check if already exists
                existing_doc = doc_service.get_document_by_gemini_name(gemini_file.name)
                if existing_doc:
                    print(f"⏭️  跳過 {gemini_file.display_name} (已存在)")
                    skipped_count += 1
                    continue
                
                # Download file content
                print(f"📥 下載 {gemini_file.display_name}...")
                file_data = genai.get_file(gemini_file.name)
                
                # For text files, try to get content
                # Note: Gemini API doesn't provide direct content download
                # We'll create a placeholder or use file metadata
                content = f"檔案名稱: {gemini_file.display_name}\n"
                content += f"上傳時間: {gemini_file.create_time}\n"
                content += f"檔案大小: {gemini_file.size_bytes} bytes\n"
                content += f"狀態: {gemini_file.state.name}\n"
                content += f"URI: {gemini_file.uri}\n"
                
                # Create document in database
                doc_service.create_document(
                    gemini_file_name=gemini_file.name,
                    display_name=gemini_file.display_name,
                    content=content,
                    file_size=gemini_file.size_bytes
                )
                
                print(f"✅ 同步 {gemini_file.display_name}")
                synced_count += 1
                
            except Exception as e:
                print(f"❌ 同步 {gemini_file.display_name} 失敗: {e}")
                error_count += 1
        
        db.commit()
        
        print(f"\n📊 同步完成:")
        print(f"   ✅ 成功: {synced_count}")
        print(f"   ⏭️  跳過: {skipped_count}")
        print(f"   ❌ 失敗: {error_count}")
        print(f"   📁 總計: {len(gemini_files)}")
        
    except Exception as e:
        print(f"❌ 同步過程發生錯誤: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
