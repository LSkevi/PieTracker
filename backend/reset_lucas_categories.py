#!/usr/bin/env python3
"""
Direct category reset for Lucas's account
"""

import os
from dotenv import load_dotenv
from simple_db import SimpleDBService

load_dotenv()

# Lucas's user ID from the debug output
USER_ID = "cf83fb3e-a461-4c21-94f5-1197962e4257"

def reset_lucas_categories():
    """Reset categories for Lucas's account"""
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database service not available")
        return
    
    print(f"🧹 Resetting categories for Lucas's account: {USER_ID}")
    
    # Get current categories
    current_categories = db_service.get_user_categories(USER_ID)
    print(f"📋 Current categories: {list(current_categories.keys())}")
    
    # Keep only Banana if it exists, otherwise start fresh
    banana_color = current_categories.get("Banana", "#FFEB3B")  # Default yellow color
    new_categories = {}
    
    # Check if Banana exists in current categories
    if "Banana" in current_categories:
        new_categories["Banana"] = banana_color
        print(f"🍌 Keeping 'Banana' category with color: {banana_color}")
    else:
        print("🍌 'Banana' category not found in current categories")
        print("💭 You can add it again through the UI")
    
    # Clear all auto-generated categories
    if db_service.save_user_categories(USER_ID, new_categories):
        print(f"✅ Successfully reset categories!")
        print(f"📝 Remaining custom categories: {list(new_categories.keys())}")
        print("📝 Default categories will still appear in the UI and can be used normally")
    else:
        print(f"❌ Failed to reset categories")

if __name__ == "__main__":
    print("🔧 Resetting categories for Lucas's account...")
    reset_lucas_categories()