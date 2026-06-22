#!/usr/bin/env python3
# Allow running this script standalone: make backend modules importable.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

"""
Comprehensive database diagnostic script for PieTracker
"""
import os
import sys
from datetime import datetime

def test_database_schema():
    """Test database schema and potential issues"""
    print("=== Database Schema Analysis ===\n")
    
    try:
        from simple_db import SimpleDBService, User, Expense
        
        db_service = SimpleDBService()
        if not db_service.use_db:
            print("❌ Database not configured - using file storage")
            return False
            
        print("✅ Database service initialized")
        
        # Test database connection
        session = db_service.get_session()
        if not session:
            print("❌ Cannot get database session")
            return False
            
        print("✅ Database session created")
        
        # Check User table schema
        print("\n--- User Table Schema Check ---")
        try:
            users = session.query(User).limit(1).all()
            if users:
                user = users[0]
                print(f"✅ User table accessible")
                print(f"   Sample user ID: {user.id}")
                print(f"   Email: {user.email}")
                print(f"   Username: {getattr(user, 'username', 'NOT SET')}")
                print(f"   Hashed password exists: {bool(getattr(user, 'hashed_password', None))}")
                print(f"   Password hash exists: {bool(getattr(user, 'password_hash', None))}")
                print(f"   Role: {getattr(user, 'role', 'NOT SET')}")
                print(f"   Is active: {user.is_active} (type: {type(user.is_active)})")
                print(f"   Created at: {getattr(user, 'created_at', 'NOT SET')}")
                print(f"   Last login: {getattr(user, 'last_login', 'NOT SET')}")
            else:
                print("⚠️  No users found in database")
        except Exception as e:
            print(f"❌ Error accessing User table: {e}")
            
        # Check Expense table
        print("\n--- Expense Table Schema Check ---")
        try:
            expenses = session.query(Expense).limit(1).all()
            if expenses:
                expense = expenses[0]
                print(f"✅ Expense table accessible")
                print(f"   Sample expense ID: {expense.id}")
                print(f"   User ID: {expense.user_id}")
                print(f"   Amount: {expense.amount}")
            else:
                print("ℹ️  No expenses found in database")
        except Exception as e:
            print(f"❌ Error accessing Expense table: {e}")
            
        session.close()
        return True
        
    except Exception as e:
        print(f"❌ Critical database error: {e}")
        return False

def test_user_operations():
    """Test all user-related database operations"""
    print("\n=== User Operations Test ===\n")
    
    try:
        from simple_db import SimpleDBService
        
        db_service = SimpleDBService()
        if not db_service.use_db:
            print("❌ Database not available for testing")
            return False
            
        # Test get_all_users
        print("--- Testing get_all_users() ---")
        users = db_service.get_all_users()
        print(f"✅ Found {len(users)} users")
        for user_id, user_data in users.items():
            print(f"   - {user_id}: {user_data.get('email')} ({user_data.get('username')})")
            
        # Test specific user operations
        if users:
            test_user_id = list(users.keys())[0]
            test_user = users[test_user_id]
            
            print(f"\n--- Testing user operations for {test_user_id} ---")
            
            # Test get_user_by_id
            user_data = db_service.get_user_by_id(test_user_id)
            print(f"✅ get_user_by_id: {'Success' if user_data else 'Failed'}")
            
            # Test get_user_by_email
            email = test_user.get('email')
            if email:
                user_by_email = db_service.get_user_by_email(email)
                print(f"✅ get_user_by_email: {'Success' if user_by_email else 'Failed'}")
                
            # Test get_user_by_username
            username = test_user.get('username')
            if username:
                user_by_username = db_service.get_user_by_username(username)
                print(f"✅ get_user_by_username: {'Success' if user_by_username else 'Failed'}")
                
            # Test expense count
            expense_count = db_service.get_user_expense_count(test_user_id)
            print(f"✅ get_user_expense_count: {expense_count}")
            
            # Test username/email existence checks
            if username:
                username_exists = db_service.check_username_exists(username)
                print(f"✅ check_username_exists: {username_exists}")
                
            if email:
                email_exists = db_service.check_email_exists(email)
                print(f"✅ check_email_exists: {email_exists}")
                
        return True
        
    except Exception as e:
        print(f"❌ User operations test failed: {e}")
        return False

