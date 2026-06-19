# TODO — Smart Finance & Savings System (SaccoOS)

## Step 1: Verify ledger correctness + find legacy balance writes

- [x] Inspect controllers/services for any direct balance updates (search for `balance +=`, `SET balance`, etc.)
- [ ] Identify money-moving endpoints and ensure each creates a `transactions` ledger entry

## Step 2: Harden multi-tenant enforcement

- [x] Inspect auth + RBAC middleware to confirm group context derivation
- [ ] Ensure every read/write includes `group_id` constraints
- [ ] Ensure groupId is derived from membership in JWT, not from untrusted client input

## Step 3: Implement code changes

- [ ] Refactor contribution/loan/repayment/fine flows to use ledger as source of truth
- [ ] Update statement/export/USSD to compute from ledger

## Step 4: Verification

- [ ] Run migrations
- [ ] Run server locally and execute manual workflow tests
- [ ] Add/adjust tests if applicable
