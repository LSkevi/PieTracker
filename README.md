# PieTracker

> A multi-currency personal expense tracker with receipt OCR, built as a FastAPI + React/TypeScript full-stack application.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-SQLAlchemy-336791?logo=postgresql&logoColor=white)](https://www.sqlalchemy.org/)

## Live demo

- **Frontend (Vercel):** https://pie-tracker-seven.vercel.app
- **Backend API (Render):** https://pietracker.onrender.com

> The backend runs on Render's free tier and may take a few seconds to wake from a cold start on the first request.

---

## The problem

Tracking day-to-day spending is tedious: amounts arrive in different currencies when you travel or shop online, receipts pile up, and most simple trackers force you into one currency and manual data entry. PieTracker addresses this with three things:

1. **Multi-currency by design** — every expense keeps its own currency, and totals are converted on demand into whatever currency you want to view.
2. **Receipt OCR** — photograph or upload a receipt and have the amount, date, merchant, and a suggested category extracted automatically to pre-fill the form.
3. **At-a-glance breakdowns** — interactive pie and trend charts show where money goes, by category and over time.

It is a personal-finance tool and a portfolio project: the goal is a clean, end-to-end full-stack app with an explicit, honest account of its design trade-offs (see [Architecture](#architecture) and [Known limitations](#known-limitations--roadmap)).

## Key features

- **Expense tracking** — create, list, and delete expenses with amount, category, currency, date, and description; browse by month and year.
- **Receipt OCR scanning** — upload or capture a receipt image; Google Gemini parses it into `{ amount, date, merchant, category, confidence }` to pre-fill the expense form.
- **Multi-currency** — 10 supported currencies, each expense stored in its own currency. Live EUR-base exchange rates are fetched from [exchangeratesapi.io](https://exchangeratesapi.io), cached in the browser for 8 hours, with a built-in static fallback table when the API is unavailable.
- **Authentication** — email/username + password signup and login, JWT-based sessions (HS256), `pbkdf2_sha256` password hashing.
- **Categories** — sensible default categories plus user-defined custom categories with custom colors; defaults can be hidden per user.
- **Charts & insights** — category breakdown pie chart, yearly trend chart, and computed totals across mixed currencies (Recharts).
- **Admin panel** — user management (list, activate/deactivate, edit, delete) and basic usage stats for admin accounts.
- **Light / dark theme** and a responsive layout.

## Screenshots

> Image files are not committed yet; drop them in `docs/screenshots/` using the file names below and they will render here.

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

_Category pie chart, monthly total, and the expense list._

### Add expense + receipt OCR

![Add expense and receipt OCR](docs/screenshots/add-expense.png)

_Expense form pre-filled from a scanned receipt._

### Admin panel

![Admin panel](docs/screenshots/admin.png)

_User management and usage stats._

## Demo

The app is gated behind authentication: sign up for an account, or log in, to reach
the dashboard, expense tracking, and charts (see [Live demo](#live-demo)). Admin
features require an account with the `admin` role.

> Demo credentials to be documented here.

## Architecture

PieTracker is a two-tier application: a **FastAPI** backend with a **PostgreSQL** database (accessed through SQLAlchemy), and a **React + TypeScript** single-page app built with Vite.

```
┌──────────────────────────┐         HTTPS / JSON          ┌───────────────────────────┐
│  React + TS SPA (Vite)    │  ───────────────────────────▶ │  FastAPI app (main.py)     │
│                           │   Authorization: Bearer JWT   │                            │
│  • AuthContext + reducer  │                               │  • Auth (JWT, pbkdf2)      │
│  • useExpenses hook       │ ◀───────────────────────────  │  • Expenses / categories   │
│  • currency.ts (rates)    │         JSON responses        │  • OCR endpoint (Gemini)   │
│  • Recharts charts        │                               │  • Admin routes            │
└─────────────┬─────────────┘                               └─────────────┬─────────────┘
              │                                                            │
              │ live FX rates (cached 8h, static fallback)                 │ SQLAlchemy
              ▼                                                            ▼
   exchangeratesapi.io                                          PostgreSQL (db_service)
              ▲                                                            ▲
              │                                                            │
   receipt image ──▶ FastAPI /ocr/receipt ──▶ Google Gemini ──▶ parsed JSON back to form
```

**Backend (`backend/`)**
- `main.py` — the FastAPI application: app/CORS setup, JWT config, password hashing, and all route handlers (expenses, categories, currencies, auth, admin, export, OCR).
- `simple_db.py` — a hand-written data-access layer (`db_service`) over three SQLAlchemy models (`User`, `Expense`, `UserCategories`), using one session per call. Schema is created with `create_all` (no migration tool yet). The database is treated as an optional runtime dependency: with no `DATABASE_URL`, the API stays up and degrades to empty responses.

**Frontend (`frontend/src/`)**
- `contexts/AuthContext.tsx` + `services/auth.ts` — auth state machine and the HTTP/token layer (JWT stored in `localStorage`).
- `hooks/useExpenses.ts` — central server-state hook (axios) that loads categories, currencies, months, summaries, and expenses, and re-fetches after mutations.
- `utils/currency.ts` — client-side formatting and conversion against cached live rates with a static fallback.
- `components/` — `ExpenseForm`, `ReceiptCapture`, `ChartDisplay`, `InfoPanel`, `AdminPanel`, etc.

### Request / data flow

1. **Sign up / log in** — the SPA posts credentials to `/auth/signup` or `/auth/login`. The backend verifies the password (`pbkdf2_sha256`) and returns a signed JWT plus the user object, which the SPA stores in `localStorage`.
2. **Authenticated requests** — `AuthService` attaches `Authorization: Bearer <jwt>` to subsequent calls. The backend resolves the acting user from the token.
3. **Expenses & categories** — the `useExpenses` hook reads/writes via the REST API; the backend persists through `db_service` to PostgreSQL and the SPA re-fetches affected views.
4. **Receipt OCR** — `ReceiptCapture` posts a receipt image to `/ocr/receipt`; the backend validates it with Pillow, sends it to Google Gemini with a strict-JSON prompt, sanitizes the result (amount and `DD/MM/YYYY → ISO` date), and returns structured fields to pre-fill the form.
5. **Currency display** — conversion happens client-side in `currency.ts` using cached EUR-base rates, so totals can be shown in any selected currency.

> Design decisions and their trade-offs (identity model, optional DB, stateless JWT, client-side FX, single-file backend) are documented honestly in [Known limitations & roadmap](#known-limitations--roadmap).

## Tech stack

**Backend**
- FastAPI, Uvicorn (ASGI)
- SQLAlchemy + PostgreSQL (`psycopg2-binary`), database hosted on Neon
- `python-jose[cryptography]` (JWT), `passlib` (`pbkdf2_sha256`)
- `google-generativeai` (Gemini) + Pillow for receipt OCR
- `python-dotenv` for configuration

**Frontend**
- React 19 + TypeScript, Vite
- Recharts (charts), axios (HTTP), date-fns (dates)

**Infrastructure**
- Backend on Render, PostgreSQL on Neon (serverless), frontend on Vercel
- CI on GitHub Actions (`.github/workflows/ci.yml`): builds and tests the frontend and backend on every push
- A separate cron (`.github/workflows/keep-awake.yml`) pings the backend every 10 minutes to reduce free-tier cold starts

## Local development

### Prerequisites
- Python 3.11+ (3.11 is used in deployment)
- Node.js 18+
- A PostgreSQL database (local or hosted). Without `DATABASE_URL` the API runs but returns empty data and `503` on writes.
- Optional: a Google Gemini API key (for OCR) and an exchangeratesapi.io key (for live FX rates).

### 1. Clone

```bash
git clone https://github.com/LSkevi/PieTracker.git
cd PieTracker
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env   # then edit .env (see below)

uvicorn main:app --reload --port 8000
```

Fill in `backend/.env` using `backend/.env.example` as the template:

```ini
GEMINI_API_KEY=          # Google Gemini key for receipt OCR
PIETRACKER_SECRET_KEY=   # long random string used to sign JWTs
DATABASE_URL=            # e.g. postgresql://user:password@host:5432/pietracker
```

The API will be available at `http://localhost:8000` (interactive docs at `http://localhost:8000/docs`).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # optional
npm run dev
```

Fill in `frontend/.env` using `frontend/.env.example` as the template:

```ini
VITE_EXCHANGE_API_KEY=   # exchangeratesapi.io key (optional; static fallback used if absent)
# VITE_API_URL=http://localhost:8000   # optional override; defaults to localhost in dev
```

The app will be available at `http://localhost:5173`. In development the frontend defaults to `http://localhost:8000` for the API; set `VITE_API_URL` to point at a different backend.

> **Never commit real secrets.** Only the `.env.example` files (with empty placeholders) are tracked; `.env` is git-ignored.

### Run both at once

From the repo root, a convenience script runs the backend and frontend together (requires `concurrently`, installed via the root `package.json`):

```bash
npm install        # installs concurrently
npm run dev        # runs backend (uvicorn) + frontend (vite)
```

## Tests and CI

The project has unit test suites on both tiers, run in CI on every push.

- **Frontend (Vitest + React Testing Library, jsdom):** unit tests for the pure utilities — currency conversion math and fallback behavior (`utils/currency.ts`) and local-date parsing (`utils/date.ts`) — plus a component test for `ThemeToggle` (interaction, `localStorage` persistence, accessibility). Run with `npm run test` in `frontend/`.
- **Backend (pytest):** DB-free unit tests for the auth/authz helpers (`security.py`: password hashing, JWT round-trips, the user-identity resolver precedence, admin checks) and the pure parsing/aggregation logic (`parsing.py`: OCR JSON post-processing, monthly summaries). Endpoint and `db_service` tests that need a live PostgreSQL are marked and skipped in the unit run (they belong in integration tests). Run with `pytest` in `backend/`.

To make the backend logic unit-testable without a database, the pure helpers were extracted from `main.py` into `security.py` and `parsing.py`.

CI runs on GitHub Actions (`.github/workflows/ci.yml`) on every push and pull request: it builds and tests the frontend (Node) and installs and tests the backend (Python). A separate cron (`.github/workflows/keep-awake.yml`) pings the backend to mitigate free-tier cold starts.

```bash
# Frontend
cd frontend
npm run lint     # ESLint
npm run test     # Vitest
npm run build    # tsc -b && vite build (type-checks as part of the build)

# Backend
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

## Deployment

### Backend — Render
Configured by `backend/render.yaml`:
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/`
- Required environment variables: `DATABASE_URL` (a managed Postgres on **Neon** — Render's free database expires after 30 days, see [ADR-0007](docs/adr/0007-managed-postgres-on-neon.md)), `PIETRACKER_SECRET_KEY`, `ALLOWED_ORIGINS` (the deployed frontend origin), and `GEMINI_API_KEY` (for OCR).

### Frontend — Vercel
Configured by `frontend/vercel.json`:
- Build: `npm run build`, output directory `dist`
- SPA rewrite: all routes fall back to `/index.html`
- Set `VITE_API_URL` to the deployed backend URL, and `VITE_EXCHANGE_API_KEY` if using live FX rates.

## API overview

Selected endpoints (full surface is defined in `backend/main.py`):

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health`, `/db-status` | Service and database status |
| `GET` | `/expenses` | List expenses for the current user |
| `GET` | `/expenses/month/{year}/{month}` | Expenses for a given month |
| `GET` | `/expenses/summary/{year}/{month}` | Monthly totals + per-category breakdown |
| `POST` | `/expenses` | Create an expense |
| `DELETE` | `/expenses/{expense_id}` | Delete an expense |
| `GET` / `POST` / `DELETE` | `/categories` | List, add, and remove categories |
| `GET` | `/currencies` | Supported currencies |
| `POST` | `/auth/signup`, `/auth/login` | Register / authenticate (returns `{ user, token }`) |
| `GET` | `/auth/me` | Current user from the bearer token |
| `POST` | `/ocr/receipt` | OCR a receipt image (auth required) |
| `GET` | `/admin/users`, `/admin/stats` | Admin-only user management and stats |
| `GET` | `/export/expenses` | Export the current user's expenses as JSON |

Supported currencies: **CAD, USD, EUR, GBP, JPY, AUD, CHF, CNY, INR, BRL**.

## Known limitations & roadmap

This project is intentionally transparent about its current trade-offs. The most relevant for reviewers:

- **Identity / trust model.** Expense and category endpoints use an optional-auth resolver that prefers the JWT subject but also accepts an `X-User-Id` header and a shared anonymous bucket for pre-login use. For a finance app these endpoints should require a verified token and derive the user solely from it — planned hardening.
- **JWT in `localStorage`** is exposed to XSS; an httpOnly cookie would be safer. Tokens are non-revocable for their 7-day lifetime.
- **Password reset is a demo.** Reset tokens are held in process memory, so they are lost on restart and don't work across multiple instances.
- **No database migrations.** Schema is created with `create_all`; adopting Alembic is planned. A couple of schema smells (string `is_active`, dual password columns) should be normalized.
- **Single-file backend.** `main.py` mixes routing, auth, OCR, and persistence orchestration; splitting into routers/modules is planned.
- **Client-side currency conversion** means totals depend on each browser's cached rates, and stale/fallback rates can produce slightly different figures across clients.

Planned work, roughly in order:

- [x] Frontend (Vitest) and backend (pytest) test suites + a CI workflow
- [x] Restrict CORS to the deployed origin via environment configuration (`ALLOWED_ORIGINS`)
- [x] Extract pure logic from `main.py` (`security.py`, `parsing.py`) for testability
- [ ] Require authentication on all expense/category endpoints; remove the anonymous/header identity path
- [ ] Move JWTs to httpOnly cookies and add token revocation
- [ ] Replace in-memory reset tokens and `create_all` with a real reset flow and Alembic migrations
- [ ] Split `main.py` into routers (the pure logic is already extracted)
- [ ] Export to CSV/PDF and basic budget tracking

## Project structure

```
PieTracker/
├── backend/
│   ├── main.py              # FastAPI app: routes, auth, OCR, admin
│   ├── security.py          # pure auth/authz helpers (hashing, JWT, user resolution)
│   ├── parsing.py           # pure OCR-JSON parsing + summary aggregation
│   ├── simple_db.py         # SQLAlchemy models + db_service
│   ├── tests/               # pytest unit tests (security, parsing)
│   ├── render.yaml          # Render deployment config
│   ├── requirements.txt
│   ├── requirements-dev.txt # test/dev dependencies
│   ├── pytest.ini
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # ExpenseForm, ReceiptCapture, ChartDisplay, AdminPanel, ...
│   │   ├── contexts/         # AuthContext
│   │   ├── hooks/            # useExpenses, useAuth
│   │   ├── services/         # auth.ts
│   │   ├── utils/            # currency.ts (+ .test), date.ts (+ .test)
│   │   ├── constants/        # colors.ts
│   │   └── config/           # constants.ts (API base URL)
│   ├── vercel.json           # Vercel deployment + SPA rewrite
│   └── .env.example
├── docs/adr/                 # architecture decision records
├── scripts/                  # ops / maintenance / smoke scripts (not the test suite)
├── .github/workflows/
│   ├── ci.yml                # build + test (frontend + backend)
│   └── keep-awake.yml        # cron ping to mitigate cold starts
├── package.json              # root dev scripts (concurrently)
└── README.md
```

## License

MIT, see [LICENSE](LICENSE). Also declared as MIT in the root `package.json`.
