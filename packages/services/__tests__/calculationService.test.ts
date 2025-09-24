import { CalculationService } from '../calculationService.js';

describe('CalculationService', () => {
  let calculationService: CalculationService;

  beforeEach(() => {
    calculationService = new CalculationService();
  });

  describe('calculateDailyTarget', () => {
    const mockToday = new Date('2024-03-15'); // Mid-month date for testing

    it('should calculate correct daily target with remaining budget', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 1000;
      const today = new Date('2024-03-15'); // March 15th
      
      // March has 31 days, so from March 15th, there are 17 days remaining (31 - 15 + 1)
      const expectedTarget = Math.floor((monthlyBudget - currentMonthSpending) / 17); // (3000 - 1000) / 17 = 117
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(expectedTarget);
    });

    it('should return 0 when budget is exceeded', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 3500; // Over budget
      const today = new Date('2024-03-15');
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(0);
    });

    it('should return 0 when on the last day of month with exact budget match', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 3000;
      const today = new Date('2024-03-31'); // Last day of March
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(0);
    });

    it('should handle first day of month correctly', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 0;
      const today = new Date('2024-03-01'); // First day of March (31 days)
      
      const expectedTarget = Math.floor(monthlyBudget / 31); // 3000 / 31 = 96
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(expectedTarget);
    });

    it('should handle February (leap year)', () => {
      const monthlyBudget = 2900;
      const currentMonthSpending = 900;
      const today = new Date('2024-02-15'); // Feb 15th in leap year (29 days total)
      
      // Feb has 29 days in 2024, from Feb 15th there are 15 days remaining (29 - 15 + 1)
      const expectedTarget = Math.floor((monthlyBudget - currentMonthSpending) / 15); // (2900 - 900) / 15 = 133
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(expectedTarget);
    });

    it('should handle edge case with 1 day remaining', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 2800;
      const today = new Date('2024-03-31'); // Last day of March
      
      const expectedTarget = Math.floor((monthlyBudget - currentMonthSpending) / 1); // (3000 - 2800) / 1 = 200
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(200);
    });

    it('should handle negative spending (refunds)', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = -100; // Refunds exceed spending
      const today = new Date('2024-03-15');
      
      // Budget effectively becomes 3100, spread over 17 days
      const expectedTarget = Math.floor((monthlyBudget - currentMonthSpending) / 17); // (3000 - (-100)) / 17 = 182
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(expectedTarget);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculationService.calculateDailyTarget(-1000, 500, mockToday)).toBe(0);
      expect(calculationService.calculateDailyTarget(3000, NaN, mockToday)).toBe(0);
      expect(calculationService.calculateDailyTarget(NaN, 500, mockToday)).toBe(0);
    });
  });

  describe('formatDailyTargetMessage', () => {
    it('should format currency correctly', () => {
      expect(calculationService.formatDailyTargetMessage(47)).toBe('$47');
      expect(calculationService.formatDailyTargetMessage(0)).toBe('$0');
      expect(calculationService.formatDailyTargetMessage(1234)).toBe('$1,234');
    });

    it('should handle edge cases', () => {
      expect(calculationService.formatDailyTargetMessage(-5)).toBe('$0');
      expect(calculationService.formatDailyTargetMessage(0.99)).toBe('$0'); // Should floor decimals
    });
  });
});