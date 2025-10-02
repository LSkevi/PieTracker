from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from datetime import datetime, date
import json
import os
from collections import defaultdict

app = FastAPI(title="PieTracker - Elegant Finance App")

# CORS middleware to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:5175", 
        "http://127.0.0.1:5175", 
        "http://localhost:5176", 
        "http://127.0.0.1:5176",
        "https://*.vercel.app",
        "https://pietracker.vercel.app",
        "https://*.onrender.com",
        "https://pietracker-frontend.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint for deployment monitoring
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "PieTracker API is running"}

@app.get("/")
async def root():
    return {"message": "Welcome to PieTracker API", "docs": "/docs"}

# In-memory storage (in production, use a database)
expenses_db = []
categories_db = {}  # Store custom category colors: {category_name: color}
DATA_FILE = "expenses.json"
CATEGORIES_FILE = "categories.json"

# Load existing data
def load_expenses():
    global expenses_db
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                expenses_db = json.load(f)
        except:
            expenses_db = []

def load_categories():
    global categories_db
    if os.path.exists(CATEGORIES_FILE):
        try:
            with open(CATEGORIES_FILE, 'r') as f:
                data = json.load(f)
                # Handle both old format (list) and new format (dict)
                if isinstance(data, list):
                    categories_db = {}
                elif isinstance(data, dict):
                    categories_db = data
                else:
                    categories_db = {}
        except:
            categories_db = {}
    else:
        categories_db = {}

# Save data to file
def save_expenses():
    with open(DATA_FILE, 'w') as f:
        json.dump(expenses_db, f, indent=2)

def save_categories():
    with open(CATEGORIES_FILE, 'w') as f:
        json.dump(categories_db, f, indent=2)

# Load expenses on startup
load_expenses()
load_categories()

# Ensure categories_db is a dict
if not isinstance(categories_db, dict):
    categories_db = {}

@app.get("/")
async def root():
    return {"message": "Welcome to PieTracker!"}

@app.get("/expenses")
async def get_expenses():
    return expenses_db

@app.get("/expenses/month/{year}/{month}")
async def get_expenses_by_month(year: int, month: int):
    month_str = f"{year:04d}-{month:02d}"
    monthly_expenses = [
        expense for expense in expenses_db 
        if expense["date"].startswith(month_str)
    ]
    return monthly_expenses

@app.get("/expenses/summary/{year}/{month}")
async def get_monthly_summary(year: int, month: int):
    month_str = f"{year:04d}-{month:02d}"
    monthly_expenses = [
        expense for expense in expenses_db 
        if expense["date"].startswith(month_str)
    ]
    
    # Group by category
    category_totals = defaultdict(float)
    total_amount = 0
    
    for expense in monthly_expenses:
        category_totals[expense["category"]] += expense["amount"]
        total_amount += expense["amount"]
    
    return {
        "month": f"{year}-{month:02d}",
        "total": total_amount,
        "categories": dict(category_totals),
        "expense_count": len(monthly_expenses)
    }

@app.post("/expenses")
async def create_expense(expense: dict):
    import uuid
    new_expense = {
        "id": str(uuid.uuid4()),
        "amount": float(expense["amount"]),
        "category": expense["category"],
        "description": expense["description"],
        "date": expense["date"],
        "currency": expense.get("currency", "CAD"),
        "created_at": datetime.now().isoformat()
    }
    expenses_db.append(new_expense)
    save_expenses()
    return new_expense

@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    global expenses_db
    expenses_db = [exp for exp in expenses_db if exp["id"] != expense_id]
    save_expenses()
    return {"message": "Expense deleted successfully"}

@app.get("/expenses/available-months")
async def get_available_months():
    """Get all year-month combinations that have expenses"""
    available_months = set()
    
    for expense in expenses_db:
        # Extract year-month from date (format: YYYY-MM-DD)
        date_parts = expense["date"].split("-")
        if len(date_parts) >= 2:
            year_month = f"{date_parts[0]}-{date_parts[1]}"
            available_months.add(year_month)
    
    # Convert to list of dictionaries with year and month
    result = []
    for year_month in sorted(available_months):
        year, month = year_month.split("-")
        result.append({
            "year": int(year),
            "month": int(month),
            "year_month": year_month
        })
    
    return result

@app.get("/categories")
async def get_categories():
    # Get unique categories from existing expenses plus 4 basic defaults
    used_categories = set()
    for expense in expenses_db:
        if expense.get("category"):
            used_categories.add(expense["category"])
    
    # Only 4 basic default categories
    default_categories = ["Food", "Transportation", "Shopping", "Entertainment"]
    
    # Add custom categories from categories_db
    custom_categories = list(categories_db.keys()) if isinstance(categories_db, dict) else []
    
    # Combine defaults with user-created categories
    all_categories = list(set(default_categories + list(used_categories) + custom_categories))
    all_categories.sort()
    
    return all_categories

@app.post("/categories")
async def add_category(category_data: dict):
    category_name = category_data.get("name", "").strip()
    category_color = category_data.get("color", "#a8b5a0")
    
    if not category_name:
        raise HTTPException(status_code=400, detail="Category name is required")
    
    # Check if category already exists
    used_categories = set()
    for expense in expenses_db:
        if expense.get("category"):
            used_categories.add(expense["category"])
    
    default_categories = ["Food", "Transportation", "Shopping", "Entertainment"]
    custom_categories = list(categories_db.keys()) if isinstance(categories_db, dict) else []
    all_categories = list(set(default_categories + list(used_categories) + custom_categories))
    
    if category_name in all_categories:
        raise HTTPException(status_code=400, detail=f"Category '{category_name}' already exists")
    
    # Store the category with its color
    categories_db[category_name] = category_color
    save_categories()
    
    return {"message": f"Category '{category_name}' added successfully", "category": category_name, "color": category_color}

@app.get("/categories/colors")
async def get_category_colors():
    return categories_db

@app.delete("/categories/{category_name}")
async def delete_category(category_name: str):
    # Don't allow deletion of default categories
    default_categories = ["Food", "Transportation", "Shopping", "Entertainment"]
    if category_name in default_categories:
        raise HTTPException(status_code=400, detail=f"Cannot delete default category: {category_name}")
    
    # Remove from custom categories
    if isinstance(categories_db, dict) and category_name in categories_db:
        del categories_db[category_name]
        save_categories()
    
    # Also remove any expenses with this category
    global expenses_db
    original_count = len(expenses_db)
    expenses_db = [exp for exp in expenses_db if exp.get("category") != category_name]
    deleted_expenses = original_count - len(expenses_db)
    
    if deleted_expenses > 0:
        save_expenses()
    
    return {"message": f"Category '{category_name}' deleted successfully. {deleted_expenses} associated expenses were also removed."}

@app.get("/currencies")
async def get_currencies():
    # Supported currencies with their symbols and names
    return [
        {"code": "CAD", "symbol": "CA$", "name": "Canadian Dollar"},
        {"code": "USD", "symbol": "US$", "name": "US Dollar"},
        {"code": "EUR", "symbol": "€", "name": "Euro"},
        {"code": "GBP", "symbol": "£", "name": "British Pound"},
        {"code": "JPY", "symbol": "¥", "name": "Japanese Yen"},
        {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"},
        {"code": "CHF", "symbol": "Fr", "name": "Swiss Franc"},
        {"code": "CNY", "symbol": "¥", "name": "Chinese Yuan"},
        {"code": "INR", "symbol": "₹", "name": "Indian Rupee"},
        {"code": "BRL", "symbol": "R$", "name": "Brazilian Real"}
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
