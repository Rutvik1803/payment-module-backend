# Payment Module Backend

Node.js/Express backend for educational payment processing system.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update the values with your configuration:
     - Database credentials
     - JWT secret
     - Cardknox API credentials
     - Email service credentials

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```

4. **Seed initial data (optional):**
   ```bash
   npm run seed
   ```

## Running the Application

**Development mode with auto-reload:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

- **GET** `/health` - Health check endpoint

## Project Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic
│   ├── models/         # Database models
│   ├── middleware/     # Express middleware
│   ├── config/         # Configuration files
│   ├── utils/          # Helper functions
│   ├── types/          # TypeScript type definitions
│   └── database/
│       ├── migrations/ # Database migration files
│       └── seeds/      # Database seed files
├── dist/               # Compiled JavaScript (generated)
└── node_modules/       # Dependencies (generated)
```

## Technologies

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email notifications
- **PDFKit** - PDF generation

## License

MIT
