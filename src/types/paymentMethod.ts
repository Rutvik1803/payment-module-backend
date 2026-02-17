/**
 * Payment Method Type Definitions
 */

export type PaymentMethodType = 'CARD' | 'ACH' | 'CASH' | 'CHECK';
export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER';

/**
 * Payment Method Interface
 */
export interface PaymentMethod {
    id: number;
    user_id: number;
    payment_method_type: PaymentMethodType;
    last_four: string;
    card_brand: CardBrand | null;
    token: string;
    expiry_month: number | null;
    expiry_year: number | null;
    billing_zip: string | null;
    is_default: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

/**
 * Create Payment Method DTO
 */
export interface CreatePaymentMethodDTO {
    user_id: number;
    payment_method_type: PaymentMethodType;
    last_four: string;
    token: string;
    card_brand?: CardBrand | null;
    expiry_month?: number | null;
    expiry_year?: number | null;
    billing_zip?: string | null;
    is_default?: boolean;
}

/**
 * Update Payment Method DTO
 */
export interface UpdatePaymentMethodDTO {
    last_four?: string;
    card_brand?: CardBrand | null;
    expiry_month?: number | null;
    expiry_year?: number | null;
    billing_zip?: string | null;
    is_default?: boolean;
    is_active?: boolean;
}

/**
 * Payment Method Filters
 */
export interface PaymentMethodFilters {
    user_id?: number;
    payment_method_type?: PaymentMethodType;
    card_brand?: CardBrand;
    is_default?: boolean;
    is_active?: boolean;
}
