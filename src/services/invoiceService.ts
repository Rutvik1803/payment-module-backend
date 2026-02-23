/**
 * Invoice Service
 * 
 * Business logic layer for invoice generation and management.
 * Handles automatic invoice generation from payment schedules,
 * unique invoice number generation, and invoice retrieval with enriched data.
 */

import pool from '../config/database';
import {
    createInvoice,
    findInvoiceById,
    findInvoiceByNumber,
    findInvoicesByPaymentPlan,
    findInvoicesByUserId,
} from '../models/Invoice';
import {
    findPaymentScheduleById,
    findPaymentSchedulesByPlanId,
} from '../models/PaymentSchedule';
import { findPaymentPlanById } from '../models/PaymentPlan';
import { findUserById } from '../models/User';
import {
    generateUniqueInvoiceNumber,
    validateInvoiceData,
    calculateInvoiceStatus,
} from '../utils/invoiceUtils';
import {
    NotFoundError,
    BadRequestError,
    InternalServerError,
} from '../utils/errors';
import { Invoice, CreateInvoiceDTO } from '../types/invoice';
import { PaymentSchedule } from '../types/paymentSchedule';
import { PaymentPlan } from '../types/paymentPlan';
import { UserResponse } from '../types/user';
import { sanitizeUser } from '../utils/userUtils';

/**
 * Extended invoice with related data
 */
interface InvoiceWithDetails extends Invoice {
    plan?: PaymentPlan | null;
    user?: UserResponse;
    schedule?: PaymentSchedule | null;
}

/**
 * Bulk invoice generation result
 */
interface BulkInvoiceResult {
    invoices: Invoice[];
    count: number;
    paymentPlanId: number;
}

/**
 * Invoice summary for a user
 */
interface InvoiceSummary {
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    upcomingCount: number;
    overdueCount: number;
    paidCount: number;
}

/**
 * Generate a unique invoice number
 * @returns Newly generated unique invoice number
 */
const generateInvoiceNumber = async (): Promise<string> => {
    try {
        return await generateUniqueInvoiceNumber();
    } catch (error) {
        throw InternalServerError('Failed to generate unique invoice number');
    }
};

/**
 * Generate an invoice from a payment schedule
 * @param scheduleId - Payment schedule ID
 * @returns Created invoice
 * @throws NotFoundError if schedule, plan, or user not found
 * @throws ValidationError if schedule data is invalid
 */
const generateInvoiceFromSchedule = async (scheduleId: number): Promise<Invoice> => {
    // Fetch payment schedule
    const schedule = await findPaymentScheduleById(scheduleId);

    if (!schedule) {
        throw NotFoundError(`Payment schedule with ID ${scheduleId} not found`);
    }

    // Fetch associated payment plan
    const plan = await findPaymentPlanById(schedule.payment_plan_id);

    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${schedule.payment_plan_id} not found`);
    }

    // Validate plan is active
    if (plan.status !== 'ACTIVE') {
        throw BadRequestError(`Cannot generate invoice for ${plan.status} payment plan`);
    }

    // Fetch user
    const user = await findUserById(plan.user_id);

    if (!user) {
        throw NotFoundError(`User with ID ${plan.user_id} not found`);
    }

    // Validate invoice data
    validateInvoiceData({
        userId: plan.user_id,
        amount: schedule.amount,
        dueDate: schedule.due_date,
    });

    // Check if invoice already exists for this schedule
    // We'll check by payment_plan_id and matching amount/due_date
    const existingInvoices = await findInvoicesByPaymentPlan(schedule.payment_plan_id);
    const duplicateInvoice = existingInvoices.find(
        inv =>
            inv.amount === schedule.amount &&
            new Date(inv.due_date).getTime() === new Date(schedule.due_date).getTime()
    );

    if (duplicateInvoice) {
        throw BadRequestError(
            `Invoice already exists for this schedule (Invoice #${duplicateInvoice.invoice_number})`
        );
    }

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice
    const invoiceData: CreateInvoiceDTO = {
        user_id: plan.user_id,
        invoice_number: invoiceNumber,
        amount: schedule.amount,
        due_date: schedule.due_date,
        payment_plan_id: schedule.payment_plan_id,
    };

    const invoice = await createInvoice(invoiceData);

    return invoice;
};

