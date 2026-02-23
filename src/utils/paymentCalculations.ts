/**
 * Payment Calculations Utility
 * 
 * Pure functions for payment-related calculations.
 * No database access - only mathematical operations.
 */

/**
 * Calculate installment amounts for equal distribution
 * Handles remainder by adding it to the last installment
 */
export const calculateEqualInstallments = (
    totalAmount: number,
    numberOfInstallments: number
): number[] => {
    if (numberOfInstallments <= 0) {
        throw new Error('Number of installments must be greater than 0');
    }

    if (totalAmount <= 0) {
        throw new Error('Total amount must be greater than 0');
    }

    // Convert to cents to avoid floating point issues
    const totalCents = Math.round(totalAmount * 100);
    const baseAmountCents = Math.floor(totalCents / numberOfInstallments);
    const remainderCents = totalCents % numberOfInstallments;

    const installments: number[] = [];

    for (let i = 0; i < numberOfInstallments; i++) {
        // Add remainder to the last installment
        const amountCents = i === numberOfInstallments - 1
            ? baseAmountCents + remainderCents
            : baseAmountCents;

        // Convert back to dollars
        installments.push(amountCents / 100);
    }

    return installments;
};

/**
 * Calculate due dates for installments
 * Defaults to monthly (30-day intervals)
 */
export const calculateDueDates = (
    startDate: Date,
    numberOfInstallments: number,
    intervalDays: number = 30
): Date[] => {
    if (numberOfInstallments <= 0) {
        throw new Error('Number of installments must be greater than 0');
    }

    const dueDates: Date[] = [];
    const baseDate = new Date(startDate);

    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(baseDate.getDate() + (i * intervalDays));
        dueDates.push(dueDate);
    }

    return dueDates;
};

/**
 * Calculate monthly due dates (handles month-end edge cases)
 * Example: Jan 31 -> Feb 28/29, Mar 31, etc.
 */
export const calculateMonthlyDueDates = (
    startDate: Date,
    numberOfInstallments: number
): Date[] => {
    if (numberOfInstallments <= 0) {
        throw new Error('Number of installments must be greater than 0');
    }

    const dueDates: Date[] = [];
    const baseDate = new Date(startDate);
    const dayOfMonth = baseDate.getDate();

    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + i);

        // Handle month-end edge cases
        // If original day doesn't exist in this month, use last day of month
        const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate();
        if (dayOfMonth > lastDayOfMonth) {
            dueDate.setDate(lastDayOfMonth);
        } else {
            dueDate.setDate(dayOfMonth);
        }

        dueDates.push(dueDate);
    }

    return dueDates;
};

/**
 * Validate payment plan parameters
 */
export const validatePaymentPlanParams = (
    totalAmount: number,
    numberOfInstallments: number,
    type: 'ONE_TIME' | 'INSTALLMENT'
): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Minimum amount validation
    const MIN_AMOUNT = 1.00;
    if (totalAmount < MIN_AMOUNT) {
        errors.push(`Total amount must be at least $${MIN_AMOUNT.toFixed(2)}`);
    }

    // Maximum amount validation (optional, can be configured)
    const MAX_AMOUNT = 1000000.00; // $1 million
    if (totalAmount > MAX_AMOUNT) {
        errors.push(`Total amount cannot exceed $${MAX_AMOUNT.toLocaleString()}`);
    }

    // Type-specific validations
    if (type === 'ONE_TIME') {
        if (numberOfInstallments !== 1) {
            errors.push('ONE_TIME payment plans must have exactly 1 installment');
        }
    } else if (type === 'INSTALLMENT') {
        const MIN_INSTALLMENTS = 2;
        const MAX_INSTALLMENTS = 12;

        if (numberOfInstallments < MIN_INSTALLMENTS) {
            errors.push(`INSTALLMENT plans must have at least ${MIN_INSTALLMENTS} installments`);
        }

        if (numberOfInstallments > MAX_INSTALLMENTS) {
            errors.push(`INSTALLMENT plans cannot exceed ${MAX_INSTALLMENTS} installments`);
        }

        // Minimum installment amount
        const MIN_INSTALLMENT_AMOUNT = 1.00;
        const installmentAmount = totalAmount / numberOfInstallments;
        if (installmentAmount < MIN_INSTALLMENT_AMOUNT) {
            errors.push(`Each installment must be at least $${MIN_INSTALLMENT_AMOUNT.toFixed(2)}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

/**
 * Calculate total with processing fee (if applicable)
 * Fee is typically a percentage + fixed amount
 */
export const calculateTotalWithFee = (
    amount: number,
    feePercentage: number = 0,
    fixedFee: number = 0
): number => {
    const percentageFee = amount * (feePercentage / 100);
    const total = amount + percentageFee + fixedFee;

    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
};

/**
 * Validate start date (cannot be in the past)
 */
export const validateStartDate = (
    startDate: Date,
    allowToday: boolean = true
): { valid: boolean; error?: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const providedDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    if (allowToday) {
        if (providedDate < today) {
            return {
                valid: false,
                error: 'Start date cannot be in the past',
            };
        }
    } else {
        if (providedDate <= today) {
            return {
                valid: false,
                error: 'Start date must be in the future',
            };
        }
    }

    return { valid: true };
};
