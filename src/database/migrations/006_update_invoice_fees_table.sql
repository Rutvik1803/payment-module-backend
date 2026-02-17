-- Migration: Update invoice_fees table with additional fee types and is_active flag
-- This migration adds more fee types and soft delete support

DO $$
BEGIN
  -- Drop the existing check_fee_type constraint
  ALTER TABLE invoice_fees DROP CONSTRAINT IF EXISTS check_fee_type;
  
  -- Add the new constraint with expanded fee types
  ALTER TABLE invoice_fees ADD CONSTRAINT check_fee_type 
    CHECK (type IN ('LATE_FEE', 'PROCESSING_FEE', 'PENALTY', 'SERVICE_CHARGE', 'NSF_FEE', 'CUSTOM_FEE', 'OTHER'));
END $$;

-- Add is_active column for soft delete support
ALTER TABLE invoice_fees ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add updated_at timestamp
ALTER TABLE invoice_fees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index on is_active for filtering active fees
CREATE INDEX IF NOT EXISTS idx_invoice_fees_is_active ON invoice_fees(is_active);

-- Create composite index on invoice_id and is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_fees_invoice_active ON invoice_fees(invoice_id, is_active);

-- Add comments
COMMENT ON TABLE invoice_fees IS 'Additional fees that can be added to invoices (late fees, processing fees, etc.)';
COMMENT ON COLUMN invoice_fees.id IS 'Unique identifier for the invoice fee';
COMMENT ON COLUMN invoice_fees.invoice_id IS 'Reference to the invoice this fee belongs to';
COMMENT ON COLUMN invoice_fees.type IS 'Type of fee (LATE_FEE, PROCESSING_FEE, PENALTY, SERVICE_CHARGE, NSF_FEE, CUSTOM_FEE, OTHER)';
COMMENT ON COLUMN invoice_fees.amount IS 'Fee amount (must be positive)';
COMMENT ON COLUMN invoice_fees.description IS 'Optional description of the fee';
COMMENT ON COLUMN invoice_fees.is_active IS 'Soft delete flag - false means fee is deactivated';
COMMENT ON COLUMN invoice_fees.created_at IS 'Timestamp when fee was created';
COMMENT ON COLUMN invoice_fees.updated_at IS 'Timestamp when fee was last updated';
