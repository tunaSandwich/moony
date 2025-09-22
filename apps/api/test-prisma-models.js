import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModels() {
  try {
    console.log('Testing Prisma connection...');
    
    // List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        inviteCode: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        phoneVerified: true
      }
    });
    
    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModels();