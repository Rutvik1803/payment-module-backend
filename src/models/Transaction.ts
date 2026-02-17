/**
 * Transaction Model
 * Handles all database operations for transactions
 */

import { QueryResult } from 'pg';
import pool from '../config/database';
import {
    Transaction,
    CreateTransactionDTO,
    UpdateTransactionDTO,
    TransactionFilters,
    TransactionStats,
} from '../types/transaction';
import { updatePaidAmount as updateInvoicePaidAmount } from './Invoice';

/**
 * Create a new transaction
 */
export const createTransaction = async (
    data: CreateTransactionDTO
): Promise<Transaction> => {
    const {
        user_id,
        invoice_id = null,
        payment_plan_id = null,
        amount,
        type,
        payment_method,
        gateway_transaction_id = null,
        gateway_response = null,
        notes = null,
        status = 'PENDING',
    } = data;

    const sql = `
    INSERT INTO transactions (
      user_id, invoice_id, payment_plan_id, amount, status, type,
      payment_method, gateway_transaction_id, gateway_response, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

    const result: QueryResult<Transaction> = await pool.query(sql, [
        user_id,
        invoice_id,
        payment_plan_id,
        amount,
        status,
        type,
        payment_method,
        gateway_transaction_id,
        gateway_response,
        notes,
    ]);

    return result.rows[0];
};

/**
 * Find transaction by ID
 */
export const findTransactionById = async (
    id: number
): Promise<Transaction | null> => {
    const sql = 'SELECT * FROM transactions WHERE id = $1';
    const result: QueryResult<Transaction> = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find transaction by gateway transaction ID
 */
export const findTransactionByGatewayId = async (
    gateway_transaction_id: string
): Promise<Transaction | null> => {
    const sql = 'SELECT * FROM transactions WHERE gateway_transaction_id = $1';
    const result: QueryResult<Transaction> = await pool.query(sql, [gateway_transaction_id]);
    return result.rows[0] || null;
};

/**
 * Find all transactions for a user
 */
export const findTransactionsByUserId = async (
    user_id: number
): Promise<Transaction[]> => {
    const sql = `
    SELECT * FROM transactions
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
    const result: QueryResult<Transaction> = await pool.query(sql, [user_id]);
    return result.rows;
};

/**
 * Find all transactions for an invoice
 */
export const findTransactionsByInvoiceId = async (
    invoice_id: number
): Promise<Transaction[]> => {
    const sql = `
    SELECT * FROM transactions
    WHERE invoice_id = $1
    ORDER BY created_at DESC
  `;
    const result: QueryResult<Transaction> = await pool.query(sql, [invoice_id]);
    return result.rows;
};

/**
 * Find all transactions for a payment plan
 */
export const findTransactionsByPaymentPlan = async (
    payment_plan_id: number
): Promise<Transaction[]> => {
    const sql = `
    SELECT * FROM transactions
    WHERE payment_plan_id = $1
    ORDER BY created_at DESC
  `;
    const result: QueryResult<Transaction> = await pool.query(sql, [payment_plan_id]);
    return result.rows;
};

/**
 * Find all transactions with optional filters
 */
export const findAllTransactions = async (
    filters?: TransactionFilters
): Promise<Transaction[]> => {
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters?.user_id) {
        paramCount++;
        sql += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
    }

    if (filters?.invoice_id) {
        paramCount++;
        sql += ` AND invoice_id = $${paramCount}`;
        params.push(filters.invoice_id);
    }

    if (filters?.payment_plan_id) {
        paramCount++;
        sql += ` AND payment_plan_id = $${paramCount}`;
        params.push(filters.payment_plan_id);
    }

    if (filters?.status) {
        paramCount++;
        sql += ` AND status = $${paramCount}`;
        params.push(filters.status);
    }

    if (filters?.type) {
        paramCount++;
        sql += ` AND type = $${paramCount}`;
        params.push(filters.type);
    }

    if (filters?.payment_method) {
        paramCount++;
        sql += ` AND payment_method = $${paramCount}`;
        params.push(filters.payment_method);
    }

    if (filters?.start_date) {
        paramCount++;
        sql += ` AND created_at >= $${paramCount}`;
        params.push(filters.start_date);
    }

    if (filters?.end_date) {
        paramCount++;
        sql += ` AND created_at <= $${paramCount}`;
        params.push(filters.end_date);
    }

    sql += ' ORDER BY created_at DESC';

    const result: QueryResult<Transaction> = await pool.query(sql, params);
    return result.rows;
};

/**
 * Update transaction
 */
