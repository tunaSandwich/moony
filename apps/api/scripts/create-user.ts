import '../src/config/loadEnv.js';
import { PrismaClient } from '@prisma/client';

type ArgMap = Record<string, string | boolean>;

function parseArgs(argv: string[]): ArgMap {
  const args: ArgMap = {};
  let key: string | null = null;
  for (const token of argv) {
    if (token.startsWith('--')) {
      key = token.replace(/^--/, '');
      args[key] = true;
    } else if (token.startsWith('-')) {
      key = token.replace(/^-/, '');
      args[key] = true;
    } else if (key) {
      args[key] = token;
      key = null;
    }
  }
  return args;
}

function requireStringArg(args: ArgMap, names: string[]): string {
  for (const name of names) {
    const value = args[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  throw new Error(`Missing required argument: --${names[0]}`);
}

function generateInviteCode(length: number = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    result += alphabet[idx];
  }
  return result;
}

async function generateUniqueInviteCode(prisma: PrismaClient, maxAttempts: number = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateInviteCode(6);
    const existing = await prisma.user.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique invite code after multiple attempts');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const argv = process.argv.slice(2);
    const args = parseArgs(argv);

    const firstName = requireStringArg(args, ['firstName', 'f']);
    const lastName = requireStringArg(args, ['lastName', 'l']);
    const phoneNumber = requireStringArg(args, ['phoneNumber', 'p']);

    // Ensure phone number does not already exist
    const existingByPhone = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingByPhone) {
      console.error(`User with phoneNumber ${phoneNumber} already exists (id=${existingByPhone.id}).`);
      process.exit(1);
    }

    const inviteCode = await generateUniqueInviteCode(prisma);

    const user = await prisma.user.create({
      data: {
        inviteCode,
        firstName,
        lastName,
        phoneNumber,
        phoneVerified: false,
        optOutStatus: 'opted_in',
        isActive: true,
        currency: 'USD',
      },
    });

    console.log('✅ User created successfully');
    console.log(JSON.stringify({
      id: user.id,
      inviteCode: user.inviteCode,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      environment: process.env.NODE_ENV || 'local',
    }, null, 2));

    await prisma.$disconnect();
  } catch (err: any) {
    console.error('❌ Failed to create user');
    if (err && err.message) console.error(err.message);
    process.exit(1);
  }
}

main();


