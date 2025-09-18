import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient();

export async function setupTestData() {
  // Clear existing test data
  await testDb.dailyMessage.deleteMany();
  await testDb.spendingGoal.deleteMany();
  await testDb.user.deleteMany();

  // Create test users with known invite codes and phone numbers
  const testUser1 = await testDb.user.create({
    data: {
      id: 'test-user-1',
      inviteCode: 'ABC123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+15551234567',
      phoneVerified: false,
      plaidAccessToken: null,
      optOutStatus: 'opted_in',
      isActive: true,
      currency: 'USD',
    },
  });

  const testUser2 = await testDb.user.create({
    data: {
      id: 'test-user-2',
      inviteCode: 'XYZ789',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+15559876543',
      phoneVerified: true,
      plaidAccessToken: 'encrypted-access-token',
      optOutStatus: 'opted_in',
      isActive: true,
      currency: 'USD',
    },
  });

  return { testUser1, testUser2 };
}

export async function teardownTestData() {
  await testDb.dailyMessage.deleteMany();
  await testDb.spendingGoal.deleteMany();
  await testDb.user.deleteMany();
}

export async function closeTestDatabase() {
  await testDb.$disconnect();
}