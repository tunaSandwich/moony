import axios, { AxiosError, type AxiosInstance } from 'axios';
import { ERROR_MESSAGES, NETWORK_ERROR_MESSAGE, UNKNOWN_ERROR_MESSAGE } from './types';

// Token management
const TOKEN_KEY = 'budgetPal_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const logout = (): void => {
  removeToken();
  // Note: navigation is handled by AuthContext + ProtectedRoute, not here.
  // A hard redirect (window.location.href) would break the AuthContext
  // session check which expects to gracefully handle 401s.
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true, // Send httpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }

    // Handle 401 unauthorized - clear local token and let AuthContext handle the redirect
    if (error.response.status === 401) {
      removeToken();
      throw new Error('Your session has expired. Please log in again');
    }

    // Extract error message from backend response
    const backendError = error.response.data as { error?: string };
    const errorMessage = backendError?.error;

    if (errorMessage) {
      // Map backend error to user-friendly message
      const userFriendlyMessage = ERROR_MESSAGES[errorMessage] || errorMessage;
      throw new Error(userFriendlyMessage);
    }

    // Fallback error message
    throw new Error(UNKNOWN_ERROR_MESSAGE);
  }
);

export default apiClient;
