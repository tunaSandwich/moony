/**
 * @jest-environment node
 */

// Set environment variables before any imports
process.env.NODE_ENV = 'local';
process.env.AWS_REGION = 'us-west-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_SNS_TOPIC_ARN = 'arn:aws:sns:us-west-1:123456789012:test-topic';
process.env.AWS_SANDBOX_MODE = 'false';
process.env.AWS_USE_SIMULATOR_OVERRIDE = 'false';
process.env.AWS_PHONE_NUMBER = '+12025559999';
process.env.AWS_SIMULATOR_DESTINATION = '+14254147755';

const mockSend = jest.fn();
const mockUpdate = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();
const mockWarn = jest.fn();
const mockDebug = jest.fn();

// Mock all dependencies before imports
jest.mock('../clients/awsClients.js', () => ({
  AWSClients: {
    getSMSClient: () => ({ send: mockSend }),
  },
}));

jest.mock('../../../db.js', () => ({
  prisma: {
    user: { update: mockUpdate },
  },
}));

jest.mock('@logger', () => ({
  logger: {
    info: mockInfo,
    error: mockError,
    warn: mockWarn,
    debug: mockDebug,
  },
}));

jest.mock('@aws-sdk/client-pinpoint-sms-voice-v2', () => ({
  SendTextMessageCommand: jest.fn(),
}));

import { AWSSMSService } from '../smsService.js';

describe('AWSSMSService', () => {
  let smsService: AWSSMSService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({});
    smsService = new AWSSMSService();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SNS_TOPIC_ARN;
    delete process.env.AWS_SANDBOX_MODE;
    delete process.env.AWS_USE_SIMULATOR_OVERRIDE;
    delete process.env.AWS_PHONE_NUMBER;
    delete process.env.AWS_SIMULATOR_DESTINATION;
  });

  describe('sendMessage', () => {
    const validParams = {
      to: '+12025551234',
      body: 'Test message',
      messageType: 'TRANSACTIONAL' as const,
      userId: 'test-user-id',
    };

    it('should send SMS successfully', async () => {
      const messageId = 'test-message-id';
      mockSend.mockResolvedValue({
        MessageId: messageId,
        $metadata: { httpStatusCode: 200 },
      });

      const result = await smsService.sendMessage(validParams);

      expect(result).toEqual({
        success: true,
        messageId,
        retryable: false,
        cost: undefined,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('[AWSSMSService] Sending SMS via AWS'),
        expect.any(Object)
      );
    });

    it('should validate E.164 phone numbers', async () => {
      const validNumbers = [
        '+12025551234',
        '+442071838750',
        '+33142685300',
      ];

      for (const number of validNumbers) {
        mockSend.mockResolvedValue({
          MessageId: 'test-id',
          $metadata: { httpStatusCode: 200 },
        });

        const result = await smsService.sendMessage({ ...validParams, to: number });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid phone numbers', async () => {
      const invalidNumbers = [
        '202-555-1234', // Missing country code
        '12025551234',  // Missing +
        '+1 202 555 1234', // Contains spaces
        'invalid',      // Not a number
      ];

      for (const number of invalidNumbers) {
        const result = await smsService.sendMessage({ ...validParams, to: number });
        expect(result).toEqual({
          success: false,
          error: 'Invalid phone number format',
          retryable: false,
        });
      }
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle retryable AWS errors', async () => {
      const error = { code: 'ThrottlingException', message: 'Rate exceeded' };
      mockSend.mockRejectedValue(error);

      const result = await smsService.sendMessage(validParams);

      expect(result).toEqual({
        success: false,
        error: 'Rate exceeded',
        retryable: true,
      });
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining('[AWSSMSService] Failed to send SMS'),
        expect.objectContaining({ errorCode: 'ThrottlingException' })
      );
    });

    it('should handle non-retryable AWS errors', async () => {
      const error = { code: 'ValidationException', message: 'Invalid parameter' };
      mockSend.mockRejectedValue(error);

      const result = await smsService.sendMessage(validParams);

      expect(result).toEqual({
        success: false,
        error: 'Invalid parameter',
        retryable: false,
      });
    });

    it('should use correct messageType', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test',
        messageType: 'PROMOTIONAL',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageType: 'PROMOTIONAL',
        })
      );
    });

    it('should default to TRANSACTIONAL messageType', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageType: 'TRANSACTIONAL',
        })
      );
    });

    it('should update user tracking on success', async () => {
      const messageId = 'test-message-id';
      mockSend.mockResolvedValue({
        MessageId: messageId,
        $metadata: { httpStatusCode: 200 },
      });

      await smsService.sendMessage(validParams);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: expect.objectContaining({
          lastSmsMessageId: messageId,
          lastSmsSentAt: expect.any(Date),
        }),
      });
    });

    it('should handle database update failures gracefully', async () => {
      const messageId = 'test-message-id';
      mockSend.mockResolvedValue({
        MessageId: messageId,
        $metadata: { httpStatusCode: 200 },
      });
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const result = await smsService.sendMessage(validParams);

      expect(result.success).toBe(true);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining('[AWSSMSService] Failed to update user SMS tracking fields'),
        expect.objectContaining({ error: 'Database error' })
      );
    });
  });

  describe('sandbox mode', () => {
    beforeEach(() => {
      process.env.AWS_SANDBOX_MODE = 'true';
      process.env.AWS_USE_SIMULATOR_OVERRIDE = 'true';
      smsService = new AWSSMSService();
    });

    it('should override destination in sandbox mode', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test message',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          DestinationPhoneNumber: '+14254147755', // Simulator destination
        })
      );
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('[AWSSMSService] Overriding destination with simulator number'),
        expect.any(Object)
      );
    });

    it('should return cost as 0 for simulator messages', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      const result = await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test message',
      });

      expect(result.cost).toBe(0.0);
    });
  });

  describe('sendBulkMessages', () => {
    const messages = [
      { to: '+12025551234', body: 'Message 1' },
      { to: '+12025551235', body: 'Message 2' },
      { to: '+12025551236', body: 'Message 3' },
    ];

    it('should send multiple messages with rate limiting', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      const startTime = Date.now();
      const results = await smsService.sendBulkMessages(messages);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(100); // Rate limiting delay
    });

    it('should continue on individual failures', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValue({
          MessageId: 'test-id',
          $metadata: { httpStatusCode: 200 },
        });

      const results = await smsService.sendBulkMessages(messages);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await smsService.sendBulkMessages([]);
      expect(results).toEqual([]);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should use correct rate limiting in sandbox', async () => {
      process.env.AWS_SANDBOX_MODE = 'true';
      smsService = new AWSSMSService();

      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      const startTime = Date.now();
      await smsService.sendBulkMessages(messages);
      const duration = Date.now() - startTime;

      // Sandbox uses 100ms delay vs 50ms in production
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });

  describe('edge cases', () => {
    it('should handle missing error code', async () => {
      const error = new Error('Generic error');
      mockSend.mockRejectedValue(error);

      const result = await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test',
      });

      expect(result).toEqual({
        success: false,
        error: 'Generic error',
        retryable: false, // No code means not retryable
      });
    });

    it('should mask phone numbers in logs', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test',
      });

      expect(mockInfo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: '+120255****', // Masked phone number
        })
      );
    });

    it('should work without userId', async () => {
      mockSend.mockResolvedValue({
        MessageId: 'test-id',
        $metadata: { httpStatusCode: 200 },
      });

      const result = await smsService.sendMessage({
        to: '+12025551234',
        body: 'Test',
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});