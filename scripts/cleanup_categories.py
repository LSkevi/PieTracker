#!/usr/bin/env python3
"""
Category cleanup script for PieTracker
This script removes unwanted categories from a user's custom categories.
"""

import os
from dotenv import load_dotenv
# Allow running this script standalone: make backend modules importable.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from simple_db import SimpleDBService

# Load environment variables
load_dotenv()

def cleanup_user_categories(user_id: str, keep_categories: list = None):
    """
    Clean up categories for a specific user.
    
    Args:
        user_id: The user ID to clean up categories for
        keep_categories: List of category names to keep (everything else will be removed)
    """
    if keep_categories is None:
        keep_categories = ["Banana"]  # Default to keep only Banana
    
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database service not available")
        return
    
    print(f"🧹 Cleaning up categories for user: {user_id}")
    
    # Get current categories
    current_categories = db_service.get_user_categories(user_id)
    print(f"📋 Current custom categories: {list(current_categories.keys())}")
    
    # Filter to keep only desired categories
    filtered_categories = {
        name: color for name, color in current_categories.items() 
        if name in keep_categories
    }
    
    print(f"✅ Categories to keep: {list(filtered_categories.keys())}")
    removed_categories = [name for name in current_categories.keys() if name not in keep_categories]
    print(f"🗑️  Categories to remove: {removed_categories}")
    
    # Save the filtered categories
    if db_service.save_user_categories(user_id, filtered_categories):
        print(f"✅ Successfully cleaned up categories for user {user_id}")
        print(f"📝 Remaining custom categories: {list(filtered_categories.keys())}")
    else:
        print(f"❌ Failed to clean up categories for user {user_id}")

def list_all_users():
    """List all users in the system"""
    db_service = SimpleDBService()
    
    if not db_service.use_db:
        print("❌ Database service not available")
        return []
    
    users = db_service.get_all_users()
    print(f"👥 Found {len(users)} users:")
    for user in users:
        print(f"   - {user['id']}: {user.get('email', 'No email')} ({user.get('username', 'No username')})")
    
    return users

if __name__ == "__main__":
    print("🔧 PieTracker Category Cleanup Tool")
    print("=" * 50)
    
    # List all users
    users = list_all_users()
    
    if not users:
        print("No users found.")
        exit()
    
    # Ask user which user to clean up
    print("\n🎯 Which user would you like to clean up categories for?")
    print("Enter the user ID or email:")
    
    user_input = input("> ").strip()
    
    # Find the user
    target_user = None
    for user in users:
        if (user['id'] == user_input or 
            user.get('email', '').lower() == user_input.lower() or 
            user.get('username', '').lower() == user_input.lower()):
            target_user = user
            break
    
    if not target_user:
        print(f"❌ User '{user_input}' not found.")
        exit()
    
    print(f"\n🎯 Selected user: {target_user['id']} ({target_user.get('email', 'No email')})")
    
    # Ask which categories to keep
    print("\n📝 Which categories would you like to KEEP?")
    print("Enter category names separated by commas (or press Enter to keep only 'Banana'):")
    
    keep_input = input("> ").strip()
    
    if keep_input:
        keep_categories = [cat.strip() for cat in keep_input.split(",") if cat.strip()]
    else:
        keep_categories = ["Banana"]
    
    print(f"\n🎯 Will keep these categories: {keep_categories}")
    print("⚠️  All other custom categories will be removed!")
    print("Note: Default categories (Food & Dining, Transportation, etc.) cannot be removed.")
    
    confirm = input("\nContinue? (y/N): ").strip().lower()
    
    if confirm in ['y', 'yes']:
        cleanup_user_categories(target_user['id'], keep_categories)
        print("\n✅ Category cleanup completed!")
    else:
        print("❌ Operation cancelled.")