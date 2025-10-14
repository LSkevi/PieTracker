#!/usr/bin/env python3
"""
Test category deletion functionality
"""

import os
from dotenv import load_dotenv
from simple_db import SimpleDBService

load_dotenv()

# Your user ID
USER_ID = "cf83fb3e-a461-4c21-94f5-1197962e4257"

def test_category_system():
    """Test the category system"""
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database service not available")
        return
    
    print(f"🔍 Testing category system for user: {USER_ID}")
    
    # Get current categories
    current_categories = db_service.get_user_categories(USER_ID)
    print(f"📋 Current custom categories in DB: {list(current_categories.keys())}")
    
    # Test hiding a default category
    print(f"\n🧪 Testing category hiding mechanism...")
    
    # Add "Entertainment" to hidden list to test the system
    hidden_key = "__hidden_categories__"
    current_hidden = current_categories.get(hidden_key, "").split(",") if current_categories.get(hidden_key) else []
    test_category = "Entertainment"
    
    if test_category not in current_hidden:
        current_hidden.append(test_category)
        current_categories[hidden_key] = ",".join([cat for cat in current_hidden if cat])
        
        if db_service.save_user_categories(USER_ID, current_categories):
            print(f"✅ Successfully marked '{test_category}' as hidden")
            print(f"📝 Hidden categories: {current_categories[hidden_key]}")
        else:
            print(f"❌ Failed to save hidden category")
    else:
        print(f"📝 '{test_category}' is already hidden")
    
    # Show current state
    final_categories = db_service.get_user_categories(USER_ID)
    print(f"\n📋 Final custom categories: {list(final_categories.keys())}")

if __name__ == "__main__":
    test_category_system()