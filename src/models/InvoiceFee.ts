/**
 * Invoice Fee Model
 * Database operations for invoice fees
 */

import pool from '../config/database';
import {
    InvoiceFee,
    CreateInvoiceFeeDTO,
    UpdateInvoiceFeeDTO,
    InvoiceFeeFilters,
    InvoiceFeeSummary,
    InvoiceFeeType,
} from '../types/invoiceFee';

/**
 * Create a single invoice fee
 */
export const createInvoiceFee = async (
    feeData: CreateInvoiceFeeDTO
): Promise<InvoiceFee> => {
    const { invoice_id, type, amount, description } = feeData;

    const sql = `
    INSERT INTO invoice_fees (invoice_id, type, amount, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

    const result = await pool.query(sql, [invoice_id, type, amount, description || null]);
    return result.rows[0];
};

/**
 * Create multiple invoice fees in a transaction
 */
export const createInvoiceFees = async (
    feesData: CreateInvoiceFeeDTO[]
): Promise<InvoiceFee[]> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const fees: InvoiceFee[] = [];
        for (const feeData of feesData) {
            const { invoice_id, type, amount, description } = feeData;
            const sql = `
        INSERT INTO invoice_fees (invoice_id, type, amount, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
            const result = await client.query(sql, [invoice_id, type, amount, description || null]);
            fees.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return fees;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Find invoice fee by ID
 */
export const findInvoiceFeeById = async (id: number): Promise<InvoiceFee | null> => {
    const sql = `
    SELECT * FROM invoice_fees
    WHERE id = $1
  `;

    const result = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find all fees for an invoice
 */
export const findFeesByInvoiceId = async (
    invoiceId: number,
    activeOnly: boolean = true
): Promise<InvoiceFee[]> => {
    let sql = `
    SELECT * FROM invoice_fees
    WHERE invoice_id = $1
  `;

    if (activeOnly) {
        sql += ` AND is_active = true`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await pool.query(sql, [invoiceId]);
    return result.rows;
};

/**
 * Find all invoice fees with filters
 */
export const findAllInvoiceFees = async (
    filters: InvoiceFeeFilters = {}
): Promise<InvoiceFee[]> => {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.invoice_id !== undefined) {
        conditions.push(`invoice_id = $${paramCount}`);
        values.push(filters.invoice_id);
        paramCount++;
    }

    if (filters.type !== undefined) {
        conditions.push(`type = $${paramCount}`);
        values.push(filters.type);
        paramCount++;
    }

    if (filters.is_active !== undefined) {
        conditions.push(`is_active = $${paramCount}`);
        values.push(filters.is_active);
        paramCount++;
    }

    if (filters.min_amount !== undefined) {
        conditions.push(`amount >= $${paramCount}`);
        values.push(filters.min_amount);
        paramCount++;
    }

    if (filters.max_amount !== undefined) {
        conditions.push(`amount <= $${paramCount}`);
        values.push(filters.max_amount);
        paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
    SELECT * FROM invoice_fees
    ${whereClause}
    ORDER BY created_at DESC
  `;

    const result = await pool.query(sql, values);
    return result.rows;
};

/**
 * Update an invoice fee
 */
export const updateInvoiceFee = async (
    id: number,
    updates: UpdateInvoiceFeeDTO
): Promise<InvoiceFee | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.type !== undefined) {
        fields.push(`type = $${paramCount}`);
        values.push(updates.type);
        paramCount++;
    }

    if (updates.amount !== undefined) {
        fields.push(`amount = $${paramCount}`);
        values.push(updates.amount);
        paramCount++;
    }

    if (updates.description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(updates.description);
        paramCount++;
    }

    if (updates.is_active !== undefined) {
        fields.push(`is_active = $${paramCount}`);
        values.push(updates.is_active);
        paramCount++;
    }

    if (fields.length === 0) {
        return findInvoiceFeeById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
    UPDATE invoice_fees
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

    const result = await pool.query(sql, values);
    return result.rows[0] || null;
};

/**
 * Soft delete an invoice fee (set is_active to false)
 */
export const deactivateInvoiceFee = async (id: number): Promise<InvoiceFee | null> => {
    const sql = `
    UPDATE invoice_fees
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

    const result = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Reactivate an invoice fee (set is_active to true)
 */
export const reactivateInvoiceFee = async (id: number): Promise<InvoiceFee | null> => {
    const sql = `
    UPDATE invoice_fees
    SET is_active = true, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

    const result = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Hard delete an invoice fee (for testing only)
 */
export const deleteInvoiceFee = async (id: number): Promise<boolean> => {
    const sql = `DELETE FROM invoice_fees WHERE id = $1`;
    const result = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};

/**
 * Calculate total fees for an invoice
 */
export const calculateTotalFees = async (
    invoiceId: number,
    activeOnly: boolean = true
): Promise<number> => {
    let sql = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM invoice_fees
    WHERE invoice_id = $1
  `;

    if (activeOnly) {
        sql += ` AND is_active = true`;
    }

    const result = await pool.query(sql, [invoiceId]);
    return Number(result.rows[0].total);
};

/**
 * Get fee summary for an invoice
 */
export const getInvoiceFeeSummary = async (
    invoiceId: number,
    activeOnly: boolean = true
): Promise<InvoiceFeeSummary> => {
    let sql = `
    SELECT 
      type,
      SUM(amount) as amount,
      COUNT(*) as count
    FROM invoice_fees
    WHERE invoice_id = $1
  `;

    if (activeOnly) {
        sql += ` AND is_active = true`;
    }

    sql += ` GROUP BY type`;

    const result = await pool.query(sql, [invoiceId]);
    const feesByType = result.rows.map(row => ({
        type: row.type as InvoiceFeeType,
        amount: Number(row.amount),
        count: parseInt(row.count),
    }));

    const totalFees = feesByType.reduce((sum, fee) => sum + fee.amount, 0);
    const feeCount = feesByType.reduce((sum, fee) => sum + fee.count, 0);

    return {
        invoice_id: invoiceId,
        total_fees: totalFees,
        fee_count: feeCount,
        fees_by_type: feesByType,
    };
};

/**
 * Find fees by type across all invoices
 */
export const findFeesByType = async (
    type: InvoiceFeeType,
    activeOnly: boolean = true
): Promise<InvoiceFee[]> => {
    let sql = `
    SELECT * FROM invoice_fees
    WHERE type = $1
  `;

    if (activeOnly) {
        sql += ` AND is_active = true`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await pool.query(sql, [type]);
    return result.rows;
};

/**
 * Deactivate all fees for an invoice
 */
export const deactivateAllFeesForInvoice = async (
    invoiceId: number
): Promise<number> => {
    const sql = `
    UPDATE invoice_fees
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE invoice_id = $1 AND is_active = true
    RETURNING id
  `;

    const result = await pool.query(sql, [invoiceId]);
    return result.rowCount || 0;
};
