"""Unit tests for backend/security.py.

These exercise pure auth/authz helpers (password hashing, JWT creation,
user-id resolution, admin check, output shaping). No database or network is
involved, so they run without DATABASE_URL or any external service.
"""
from datetime import datetime, timedelta

from jose import jwt
import pytest

import security


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
class TestPasswordHashing:
    def test_hash_then_verify_roundtrip(self):
        hashed = security.hash_password("s3cret-pass")
        assert hashed != "s3cret-pass"  # not stored in plaintext
        assert security.verify_password("s3cret-pass", hashed) is True

    def test_verify_rejects_wrong_password(self):
        hashed = security.hash_password("correct-horse")
        assert security.verify_password("wrong-password", hashed) is False

    def test_hash_uses_pbkdf2_sha256(self):
        hashed = security.hash_password("anything")
        assert hashed.startswith("$pbkdf2-sha256$")

    def test_hashes_are_salted_and_unique(self):
        a = security.hash_password("same")
        b = security.hash_password("same")
        assert a != b
        assert security.verify_password("same", a)
        assert security.verify_password("same", b)

    def test_verify_returns_false_on_malformed_hash(self):
        # verify_password swallows passlib errors and returns False.
        assert security.verify_password("pw", "not-a-real-hash") is False


# ---------------------------------------------------------------------------
# JWT creation / decoding
# ---------------------------------------------------------------------------
class TestAccessToken:
    def test_create_and_decode_roundtrip(self):
        token = security.create_access_token({"sub": "user-123"})
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        assert payload["sub"] == "user-123"
        assert "exp" in payload

    def test_token_carries_expiry(self):
        token = security.create_access_token({"sub": "u"}, expires_delta=timedelta(minutes=5))
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        exp = datetime.utcfromtimestamp(payload["exp"])
        delta = exp - datetime.utcnow()
        # Should be roughly 5 minutes out (allow generous slack for slow CI).
        assert timedelta(minutes=4) < delta <= timedelta(minutes=6)

    def test_decode_with_wrong_secret_fails(self):
        token = security.create_access_token({"sub": "u"})
        with pytest.raises(Exception):
            jwt.decode(token, "a-different-secret", algorithms=[security.ALGORITHM])


# ---------------------------------------------------------------------------
# resolve_user_id precedence
# ---------------------------------------------------------------------------
class TestResolveUserId:
    def test_valid_bearer_token_wins_over_header(self):
        token = security.create_access_token({"sub": "token-user"})
        result = security.resolve_user_id(
            x_user_id="header-user",
            authorization=f"Bearer {token}",
        )
        assert result == "token-user"

    def test_bearer_is_case_insensitive(self):
        token = security.create_access_token({"sub": "token-user"})
        result = security.resolve_user_id(None, f"bearer {token}")
        assert result == "token-user"

    def test_invalid_token_falls_back_to_header(self):
        result = security.resolve_user_id(
            x_user_id="header-user",
            authorization="Bearer not.a.valid.jwt",
        )
        assert result == "header-user"

    def test_invalid_token_and_no_header_falls_back_to_anon(self):
        result = security.resolve_user_id(None, "Bearer garbage")
        assert result == "public-anon-user"

    def test_header_used_when_no_authorization(self):
        assert security.resolve_user_id("just-a-header", None) == "just-a-header"

    def test_header_is_stripped(self):
        assert security.resolve_user_id("  spaced  ", None) == "spaced"

    def test_no_token_no_header_returns_anon(self):
        assert security.resolve_user_id(None, None) == "public-anon-user"

    def test_blank_header_returns_anon(self):
        assert security.resolve_user_id("   ", None) == "public-anon-user"

    def test_token_with_blank_sub_falls_back_to_header(self):
        token = security.create_access_token({"sub": "   "})
        assert security.resolve_user_id("header-user", f"Bearer {token}") == "header-user"


# ---------------------------------------------------------------------------
# is_admin_user
# ---------------------------------------------------------------------------
class TestIsAdminUser:
    def test_role_admin_is_admin(self):
        assert security.is_admin_user({"role": "admin"}) is True

    def test_role_super_admin_is_admin(self):
        assert security.is_admin_user({"role": "super_admin"}) is True

    def test_magic_email_is_admin(self):
        assert security.is_admin_user({"email": "admin@pietracker.com"}) is True

    def test_magic_id_is_admin(self):
        assert security.is_admin_user({"id": "admin-super-user"}) is True

    def test_regular_user_is_not_admin(self):
        assert security.is_admin_user(
            {"role": "user", "email": "joe@example.com", "id": "abc"}
        ) is False

    def test_empty_dict_is_not_admin(self):
        assert security.is_admin_user({}) is False


# ---------------------------------------------------------------------------
# prepare_user_for_output
# ---------------------------------------------------------------------------
class TestPrepareUserForOutput:
    def test_datetime_created_at_is_isoformatted(self):
        dt = datetime(2024, 1, 2, 3, 4, 5)
        out = security.prepare_user_for_output(
            {"id": "1", "username": "u", "email": "u@x.com", "created_at": dt}
        )
        assert out == {
            "id": "1",
            "username": "u",
            "email": "u@x.com",
            "created_at": "2024-01-02T03:04:05",
        }

    def test_string_created_at_is_passed_through(self):
        out = security.prepare_user_for_output(
            {"id": "1", "username": "u", "email": "u@x.com", "created_at": "2024-01-02T00:00:00Z"}
        )
        assert out["created_at"] == "2024-01-02T00:00:00Z"

    def test_only_expected_keys_returned(self):
        out = security.prepare_user_for_output(
            {
                "id": "1",
                "username": "u",
                "email": "u@x.com",
                "created_at": "x",
                "password_hash": "SHOULD_NOT_LEAK",
            }
        )
        assert "password_hash" not in out
        assert set(out.keys()) == {"id", "username", "email", "created_at"}
