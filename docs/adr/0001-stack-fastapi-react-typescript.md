# 1. Stack: FastAPI backend + React/TypeScript (Vite) frontend

## Status

Accepted

## Context

PieTracker is a two-tier personal-finance expense tracker built as a portfolio
project. It needs a REST API for expense/category CRUD, JWT auth, and OCR
receipt parsing, plus an interactive single-page UI with charts and live
currency conversion. The implementation favours a small, readable codebase over
a heavyweight framework setup.

## Decision

Use **FastAPI (Python)** for the backend and **React 19 + TypeScript on Vite**
for the frontend, communicating over a flat JSON REST API via `axios`.

The backend lives in a single module (`backend/main.py`, ~1145 lines) exposing
~30 routes. FastAPI was chosen for its Pydantic request/response models
(`BaseModel`, `EmailStr`), dependency-injection auth (`Depends`), and
`OAuth2PasswordBearer`/multipart support used by the OCR upload endpoint. The
frontend uses React function components, hooks, and Context, with `recharts` for
the pie/line charts.

## Consequences

- **Pro:** Minimal ceremony; Pydantic gives typed validation for free, and Vite
  gives fast TS builds (`tsc -b && vite build`). The two tiers deploy
  independently (see ADR-0006).
- **Pro:** TypeScript on the client mirrors the typed backend, reducing
  contract drift.
- **Con:** Keeping the entire backend in one `main.py` mixes routing, auth, OCR,
  and persistence orchestration; it does not scale and would benefit from being
  split into routers/services as the app grows.
- **Con:** Two languages/toolchains (pip + npm) increase the setup surface for
  contributors.
