# 6. Deployment: backend on Render, frontend on Vercel

## Status

Accepted

## Context

The two tiers have different runtime needs: the FastAPI backend needs a Python
host with a managed PostgreSQL database, while the React SPA is a static bundle
best served from a CDN with SPA routing. Both should deploy from the repo with
minimal configuration and stay within free tiers for a portfolio project.

## Decision

Deploy the **backend on Render** and the **frontend on Vercel**.

- `backend/render.yaml` defines a Python web service:
  `pip install -r requirements.txt` to build, `uvicorn main:app --host 0.0.0.0
  --port $PORT` to start, `healthCheckPath: /`, pinned to Python 3.11.
- `frontend/vercel.json` builds with `npm run build`, serves `dist/`, and
  rewrites all paths (`/(.*)` -> `/index.html`) so client-side routing works.
- The managed PostgreSQL database is hosted separately on **Neon** (see
  ADR-0007), not on Render's free database tier (which expires after 30 days).
- Render's free tier spins instances down when idle, causing cold-start latency.
  A GitHub Actions cron (`.github/workflows/keep-awake.yml`) pings the backend
  root every 10 minutes to keep it warm.

## Consequences

- **Pro:** Each tier uses a host suited to it (Python service vs. static/CDN),
  both deploy straight from the repo, and the setup fits free tiers.
- **Pro:** The SPA rewrite makes deep links work without a custom server.
- **Con:** The keep-alive cron is a workaround for free-tier cold starts, not a
  real fix; it adds noise and would be unnecessary on a paid/always-on plan.
- **Con:** Free-tier instances are stateless and can restart, which is why
  auth/reset state must not live in process memory (see ADR-0003) and why CORS
  currently uses a permissive `allow_origins=["*"]` that should be tightened to
  the Vercel origin.
