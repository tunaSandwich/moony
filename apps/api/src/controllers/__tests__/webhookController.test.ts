import request from 'supertest';
import { Application } from 'express';
import crypto from 'crypto';
import { setupTestData, teardownTestData, closeTestDatabase, testDb } from '../../test/database.js';
import { createApp } from '../../config/app.js';

// Mock Twilio client and SMS functionality
const mockSendMessage = jest.fn();
const mockValidateRequest = jest.fn();

jest.mock('twilio', () => {
  const mockSendMessage = jest.fn();
  const mockValidateRequest = jest.fn();
  
  const mockTwilio = jest.fn().mockImplementation(() => ({
    messages: {
      create: mockSendMessage,
    }
  }));
  
  // Add static methods and expose mocks
  Object.assign(mockTwilio, {
    validateRequest: mockValidateRequest,
    __mockSendMessage: mockSendMessage,
    __mockValidateRequest: mockValidateRequest,
  });
  
  return mockTwilio;
});

describe('POST /api/webhooks/twilio/incoming-message', () => {
  let app: Application;
  let testUser1: any;
  let testUser2: any;
  let mockTwilio: any;
  
  const validTwilioSignature = 'valid-twilio-signature';
  const invalidTwilioSignature = 'invalid-twilio-signature';
  
  // Helper function to create Twilio webhook payload
  const createWebhookPayload = (overrides: any = {}) => ({
    From: '+15551234567',
    Body: '3000',
    MessageSid: 'SM1234567890abcdef1234567890abcdef',
    AccountSid: 'AC1234567890abcdef1234567890abcdef',
    To: '+16267623406',
    ...overrides
  });

  beforeAll(async () => {
    // Create Express app instance for testing
    app = createApp();
    
    // Set environment variables for tests
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_PHONE_NUMBER = '+16267623406';

    // Get the mock functions
    const TwilioMock = require('twilio');
    mockTwilio = TwilioMock;
    
    // Setup default mock behavior
    TwilioMock.__mockSendMessage.mockImplementation(() => Promise.resolve({
      sid: 'SM1234567890abcdef1234567890abcdef'
    }));

    // Setup test database with users
    const testData = await setupTestData();
    testUser1 = testData.testUser1;
    testUser2 = testData.testUser2;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Default mock behavior: valid signature
    const TwilioMock = require('twilio');
    TwilioMock.__mockValidateRequest.mockReturnValue(true);
  });

  afterAll(async () => {
    await teardownTestData();
    await closeTestDatabase();
  });

  describe('Successful goal setting scenarios', () => {
    it('should set spending goal with numeric amount and return TwiML', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '3000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/xml/);
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response></Response>');

      // Verify spending goal was created in database
      const spendingGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        }
      });

      expect(spendingGoal).toBeTruthy();
      expect(Number(spendingGoal?.monthlyLimit)).toBe(3000);
      expect(spendingGoal?.isActive).toBe(true);

      // Verify confirmation SMS was sent
      const TwilioMock = require('twilio');
      expect(TwilioMock.__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('$3,000')
      });
    });

    it('should handle "SAME" keyword with existing previous goal', async () => {
      // Create a previous goal for the user
      await testDb.spendingGoal.create({
        data: {
          userId: testUser1.id,
          monthlyLimit: 2500,
          monthStartDay: 1,
          periodStart: new Date('2024-08-01'),
          periodEnd: new Date('2024-08-31'),
          isActive: false
        }
      });

      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: 'SAME' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response></Response>');

      // Verify new goal was created with previous amount
      const spendingGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(spendingGoal).toBeTruthy();
      expect(Number(spendingGoal?.monthlyLimit)).toBe(2500);

      // Verify confirmation SMS mentions the amount
      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('$2,500')
      });
    });

    it('should deactivate previous goals when creating new one', async () => {
      // Create existing active goal
      const existingGoal = await testDb.spendingGoal.create({
        data: {
          userId: testUser1.id,
          monthlyLimit: 2000,
          monthStartDay: 1,
          periodStart: new Date('2024-08-01'),
          periodEnd: new Date('2024-08-31'),
          isActive: true
        }
      });

      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '4000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);

      // Verify old goal is deactivated
      const oldGoal = await testDb.spendingGoal.findUnique({
        where: { id: existingGoal.id }
      });
      expect(oldGoal?.isActive).toBe(false);

      // Verify new goal is active
      const newGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        }
      });
      expect(Number(newGoal?.monthlyLimit)).toBe(4000);
      expect(newGoal?.isActive).toBe(true);
    });

    it('should handle case-insensitive "same" keyword', async () => {
      // Create a previous goal
      await testDb.spendingGoal.create({
        data: {
          userId: testUser1.id,
          monthlyLimit: 1800,
          monthStartDay: 1,
          periodStart: new Date('2024-08-01'),
          periodEnd: new Date('2024-08-31'),
          isActive: false
        }
      });

      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: 'same' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);

      const spendingGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(Number(spendingGoal?.monthlyLimit)).toBe(1800);
    });
  });

  describe('Error scenarios with SMS responses', () => {
    it('should return 400 and send error SMS for invalid numeric format', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: 'abc123' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid spending goal format');

      // Verify error SMS was sent
      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('whole dollar amount')
      });
    });

    it('should return 400 and send error SMS for decimal amounts', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '2500.50' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid spending goal format');

      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('whole dollar amount')
      });
    });

    it('should return 400 and send error SMS for empty message', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required webhook data');

      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('Please send a spending goal amount')
      });
    });

    it('should return 400 and send error SMS for "SAME" with no previous goal', async () => {
      // Ensure user has no previous goals
      await testDb.spendingGoal.deleteMany({
        where: { userId: testUser2.id }
      });

      const payload = createWebhookPayload({ 
        From: testUser2.phoneNumber,
        Body: 'SAME' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid spending goal format');

      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser2.phoneNumber,
        body: expect.stringContaining('No previous spending goal found')
      });
    });

    it('should return 400 and send error SMS for amount below minimum', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '50' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid spending goal format');

      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('between $100 and $50,000')
      });
    });

    it('should return 400 and send error SMS for amount above maximum', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '60000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid spending goal format');

      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testUser1.phoneNumber,
        body: expect.stringContaining('between $100 and $50,000')
      });
    });
  });

  describe('Security and validation', () => {
    it('should return 401 for invalid Twilio signature', async () => {
      require('twilio').__mockValidateRequest.mockReturnValue(false);

      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '3000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', invalidTwilioSignature)
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized webhook request');

      // Verify no SMS was sent for invalid signature
      expect(require('twilio').__mockSendMessage).not.toHaveBeenCalled();
    });

    it('should return 401 for missing Twilio signature', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '3000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized webhook request');

      expect(require('twilio').__mockSendMessage).not.toHaveBeenCalled();
    });

    it('should return 404 and send error SMS for phone number not found', async () => {
      const payload = createWebhookPayload({ 
        From: '+15559999999', // Non-existent phone number
        Body: '3000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Phone number not found');

      expect(require('twilio').__mockSendMessage).toHaveBeenCalledWith({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: '+15559999999',
        body: expect.stringContaining('not registered')
      });
    });

    it('should return 400 for missing required fields', async () => {
      const payload = createWebhookPayload({ From: undefined });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required webhook data');
    });
  });

  describe('Business logic and date calculations', () => {
    it('should calculate correct period dates based on current date', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '3500' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);

      const spendingGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      // Verify period dates are calculated correctly (current month)
      const now = new Date();
      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      expect(spendingGoal?.periodStart).toEqual(expectedStart);
      expect(spendingGoal?.periodEnd).toEqual(expectedEnd);
    });

    it('should set monthStartDay to 1 by default', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '2800' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);

      const spendingGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(spendingGoal?.monthStartDay).toBe(1);
    });
  });

  describe('TwiML response format', () => {
    it('should return properly formatted XML TwiML response', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '3000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/xml/);
      
      // Verify XML structure
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('</Response>');
      
      // Should be empty TwiML response as per spec
      expect(response.text.trim()).toBe(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
      );
    });
  });

  describe('SMS confirmation messages', () => {
    it('should send confirmation SMS with goal amount and period', async () => {
      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '4200' 
      });

      await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      const sentMessage = require('twilio').__mockSendMessage.mock.calls[0][0];
      
      expect(sentMessage.from).toBe(process.env.TWILIO_PHONE_NUMBER);
      expect(sentMessage.to).toBe(testUser1.phoneNumber);
      expect(sentMessage.body).toContain('$4,200');
      expect(sentMessage.body).toContain('spending goal set');
    });

    it('should handle SMS sending failure gracefully', async () => {
      // Mock SMS sending failure
      require('twilio').__mockSendMessage.mockRejectedValue(new Error('SMS sending failed'));

      const payload = createWebhookPayload({ 
        From: testUser1.phoneNumber,
        Body: '3000' 
      });

      const response = await request(app)
        .post('/api/webhooks/twilio/incoming-message')
        .set('X-Twilio-Signature', validTwilioSignature)
        .send(payload);

      // Should still return 200 (TwiML) even if SMS fails
      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response></Response>');

      // Verify spending goal was still created
      const spendingGoal = await testDb.spendingGoal.findFirst({
        where: { 
          userId: testUser1.id,
          isActive: true 
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(Number(spendingGoal?.monthlyLimit)).toBe(3000);
    });
  });
});