#!/usr/bin/env python3
"""
Test script to verify per-user category isolation in PieTracker.
This script tests that deleting a category for one user doesn't affect another user's categories.
"""

import requests
import json

API_BASE = "http://localhost:8000"  # Change to https://pietracker.onrender.com for production

def test_category_isolation():
    """Test that category deletion is isolated per user."""
    
    print("🧪 Testing Per-User Category Isolation")
    print("=" * 50)
    
    # Test with two different user IDs
    user1_headers = {"X-User-Id": "test-user-1", "Content-Type": "application/json"}
    user2_headers = {"X-User-Id": "test-user-2", "Content-Type": "application/json"}
    
    # Step 1: Add a custom category for both users
    test_category = "TestCategory"
    category_data = {"name": test_category, "color": "#FF5733"}
    
    print(f"📝 Adding category '{test_category}' for User 1...")
    response1 = requests.post(f"{API_BASE}/categories", json=category_data, headers=user1_headers)
    print(f"   Status: {response1.status_code}")
    
    print(f"📝 Adding category '{test_category}' for User 2...")
    response2 = requests.post(f"{API_BASE}/categories", json=category_data, headers=user2_headers)
    print(f"   Status: {response2.status_code}")
    
    # Step 2: Verify both users have the category
    print(f"\n🔍 Checking categories for both users...")
    
    categories1 = requests.get(f"{API_BASE}/categories", headers=user1_headers).json()
    categories2 = requests.get(f"{API_BASE}/categories", headers=user2_headers).json()
    
    print(f"   User 1 categories: {[c for c in categories1 if 'Test' in c]}")
    print(f"   User 2 categories: {[c for c in categories2 if 'Test' in c]}")
    
    # Step 3: Delete category for User 1
    print(f"\n❌ Deleting category '{test_category}' for User 1...")
    delete_response = requests.delete(f"{API_BASE}/categories/{test_category}", headers=user1_headers)
    print(f"   Status: {delete_response.status_code}")
    print(f"   Response: {delete_response.json()}")
    
    # Step 4: Verify User 1 no longer has the category, but User 2 still does
    print(f"\n🔍 Checking categories after deletion...")
    
    categories1_after = requests.get(f"{API_BASE}/categories", headers=user1_headers).json()
    categories2_after = requests.get(f"{API_BASE}/categories", headers=user2_headers).json()
    
    user1_has_category = test_category in categories1_after
    user2_has_category = test_category in categories2_after
    
    print(f"   User 1 has '{test_category}': {user1_has_category}")
    print(f"   User 2 has '{test_category}': {user2_has_category}")
    
    # Step 5: Verify isolation results
    if not user1_has_category and user2_has_category:
        print(f"\n✅ SUCCESS: Category deletion is properly isolated!")
        print(f"   ✓ User 1 category deleted")
        print(f"   ✓ User 2 category preserved")
    else:
        print(f"\n❌ FAILURE: Category isolation is not working properly!")
        if user1_has_category:
            print(f"   ✗ User 1 still has the category after deletion")
        if not user2_has_category:
            print(f"   ✗ User 2 lost the category when User 1 deleted it")
    
    # Cleanup: Delete test category for User 2
    print(f"\n🧹 Cleaning up: Deleting test category for User 2...")
    cleanup_response = requests.delete(f"{API_BASE}/categories/{test_category}", headers=user2_headers)
    print(f"   Cleanup status: {cleanup_response.status_code}")
    
    return not user1_has_category and user2_has_category

def test_category_colors_isolation():
    """Test that category colors are also isolated per user."""
    
    print(f"\n🎨 Testing Per-User Category Color Isolation")
    print("=" * 50)
    
    user1_headers = {"X-User-Id": "test-user-1", "Content-Type": "application/json"}
    user2_headers = {"X-User-Id": "test-user-2", "Content-Type": "application/json"}
    
    # Add categories with different colors
    category1_data = {"name": "ColorTest", "color": "#FF0000"}  # Red
    category2_data = {"name": "ColorTest", "color": "#00FF00"}  # Green
    
    print("🎨 Adding 'ColorTest' category with RED color for User 1...")
    requests.post(f"{API_BASE}/categories", json=category1_data, headers=user1_headers)
    
    print("🎨 Adding 'ColorTest' category with GREEN color for User 2...")
    requests.post(f"{API_BASE}/categories", json=category2_data, headers=user2_headers)
    
    # Check colors
    colors1 = requests.get(f"{API_BASE}/categories/colors", headers=user1_headers).json()
    colors2 = requests.get(f"{API_BASE}/categories/colors", headers=user2_headers).json()
    
    user1_color = colors1.get("ColorTest", "")
    user2_color = colors2.get("ColorTest", "")
    
    print(f"   User 1 ColorTest color: {user1_color}")
    print(f"   User 2 ColorTest color: {user2_color}")
    
    if user1_color == "#FF0000" and user2_color == "#00FF00":
        print("✅ SUCCESS: Category colors are properly isolated!")
    else:
        print("❌ FAILURE: Category colors are not properly isolated!")
    
    # Cleanup
    requests.delete(f"{API_BASE}/categories/ColorTest", headers=user1_headers)
    requests.delete(f"{API_BASE}/categories/ColorTest", headers=user2_headers)
    
    return user1_color == "#FF0000" and user2_color == "#00FF00"

def main():
    print("PieTracker Category Isolation Test Suite")
    print("=" * 60)
    
    try:
        # Test basic connectivity
        response = requests.get(f"{API_BASE}/")
        if response.status_code != 200:
            print(f"❌ Cannot connect to server at {API_BASE}")
            print("   Make sure the server is running locally")
            return
        
        print(f"🌐 Connected to server at {API_BASE}")
        print()
        
        # Run tests
        test1_passed = test_category_isolation()
        test2_passed = test_category_colors_isolation()
        
        print(f"\n" + "=" * 60)
        print("📊 TEST RESULTS:")
        print(f"   Category Deletion Isolation: {'✅ PASS' if test1_passed else '❌ FAIL'}")
        print(f"   Category Color Isolation: {'✅ PASS' if test2_passed else '❌ FAIL'}")
        
        if test1_passed and test2_passed:
            print("\n🎉 All tests passed! Per-user category isolation is working correctly.")
        else:
            print("\n⚠️  Some tests failed. Check the backend implementation.")
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {API_BASE}")
        print("   Make sure your PieTracker server is running")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()