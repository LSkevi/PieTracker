import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPasswordForm from "./ResetPasswordForm";
import { useAuth } from "../../hooks/useAuth";
import { useStyle } from "../../hooks/useStyle";
import ThemeToggle from "../ThemeToggle";
import StyleToggle from "../StyleToggle";
import FallingLeaves from "../FallingLeaves";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const AuthContainer: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const { login, signup, isLoading, error, clearError } = useAuth();
  const { style } = useStyle();

  const switchToSignup = () => {
    clearError();
    setMode("signup");
  };

  const switchToLogin = () => {
    clearError();
    setMode("login");
  };

  const switchToForgot = () => {
    clearError();
    setMode("forgot");
  };

  const switchToReset = () => {
    clearError();
    setMode("reset");
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        {/* Decorative falling leaves (casual style only) */}
        {style === "casual" && <FallingLeaves />}

        <div className="auth-content">
          <div className="auth-brand">
            <div
              className="auth-brand-header-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <h1>{style === "casual" ? "🥧 " : ""}Pie Tracker</h1>
                <p>Expense tracking made simple</p>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <StyleToggle />
                <ThemeToggle />
              </div>
            </div>
          </div>

          {mode === "login" && (
            <LoginForm
              onSubmit={login}
              onSwitchToSignup={switchToSignup}
              onForgotPassword={switchToForgot}
              onUseResetToken={switchToReset}
              isLoading={isLoading}
              error={error}
            />
          )}
          {mode === "signup" && (
            <SignupForm
              onSubmit={signup}
              onSwitchToLogin={switchToLogin}
              isLoading={isLoading}
              error={error}
            />
          )}
          {mode === "forgot" && (
            <ForgotPasswordForm onBackToLogin={switchToLogin} />
          )}
          {mode === "reset" && (
            <ResetPasswordForm onBackToLogin={switchToLogin} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
