import { Router } from 'express';
import pool from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/responseFormatter';

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

export default router;