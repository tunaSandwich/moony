import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

interface SeedOptions {
  clear?: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldClear = args.includes('--clear');

const seedOptions: SeedOptions = {
  clear: shouldClear,
};

// Helper function to create date ranges for spending goals
function createMonthPeriod(monthsOffset: number = 0, startDay: number = 1) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthsOffset;
  
  const periodStart = new Date(year, month, startDay);
  const periodEnd = new Date(year, month + 1, startDay - 1);
  
  return { periodStart, periodEnd };
}

// Sample users data
const sampleUsers = [
  {
    inviteCode: 'FRIEND1',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+16268075538',
    phoneVerified: false,
    plaidAccessToken: null,
    currency: 'USD',
  },
  {
    inviteCode: 'FRIEND2',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '+14155552002',
    phoneVerified: true,
    plaidAccessToken: null, // User without bank connection
    currency: 'USD',
  },
  {
    inviteCode: 'FRIEND3',
    firstName: 'Michael',
    lastName: 'Johnson',
    phoneNumber: '+14155552003',
    phoneVerified: false, // Unverified user
    plaidAccessToken: 'access-sandbox-test-user-3',
    currency: 'USD',
  },
];

// Sample spending goals data
const createSpendingGoals = (userId: string, userName: string) => {
  const currentPeriod = createMonthPeriod(0, 1); // Current month starting on 1st
  const previousPeriod = createMonthPeriod(-1, 1); // Previous month
  
  const goals = [
    // Current active goal
    {
      userId,
      monthlyLimit: new Decimal(userName === 'John' ? '3500.00' : userName === 'Jane' ? '2800.00' : '4200.00'),
      monthStartDay: 1,
      periodStart: currentPeriod.periodStart,
      periodEnd: currentPeriod.periodEnd,
      isActive: true,
    },
  ];
  
  // Add previous goal for John (inactive)
  if (userName === 'John') {
    goals.push({
      userId,
      monthlyLimit: new Decimal('3000.00'),
      monthStartDay: 1,
      periodStart: previousPeriod.periodStart,
      periodEnd: previousPeriod.periodEnd,
      isActive: false,
    });
  }
  
  return goals;
};

// Sample daily messages data
const createDailyMessages = (userId: string, spendingGoalId: string) => {
  const messages = [];
  const today = new Date();
  
  // Create a few sample messages from recent days
  for (let i = 0; i < 3; i++) {
    const messageDate = new Date(today);
    messageDate.setDate(today.getDate() - i);
    
    messages.push({
      userId,
      spendingGoalId,
      messageDate,
      messageType: i === 0 ? 'daily_summary' : 'spending_alert',
      messageData: {
        spentToday: (Math.random() * 150 + 50).toFixed(2),
        monthlySpent: (Math.random() * 1500 + 500).toFixed(2),
        remainingBudget: (Math.random() * 2000 + 1000).toFixed(2),
        daysRemaining: 30 - today.getDate(),
      },
      sentAt: i < 2 ? new Date(messageDate.getTime() + 8 * 60 * 60 * 1000) : null, // 8 AM
      deliveryStatus: i < 2 ? 'delivered' : 'pending',
      twilioMessageSid: i < 2 ? `SM${Math.random().toString(36).substr(2, 32)}` : null,
    });
  }
  
  return messages;
};

async function clearData() {
  console.log('🧹 Clearing existing data...');
  
  try {
    // Delete in order of dependencies (child tables first)
    await prisma.dailyMessage.deleteMany({});
    await prisma.spendingGoal.deleteMany({});
    await prisma.user.deleteMany({});
    
    console.log('✅ Existing data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

async function seedUsers() {
  console.log('👥 Seeding users...');
  
  const createdUsers = [];
  
  for (const userData of sampleUsers) {
    try {
      const user = await prisma.user.upsert({
        where: { inviteCode: userData.inviteCode },
        update: userData,
        create: userData,
      });
      
      createdUsers.push(user);
      console.log(`✅ Created/updated user: ${user.firstName} ${user.lastName} (${user.inviteCode})`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.inviteCode}:`, error);
      throw error;
    }
  }
  
  return createdUsers;
}

async function seedSpendingGoals(users: any[]) {
  console.log('🎯 Seeding spending goals...');
  
  const createdGoals = [];
  
  for (const user of users) {
    const goalsData = createSpendingGoals(user.id, user.firstName);
    
    for (const goalData of goalsData) {
      try {
        const goal = await prisma.spendingGoal.create({
          data: goalData,
        });
        
        createdGoals.push(goal);
        console.log(`✅ Created spending goal for ${user.firstName}: $${goal.monthlyLimit} (${goal.isActive ? 'Active' : 'Inactive'})`);
      } catch (error) {
        console.error(`❌ Error creating spending goal for user ${user.id}:`, error);
        throw error;
      }
    }
  }
  
  return createdGoals;
}

async function seedDailyMessages(users: any[], goals: any[]) {
  console.log('📱 Seeding daily messages...');
  
  let messageCount = 0;
  
  for (const user of users) {
    // Find active goals for this user
    const userGoals = goals.filter(goal => goal.userId === user.id && goal.isActive);
    
    for (const goal of userGoals) {
      const messagesData = createDailyMessages(user.id, goal.id);
      
      for (const messageData of messagesData) {
        try {
          await prisma.dailyMessage.create({
            data: messageData,
          });
          
          messageCount++;
        } catch (error) {
          console.error(`❌ Error creating daily message for user ${user.id}:`, error);
          throw error;
        }
      }
    }
  }
  
  console.log(`✅ Created ${messageCount} daily messages`);
}

async function main() {
  console.log('🌱 Starting database seed...');
  console.log(`📊 Options: ${JSON.stringify(seedOptions)}`);
  
  try {
    // Clear existing data if requested
    if (seedOptions.clear) {
      await clearData();
    }
    
    // Seed data in order of dependencies
    const users = await seedUsers();
    const goals = await seedSpendingGoals(users);
    await seedDailyMessages(users, goals);
    
    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${users.length} users created/updated`);
    console.log(`   • ${goals.length} spending goals created`);
    console.log(`   • Daily messages created for active goals`);
    console.log('\n🔍 Test users:');
    
    for (const user of users) {
      console.log(`   • ${user.firstName} ${user.lastName} (${user.inviteCode})`);
      console.log(`     Phone: ${user.phoneNumber} | Verified: ${user.phoneVerified}`);
      console.log(`     Plaid Token: ${user.plaidAccessToken ? 'Connected' : 'Not connected'}`);
    }
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle process interruption gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️  Seeding interrupted');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Seeding terminated');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the main function
main()
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
