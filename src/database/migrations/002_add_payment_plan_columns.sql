-- ============================================
-- Migration: Add missing columns to payment_plans table
-- ============================================

-- Add paid_amount column
ALTER TABLE payment_plans
ADD COLUMN paid_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL;

-- Add remaining_amount column
ALTER TABLE payment_plans
ADD COLUMN remaining_amount DECIMAL(10, 2);

-- Add number_of_installments column
ALTER TABLE payment_plans
ADD COLUMN number_of_installments INTEGER;

-- Add start_date column
ALTER TABLE payment_plans
ADD COLUMN start_date DATE DEFAULT CURRENT_DATE;

-- Add constraint to ensure paid_amount is not negative
ALTER TABLE payment_plans
ADD CONSTRAINT check_paid_amount CHECK (paid_amount >= 0);

-- Add constraint to ensure remaining_amount is not negative
ALTER TABLE payment_plans
ADD CONSTRAINT check_remaining_amount CHECK (remaining_amount >= 0);

-- Update existing records to calculate remaining_amount
UPDATE payment_plans
SET remaining_amount = total_amount - paid_amount
WHERE remaining_amount IS NULL;

-- Make remaining_amount NOT NULL after updating existing records
ALTER TABLE payment_plans
ALTER COLUMN remaining_amount SET DEFAULT 0.00,
ALTER COLUMN remaining_amount SET NOT NULL;

-- Add index for faster queries
CREATE INDEX idx_payment_plans_status_type ON payment_plans(status, type);
