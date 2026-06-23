"""Integration tests for the data endpoints' authentication contract.

After closing the IDOR, every data endpoint requires a valid bearer token and
derives the user id solely from the verified token subject. These tests drive
the FastAPI app via TestClient with an in-memory fake of db_service so they run
without a live PostgreSQL connection.
"""
import pytest
from fastapi.testclient import TestClient

import main
import security


class FakeDB:
    """Minimal in-memory stand-in for simple_db.db_service.

    Implements only what the expense endpoints and get_current_user touch.
    Expenses are scoped by user_id so cross-user access can be asserted.
    """

    use_db = True

    def __init__(self):
        self.users = {}
        self.expenses = {}

    def add_user(self, user_id, email):
        self.users[user_id] = {
            "id": user_id,
            "email": email,
            "username": email.split("@")[0],
            "role": "user",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z",
        }

    def get_user_by_id(self, user_id):
        return self.users.get(user_id)

    def get_user_expenses(self, user_id):
        return [e for e in self.expenses.values() if e["user_id"] == user_id]

    def save_expense(self, expense):
        self.expenses[expense["id"]] = expense
        return True

    def delete_expense(self, expense_id, user_id):
        existing = self.expenses.get(expense_id)
        if existing and existing["user_id"] == user_id:
            del self.expenses[expense_id]
            return True
        return False


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB()
    monkeypatch.setattr(main, "db_service", fake)
    return fake


@pytest.fixture
def client():
    return TestClient(main.app)


def auth_header(user_id):
    token = security.create_access_token({"sub": user_id})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Missing Authorization header -> 401 on every data verb
# ---------------------------------------------------------------------------
class TestExpensesRequireAuth:
    def test_get_expenses_without_auth_is_401(self, db, client):
        assert client.get("/expenses").status_code == 401

    def test_post_expenses_without_auth_is_401(self, db, client):
        payload = {
            "amount": 10.0,
            "category": "Food",
            "description": "lunch",
            "date": "2024-01-01",
        }
        assert client.post("/expenses", json=payload).status_code == 401

    def test_delete_expenses_without_auth_is_401(self, db, client):
        assert client.delete("/expenses/some-id").status_code == 401

    def test_categories_without_auth_is_401(self, db, client):
        assert client.get("/categories").status_code == 401


# ---------------------------------------------------------------------------
# A valid token only ever reaches its own data
# ---------------------------------------------------------------------------
class TestUserScoping:
    def test_token_a_cannot_see_user_b_data(self, db, client):
        db.add_user("user-a", "a@example.com")
        db.add_user("user-b", "b@example.com")

        created = client.post(
            "/expenses",
            json={
                "amount": 42.0,
                "category": "Food",
                "description": "B's groceries",
                "date": "2024-02-01",
            },
            headers=auth_header("user-b"),
        )
        assert created.status_code == 200
        assert created.json()["user_id"] == "user-b"

        # User A lists their own expenses and sees nothing belonging to B.
        a_list = client.get("/expenses", headers=auth_header("user-a"))
        assert a_list.status_code == 200
        assert a_list.json() == []

        # User B sees their own expense.
        b_list = client.get("/expenses", headers=auth_header("user-b"))
        assert b_list.status_code == 200
        assert len(b_list.json()) == 1

    def test_token_a_cannot_delete_user_b_expense(self, db, client):
        db.add_user("user-a", "a@example.com")
        db.add_user("user-b", "b@example.com")

        created = client.post(
            "/expenses",
            json={
                "amount": 5.0,
                "category": "Food",
                "description": "B's coffee",
                "date": "2024-02-02",
            },
            headers=auth_header("user-b"),
        )
        expense_id = created.json()["id"]

        # A tries to delete B's expense: scoped delete misses -> 404, data intact.
        deleted = client.delete(f"/expenses/{expense_id}", headers=auth_header("user-a"))
        assert deleted.status_code == 404
        assert len(db.get_user_expenses("user-b")) == 1


# ---------------------------------------------------------------------------
# POST /expenses validation via the ExpenseCreate model
# ---------------------------------------------------------------------------
class TestExpenseValidation:
    def test_missing_required_field_is_422(self, db, client):
        db.add_user("user-a", "a@example.com")
        resp = client.post(
            "/expenses",
            json={"category": "Food", "description": "no amount", "date": "2024-01-01"},
            headers=auth_header("user-a"),
        )
        assert resp.status_code == 422

    def test_non_numeric_amount_is_422(self, db, client):
        db.add_user("user-a", "a@example.com")
        resp = client.post(
            "/expenses",
            json={
                "amount": "not-a-number",
                "category": "Food",
                "description": "bad amount",
                "date": "2024-01-01",
            },
            headers=auth_header("user-a"),
        )
        assert resp.status_code == 422

    def test_currency_defaults_when_omitted(self, db, client):
        db.add_user("user-a", "a@example.com")
        resp = client.post(
            "/expenses",
            json={
                "amount": 1.0,
                "category": "Food",
                "description": "default currency",
                "date": "2024-01-01",
            },
            headers=auth_header("user-a"),
        )
        assert resp.status_code == 200
        assert resp.json()["currency"] == "CAD"