export const updateTransaction = async (
    id: number,
    updates: UpdateTransactionDTO
): Promise<Transaction | null> => {
    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (updates.status !== undefined) {
        paramCount++;
        fields.push(`status = $${paramCount}`);
        params.push(updates.status);
    }

    if (updates.gateway_transaction_id !== undefined) {
        paramCount++;
        fields.push(`gateway_transaction_id = $${paramCount}`);
        params.push(updates.gateway_transaction_id);
    }

    if (updates.gateway_response !== undefined) {
        paramCount++;
        fields.push(`gateway_response = $${paramCount}`);
        params.push(updates.gateway_response);
    }

    if (updates.notes !== undefined) {
        paramCount++;
        fields.push(`notes = $${paramCount}`);
        params.push(updates.notes);
    }

    if (fields.length === 0) {
        return findTransactionById(id);
    }

    paramCount++;
    fields.push(`updated_at = $${paramCount}`);
    params.push(new Date());

    paramCount++;
    const sql = `
    UPDATE transactions
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
    params.push(id);

    const result: QueryResult<Transaction> = await pool.query(sql, params);
    return result.rows[0] || null;
};

/**
 * Update transaction status
 */
export const updateTransactionStatus = async (
    id: number,
    status: Transaction['status']
): Promise<Transaction | null> => {
    return updateTransaction(id, { status });
};

/**
 * Record a payment (create transaction and update invoice)
 * This is a transaction-safe operation
 */
export const recordPayment = async (
    data: CreateTransactionDTO
): Promise<Transaction> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create transaction with COMPLETED status
        const transactionData = { ...data, status: 'COMPLETED' as const };
        const sql = `
      INSERT INTO transactions (
        user_id, invoice_id, payment_plan_id, amount, status, type,
        payment_method, gateway_transaction_id, gateway_response, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

        const result: QueryResult<Transaction> = await client.query(sql, [
            transactionData.user_id,
            transactionData.invoice_id || null,
            transactionData.payment_plan_id || null,
            transactionData.amount,
            transactionData.status,
            transactionData.type,
            transactionData.payment_method,
            transactionData.gateway_transaction_id || null,
            transactionData.gateway_response || null,
            transactionData.notes || null,
        ]);

        const transaction = result.rows[0];

        // Update invoice paid amount if invoice_id provided
        if (data.invoice_id) {
            await updateInvoicePaidAmount(data.invoice_id, data.amount);
        }

        await client.query('COMMIT');
        return transaction;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Record a refund (create refund transaction and update invoice)
 * This is a transaction-safe operation
 */
export const recordRefund = async (
    data: CreateTransactionDTO
): Promise<Transaction> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create refund transaction with COMPLETED status
        const transactionData = {
            ...data,
            type: 'REFUND' as const,
            status: 'COMPLETED' as const,
        };

        const sql = `
      INSERT INTO transactions (
        user_id, invoice_id, payment_plan_id, amount, status, type,
        payment_method, gateway_transaction_id, gateway_response, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

        const result: QueryResult<Transaction> = await client.query(sql, [
            transactionData.user_id,
            transactionData.invoice_id || null,
            transactionData.payment_plan_id || null,
            transactionData.amount,
            transactionData.status,
            transactionData.type,
            transactionData.payment_method,
            transactionData.gateway_transaction_id || null,
            transactionData.gateway_response || null,
            transactionData.notes || null,
        ]);

        const transaction = result.rows[0];

        // Update invoice paid amount (subtract refund) if invoice_id provided
        if (data.invoice_id) {
            await updateInvoicePaidAmount(data.invoice_id, -data.amount);
        }

        await client.query('COMMIT');
        return transaction;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get transaction statistics
 */
export const getTransactionStats = async (
    filters?: TransactionFilters
): Promise<TransactionStats> => {
    let sql = `
    SELECT
      COUNT(*) as total_transactions,
      COALESCE(SUM(amount), 0) as total_amount,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0) as completed_amount,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending_amount,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
      COALESCE(SUM(CASE WHEN status = 'FAILED' THEN amount ELSE 0 END), 0) as failed_amount,
      COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END) as refunded_count,
      COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END), 0) as refunded_amount
    FROM transactions
    WHERE 1=1
  `;

    const params: any[] = [];
    let paramCount = 0;

    if (filters?.user_id) {
        paramCount++;
        sql += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
    }

    if (filters?.type) {
        paramCount++;
        sql += ` AND type = $${paramCount}`;
        params.push(filters.type);
    }

    if (filters?.start_date) {
        paramCount++;
        sql += ` AND created_at >= $${paramCount}`;
        params.push(filters.start_date);
    }

    if (filters?.end_date) {
        paramCount++;
        sql += ` AND created_at <= $${paramCount}`;
        params.push(filters.end_date);
    }

    const result: QueryResult = await pool.query(sql, params);
    const row = result.rows[0];

    return {
        total_transactions: parseInt(row.total_transactions),
        total_amount: parseFloat(row.total_amount),
        completed_count: parseInt(row.completed_count),
        completed_amount: parseFloat(row.completed_amount),
        pending_count: parseInt(row.pending_count),
        pending_amount: parseFloat(row.pending_amount),
        failed_count: parseInt(row.failed_count),
        failed_amount: parseFloat(row.failed_amount),
        refunded_count: parseInt(row.refunded_count),
        refunded_amount: parseFloat(row.refunded_amount),
    };
};

/**
 * Delete transaction (soft delete by setting status to CANCELLED)
 */
export const deleteTransaction = async (id: number): Promise<boolean> => {
    const sql = `
    UPDATE transactions
    SET status = 'CANCELLED', updated_at = $1
    WHERE id = $2
  `;
    const result: QueryResult = await pool.query(sql, [new Date(), id]);
    return (result.rowCount || 0) > 0;
};

/**
 * Hard delete transaction (permanently remove from database)
 * Use with caution - primarily for testing
 */
export const hardDeleteTransaction = async (id: number): Promise<boolean> => {
    const sql = 'DELETE FROM transactions WHERE id = $1';
    const result: QueryResult = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};
