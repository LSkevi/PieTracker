#!/usr/bin/env python3
"""
Clean up test data and reset categories
"""

import os
from dotenv import load_dotenv
from simple_db import SimpleDBService

load_dotenv()

# Your user ID
USER_ID = "cf83fb3e-a461-4c21-94f5-1197962e4257"

def clean_test_data():
    """Clean up the test hidden category data"""
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database service not available")
        return
    
    print(f"🧹 Cleaning test data for user: {USER_ID}")
    
    # Get current categories and remove test data
    current_categories = db_service.get_user_categories(USER_ID)
    
    # Remove the hidden categories system key
    if "__hidden_categories__" in current_categories:
        del current_categories["__hidden_categories__"]
        print("🗑️ Removed __hidden_categories__ test data")
    
    # Keep only actual custom categories (remove the auto-generated ones)
    clean_categories = {}
    for key, value in current_categories.items():
        if key not in ["Food", "Transportation", "Shopping", "Entertainment"]:
            clean_categories[key] = value
    
    if db_service.save_user_categories(USER_ID, clean_categories):
        print(f"✅ Successfully cleaned categories")
        print(f"📝 Remaining custom categories: {list(clean_categories.keys())}")
    else:
        print(f"❌ Failed to clean categories")

if __name__ == "__main__":
    clean_test_data()