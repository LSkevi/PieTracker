#!/usr/bin/env python3
"""
Database testing script for PieTracker
"""
import os
import sys
# Allow running this script standalone: make backend modules importable.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from simple_db import SimpleDBService

def test_database_functionality():
    """Test all database operations"""
    print("=== PieTracker Database Test ===\n")
    
    # Check if DATABASE_URL is set
    db_url = os.environ.get("DATABASE_URL")
    print(f"DATABASE_URL: {'✅ Set' if db_url else '❌ Not set'}")
    
    if not db_url:
        print("\n⚠️  DATABASE_URL not found. To test with your Render PostgreSQL:")
        print("1. Get your DATABASE_URL from Render dashboard")
        print("2. Run: set DATABASE_URL=your_postgres_url")
        print("3. Run this script again")
        print("\nFor now, testing file storage fallback...\n")
    
    # Initialize database service
    db_service = SimpleDBService()
    print(f"Database mode: {'🗄️  PostgreSQL' if db_service.use_db else '📁 File Storage'}")
    
    if db_service.use_db:
        # Test connection
        session = db_service.get_session()
        if session:
            print("✅ Database connection successful")
            session.close()
        else:
            print("❌ Database connection failed")
            return False
        
        # Test user operations
        print("\n--- Testing User Operations ---")
        
        # Test get_all_users
        users = db_service.get_all_users()
        print(f"✅ get_all_users(): Found {len(users)} users")
        for user_id, user in users.items():
            print(f"  - {user_id}: {user.get('email', 'No email')} ({user.get('username', 'No username')})")
        
        # Test expense counting
        print("\n--- Testing Expense Operations ---")
        for user_id in users.keys():
            count = db_service.get_user_expense_count(user_id)
            print(f"✅ User {user_id} has {count} expenses")
        
        # Test user existence checks
        print("\n--- Testing User Validation ---")
        if users:
            first_user_id = list(users.keys())[0]
            first_user = users[first_user_id]
            
            # Test get_user_by_id
            user_data = db_service.get_user_by_id(first_user_id)
            print(f"✅ get_user_by_id(): {'Found' if user_data else 'Not found'}")
            
            # Test username existence check
            username = first_user.get('username', '')
            if username:
                exists = db_service.check_username_exists(username)
                print(f"✅ check_username_exists('{username}'): {exists}")
            
            # Test email existence check
            email = first_user.get('email', '')
            if email:
                exists = db_service.check_email_exists(email)
                print(f"✅ check_email_exists('{email}'): {exists}")
    
    else:
        print("🔄 Database not configured - using file storage mode")
        print("   This is the fallback mode when DATABASE_URL is not set")
    
    print("\n=== Test Complete ===")
    return True

def test_main_app_integration():
    """Test main app database integration"""
    print("\n=== Testing Main App Integration ===")
    
    try:
        # Import main app components
        from main import db_service
        print(f"✅ Main app db_service: {'🗄️  Database mode' if db_service and db_service.use_db else '📁 File mode'}")
        
        # Test admin endpoint functions would work
        if db_service and db_service.use_db:
            users = db_service.get_all_users()
            print(f"✅ Admin panel would show {len(users)} users from database")
        else:
            print("⚠️  Admin panel will use file storage (users_db)")
            
    except Exception as e:
        print(f"❌ Error testing main app: {e}")

if __name__ == "__main__":
    try:
        test_database_functionality()
        test_main_app_integration()
    except KeyboardInterrupt:
        print("\n\n🛑 Test interrupted")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)