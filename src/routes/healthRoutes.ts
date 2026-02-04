import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        message: 'Payment Module API is running',
        timestamp: new Date().toISOString(),
    });
});

// Database health check endpoint
router.get('/health/db', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            message: 'Database connection successful',
            timestamp: result.rows[0].now,
        });
    } catch (error) {
        console.error('Database health check failed:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;