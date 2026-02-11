-- ============================================
-- Seed Data: Users
-- ============================================

-- Note: Passwords are hashed using bcrypt with 10 rounds
-- Plain text passwords for testing:
-- Admin: admin123
-- All Students: student123

-- Insert admin user
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'admin@coursekey.com',
  '$2b$10$uafFGwfifHM4OaQhc2An4ee23TXIoTmztVsNyJmpNOBQgsPBpWTjq',
  'Admin',
  'User',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert test student 1
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'john.doe@example.com',
  '$2b$10$fW6n9jX21JLElmw33ICLrO5B9rR6nmSN2v1NbHCGWdwxxVnZFyUNi',
  'John',
  'Doe',
  'student'
) ON CONFLICT (email) DO NOTHING;

-- Insert test student 2
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'jane.smith@example.com',
  '$2b$10$fW6n9jX21JLElmw33ICLrO5B9rR6nmSN2v1NbHCGWdwxxVnZFyUNi',
  'Jane',
  'Smith',
  'student'
) ON CONFLICT (email) DO NOTHING;

-- Insert test student 3
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'bob.johnson@example.com',
  '$2b$10$fW6n9jX21JLElmw33ICLrO5B9rR6nmSN2v1NbHCGWdwxxVnZFyUNi',
  'Bob',
  'Johnson',
  'student'
) ON CONFLICT (email) DO NOTHING;

-- Verify users were inserted
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role,
  created_at
FROM users
ORDER BY id;
