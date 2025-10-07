import React, { useState } from "react";
import type { SignupData } from "../../types/auth";

interface SignupFormProps {
  onSubmit: (data: SignupData) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  error: string | null;
}

const SignupForm: React.FC<SignupFormProps> = ({
  onSubmit,
  onSwitchToLogin,
  isLoading,
  error,
}) => {
  const [formData, setFormData] = useState<SignupData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: SignupData) => ({ ...prev, [name]: value }));

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
    } else if (formData.username.trim().length > 50) {
      errors.username = "Username must be 50 characters or fewer";
    }

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
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
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
      console.error("Signup error:", error);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join PieTracker to start tracking your expenses</p>
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
              placeholder="Choose a username"
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
              placeholder="Create a strong password"
              disabled={isLoading}
              autoComplete="new-password"
              maxLength={100}
            />
            {validationErrors.password && (
              <span className="auth-field-error">
                {validationErrors.password}
              </span>
            )}
          </div>

          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={validationErrors.confirmPassword ? "error" : ""}
              placeholder="Confirm your password"
              disabled={isLoading}
              autoComplete="new-password"
              maxLength={100}
            />
            {validationErrors.confirmPassword && (
              <span className="auth-field-error">
                {validationErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="auth-switch">
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="auth-switch-btn"
                onClick={onSwitchToLogin}
                disabled={isLoading}
              >
                Sign In
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupForm;
