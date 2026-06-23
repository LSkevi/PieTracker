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
# is_admin_user
# ---------------------------------------------------------------------------
class TestIsAdminUser:
    def test_role_admin_is_admin(self):
        assert security.is_admin_user({"role": "admin"}) is True

    def test_role_super_admin_is_admin(self):
        assert security.is_admin_user({"role": "super_admin"}) is True

    def test_magic_email_is_not_admin(self):
        # Admin is determined solely by role; the magic email no longer grants it.
        assert security.is_admin_user({"email": "admin@pietracker.com"}) is False

    def test_magic_id_is_not_admin(self):
        # Admin is determined solely by role; the magic id no longer grants it.
        assert security.is_admin_user({"id": "admin-super-user"}) is False

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
            {"id": "1", "username": "u", "email": "u@x.com", "created_at": dt, "role": "user"}
        )
        assert out == {
            "id": "1",
            "username": "u",
            "email": "u@x.com",
            "created_at": "2024-01-02T03:04:05",
            "role": "user",
        }

    def test_role_defaults_to_user_when_missing(self):
        out = security.prepare_user_for_output(
            {"id": "1", "username": "u", "email": "u@x.com", "created_at": "x"}
        )
        assert out["role"] == "user"

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
        assert set(out.keys()) == {"id", "username", "email", "created_at", "role"}
