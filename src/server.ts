import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import paymentPlanRoutes from './routes/paymentPlanRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import pool from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment-plans', paymentPlanRoutes);
app.use('/api/invoices', invoiceRoutes);

// 404 Handler (must be after all routes)
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