/**
 * Generate invoices for all schedules in a payment plan
 * @param paymentPlanId - Payment plan ID
 * @returns Array of created invoices
 * @throws NotFoundError if payment plan not found
 * @throws ValidationError if plan is not active or has no schedules
 */
const generateInvoicesForPaymentPlan = async (
    paymentPlanId: number
): Promise<BulkInvoiceResult> => {
    // Fetch payment plan
    const plan = await findPaymentPlanById(paymentPlanId);

    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${paymentPlanId} not found`);
    }

    // Validate plan is active
    if (plan.status !== 'ACTIVE') {
        throw BadRequestError(`Cannot generate invoices for ${plan.status} payment plan`);
    }

    // Fetch user
    const user = await findUserById(plan.user_id);

    if (!user) {
        throw NotFoundError(`User with ID ${plan.user_id} not found`);
    }

    // Fetch all payment schedules for this plan
    const schedules = await findPaymentSchedulesByPlanId(paymentPlanId);

    if (schedules.length === 0) {
        throw BadRequestError('No payment schedules found for this payment plan');
    }

    // Fetch existing invoices to avoid duplicates
    const existingInvoices = await findInvoicesByPaymentPlan(paymentPlanId);

    // Filter schedules that don't have invoices yet
    const schedulesNeedingInvoices = schedules.filter(schedule => {
        return !existingInvoices.some(
            invoice =>
                invoice.amount === schedule.amount &&
                new Date(invoice.due_date).getTime() === new Date(schedule.due_date).getTime()
        );
    });

    if (schedulesNeedingInvoices.length === 0) {
        throw BadRequestError('All schedules already have invoices generated');
    }

    // Use transaction for bulk creation
    const client = await pool.connect();
    const createdInvoices: Invoice[] = [];

    try {
        await client.query('BEGIN');

        for (const schedule of schedulesNeedingInvoices) {
            // Validate invoice data
            validateInvoiceData({
                userId: plan.user_id,
                amount: schedule.amount,
                dueDate: schedule.due_date,
            });

            // Generate unique invoice number
            const invoiceNumber = await generateInvoiceNumber();

            // Create invoice
            const invoiceData: CreateInvoiceDTO = {
                user_id: plan.user_id,
                invoice_number: invoiceNumber,
                amount: schedule.amount,
                due_date: schedule.due_date,
                payment_plan_id: paymentPlanId,
            };

            const invoice = await createInvoice(invoiceData);
            createdInvoices.push(invoice);
        }

        await client.query('COMMIT');

        return {
            invoices: createdInvoices,
            count: createdInvoices.length,
            paymentPlanId,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw InternalServerError('Failed to generate invoices in bulk');
    } finally {
        client.release();
    }
};

/**
 * Get invoice with enriched details (plan, user, schedule info)
 * @param invoiceId - Invoice ID
 * @returns Invoice with related data
 * @throws NotFoundError if invoice not found
 */
const getInvoiceWithDetails = async (invoiceId: number): Promise<InvoiceWithDetails> => {
    // Fetch invoice
    const invoice = await findInvoiceById(invoiceId);

    if (!invoice) {
        throw NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Fetch user
    const user = await findUserById(invoice.user_id);

    if (!user) {
        throw NotFoundError(`User with ID ${invoice.user_id} not found`);
    }

    // Fetch payment plan if exists
    let plan: PaymentPlan | null = null;
    if (invoice.payment_plan_id) {
        plan = await findPaymentPlanById(invoice.payment_plan_id);
    }

    // Try to find matching schedule
    let schedule: PaymentSchedule | null = null;
    if (plan) {
        const schedules = await findPaymentSchedulesByPlanId(plan.id);
        schedule = schedules.find(
            s =>
                s.amount === invoice.amount &&
                new Date(s.due_date).getTime() === new Date(invoice.due_date).getTime()
        ) || null;
    }

    return {
        ...invoice,
        plan,
        user: sanitizeUser(user),
        schedule,
    };
};

/**
 * Get all invoices for a payment plan
 * @param paymentPlanId - Payment plan ID
 * @returns Array of invoices
 * @throws NotFoundError if payment plan not found
 */
const getInvoicesByPaymentPlan = async (paymentPlanId: number): Promise<Invoice[]> => {
    // Verify payment plan exists
    const plan = await findPaymentPlanById(paymentPlanId);

    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${paymentPlanId} not found`);
    }

    // Fetch invoices
    const invoices = await findInvoicesByPaymentPlan(paymentPlanId);

    return invoices;
};

