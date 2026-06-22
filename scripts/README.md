# Scripts

Manual operational, maintenance, and smoke-test scripts.

These are **not** the automated test suite. Unit tests live in
[`backend/tests/`](../backend/tests) (pytest) and `frontend/src/**/*.test.ts(x)`
(Vitest), and run in CI.

Most DB-coupled scripts add `../backend` to `sys.path` so they can import the
backend modules; run them with the backend environment configured
(`DATABASE_URL` set), e.g. `python scripts/diagnose_db.py`.

## Operations
- `keep_alive.py`, `ping_pietracker.sh` — ping the deployed backend to avoid free-tier cold starts.
- `diagnose_db.py` — inspect database connectivity and contents.
- `system_check.py` — end-to-end check against a running server.

## Migrations
- `migrate_db.py` — one-off schema migration (pre-Alembic).

## Maintenance
- `debug_categories.py`, `reset_categories.py`, `cleanup_categories.py` — category data utilities.

## Smoke tests (require a running server)
- `auth_smoke_test.py` — auth flow smoke test.
- `db_smoke.py` — database read/write smoke check.
- `category_isolation_smoke.py` — multi-user category isolation check.
