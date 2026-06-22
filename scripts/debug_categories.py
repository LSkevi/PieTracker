#!/usr/bin/env python3
"""
Simple category viewer for debugging
"""

import os
from dotenv import load_dotenv
# Allow running this script standalone: make backend modules importable.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from simple_db import SimpleDBService

load_dotenv()

db_service = SimpleDBService()

print("🔍 Checking users and their categories...")

users = db_service.get_all_users()
print(f"Users data type: {type(users)}")
print(f"Users keys: {list(users.keys()) if users else 'No users'}")

for i, (user_id, user) in enumerate(users.items()):
    print(f"\nUser {i+1}:")
    print(f"  ID: {user_id}")
    print(f"  Data: {user}")
    print(f"  Type: {type(user)}")
    
    categories = db_service.get_user_categories(user_id)
    print(f"  Categories: {categories}")