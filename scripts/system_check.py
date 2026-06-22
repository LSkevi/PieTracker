#!/usr/bin/env python3
# Allow running this script standalone: make backend modules importable.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

"""
Comprehensive system check for PieTracker
This script validates all critical functionality before production use
"""

import os
import sys
import requests
import json
from datetime import datetime, date
from dotenv import load_dotenv

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))

try:
    from simple_db import SimpleDBService
except ImportError as e:
    print(f"❌ Cannot import database service: {e}")
    sys.exit(1)

load_dotenv()

# Configuration
API_BASE = "http://127.0.0.1:8000"
TEST_USER_EMAIL = "systemtest@pietracker.com"
TEST_USER_PASSWORD = "TestPassword123!"

class SystemChecker:
    def __init__(self):
        self.db_service = SimpleDBService()
        self.test_user_id = None
        self.auth_token = None
        self.errors = []
        self.warnings = []
        self.success_count = 0
        self.test_count = 0

    def log_test(self, test_name, success, message=""):
        """Log test results"""
        self.test_count += 1
        status = "✅" if success else "❌"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.success_count += 1
        else:
            self.errors.append(f"{test_name}: {message}")
        print()

    def log_warning(self, message):
        """Log warning"""
        print(f"⚠️  {message}")
        self.warnings.append(message)
        print()

    def check_database_connection(self):
        """Check database connectivity and basic operations"""
        print("🔍 Testing Database Connection...")
        
        try:
            if not self.db_service.use_db:
                self.log_test("Database Service", False, "Database service not initialized")
                return False
            
            # Test basic connection
            users = self.db_service.get_all_users()
            self.log_test("Database Connection", True, f"Connected successfully, found {len(users)} users")
            return True
            
        except Exception as e:
            self.log_test("Database Connection", False, f"Connection failed: {str(e)}")
            return False

    def check_api_server(self):
        """Check if API server is running"""
        print("🔍 Testing API Server...")
        
        try:
            response = requests.get(f"{API_BASE}/currencies", timeout=5)
            if response.status_code == 200:
                currencies = response.json()
                self.log_test("API Server", True, f"Server running, {len(currencies)} currencies available")
                return True
            else:
                self.log_test("API Server", False, f"Server returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Server", False, f"Cannot connect to server: {str(e)}")
            return False

    def test_user_registration(self):
        """Test user registration functionality"""
        print("🔍 Testing User Registration...")
        
        # Clean up any existing test user first
        try:
            existing_users = self.db_service.get_all_users()
            for user_id, user_data in existing_users.items():
                if user_data.get('email') == TEST_USER_EMAIL:
                    self.db_service.delete_user(user_id)
                    print(f"   Cleaned up existing test user: {user_id}")
        except:
            pass
        
        try:
            registration_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "username": "systemtest"
            }
            
            response = requests.post(f"{API_BASE}/auth/signup", json=registration_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.test_user_id = result.get('user', {}).get('id')
                self.log_test("User Registration", True, f"User created with ID: {self.test_user_id}")
                return True
            else:
                self.log_test("User Registration", False, f"Registration failed: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, f"Registration error: {str(e)}")
            return False

    def test_user_login(self):
        """Test user login functionality"""
        print("🔍 Testing User Login...")
        
        try:
            login_data = {
                "username": "systemtest",  # Use username, not email
                "password": TEST_USER_PASSWORD
            }
            
            response = requests.post(f"{API_BASE}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result.get('token')
                if self.auth_token:
                    self.log_test("User Login", True, "Login successful, token received")
                    return True
                else:
                    self.log_test("User Login", False, "No access token in response")
                    return False
            else:
                self.log_test("User Login", False, f"Login failed: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Login error: {str(e)}")
            return False

    def get_auth_headers(self):
        """Get authentication headers"""
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}

    def test_expense_crud(self):
        """Test expense CRUD operations"""
        print("🔍 Testing Expense Operations...")
        
        if not self.auth_token:
            self.log_test("Expense CRUD", False, "No authentication token available")
            return False
        
        headers = self.get_auth_headers()
        expense_id = None
        
        try:
            # Create expense
            expense_data = {
                "amount": 25.50,
                "category": "Food",
                "description": "System test expense",
                "currency": "USD",
                "date": str(date.today())
            }
            
            response = requests.post(f"{API_BASE}/expenses", json=expense_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                expense_id = result.get('id')  # expense data is returned directly, not wrapped
                self.log_test("Expense Creation", True, f"Expense created with ID: {expense_id}")
            else:
                self.log_test("Expense Creation", False, f"Failed to create expense: {response.text}")
                return False
            
            # Read expenses
            response = requests.get(f"{API_BASE}/expenses/month/{date.today().year}/{date.today().month}", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                expenses = response.json()
                found_expense = any(exp.get('id') == expense_id for exp in expenses)
                if found_expense:
                    self.log_test("Expense Reading", True, f"Found expense in monthly list ({len(expenses)} total)")
                else:
                    self.log_test("Expense Reading", False, "Created expense not found in monthly list")
                    return False
            else:
                self.log_test("Expense Reading", False, f"Failed to read expenses: {response.text}")
                return False
            
            # Update expense
            update_data = {
                "amount": 30.75,
                "description": "Updated system test expense"
            }
            
            response = requests.put(f"{API_BASE}/expenses/{expense_id}", 
                                  json=update_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.log_test("Expense Update", True, "Expense updated successfully")
            else:
                self.log_test("Expense Update", False, f"Failed to update expense: {response.text}")
                return False
            
            # Delete expense
            response = requests.delete(f"{API_BASE}/expenses/{expense_id}", 
                                     headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.log_test("Expense Deletion", True, "Expense deleted successfully")
            else:
                self.log_test("Expense Deletion", False, f"Failed to delete expense: {response.text}")
                return False
                
            return True
            
        except Exception as e:
            self.log_test("Expense CRUD", False, f"Expense operations error: {str(e)}")
            return False

    def test_category_management(self):
        """Test category management"""
        print("🔍 Testing Category Management...")
        
        if not self.auth_token:
            self.log_test("Category Management", False, "No authentication token available")
            return False
        
        headers = self.get_auth_headers()
        
        try:
            # Get categories
            response = requests.get(f"{API_BASE}/categories", headers=headers, timeout=10)
            
            if response.status_code == 200:
                categories = response.json()
                self.log_test("Category Reading", True, f"Retrieved {len(categories)} categories")
            else:
                self.log_test("Category Reading", False, f"Failed to get categories: {response.text}")
                return False
            
            # Add custom category
            category_data = {
                "name": "SystemTest",
                "color": "#FF5733"
            }
            
            response = requests.post(f"{API_BASE}/categories", json=category_data, 
                                   headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.log_test("Category Creation", True, "Custom category created successfully")
            else:
                self.log_test("Category Creation", False, f"Failed to create category: {response.text}")
                return False
            
            # Delete custom category
            response = requests.delete(f"{API_BASE}/categories/SystemTest", 
                                     headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.log_test("Category Deletion", True, "Custom category deleted successfully")
            else:
                self.log_test("Category Deletion", False, f"Failed to delete category: {response.text}")
                return False
                
            return True
            
        except Exception as e:
            self.log_test("Category Management", False, f"Category operations error: {str(e)}")
            return False

    def test_data_persistence(self):
        """Test data persistence across operations"""
        print("🔍 Testing Data Persistence...")
        
        if not self.auth_token:
            self.log_test("Data Persistence", False, "No authentication token available")
            return False
        
        headers = self.get_auth_headers()
        
        try:
            # Create test data
            expense_data = {
                "amount": 15.25,
                "category": "Transportation",
                "description": "Persistence test",
                "currency": "USD",
                "date": str(date.today())
            }
            
            response = requests.post(f"{API_BASE}/expenses", json=expense_data, 
                                   headers=headers, timeout=10)
            
            if response.status_code != 200:
                self.log_test("Data Persistence Setup", False, "Failed to create test expense")
                return False
            
            expense_id = response.json().get('id')
            
            # Verify data exists in database directly
            if self.test_user_id:
                db_expenses = self.db_service.get_user_expenses(self.test_user_id)
                found_in_db = any(exp.get('id') == expense_id for exp in db_expenses)
                
                if found_in_db:
                    self.log_test("Database Persistence", True, "Data correctly stored in PostgreSQL database")
                else:
                    self.log_test("Database Persistence", False, "Data not found in database")
                    return False
            
            # Verify data accessible via API
            response = requests.get(f"{API_BASE}/expenses/month/{date.today().year}/{date.today().month}", 
                                  headers=headers, timeout=10)
            
            if response.status_code == 200:
                api_expenses = response.json()
                found_in_api = any(exp.get('id') == expense_id for exp in api_expenses)
                
                if found_in_api:
                    self.log_test("API Persistence", True, "Data accessible via API endpoints")
                else:
                    self.log_test("API Persistence", False, "Data not accessible via API")
                    return False
            
            # Clean up
            requests.delete(f"{API_BASE}/expenses/{expense_id}", headers=headers, timeout=10)
            
            return True
            
        except Exception as e:
            self.log_test("Data Persistence", False, f"Persistence test error: {str(e)}")
            return False

    def check_environment_config(self):
        """Check environment configuration"""
        print("🔍 Checking Environment Configuration...")
        
        # Check .env file
        env_file = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_file):
            self.log_test("Environment File", True, ".env file exists")
            
            # Check DATABASE_URL
            database_url = os.getenv('DATABASE_URL')
            if database_url and 'postgresql://' in database_url:
                self.log_test("Database URL", True, "PostgreSQL connection string configured")
            else:
                self.log_test("Database URL", False, "DATABASE_URL not properly configured")
                return False
        else:
            self.log_test("Environment File", False, ".env file missing")
            return False
        
        return True

    def cleanup_test_data(self):
        """Clean up test data"""
        print("🧹 Cleaning up test data...")
        
        try:
            if self.test_user_id:
                # Delete test user and all associated data
                self.db_service.delete_user(self.test_user_id)
                print(f"   ✅ Cleaned up test user: {self.test_user_id}")
        except Exception as e:
            print(f"   ⚠️  Cleanup warning: {str(e)}")

    def run_full_check(self):
        """Run complete system check"""
        print("🚀 PieTracker System Check")
        print("=" * 50)
        print()
        
        # Core infrastructure
        if not self.check_database_connection():
            print("❌ Database connection failed - stopping tests")
            return False
        
        if not self.check_api_server():
            print("❌ API server not accessible - stopping tests")
            return False
        
        self.check_environment_config()
        
        # User authentication
        if not self.test_user_registration():
            print("❌ User registration failed - stopping tests")
            return False
        
        if not self.test_user_login():
            print("❌ User login failed - stopping tests")
            return False
        
        # Core functionality
        self.test_expense_crud()
        self.test_category_management()
        self.test_data_persistence()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 SYSTEM CHECK SUMMARY")
        print("=" * 50)
        print(f"✅ Passed: {self.success_count}/{self.test_count} tests")
        print(f"❌ Failed: {len(self.errors)} tests")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        
        if self.errors:
            print("\n❌ FAILURES:")
            for error in self.errors:
                print(f"   • {error}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"   • {warning}")
        
        success_rate = (self.success_count / self.test_count) * 100 if self.test_count > 0 else 0
        
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 SYSTEM READY FOR PRODUCTION!")
            print("✅ Your girlfriend can safely start using the application.")
            print("✅ All data will be properly saved and persistent.")
        elif success_rate >= 75:
            print("⚠️  SYSTEM MOSTLY READY - Review warnings")
            print("🔧 Consider fixing issues before production use")
        else:
            print("❌ SYSTEM NOT READY FOR PRODUCTION")
            print("🚫 Please fix critical issues before use")
        
        return success_rate >= 90

if __name__ == "__main__":
    checker = SystemChecker()
    checker.run_full_check()