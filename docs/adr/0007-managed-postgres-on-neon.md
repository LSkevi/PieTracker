# 7. Managed Postgres on Neon (not Render's free database)

## Status

Accepted (refines the database hosting in ADR-0002 and ADR-0006)

## Context

The first deployment used Render's free PostgreSQL instance. Render's free
database tier **expires 30 days after creation** (with a 14-day grace period),
after which the database and its data are deleted. When that expiry hit, the
backend lost its database: the web service stayed up but `/db-status` reported
`database_connected: false` and it degraded to a non-persistent fallback, so
logins and expense writes stopped working. The Render **web service itself was
never deleted** — only the free database expired.

## Decision

Host the managed PostgreSQL database on **Neon** (serverless Postgres) and point
the Render web service at it through the `DATABASE_URL` environment variable. No
application code changes are required: `init_database()` already reads
`DATABASE_URL`, so this is purely a hosting/configuration change.

## Consequences

- **Pro:** Neon's free tier does not expire after 30 days, so the demo stays
  functional over time; it also scales compute to zero when idle.
- **Pro:** Decoupling data from the web host means either can be replaced
  independently (e.g. moving the backend host later) without a data migration.
- **Con:** One more provider in the stack (Render for compute, Neon for data,
  Vercel for the frontend) and one more secret (`DATABASE_URL`) to manage.
- **Con:** Neon also cold-starts from scale-to-zero, adding a small latency on
  the first query after an idle period, on top of Render's own cold start.
