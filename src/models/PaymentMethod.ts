/**
 * Payment Method Model
 * Handles all database operations for saved payment methods
 */

import { QueryResult } from 'pg';
import pool from '../config/database';
import {
    PaymentMethod,
    CreatePaymentMethodDTO,
    UpdatePaymentMethodDTO,
    PaymentMethodFilters,
} from '../types/paymentMethod';

/**
 * Create a new payment method
 */
export const createPaymentMethod = async (
    data: CreatePaymentMethodDTO
): Promise<PaymentMethod> => {
    const {
        user_id,
        payment_method_type,
        last_four,
        token,
        card_brand = null,
        expiry_month = null,
        expiry_year = null,
        billing_zip = null,
        is_default = false,
    } = data;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // If setting as default, unset other defaults for this user
        if (is_default) {
            await client.query(
                'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
                [user_id]
            );
        }

        const sql = `
      INSERT INTO payment_methods (
        user_id, payment_method_type, last_four, token,
        card_brand, expiry_month, expiry_year, billing_zip, is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const result: QueryResult<PaymentMethod> = await client.query(sql, [
            user_id,
            payment_method_type,
            last_four,
            token,
            card_brand,
            expiry_month,
            expiry_year,
            billing_zip,
            is_default,
        ]);

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Find payment method by ID
 */
export const findPaymentMethodById = async (
    id: number
): Promise<PaymentMethod | null> => {
    const sql = 'SELECT * FROM payment_methods WHERE id = $1';
    const result: QueryResult<PaymentMethod> = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find all payment methods for a user
 */
export const findPaymentMethodsByUserId = async (
    user_id: number
): Promise<PaymentMethod[]> => {
    const sql = `
    SELECT * FROM payment_methods
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at DESC
  `;
    const result: QueryResult<PaymentMethod> = await pool.query(sql, [user_id]);
    return result.rows;
};

/**
 * Find active payment methods for a user
 */
export const findActivePaymentMethods = async (
    user_id: number
): Promise<PaymentMethod[]> => {
    const sql = `
    SELECT * FROM payment_methods
    WHERE user_id = $1 AND is_active = true
    ORDER BY is_default DESC, created_at DESC
  `;
    const result: QueryResult<PaymentMethod> = await pool.query(sql, [user_id]);
    return result.rows;
};

/**
 * Find default payment method for a user
 */
export const findDefaultPaymentMethod = async (
    user_id: number
): Promise<PaymentMethod | null> => {
    const sql = `
    SELECT * FROM payment_methods
    WHERE user_id = $1 AND is_default = true AND is_active = true
    LIMIT 1
  `;
    const result: QueryResult<PaymentMethod> = await pool.query(sql, [user_id]);
    return result.rows[0] || null;
};

/**
 * Find all payment methods with optional filters
 */
export const findAllPaymentMethods = async (
    filters?: PaymentMethodFilters
): Promise<PaymentMethod[]> => {
    let sql = 'SELECT * FROM payment_methods WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters?.user_id) {
        paramCount++;
        sql += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
    }

    if (filters?.payment_method_type) {
        paramCount++;
        sql += ` AND payment_method_type = $${paramCount}`;
        params.push(filters.payment_method_type);
    }

    if (filters?.card_brand) {
        paramCount++;
        sql += ` AND card_brand = $${paramCount}`;
        params.push(filters.card_brand);
    }

    if (filters?.is_default !== undefined) {
        paramCount++;
        sql += ` AND is_default = $${paramCount}`;
        params.push(filters.is_default);
    }

    if (filters?.is_active !== undefined) {
        paramCount++;
        sql += ` AND is_active = $${paramCount}`;
        params.push(filters.is_active);
    }

    sql += ' ORDER BY is_default DESC, created_at DESC';

    const result: QueryResult<PaymentMethod> = await pool.query(sql, params);
    return result.rows;
};

/**
 * Update payment method
 */
export const updatePaymentMethod = async (
    id: number,
    updates: UpdatePaymentMethodDTO
): Promise<PaymentMethod | null> => {
    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (updates.last_four !== undefined) {
        paramCount++;
        fields.push(`last_four = $${paramCount}`);
        params.push(updates.last_four);
    }

    if (updates.card_brand !== undefined) {
        paramCount++;
        fields.push(`card_brand = $${paramCount}`);
        params.push(updates.card_brand);
    }

    if (updates.expiry_month !== undefined) {
        paramCount++;
        fields.push(`expiry_month = $${paramCount}`);
        params.push(updates.expiry_month);
    }

    if (updates.expiry_year !== undefined) {
        paramCount++;
        fields.push(`expiry_year = $${paramCount}`);
        params.push(updates.expiry_year);
    }

    if (updates.billing_zip !== undefined) {
        paramCount++;
        fields.push(`billing_zip = $${paramCount}`);
        params.push(updates.billing_zip);
    }

    if (updates.is_default !== undefined) {
        paramCount++;
        fields.push(`is_default = $${paramCount}`);
        params.push(updates.is_default);
    }

    if (updates.is_active !== undefined) {
        paramCount++;
        fields.push(`is_active = $${paramCount}`);
        params.push(updates.is_active);
    }

    if (fields.length === 0) {
        return findPaymentMethodById(id);
    }

    paramCount++;
    fields.push(`updated_at = $${paramCount}`);
    params.push(new Date());

    paramCount++;
    const sql = `
    UPDATE payment_methods
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
    params.push(id);

    const result: QueryResult<PaymentMethod> = await pool.query(sql, params);
    return result.rows[0] || null;
};

