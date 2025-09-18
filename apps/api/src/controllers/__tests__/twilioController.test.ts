import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { setupTestData, teardownTestData, closeTestDatabase } from '../../test/database.js';
import { createApp } from '../../config/app.js';

// Mock Twilio client
const mockCreateVerification = jest.fn();
const mockCheckVerification = jest.fn();

jest.mock('twilio', () => {
  const mockCreateVerification = jest.fn();
  const mockCheckVerification = jest.fn();
  return jest.fn().mockImplementation(() => ({
    verify: {
      v2: {
        services: jest.fn().mockReturnValue({
          verifications: {
            create: mockCreateVerification,
          },
          verificationChecks: {
            create: mockCheckVerification,
          },
        }),
      },
    },
    __mockCreateVerification: mockCreateVerification, // Expose for test access
    __mockCheckVerification: mockCheckVerification, // Expose for test access
  }));
});

describe('POST /api/twilio/send-code', () => {
  let app: Application;
  let validJwtToken: string;
  let expiredJwtToken: string;
  let invalidUserJwtToken: string;
  let mockTwilioFunction: any;
  let mockVerifyFunction: any;

  beforeAll(async () => {
    // Create Express app instance for testing
    app = createApp();
    
    // Set environment variables for tests
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_VERIFY_SERVICE_SID = 'test-verify-service-sid';

    // Get the mock functions
    const twilioMock = await import('twilio');
    const twilioInstance = new (twilioMock.default as any)();
    mockTwilioFunction = twilioInstance.__mockCreateVerification;
    mockVerifyFunction = twilioInstance.__mockCheckVerification;

    // Create valid JWT token for existing user
    validJwtToken = jwt.sign(
      { user_id: 'test-user-1' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Create JWT token for non-existent user
    invalidUserJwtToken = jwt.sign(
      { user_id: 'non-existent-user' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Create expired JWT token
    expiredJwtToken = jwt.sign(
      { user_id: 'test-user-1' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );
  });

  beforeEach(async () => {
    await setupTestData();
    
    // Reset all mocks before each test
    jest.clearAllMocks();
    if (mockTwilioFunction) {
      mockTwilioFunction.mockClear();
    }
    if (mockVerifyFunction) {
      mockVerifyFunction.mockClear();
    }
  });

  afterEach(async () => {
    await teardownTestData();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('Successful verification code sending', () => {
    it('should return 200 with success message when sending code to unverified phone', async () => {
      // Mock successful Twilio Verify API response
      mockTwilioFunction.mockResolvedValue({
        sid: 'verification-sid-12345',
        status: 'pending',
        to: '+15551234567',
        channel: 'sms',
      });

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toEqual({
        message: 'Verification code sent successfully',
      });

      // Verify Twilio API was called with correct parameters
      expect(mockTwilioFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        channel: 'sms',
      });
    });

    it('should call Twilio Verify API with user phone number from database', async () => {
      // Mock successful Twilio Verify API response
      mockTwilioFunction.mockResolvedValue({
        sid: 'verification-sid-12345',
        status: 'pending',
        to: '+15551234567',
        channel: 'sms',
      });

      await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      // Verify Twilio was called exactly once
      expect(mockTwilioFunction).toHaveBeenCalledTimes(1);

      // Verify correct parameters were passed
      expect(mockTwilioFunction).toHaveBeenCalledWith({
        to: '+15551234567', // This should match the test user's phone number
        channel: 'sms',
      });
    });
  });

  describe('Authentication errors - 401 Unauthorized', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app)
        .post('/api/twilio/send-code')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is expired', async () => {
      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${expiredJwtToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token has no user_id claim', async () => {
      const invalidToken = jwt.sign(
        { some_other_field: 'value' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });
  });

  describe('User not found errors - 404 Not Found', () => {
    it('should return 404 when user ID from JWT does not exist in database', async () => {
      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${invalidUserJwtToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'User not found',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });
  });

  describe('Phone already verified errors - 409 Conflict', () => {
    it('should return 409 when user phone number is already verified', async () => {
      // First, mark the test user's phone as verified
      const { testDb } = await import('../../test/database.js');
      await testDb.user.update({
        where: { id: 'test-user-1' },
        data: { phoneVerified: true },
      });

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Phone number is already verified',
      });

      // Verify Twilio API was never called
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });
  });

  describe('Twilio API errors - 502 Bad Gateway', () => {
    it('should return 502 when Twilio API is unavailable', async () => {
      // Mock Twilio API network error
      const networkError = new Error('ECONNREFUSED');
      networkError.name = 'NetworkError';
      mockTwilioFunction.mockRejectedValue(networkError);

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to send verification code. Please try again.',
      });

      // Verify Twilio API was called
      expect(mockTwilioFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        channel: 'sms',
      });
    });

    it('should return 502 when Twilio API returns service error', async () => {
      // Mock Twilio API service error
      const serviceError = new Error('Service temporarily unavailable');
      serviceError.name = 'TwilioError';
      mockTwilioFunction.mockRejectedValue(serviceError);

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to send verification code. Please try again.',
      });

      // Verify Twilio API was called
      expect(mockTwilioFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        channel: 'sms',
      });
    });

    it('should return 502 when Twilio API rate limit is exceeded', async () => {
      // Mock Twilio API rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'TwilioRateLimitError';
      mockTwilioFunction.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to send verification code. Please try again.',
      });
    });
  });

  describe('Invalid phone number handling', () => {
    it('should handle user with invalid phone number format', async () => {
      // Update test user with invalid phone number
      const { testDb } = await import('../../test/database.js');
      await testDb.user.update({
        where: { id: 'test-user-1' },
        data: { phoneNumber: 'invalid-phone' },
      });

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to send verification code. Please try again.',
      });

      // Verify Twilio API was never called due to validation failure
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });

    it('should handle user with empty phone number', async () => {
      // Update test user with empty phone number
      const { testDb } = await import('../../test/database.js');
      await testDb.user.update({
        where: { id: 'test-user-1' },
        data: { phoneNumber: '' },
      });

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to send verification code. Please try again.',
      });

      // Verify Twilio API was never called due to empty phone number
      expect(mockTwilioFunction).not.toHaveBeenCalled();
    });
  });

  describe('Response format validation', () => {
    it('should return response matching exact API specification', async () => {
      // Mock successful Twilio Verify API response
      mockTwilioFunction.mockResolvedValue({
        sid: 'verification-sid-12345',
        status: 'pending',
        to: '+15551234567',
        channel: 'sms',
      });

      const response = await request(app)
        .post('/api/twilio/send-code')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .expect(200);

      // Verify top-level structure
      expect(Object.keys(response.body)).toEqual(['message']);

      // Verify field types and values
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toBe('Verification code sent successfully');
    });
  });
});