def test_authentication_flow():
    """Test the authentication process"""
    print("\n=== Authentication Flow Test ===\n")
    
    try:
        # Import main authentication functions
        from main import get_user_by_email, get_user_by_username, authenticate_user, verify_password
        
        # Test with existing users
        from simple_db import SimpleDBService
        db_service = SimpleDBService()
        
        if db_service.use_db:
            users = db_service.get_all_users()
            if users:
                # Test authentication flow with first user
                test_user_id, test_user = list(users.items())[0]
                email = test_user.get('email')
                username = test_user.get('username')
                
                print(f"--- Testing authentication for {email} ---")
                
                # Test get_user_by_email
                user_by_email = get_user_by_email(email)
                print(f"✅ get_user_by_email: {'Success' if user_by_email else 'Failed'}")
                if user_by_email:
                    print(f"   Password hash available: {bool(user_by_email.get('password_hash'))}")
                
                # Test get_user_by_username if available
                if username:
                    user_by_username = get_user_by_username(username)
                    print(f"✅ get_user_by_username: {'Success' if user_by_username else 'Failed'}")
                
                # Test password verification structure (don't test actual passwords)
                password_hash = test_user.get('password_hash')
                if password_hash:
                    print(f"✅ Password hash format: {len(password_hash)} characters")
                    print(f"✅ Password hash starts with bcrypt: {password_hash.startswith('$2b$')}")
                else:
                    print("❌ No password hash found")
                    
        return True
        
    except Exception as e:
        print(f"❌ Authentication flow test failed: {e}")
        return False

def check_potential_issues():
    """Check for potential database issues"""
    print("\n=== Potential Issues Analysis ===\n")
    
    issues_found = []
    
    try:
        from simple_db import SimpleDBService, User
        
        db_service = SimpleDBService()
        if not db_service.use_db:
            issues_found.append("Database not configured - using file storage fallback")
            return issues_found
            
        session = db_service.get_session()
        if not session:
            issues_found.append("Cannot establish database session")
            return issues_found
            
        # Check for schema inconsistencies
        print("--- Checking Schema Consistency ---")
        
        users = session.query(User).all()
        for user in users:
            user_issues = []
            
            # Check password fields
            hashed_password = getattr(user, 'hashed_password', None)
            password_hash = getattr(user, 'password_hash', None)
            
            if not hashed_password and not password_hash:
                user_issues.append("No password hash in either field")
            elif hashed_password and password_hash and hashed_password != password_hash:
                user_issues.append("Password hash mismatch between fields")
                
            # Check username field
            if not getattr(user, 'username', None):
                user_issues.append("Username field is empty")
                
            # Check is_active field type consistency
            is_active = user.is_active
            if not isinstance(is_active, str):
                user_issues.append(f"is_active field is {type(is_active)} instead of string")
                
            # Check role field
            role = getattr(user, 'role', None)
            if not role:
                user_issues.append("Role field is empty")
                
            if user_issues:
                issues_found.append(f"User {user.id} ({user.email}): {', '.join(user_issues)}")
                
        session.close()
        
        # Check for duplicate handling
        print("--- Checking for Potential Duplicates ---")
        users_data = db_service.get_all_users()
        emails = [user.get('email') for user in users_data.values()]
        usernames = [user.get('username') for user in users_data.values() if user.get('username')]
        
        if len(emails) != len(set(emails)):
            issues_found.append("Duplicate emails found in database")
            
        if len(usernames) != len(set(usernames)):
            issues_found.append("Duplicate usernames found in database")
            
    except Exception as e:
        issues_found.append(f"Error during issue analysis: {e}")
        
    return issues_found

def main():
    """Run comprehensive database diagnostics"""
    print("🔍 PieTracker Database Comprehensive Diagnostics")
    print("=" * 60)
    
    # Check environment
    database_url = os.environ.get("DATABASE_URL")
    print(f"DATABASE_URL configured: {'✅ Yes' if database_url else '❌ No'}")
    
    if database_url:
        # Mask the password in URL for security
        masked_url = database_url
        if '@' in masked_url:
            parts = masked_url.split('@')
            if ':' in parts[0]:
                user_pass = parts[0].split(':')
                if len(user_pass) >= 2:
                    masked_url = f"{user_pass[0]}:***@{parts[1]}"
        print(f"Database URL: {masked_url}")
    
    print()
    
    # Run all tests
    schema_ok = test_database_schema()
    operations_ok = test_user_operations()
    auth_ok = test_authentication_flow()
    
    # Check for issues
    issues = check_potential_issues()
    
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    print(f"Database Schema: {'✅ OK' if schema_ok else '❌ Issues'}")
    print(f"User Operations: {'✅ OK' if operations_ok else '❌ Issues'}")
    print(f"Authentication: {'✅ OK' if auth_ok else '❌ Issues'}")
    
    if issues:
        print(f"\n⚠️  POTENTIAL ISSUES FOUND ({len(issues)}):")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
    else:
        print("\n✅ No issues detected!")
        
    print("\n🎯 RECOMMENDATIONS:")
    if not schema_ok:
        print("   - Check database connection and schema")
    if not operations_ok:
        print("   - Verify database service methods")
    if not auth_ok:
        print("   - Check authentication functions")
    if issues:
        print("   - Address the issues listed above")
    if schema_ok and operations_ok and auth_ok and not issues:
        print("   - Database integration looks good! 🎉")

if __name__ == "__main__":
    main()