/**
 * Regenerate invoice for a schedule (voids old, creates new)
 * @param scheduleId - Payment schedule ID
 * @returns Newly created invoice
 * @throws NotFoundError if schedule not found
 * @throws ValidationError if old invoice has payments
 */
const regenerateInvoiceForSchedule = async (scheduleId: number): Promise<Invoice> => {
    // Fetch payment schedule
    const schedule = await findPaymentScheduleById(scheduleId);

    if (!schedule) {
        throw NotFoundError(`Payment schedule with ID ${scheduleId} not found`);
    }

    // Fetch associated payment plan
    const plan = await findPaymentPlanById(schedule.payment_plan_id);

    if (!plan) {
        throw NotFoundError(`Payment plan with ID ${schedule.payment_plan_id} not found`);
    }

    // Find existing invoice
    const existingInvoices = await findInvoicesByPaymentPlan(schedule.payment_plan_id);
    const oldInvoice = existingInvoices.find(
        inv =>
            inv.amount === schedule.amount &&
            new Date(inv.due_date).getTime() === new Date(schedule.due_date).getTime()
    );

    // Check if old invoice has been paid
    if (oldInvoice && oldInvoice.paid_amount > 0) {
        throw BadRequestError(
            'Cannot regenerate invoice that has received payments. Please create a new invoice instead.'
        );
    }

    // For now, we'll just create a new invoice
    // In production, you might want to mark the old invoice as "VOIDED"
    // This would require adding a VOIDED status to the invoice schema

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create new invoice
    const invoiceData: CreateInvoiceDTO = {
        user_id: plan.user_id,
        invoice_number: invoiceNumber,
        amount: schedule.amount,
        due_date: schedule.due_date,
        payment_plan_id: schedule.payment_plan_id,
    };

    const newInvoice = await createInvoice(invoiceData);

    return newInvoice;
};

/**
 * Get invoice summary for a user
 * @param userId - User ID
 * @returns Summary statistics
 * @throws NotFoundError if user not found
 */
const getInvoiceSummaryByUser = async (userId: number): Promise<InvoiceSummary> => {
    // Verify user exists
    const user = await findUserById(userId);

    if (!user) {
        throw NotFoundError(`User with ID ${userId} not found`);
    }

    // Fetch all user invoices
    const invoices = await findInvoicesByUserId(userId);

    // Calculate summary
    const summary: InvoiceSummary = {
        totalInvoices: invoices.length,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        upcomingCount: 0,
        overdueCount: 0,
        paidCount: 0,
    };

    invoices.forEach(invoice => {
        summary.totalAmount += Number(invoice.amount);
        summary.paidAmount += Number(invoice.paid_amount);
        summary.outstandingAmount += Number(invoice.amount) - Number(invoice.paid_amount);

        if (invoice.status === 'PAID') {
            summary.paidCount++;
        } else if (invoice.status === 'OUTSTANDING') {
            summary.overdueCount++;
        } else if (invoice.status === 'UPCOMING') {
            summary.upcomingCount++;
        }
    });

    return summary;
};

/**
 * Export all service functions
 */
export default {
    generateInvoiceNumber,
    generateInvoiceFromSchedule,
    generateInvoicesForPaymentPlan,
    getInvoiceWithDetails,
    getInvoicesByPaymentPlan,
    regenerateInvoiceForSchedule,
    getInvoiceSummaryByUser,
};
