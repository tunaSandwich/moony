/**
 * Development Mode Service
 * 
 * Handles development-specific functionality including auto-launching the SMS simulator
 * when phone verification completes in development mode.
 */

import { spawn } from 'child_process';
import { platform } from 'os';
import { logger } from '@logger';

export class DevModeService {
  private static activeSimulators: Map<string, any> = new Map();

  /**
   * Initialize development tools for a newly verified user
   */
  public static async initializeForUser(phoneNumber: string): Promise<void> {
    if (!this.isDevMode()) {
      return;
    }

    if (!this.isSMSSimulatorEnabled()) {
      logger.debug('SMS simulator disabled in development mode', { phoneNumber });
      return;
    }

    try {
      logger.info('Initializing development tools for user', { phoneNumber });
      
      // Launch SMS simulator in new terminal
      await this.launchSMSSimulator(phoneNumber);
      
      logger.info('Development tools initialized successfully', { phoneNumber });
      
    } catch (error: any) {
      logger.error('Failed to initialize development tools', {
        phoneNumber,
        error: error.message
      });
    }
  }

  /**
   * Launch SMS simulator in a new terminal window
   */
  private static async launchSMSSimulator(phoneNumber: string): Promise<void> {
    const simulatorKey = phoneNumber;
    
    // Check if simulator is already running for this number
    if (this.activeSimulators.has(simulatorKey)) {
      logger.debug('SMS simulator already running for phone number', { phoneNumber });
      return;
    }

    try {
      const command = this.getTerminalCommand(phoneNumber);
      if (!command) {
        throw new Error('No suitable terminal application found');
      }

      logger.info('Launching SMS simulator in new terminal', { 
        phoneNumber,
        platform: platform(),
        command: command.cmd,
        args: command.args,
        fullCommand: `${command.cmd} ${command.args.join(' ')}`
      });

      // Launch the simulator
      const child = spawn(command.cmd, command.args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'] // Capture output for debugging
      });

      // Log output for debugging
      child.stdout?.on('data', (data) => {
        logger.debug('SMS simulator stdout', { output: data.toString() });
      });
      
      child.stderr?.on('data', (data) => {
        logger.error('SMS simulator stderr', { error: data.toString() });
      });

      // Store reference to active simulator
      this.activeSimulators.set(simulatorKey, {
        process: child,
        phoneNumber,
        startTime: new Date()
      });

      // Handle process exit
      child.on('exit', (code) => {
        logger.debug('SMS simulator process exited', { 
          phoneNumber, 
          exitCode: code 
        });
        this.activeSimulators.delete(simulatorKey);
      });

      child.on('error', (error) => {
        logger.error('SMS simulator process error', {
          phoneNumber,
          error: error.message
        });
        this.activeSimulators.delete(simulatorKey);
      });

      // Don't wait for the child process
      child.unref();

    } catch (error: any) {
      logger.error('Failed to launch SMS simulator', {
        phoneNumber,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get the appropriate terminal command for the current platform
   */
  private static getTerminalCommand(phoneNumber: string): { cmd: string; args: string[] } | null {  const currentPlatform = platform();
    const cwd = process.cwd();
  
    // Default simulator command used by non-macOS branches
    const simulatorCmd = `cd "${cwd}" && npm run sms:simulator ${phoneNumber}`;
  
    switch (currentPlatform) {
      case 'darwin': { // macOS (Terminal.app)
        // Use AppleScript's `quoted form of` to avoid any nested quote errors
        const appleScript = `
  tell application "Terminal"
    if not (exists window 1) then reopen
    activate
    do script "cd " & quoted form of "${cwd}" & " && npm run sms:simulator " & quoted form of "${phoneNumber}"
  end tell
        `.trim();
  
        return {
          cmd: 'osascript',
          args: ['-e', appleScript],
        };
      }
  
      case 'win32': // Windows (cmd)
        return {
          cmd: 'cmd',
          args: ['/c', 'start', 'cmd', '/k', simulatorCmd],
        };
  
      case 'linux': // Linux (gnome-terminal; adjust if you use another)
        return {
          cmd: 'gnome-terminal',
          args: ['--', 'bash', '-c', `${simulatorCmd}; exec bash`],
        };
  
      default:
        logger.warn('Unsupported platform for terminal launch', { platform: currentPlatform });
        return null;
    }
  }

  /**
   * Check if running in development mode
   */
  private static isDevMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local';
  }

  /**
   * Check if SMS simulator is enabled
   */
  private static isSMSSimulatorEnabled(): boolean {
    return process.env.SMS_SIMULATOR === 'true';
  }

  /**
   * Stop all active simulators
   */
  public static stopAllSimulators(): void {
    logger.info('Stopping all active SMS simulators', {
      count: this.activeSimulators.size
    });

    this.activeSimulators.forEach((simulator, phoneNumber) => {
      try {
        if (simulator.process && !simulator.process.killed) {
          simulator.process.kill('SIGTERM');
        }
      } catch (error: any) {
        logger.warn('Error stopping simulator process', {
          phoneNumber,
          error: error.message
        });
      }
    });

    this.activeSimulators.clear();
  }

  /**
   * Get status of active simulators
   */
  public static getSimulatorStatus(): Array<{
    phoneNumber: string;
    startTime: Date;
    pid?: number;
  }> {
    return Array.from(this.activeSimulators.entries()).map(([phoneNumber, simulator]) => ({
      phoneNumber,
      startTime: simulator.startTime,
      pid: simulator.process?.pid
    }));
  }

  /**
   * Stop simulator for specific phone number
   */
  public static stopSimulator(phoneNumber: string): boolean {
    const simulator = this.activeSimulators.get(phoneNumber);
    
    if (!simulator) {
      return false;
    }

    try {
      if (simulator.process && !simulator.process.killed) {
        simulator.process.kill('SIGTERM');
      }
      
      this.activeSimulators.delete(phoneNumber);
      
      logger.info('Stopped SMS simulator', { phoneNumber });
      return true;
      
    } catch (error: any) {
      logger.error('Failed to stop SMS simulator', {
        phoneNumber,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Setup development mode event listeners
   */
  public static setupDevModeListeners(): void {
    if (!this.isDevMode()) {
      return;
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopAllSimulators();
    });

    process.on('SIGTERM', () => {
      this.stopAllSimulators();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', () => {
      this.stopAllSimulators();
    });

    logger.debug('Development mode listeners setup complete');
  }

  /**
   * Validate development environment
   */
  public static validateDevEnvironment(): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!this.isDevMode()) {
      issues.push('Not running in development mode');
    }

    if (!process.env.AWS_SANDBOX_MODE || process.env.AWS_SANDBOX_MODE === 'false') {
      issues.push('AWS_SANDBOX_MODE should be true in development');
    }

    const requiredVars = [
      'AWS_REGION',
      'AWS_PHONE_NUMBER',
      'AWS_SNS_TOPIC_ARN'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        issues.push(`Missing environment variable: ${varName}`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
