/**
 * SMS Simulator for Development Testing
 * 
 * Provides a terminal-based SMS interface for testing two-way SMS conversations
 * in development mode when real SMS isn't available (AWS sandbox mode).
 */

import chalk from 'chalk';
import readline from 'readline';
import { EventEmitter } from 'events';
import axios from 'axios';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'incoming' | 'outgoing' | 'system';
  text: string;
  timestamp: Date;
}

export class SMSSimulator extends EventEmitter {
  private phoneNumber: string;
  private messages: Message[] = [];
  private rl: readline.Interface;
  private isRunning: boolean = false;
  private maxLineWidth: number = 35;
  private maxMessages: number = 50;
  private apiUrl: string;

  constructor(phoneNumber: string, apiUrl: string = 'http://localhost:3000') {
    super();
    this.phoneNumber = this.formatPhoneNumber(phoneNumber);
    this.apiUrl = apiUrl;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Start the SMS simulator
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    this.clearScreen();
    this.renderUI();
    
    // Add welcome system message
    this.addSystemMessage('SMS Simulator Started');
    this.addSystemMessage(`Simulating: ${this.phoneNumber}`);
    
    // Listen for user input
    this.promptForMessage();
    
    // Handle terminal resize
    process.stdout.on('resize', () => {
      if (this.isRunning) {
        this.renderUI();
      }
    });
    
    // Setup message interception
    this.setupInterception();
  }

  /**
   * Stop the SMS simulator
   */
  public stop(): void {
    this.isRunning = false;
    this.restoreInterception();
    this.rl.close();
    this.clearScreen();
    console.log(chalk.gray('SMS Simulator stopped'));
  }

  /**
   * Add an incoming message (from moony)
   */
  public addIncomingMessage(text: string): void {
    const message: Message = {
      id: `msg-${Date.now()}`,
      type: 'incoming',
      text: text.trim(),
      timestamp: new Date()
    };
    
    this.messages.push(message);
    this.trimMessages();
    
    if (this.isRunning) {
      this.renderUI();
      this.promptForMessage();
    }
  }

  /**
   * Add an outgoing message (from user)
   */
  private addOutgoingMessage(text: string): void {
    const message: Message = {
      id: `msg-${Date.now()}`,
      type: 'outgoing',
      text: text.trim(),
      timestamp: new Date()
    };
    
    this.messages.push(message);
    this.trimMessages();
    
    if (this.isRunning) {
      this.renderUI();
    }
  }

  /**
   * Add a system message
   */
  private addSystemMessage(text: string): void {
    const message: Message = {
      id: `sys-${Date.now()}`,
      type: 'system',
      text: text.trim(),
      timestamp: new Date()
    };
    
    this.messages.push(message);
    this.trimMessages();
    
    if (this.isRunning) {
      this.renderUI();
    }
  }

  /**
   * Prompt for user message input
   */
  private promptForMessage(): void {
    this.rl.question(chalk.cyan('Your message: '), async (input) => {
      if (!this.isRunning) return;
      
      // Handle exit command
      if (input.toLowerCase() === 'exit') {
        this.stop();
        process.exit(0);
        return;
      }
      
      // Handle clear command
      if (input.toLowerCase() === 'clear') {
        this.messages = [];
        this.addSystemMessage('Messages cleared');
        this.renderUI();
        this.promptForMessage();
        return;
      }
      
      // Handle empty input
      if (!input.trim()) {
        this.promptForMessage();
        return;
      }
      
      // Add outgoing message
      this.addOutgoingMessage(input);
      
      // Send to webhook
      await this.sendToWebhook(input);
      
      // Continue prompting
      this.promptForMessage();
    });
  }

