# Railway Deployment with Migrations

This guide ensures migrations run before the app starts, so deployments stay stable when schema changes are merged.

## How It Works

1. **`db:migrate:deploy`** – Runs `prisma migrate deploy` (production-safe: applies pending migrations only, no-op if up to date).
2. **API and Scheduler** – Both run `db:migrate:deploy` before starting. Whichever starts first applies the migration; the other sees it’s already applied and exits quickly.

## Railway Configuration

### Services that use the database

For **API** and **Scheduler** services (production and staging):

- **Build command:** `npm run build` (or leave default; build runs `prisma generate`)
- **Start command:**
  - **Production:** `npm run api:start:production` / `npm run scheduler:start:production`
  - **Staging:** `npm run api:start:staging` / `npm run scheduler:start:staging`

These start commands run migrations before the app in both environments.

### Environment variables

- **`DATABASE_URL`** – Required; comes from linking the Postgres service.
- **`NODE_ENV`** – Set to `production` or `staging` depending on the environment (Railway usually sets this per service).

### Frontend

The web app does not use the database. No migration changes are needed.

## Deployment order

Railway deploys services in parallel. Both API and Scheduler run migrations on startup, so order does not matter. `prisma migrate deploy` is safe when run from multiple processes.

## Rollback

If a deployment fails:

1. Use Railway’s rollback to revert to the previous deploy.
2. **Migrations:** Prisma migrations are generally additive (e.g. adding columns). Rolling back code does not undo migrations. If you need to undo a migration, do it manually and create a new migration.

## Pre-merge checklist

Before merging to `main`:

- [ ] Run `npm run db:migrate` locally so migrations are applied and committed.
- [ ] Ensure `DATABASE_URL` is set in Railway for all services that use the DB (production and staging).
- [ ] Staging deploys will run migrations automatically on startup, same as production.
