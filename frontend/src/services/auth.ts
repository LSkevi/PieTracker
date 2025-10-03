import axios from "axios";
import type {
  LoginData,
  SignupData,
  AuthResponse,
  User,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "../types/auth";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://pietracker.onrender.com"
    : "http://localhost:8000");

const TOKEN_KEY = "pietracker_token";
const USER_KEY = "pietracker_user";

export class AuthService {
  // Get stored token
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Get stored user
  static getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Store token and user
  static setAuth(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Clear auth data
  static clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Also clear the old user ID system
    localStorage.removeItem("pietracker_user_id");
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  // Get auth headers for API calls
  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const user = this.getUser();

    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(user && { "X-User-Id": user.id }),
    };
  }

  // Login user
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, data);
      const authData: AuthResponse = response.data;

      this.setAuth(authData.token, authData.user);
      return authData;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || "Login failed");
      }
      throw new Error("Network error occurred");
    }
  }

  // Register user
  static async signup(data: SignupData): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE}/auth/signup`, {
        email: data.email,
        password: data.password,
        name: data.name,
      });
      const authData: AuthResponse = response.data;

      this.setAuth(authData.token, authData.user);
      return authData;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || "Registration failed");
      }
      throw new Error("Network error occurred");
    }
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      const headers = this.getAuthHeaders();
      await axios.post(`${API_BASE}/auth/logout`, {}, { headers });
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      this.clearAuth();
    }
  }

  // Verify token validity
  static async verifyToken(): Promise<User | null> {
    try {
      const headers = this.getAuthHeaders();
      if (!headers.Authorization) return null;

      const response = await axios.get(`${API_BASE}/auth/me`, { headers });
      return response.data.user;
    } catch (error) {
      console.warn("Token verification failed:", error);
      this.clearAuth();
      return null;
    }
  }

  // Request password reset (always resolves with generic message if user exists or not)
  static async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    try {
      const response = await axios.post(
        `${API_BASE}/auth/forgot-password`,
        data
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || "Request failed");
      }
      throw new Error("Network error occurred");
    }
  }

  // Reset password using token provided via email (simulated)
  static async resetPassword(
    data: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    try {
      const response = await axios.post(
        `${API_BASE}/auth/reset-password`,
        data
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || "Reset failed");
      }
      throw new Error("Network error occurred");
    }
  }
}
