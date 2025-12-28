export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

export interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  description?: string;
  variables?: string[];
}

export const SMS_TEMPLATE_CATEGORIES = {
  WELCOME: 'welcome',
  DAILY: 'daily',
  BUDGET: 'budget',
  ERROR: 'error',
  SYSTEM: 'system'
} as const;

export const WELCOME_TEMPLATES = {
  FULL_DATA: {
    id: 'welcome_full_data',
    name: 'Welcome with Full Analytics',
    template: 'moony\n\n👋 Welcome {firstName}!\n\nI\'ll help you stay on track with daily spending guidance. First, let\'s see your spending pattern:\n\n📅 {twoMonthsAgoName}: ${twoMonthsAgoAmount}\n📅 {lastMonthName}: ${lastMonthAmount}\n💰 {currentMonthName} so far: ${currentMonthAmount}\n\nWhat\'s your spending goal for this month? Just reply with a number (ex: 2000).',
    variables: ['firstName', 'twoMonthsAgoName', 'twoMonthsAgoAmount', 'lastMonthName', 'lastMonthAmount', 'currentMonthName', 'currentMonthAmount']
  },
  
  PARTIAL_DATA: {
    id: 'welcome_partial_data',
    name: 'Welcome with Current Month Only',
    template: 'moony\n\n👋 Welcome {firstName}!\n\nI\'ll help you stay on track with daily spending guidance.\n\n💰 So far in {currentMonthName}: ${currentMonthAmount}\n\nWhat\'s your spending goal for this month? Just reply with a number (ex: 2000).',
    variables: ['firstName', 'currentMonthName', 'currentMonthAmount']
  },
  
  NO_DATA: {
    id: 'welcome_no_data',
    name: 'Welcome with No Analytics',
    template: 'moony\n\n👋 Welcome {firstName}!\n\nI\'ll help you stay on track with daily spending guidance.\n\nWhat\'s your spending goal for {currentMonthName}? Just reply with a number (ex: 2000).',
    variables: ['firstName', 'currentMonthName']
  },
  
  RECONNECTED: {
    id: 'reconnected',
    name: 'Account Reconnected',
    template: 'moony\n\n✅ Your accounts are reconnected!\n\n💰 {currentMonthName} so far: ${currentMonthAmount}\n\nYour daily spending guidance will resume tomorrow morning.',
    variables: ['currentMonthName', 'currentMonthAmount']
  }
};

export const BUDGET_TEMPLATES = {
  CONFIRMATION: {
    id: 'budget_confirmation',
    name: 'Budget Set Confirmation',
    template: 'moony\n\n✅ Perfect! Your ${monthlyBudget} monthly budget is all set.\n\n🎯 Today\'s spending target: ${dailyTarget}\nProgress: ${currentSpending} spent of ${monthlyBudget}\n\nYou\'ll get a daily text like this each morning to help you stay on track. Your budget resets on the 1st of every month.\n\nReply STOP to opt out anytime.',
    variables: ['monthlyBudget', 'dailyTarget', 'currentSpending']
  },
  
  UPDATE_CONFIRMATION: {
    id: 'budget_update',
    name: 'Budget Updated',
    template: 'moony\n\n✅ Budget updated to ${monthlyBudget} for {currentMonthName}.\n\n🎯 New daily target: ${dailyTarget}\nProgress: ${currentSpending} spent of ${monthlyBudget}',
    variables: ['monthlyBudget', 'currentMonthName', 'dailyTarget', 'currentSpending']
  }
};

export const DAILY_TEMPLATES = {
  ON_TRACK: {
    id: 'daily_on_track',
    name: 'Daily Update - On Track',
    template: '☀️ moony\n\nGood morning {firstName}! You\'re doing great.\n\n🎯 Today\'s spending target: ${dailyTarget}\n💰 {currentMonthName} so far: ${currentSpending} of ${monthlyBudget}\n\n{progressBar}\n\n{daysRemaining} days left in {currentMonthName}.',
    variables: ['firstName', 'dailyTarget', 'currentMonthName', 'currentSpending', 'monthlyBudget', 'progressBar', 'daysRemaining']
  },

  OVER_BUDGET: {
    id: 'daily_over_budget',
    name: 'Daily Update - Over Budget',
    template: '⚠️ moony\n\nMorning {firstName}. You\'re over budget for {currentMonthName}.\n\n💰 Spent: ${currentSpending} of ${monthlyBudget}\n📊 Over by: ${overAmount}\n\n🎯 Suggested daily target: ${adjustedDailyTarget}\n\n{daysRemaining} days left to get back on track.',
    variables: ['firstName', 'currentMonthName', 'currentSpending', 'monthlyBudget', 'overAmount', 'adjustedDailyTarget', 'daysRemaining']
  },

  BEHIND_PACE: {
    id: 'daily_behind_pace',
    name: 'Daily Update - Behind Pace',
    template: '📉 moony\n\nMorning {firstName}. You\'re behind your usual spending pace.\n\n💰 {currentMonthName} so far: ${currentSpending} of ${monthlyBudget}\n🎯 Today\'s target: ${dailyTarget}\n\n{progressBar}\n\n{daysRemaining} days left in {currentMonthName}.',
    variables: ['firstName', 'currentMonthName', 'currentSpending', 'monthlyBudget', 'dailyTarget', 'progressBar', 'daysRemaining']
  }
};

export const ERROR_TEMPLATES = {
  DATA_ISSUE: {
    id: 'data_issue',
    name: 'Data Retrieval Error',
    template: `🛠️ moony 🛠️

We had trouble getting data. We're looking into it.`,
    variables: []
  },
  
  INVALID_BUDGET: {
    id: 'invalid_budget',
    name: 'Invalid Budget Entry',
    template: `moony

I didn't understand that amount. Please reply with just a number (like 2000 or 3500).`,
    variables: []
  },

  PLAID_CONNECTION_ERROR: {
    id: 'plaid_connection_error',
    name: 'Bank Connection Error',
    template: `🔗 moony

We lost connection to your bank account. Please reconnect at {reconnectUrl} to resume your daily updates.`,
    variables: ['reconnectUrl']
  }
};

export const SUPPORT_TEMPLATE = {
  id: 'support',
  name: 'Support Information',
  template: `🙏 moony 🙏

For support email {supportEmail}.

To opt out, reply STOP.`,
  variables: ['supportEmail']
};

export const SYSTEM_TEMPLATES = {
  OPT_OUT_CONFIRMATION: {
    id: 'opt_out_confirmation',
    name: 'Opt Out Confirmation',
    template: 'moony\n\nYou\'ve been unsubscribed from daily spending updates.\n\nTo restart, text "START" anytime.',
    variables: []
  },

  OPT_IN_CONFIRMATION: {
    id: 'opt_in_confirmation',
    name: 'Opt In Confirmation',
    template: 'moony\n\nWelcome back! Your daily spending updates will resume tomorrow morning.\n\n💰 {currentMonthName} so far: ${currentSpending} of ${monthlyBudget}',
    variables: ['currentMonthName', 'currentSpending', 'monthlyBudget']
  }
};

export const ALL_TEMPLATES = {
  ...WELCOME_TEMPLATES,
  ...BUDGET_TEMPLATES,
  ...DAILY_TEMPLATES,
  ...ERROR_TEMPLATES,
  SUPPORT: SUPPORT_TEMPLATE,
  ...SYSTEM_TEMPLATES
} as const;