# Budgeting Agent - Database Models

## Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    plaid_access_token TEXT, -- encrypted
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    opt_out_status VARCHAR(20) DEFAULT 'opted_in', -- 'opted_in', 'opted_out'
    is_active BOOLEAN DEFAULT true,
    phone_verified BOOLEAN DEFAULT false,
    currency VARCHAR(3) DEFAULT 'USD', -- ISO currency codes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Spending Goals Table
```sql
CREATE TABLE spending_goals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    monthly_limit DECIMAL(10,2) NOT NULL,
    month_start_day INTEGER CHECK (month_start_day >= 1 AND month_start_day <= 28),
    period_start DATE NOT NULL, -- e.g., '2025-01-15'
    period_end DATE NOT NULL,   -- e.g., '2025-02-14'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Daily Messages Table
```sql
CREATE TABLE daily_messages (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    spending_goal_id UUID REFERENCES spending_goals(id) ON DELETE CASCADE,
    message_date DATE NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- 'daily', 'data_issue', 'month_end_under', 'month_end_over', 'setup'
    
    -- Message data (JSONB for flexibility)
    message_data JSONB NOT NULL,
    
    -- Delivery tracking
    sent_at TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    twilio_message_sid VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Daily Messages Table
```sql
CREATE TABLE user_spending_analytics (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    average_monthly_spending DECIMAL(10,2),
    last_month_spending DECIMAL(10,2),
    current_month_spending DECIMAL(10,2) DEFAULT 0,
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Recurring Expenses Table
```sql
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    merchant_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50),
    frequency VARCHAR(20) NOT NULL, -- 'MONTHLY', 'WEEKLY', etc.
    last_occurrence_date DATE,
    predicted_next_date DATE,
    is_active BOOLEAN DEFAULT true,
    confidence_score DECIMAL(3,2), -- 0.00-1.00 for prediction reliability
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
