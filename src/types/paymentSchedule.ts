/**
 * Payment Schedule Types
 * 
 * Defines types and interfaces for payment schedule management.
 * Payment schedules track individual installments for payment plans.
 */

/**
 * Payment schedule status enum
 */
export type PaymentScheduleStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

/**
 * Payment frequency for generating schedules
 */
export type PaymentFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'CUSTOM';

/**
 * Payment Schedule interface
 */
export interface PaymentSchedule {
    id: number;
    payment_plan_id: number;
    installment_number: number;
    amount: number;
    due_date: Date;
    status: PaymentScheduleStatus;
    paid_date: Date | null;
    invoice_id: number | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * DTO for creating a single payment schedule
 */
export interface CreatePaymentScheduleDTO {
    payment_plan_id: number;
    installment_number: number;
    amount: number;
    due_date: Date;
    status?: PaymentScheduleStatus;
}

/**
 * DTO for updating a payment schedule
 */
export interface UpdatePaymentScheduleDTO {
    amount?: number;
    due_date?: Date;
    status?: PaymentScheduleStatus;
    paid_date?: Date | null;
    invoice_id?: number | null;
}

/**
 * Filter options for querying payment schedules
 */
export interface PaymentScheduleFilters {
    payment_plan_id?: number;
    status?: PaymentScheduleStatus;
    invoice_id?: number;
    due_date_from?: Date;
    due_date_to?: Date;
    installment_number?: number;
}

/**
 * Parameters for auto-generating payment schedules
 */
export interface GenerateScheduleParams {
    payment_plan_id: number;
    total_amount: number;
    number_of_installments: number;
    start_date: Date;
    frequency: PaymentFrequency;
}

/**
 * Result of schedule generation
 */
export interface GenerateScheduleResult {
    schedules: PaymentSchedule[];
    total_schedules: number;
    total_amount: number;
}

/**
 * Payment schedule statistics
 */
export interface PaymentScheduleStats {
    total_schedules: number;
    pending_count: number;
    paid_count: number;
    overdue_count: number;
    cancelled_count: number;
    total_pending_amount: number;
    total_paid_amount: number;
    total_overdue_amount: number;
}
