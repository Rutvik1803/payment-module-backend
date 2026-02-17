-- ============================================
-- Rollback Migration: Remove columns from payment_plans table
-- ============================================

-- Drop index
DROP INDEX IF EXISTS idx_payment_plans_status_type;

-- Drop constraints
ALTER TABLE payment_plans
DROP CONSTRAINT IF EXISTS check_paid_amount;

ALTER TABLE payment_plans
DROP CONSTRAINT IF EXISTS check_remaining_amount;

-- Drop columns
ALTER TABLE payment_plans
DROP COLUMN IF EXISTS start_date;

ALTER TABLE payment_plans
DROP COLUMN IF EXISTS number_of_installments;

ALTER TABLE payment_plans
DROP COLUMN IF EXISTS remaining_amount;

ALTER TABLE payment_plans
DROP COLUMN IF EXISTS paid_amount;
