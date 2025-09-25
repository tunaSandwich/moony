import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { setupTestData, teardownTestData, closeTestDatabase } from '../../test/database.js';
import { createApp } from '../../config/app.js';

// Mock Plaid client
const mockItemPublicTokenExchange = jest.fn();

jest.mock('plaid', () => {
  const mockItemPublicTokenExchange = jest.fn();
  return {
    PlaidApi: jest.fn().mockImplementation(() => ({
      itemPublicTokenExchange: mockItemPublicTokenExchange,
    })),
    Configuration: jest.fn(),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com',
    },
    __mockItemPublicTokenExchange: mockItemPublicTokenExchange, // Expose for test access
  };
});

describe('POST /api/plaid/connect', () => {
  let app: Application;
  let validJwtToken: string;
  let expiredJwtToken: string;
  let mockPlaidFunction: any;

  beforeAll(async () => {
    // Create Express app instance for testing
    app = createApp();
    
    // Set environment variables for tests
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.PLAID_CLIENT_ID = 'test-client-id';
    process.env.PLAID_SECRET = 'test-secret';
    process.env.PLAID_ENV = 'sandbox';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

    // Get the mock function
    const plaidMock = await import('plaid');
    mockPlaidFunction = (plaidMock as any).__mockItemPublicTokenExchange;

    // Create valid JWT token
    validJwtToken = jwt.sign(
      { user_id: 'test-user-1' },
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
    if (mockPlaidFunction) {
      mockPlaidFunction.mockClear();
    }
  });

  afterEach(async () => {
    await teardownTestData();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('Successful bank connection', () => {
    it('should return 200 with success message when connecting bank with valid JWT and public_token', async () => {
      // Mock successful Plaid API response
      mockPlaidFunction.mockResolvedValue({
        data: {
          access_token: 'access-sandbox-test-token',
          item_id: 'test-item-id',
        },
      });

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify response structure
      expect(response.body).toEqual({
        message: 'Bank connected successfully',
        hasConnectedBank: true,
      });

      // Verify Plaid API was called with correct parameters
      expect(mockPlaidFunction).toHaveBeenCalledWith({
        public_token: 'public-sandbox-12345',
      });
    });

    it('should encrypt access token before storing in database', async () => {
      // Mock successful Plaid API response
      const plainAccessToken = 'access-sandbox-test-token';
      mockPlaidFunction.mockResolvedValue({
        data: {
          access_token: plainAccessToken,
          item_id: 'test-item-id',
        },
      });

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify that the stored token is encrypted (not plain text)
      const { testDb } = await import('../../test/database.js');
      const updatedUser = await testDb.user.findUnique({
        where: { id: 'test-user-1' },
      });

      expect(updatedUser?.plaidAccessToken).toBeDefined();
      expect(updatedUser?.plaidAccessToken).not.toBe(plainAccessToken);
      expect(updatedUser?.plaidAccessToken?.length).toBeGreaterThan(plainAccessToken.length);
    });
  });

  describe('Authentication errors - 401 Unauthorized', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
      });
    });

    it('should return 401 when Authorization header is malformed', async () => {
      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', 'InvalidFormat')
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authorization token required',
      });
    });

    it('should return 401 when JWT token is invalid', async () => {
      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });
    });

    it('should return 401 when JWT token is expired', async () => {
      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${expiredJwtToken}`)
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });
    });

    it('should return 401 when JWT token has no user_id claim', async () => {
      const invalidToken = jwt.sign(
        { some_other_field: 'value' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(requestBody)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid or expired token',
      });
    });
  });

  describe('Bad request errors - 400', () => {
    it('should return 400 when public_token is missing', async () => {
      const requestBody = {};

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Public token is required',
      });
    });

    it('should return 400 when public_token is empty string', async () => {
      const requestBody = {
        public_token: '',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Public token is required',
      });
    });

    it('should return 400 when public_token is not a string', async () => {
      const requestBody = {
        public_token: 12345,
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Public token is required',
      });
    });

    it('should return 400 when Plaid public_token is invalid', async () => {
      // Mock Plaid API error for invalid token
      
      const plaidError = new Error('INVALID_PUBLIC_TOKEN');
      plaidError.name = 'PlaidError';
      mockPlaidFunction.mockRejectedValue(plaidError);

      const requestBody = {
        public_token: 'invalid-public-token',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid Plaid token',
      });
    });
  });

  describe('Plaid API errors - 502 Bad Gateway', () => {
    it('should return 502 when Plaid API is unavailable', async () => {
      // Mock Plaid API network error
      
      const networkError = new Error('ECONNREFUSED');
      networkError.name = 'NetworkError';
      mockPlaidFunction.mockRejectedValue(networkError);

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to bank. Please try again.',
      });
    });

    it('should return 502 when Plaid API returns server error', async () => {
      // Mock Plaid API server error
      
      const serverError = new Error('Internal server error');
      serverError.name = 'PlaidServerError';
      mockPlaidFunction.mockRejectedValue(serverError);

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(502);

      expect(response.body).toEqual({
        success: false,
        error: 'Unable to connect to bank. Please try again.',
      });
    });
  });

  describe('Database verification', () => {
    it('should update user plaidAccessToken field when connection succeeds', async () => {
      // Mock successful Plaid API response
      mockPlaidFunction.mockResolvedValue({
        data: {
          access_token: 'access-sandbox-test-token',
          item_id: 'test-item-id',
        },
      });

      // Verify user has no access token initially
      const { testDb } = await import('../../test/database.js');
      const initialUser = await testDb.user.findUnique({
        where: { id: 'test-user-1' },
      });
      expect(initialUser?.plaidAccessToken).toBeNull();

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify user now has encrypted access token
      const updatedUser = await testDb.user.findUnique({
        where: { id: 'test-user-1' },
      });
      expect(updatedUser?.plaidAccessToken).toBeDefined();
      expect(updatedUser?.plaidAccessToken).not.toBeNull();
    });
  });

  describe('Response format validation', () => {
    it('should return response matching exact API specification', async () => {
      // Mock successful Plaid API response
      mockPlaidFunction.mockResolvedValue({
        data: {
          access_token: 'access-sandbox-test-token',
          item_id: 'test-item-id',
        },
      });

      const requestBody = {
        public_token: 'public-sandbox-12345',
      };

      const response = await request(app)
        .post('/api/plaid/connect')
        .set('Authorization', `Bearer ${validJwtToken}`)
        .send(requestBody)
        .expect(200);

      // Verify top-level structure
      expect(Object.keys(response.body)).toEqual(['message', 'hasConnectedBank']);

      // Verify field types and values
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).toBe('Bank connected successfully');
      expect(typeof response.body.hasConnectedBank).toBe('boolean');
      expect(response.body.hasConnectedBank).toBe(true);
    });
  });
});
