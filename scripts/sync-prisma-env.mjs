import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function ensurePrismaEnvSymlink() {
  const nodeEnv = process.env.NODE_ENV || 'local';

  const envFileMap = {
    local: '.env.local',
    staging: '.env.staging',
    production: '.env.production',
  };

  const selectedEnvFile = envFileMap[nodeEnv] || envFileMap.local;
  const sourceEnvPath = path.join(repoRoot, selectedEnvFile);
  const prismaEnvPath = path.join(repoRoot, 'apps', 'api', 'prisma', '.env');

  try {
    await fs.access(sourceEnvPath);
  } catch {
    console.warn(`Warning: ${selectedEnvFile} not found at project root. Skipping prisma .env sync.`);
    return;
  }

  try {
    // Remove existing target if present
    await fs.unlink(prismaEnvPath).catch(() => {});
    await fs.symlink(sourceEnvPath, prismaEnvPath);
    console.log(`Prisma .env → ${selectedEnvFile}`);
  } catch (err) {
    console.error('Failed to sync prisma .env:', err);
    process.exitCode = 1;
  }
}

ensurePrismaEnvSymlink();


