import apiClient from './client';

export interface SpendingGoal {
  goalId: string;
  monthlyLimit: number;
  periodStart: string;
  periodEnd: string;
  monthStartDay?: number;
}

export interface SetSpendingGoalRequest {
  monthlyLimit: number;
}

export interface SetSpendingGoalResponse {
  goalId: string;
  monthlyLimit: number;
  periodStart: string;
  periodEnd: string;
}

// Goals API service
export const goalsApi = {
  /**
   * Set monthly spending goal
   * POST /api/goals/set
   */
  async setSpendingGoal(monthlyLimit: number): Promise<SetSpendingGoalResponse> {
    try {
      const requestData: SetSpendingGoalRequest = {
        monthlyLimit,
      };

      const response = await apiClient.post<{ data: SetSpendingGoalResponse }>('/api/goals/set', requestData);
      return response.data.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },

  /**
   * Get current active spending goal
   * GET /api/goals/current
   */
  async getCurrentGoal(): Promise<SpendingGoal | null> {
    try {
      const response = await apiClient.get<{ data: SpendingGoal | null }>('/api/goals/current');
      return response.data.data;
    } catch (error) {
      // Error handling is done in the axios interceptor
      throw error;
    }
  },
};