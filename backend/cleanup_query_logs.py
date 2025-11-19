"""
Script to clean up old query logs with Chinese error messages
Run this script to remove or update old test data
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import QueryLog
from backend.config import get_settings


def cleanup_query_logs(action: str = "delete"):
    """
    Clean up query logs
    
    Args:
        action: "delete" to remove all logs, "update" to translate error messages
    """
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        if action == "delete":
            # Delete all query logs
            count = db.query(QueryLog).delete()
            db.commit()
            print(f"✅ Deleted {count} query logs")
            
        elif action == "update":
            # Update error messages containing Chinese characters
            logs = db.query(QueryLog).filter(
                QueryLog.error_message.isnot(None)
            ).all()
            
            updated = 0
            for log in logs:
                if log.error_message and any('\u4e00' <= char <= '\u9fff' for char in log.error_message):
                    # Contains Chinese characters
                    log.error_message = "Feature not implemented"
                    updated += 1
            
            db.commit()
            print(f"✅ Updated {updated} query logs with Chinese error messages")
            
        else:
            print("❌ Invalid action. Use 'delete' or 'update'")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "delete"
    
    if action not in ["delete", "update"]:
        print("Usage: python cleanup_query_logs.py [delete|update]")
        print("  delete - Remove all query logs")
        print("  update - Replace Chinese error messages with English")
        sys.exit(1)
    
    print(f"🧹 Cleaning up query logs (action: {action})...")
    cleanup_query_logs(action)
