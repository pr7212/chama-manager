# Chama Manager

A Chama (savings group) management system built with Node.js, Express, and PostgreSQL/Supabase.

## Features

- JWT authentication and role-based authorization
- Member, contribution, loan, repayment, fine, and notification workflows
- Audit logging
- PDF member statements
- CSV/XLSX exports
- PostgreSQL/Supabase connection pooling
- Transaction handling for money-moving operations
- Security headers, CORS, request limits, and validation layers

## Project Structure

```text
chama-manager/
  backend/
    config/
    controllers/
    middleware/
    routes/
    services/
    utils/
    validators/
    server.js
  frontend/
    public/
    css/
    js/
  database/
    migrations/
  scripts/
```

## Setup

```bash
npm install
```

Create `.env` from `.env.example`, then set `DATABASE_URL`, `JWT_SECRET`, and any optional SMS credentials.

Run database migrations:

```bash
npm run migrate
```

Start the app:

```bash
npm run dev
```

The API runs at `http://localhost:5000/api`. By default the backend also serves the existing HTML frontend from `frontend/`; set `SERVE_FRONTEND=false` when deploying the frontend separately.

## Useful Scripts

- `npm run dev` - start the backend with Nodemon
- `npm start` - start the backend with Node
- `npm run migrate` - apply SQL migrations in `database/migrations`
- `npm run promote-admin -- <phone>` - promote a user to admin by phone

## Notes

- Do not commit `.env`.
- Use the Supabase session pooler connection string on Windows.
- Run migrations before starting a new database-backed environment.
