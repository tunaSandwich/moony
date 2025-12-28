#!/usr/bin/env node
import { IncomingMessageHandler } from '../src/services/aws/incomingMessageHandler.js';
import chalk from 'chalk';

const handler = new IncomingMessageHandler();

// Test budget parsing
const testCases = [
  '2000',
  '$2000',
  'budget 2000',
  'My budget is 2500',
  'Set to 3000',
  '2,500',
  'fifteen hundred',
  'STOP',
  'HELP',
  'invalid text',
  '50', // Too low
  '200000' // Too high
];

console.log(chalk.blue.bold('\n💰 Budget Parsing Tests\n'));

testCases.forEach((testCase, index) => {
  const result = (handler as any).parseBudgetMessage(testCase);
  
  const status = result.isValid ? 
    (result.command ? chalk.cyan('CMD') : chalk.green('✓ VALID')) : 
    chalk.red('✗ INVALID');
  
  console.log(`${(index + 1).toString().padStart(2)}. ${status} "${testCase}"`);
  
  if (result.command) {
    console.log(chalk.gray(`    → Command: ${result.command}`));
  } else if (result.isValid && result.amount) {
    console.log(chalk.gray(`    → Amount: $${result.amount}`));
  } else if (!result.isValid) {
    console.log(chalk.gray(`    → Invalid format`));
  }
  
  console.log();
});

console.log(chalk.green('✅ Budget parsing tests completed!'));