import React, { useState } from "react";
import type { LoginData } from "../../types/auth";

interface LoginFormProps {
  onSubmit: (data: LoginData) => Promise<void>;
  onSwitchToSignup: () => void;
  isLoading: boolean;
  error: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToSignup,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });

  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
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

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
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
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={validationErrors.email ? "error" : ""}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
            />
            {validationErrors.email && (
              <span className="auth-field-error">{validationErrors.email}</span>
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