/**
 * Set payment method as default
 * This will unset all other payment methods as default for the user
 */
export const setDefaultPaymentMethod = async (
    id: number
): Promise<PaymentMethod | null> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get the payment method to find user_id
        const getPaymentMethod = await client.query(
            'SELECT user_id FROM payment_methods WHERE id = $1',
            [id]
        );

        if (getPaymentMethod.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const user_id = getPaymentMethod.rows[0].user_id;

        // Unset all other defaults for this user
        await client.query(
            'UPDATE payment_methods SET is_default = false WHERE user_id = $1',
            [user_id]
        );

        // Set this one as default
        const result: QueryResult<PaymentMethod> = await client.query(
            `UPDATE payment_methods 
       SET is_default = true, updated_at = $1 
       WHERE id = $2 
       RETURNING *`,
            [new Date(), id]
        );

        await client.query('COMMIT');
        return result.rows[0] || null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Activate payment method
 */
export const activatePaymentMethod = async (
    id: number
): Promise<PaymentMethod | null> => {
    return updatePaymentMethod(id, { is_active: true });
};

/**
 * Deactivate payment method (soft delete)
 */
export const deactivatePaymentMethod = async (
    id: number
): Promise<PaymentMethod | null> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // If this is the default, unset it before deactivating
        const getPaymentMethod = await client.query(
            'SELECT is_default FROM payment_methods WHERE id = $1',
            [id]
        );

        if (getPaymentMethod.rows.length > 0 && getPaymentMethod.rows[0].is_default) {
            // Unset default before deactivating
            await client.query(
                'UPDATE payment_methods SET is_default = false WHERE id = $1',
                [id]
            );
        }

        // Deactivate the payment method
        const result: QueryResult<PaymentMethod> = await client.query(
            `UPDATE payment_methods 
       SET is_active = false, updated_at = $1 
       WHERE id = $2 
       RETURNING *`,
            [new Date(), id]
        );

        await client.query('COMMIT');
        return result.rows[0] || null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Delete payment method (soft delete by deactivating)
 */
export const deletePaymentMethod = async (id: number): Promise<boolean> => {
    const result = await deactivatePaymentMethod(id);
    return result !== null;
};

/**
 * Hard delete payment method (permanently remove from database)
 * Use with caution - primarily for testing
 */
export const hardDeletePaymentMethod = async (id: number): Promise<boolean> => {
    const sql = 'DELETE FROM payment_methods WHERE id = $1';
    const result: QueryResult = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};
