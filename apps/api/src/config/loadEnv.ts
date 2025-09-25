import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');

// Load environment-specific configuration as early as possible
const nodeEnv = process.env.NODE_ENV || 'local';

// First, load .env.<env> from project root
dotenv.config({ path: path.join(projectRoot, `.env.${nodeEnv}`) });

// Then, load .env as a fallback for shared variables from project root
dotenv.config({ path: path.join(projectRoot, '.env') });


