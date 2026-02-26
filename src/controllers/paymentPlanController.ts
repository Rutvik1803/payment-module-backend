import { Request, Response } from 'express';
import * as paymentPlanService from '../services/paymentPlanService';
import { sendSuccess, sendPaginated } from '../utils/responseFormatter';
import { CreatePaymentPlanDTO, PaymentPlanStatus } from '../types/paymentPlan';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { UserResponse } from '../types/user';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: UserResponse;
        }
    }
}

/**
 * Create a new payment plan with automatic schedule generation
 * POST /api/payment-plans
 * Access: Admin only
 */
export const createPaymentPlan = async (req: Request, res: Response) => {
    // Authorization: Admin only
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Only administrators can create payment plans');
    }

    // Validate required fields
    const { user_id, total_amount, type, number_of_installments, start_date } = req.body;

    if (!user_id || !total_amount || !type) {
        throw BadRequestError('user_id, total_amount, and type are required');
    }

    // Validate total_amount is a positive number
    if (typeof total_amount !== 'number' || total_amount <= 0) {
        throw BadRequestError('total_amount must be a positive number');
    }

    // Validate type
    if (!['ONE_TIME', 'INSTALLMENT'].includes(type)) {
        throw BadRequestError('type must be either ONE_TIME or INSTALLMENT');
    }

    const planData: CreatePaymentPlanDTO = {
        user_id,
        total_amount,
        type,
        number_of_installments,
        start_date: start_date ? new Date(start_date) : undefined,
    };

    const result = await paymentPlanService.createPaymentPlanWithSchedule(planData);

    sendSuccess(
        res,
        result,
        'Payment plan created successfully with schedules',
        201
    );
};

/**
 * Get payment plan by ID with schedules
 * GET /api/payment-plans/:id
 * Access: Admin or owner
 */
export const getPaymentPlanById = async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id as string);

    if (isNaN(planId)) {
        throw BadRequestError('Invalid payment plan ID');
    }

    const result = await paymentPlanService.getPaymentPlanWithSchedules(planId);

    // Authorization: Admin or owner only
    if (req.user?.role !== 'admin' && result.plan.user_id !== req.user?.id) {
        throw ForbiddenError('You do not have permission to view this payment plan');
    }

    sendSuccess(res, result, 'Payment plan retrieved successfully');
};

/**
 * Get all payment plans with pagination
 * GET /api/payment-plans?page=1&limit=10&status=ACTIVE&user_id=5
 * Access: Admin only
 */
export const getAllPaymentPlans = async (req: Request, res: Response) => {
    // Authorization: Admin only
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Only administrators can view all payment plans');
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as PaymentPlanStatus | undefined;
    const paymentType = req.query.type as 'ONE_TIME' | 'INSTALLMENT' | undefined;
    const searchTerm = req.query.search as string | undefined;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
        throw BadRequestError('Invalid pagination parameters. Page must be >= 1, limit must be 1-100');
    }

    // Get filtered payment plans from service
    const result = await paymentPlanService.getAllPaymentPlansWithPagination({
        page,
        limit,
        status,
        type: paymentType,
        searchTerm,
    });

    sendPaginated(res, result.items, result.total, result.page, result.limit);
};

/**
 * Get payment plans for a specific user
 * GET /api/payment-plans/user/:userId
 * Access: Admin or owner
 */
export const getUserPaymentPlans = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId as string);

    if (isNaN(userId)) {
        throw BadRequestError('Invalid user ID');
    }

    // Authorization: Admin or owner only
    if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        throw ForbiddenError('You can only view your own payment plans');
    }

    const plans = await paymentPlanService.getPaymentPlansByUser(userId);

    sendSuccess(res, { plans }, 'User payment plans retrieved successfully');
};

/**
 * Get payment plan summary with progress
 * GET /api/payment-plans/:id/summary
 * Access: Admin or owner
 */
export const getPaymentPlanSummary = async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id as string);

    if (isNaN(planId)) {
        throw BadRequestError('Invalid payment plan ID');
    }

    const summary = await paymentPlanService.getPaymentPlanSummary(planId);

    // Authorization: Admin or owner only
    if (req.user?.role !== 'admin' && summary.plan.user_id !== req.user?.id) {
        throw ForbiddenError('You do not have permission to view this payment plan');
    }

    sendSuccess(res, summary, 'Payment plan summary retrieved successfully');
};

/**
 * Update payment plan status
 * PATCH /api/payment-plans/:id/status
 * Access: Admin only
 */
export const updatePaymentPlanStatus = async (req: Request, res: Response) => {
    // Authorization: Admin only
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Only administrators can update payment plan status');
    }

    const planId = parseInt(req.params.id as string);
    const { status } = req.body;

    if (isNaN(planId)) {
        throw BadRequestError('Invalid payment plan ID');
    }

    if (!status) {
        throw BadRequestError('status is required');
    }

    // Validate status value
    if (!['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
        throw BadRequestError('status must be ACTIVE, COMPLETED, or CANCELLED');
    }

    const updatedPlan = await paymentPlanService.updatePaymentPlanStatus(planId, status);

    sendSuccess(res, { plan: updatedPlan }, 'Payment plan status updated successfully');
};

/**
 * Cancel payment plan
 * POST /api/payment-plans/:id/cancel
 * Access: Admin or owner (with restrictions)
 */
export const cancelPaymentPlan = async (req: Request, res: Response) => {
    const planId = parseInt(req.params.id as string);

    if (isNaN(planId)) {
        throw BadRequestError('Invalid payment plan ID');
    }

    // Get plan first for authorization check
    const { plan } = await paymentPlanService.getPaymentPlanWithSchedules(planId);

    // Authorization: Admin can cancel any plan, students can only cancel their own
    if (req.user?.role !== 'admin' && plan.user_id !== req.user?.id) {
        throw ForbiddenError('You can only cancel your own payment plans');
    }

    // Additional restriction: Students can only cancel plans with no paid installments
    if (req.user?.role === 'student') {
        const summary = await paymentPlanService.getPaymentPlanSummary(planId);
        if (summary.progress.paidInstallments > 0) {
            throw ForbiddenError('Cannot cancel payment plan with paid installments. Please contact an administrator.');
        }
    }

    const cancelledPlan = await paymentPlanService.cancelPaymentPlan(planId);

    sendSuccess(res, { plan: cancelledPlan }, 'Payment plan cancelled successfully');
};

/**
 * Delete payment plan (hard delete)
 * DELETE /api/payment-plans/:id
 * Access: Admin only
 */
export const deletePaymentPlan = async (req: Request, res: Response) => {
    // Authorization: Admin only
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Only administrators can delete payment plans');
    }

    const planId = parseInt(req.params.id as string);

    if (isNaN(planId)) {
        throw BadRequestError('Invalid payment plan ID');
    }

    await paymentPlanService.deletePaymentPlanWithSchedules(planId);

    sendSuccess(res, null, 'Payment plan deleted successfully');
};