describe('POST /api/twilio/verify-number', () => {
  let app: Application;
  let validJwtToken: string;
  let expiredJwtToken: string;
  let invalidUserJwtToken: string;
  let mockTwilioFunction: any;
  let mockVerifyFunction: any;

  beforeAll(async () => {
    // Create Express app instance for testing
    app = createApp();
    
    // Set environment variables for tests
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_VERIFY_SERVICE_SID = 'test-verify-service-sid';

    // Get the mock functions
    const twilioMock = await import('twilio');
    const twilioInstance = new (twilioMock.default as any)();
    mockTwilioFunction = twilioInstance.__mockCreateVerification;
    mockVerifyFunction = twilioInstance.__mockCheckVerification;

    // Create valid JWT token for existing user
    validJwtToken = jwt.sign(
      { user_id: 'test-user-1' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Create JWT token for non-existent user
    invalidUserJwtToken = jwt.sign(
      { user_id: 'non-existent-user' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Create expired JWT token
    expiredJwtToken = jwt.sign(
      { user_id: 'test-user-1' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );
  });

  beforeEach(async () => {
    await setupTestData();
    
    // Reset all mocks before each test
    jest.clearAllMocks();
    if (mockTwilioFunction) {
      mockTwilioFunction.mockClear();
    }
    if (mockVerifyFunction) {
      mockVerifyFunction.mockClear();
    }
  });

  afterEach(async () => {
    await teardownTestData();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('Successful verification', () => {
    it('should return 200 with success message when verifying correct code', async () => {
      // Mock successful Twilio Verify API response
      mockVerifyFunction.mockResolvedValue({
        sid: 'verification-check-sid-12345',
        status: 'approved',
        to: '+15551234567',
        channel: 'sms',
        valid: true,
      });

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify response structure
      expect(response.body).toEqual({
        message: 'Phone number verified successfully',
        twilioStatus: 'verified',
      });

      // Verify Twilio API was called with correct parameters
      expect(mockVerifyFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        code: '123456',
      });
    });

    it('should update user phoneVerified field to true in database', async () => {
      // Mock successful Twilio Verify API response
      mockVerifyFunction.mockResolvedValue({
        sid: 'verification-check-sid-12345',
        status: 'approved',
        to: '+15551234567',
        channel: 'sms',
        valid: true,
      });

      // Verify user starts with phoneVerified false
      const { testDb } = await import('../../test/database.js');
      const initialUser = await testDb.user.findUnique({
        where: { id: 'test-user-1' },
      });
      expect(initialUser?.phoneVerified).toBe(false);

      const requestBody = {
        code: '123456',
      };

      await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify user now has phoneVerified true
      const updatedUser = await testDb.user.findUnique({
        where: { id: 'test-user-1' },
      });
      expect(updatedUser?.phoneVerified).toBe(true);
    });
  });

  describe('Authentication errors - 401 Unauthorized', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', 'InvalidFormat')
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is invalid', async () => {
      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token is expired', async () => {
      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${expiredJwtToken}`)
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT token has no user_id claim', async () => {
      const invalidToken = jwt.sign(
        { some_other_field: 'value' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });
  });

  describe('User not found errors - 404 Not Found', () => {
    it('should return 404 when user ID from JWT does not exist in database', async () => {
      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${invalidUserJwtToken}`)
        .send(requestBody)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'User not found',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });
  });

  describe('Bad request errors - 400 Bad Request', () => {
    it('should return 400 when verification code is missing', async () => {
      const requestBody = {};

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Verification code is required',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when verification code is empty string', async () => {
      const requestBody = {
        code: '',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Verification code is required',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when verification code is not a string', async () => {
      const requestBody = {
        code: 123456,
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Verification code is required',
      });

      // Verify Twilio API was never called
      expect(mockVerifyFunction).not.toHaveBeenCalled();
    });

    it('should return 400 when Twilio returns invalid verification code', async () => {
      // Mock Twilio API error for invalid verification code
      const invalidCodeError = new Error('Invalid verification code');
      invalidCodeError.name = 'TwilioValidationError';
      mockVerifyFunction.mockRejectedValue(invalidCodeError);

      const requestBody = {
        code: '999999',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid verification code',
      });

      // Verify Twilio API was called
      expect(mockVerifyFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        code: '999999',
      });
    });
  });

  describe('Verification code expired - 410 Gone', () => {
    it('should return 410 when verification code has expired', async () => {
      // Mock Twilio API error for expired verification code
      const expiredCodeError = new Error('Verification code expired');
      expiredCodeError.name = 'TwilioExpiredError';
      mockVerifyFunction.mockRejectedValue(expiredCodeError);

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(410);

      expect(response.body).toEqual({
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      });

      // Verify Twilio API was called
      expect(mockVerifyFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        code: '123456',
      });
    });
  });

  describe('Twilio API errors - 502 Bad Gateway', () => {
    it('should return 502 when Twilio API is unavailable', async () => {
      // Mock Twilio API network error
      const networkError = new Error('ECONNREFUSED');
      networkError.name = 'NetworkError';
      mockVerifyFunction.mockRejectedValue(networkError);

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to verify code. Please try again.',
      });

      // Verify Twilio API was called
      expect(mockVerifyFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        code: '123456',
      });
    });

    it('should return 502 when Twilio API returns service error', async () => {
      // Mock Twilio API service error
      const serviceError = new Error('Service temporarily unavailable');
      serviceError.name = 'TwilioError';
      mockVerifyFunction.mockRejectedValue(serviceError);

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to verify code. Please try again.',
      });

      // Verify Twilio API was called
      expect(mockVerifyFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        code: '123456',
      });
    });
  });

  describe('Already verified user', () => {
    it('should still allow verification for already verified user', async () => {
      // First, mark the test user's phone as verified
      const { testDb } = await import('../../test/database.js');
      await testDb.user.update({
        where: { id: 'test-user-1' },
        data: { phoneVerified: true },
      });

      // Mock successful Twilio Verify API response
      mockVerifyFunction.mockResolvedValue({
        sid: 'verification-check-sid-12345',
        status: 'approved',
        to: '+15551234567',
        channel: 'sms',
        valid: true,
      });

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Phone number verified successfully',
        twilioStatus: 'verified',
      });

      // Verify Twilio API was called
      expect(mockVerifyFunction).toHaveBeenCalledWith({
        to: '+15551234567',
        code: '123456',
      });
    });
  });

  describe('Response format validation', () => {
    it('should return response matching exact API specification', async () => {
      // Mock successful Twilio Verify API response
      mockVerifyFunction.mockResolvedValue({
        sid: 'verification-check-sid-12345',
        status: 'approved',
        to: '+15551234567',
        channel: 'sms',
        valid: true,
      });

      const requestBody = {
        code: '123456',
      };

      const response = await request(app)
        .post('/api/twilio/verify-number')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify top-level structure
      expect(Object.keys(response.body)).toEqual(['message', 'twilioStatus']);

      // Verify field types and values
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toBe('Phone number verified successfully');
      expect(typeof response.body.twilioStatus).toBe('string');
      expect(response.body.twilioStatus).toBe('verified');
    });
  });
});