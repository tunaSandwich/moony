import apiClient from './client';
import type { User } from './types';

// User API service
export const userApi = {
  /**
   * Get current authenticated user data
   * GET /api/user/profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ data: User }>('/api/user/profile');
      return response.data.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },
};