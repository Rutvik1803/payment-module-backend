# Test User Credentials

## Admin Account
- **Email:** admin@coursekey.com
- **Password:** admin123
- **Role:** admin
- **User ID:** 1

## Student Accounts

### Student 1
- **Email:** john.doe@example.com
- **Password:** student123
- **Role:** student
- **User ID:** 2
- **Name:** John Doe

### Student 2
- **Email:** jane.smith@example.com
- **Password:** student123
- **Role:** student
- **User ID:** 3
- **Name:** Jane Smith

### Student 3
- **Email:** bob.johnson@example.com
- **Password:** student123
- **Role:** student
- **User ID:** 4
- **Name:** Bob Johnson

## Password Hashes

For reference, the bcrypt password hashes used:

- **admin123:** `$2b$10$uafFGwfifHM4OaQhc2An4ee23TXIoTmztVsNyJmpNOBQgsPBpWTjq`
- **student123:** `$2b$10$fW6n9jX21JLElmw33ICLrO5B9rR6nmSN2v1NbHCGWdwxxVnZFyUNi`

## Usage

These credentials can be used for:
- Testing authentication endpoints
- Testing authorization (admin vs student roles)
- Creating payment plans and invoices
- Testing payment processing flows

## NPM Scripts

```bash
# Run seed data
npm run seed

# Reset database (run migrations + seeds)
npm run db:reset

# Generate new password hash
npm run generate-hash
```

## Notes

- ⚠️ **These credentials are for development/testing only**
- ⚠️ **DO NOT use these in production**
- All passwords are hashed using bcrypt with 10 salt rounds
- The seed script uses `ON CONFLICT DO NOTHING` to avoid duplicate insertions
