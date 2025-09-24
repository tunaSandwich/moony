import dotenv from 'dotenv';

// Load environment-specific configuration as early as possible
const nodeEnv = process.env.NODE_ENV || 'local';

// First, load .env.<env>
dotenv.config({ path: `.env.${nodeEnv}` });

// Then, load .env as a fallback for shared variables
dotenv.config({ path: '.env' });


