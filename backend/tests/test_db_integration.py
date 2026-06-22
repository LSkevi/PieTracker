"""Placeholders for database-backed integration tests.

Everything that touches ``db_service`` (all expense/category/auth/admin
endpoints in main.py and the whole of simple_db.py) requires a live PostgreSQL
connection: ``db_service.use_db`` gates every code path and the handlers return
503/500 when ``DATABASE_URL`` is unset. The schema also relies on a JSON column
and string ``'true'``/``'false'`` booleans, so substituting SQLite would not be
a faithful test.

These are therefore integration tests, not unit tests. They are intentionally
skipped here rather than faked, and should be run against an ephemeral Postgres
(e.g. testcontainers or a CI service container) via fastapi.testclient. The
skips document the boundary explicitly so the gap is visible and honest.
"""
import os

import pytest

DATABASE_URL = os.environ.get("DATABASE_URL")

pytestmark = pytest.mark.needs_db


@pytest.mark.skipif(
    not DATABASE_URL,
    reason="requires a live PostgreSQL DATABASE_URL; integration test not run in unit suite",
)
def test_signup_login_flow_against_real_db():
    """End-to-end signup -> login -> /auth/me against a real Postgres.

    Not implemented: needs an ephemeral PostgreSQL instance and a fastapi
    TestClient. Tracked as future integration coverage.
    """
    pytest.skip("integration test not implemented; needs ephemeral PostgreSQL")


@pytest.mark.skipif(
    not DATABASE_URL,
    reason="requires a live PostgreSQL DATABASE_URL; integration test not run in unit suite",
)
def test_expense_crud_against_real_db():
    """Create/list/delete expenses scoped by user_id against a real Postgres.

    Not implemented for the same reason as above.
    """
    pytest.skip("integration test not implemented; needs ephemeral PostgreSQL")
