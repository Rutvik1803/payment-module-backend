/**
 * Transaction Type Definitions
 */

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
export type TransactionType = 'PAYMENT' | 'REFUND';
export type PaymentMethodType = 'CARD' | 'ACH' | 'CASH' | 'CHECK';

/**
 * Transaction Interface
 */
export interface Transaction {
    id: number;
    user_id: number;
    invoice_id: number | null;
    payment_plan_id: number | null;
    amount: number;
    status: TransactionStatus;
    type: TransactionType;
    payment_method: PaymentMethodType;
    gateway_transaction_id: string | null;
    gateway_response: any | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}

/**
 * Create Transaction DTO
 */
export interface CreateTransactionDTO {
    user_id: number;
    invoice_id?: number | null;
    payment_plan_id?: number | null;
    amount: number;
    type: TransactionType;
    payment_method: PaymentMethodType;
    gateway_transaction_id?: string | null;
    gateway_response?: any | null;
    notes?: string | null;
    status?: TransactionStatus;
}

/**
 * Update Transaction DTO
 */
export interface UpdateTransactionDTO {
    status?: TransactionStatus;
    gateway_transaction_id?: string | null;
    gateway_response?: any | null;
    notes?: string | null;
}

/**
 * Transaction Filters
 */
export interface TransactionFilters {
    user_id?: number;
    invoice_id?: number;
    payment_plan_id?: number;
    status?: TransactionStatus;
    type?: TransactionType;
    payment_method?: PaymentMethodType;
    start_date?: Date;
    end_date?: Date;
}

/**
 * Transaction Statistics
 */
export interface TransactionStats {
    total_transactions: number;
    total_amount: number;
    completed_count: number;
    completed_amount: number;
    pending_count: number;
    pending_amount: number;
    failed_count: number;
    failed_amount: number;
    refunded_count: number;
    refunded_amount: number;
}
