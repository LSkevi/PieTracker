#!/usr/bin/env python3
"""
Database migration script to add missing columns to existing users table
"""
import os
from simple_db import SimpleDBService
from sqlalchemy import text

def migrate_database():
    """Add missing columns to users table"""
    
    # Set up database connection
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database not configured")
        return False
    
    session = db_service.get_session()
    if not session:
        print("❌ Could not connect to database")
        return False
    
    try:
        print("🔄 Starting database migration...")
        
        # Check if columns exist and add them if they don't
        migrations = [
            ("username", "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR;"),
            ("password_hash", "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;"),
            ("role", "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';"),
            ("last_login", "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;"),
        ]
        
        for column_name, sql in migrations:
            try:
                session.execute(text(sql))
                print(f"✅ Added column: {column_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"ℹ️  Column {column_name} already exists")
                else:
                    print(f"⚠️  Error adding column {column_name}: {e}")
        
        # Update existing users to have usernames based on email
        update_sql = """
        UPDATE users 
        SET username = COALESCE(username, SPLIT_PART(email, '@', 1))
        WHERE username IS NULL OR username = '';
        """
        
        try:
            session.execute(text(update_sql))
            print("✅ Updated existing users with usernames")
        except Exception as e:
            print(f"⚠️  Error updating usernames: {e}")
        
        # Update existing users to have password_hash from hashed_password
        update_password_sql = """
        UPDATE users 
        SET password_hash = COALESCE(password_hash, hashed_password)
        WHERE password_hash IS NULL OR password_hash = '';
        """
        
        try:
            session.execute(text(update_password_sql))
            print("✅ Updated existing users with password_hash")
        except Exception as e:
            print(f"⚠️  Error updating password_hash: {e}")
        
        session.commit()
        print("✅ Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        return False
    finally:
        session.close()

if __name__ == "__main__":
    migrate_database()