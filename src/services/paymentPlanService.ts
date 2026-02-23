/**
 * Payment Plan Service
 * 
 * Handles business logic for payment plan operations including:
 * - Payment plan creation with validation
 * - Installment calculation
 * - Payment schedule generation
 * - Status management
 */

import {
    createPaymentPlan,
    findPaymentPlanById,
    findPaymentPlansByUserId,
    updatePaymentPlan,
    hardDeletePaymentPlan,
} from '../models/PaymentPlan';
import {
    createPaymentSchedules,
    findPaymentSchedulesByPlanId,
    deletePaymentSchedule,
} from '../models/PaymentSchedule';
import { findUserById } from '../models/User';
import {
    PaymentPlan,
    CreatePaymentPlanDTO,
    PaymentPlanStatus,
    PaymentPlanType,
} from '../types/paymentPlan';
import { CreatePaymentScheduleDTO, PaymentSchedule } from '../types/paymentSchedule';
import {
    BadRequestError,
    NotFoundError,
    ValidationError,
    InternalServerError,
} from '../utils/errors';
import {
    calculateEqualInstallments,
    calculateMonthlyDueDates,
    validatePaymentPlanParams,
    validateStartDate,
} from '../utils/paymentCalculations';

/**
 * Payment plan with schedules
 */
export interface PaymentPlanWithSchedules {
    plan: PaymentPlan;
    schedules: PaymentSchedule[];
}

/**
 * Payment plan summary with progress
 */
export interface PaymentPlanSummary {
    plan: PaymentPlan;
    progress: {
        totalInstallments: number;
        paidInstallments: number;
        pendingInstallments: number;
        overdueInstallments: number;
        percentageComplete: number;
    };
    schedules: PaymentSchedule[];
}

/**
 * Create a new payment plan with automatic schedule generation
 */
export const createPaymentPlanWithSchedule = async (
    data: CreatePaymentPlanDTO
): Promise<PaymentPlanWithSchedules> => {
    const {
        user_id,
        total_amount,
        type,
        number_of_installments,
        start_date = new Date(),
    } = data;

    // Step 1: Validate user exists
    const user = await findUserById(user_id);
    if (!user) {
        throw NotFoundError(`User with ID ${user_id} not found`);
    }

    // Step 2: Set default installments based on type
    let installments = number_of_installments || 1;
    if (type === 'ONE_TIME') {
        installments = 1;
    } else if (type === 'INSTALLMENT' && !number_of_installments) {
        throw BadRequestError('Number of installments is required for INSTALLMENT type');
    }

    // Step 3: Validate payment plan parameters
    const validation = validatePaymentPlanParams(total_amount, installments, type);
    if (!validation.valid) {
        const errors: Record<string, string[]> = {};
        validation.errors.forEach((error, index) => {
            errors[`validation_${index}`] = [error];
        });
        throw ValidationError(errors);
    }

    // Step 4: Validate start date
    const dateValidation = validateStartDate(start_date, true);
    if (!dateValidation.valid) {
        throw BadRequestError(dateValidation.error || 'Invalid start date');
    }

    // Step 5: Create payment plan
    const plan = await createPaymentPlan({
        user_id,
        total_amount,
        type,
        number_of_installments: installments,
        start_date,
    });

    // Step 6: Generate payment schedules
    const schedules = await generatePaymentSchedules(
        plan.id,
        total_amount,
        installments,
        start_date
    );

    return {
        plan,
        schedules,
    };
};

/**
 * Generate payment schedules for a payment plan
 */
const generatePaymentSchedules = async (
    paymentPlanId: number,
    totalAmount: number,
    numberOfInstallments: number,
    startDate: Date
): Promise<PaymentSchedule[]> => {
    // Calculate installment amounts
    const installmentAmounts = calculateEqualInstallments(totalAmount, numberOfInstallments);

    // Calculate due dates (monthly intervals)
    const dueDates = calculateMonthlyDueDates(startDate, numberOfInstallments);

    // Prepare schedule data
    const scheduleData: CreatePaymentScheduleDTO[] = installmentAmounts.map((amount, index) => ({
        payment_plan_id: paymentPlanId,
        installment_number: index + 1,
        amount,
        due_date: dueDates[index],
        status: 'PENDING',
    }));

    // Bulk create schedules in a transaction
    const schedules = await createPaymentSchedules(scheduleData);

    return schedules;
};

/**
 * Get payment plan by ID with schedules
 */
