# 5. Environment-based configuration and secrets handling

## Status

Accepted

## Context

The app depends on several secrets and environment-specific values: the Gemini
API key, the JWT signing secret, the PostgreSQL connection string, and the
frontend's exchange-rate API key. These must never be committed to the
repository, must differ between local and production, and the backend must still
boot when optional values are absent.

## Decision

Configure everything through **environment variables**, with documented
`.env.example` templates and no secrets in source control.

- Backend reads `GEMINI_API_KEY`, `PIETRACKER_SECRET_KEY`, and `DATABASE_URL`
  via `os.environ.get`, loading a local `.env` through `python-dotenv` when
  present (and falling back to system env when `dotenv` is not installed).
- Frontend reads `VITE_EXCHANGE_API_KEY`; per Vite, only `VITE_`-prefixed vars
  are exposed to the browser bundle.
- `backend/.env.example` and `frontend/.env.example` document each variable with
  placeholder values, and `.gitignore` excludes real `.env` files.
- Missing optional values degrade gracefully: no `GEMINI_API_KEY` disables OCR,
  no `DATABASE_URL` runs the DB-optional path (ADR-0002), no exchange key uses
  fallback rates (ADR not separate — see currency handling).

## Consequences

- **Pro:** Secrets stay out of git; the same code runs locally and on
  Render/Vercel by changing env vars only. Graceful degradation aids local dev.
- **Con:** `VITE_`-prefixed values are embedded in the shipped client bundle, so
  the exchange key is not truly secret — acceptable only for a low-privilege,
  rate-limited public key.
- **Con:** There is no schema/validation layer asserting required vars at boot;
  misconfiguration surfaces as runtime degradation rather than a startup error.
