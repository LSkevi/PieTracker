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
import { API_CONFIG, AUTH_CONFIG } from "../config/constants";

export class AuthService {
  // Get stored token
  static getToken(): string | null {
    return localStorage.getItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
  }

  // Get stored user
  static getUser(): User | null {
    const userStr = localStorage.getItem(AUTH_CONFIG.USER_STORAGE_KEY);
    if (!userStr) return null;
    try {
      const parsed = JSON.parse(userStr);
      // Backward compatibility: older versions stored 'name' instead of 'username'
      if (parsed && !parsed.username && parsed.name) {
        parsed.username = parsed.name;
        delete parsed.name;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  // Store token and user
  static setAuth(token: string, user: User): void {
    localStorage.setItem(AUTH_CONFIG.TOKEN_STORAGE_KEY, token);
    localStorage.setItem(AUTH_CONFIG.USER_STORAGE_KEY, JSON.stringify(user));
  }

  // Clear auth data
  static clearAuth(): void {
    localStorage.removeItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_STORAGE_KEY);
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

    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Login user
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/login`,
        data
      );
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
      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/signup`, {
        username: data.username,
        email: data.email,
        password: data.password,
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
      await axios.post(`${API_CONFIG.BASE_URL}/auth/logout`, {}, { headers });
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

      const response = await axios.get(`${API_CONFIG.BASE_URL}/auth/me`, {
        headers,
      });
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
        `${API_CONFIG.BASE_URL}/auth/forgot-password`,
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
        `${API_CONFIG.BASE_URL}/auth/reset-password`,
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
