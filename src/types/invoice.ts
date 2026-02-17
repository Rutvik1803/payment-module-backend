export type InvoiceStatus = 'UPCOMING' | 'DUE' | 'OUTSTANDING' | 'PARTIAL' | 'PAID';

export interface Invoice {
    id: number;
    user_id: number;
    payment_plan_id: number | null;
    invoice_number: string;
    amount: number;
    paid_amount: number;
    status: InvoiceStatus;
    due_date: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreateInvoiceDTO {
    user_id: number;
    invoice_number: string;
    amount: number;
    due_date: Date;
    payment_plan_id?: number | null;
}

export interface UpdateInvoiceDTO {
    amount?: number;
    paid_amount?: number;
    status?: InvoiceStatus;
    due_date?: Date;
    payment_plan_id?: number | null;
}

export interface InvoiceFilters {
    user_id?: number;
    payment_plan_id?: number;
    status?: InvoiceStatus;
    start_date?: Date;
    end_date?: Date;
}
