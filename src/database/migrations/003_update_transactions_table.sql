-- Migration: Add missing columns to transactions table
-- Date: 2026-02-17

-- Add missing columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_plan_id INTEGER REFERENCES payment_plans(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'PAYMENT';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CARD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gateway_response JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update status constraint to match new values
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_status;
ALTER TABLE transactions ADD CONSTRAINT check_transaction_status 
  CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'));

-- Add type constraint
ALTER TABLE transactions ADD CONSTRAINT check_transaction_type 
  CHECK (type IN ('PAYMENT', 'REFUND'));

-- Add payment method constraint
ALTER TABLE transactions ADD CONSTRAINT check_payment_method 
  CHECK (payment_method IN ('CARD', 'ACH', 'CASH', 'CHECK'));

-- Make invoice_id nullable (some transactions may not be tied to invoices)
ALTER TABLE transactions ALTER COLUMN invoice_id DROP NOT NULL;

-- Update default status to PENDING
ALTER TABLE transactions ALTER COLUMN status SET DEFAULT 'PENDING';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_plan_id ON transactions(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);

-- Remove old columns that are no longer needed
ALTER TABLE transactions DROP COLUMN IF EXISTS payment_method_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS error_message;
ALTER TABLE transactions DROP COLUMN IF EXISTS processed_at;

-- Comment on table
COMMENT ON TABLE transactions IS 'Stores all payment transactions including payments and refunds';
COMMENT ON COLUMN transactions.type IS 'Type of transaction: PAYMENT or REFUND';
COMMENT ON COLUMN transactions.payment_method IS 'Payment method used: CARD, ACH, CASH, or CHECK';
COMMENT ON COLUMN transactions.gateway_response IS 'JSON response from payment gateway';
COMMENT ON COLUMN transactions.notes IS 'Additional notes or comments about the transaction';
