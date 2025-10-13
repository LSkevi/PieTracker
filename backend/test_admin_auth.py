#!/usr/bin/env python3
"""
Quick test to verify admin authentication works
"""
import requests
import json

def test_admin_auth():
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Admin Authentication Fix")
    print("=" * 50)
    
    # Step 1: Login as admin
    print("1. Logging in as admin...")
    login_response = requests.post(f"{base_url}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return False
    
    login_data = login_response.json()
    token = login_data["token"]
    print(f"✅ Login successful! User: {login_data['user']['username']}")
    
    # Step 2: Test /auth/me endpoint
    print("\n2. Testing /auth/me endpoint...")
    me_response = requests.get(f"{base_url}/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    
    if me_response.status_code != 200:
        print(f"❌ /auth/me failed: {me_response.status_code}")
        print(f"   Response: {me_response.text}")
        return False
    
    me_data = me_response.json()
    print(f"✅ /auth/me successful! User: {me_data['user']['username']}")
    
    # Step 3: Test admin endpoint
    print("\n3. Testing admin endpoint...")
    admin_response = requests.get(f"{base_url}/admin/users", headers={
        "Authorization": f"Bearer {token}"
    })
    
    print(f"   Status: {admin_response.status_code}")
    if admin_response.status_code == 200:
        print("✅ Admin endpoint working!")
        return True
    else:
        print(f"❌ Admin endpoint failed: {admin_response.text}")
        return False

if __name__ == "__main__":
    test_admin_auth()