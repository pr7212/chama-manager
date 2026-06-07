# Database

The app uses PostgreSQL, with Supabase supported through the session pooler connection string.

## Configuration

Set:

```text
DATABASE_URL=postgresql://...
```

On Windows, prefer the Supabase session pooler URI because the direct host is often IPv6-only.

## Migrations

Schema files live in:

```text
database/migrations/
```

Run:

```bash
npm run migrate
```

The migration runner applies `.sql` files in filename order and records completed files in `schema_migrations`.

## Current Tables

```text
users
members
contributions
loans
loan_payments
audit_logs
notifications
fines
fine_payments
outstanding_fines
schema_migrations
```

Do not add table creation logic to `backend/server.js`; keep schema changes in migrations.
