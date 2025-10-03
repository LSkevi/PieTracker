import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPasswordForm from "./ResetPasswordForm";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "../ThemeToggle";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const AuthContainer: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const { login, signup, isLoading, error, clearError } = useAuth();

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
        {/* Decorative nature elements */}
        <div className="auth-nature-bg">
          <div className="nature-element">🌸</div>
          <div className="nature-element">🍃</div>
          <div className="nature-element">🌿</div>
          <div className="nature-element">🌸</div>
        </div>

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
                <h1>🥧 Pie Tracker</h1>
                <p>Beautiful expense tracking made simple</p>
              </div>
              <ThemeToggle />
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
