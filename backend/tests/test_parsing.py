"""Unit tests for backend/parsing.py.

Pure parsing/aggregation logic: OCR JSON post-processing and monthly expense
summarization. No database, network, or Gemini call involved.
"""
import json

import pytest

import parsing


# ---------------------------------------------------------------------------
# parse_ocr_json
# ---------------------------------------------------------------------------
class TestParseOcrJson:
    def test_plain_json(self):
        raw = '{"amount": 12.5, "date": "2024-03-01", "merchant": "Cafe", "category": "Food", "confidence": "high"}'
        result = parsing.parse_ocr_json(raw)
        assert result == {
            "amount": 12.5,
            "date": "2024-03-01",
            "merchant": "Cafe",
            "category": "Food",
            "confidence": "high",
        }

    def test_strips_json_code_fence(self):
        raw = '```json\n{"amount": 5, "date": null, "merchant": null, "category": null}\n```'
        result = parsing.parse_ocr_json(raw)
        assert result["amount"] == 5.0

    def test_strips_plain_code_fence(self):
        raw = '```\n{"amount": 9.99}\n```'
        result = parsing.parse_ocr_json(raw)
        assert result["amount"] == 9.99

    def test_amount_comma_decimal_is_normalized(self):
        result = parsing.parse_ocr_json('{"amount": "12,50"}')
        assert result["amount"] == 12.5

    def test_amount_with_spaces_is_normalized(self):
        result = parsing.parse_ocr_json('{"amount": "1 234,56"}')
        assert result["amount"] == 1234.56

    def test_zero_amount_becomes_none(self):
        result = parsing.parse_ocr_json('{"amount": 0}')
        assert result["amount"] is None

    def test_negative_amount_becomes_none(self):
        result = parsing.parse_ocr_json('{"amount": -3.5}')
        assert result["amount"] is None

    def test_non_numeric_amount_becomes_none(self):
        result = parsing.parse_ocr_json('{"amount": "N/A"}')
        assert result["amount"] is None

    def test_null_amount_stays_none(self):
        result = parsing.parse_ocr_json('{"amount": null}')
        assert result["amount"] is None

    def test_ddmmyyyy_date_is_converted_to_iso(self):
        result = parsing.parse_ocr_json('{"date": "05/03/2024"}')
        assert result["date"] == "2024-03-05"

    def test_single_digit_dm_in_slash_date_is_zero_padded(self):
        # parts[0] must have length 2 to trigger conversion; this is "07/3/2024"
        result = parsing.parse_ocr_json('{"date": "07/3/2024"}')
        assert result["date"] == "2024-03-07"

    def test_iso_date_with_slashes_is_left_untouched(self):
        # parts[0] is "2024" (len 4), so the DD/MM/YYYY branch does not fire.
        result = parsing.parse_ocr_json('{"date": "2024/03/05"}')
        assert result["date"] == "2024/03/05"

    def test_missing_confidence_defaults_to_medium(self):
        result = parsing.parse_ocr_json('{"amount": 1}')
        assert result["confidence"] == "medium"

    def test_missing_optional_fields_default_to_none(self):
        result = parsing.parse_ocr_json("{}")
        assert result["merchant"] is None
        assert result["category"] is None
        assert result["date"] is None
        assert result["amount"] is None

    def test_malformed_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            parsing.parse_ocr_json("not json at all")


# ---------------------------------------------------------------------------
# summarize_expenses
# ---------------------------------------------------------------------------
class TestSummarizeExpenses:
    def test_empty_list(self):
        result = parsing.summarize_expenses([], 2024, 3)
        assert result == {
            "month": "2024-03",
            "total": 0.0,
            "categories": {},
            "expense_count": 0,
        }

    def test_month_is_zero_padded(self):
        result = parsing.summarize_expenses([], 2024, 9)
        assert result["month"] == "2024-09"

    def test_sums_total_and_per_category(self):
        expenses = [
            {"category": "Food", "amount": 10},
            {"category": "Food", "amount": 5.5},
            {"category": "Transport", "amount": 20},
        ]
        result = parsing.summarize_expenses(expenses, 2024, 1)
        assert result["total"] == 35.5
        assert result["categories"] == {"Food": 15.5, "Transport": 20.0}
        assert result["expense_count"] == 3

    def test_string_amounts_are_coerced(self):
        expenses = [
            {"category": "Food", "amount": "10.25"},
            {"category": "Food", "amount": "4.75"},
        ]
        result = parsing.summarize_expenses(expenses, 2024, 1)
        assert result["total"] == 15.0
        assert result["categories"]["Food"] == 15.0
