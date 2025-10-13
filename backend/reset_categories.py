#!/usr/bin/env python3
"""
Category cleanup - remove all auto-generated categories and start fresh
"""

import os
from dotenv import load_dotenv
from simple_db import SimpleDBService

load_dotenv()

def reset_user_categories(user_id: str):
    """Reset user categories to empty (only defaults will show)"""
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database service not available")
        return
    
    print(f"🧹 Resetting categories for user: {user_id}")
    
    # Get current categories
    current_categories = db_service.get_user_categories(user_id)
    print(f"📋 Current categories: {list(current_categories.keys())}")
    
    # Clear all custom categories (this will make only DEFAULT_CATEGORIES show)
    if db_service.save_user_categories(user_id, {}):
        print(f"✅ Successfully reset categories for user {user_id}")
        print("📝 Now only default categories will appear and can be managed normally")
    else:
        print(f"❌ Failed to reset categories for user {user_id}")

if __name__ == "__main__":
    db_service = SimpleDBService()
    users = db_service.get_all_users()
    
    print("🔧 PieTracker Category Reset Tool")
    print("=" * 50)
    
    print("👥 Available users:")
    for user_id, user_data in users.items():
        email = user_data.get('email', 'No email')
        username = user_data.get('username', 'No username')
        print(f"   - {user_id}")
        print(f"     Email: {email}")
        print(f"     Username: {username}")
        print()
    
    user_input = input("Enter the user ID to reset categories for: ").strip()
    
    if user_input in users:
        print(f"\n🎯 Selected user: {users[user_input].get('email', 'Unknown')}")
        print("⚠️  This will remove ALL custom categories for this user.")
        print("   Only the default categories will remain and be manageable.")
        
        confirm = input("\nContinue? (y/N): ").strip().lower()
        
        if confirm in ['y', 'yes']:
            reset_user_categories(user_input)
        else:
            print("❌ Operation cancelled.")
    else:
        print(f"❌ User ID '{user_input}' not found.")