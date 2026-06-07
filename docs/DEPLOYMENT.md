# Deployment

## Environment Variables

Required:

```text
DATABASE_URL
JWT_SECRET
```

Optional:

```text
PORT
CLIENT_URL
SERVE_FRONTEND
SUPABASE_URL
SUPABASE_ANON_KEY
AFRICASTALKING_API_KEY
AFRICASTALKING_USERNAME
AFRICASTALKING_SHORTCODE
```

Startup validates required environment variables and fails fast if any are missing.

## Install

The repository uses npm workspaces:

```bash
npm install
```

Backend-only install is also possible:

```bash
cd backend
npm install
```

## Database

Before serving a fresh environment, run:

```bash
npm run migrate
```

## Local Runtime

```bash
npm run dev
```

The backend serves the static frontend by default. Set `SERVE_FRONTEND=false` when hosting the frontend separately.

## Vercel

`vercel.json` points requests to:

```text
backend/server.js
```

Configure environment variables in the Vercel project dashboard before deployment.
