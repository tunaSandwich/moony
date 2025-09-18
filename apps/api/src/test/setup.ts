import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.development' });

// Set test environment
process.env.NODE_ENV = 'test';