  /**
   * Send message to simulator API (which forwards to webhook)
   */
  private async sendToWebhook(message: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: this.phoneNumber,
          message: message
        })
      });
      
      if (response.ok) {
        this.addSystemMessage(`✅ Reply sent: ${message}`);
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
      
    } catch (error: any) {
      this.addSystemMessage(`⚠️ Webhook error: ${error.message}`);
    }
  }

  /**
   * Setup message interception for AWS SMS
   */
  private setupInterception(): void {
    console.log('[Simulator] Setting up HTTP message polling for:', this.phoneNumber);
    
    // Register with the simulator API
    this.registerWithAPI();
    
    // Poll for messages every 2 seconds
    this.startMessagePolling();
  }

  /**
   * Restore original message handling
   */
  private restoreInterception(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  private pollingInterval?: NodeJS.Timeout;
  private apiBaseUrl = 'http://localhost:3000/api/dev/simulator';

  /**
   * Register this simulator with the API
   */
  private async registerWithAPI(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: this.phoneNumber })
      });
      
      if (response.ok) {
        console.log('[Simulator] Successfully registered with API');
      } else {
        console.error('[Simulator] Failed to register with API:', response.status);
      }
    } catch (error: any) {
      console.error('[Simulator] Error registering with API:', error.message);
    }
  }

  /**
   * Start polling for new messages
   */
  private startMessagePolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.apiBaseUrl}/messages/${encodeURIComponent(this.phoneNumber)}`);
        
        if (response.ok) {
          const data = await response.json();
          
          for (const message of data.messages) {
            if (!message.read) {
              setTimeout(() => {
                this.addIncomingMessage(message.body);
              }, 100);
            }
          }
        }
      } catch (error: any) {
        // Silently ignore polling errors to avoid spam
        console.debug('[Simulator] Polling error:', error.message);
      }
    }, 2000);
  }

  /**
   * Check if phone number is a simulator number
   */
  private isSimulatorNumber(phoneNumber: string): boolean {
    const simulatorNumbers = [
      '+14254147755', // Primary simulator
      '+14254147156',
      '+14254147266',
      '+14254147489',
      this.phoneNumber // Current user's number
    ];
    
    return simulatorNumbers.includes(phoneNumber);
  }

  /**
   * Format phone number consistently
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Ensure + prefix
    if (!phoneNumber.startsWith('+')) {
      return `+${phoneNumber}`;
    }
    return phoneNumber;
  }

  /**
   * Trim messages to max limit
   */
  private trimMessages(): void {
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  /**
   * Clear the terminal screen
   */
  private clearScreen(): void {
    console.clear();
  }

  /**
   * Render the UI
   */
  private renderUI(): void {
    this.clearScreen();
    
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;
    
    // Draw header
    console.log(chalk.blue('┌' + '─'.repeat(Math.min(width - 2, 45)) + '┐'));
    console.log(chalk.blue('│') + chalk.bold.white('  📱 SMS Simulator') + ' '.repeat(Math.max(0, Math.min(width - 21, 45) - 18)) + chalk.blue('│'));
    console.log(chalk.blue('│') + chalk.gray(`  ${this.phoneNumber}`) + ' '.repeat(Math.max(0, Math.min(width - 21, 45) - this.phoneNumber.length - 2)) + chalk.blue('│'));
    console.log(chalk.blue('├' + '─'.repeat(Math.min(width - 2, 45)) + '┤'));
    
    // Calculate available height for messages
    const headerHeight = 4;
    const footerHeight = 4;
    const messageAreaHeight = Math.max(5, height - headerHeight - footerHeight - 3);
    
    // Draw message area
    const displayMessages = this.messages.slice(-messageAreaHeight);
    const emptyLines = messageAreaHeight - displayMessages.length;
    
    // Draw empty lines first
    for (let i = 0; i < emptyLines; i++) {
      console.log(chalk.blue('│') + ' '.repeat(Math.min(width - 2, 45)) + chalk.blue('│'));
    }
    
    // Draw messages
    displayMessages.forEach(msg => {
      this.renderMessage(msg, Math.min(width - 4, 43));
    });
    
    // Draw footer
    console.log(chalk.blue('├' + '─'.repeat(Math.min(width - 2, 45)) + '┤'));
    console.log(chalk.blue('│') + chalk.gray(' Type message and press Enter to send') + ' '.repeat(Math.max(0, Math.min(width - 2, 45) - 38)) + chalk.blue('│'));
    console.log(chalk.blue('│') + chalk.gray(' Type "exit" to quit, "clear" to clear') + ' '.repeat(Math.max(0, Math.min(width - 2, 45) - 39)) + chalk.blue('│'));
    console.log(chalk.blue('└' + '─'.repeat(Math.min(width - 2, 45)) + '┘'));
  }

  /**
   * Render a single message
   */
  private renderMessage(message: Message, maxWidth: number): void {
    const lines = this.wrapText(message.text, this.maxLineWidth);
    
    lines.forEach(line => {
      let output = '';
      
      if (message.type === 'incoming') {
        // Incoming messages - left aligned, blue background
        const paddedLine = line.padEnd(this.maxLineWidth, ' ');
        output = chalk.blue('│ ') + chalk.bgBlue.white(paddedLine) + ' '.repeat(Math.max(0, maxWidth - this.maxLineWidth - 1)) + chalk.blue('│');
      } else if (message.type === 'outgoing') {
        // Outgoing messages - right aligned, green background
        const paddedLine = line.padEnd(this.maxLineWidth, ' ');
        const leftPadding = Math.max(0, maxWidth - this.maxLineWidth - 1);
        output = chalk.blue('│') + ' '.repeat(leftPadding) + ' ' + chalk.bgGreen.black(paddedLine) + chalk.blue('│');
      } else {
        // System messages - centered, gray text
        const leftPadding = Math.max(0, Math.floor((maxWidth - line.length) / 2));
        const rightPadding = Math.max(0, maxWidth - line.length - leftPadding);
        output = chalk.blue('│') + ' '.repeat(leftPadding) + chalk.gray(line) + ' '.repeat(rightPadding) + chalk.blue('│');
      }
      
      console.log(output);
    });
    
    // Add spacing between messages
    if (message.type !== 'system') {
      console.log(chalk.blue('│') + ' '.repeat(maxWidth) + chalk.blue('│'));
    }
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
        
        // Handle words longer than maxWidth
        while (currentLine.length > maxWidth) {
          lines.push(currentLine.substring(0, maxWidth));
          currentLine = currentLine.substring(maxWidth);
        }
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
  }
}

// Export a factory function
export function createSMSSimulator(phoneNumber: string, apiUrl?: string): SMSSimulator {
  return new SMSSimulator(phoneNumber, apiUrl);
}