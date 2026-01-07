import { TemplateVariables, MessageTemplate } from '../templates/smsTemplates.js';
import { logger } from '@logger';

export class TemplateService {
  /**
   * Render a template with variables
   * Validates all required variables are provided
   */
  public static render(template: string, variables: TemplateVariables): string {
    let rendered = template;
    
    // Replace all variables in the template
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      if (value !== undefined && value !== null) {
        // Use regex to replace all occurrences
        const regex = new RegExp(`{${key}}`, 'g');
        rendered = rendered.replace(regex, String(value));
      }
    });
    
    // Check for any unreplaced variables (indicates missing data)
    const unreplaced = rendered.match(/{[^}]+}/g);
    if (unreplaced) {
      logger.warn('Template has unreplaced variables', {
        template: template.substring(0, 50),
        unreplaced
      });
    }
    
    return rendered;
  }

  /**
   * Render a message template with variables
   */
  public static renderTemplate(messageTemplate: MessageTemplate, variables: TemplateVariables): string {
    // Validate required variables if specified
    if (messageTemplate.variables) {
      const isValid = this.validateVariables(messageTemplate.variables, variables);
      if (!isValid) {
        const missing = messageTemplate.variables.filter(
          varName => variables[varName] === undefined || variables[varName] === null
        );
        logger.warn('Missing required variables for template', { templateId: messageTemplate.id, missing });
      }
    }

    return this.render(messageTemplate.template, variables);
  }
  
  /**
   * Format currency values consistently
   */
  public static formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num)) {
      return '0';
    }
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(num));
  }
  
  /**
   * Validate required variables are present
   */
  public static validateVariables(
    requiredVars: string[], 
    providedVars: TemplateVariables
  ): boolean {
    return requiredVars.every(varName => 
      providedVars[varName] !== undefined && providedVars[varName] !== null
    );
  }

  /**
   * Format variables for template rendering, including currency formatting
   */
  public static formatVariables(variables: TemplateVariables): TemplateVariables {
    const formatted: TemplateVariables = { ...variables };

    // Currency fields that should be formatted
    const currencyFields = [
      'currentSpending', 'monthlyBudget', 'dailyTarget', 'adjustedDailyTarget',
      'overAmount', 'currentMonthAmount', 'lastMonthAmount', 'twoMonthsAgoAmount'
    ];

    currencyFields.forEach(field => {
      if (formatted[field] !== undefined && formatted[field] !== null) {
        formatted[field] = this.formatCurrency(formatted[field] as number | string);
      }
    });

    return formatted;
  }

  /**
   * Generate a progress bar for spending visualization
   */
  public static generateProgressBar(spent: number, budget: number, length: number = 10): string {
    if (budget <= 0) return '⬜'.repeat(length);
    
    const percentage = Math.min(spent / budget, 1);
    const filledBlocks = Math.round(percentage * length);
    
    let bar = '';
    for (let i = 0; i < length; i++) {
      if (i < filledBlocks) {
        bar += percentage > 1 ? '🔴' : '🟢';
      } else {
        bar += '⬜';
      }
    }
    
    return bar;
  }

  /**
   * Format month names consistently
   */
  public static formatMonthName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long' });
  }

  /**
   * Calculate days remaining in current month
   */
  public static getDaysRemainingInMonth(date: Date = new Date()): number {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return lastDay.getDate() - date.getDate();
  }

  /**
   * Helper to prepare common template variables
   */
  public static prepareCommonVariables(data: {
    firstName?: string;
    currentSpending?: number;
    monthlyBudget?: number;
    dailyTarget?: number;
    currentDate?: Date;
  }): TemplateVariables {
    const currentDate = data.currentDate || new Date();
    
    const variables: TemplateVariables = {
      firstName: data.firstName || 'there',
      currentMonthName: this.formatMonthName(currentDate),
      daysRemaining: this.getDaysRemainingInMonth(currentDate)
    };

    // Add formatted currency values
    if (data.currentSpending !== undefined) {
      variables.currentSpending = this.formatCurrency(data.currentSpending);
    }
    
    if (data.monthlyBudget !== undefined) {
      variables.monthlyBudget = this.formatCurrency(data.monthlyBudget);
    }
    
    if (data.dailyTarget !== undefined) {
      variables.dailyTarget = this.formatCurrency(data.dailyTarget);
    }

    // Add progress bar if we have spending and budget data
    if (data.currentSpending !== undefined && data.monthlyBudget !== undefined) {
      variables.progressBar = this.generateProgressBar(data.currentSpending, data.monthlyBudget);
    }

    return variables;
  }

  /**
   * Determine which daily template to use based on spending data
   */
  public static selectDailyTemplate(data: {
    currentSpending: number;
    monthlyBudget: number;
    expectedSpending?: number;
  }): 'ON_TRACK' | 'OVER_BUDGET' | 'BEHIND_PACE' {
    const { currentSpending, monthlyBudget, expectedSpending } = data;
    
    // Over budget
    if (currentSpending > monthlyBudget) {
      return 'OVER_BUDGET';
    }
    
    // Behind expected pace (if provided)
    if (expectedSpending && currentSpending < expectedSpending * 0.8) {
      return 'BEHIND_PACE';
    }
    
    // Default to on track
    return 'ON_TRACK';
  }

  /**
   * Determine which welcome template to use based on available data
   */
  public static selectWelcomeTemplate(data: {
    hasCurrentMonth: boolean;
    hasLastMonth: boolean;
    hasTwoMonthsAgo: boolean;
    isReconnection?: boolean;
  }): 'FULL_DATA' | 'PARTIAL_DATA' | 'NO_DATA' | 'RECONNECTED' {
    if (data.isReconnection) {
      return 'RECONNECTED';
    }
    
    if (data.hasCurrentMonth && data.hasLastMonth && data.hasTwoMonthsAgo) {
      return 'FULL_DATA';
    }
    
    if (data.hasCurrentMonth) {
      return 'PARTIAL_DATA';
    }
    
    return 'NO_DATA';
  }
}
