import React, { useState } from "react";
import type { LoginData } from "../../types/auth";

interface LoginFormProps {
  onSubmit: (data: LoginData) => Promise<void>;
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
  onUseResetToken: () => void;
  isLoading: boolean;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToSignup,
  onForgotPassword,
  onUseResetToken,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = useState<LoginData>({
    username: "",
    password: "",
  });

  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: LoginData) => ({ ...prev, [name]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (formData.username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (formData.password.length > 256) {
      errors.password = "Password must be 256 characters or fewer";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error is handled by parent component
      console.error("Login error:", error);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your PieTracker account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-content">
          {error && <div className="auth-error-message">{error}</div>}

          <div className="auth-form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={validationErrors.username ? "error" : ""}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
            />
            {validationErrors.username && (
              <span className="auth-field-error">
                {validationErrors.username}
              </span>
            )}
          </div>

          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={validationErrors.password ? "error" : ""}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
              maxLength={100}
            />
            {validationErrors.password && (
              <span className="auth-field-error">
                {validationErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>

          <div className="auth-switch">
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={onSwitchToSignup}
                disabled={isLoading}
              >
                Sign Up
              </button>
            </p>
            <p style={{ marginTop: 8 }}>
              <button
                type="button"
                className="auth-switch-btn"
                onClick={onForgotPassword}
                disabled={isLoading}
              >
                Forgot Password
              </button>
              <span style={{ margin: "0 6px", color: "var(--text-soft)" }}>
                ·
              </span>
              <button
                type="button"
                className="auth-switch-btn"
                onClick={onUseResetToken}
                disabled={isLoading}
              >
                Have Token?
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
