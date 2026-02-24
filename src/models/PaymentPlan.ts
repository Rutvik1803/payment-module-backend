import { QueryResult } from 'pg';
import pool from '../config/database';
import {
    PaymentPlan,
    CreatePaymentPlanDTO,
    UpdatePaymentPlanDTO,
    PaymentPlanFilters
} from '../types/paymentPlan';

/**
 * Create a new payment plan
 */
export const createPaymentPlan = async (
    data: CreatePaymentPlanDTO
): Promise<PaymentPlan> => {
    const {
        user_id,
        total_amount,
        type,
        number_of_installments = null,
        start_date = new Date()
    } = data;

    const sql = `
    INSERT INTO payment_plans (
      user_id, 
      total_amount, 
      paid_amount, 
      remaining_amount,
      status, 
      type, 
      number_of_installments, 
      start_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

    const values = [
        user_id,
        total_amount,
        0, // paid_amount starts at 0
        total_amount, // remaining_amount initially equals total_amount
        'ACTIVE',
        type,
        number_of_installments,
        start_date
    ];

    const result: QueryResult<PaymentPlan> = await pool.query(sql, values);
    return result.rows[0];
};

/**
 * Find payment plan by ID
 */
export const findPaymentPlanById = async (
    id: number
): Promise<PaymentPlan | null> => {
    const sql = 'SELECT * FROM payment_plans WHERE id = $1';
    const result: QueryResult<PaymentPlan> = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find all payment plans for a specific user
 */
export const findPaymentPlansByUserId = async (
    user_id: number
): Promise<PaymentPlan[]> => {
    const sql = 'SELECT * FROM payment_plans WHERE user_id = $1 ORDER BY created_at DESC';
    const result: QueryResult<PaymentPlan> = await pool.query(sql, [user_id]);
    return result.rows;
};

/**
 * Find all payment plans with optional filters
 */
export const findAllPaymentPlans = async (
    filters?: PaymentPlanFilters
): Promise<PaymentPlan[]> => {
    let sql = `
        SELECT 
            pp.*,
            json_build_object(
                'id', u.id,
                'email', u.email,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'role', u.role
            ) as user
        FROM payment_plans pp
        LEFT JOIN users u ON pp.user_id = u.id
        WHERE 1=1
    `;
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.user_id) {
        sql += ` AND pp.user_id = $${paramCount}`;
        values.push(filters.user_id);
        paramCount++;
    }

    if (filters?.status) {
        sql += ` AND pp.status = $${paramCount}`;
        values.push(filters.status);
        paramCount++;
    }

    if (filters?.type) {
        sql += ` AND pp.type = $${paramCount}`;
        values.push(filters.type);
        paramCount++;
    }

    sql += ' ORDER BY created_at DESC';

    const result: QueryResult<PaymentPlan> = await pool.query(sql, values);
    return result.rows;
};

/**
 * Update payment plan
 */
export const updatePaymentPlan = async (
    id: number,
    updates: UpdatePaymentPlanDTO
): Promise<PaymentPlan | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

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

    if (updates.number_of_installments !== undefined) {
        fields.push(`number_of_installments = $${paramCount}`);
        values.push(updates.number_of_installments);
        paramCount++;
    }

    if (updates.start_date !== undefined) {
        fields.push(`start_date = $${paramCount}`);
        values.push(updates.start_date);
        paramCount++;
    }

    if (fields.length === 0) {
        return findPaymentPlanById(id);
    }

    fields.push(`updated_at = NOW()`);

    // If paid_amount is updated, recalculate remaining_amount
    if (updates.paid_amount !== undefined) {
        fields.push(`remaining_amount = total_amount - $${paramCount}`);
        values.push(updates.paid_amount);
        paramCount++;
    }

    values.push(id);

    const sql = `
    UPDATE payment_plans
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

    const result: QueryResult<PaymentPlan> = await pool.query(sql, values);
    return result.rows[0] || null;
};

/**
 * Update paid amount and recalculate remaining amount
 */
export const updatePaidAmount = async (
    id: number,
    additionalAmount: number
): Promise<PaymentPlan | null> => {
    const sql = `
    UPDATE payment_plans
    SET 
      paid_amount = paid_amount + $1,
      remaining_amount = total_amount - (paid_amount + $1),
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

    const result: QueryResult<PaymentPlan> = await pool.query(sql, [additionalAmount, id]);
    return result.rows[0] || null;
};

/**
 * Update payment plan status
 */
export const updatePaymentPlanStatus = async (
    id: number,
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
): Promise<PaymentPlan | null> => {
    const sql = `
    UPDATE payment_plans
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

    const result: QueryResult<PaymentPlan> = await pool.query(sql, [status, id]);
    return result.rows[0] || null;
};

/**
 * Mark payment plan as completed if fully paid
 */
export const checkAndCompletePaymentPlan = async (
    id: number
): Promise<PaymentPlan | null> => {
    const sql = `
    UPDATE payment_plans
    SET status = 'COMPLETED', updated_at = NOW()
    WHERE id = $1 AND remaining_amount <= 0 AND status = 'ACTIVE'
    RETURNING *
  `;

    const result: QueryResult<PaymentPlan> = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Delete payment plan (soft delete by marking as cancelled)
 */
export const deletePaymentPlan = async (id: number): Promise<boolean> => {
    const sql = `
    UPDATE payment_plans
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE id = $1
  `;

    const result: QueryResult = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};

/**
 * Hard delete payment plan (for testing only)
 */
export const hardDeletePaymentPlan = async (id: number): Promise<boolean> => {
    const sql = 'DELETE FROM payment_plans WHERE id = $1';
    const result: QueryResult = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};
