# 2. Persistence: PostgreSQL via a hand-written SQLAlchemy service

## Status

Accepted

## Context

The app must persist users, expenses, and per-user categories. The backend is
deployed on Render (see ADR-0006) with a managed PostgreSQL database on Neon
(see ADR-0007). The project wants persistence that is easy to read and deploy
without a migration toolchain, while still booting when the database is not
configured (e.g. local runs without `DATABASE_URL`).

## Decision

Use **PostgreSQL** accessed through a thin, hand-written service layer
(`SimpleDBService` in `backend/simple_db.py`) over three SQLAlchemy models:
`User`, `Expense`, and `UserCategories` (the last storing categories in a `JSON`
column). The service uses a session-per-call pattern.

`init_database()` reads `DATABASE_URL`, rewrites a `postgres://` prefix to
`postgresql://`, and creates tables with `Base.metadata.create_all`. If
SQLAlchemy is missing or `DATABASE_URL` is unset, `use_db` is `False` and every
method no-ops/returns empty; handlers in `main.py` guard on
`if db_service and db_service.use_db` and otherwise degrade to `[]`/`{}`/503.

## Consequences

- **Pro:** Minimal dependencies, easy to follow, zero migration ceremony on
  deploy; a missing DB yields a degraded-but-up service plus a `/db-status`
  surface.
- **Con:** No Alembic — schema changes are `create_all`-only, with no safe
  column changes/backfills.
- **Con:** Some endpoints (summary/year) load all of a user's expenses into
  Python and filter by date-string prefix instead of querying.
- **Con:** Smells worth fixing: `is_active` is stored as a string
  (`'true'`/`'false'`) and the `User` model keeps both `password_hash` and
  `hashed_password` columns "for compatibility."
