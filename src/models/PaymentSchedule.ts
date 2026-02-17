/**
 * Payment Schedule Model
 * 
 * Handles all database operations for payment schedules.
 * Uses function-based exports following the established pattern.
 */

import pool from '../config/database';
import { QueryResult } from 'pg';
import {
    PaymentSchedule,
    CreatePaymentScheduleDTO,
    UpdatePaymentScheduleDTO,
    PaymentScheduleFilters,
    GenerateScheduleParams,
    GenerateScheduleResult,
    PaymentFrequency,
    PaymentScheduleStatus
} from '../types/paymentSchedule';

/**
 * Create a single payment schedule
 */
export const createPaymentSchedule = async (
    data: CreatePaymentScheduleDTO
): Promise<PaymentSchedule> => {
    const { payment_plan_id, installment_number, amount, due_date, status = 'PENDING' } = data;

    const sql = `
    INSERT INTO payment_schedules 
      (payment_plan_id, installment_number, amount, due_date, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

    const result: QueryResult<PaymentSchedule> = await pool.query(sql, [
        payment_plan_id,
        installment_number,
        amount,
        due_date,
        status
    ]);

    return result.rows[0];
};

/**
 * Create multiple payment schedules in a transaction
 */
export const createPaymentSchedules = async (
    schedules: CreatePaymentScheduleDTO[]
): Promise<PaymentSchedule[]> => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const createdSchedules: PaymentSchedule[] = [];

        for (const schedule of schedules) {
            const sql = `
        INSERT INTO payment_schedules 
          (payment_plan_id, installment_number, amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

            const result: QueryResult<PaymentSchedule> = await client.query(sql, [
                schedule.payment_plan_id,
                schedule.installment_number,
                schedule.amount,
                schedule.due_date,
                schedule.status || 'PENDING'
            ]);

            createdSchedules.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return createdSchedules;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Generate payment schedules for a payment plan
 */
export const generatePaymentSchedules = async (
    params: GenerateScheduleParams
): Promise<GenerateScheduleResult> => {
    const { payment_plan_id, total_amount, number_of_installments, start_date, frequency } = params;

    // Calculate installment amount (distribute evenly)
    const baseAmount = Math.floor((total_amount * 100) / number_of_installments) / 100;
    const remainder = total_amount - (baseAmount * number_of_installments);

    // Calculate days between installments based on frequency
    const daysMap: Record<PaymentFrequency, number> = {
        WEEKLY: 7,
        BI_WEEKLY: 14,
        MONTHLY: 30,
        CUSTOM: 30 // Default to monthly
    };

    const daysBetween = daysMap[frequency];

    // Generate schedule data
    const schedulesToCreate: CreatePaymentScheduleDTO[] = [];
    let currentDate = new Date(start_date);

    for (let i = 1; i <= number_of_installments; i++) {
        // Last installment gets any remainder
        const installmentAmount = i === number_of_installments
            ? baseAmount + remainder
            : baseAmount;

        schedulesToCreate.push({
            payment_plan_id,
            installment_number: i,
            amount: installmentAmount,
            due_date: new Date(currentDate),
            status: 'PENDING'
        });

        // Move to next due date
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + daysBetween);
    }

    // Create all schedules in a transaction
    const schedules = await createPaymentSchedules(schedulesToCreate);

    return {
        schedules,
        total_schedules: schedules.length,
        total_amount
    };
};

/**
 * Find payment schedule by ID
 */
export const findPaymentScheduleById = async (
    id: number
): Promise<PaymentSchedule | null> => {
    const sql = 'SELECT * FROM payment_schedules WHERE id = $1';
    const result: QueryResult<PaymentSchedule> = await pool.query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find all payment schedules for a payment plan
 */
export const findPaymentSchedulesByPlanId = async (
    payment_plan_id: number
): Promise<PaymentSchedule[]> => {
    const sql = `
    SELECT * FROM payment_schedules 
    WHERE payment_plan_id = $1 
    ORDER BY installment_number ASC
  `;
    const result: QueryResult<PaymentSchedule> = await pool.query(sql, [payment_plan_id]);
    return result.rows;
};

/**
 * Find payment schedules by invoice ID
 */
export const findPaymentSchedulesByInvoiceId = async (
    invoice_id: number
): Promise<PaymentSchedule[]> => {
    const sql = `
    SELECT * FROM payment_schedules 
    WHERE invoice_id = $1 
    ORDER BY installment_number ASC
  `;
    const result: QueryResult<PaymentSchedule> = await pool.query(sql, [invoice_id]);
    return result.rows;
};

/**
 * Find all payment schedules with optional filters
 */
export const findAllPaymentSchedules = async (
    filters?: PaymentScheduleFilters
): Promise<PaymentSchedule[]> => {
    let sql = 'SELECT * FROM payment_schedules WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (filters) {
        if (filters.payment_plan_id !== undefined) {
            sql += ` AND payment_plan_id = $${paramCount}`;
            values.push(filters.payment_plan_id);
            paramCount++;
        }

        if (filters.status) {
            sql += ` AND status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }

        if (filters.invoice_id !== undefined) {
            sql += ` AND invoice_id = $${paramCount}`;
            values.push(filters.invoice_id);
            paramCount++;
        }

        if (filters.due_date_from) {
            sql += ` AND due_date >= $${paramCount}`;
            values.push(filters.due_date_from);
            paramCount++;
        }

        if (filters.due_date_to) {
            sql += ` AND due_date <= $${paramCount}`;
            values.push(filters.due_date_to);
            paramCount++;
        }

        if (filters.installment_number !== undefined) {
            sql += ` AND installment_number = $${paramCount}`;
            values.push(filters.installment_number);
            paramCount++;
        }
    }

    sql += ' ORDER BY due_date ASC, installment_number ASC';

    const result: QueryResult<PaymentSchedule> = await pool.query(sql, values);
    return result.rows;
};

/**
 * Update payment schedule
 */
export const updatePaymentSchedule = async (
    id: number,
    updates: UpdatePaymentScheduleDTO
): Promise<PaymentSchedule | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.amount !== undefined) {
        fields.push(`amount = $${paramCount}`);
        values.push(updates.amount);
        paramCount++;
    }

    if (updates.due_date !== undefined) {
        fields.push(`due_date = $${paramCount}`);
        values.push(updates.due_date);
        paramCount++;
    }

    if (updates.status !== undefined) {
        fields.push(`status = $${paramCount}`);
        values.push(updates.status);
        paramCount++;
    }

    if (updates.paid_date !== undefined) {
        fields.push(`paid_date = $${paramCount}`);
        values.push(updates.paid_date);
        paramCount++;
    }

    if (updates.invoice_id !== undefined) {
        fields.push(`invoice_id = $${paramCount}`);
        values.push(updates.invoice_id);
        paramCount++;
    }

    if (fields.length === 0) {
        const existing = await findPaymentScheduleById(id);
        return existing;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
    UPDATE payment_schedules 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

    values.push(id);

    const result: QueryResult<PaymentSchedule> = await pool.query(sql, values);
    return result.rows[0] || null;
};

/**
 * Mark schedule as paid
 */
export const markScheduleAsPaid = async (
    id: number,
    paid_date: Date = new Date(),
    invoice_id?: number
): Promise<PaymentSchedule | null> => {
    const updates: UpdatePaymentScheduleDTO = {
        status: 'PAID',
        paid_date
    };

    if (invoice_id) {
        updates.invoice_id = invoice_id;
    }

    return updatePaymentSchedule(id, updates);
};

/**
 * Mark schedule as overdue
 */
export const markScheduleAsOverdue = async (
    id: number
): Promise<PaymentSchedule | null> => {
    return updatePaymentSchedule(id, { status: 'OVERDUE' });
};

/**
 * Cancel schedule
 */
export const cancelSchedule = async (
    id: number
): Promise<PaymentSchedule | null> => {
    return updatePaymentSchedule(id, { status: 'CANCELLED' });
};

/**
 * Update schedule status based on due date
 */
export const updateScheduleStatus = async (
    id: number
): Promise<PaymentSchedule | null> => {
    const schedule = await findPaymentScheduleById(id);

    if (!schedule) {
        return null;
    }

    // Don't update if already paid or cancelled
    if (schedule.status === 'PAID' || schedule.status === 'CANCELLED') {
        return schedule;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(schedule.due_date);
    dueDate.setHours(0, 0, 0, 0);

    // If past due date and not paid, mark as overdue
    if (dueDate < today && schedule.status === 'PENDING') {
        return markScheduleAsOverdue(id);
    }

    return schedule;
};

/**
 * Get overdue schedules
 */
export const getOverdueSchedules = async (): Promise<PaymentSchedule[]> => {
    const sql = `
    SELECT * FROM payment_schedules 
    WHERE status IN ('PENDING', 'OVERDUE') 
      AND due_date < CURRENT_DATE
    ORDER BY due_date ASC
  `;

    const result: QueryResult<PaymentSchedule> = await pool.query(sql);
    return result.rows;
};

/**
 * Get upcoming schedules (due within X days)
 */
export const getUpcomingSchedules = async (
    days: number = 7
): Promise<PaymentSchedule[]> => {
    const sql = `
    SELECT * FROM payment_schedules 
    WHERE status = 'PENDING' 
      AND due_date >= CURRENT_DATE 
      AND due_date <= CURRENT_DATE + INTERVAL '1 day' * $1
    ORDER BY due_date ASC
  `;

    const result: QueryResult<PaymentSchedule> = await pool.query(sql, [days]);
    return result.rows;
};

/**
 * Delete payment schedule (hard delete)
 */
export const deletePaymentSchedule = async (
    id: number
): Promise<boolean> => {
    const sql = 'DELETE FROM payment_schedules WHERE id = $1';
    const result: QueryResult = await pool.query(sql, [id]);
    return (result.rowCount || 0) > 0;
};

/**
 * Link schedule to invoice
 */
export const linkScheduleToInvoice = async (
    schedule_id: number,
    invoice_id: number
): Promise<PaymentSchedule | null> => {
    return updatePaymentSchedule(schedule_id, { invoice_id });
};
