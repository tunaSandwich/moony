import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { startOfMonth, endOfMonth, subMonths, formatISO } from 'date-fns';
import { PlaidService } from '@services/plaidService';
import { CalculationService } from '@services/calculationService';
import { MessagingService } from '../../../apps/api/src/services/messagingService.js';
import { logger } from '../utils/logger.js';

dotenv.config();

async function readAccessToken(): Promise<string> {
  const fromEnv = process.env.PLAID_ACCESS_TOKEN;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  const raw = await fs.readFile('src/temp_access_token.json', 'utf8');
  const json = JSON.parse(raw);
  const token = json?.access_token;
  if (!token) throw new Error('No access_token found. Connect your bank first via http://localhost:3000');
  return token;
}

async function main() {
  try {
    const accessToken = await readAccessToken();

    const now = new Date();
    const start = startOfMonth(subMonths(now, 1));
    const end = endOfMonth(now);
    const startDate = formatISO(start, { representation: 'date' });
    const endDate = formatISO(end, { representation: 'date' });

    const plaid = new PlaidService();
    logger.info(`Fetching transactions from ${startDate} to ${endDate} ...`);
    const rawTransactions = await plaid.getTransactions(accessToken, startDate, endDate);

    const transactions = rawTransactions.map((t: any) => ({ date: t.date as string, amount: Number(t.amount) }));

    const calc = new CalculationService();
    const report = calc.generateSpendingReport(transactions);

    const messaging = new MessagingService();
    // Legacy format - simplified for testing
    const message = `Spending Report:\nTotal: $${report.monthlySpent}\nDaily Average: $${report.averageDaily}`;

    const testPhoneNumber = process.env.YOUR_WHATSAPP_NUMBER || process.env.YOUR_PHONE_NUMBER;
    if (!testPhoneNumber) {
      throw new Error('YOUR_WHATSAPP_NUMBER or YOUR_PHONE_NUMBER environment variable required for testing');
    }

    logger.info('Sending WhatsApp test message...');
    const result = await messaging.sendMessage({
      to: testPhoneNumber,
      body: message,
      forceChannel: 'whatsapp'
    });

    if (result.success) {
      logger.info('WhatsApp test message sent successfully', {
        messageSid: result.messageSid,
        channel: result.channel
      });
    } else {
      logger.error('Failed to send WhatsApp test message', { error: result.error });
    }
    logger.info('Done.');
  } catch (error) {
    logger.error('test-whatsapp failed', error);
    process.exitCode = 1;
  }
}

main();


