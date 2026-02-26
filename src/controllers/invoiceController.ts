/**
 * Invoice Controller
 * 
 * Handles HTTP requests for invoice management including:
 * - Retrieving invoices with filters and pagination
 * - Invoice status updates
 * - Authorization checks (admin vs owner)
 * - Manual payment marking
 */

import { Request, Response } from 'express';
import { sendSuccess } from '../utils/responseFormatter';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import invoiceService from '../services/invoiceService';
import { findInvoiceById, updateInvoiceStatus as updateInvoiceStatusModel, updateInvoice } from '../models/Invoice';
import { InvoiceStatus } from '../types/invoice';

/**
 * Get all invoices (Admin only)
 * GET /api/invoices?page=1&limit=10&status=PAID&userId=1&paymentPlanId=2
 */
export const getAllInvoices = async (req: Request, res: Response) => {
    // Only admins can view all invoices
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Admin access required');
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate pagination
    if (page < 1) {
        throw BadRequestError('Page must be at least 1');
    }
    if (limit < 1 || limit > 100) {
        throw BadRequestError('Limit must be between 1 and 100');
    }

    // Parse filters
    const status = req.query.status as InvoiceStatus | undefined;
    const nameOrEmail = req.query.search as string | undefined;
    const paymentPlanId = req.query.paymentPlanId ? parseInt(req.query.paymentPlanId as string) : undefined;

    // Use service to get paginated invoices
    const result = await invoiceService.getAllInvoicesWithPagination({
        page,
        limit,
        status,
        nameOrEmail,
        paymentPlanId,
    });

    sendSuccess(res, result, 'Invoices retrieved successfully');
};

/**
 * Get invoice by ID (Admin or invoice owner)
 * GET /api/invoices/:id
 */
export const getInvoiceById = async (req: Request, res: Response) => {
    const invoiceId = parseInt(String(req.params.id));

    if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
    }

    // Get invoice with details
    const invoice = await invoiceService.getInvoiceWithDetails(invoiceId);

    if (!invoice) {
        throw NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Authorization check: admin or owner
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === invoice.user_id;

    if (!isAdmin && !isOwner) {
        throw ForbiddenError('You do not have permission to view this invoice');
    }

    sendSuccess(res, { invoice }, 'Invoice retrieved successfully');
};

/**
 * Get user's invoices (Admin or user themselves)
 * GET /api/invoices/user/:userId?page=1&limit=10&status=PAID
 */
export const getUserInvoices = async (req: Request, res: Response) => {
    const userId = parseInt(String(req.params.userId));

    if (isNaN(userId)) {
        throw BadRequestError('Invalid user ID');
    }

    // Authorization check: admin or the user themselves
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.id === userId;

    if (!isAdmin && !isSelf) {
        throw ForbiddenError('You do not have permission to view these invoices');
    }

    // Parse pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1 || limit > 100) {
        throw BadRequestError('Invalid pagination parameters');
    }

    // Parse filters
    const status = req.query.status as InvoiceStatus | undefined;
    const paymentPlanId = req.query.paymentPlanId ? parseInt(req.query.paymentPlanId as string) : undefined;

    // Use service to get paginated user invoices
    const result = await invoiceService.getUserInvoicesWithPagination({
        userId,
        page,
        limit,
        status,
        paymentPlanId,
    });

    sendSuccess(res, result, 'User invoices retrieved successfully');
};

/**
 * Get invoices by payment plan (Admin or plan owner)
 * GET /api/invoices/payment-plan/:paymentPlanId
 */
export const getInvoicesByPaymentPlan = async (req: Request, res: Response) => {
    const paymentPlanId = parseInt(String(req.params.paymentPlanId));

    if (isNaN(paymentPlanId)) {
        throw BadRequestError('Invalid payment plan ID');
    }

    // Get payment plan through service to check existence and ownership
    const paymentPlanService = await import('../services/paymentPlanService');
    const { plan } = await paymentPlanService.default.getPaymentPlanWithSchedules(paymentPlanId);

    // Authorization check: admin or plan owner
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === plan.user_id;

    if (!isAdmin && !isOwner) {
        throw ForbiddenError('You do not have permission to view these invoices');
    }

    // Get invoices for payment plan
    const invoices = await invoiceService.getInvoicesByPaymentPlan(paymentPlanId);

    sendSuccess(
        res,
        { invoices, paymentPlanId },
        'Payment plan invoices retrieved successfully'
    );
};

/**
 * Update invoice status (Admin only - manual override)
 * PATCH /api/invoices/:id/status
 * Body: { status: InvoiceStatus }
 */
