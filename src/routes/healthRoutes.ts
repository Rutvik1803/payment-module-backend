import { Router } from 'express';
import pool from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/responseFormatter';
import { authenticate } from '../middleware/auth';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
    sendSuccess(res, {
        status: 'OK',
        timestamp: new Date().toISOString(),
    }, 'Payment Module API is running');
});

// Database health check endpoint
router.get('/health/db', asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT NOW()');
    sendSuccess(res, {
        status: 'OK',
        timestamp: result.rows[0].now,
    }, 'Database connection successful');
}));

// Protected route for testing authentication
router.get('/health/auth', authenticate, asyncHandler(async (req, res) => {
    sendSuccess(res, {
        user: req.user,
        message: 'You are authenticated!',
    }, 'Auth test successful');
}));

export default router;