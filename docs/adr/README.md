# Architecture Decision Records

This directory records the significant architectural decisions made on
PieTracker, using lightweight
[ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

Each ADR captures one decision with its **Status**, **Context**, **Decision**,
and **Consequences** (including the tradeoffs we accepted). They are written to
be honest about both the benefits and the known limitations of each choice — the
goal is an accurate record, not a sales pitch.

## Index

| #    | Title                                                                          | Status   |
| ---- | ------------------------------------------------------------------------------ | -------- |
| 0001 | [Stack: FastAPI + React/TypeScript (Vite)](0001-stack-fastapi-react-typescript.md) | Accepted |
| 0002 | [Persistence: PostgreSQL via a hand-written SQLAlchemy service](0002-postgresql-sqlalchemy-persistence.md) | Accepted |
| 0003 | [Authentication: stateless JWT with pbkdf2_sha256 hashing](0003-jwt-auth-pbkdf2-sha256.md) | Accepted |
| 0004 | [OCR receipt parsing via Google Gemini](0004-ocr-receipts-google-gemini.md)    | Accepted |
| 0005 | [Environment-based configuration and secrets handling](0005-environment-based-configuration-and-secrets.md) | Accepted |
| 0006 | [Deployment: backend on Render, frontend on Vercel](0006-deployment-render-vercel.md) | Accepted |
| 0007 | [Managed Postgres on Neon (not Render's free database)](0007-managed-postgres-on-neon.md) | Accepted |

## Conventions

- Files are named `NNNN-short-slug.md` with a zero-padded sequence number.
- Status is one of `Proposed`, `Accepted`, `Superseded`, or `Deprecated`.
- Superseding a decision adds a new ADR and updates the old one's status rather
  than rewriting history.
