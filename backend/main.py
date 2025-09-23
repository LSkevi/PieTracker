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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5175", "http://127.0.0.1:5175", "http://localhost:5176", "http://127.0.0.1:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (in production, use a database)
expenses_db = []
DATA_FILE = "expenses.json"

# Load existing data
def load_expenses():
    global expenses_db
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                expenses_db = json.load(f)
        except:
            expenses_db = []

# Save data to file
def save_expenses():
    with open(DATA_FILE, 'w') as f:
        json.dump(expenses_db, f, indent=2)

# Load expenses on startup
load_expenses()

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

@app.get("/categories")
async def get_categories():
    # Comprehensive expense categories for detailed tracking
    return [
        "Shopping",
        "Food & Dining", 
        "Beauty & Personal Care",
        "Fashion & Accessories",
        "Home & Living",
        "Transportation",
        "Health & Wellness",
        "Entertainment",
        "Education",
        "Gifts",
        "Coffee & Treats",
        "Self Care",
        "Fitness",
        "Subscriptions",
        "Other"
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
