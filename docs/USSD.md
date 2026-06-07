# USSD

The USSD endpoint is designed for Africa's Talking callbacks.

```text
POST /api/ussd
Content-Type: application/x-www-form-urlencoded
```

Expected callback fields:

```text
sessionId
serviceCode
phoneNumber
text
```

The response uses Africa's Talking USSD prefixes:

```text
CON Continue session
END End session
```

## Current Menu

```text
1. My profile
2. Contributions
3. Loans
4. Fines
```

The first version is read-only. It looks up the member by callback phone number and returns summaries from the existing members, contributions, loans, and outstanding fines tables.

## Example Test

```bash
curl -X POST http://localhost:5000/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sessionId=test-1&serviceCode=*384*123%23&phoneNumber=+254700000000&text="
```

## Production Notes

- Register the public HTTPS callback URL in Africa's Talking.
- Keep money-moving actions out of USSD until PIN verification and audit requirements are designed.
- Normalize member phone numbers consistently during member registration.
