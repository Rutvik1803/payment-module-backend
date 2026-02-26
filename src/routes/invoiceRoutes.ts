import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Invoice Routes
 * Base path: /api/invoices
 * All routes require authentication
 * Authorization is handled within controller methods
 */

// Get invoices for a specific user
// GET /api/invoices/user/:userId
// Note: Must come before /:id to avoid route conflict
router.get(
    '/user/:userId',
    authenticate,
    asyncHandler(invoiceController.getUserInvoices)
);

// Get invoices for a specific payment plan
// GET /api/invoices/payment-plan/:paymentPlanId
// Note: Must come before /:id to avoid route conflict
router.get(
    '/payment-plan/:paymentPlanId',
    authenticate,
    asyncHandler(invoiceController.getInvoicesByPaymentPlan)
);

// Get invoice summary (totals, status counts)
// GET /api/invoices/:id/summary
// Note: Specific subpath must come before generic /:id
router.get(
    '/:id/summary',
    authenticate,
    asyncHandler(invoiceController.getInvoiceSummary)
);

// Update invoice status
// PATCH /api/invoices/:id/status
// Admin only - checked in controller
router.patch(
    '/:id/status',
    authenticate,
    asyncHandler(invoiceController.updateInvoiceStatus)
);

// Cancel an invoice
// POST /api/invoices/:id/cancel
// Admin or owner with restrictions - checked in controller
router.post(
    '/:id/cancel',
    authenticate,
    asyncHandler(invoiceController.cancelInvoice)
);

// Mark invoice as paid (for offline payments)
// POST /api/invoices/:id/mark-paid
// Admin only - checked in controller
router.post(
    '/:id/mark-paid',
    authenticate,
    asyncHandler(invoiceController.markInvoiceAsPaid)
);

// Get invoice by ID
// GET /api/invoices/:id
// Admin or owner - checked in controller
router.get(
    '/:id',
    authenticate,
    asyncHandler(invoiceController.getInvoiceById)
);

// Get all invoices with pagination and filters
// GET /api/invoices?page=1&limit=10&status=PENDING&search=example
// Admin only - checked in controller
router.get(
    '/',
    authenticate,
    asyncHandler(invoiceController.getAllInvoices)
);

export default router;
