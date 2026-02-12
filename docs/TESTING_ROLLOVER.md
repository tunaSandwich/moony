# Testing Budget Period Rollover

This guide covers how to verify the automatic month/period rollover and monthly summary SMS features.

## Prerequisites

1. **Run the migration** (adds `source` column to `spending_goals`):

   ```bash
   npm run db:migrate
   ```

2. **Regenerate Prisma client** (if needed):

   ```bash
   npm run build
   ```

## 1. Rollover Service

The rollover service deactivates expired goals and creates new ones for the current month.

### Quick test

```bash
npm run test:rollover
```

### Setup test data

To trigger a rollover, you need at least one user with an **active goal whose `periodEnd` is in the past**. Easiest approach:

**Option A: Use Prisma Studio**

```bash
npm run db:studio
```

1. Open `spending_goals`
2. Find an active goal (`isActive: true`)
3. Set `periodEnd` to yesterday (e.g. `2025-02-09` if today is 2025-02-10)

**Option B: SQL**

```sql
UPDATE spending_goals
SET period_end = CURRENT_DATE - INTERVAL '1 day'
WHERE is_active = true
LIMIT 1;
```

### Verify

After running `npm run test:rollover`:

- Old goal: `isActive` should be `false`
- New goal: `isActive` = `true`, `source` = `'rollover'`, `periodStart`/`periodEnd` = current month

## 2. Monthly Summary SMS

The monthly summary runs only on the **last day of each month** at 7 PM (or `MONTHLY_SMS_TIME`).

### Quick test

```bash
npm run test:monthly-summary
```

**Note:** This script returns early with a message if today is not the last day of the month. To test on other days, temporarily comment out the `isLastDayOfMonth` check in `monthlySmsService.ts` (around line 72).

### Verify

- Users with active goals ending today receive a summary SMS
- Message includes "Reply with your new goal or we'll keep it at $X"
- Check logs for `[MonthlySmsService] Monthly summary sent`

## 3. Scheduler Jobs

The scheduler runs four jobs:

| Job           | Schedule             | Purpose                         |
|---------------|----------------------|---------------------------------|
| Daily SMS     | `DAILY_SMS_TIME`     | Morning spending updates        |
| Rollover      | 30 min before daily  | Roll over expired periods       |
| Monthly       | Last day, 7 PM       | End-of-month summaries          |
| Webhook       | Every minute         | Plaid webhook fallback          |

### Manual daily job trigger

```bash
# Start API server first, then:
npm run send-sms:local
```

This hits `POST /api/run-now` and triggers the daily SMS job.

### Verify scheduler startup

```bash
npm run scheduler:start
```

Check logs for:

- `[Scheduler] Scheduling jobs` with `dailyCron`, `rolloverCron`, `monthlyTime`
- All four cron tasks registered

## 4. End-to-End Flow

1. **Last day of month, 7 PM:** Monthly summary SMS sent
2. **Next day, 7:30 AM (or 30 min before daily):** Rollover runs, creates new goals with `source: 'rollover'`
3. **8:00 AM:** Daily SMS runs with fresh period targets
4. **User replies with new budget:** Webhook creates new goal with `source: 'user'` (default)

### Late reply handling

If a user replies *after* rollover (e.g. Jan 3rd) with a new budget, the existing webhook handlers:

- Deactivate the rolled-over goal
- Create a new goal for the current month with the user's amount
- No special handling needed

## 5. Environment Variables

| Variable         | Default  | Description                    |
|------------------|----------|--------------------------------|
| `DAILY_SMS_TIME` | `08:00`  | Daily SMS time (HH:mm)         |
| `MONTHLY_SMS_TIME` | `19:00` | Monthly summary time (HH:mm)   |
| `TZ`             | system   | Timezone for cron jobs         |
| `SCHEDULER_ENABLED` | `true` | Enable/disable all scheduler jobs |

## 6. Troubleshooting

| Issue                    | Check                                                    |
|--------------------------|----------------------------------------------------------|
| Rollover finds 0 goals   | Ensure goals have `periodEnd < today` and `isActive: true` |
| Monthly sends 0          | Verify today is last day of month; users have goals ending today |
| Linter error on `source` | Run `npm run build` to regenerate Prisma client          |
| Migration fails          | Ensure database is running; check `DATABASE_URL`         |
