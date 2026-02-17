/**
 * Invoice Fee Type Definitions
 * Types of fees that can be added to invoices
 */

/**
 * Types of fees that can be added to invoices
 */
export type InvoiceFeeType =
    | 'LATE_FEE'           // Fee for late payment
    | 'PROCESSING_FEE'     // Fee for processing the payment
    | 'PENALTY'            // Penalty fee
    | 'SERVICE_CHARGE'     // Service charge fee
    | 'NSF_FEE'            // Non-sufficient funds fee
    | 'CUSTOM_FEE'         // Custom fee defined by admin
    | 'OTHER';             // Other fee type

/**
 * Invoice Fee entity
 */
export interface InvoiceFee {
    id: number;
    invoice_id: number;
    type: InvoiceFeeType;
    amount: number;
    description?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

/**
 * DTO for creating an invoice fee
 */
export interface CreateInvoiceFeeDTO {
    invoice_id: number;
    type: InvoiceFeeType;
    amount: number;
    description?: string;
}

/**
 * DTO for updating an invoice fee
 */
export interface UpdateInvoiceFeeDTO {
    type?: InvoiceFeeType;
    amount?: number;
    description?: string;
    is_active?: boolean;
}

/**
 * Filters for querying invoice fees
 */
export interface InvoiceFeeFilters {
    invoice_id?: number;
    type?: InvoiceFeeType;
    is_active?: boolean;
    min_amount?: number;
    max_amount?: number;
}

/**
 * Fee summary for an invoice
 */
export interface InvoiceFeeSummary {
    invoice_id: number;
    total_fees: number;
    fee_count: number;
    fees_by_type: {
        type: InvoiceFeeType;
        amount: number;
        count: number;
    }[];
}