export const getPaymentPlanWithSchedules = async (
    planId: number
): Promise<PaymentPlanWithSchedules> => {
    const plan = await findPaymentPlanById(planId);
    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${planId} not found`);
    }

    const schedules = await findPaymentSchedulesByPlanId(planId);

    return {
        plan,
        schedules,
    };
};

/**
 * Get payment plans by user
 */
export const getPaymentPlansByUser = async (
    userId: number
): Promise<PaymentPlan[]> => {
    const user = await findUserById(userId);
    if (!user) {
        throw NotFoundError(`User with ID ${userId} not found`);
    }

    const plans = await findPaymentPlansByUserId(userId);
    return plans;
};

/**
 * Get payment plan summary with progress
 */
export const getPaymentPlanSummary = async (
    planId: number
): Promise<PaymentPlanSummary> => {
    const { plan, schedules } = await getPaymentPlanWithSchedules(planId);

    // Calculate progress
    const totalInstallments = schedules.length;
    const paidInstallments = schedules.filter((s) => s.status === 'PAID').length;
    const pendingInstallments = schedules.filter((s) => s.status === 'PENDING').length;

    // Check for overdue installments
    const now = new Date();
    const overdueInstallments = schedules.filter(
        (s) => s.status === 'PENDING' && new Date(s.due_date) < now
    ).length;

    const percentageComplete =
        totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0;

    return {
        plan,
        progress: {
            totalInstallments,
            paidInstallments,
            pendingInstallments,
            overdueInstallments,
            percentageComplete,
        },
        schedules,
    };
};

/**
 * Update payment plan status
 */
export const updatePaymentPlanStatus = async (
    planId: number,
    status: PaymentPlanStatus
): Promise<PaymentPlan> => {
    const plan = await findPaymentPlanById(planId);
    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${planId} not found`);
    }

    // Validate status transition
    if (plan.status === 'COMPLETED' && status !== 'COMPLETED') {
        throw BadRequestError('Cannot change status of a completed payment plan');
    }

    if (plan.status === 'CANCELLED' && status !== 'CANCELLED') {
        throw BadRequestError('Cannot change status of a cancelled payment plan');
    }

    const updatedPlan = await updatePaymentPlan(planId, { status });
    if (!updatedPlan) {
        throw InternalServerError('Failed to update payment plan status');
    }
    return updatedPlan;
};

/**
 * Cancel payment plan
 */
export const cancelPaymentPlan = async (planId: number): Promise<PaymentPlan> => {
    const plan = await findPaymentPlanById(planId);
    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${planId} not found`);
    }

    if (plan.status === 'COMPLETED') {
        throw BadRequestError('Cannot cancel a completed payment plan');
    }

    if (plan.status === 'CANCELLED') {
        throw BadRequestError('Payment plan is already cancelled');
    }

    // Update plan status to CANCELLED
    const updatedPlan = await updatePaymentPlan(planId, { status: 'CANCELLED' });
    if (!updatedPlan) {
        throw InternalServerError('Failed to cancel payment plan');
    }

    // Note: We don't delete schedules, just mark plan as cancelled
    // This preserves history

    return updatedPlan;
};

/**
 * Delete payment plan (hard delete - use with caution)
 */
export const deletePaymentPlanWithSchedules = async (
    planId: number
): Promise<void> => {
    const plan = await findPaymentPlanById(planId);
    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${planId} not found`);
    }

    // Check if plan has any paid installments
    const schedules = await findPaymentSchedulesByPlanId(planId);
    const hasPaidInstallments = schedules.some((s) => s.status === 'PAID');

    if (hasPaidInstallments) {
        throw BadRequestError(
            'Cannot delete payment plan with paid installments. Consider cancelling instead.'
        );
    }

    // Delete schedules first (foreign key constraint)
    for (const schedule of schedules) {
        await deletePaymentSchedule(schedule.id);
    }

    // Delete payment plan (hard delete)
    await hardDeletePaymentPlan(planId);
};

/**
 * Recalculate payment plan amounts based on payments
 * This would be called after a payment is made
 */
export const recalculatePaymentPlanAmounts = async (
    planId: number
): Promise<PaymentPlan> => {
    const { plan, schedules } = await getPaymentPlanWithSchedules(planId);

    // Calculate paid amount from schedules
    const paidAmount = schedules
        .filter((s) => s.status === 'PAID')
        .reduce((sum, s) => sum + Number(s.amount), 0);

    const remainingAmount = plan.total_amount - paidAmount;

    // Update plan amounts
    const updatedPlan = await updatePaymentPlan(planId, {
        paid_amount: paidAmount,
    });

    if (!updatedPlan) {
        throw InternalServerError('Failed to recalculate payment plan amounts');
    }

    // Auto-complete if fully paid
    if (remainingAmount <= 0 && plan.status === 'ACTIVE') {
        return await updatePaymentPlanStatus(planId, 'COMPLETED');
    }

    return updatedPlan;
};

export default {
    createPaymentPlanWithSchedule,
    getPaymentPlanWithSchedules,
    getPaymentPlansByUser,
    getPaymentPlanSummary,
    updatePaymentPlanStatus,
    cancelPaymentPlan,
    deletePaymentPlanWithSchedules,
    recalculatePaymentPlanAmounts,
};
