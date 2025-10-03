import React, { createContext, useReducer, useEffect } from "react";
import { AuthService } from "../services/auth";
import type { AuthState, LoginData, SignupData, User } from "../types/auth";

// Auth actions
type AuthAction =
  | { type: "LOADING" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGOUT" }
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
};

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Context type
interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      dispatch({ type: "LOADING" });
      
      try {
        if (AuthService.isAuthenticated()) {
          const user = await AuthService.verifyToken();
          if (user) {
            dispatch({ type: "LOGIN_SUCCESS", payload: user });
          } else {
            dispatch({ type: "LOGOUT" });
          }
        } else {
          dispatch({ type: "LOGOUT" });
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        dispatch({ type: "LOGOUT" });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (data: LoginData) => {
    try {
      dispatch({ type: "LOADING" });
      const response = await AuthService.login(data);
      dispatch({ type: "LOGIN_SUCCESS", payload: response.user });
    } catch (error) {
      dispatch({ 
        type: "ERROR", 
        payload: error instanceof Error ? error.message : "Login failed"
      });
      throw error;
    }
  };

  // Signup function
  const signup = async (data: SignupData) => {
    try {
      dispatch({ type: "LOADING" });
      const response = await AuthService.signup(data);
      dispatch({ type: "LOGIN_SUCCESS", payload: response.user });
    } catch (error) {
      dispatch({ 
        type: "ERROR", 
        payload: error instanceof Error ? error.message : "Registration failed"
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AuthService.logout();
      dispatch({ type: "LOGOUT" });
    } catch (error) {
      console.error("Logout failed:", error);
      // Still logout locally even if API call fails
      dispatch({ type: "LOGOUT" });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const value: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};