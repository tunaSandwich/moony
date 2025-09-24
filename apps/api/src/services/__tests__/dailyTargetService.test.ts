import { CalculationService } from '../../../../../packages/services/calculationService.js';

describe('CalculationService - Daily Target', () => {
  let calculationService: CalculationService;

  beforeEach(() => {
    calculationService = new CalculationService();
  });

  describe('calculateDailyTarget', () => {
    it('should calculate correct daily target with remaining budget', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 1000;
      const today = new Date(2024, 2, 15); // March 15th (month is 0-indexed)
      
      // March has 31 days, so from March 15th, there are 17 days remaining (31 - 15 + 1)
      const expectedTarget = Math.floor((monthlyBudget - currentMonthSpending) / 17); // (3000 - 1000) / 17 = 117
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(expectedTarget);
    });

    it('should return 0 when budget is exceeded', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 3500; // Over budget
      const today = new Date(2024, 2, 15); // March 15th
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(0);
    });

    it('should handle first day of month correctly', () => {
      const monthlyBudget = 3000;
      const currentMonthSpending = 0;
      const today = new Date(2024, 2, 1); // First day of March (31 days)
      
      const expectedTarget = Math.floor(monthlyBudget / 31); // 3000 / 31 = 96
      
      const result = calculationService.calculateDailyTarget(monthlyBudget, currentMonthSpending, today);
      expect(result).toBe(expectedTarget);
    });

    it('should return 0 for invalid inputs', () => {
      const today = new Date(2024, 2, 15); // March 15th
      expect(calculationService.calculateDailyTarget(-1000, 500, today)).toBe(0);
      expect(calculationService.calculateDailyTarget(3000, NaN, today)).toBe(0);
      expect(calculationService.calculateDailyTarget(NaN, 500, today)).toBe(0);
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