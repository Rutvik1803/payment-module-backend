import { QueryResult } from 'pg';
import pool from '../config/database';
import {
    Invoice,
    CreateInvoiceDTO,
    UpdateInvoiceDTO,
    InvoiceFilters,
    InvoiceStatus
} from '../types/invoice';

/**
 * Create a new invoice
 */
export const createInvoice = async (
    data: CreateInvoiceDTO
): Promise<Invoice> => {
    const {
        user_id,
        invoice_number,
        amount,
        due_date,
        payment_plan_id = null
    } = data;

    const sql = `
    INSERT INTO invoices (
      user_id, 
      payment_plan_id,
      invoice_number, 
      amount, 
      paid_amount,
      status, 
      due_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

    // Calculate initial status based on due_date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(due_date);
    dueDate.setHours(0, 0, 0, 0);

    let initialStatus: InvoiceStatus = 'DUE';
    if (dueDate > today) {
        initialStatus = 'UPCOMING';
    } else if (dueDate < today) {
        initialStatus = 'OUTSTANDING';
    }

    const values = [
        user_id,
        payment_plan_id,
        invoice_number,
        amount,
        0, // paid_amount starts at 0
        initialStatus,
        due_date
    ];

    const result: QueryResult<Invoice> = await pool.query(sql, values);
    return result.rows[0];
};

/**
 * Find invoice by ID
 */
export const findInvoiceById = async (
    id: number
): Promise<Invoice | null> => {
    const sql = 'SELECT * FROM invoices WHERE id = $1';
    const result: QueryResult<Invoice> = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find invoice by invoice number
 */
export const findInvoiceByNumber = async (
    invoice_number: string
): Promise<Invoice | null> => {
    const sql = 'SELECT * FROM invoices WHERE invoice_number = $1';
    const result: QueryResult<Invoice> = await pool.query(sql, [invoice_number]);
    return result.rows[0] || null;
};

/**
 * Find all invoices for a specific user
 */
export const findInvoicesByUserId = async (
    user_id: number
): Promise<Invoice[]> => {
    const sql = 'SELECT * FROM invoices WHERE user_id = $1 ORDER BY due_date DESC';
    const result: QueryResult<Invoice> = await pool.query(sql, [user_id]);
    return result.rows;
};

/**
 * Find all invoices for a specific payment plan
 */
export const findInvoicesByPaymentPlan = async (
    payment_plan_id: number
): Promise<Invoice[]> => {
    const sql = 'SELECT * FROM invoices WHERE payment_plan_id = $1 ORDER BY due_date ASC';
    const result: QueryResult<Invoice> = await pool.query(sql, [payment_plan_id]);
    return result.rows;
};

/**
 * Find all invoices with optional filters
 */
export const findAllInvoices = async (
    filters?: InvoiceFilters
): Promise<Invoice[]> => {
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.user_id) {
        sql += ` AND user_id = $${paramCount}`;
        values.push(filters.user_id);
        paramCount++;
    }

    if (filters?.payment_plan_id) {
        sql += ` AND payment_plan_id = $${paramCount}`;
        values.push(filters.payment_plan_id);
        paramCount++;
    }

    if (filters?.status) {
        sql += ` AND status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
    }

    if (filters?.start_date) {
        sql += ` AND due_date >= $${paramCount}`;
        values.push(filters.start_date);
        paramCount++;
    }

    if (filters?.end_date) {
        sql += ` AND due_date <= $${paramCount}`;
        values.push(filters.end_date);
        paramCount++;
    }

    sql += ' ORDER BY due_date DESC';

    const result: QueryResult<Invoice> = await pool.query(sql, values);
    return result.rows;
};

/**
 * Update invoice
 */
