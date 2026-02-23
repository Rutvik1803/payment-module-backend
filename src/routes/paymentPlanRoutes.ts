import { Router } from 'express';
import * as paymentPlanController from '../controllers/paymentPlanController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Payment Plan Routes
 * Base path: /api/payment-plans
 * All routes require authentication
 */

// Create payment plan
// POST /api/payment-plans
router.post(
    '/',
    authenticate,
    asyncHandler(paymentPlanController.createPaymentPlan)
);

// Get all payment plans with pagination and filters
// GET /api/payment-plans?page=1&limit=10&status=ACTIVE&user_id=5
router.get(
    '/',
    authenticate,
    asyncHandler(paymentPlanController.getAllPaymentPlans)
);

// Get payment plans for a specific user
// GET /api/payment-plans/user/:userId
// Note: Must come before /:id to avoid route conflict
router.get(
    '/user/:userId',
    authenticate,
    asyncHandler(paymentPlanController.getUserPaymentPlans)
);

// Get payment plan summary with progress
// GET /api/payment-plans/:id/summary
// Note: Specific subpath must come before generic /:id
router.get(
    '/:id/summary',
    authenticate,
    asyncHandler(paymentPlanController.getPaymentPlanSummary)
);

// Get payment plan by ID with schedules
// GET /api/payment-plans/:id
router.get(
    '/:id',
    authenticate,
    asyncHandler(paymentPlanController.getPaymentPlanById)
);

// Update payment plan status
// PATCH /api/payment-plans/:id/status
router.patch(
    '/:id/status',
    authenticate,
    asyncHandler(paymentPlanController.updatePaymentPlanStatus)
);

// Cancel payment plan
// POST /api/payment-plans/:id/cancel
router.post(
    '/:id/cancel',
    authenticate,
    asyncHandler(paymentPlanController.cancelPaymentPlan)
);

// Delete payment plan (hard delete)
// DELETE /api/payment-plans/:id
router.delete(
    '/:id',
    authenticate,
    asyncHandler(paymentPlanController.deletePaymentPlan)
);

export default router;
