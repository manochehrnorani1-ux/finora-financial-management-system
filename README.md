# FINORA

FINORA is a multilingual financial and administrative management system for organizations in Afghanistan.

## Stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Drizzle ORM
- Supabase PostgreSQL
- Tailwind CSS

## Languages

- فارسی
- پښتو
- English

## Database

The application uses a server-side PostgreSQL connection through `DATABASE_URL`.

For Supabase, configure the connection string in the deployment environment. Never expose database credentials in `NEXT_PUBLIC_*` variables.

The application schema is defined in `src/db/schema.ts`.

## First run

The application performs an idempotent bootstrap from the authentication entry point. It creates system permissions and roles, a production organization, a clearly marked demo organization, chart of accounts, tax catalog, and demo data.

First-run bootstrap administrator:

- Email: `admin@finora.af`
- Password: configured through `FINORA_INIT_KEY`

Set this value before the first application login. The application does not ship with a production default password.

## Main modules

Dashboard, Customers, Services, Cases, Documents, Contracts, Income, Expenses, Cash, Bank, Transactions, Accounting, Customer Accounts, Tax Engine, Tax Settlements, Official Forms, Generated Forms, Letters, Compliance, Reports, Users, Audit, Backup, and Public Website.

## User Guide

For day-to-day operation, workflow order, tax settlement, official forms, troubleshooting, footer contact numbers, security rules, and the standard problem-reporting procedure, read:

**[FINORA Operational User Guide](docs/USER-GUIDE.md)**

## Development

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL`.
3. Run `npm install`.
4. Run `npm run typecheck`.
5. Run `npm run lint`.
6. Run `npm run build`.
7. Run `npm run dev`.

The application database is accessed server-side. If browser access through the Supabase Data API is added later, expose only required tables and pair that access with appropriate RLS policies.
