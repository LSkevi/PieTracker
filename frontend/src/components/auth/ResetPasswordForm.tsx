import React, { useState } from "react";
import { AuthService } from "../../services/auth";

interface ResetPasswordFormProps {
  onBackToLogin: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onBackToLogin,
}) => {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) return setError("Token is required");
    if (password.length < 6)
      return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    try {
      setLoading(true);
      await AuthService.resetPassword({ token, new_password: password });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <div className="auth-header">
          <h2>Reset Password</h2>
          <p>Paste the token you received and choose a new password.</p>
        </div>
        {success ? (
          <div className="auth-success-message">
            <p>Password reset successful. You can now log in.</p>
            <button className="auth-submit-btn" onClick={onBackToLogin}>
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form-content">
            {error && <div className="auth-error-message">{error}</div>}
            <div className="auth-form-group">
              <label htmlFor="reset-token">Reset Token</label>
              <input
                id="reset-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter reset token"
                disabled={loading}
                autoComplete="off"
              />
            </div>
            <div className="auth-form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                type="password"
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <div className="auth-form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                type="password"
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <div className="auth-switch">
              <button
                type="button"
                className="auth-switch-btn"
                disabled={loading}
                onClick={onBackToLogin}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordForm;
