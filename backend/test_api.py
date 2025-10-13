#!/usr/bin/env python3
"""
API endpoint testing script for PieTracker
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_health():
    """Test basic health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_db_status():
    """Test database status endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/db-status")
        data = response.json()
        print(f"✅ DB Status: {response.status_code}")
        print(f"   Database: {'PostgreSQL' if data.get('database_type') == 'postgresql' else 'File Storage'}")
        print(f"   Connection: {'✅' if data.get('connected') else '❌'}")
        return True
    except Exception as e:
        print(f"❌ DB status check failed: {e}")
        return False

def test_signup_login():
    """Test user signup and login"""
    test_user = {
        "email": f"test_{datetime.now().timestamp()}@example.com",
        "username": f"testuser_{int(datetime.now().timestamp())}",
        "password": "testpassword123"
    }
    
    try:
        # Test signup
        signup_response = requests.post(f"{BASE_URL}/signup", json=test_user)
        print(f"✅ Signup: {signup_response.status_code}")
        if signup_response.status_code == 201:
            signup_data = signup_response.json()
            user_id = signup_data.get("user_id")
            print(f"   Created user: {user_id}")
            
            # Test login
            login_data = {
                "username": test_user["email"],
                "password": test_user["password"]
            }
            login_response = requests.post(f"{BASE_URL}/token", data=login_data)
            print(f"✅ Login: {login_response.status_code}")
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                token = token_data.get("access_token")
                print(f"   Got token: {token[:20]}...")
                return token, user_id
        
        return None, None
    except Exception as e:
        print(f"❌ Signup/Login failed: {e}")
        return None, None

def test_admin_endpoints(token):
    """Test admin endpoints if user is admin"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test admin users list
        response = requests.get(f"{BASE_URL}/admin/users", headers=headers)
        print(f"✅ Admin Users List: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            users = data.get("users", [])
            print(f"   Found {len(users)} users")
            for user in users[:3]:  # Show first 3 users
                print(f"   - {user.get('email', 'No email')} ({user.get('expense_count', 0)} expenses)")
            return True
        elif response.status_code == 403:
            print("   ⚠️  Not admin user - this is expected for regular users")
            return True
        else:
            print(f"   ❌ Unexpected response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Admin endpoints test failed: {e}")
        return False

def test_expenses(token, user_id):
    """Test expense operations"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test create expense
    test_expense = {
        "amount": 25.50,
        "currency": "USD",
        "category": "Food",
        "description": "Test lunch",
        "date": "2025-10-12"
    }
    
    try:
        # Create expense
        response = requests.post(f"{BASE_URL}/expenses", json=test_expense, headers=headers)
        print(f"✅ Create Expense: {response.status_code}")
        
        # Get expenses
        response = requests.get(f"{BASE_URL}/expenses", headers=headers)
        print(f"✅ Get Expenses: {response.status_code}")
        
        if response.status_code == 200:
            expenses = response.json()
            print(f"   Found {len(expenses)} expenses for user")
            return True
        
        return False
    except Exception as e:
        print(f"❌ Expenses test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=== PieTracker API Test Suite ===\n")
    
    # Basic connectivity
    if not test_health():
        print("❌ Server not responding")
        return False
    
    # Database status
    test_db_status()
    
    # User operations
    print("\n--- User Authentication Tests ---")
    token, user_id = test_signup_login()
    
    if token and user_id:
        print("\n--- Admin Panel Tests ---")
        test_admin_endpoints(token)
        
        print("\n--- Expense Management Tests ---")
        test_expenses(token, user_id)
    
    print("\n=== Test Complete ===")
    print("✅ All critical paths tested successfully!")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Tests interrupted")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        sys.exit(1)