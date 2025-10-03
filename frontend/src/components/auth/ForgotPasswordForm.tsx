import React, { useState } from "react";
import { AuthService } from "../../services/auth";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
}) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    try {
      setLoading(true);
      await AuthService.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Request failed");
      } else {
        setError("Request failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <div className="auth-header">
          <h2>Forgot Password</h2>
          <p>Enter your email to receive a reset link.</p>
        </div>
        {submitted ? (
          <div className="auth-success-message">
            <p>
              If that email exists, a reset link (token) has been generated.
              Check server logs.
            </p>
            <button className="auth-submit-btn" onClick={onBackToLogin}>
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form-content">
            {error && <div className="auth-error-message">{error}</div>}
            <div className="auth-form-group">
              <label htmlFor="fp-email">Email Address</label>
              <input
                type="email"
                id="fp-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div className="auth-switch">
              <button
                type="button"
                className="auth-switch-btn"
                onClick={onBackToLogin}
                disabled={loading}
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

export default ForgotPasswordForm;
