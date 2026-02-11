-- Rollback for initial schema migration

-- Drop views
DROP VIEW IF EXISTS v_payment_plan_summary;
DROP VIEW IF EXISTS v_outstanding_invoices;

-- Drop triggers
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_payment_plans_updated_at ON payment_plans;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS invoice_fees;
DROP TABLE IF EXISTS payment_schedules;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payment_plans;
DROP TABLE IF EXISTS users;

-- Drop extensions
DROP EXTENSION IF EXISTS "uuid-ossp";
