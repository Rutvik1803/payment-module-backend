-- ============================================
-- Payment Module Database Schema
-- Initial Migration
-- ============================================

-- Enable UUID extension (if needed in future)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_role CHECK (role IN ('admin', 'student'))
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: payment_plans
-- ============================================
CREATE TABLE payment_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT check_type CHECK (type IN ('ONE_TIME', 'INSTALLMENT')),
  CONSTRAINT check_amount CHECK (total_amount > 0)
);

-- Indexes for payment_plans table
CREATE INDEX idx_payment_plans_user_id ON payment_plans(user_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);

-- ============================================
-- TABLE: invoices
-- ============================================
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_plan_id INTEGER REFERENCES payment_plans(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'DUE',
  due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_invoice_status CHECK (status IN ('UPCOMING', 'DUE', 'OUTSTANDING', 'PARTIAL', 'PAID')),
  CONSTRAINT check_invoice_amount CHECK (amount > 0),
  CONSTRAINT check_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= amount)
);

-- Indexes for invoices table
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_payment_plan_id ON invoices(payment_plan_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================
-- TABLE: payment_schedules
-- ============================================
CREATE TABLE payment_schedules (
  id SERIAL PRIMARY KEY,
  payment_plan_id INTEGER NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_schedule_amount CHECK (amount > 0),
  CONSTRAINT check_installment_number CHECK (installment_number > 0)
);

-- Indexes for payment_schedules table
CREATE INDEX idx_payment_schedules_payment_plan_id ON payment_schedules(payment_plan_id);
CREATE INDEX idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX idx_payment_schedules_invoice_id ON payment_schedules(invoice_id);

-- ============================================
-- TABLE: invoice_fees
-- ============================================
CREATE TABLE invoice_fees (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_fee_type CHECK (type IN ('LATE_FEE', 'NSF_FEE', 'CUSTOM_FEE')),
  CONSTRAINT check_fee_amount CHECK (amount > 0)
);

-- Indexes for invoice_fees table
CREATE INDEX idx_invoice_fees_invoice_id ON invoice_fees(invoice_id);

-- ============================================
-- TABLE: payment_methods
-- ============================================
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL,
  last_four VARCHAR(4) NOT NULL,
  card_brand VARCHAR(20),
  token TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_payment_type CHECK (type IN ('card', 'ach'))
);

-- Indexes for payment_methods table
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(user_id, is_default);

-- ============================================
-- TABLE: transactions
-- ============================================
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
  gateway_transaction_id VARCHAR(255),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_transaction_status CHECK (status IN ('PROCESSING', 'PAID', 'DECLINED', 'FAILED', 'REFUNDED')),
  CONSTRAINT check_transaction_amount CHECK (amount > 0)
);

-- Indexes for transactions table
CREATE INDEX idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX idx_transactions_payment_method_id ON transactions(payment_method_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_gateway_transaction_id ON transactions(gateway_transaction_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS (for common queries)
-- ============================================

-- View for outstanding invoices
CREATE VIEW v_outstanding_invoices AS
SELECT 
  i.*,
  u.first_name,
  u.last_name,
  u.email,
  (i.amount - i.paid_amount) as remaining_amount
FROM invoices i
JOIN users u ON i.user_id = u.id
WHERE i.status IN ('DUE', 'OUTSTANDING', 'PARTIAL');

-- View for payment plan summary
CREATE VIEW v_payment_plan_summary AS
SELECT 
  pp.*,
  u.first_name,
  u.last_name,
  u.email,
  COUNT(DISTINCT i.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'PAID' THEN i.id END) as paid_invoices,
  SUM(CASE WHEN i.status = 'PAID' THEN i.paid_amount ELSE 0 END) as total_paid
FROM payment_plans pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN invoices i ON i.payment_plan_id = pp.id
GROUP BY pp.id, u.id;
