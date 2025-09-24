import { CalculationService } from '../../../../../packages/services/calculationService.js';

describe('CalculationService - Period Aware Calculations', () => {
  let calculationService: CalculationService;

  beforeEach(() => {
    calculationService = new CalculationService();
  });

  describe('calculatePeriodSpending', () => {
    it('should calculate spending within a specific period', () => {
      // Use consistent date formats - the issue is likely timezone-related
      const transactions = [
        { date: '2024-09-23', amount: 50.00 },  // Before period
        { date: '2024-09-25', amount: 100.00 }, // During period 
        { date: '2024-09-26', amount: 75.50 },  // During period
        { date: '2024-10-15', amount: 200.25 }, // During period
        { date: '2024-10-22', amount: 125.00 }, // During period
        { date: '2024-10-24', amount: 300.00 }, // After period
      ];

      const periodStart = new Date(2024, 8, 24); // Sep 24 (month is 0-indexed)
      const periodEnd = new Date(2024, 9, 23);   // Oct 23

      const result = calculationService.calculatePeriodSpending(transactions, periodStart, periodEnd);
      
      // Should include: 100 + 75.50 + 200.25 + 125 = 500.75
      expect(result).toBe(500.75);
    });

    it('should handle empty transaction array', () => {
      const transactions: { date: string; amount: number }[] = [];
      const periodStart = new Date(2024, 8, 24);
      const periodEnd = new Date(2024, 9, 23);

      const result = calculationService.calculatePeriodSpending(transactions, periodStart, periodEnd);
      expect(result).toBe(0);
    });

    it('should handle invalid transaction amounts gracefully', () => {
      const transactions = [
        { date: '2024-09-25', amount: NaN },
        { date: '2024-09-26', amount: -50.00 }, // Negative amount (refund)
        { date: '2024-09-27', amount: 100.00 }, // Valid amount
        { date: '2024-09-28', amount: Infinity },
      ];

      const periodStart = new Date(2024, 8, 24);
      const periodEnd = new Date(2024, 9, 23);

      const result = calculationService.calculatePeriodSpending(transactions, periodStart, periodEnd);
      
      // Should only include the valid positive amount
      expect(result).toBe(100.00);
    });
  });

  describe('calculatePeriodAwareDailyTarget', () => {
    it('should calculate correct daily target for period with 30 days total, 25 days remaining', () => {
      const periodBudget = 3000;
      const currentSpending = 200; // Already spent $200
      const periodStart = new Date(2024, 8, 24); // Sep 24
      const periodEnd = new Date(2024, 9, 23);   // Oct 23
      const today = new Date(2024, 8, 29);       // Sep 29 (5 days into period, 25 days remaining)

      const result = calculationService.calculatePeriodAwareDailyTarget(
        periodBudget, 
        currentSpending, 
        periodStart, 
        periodEnd, 
        today
      );

      // (3000 - 200) / 25 = 2800 / 25 = 112
      expect(result).toBe(112);
    });

    it('should return 0 when budget is exceeded', () => {
      const periodBudget = 3000;
      const currentSpending = 3500; // Over budget
      const periodStart = new Date(2024, 8, 24);
      const periodEnd = new Date(2024, 9, 23);
      const today = new Date(2024, 8, 29);

      const result = calculationService.calculatePeriodAwareDailyTarget(
        periodBudget, 
        currentSpending, 
        periodStart, 
        periodEnd, 
        today
      );

      expect(result).toBe(0);
    });

    it('should return 0 when period has ended', () => {
      const periodBudget = 3000;
      const currentSpending = 200;
      const periodStart = new Date(2024, 8, 24); // Sep 24
      const periodEnd = new Date(2024, 9, 23);   // Oct 23
      const today = new Date(2024, 9, 24);       // Oct 24 (after period end)

      const result = calculationService.calculatePeriodAwareDailyTarget(
        periodBudget, 
        currentSpending, 
        periodStart, 
        periodEnd, 
        today
      );

      expect(result).toBe(0);
    });

    it('should handle last day of period correctly', () => {
      const periodBudget = 3000;
      const currentSpending = 2800; // Close to budget
      const periodStart = new Date(2024, 8, 24);
      const periodEnd = new Date(2024, 9, 23);   // Oct 23
      const today = new Date(2024, 9, 23);       // Oct 23 (last day, 1 day remaining)

      const result = calculationService.calculatePeriodAwareDailyTarget(
        periodBudget, 
        currentSpending, 
        periodStart, 
        periodEnd, 
        today
      );

      // (3000 - 2800) / 1 = 200
      expect(result).toBe(200);
    });

    it('should handle first day of period correctly', () => {
      const periodBudget = 3000;
      const currentSpending = 0; // New period, no spending yet
      const periodStart = new Date(2024, 8, 24); // Sep 24
      const periodEnd = new Date(2024, 9, 23);   // Oct 23
      const today = new Date(2024, 8, 24);       // Sep 24 (first day, 30 days total)

      const result = calculationService.calculatePeriodAwareDailyTarget(
        periodBudget, 
        currentSpending, 
        periodStart, 
        periodEnd, 
        today
      );

      // 3000 / 30 = 100
      expect(result).toBe(100);
    });

    it('should return 0 for invalid inputs', () => {
      const periodStart = new Date(2024, 8, 24);
      const periodEnd = new Date(2024, 9, 23);
      const today = new Date(2024, 8, 29);

      expect(calculationService.calculatePeriodAwareDailyTarget(-1000, 500, periodStart, periodEnd, today)).toBe(0);
      expect(calculationService.calculatePeriodAwareDailyTarget(3000, NaN, periodStart, periodEnd, today)).toBe(0);
      expect(calculationService.calculatePeriodAwareDailyTarget(NaN, 500, periodStart, periodEnd, today)).toBe(0);
    });

    it('should handle edge case with very small remaining budget', () => {
      const periodBudget = 3000;
      const currentSpending = 2999.50; // Only $0.50 left
      const periodStart = new Date(2024, 8, 24);
      const periodEnd = new Date(2024, 9, 23);
      const today = new Date(2024, 8, 29); // 25 days remaining

      const result = calculationService.calculatePeriodAwareDailyTarget(
        periodBudget, 
        currentSpending, 
        periodStart, 
        periodEnd, 
        today
      );

      // (3000 - 2999.50) / 25 = 0.50 / 25 = 0.02, floored to 0
      expect(result).toBe(0);
    });
  });

  describe('convertToPlaidTransactions', () => {
    it('should convert ProcessedTransaction array to PlaidTransaction format', () => {
      const processedTransactions = [
        {
          id: 'tx1',
          amount: 100.50,
          date: new Date(2024, 8, 25), // Sep 25, 2024
          merchantName: 'Test Store',
          category: 'Shopping',
          accountId: 'acc1'
        },
        {
          id: 'tx2',
          amount: 75.25,
          date: new Date(2024, 8, 26), // Sep 26, 2024
          merchantName: 'Gas Station',
          category: 'Gas',
          accountId: 'acc1'
        }
      ];

      const result = calculationService.convertToPlaidTransactions(processedTransactions);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-09-25',
        amount: 100.50
      });
      expect(result[1]).toEqual({
        date: '2024-09-26',
        amount: 75.25
      });
    });

    it('should handle empty array', () => {
      const processedTransactions: any[] = [];
      const result = calculationService.convertToPlaidTransactions(processedTransactions);
      
      expect(result).toHaveLength(0);
    });
  });
});