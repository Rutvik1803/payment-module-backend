-- Migration: Update payment_schedules table with status and paid_date columns
-- Description: Add status tracking and paid date to payment schedules

-- Create payment_schedule_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_schedule_status AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column with default value
ALTER TABLE payment_schedules
ADD COLUMN IF NOT EXISTS status payment_schedule_status NOT NULL DEFAULT 'PENDING';

-- Add paid_date column (nullable - only set when payment is made)
ALTER TABLE payment_schedules
ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Add updated_at column for tracking changes
ALTER TABLE payment_schedules
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

-- Create composite index for common queries (payment_plan_id + status)
CREATE INDEX IF NOT EXISTS idx_payment_schedules_plan_status ON payment_schedules(payment_plan_id, status);

-- Create index for overdue detection (due_date + status)
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_status ON payment_schedules(due_date, status);

-- Add table comment
COMMENT ON TABLE payment_schedules IS 'Tracks individual installment schedules for payment plans';

-- Add column comments
COMMENT ON COLUMN payment_schedules.status IS 'Current status of the scheduled payment: PENDING, PAID, OVERDUE, CANCELLED';
COMMENT ON COLUMN payment_schedules.paid_date IS 'Date when the payment was actually made (NULL if not paid)';
COMMENT ON COLUMN payment_schedules.installment_number IS 'Sequential number of this installment in the payment plan (1, 2, 3, etc.)';
COMMENT ON COLUMN payment_schedules.amount IS 'Amount due for this installment';
COMMENT ON COLUMN payment_schedules.due_date IS 'Date when this installment payment is due';
COMMENT ON COLUMN payment_schedules.invoice_id IS 'Reference to the invoice generated for this scheduled payment';
COMMENT ON COLUMN payment_schedules.updated_at IS 'Timestamp of last update to this record';
