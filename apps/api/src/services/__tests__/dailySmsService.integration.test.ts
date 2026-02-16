/**
 * @jest-environment node
 * 
 * Integration test for DailySmsService
 * Tests the complete daily SMS flow with real database and mocked SMS provider
 */

import { PrismaClient } from '@prisma/client';
import { DailySmsService, ISmsService, DailySmsResult } from '../dailySmsService.js';
import { SendSMSResult } from '../twilio/smsService.js';
import { Decimal } from '@prisma/client/runtime/library';

// Use test database
const prisma = new PrismaClient();

// Track sent messages for assertions
interface SentMessage {
  to: string;
  body: string;
  userId?: string;
  messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
}

// Mock SMS service that captures messages instead of sending them
class MockSmsService implements ISmsService {
  public sentMessages: SentMessage[] = [];
  public shouldFail = false;
  public failureError = 'Mock failure';

  async sendMessage(params: {
    to: string;
    body: string;
    userId?: string;
    messageType?: 'TRANSACTIONAL' | 'PROMOTIONAL';
  }): Promise<SendSMSResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureError,
        retryable: false,
      };
    }

    this.sentMessages.push({
      to: params.to,
      body: params.body,
      userId: params.userId,
      messageType: params.messageType,
    });

    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${this.sentMessages.length}`,
      retryable: false,
    };
  }

  reset(): void {
    this.sentMessages = [];
    this.shouldFail = false;
    this.failureError = 'Mock failure';
  }
}

describe('DailySmsService Integration', () => {
  let mockSmsService: MockSmsService;
  let dailySmsService: DailySmsService;

  // Test user IDs for cleanup
  const testUserIds: string[] = [];

  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserIds.length > 0) {
      await prisma.userSpendingAnalytics.deleteMany({
        where: { userId: { in: testUserIds } },
      });
      await prisma.spendingGoal.deleteMany({
        where: { userId: { in: testUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    mockSmsService = new MockSmsService();
    dailySmsService = new DailySmsService({
      prisma,
      smsService: mockSmsService,
    });
  });

  afterEach(() => {
    mockSmsService.reset();
  });

  describe('Happy Path', () => {
    it('should send daily SMS to eligible user with active goal and analytics', async () => {
      // Arrange: Create eligible user with goal and analytics
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const user = await prisma.user.create({
        data: {
          inviteCode: `TEST-DAILY-${Date.now()}`,
          firstName: 'Daily',
          lastName: 'TestUser',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: true,
          optOutStatus: 'opted_in',
        },
      });
      testUserIds.push(user.id);

      // Create active spending goal
      await prisma.spendingGoal.create({
        data: {
          userId: user.id,
          monthlyLimit: new Decimal(3000),
          monthStartDay: 1,
          periodStart,
          periodEnd,
          isActive: true,
        },
      });

      // Create spending analytics
      await prisma.userSpendingAnalytics.create({
        data: {
          userId: user.id,
          currentMonthSpending: new Decimal(1500),
          averageMonthlySpending: new Decimal(2800),
          lastMonthSpending: new Decimal(2900),
        },
      });

      // Act: Run daily SMS job
      const result = await dailySmsService.sendDailyMessages();

      // Assert: Check result
      expect(result.totalUsers).toBeGreaterThanOrEqual(1);
      expect(result.successCount).toBeGreaterThanOrEqual(1);
      expect(result.failureCount).toBe(0);

      // Assert: Check that message was sent
      const sentToUser = mockSmsService.sentMessages.find(
        (msg) => msg.to === user.phoneNumber
      );
      expect(sentToUser).toBeDefined();
      expect(sentToUser?.messageType).toBe('TRANSACTIONAL');

      // Assert: Message content contains expected elements
      expect(sentToUser?.body).toContain('moony');
      expect(sentToUser?.body).toContain('Good Morning Daily');
      expect(sentToUser?.body).toContain("Today's spending target:");
      expect(sentToUser?.body).toContain('$1,500 spent of $3,000');
      expect(sentToUser?.body).toContain('Reply STOP to opt out');
    });

    it('should skip users without active goals', async () => {
      // Arrange: Create user without any goals
      const user = await prisma.user.create({
        data: {
          inviteCode: `TEST-NO-GOAL-${Date.now()}`,
          firstName: 'NoGoal',
          lastName: 'User',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: true,
          optOutStatus: 'opted_in',
        },
      });
      testUserIds.push(user.id);

      // Create analytics but NO goal
      await prisma.userSpendingAnalytics.create({
        data: {
          userId: user.id,
          currentMonthSpending: new Decimal(500),
        },
      });

      // Act
      const result = await dailySmsService.sendDailyMessages();

      // Assert: User should be skipped
      const sentToUser = mockSmsService.sentMessages.find(
        (msg) => msg.to === user.phoneNumber
      );
      expect(sentToUser).toBeUndefined();

      // skippedCount should include this user
      expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    });

    it('should skip users without analytics data', async () => {
      // Arrange: Create user with goal but no analytics
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const user = await prisma.user.create({
        data: {
          inviteCode: `TEST-NO-ANALYTICS-${Date.now()}`,
          firstName: 'NoAnalytics',
          lastName: 'User',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: true,
          optOutStatus: 'opted_in',
        },
      });
      testUserIds.push(user.id);

      // Create goal but NO analytics
      await prisma.spendingGoal.create({
        data: {
          userId: user.id,
          monthlyLimit: new Decimal(2000),
          monthStartDay: 1,
          periodStart,
          periodEnd,
          isActive: true,
        },
      });

      // Act
      const result = await dailySmsService.sendDailyMessages();

      // Assert: User should be skipped
      const sentToUser = mockSmsService.sentMessages.find(
        (msg) => msg.to === user.phoneNumber
      );
      expect(sentToUser).toBeUndefined();

      expect(result.skippedCount).toBeGreaterThanOrEqual(1);
    });

    it('should not send to unverified phone numbers', async () => {
      // Arrange: Create user with phoneVerified = false
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const user = await prisma.user.create({
        data: {
          inviteCode: `TEST-UNVERIFIED-${Date.now()}`,
          firstName: 'Unverified',
          lastName: 'User',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: false, // Not verified
          isActive: true,
          optOutStatus: 'opted_in',
        },
      });
      testUserIds.push(user.id);

      await prisma.spendingGoal.create({
        data: {
          userId: user.id,
          monthlyLimit: new Decimal(2000),
          monthStartDay: 1,
          periodStart,
          periodEnd,
          isActive: true,
        },
      });

      await prisma.userSpendingAnalytics.create({
        data: {
          userId: user.id,
          currentMonthSpending: new Decimal(500),
        },
      });

      // Act
      await dailySmsService.sendDailyMessages();

      // Assert: User should not receive message (filtered by query)
      const sentToUser = mockSmsService.sentMessages.find(
        (msg) => msg.to === user.phoneNumber
      );
      expect(sentToUser).toBeUndefined();
    });

    it('should not send to inactive users', async () => {
      // Arrange: Create inactive user
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const user = await prisma.user.create({
        data: {
          inviteCode: `TEST-INACTIVE-${Date.now()}`,
          firstName: 'Inactive',
          lastName: 'User',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: false, // Inactive
          optOutStatus: 'opted_in',
        },
      });
      testUserIds.push(user.id);

      await prisma.spendingGoal.create({
        data: {
          userId: user.id,
          monthlyLimit: new Decimal(2000),
          monthStartDay: 1,
          periodStart,
          periodEnd,
          isActive: true,
        },
      });

      await prisma.userSpendingAnalytics.create({
        data: {
          userId: user.id,
          currentMonthSpending: new Decimal(500),
        },
      });

      // Act
      await dailySmsService.sendDailyMessages();

      // Assert: User should not receive message (filtered by query)
      const sentToUser = mockSmsService.sentMessages.find(
        (msg) => msg.to === user.phoneNumber
      );
      expect(sentToUser).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing other users when one fails', async () => {
      // Arrange: Create two eligible users
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const user1 = await prisma.user.create({
        data: {
          inviteCode: `TEST-FAIL-1-${Date.now()}`,
          firstName: 'WillFail',
          lastName: 'User',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: true,
        },
      });
      testUserIds.push(user1.id);

      const user2 = await prisma.user.create({
        data: {
          inviteCode: `TEST-SUCCEED-${Date.now()}`,
          firstName: 'WillSucceed',
          lastName: 'User',
          phoneNumber: `+1666${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: true,
        },
      });
      testUserIds.push(user2.id);

      // Create goals and analytics for both
      for (const user of [user1, user2]) {
        await prisma.spendingGoal.create({
          data: {
            userId: user.id,
            monthlyLimit: new Decimal(2000),
            monthStartDay: 1,
            periodStart,
            periodEnd,
            isActive: true,
          },
        });

        await prisma.userSpendingAnalytics.create({
          data: {
            userId: user.id,
            currentMonthSpending: new Decimal(500),
          },
        });
      }

      // Configure mock to fail for first user only
      let callCount = 0;
      const originalSendMessage = mockSmsService.sendMessage.bind(mockSmsService);
      mockSmsService.sendMessage = async (params) => {
        callCount++;
        if (callCount === 1) {
          return { success: false, error: 'Simulated failure', retryable: false };
        }
        return originalSendMessage(params);
      };

      // Act
      const result = await dailySmsService.sendDailyMessages();

      // Assert: Should have processed both, one failed, one succeeded
      expect(result.failureCount).toBeGreaterThanOrEqual(1);
      expect(result.successCount).toBeGreaterThanOrEqual(1);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Message Formatting', () => {
    it('should format currency correctly in messages', async () => {
      // Arrange: Create user with specific spending values
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const user = await prisma.user.create({
        data: {
          inviteCode: `TEST-FORMAT-${Date.now()}`,
          firstName: 'Format',
          lastName: 'Test',
          phoneNumber: `+1555${Date.now().toString().slice(-7)}`,
          phoneVerified: true,
          isActive: true,
        },
      });
      testUserIds.push(user.id);

      await prisma.spendingGoal.create({
        data: {
          userId: user.id,
          monthlyLimit: new Decimal(5000),
          monthStartDay: 1,
          periodStart,
          periodEnd,
          isActive: true,
        },
      });

      await prisma.userSpendingAnalytics.create({
        data: {
          userId: user.id,
          currentMonthSpending: new Decimal(2500),
        },
      });

      // Act
      await dailySmsService.sendDailyMessages();

      // Assert: Check currency formatting
      const sentToUser = mockSmsService.sentMessages.find(
        (msg) => msg.to === user.phoneNumber
      );
      expect(sentToUser).toBeDefined();
      expect(sentToUser?.body).toContain('$2,500 spent of $5,000');
    });
  });
});