export const updateInvoiceStatus = async (req: Request, res: Response) => {
    // Only admins can manually update invoice status
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Admin access required');
    }

    const invoiceId = parseInt(String(req.params.id));
    const { status } = req.body;

    if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
    }

    if (!status) {
        throw BadRequestError('Status is required');
    }

    // Validate status value
    const validStatuses: InvoiceStatus[] = ['UPCOMING', 'DUE', 'OUTSTANDING', 'PARTIAL', 'PAID'];
    if (!validStatuses.includes(status)) {
        throw BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get current invoice
    const invoice = await findInvoiceById(invoiceId);

    if (!invoice) {
        throw NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Business rule: Cannot change PAID status
    if (invoice.status === 'PAID' && status !== 'PAID') {
        throw BadRequestError('Cannot change status of a paid invoice');
    }

    // Update invoice status
    const updatedInvoice = await updateInvoiceStatusModel(invoiceId, status);

    sendSuccess(res, { invoice: updatedInvoice }, 'Invoice status updated successfully');
};

/**
 * Cancel invoice (Admin or owner with conditions)
 * POST /api/invoices/:id/cancel
 */
export const cancelInvoice = async (req: Request, res: Response) => {
    const invoiceId = parseInt(String(req.params.id));

    if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
    }

    // Get invoice
    const invoice = await findInvoiceById(invoiceId);

    if (!invoice) {
        throw NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Business rule: Cannot cancel PAID invoices
    if (invoice.status === 'PAID') {
        throw BadRequestError('Cannot cancel a paid invoice');
    }

    // Authorization check
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === invoice.user_id;

    // Owner can only cancel UPCOMING invoices
    if (!isAdmin && isOwner) {
        if (invoice.status !== 'UPCOMING') {
            throw ForbiddenError('You can only cancel upcoming invoices');
        }
    } else if (!isAdmin && !isOwner) {
        throw ForbiddenError('You do not have permission to cancel this invoice');
    }

    // Set amount and paid_amount to 0 and status to PAID (cancelled invoices are marked as PAID with 0 amount)
    // Or we could add a 'CANCELLED' status - for now let's use a soft approach
    const updatedInvoice = await updateInvoice(invoiceId, {
        amount: 0,
        paid_amount: 0,
        status: 'PAID', // Mark as paid with 0 amount = cancelled
    });

    sendSuccess(res, { invoice: updatedInvoice }, 'Invoice cancelled successfully');
};

/**
 * Mark invoice as paid manually (Admin only - for offline payments)
 * POST /api/invoices/:id/mark-paid
 * Body: { paymentMethod?: string, notes?: string }
 */
export const markInvoiceAsPaid = async (req: Request, res: Response) => {
    // Only admins can manually mark invoices as paid
    if (req.user?.role !== 'admin') {
        throw ForbiddenError('Admin access required');
    }

    const invoiceId = parseInt(String(req.params.id));

    if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
    }

    // Get invoice
    const invoice = await findInvoiceById(invoiceId);

    if (!invoice) {
        throw NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Business rule: Already paid
    if (invoice.status === 'PAID' && invoice.paid_amount >= invoice.amount) {
        throw BadRequestError('Invoice is already paid');
    }

    // Update invoice to paid
    const updatedInvoice = await updateInvoice(invoiceId, {
        paid_amount: invoice.amount,
        status: 'PAID',
    });

    sendSuccess(
        res,
        {
            invoice: updatedInvoice,
            message: 'Invoice marked as paid (offline payment)',
        },
        'Invoice marked as paid successfully'
    );
};

/**
 * Get invoice summary (Admin or owner)
 * GET /api/invoices/:id/summary
 */
export const getInvoiceSummary = async (req: Request, res: Response) => {
    const invoiceId = parseInt(String(req.params.id));

    if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
    }

    // Get invoice with details
    const invoice = await invoiceService.getInvoiceWithDetails(invoiceId);

    if (!invoice) {
        throw NotFoundError(`Invoice with ID ${invoiceId} not found`);
    }

    // Authorization check: admin or owner
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user?.id === invoice.user_id;

    if (!isAdmin && !isOwner) {
        throw ForbiddenError('You do not have permission to view this invoice summary');
    }

    // Calculate summary
    const summary = {
        invoice: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            status: invoice.status,
            due_date: invoice.due_date,
        },
        amounts: {
            total: invoice.amount,
            paid: invoice.paid_amount,
            due: invoice.amount - invoice.paid_amount,
        },
        payment_plan: invoice.plan
            ? {
                id: invoice.plan.id,
                total_amount: invoice.plan.total_amount,
                status: invoice.plan.status,
            }
            : null,
        user: invoice.user
            ? {
                id: invoice.user.id,
                email: invoice.user.email,
                first_name: invoice.user.first_name,
                last_name: invoice.user.last_name,
            }
            : null,
    };

    sendSuccess(res, summary, 'Invoice summary retrieved successfully');
};
