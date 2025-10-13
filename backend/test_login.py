#!/usr/bin/env python3
"""
Test login functionality after database migration
"""
import requests
import json

def test_login():
    """Test the login endpoint"""
    print("Testing PieTracker Login Functionality")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    # Test health check first
    try:
        print("1. Testing health endpoint...")
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Health check: {health['status']}")
            print(f"   Database: {health['database']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("   Make sure the server is running: python -m uvicorn main:app --reload --port 8000")
        return False
    
    # Test admin login
    print("\n2. Testing admin login...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{base_url}/auth/login", json=login_data)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Admin login successful!")
            print(f"   User: {result['user']['username']}")
            print(f"   Token: {result['token'][:50]}...")
            return True
        elif response.status_code == 503:
            print("❌ Database not configured")
            print("   Make sure DATABASE_URL is set")
            return False
        else:
            print(f"❌ Login failed: {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
    
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        return False

if __name__ == "__main__":
    test_login()