# API

Base URL:

```text
http://localhost:5000/api
```

Most application endpoints require:

```text
Authorization: Bearer <jwt>
```

## Public Endpoints

```text
GET  /api
POST /api/auth/register
POST /api/auth/login
POST /api/ussd
```

## Protected Endpoints

```text
GET  /api/dashboard
GET  /api/members
POST /api/members
GET  /api/contributions
POST /api/contributions
GET  /api/loans
POST /api/loans
POST /api/loans/payment
GET  /api/loans/:id/payments
GET  /api/statements/:id
GET  /api/statements/:id/pdf
GET  /api/notifications
PATCH /api/notifications/:id/read
GET  /api/fines
POST /api/fines
POST /api/fines/assign
POST /api/fines/pay
GET  /api/fines/outstanding/:memberId
GET  /api/exports/contributions
GET  /api/exports/loans
```

Admin-only actions are enforced through role middleware.
