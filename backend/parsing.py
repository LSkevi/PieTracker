"""Pure parsing / aggregation helpers extracted from main.py.

These contain no I/O (no DB, no network, no Gemini call) so they can be unit
tested in isolation. The endpoints in main.py call into these after performing
their I/O. Behavior matches the original inline implementations.
"""
from collections import defaultdict
import json
from typing import List, Dict


def parse_ocr_json(response_text: str) -> dict:
    """Parse and sanitize the raw text returned by the OCR model.

    - Strips ```json / ``` markdown code fences.
    - Parses JSON (raises json.JSONDecodeError on malformed input).
    - Coerces amount: comma->dot, strips spaces, rejects <= 0 / non-numeric (-> None).
    - Normalizes DD/MM/YYYY dates to YYYY-MM-DD (leaves other formats untouched).

    Returns a dict with keys: amount, date, merchant, category, confidence.
    """
    response_text = response_text.strip()
    # Remove code block markers if present
    if response_text.startswith('```json'):
        response_text = response_text[7:]
    if response_text.startswith('```'):
        response_text = response_text[3:]
    if response_text.endswith('```'):
        response_text = response_text[:-3]

    result = json.loads(response_text.strip())

    # Validate and clean the extracted amount
    amount = result.get('amount')
    if amount is not None:
        try:
            amount = float(str(amount).replace(',', '.').replace(' ', ''))
            if amount <= 0:
                amount = None
        except (ValueError, TypeError):
            amount = None

    # Clean date format
    date_str = result.get('date')
    if date_str and isinstance(date_str, str):
        date_str = date_str.strip()
        # Handle common French/European date formats
        if '/' in date_str and len(date_str.split('/')) == 3:
            try:
                parts = date_str.split('/')
                if len(parts[0]) == 2:  # DD/MM/YYYY format
                    date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            except Exception:
                pass  # Keep original format if conversion fails

    return {
        "amount": amount,
        "date": date_str,
        "merchant": result.get('merchant'),
        "category": result.get('category'),
        "confidence": result.get('confidence', 'medium'),
    }


def summarize_expenses(expenses: List[Dict], year: int, month: int) -> dict:
    """Aggregate a list of expense dicts into a monthly summary.

    Sums total_amount and per-category totals over the given expenses. Callers
    are responsible for filtering the expenses to the month first (mirrors the
    original endpoint which pre-filters by date prefix).
    """
    category_totals = defaultdict(float)
    total_amount = 0.0
    for expense in expenses:
        category_totals[expense["category"]] += float(expense["amount"])
        total_amount += float(expense["amount"])
    return {
        "month": f"{year}-{month:02d}",
        "total": total_amount,
        "categories": dict(category_totals),
        "expense_count": len(expenses),
    }
