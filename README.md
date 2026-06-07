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
  docs/
```

## Setup

```bash
npm install
```

The root project uses npm workspaces. Backend dependencies live in `backend/package.json`; the static frontend has its own `frontend/package.json`.

Create `.env` from `.env.example`, then set `DATABASE_URL`, `JWT_SECRET`, and any optional Africa's Talking credentials.

Run database migrations:

```bash
npm run migrate
```

Start the app:

```bash
npm run dev
```

The API runs at `http://localhost:5000/api`. By default the backend also serves the existing HTML frontend from `frontend/`; set `SERVE_FRONTEND=false` when deploying the frontend separately.

Africa's Talking USSD callbacks should point to:

```text
POST /api/ussd
```

## Useful Scripts

- `npm run dev` - start the backend with Nodemon
- `npm start` - start the backend with Node
- `npm run migrate` - apply SQL migrations in `database/migrations`
- `npm run promote-admin -- <phone>` - promote a user to admin by phone
- `npm test` - run workspace checks

## Notes

- Do not commit `.env`.
- Use the Supabase session pooler connection string on Windows.
- Run migrations before starting a new database-backed environment.
- See `docs/API.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md`, and `docs/USSD.md` for operational details.
