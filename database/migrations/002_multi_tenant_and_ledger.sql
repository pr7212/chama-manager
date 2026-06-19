-- 1. Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default group to migrate existing data smoothly
INSERT INTO groups (id, name) VALUES (1, 'Default Chama') ON CONFLICT DO NOTHING;

-- 2. Add group_id to all isolation-needed tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE members ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE fines ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE fine_payments ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;
ALTER TABLE outstanding_fines ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) DEFAULT 1;

-- 3. Create transactions ledger table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL, -- positive for credits (inflow), negative for debits (outflow)
  type VARCHAR(50) NOT NULL,     -- 'contribution', 'loan_disbursement', 'loan_repayment', 'fine_payment'
  reference_id INTEGER,          -- references contribution_id, loan_id, etc.
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Populate transactions from existing records to synchronize initial state
-- Contributions (Credit / Inflow)
INSERT INTO transactions (group_id, member_id, amount, type, reference_id, created_by, created_at)
SELECT group_id, member_id, amount, 'contribution', id, recorded_by, created_at
FROM contributions
ON CONFLICT DO NOTHING;

-- Loans (Debit / Outflow)
INSERT INTO transactions (group_id, member_id, amount, type, reference_id, created_by, created_at)
SELECT group_id, member_id, -amount, 'loan_disbursement', id, created_by, created_at
FROM loans
ON CONFLICT DO NOTHING;

-- Loan payments (Credit / Inflow)
INSERT INTO transactions (group_id, member_id, amount, type, reference_id, created_by, created_at)
SELECT lp.group_id, l.member_id, lp.amount, 'loan_repayment', lp.id, lp.recorded_by, lp.created_at
FROM loan_payments lp
JOIN loans l ON lp.loan_id = l.id
ON CONFLICT DO NOTHING;

-- Fine payments (Credit / Inflow)
INSERT INTO transactions (group_id, member_id, amount, type, reference_id, created_by, created_at)
SELECT group_id, member_id, amount, 'fine_payment', id, recorded_by, created_at
FROM fine_payments
ON CONFLICT DO NOTHING;
