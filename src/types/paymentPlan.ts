export type PaymentPlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type PaymentPlanType = 'ONE_TIME' | 'INSTALLMENT';

export interface PaymentPlan {
    id: number;
    user_id: number;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: PaymentPlanStatus;
    type: PaymentPlanType;
    number_of_installments: number | null;
    start_date: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreatePaymentPlanDTO {
    user_id: number;
    total_amount: number;
    type: PaymentPlanType;
    number_of_installments?: number;
    start_date?: Date;
}

export interface UpdatePaymentPlanDTO {
    paid_amount?: number;
    status?: PaymentPlanStatus;
    number_of_installments?: number;
    start_date?: Date;
}

export interface PaymentPlanFilters {
    user_id?: number;
    status?: PaymentPlanStatus;
    type?: PaymentPlanType;
}