export const updateInvoice = async (
    id: number,
    updates: UpdateInvoiceDTO
): Promise<Invoice | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.amount !== undefined) {
        fields.push(`amount = $${paramCount}`);
        values.push(updates.amount);
        paramCount++;
    }

    if (updates.paid_amount !== undefined) {
        fields.push(`paid_amount = $${paramCount}`);
        values.push(updates.paid_amount);
        paramCount++;
    }

    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount}`);
        values.push(updates.status);
        paramCount++;
    }

    if (updates.due_date !== undefined) {
        fields.push(`due_date = $${paramCount}`);
        values.push(updates.due_date);
        paramCount++;
    }

    if (updates.payment_plan_id !== undefined) {
        fields.push(`payment_plan_id = $${paramCount}`);
        values.push(updates.payment_plan_id);
        paramCount++;
    }

    if (fields.length === 0) {
        return findInvoiceById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
    UPDATE invoices
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

    const result: QueryResult<Invoice> = await pool.query(sql, values);
    return result.rows[0] || null;
};

/**
 * Update paid amount and automatically recalculate status
 */
export const updatePaidAmount = async (
    id: number,
    additionalAmount: number
): Promise<Invoice | null> => {
    // First get the invoice to check current amounts
    const invoice = await findInvoiceById(id);
    if (!invoice) {
        return null;
    }

    const newPaidAmount = Number(invoice.paid_amount) + additionalAmount;
    const amount = Number(invoice.amount);

    // Calculate new status based on payment
    let newStatus: InvoiceStatus = invoice.status;
    if (newPaidAmount >= amount) {
        newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
        newStatus = 'PARTIAL';
    }

    const sql = `
    UPDATE invoices
    SET 
      paid_amount = paid_amount + $1,
      status = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;

    const result: QueryResult<Invoice> = await pool.query(sql, [additionalAmount, newStatus, id]);
    return result.rows[0] || null;
};

/**
 * Update invoice status manually
 */
export const updateInvoiceStatus = async (
    id: number,
    status: InvoiceStatus
): Promise<Invoice | null> => {
    const sql = `
    UPDATE invoices
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

    const result: QueryResult<Invoice> = await pool.query(sql, [status, id]);
    return result.rows[0] || null;
};

/**
 * Calculate and update invoice status based on amounts and due date
 */
export const calculateInvoiceStatus = async (
    id: number
): Promise<Invoice | null> => {
    const invoice = await findInvoiceById(id);
    if (!invoice) {
        return null;
    }

    const paidAmount = Number(invoice.paid_amount);
    const amount = Number(invoice.amount);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);

    let newStatus: InvoiceStatus;

    // If fully paid, status is PAID regardless of date
    if (paidAmount >= amount) {
        newStatus = 'PAID';
    }
    // If partially paid
    else if (paidAmount > 0) {
        newStatus = 'PARTIAL';
    }
    // No payment yet, determine by date
    else if (dueDate > today) {
        newStatus = 'UPCOMING';
    } else if (dueDate.getTime() === today.getTime()) {
        newStatus = 'DUE';
    } else {
        newStatus = 'OUTSTANDING';
    }

    // Only update if status changed
    if (newStatus !== invoice.status) {
        return updateInvoiceStatus(id, newStatus);
    }

    return invoice;
};

/**
 * Recalculate status for all invoices (useful for daily cron job)
 */
export const recalculateAllInvoiceStatuses = async (): Promise<number> => {
    const invoices = await findAllInvoices();
    let updatedCount = 0;

    for (const invoice of invoices) {
        const updated = await calculateInvoiceStatus(invoice.id);
        if (updated && updated.status !== invoice.status) {
            updatedCount++;
        }
    }

    return updatedCount;
};

/**
 * Delete invoice (soft delete - not really used, kept for completeness)
 */
export const deleteInvoice = async (id: number): Promise<boolean> => {
    // In a real system, you might want to prevent deletion of invoices with payments
    // For now, we'll just do a hard delete
    return hardDeleteInvoice(id);
};

/**
 * Hard delete invoice (for testing only)
 */
export const hardDeleteInvoice = async (id: number): Promise<boolean> => {
    const sql = 'DELETE FROM invoices WHERE id = $1';
    const result: QueryResult = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};

/**
 * Check if invoice number exists
 */
export const invoiceNumberExists = async (
    invoice_number: string
): Promise<boolean> => {
    const sql = 'SELECT COUNT(*) as count FROM invoices WHERE invoice_number = $1';
    const result: QueryResult = await pool.query(sql, [invoice_number]);
    return parseInt(result.rows[0].count) > 0;
};
