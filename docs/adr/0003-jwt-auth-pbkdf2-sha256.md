# 3. Authentication: stateless JWT with pbkdf2_sha256 password hashing

## Status

Accepted

## Context

The API needs user authentication for signup/login and to protect sensitive
endpoints (OCR, admin, export). The deployment target is Render's free tier,
where instances are stateless and may restart, so a server-side session store is
undesirable. An early attempt to use bcrypt hit Windows backend issues and the
72-byte password truncation limit.

## Decision

Use **stateless JSON Web Tokens** (HS256, `python-jose`) signed with
`PIETRACKER_SECRET_KEY` (env var; dev fallback `dev-secret-change-me`) and a
7-day expiry. The token `sub` claim carries the user id. Passwords are hashed
with **`pbkdf2_sha256`** via passlib (`CryptContext(schemes=["pbkdf2_sha256"])`)
to avoid the bcrypt portability/truncation problems noted in the code comment.

`create_access_token` sets `exp`; `get_current_user` decodes the bearer token and
loads the user from the DB. The frontend stores the JWT and user object in
`localStorage`. Logout is a no-op the client honours by discarding the token.
Password-reset tokens are kept in an in-process dict (`PASSWORD_RESET_TOKENS`).

## Consequences

- **Pro:** No session backend needed; trivial horizontal statelessness for the
  core auth path. `pbkdf2_sha256` sidesteps real bcrypt portability pain.
- **Con:** `localStorage` tokens are exposed to XSS; an httpOnly cookie would be
  safer for a finance app.
- **Con:** 7-day tokens are non-revocable — logout/deactivation cannot truly
  invalidate an issued token.
- **Con:** The in-memory reset store is lost on restart and does not work across
  multiple Render instances, so password reset is effectively a demo. The
  dev-fallback secret is safe only because production sets the env var.
