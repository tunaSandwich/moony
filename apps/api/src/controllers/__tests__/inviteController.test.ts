import request from 'supertest';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { setupTestData, teardownTestData, closeTestDatabase, testDb } from '../../test/database.js';
import { createApp } from '../../config/app.js';

describe('POST /api/invite-codes/validate', () => {
  let app: Application;

  beforeAll(async () => {
    // Create Express app instance for testing
    app = createApp();
    // Set JWT secret for tests
    process.env.JWT_SECRET = 'test-secret-key';
  });

  beforeEach(async () => {
    await setupTestData();
  });

  afterEach(async () => {
    await teardownTestData();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('Successful validation', () => {
    it('should return 200 with user data and JWT token for valid invite code and phone number', async () => {
      const requestBody = {
        code: 'ABC123',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');

      // Verify user data
      const { user } = response.body;
      expect(user).toMatchObject({
        id: 'test-user-1',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+15551234567',
        hasConnectedBank: false, // plaidAccessToken is null
        twilioStatus: 'unverified' // phoneVerified is false
      });

      // Verify JWT token
      const { token } = response.body;
      expect(typeof token).toBe('string');
      
      // Decode and verify JWT structure
      const decoded = jwt.decode(token) as any;
      expect(decoded).toHaveProperty('user_id', 'test-user-1');
      expect(decoded).toHaveProperty('exp');
      
      // Verify 30-day expiration (within 1 minute tolerance)
      const expectedExp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      expect(decoded.exp).toBeCloseTo(expectedExp, -2);
    });

    it('should return correct derived fields for user with connected bank', async () => {
      const requestBody = {
        code: 'XYZ789',
        phone_number: '+15559876543'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(200);

      const { user } = response.body;
      expect(user).toMatchObject({
        id: 'test-user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+15559876543',
        hasConnectedBank: true, // plaidAccessToken exists
        twilioStatus: 'verified' // phoneVerified is true
      });
    });
  });

  describe('Error cases - 404 Not Found', () => {
    it('should return 404 for invalid invite code', async () => {
      const requestBody = {
        code: 'INVALID123',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid invite code or phone number'
      });
    });

    it('should return 404 for correct invite code but wrong phone number', async () => {
      const requestBody = {
        code: 'ABC123',
        phone_number: '+15559999999'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid invite code or phone number'
      });
    });

    it('should return 404 for non-existent invite code', async () => {
      const requestBody = {
        code: 'NONEXISTENT',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid invite code or phone number'
      });
    });
  });

  describe('Error cases - 400 Bad Request', () => {
    it('should return 400 when code field is missing', async () => {
      const requestBody = {
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });

    it('should return 400 when phone_number field is missing', async () => {
      const requestBody = {
        code: 'ABC123'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });

    it('should return 400 when both fields are missing', async () => {
      const requestBody = {};

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });

    it('should return 400 when code is empty string', async () => {
      const requestBody = {
        code: '',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });

    it('should return 400 when phone_number is empty string', async () => {
      const requestBody = {
        code: 'ABC123',
        phone_number: ''
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });

    it('should return 400 when code is not a string', async () => {
      const requestBody = {
        code: 123,
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });

    it('should return 400 when phone_number is not a string', async () => {
      const requestBody = {
        code: 'ABC123',
        phone_number: 15551234567
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Code and phone number are required'
      });
    });
  });

  describe('JWT token validation', () => {
    it('should generate valid JWT that can be verified', async () => {
      // This test will require JWT_SECRET to be set
      process.env.JWT_SECRET = 'test-secret-key';

      const requestBody = {
        code: 'ABC123',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(200);

      const { token } = response.body;
      
      // Verify token can be decoded with the secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.user_id).toBe('test-user-1');
    });

    it('should include all required claims in JWT', async () => {
      process.env.JWT_SECRET = 'test-secret-key';

      const requestBody = {
        code: 'ABC123',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(200);

      const { token } = response.body;
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      expect(decoded).toHaveProperty('user_id');
      expect(decoded).toHaveProperty('iat'); // issued at
      expect(decoded).toHaveProperty('exp'); // expiration
    });
  });

  describe('Response format validation', () => {
    it('should return response matching exact API specification', async () => {
      const requestBody = {
        code: 'ABC123',
        phone_number: '+15551234567'
      };

      const response = await request(app)
        .post('/api/invite-codes/validate')
        .send(requestBody)
        .expect(200);

      // Verify top-level structure
      expect(Object.keys(response.body)).toEqual(['user', 'token']);

      // Verify user object has all required fields
      const { user } = response.body;
      const requiredUserFields = ['id', 'firstName', 'lastName', 'phoneNumber', 'hasConnectedBank', 'twilioStatus'];
      expect(Object.keys(user)).toEqual(expect.arrayContaining(requiredUserFields));

      // Verify no extra fields beyond what's specified
      expect(Object.keys(user)).toHaveLength(requiredUserFields.length);

      // Verify field types
      expect(typeof user.id).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.phoneNumber).toBe('string');
      expect(typeof user.hasConnectedBank).toBe('boolean');
      expect(typeof user.twilioStatus).toBe('string');
      expect(['verified', 'unverified']).toContain(user.twilioStatus);
    });
  });
});