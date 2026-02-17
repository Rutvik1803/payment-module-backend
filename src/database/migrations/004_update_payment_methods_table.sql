-- Migration: Add missing columns to payment_methods table
-- Date: 2026-02-17

-- Add missing columns
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS expiry_month INTEGER;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS expiry_year INTEGER;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS billing_zip VARCHAR(10);
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Update type constraint to match new enum values
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS check_payment_type;
ALTER TABLE payment_methods ADD CONSTRAINT check_payment_type 
  CHECK (type IN ('CARD', 'ACH', 'CASH', 'CHECK'));

-- Rename 'type' column to 'payment_method_type' for clarity
ALTER TABLE payment_methods RENAME COLUMN type TO payment_method_type;

-- Add constraints for expiry dates
ALTER TABLE payment_methods ADD CONSTRAINT check_expiry_month 
  CHECK (expiry_month IS NULL OR (expiry_month >= 1 AND expiry_month <= 12));

ALTER TABLE payment_methods ADD CONSTRAINT check_expiry_year 
  CHECK (expiry_year IS NULL OR expiry_year >= 2020);

-- Create index for active payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(user_id, is_active);

-- Comment on table and columns
COMMENT ON TABLE payment_methods IS 'Stores tokenized payment methods for users (cards, ACH, etc.)';
COMMENT ON COLUMN payment_methods.payment_method_type IS 'Type of payment method: CARD, ACH, CASH, or CHECK';
COMMENT ON COLUMN payment_methods.token IS 'Tokenized payment method from gateway (never store raw card numbers)';
COMMENT ON COLUMN payment_methods.last_four IS 'Last 4 digits for display purposes only';
COMMENT ON COLUMN payment_methods.card_brand IS 'Card brand (VISA, MASTERCARD, etc.) - NULL for non-card methods';
COMMENT ON COLUMN payment_methods.expiry_month IS 'Card expiry month (1-12) - NULL for non-card methods';
COMMENT ON COLUMN payment_methods.expiry_year IS 'Card expiry year (YYYY) - NULL for non-card methods';
COMMENT ON COLUMN payment_methods.billing_zip IS 'Billing ZIP code for AVS verification';
COMMENT ON COLUMN payment_methods.is_default IS 'Whether this is the user default payment method';
COMMENT ON COLUMN payment_methods.is_active IS 'Whether this payment method is active (soft delete flag)';
