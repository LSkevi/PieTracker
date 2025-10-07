#!/usr/bin/env python3
"""
Admin CLI for PieTracker User Management
Usage on Render console or local server:
  python admin_cli.py list-users
  python admin_cli.py create-admin admin@pietracker.com password123
  python admin_cli.py deactivate-user user@example.com
  python admin_cli.py activate-user user@example.com
  python admin_cli.py delete-user user@example.com
  python admin_cli.py stats
"""

import json
import os
import sys
from passlib.context import CryptContext
from datetime import datetime
import uuid

# Password hashing (same as main.py)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

USERS_FILE = "users.json"

def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except Exception:
            return {}
    return {}

def save_users(users_db):
    with open(USERS_FILE, 'w') as f:
        json.dump(users_db, f, indent=2)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def list_users():
    users_db = load_users()
    print(f"\n📊 Total Users: {len(users_db)}\n")
    print(f"{'ID':<8} {'Email':<30} {'Role':<10} {'Status':<10} {'Last Login'}")
    print("-" * 80)
    
    for user_id, user in users_db.items():
        status = "Active" if user.get("is_active", True) else "Inactive"
        last_login = user.get("last_login", "Never")[:10] if user.get("last_login") else "Never"
        print(f"{user_id[:8]:<8} {user['email']:<30} {user.get('role', 'user'):<10} {status:<10} {last_login}")

def create_admin(email, password):
    users_db = load_users()
    
    # Check if user already exists
    email = email.lower().strip()
    existing_user = next((u for u in users_db.values() if u.get("email") == email), None)
    if existing_user:
        print(f"❌ User {email} already exists!")
        return
    
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": email,
        "name": email.split("@")[0],
        "password_hash": hash_password(password),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "role": "admin",
        "is_active": True,
        "last_login": None
    }
    
    users_db[user_id] = new_user
    save_users(users_db)
    print(f"✅ Admin user {email} created successfully!")

def find_user_by_email(users_db, email):
    email = email.lower().strip()
    for user_id, user in users_db.items():
        if user.get("email") == email:
            return user_id, user
    return None, None

def deactivate_user(email):
    users_db = load_users()
    user_id, user = find_user_by_email(users_db, email)
    
    if not user:
        print(f"❌ User {email} not found!")
        return
    
    user["is_active"] = False
    save_users(users_db)
    print(f"✅ User {email} deactivated!")

def activate_user(email):
    users_db = load_users()
    user_id, user = find_user_by_email(users_db, email)
    
    if not user:
        print(f"❌ User {email} not found!")
        return
    
    user["is_active"] = True
    save_users(users_db)
    print(f"✅ User {email} activated!")

def delete_user(email):
    users_db = load_users()
    user_id, user = find_user_by_email(users_db, email)
    
    if not user:
        print(f"❌ User {email} not found!")
        return
    
    # Delete user data files
    for filename in [f"{user_id}_expenses.json", f"{user_id}_categories.json"]:
        if os.path.exists(filename):
            os.remove(filename)
            print(f"🗑️  Deleted {filename}")
    
    del users_db[user_id]
    save_users(users_db)
    print(f"✅ User {email} and all data deleted!")

def show_stats():
    users_db = load_users()
    total_users = len(users_db)
    active_users = len([u for u in users_db.values() if u.get("is_active", True)])
    admin_users = len([u for u in users_db.values() if u.get("role") == "admin"])
    
    # Count expense files
    expense_files = [f for f in os.listdir(".") if f.endswith("_expenses.json")]
    
    print("\n📊 PieTracker Statistics")
    print("=" * 30)
    print(f"Total Users: {total_users}")
    print(f"Active Users: {active_users}")
    print(f"Inactive Users: {total_users - active_users}")
    print(f"Admin Users: {admin_users}")
    print(f"Users with Data: {len(expense_files)}")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1]
    
    if command == "list-users":
        list_users()
    elif command == "create-admin":
        if len(sys.argv) != 4:
            print("Usage: python admin_cli.py create-admin <email> <password>")
            return
        create_admin(sys.argv[2], sys.argv[3])
    elif command == "deactivate-user":
        if len(sys.argv) != 3:
            print("Usage: python admin_cli.py deactivate-user <email>")
            return
        deactivate_user(sys.argv[2])
    elif command == "activate-user":
        if len(sys.argv) != 3:
            print("Usage: python admin_cli.py activate-user <email>")
            return
        activate_user(sys.argv[2])
    elif command == "delete-user":
        if len(sys.argv) != 3:
            print("Usage: python admin_cli.py delete-user <email>")
            return
        delete_user(sys.argv[2])
    elif command == "stats":
        show_stats()
    else:
        print("❌ Unknown command!")
        print(__doc__)

if __name__ == "__main__":
    main()