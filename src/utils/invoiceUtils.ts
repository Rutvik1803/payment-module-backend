/**
 * Invoice Utility Functions
 * 
 * Provides helper functions for invoice number generation,
 * formatting, status calculation, and validation.
 */

import pool from '../config/database';
import { InvoiceStatus } from '../types/invoice';
import { BadRequestError } from './errors';

/**
 * Format invoice number with date prefix and sequence
 * @param date - Date for the prefix (YYYYMMDD format)
 * @param sequence - Sequence number (5 digits)
 * @returns Formatted invoice number (e.g., INV-20260223-00001)
 */
export const formatInvoiceNumber = (date: Date, sequence: number): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const sequenceStr = String(sequence).padStart(5, '0');

    return `INV-${year}${month}${day}-${sequenceStr}`;
};

/**
 * Parse invoice number to extract date and sequence
 * @param invoiceNumber - Invoice number string
 * @returns Object with date and sequence, or null if invalid format
 */
export const parseInvoiceNumber = (invoiceNumber: string): {
    date: Date;
    sequence: number;
} | null => {
    const pattern = /^INV-(\d{4})(\d{2})(\d{2})-(\d{5})$/;
    const match = invoiceNumber.match(pattern);

    if (!match) {
        return null;
    }

    const [, year, month, day, sequence] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    return {
        date,
        sequence: parseInt(sequence),
    };
};

/**
 * Calculate invoice status based on due date and payment status
 * @param dueDate - Invoice due date
 * @param paidAmount - Amount already paid
 * @param totalAmount - Total invoice amount
 * @returns Appropriate invoice status
 */
export const calculateInvoiceStatus = (
    dueDate: Date,
    paidAmount: number,
    totalAmount: number
): InvoiceStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    // If fully paid
    if (paidAmount >= totalAmount) {
        return 'PAID';
    }

    // If partially paid
    if (paidAmount > 0) {
        return 'PARTIAL';
    }

    // If overdue (past due date and unpaid)
    if (due < today) {
        return 'OUTSTANDING';
    }

    // If due today
    if (due.getTime() === today.getTime()) {
        return 'DUE';
    }

    // If due in the future
    return 'UPCOMING';
};

/**
 * Validate invoice data before creation
 * @param data - Invoice data to validate
 * @throws ValidationError if data is invalid
 */
export const validateInvoiceData = (data: {
    userId: number;
    amount: number;
    dueDate: Date;
}): void => {
    const errors: string[] = [];

    // Validate user ID
    if (!data.userId || data.userId <= 0) {
        errors.push('Valid user ID is required');
    }

    // Validate amount
    if (!data.amount || data.amount <= 0) {
        errors.push('Invoice amount must be greater than $0');
    }

    if (data.amount > 1000000) {
        errors.push('Invoice amount cannot exceed $1,000,000');
    }

    // Validate due date
    if (!data.dueDate || !(data.dueDate instanceof Date) || isNaN(data.dueDate.getTime())) {
        errors.push('Valid due date is required');
    }

    if (errors.length > 0) {
        throw BadRequestError(`Invoice validation failed: ${errors.join(', ')}`);
    }
};

/**
 * Get the next sequence number for invoice generation
 * @param datePrefix - Date prefix for the invoice number (YYYYMMDD)
 * @returns Next available sequence number
 */
export const getNextSequenceNumber = async (datePrefix: string): Promise<number> => {
    const pattern = `INV-${datePrefix}-%`;

    const sql = `
    SELECT invoice_number 
    FROM invoices 
    WHERE invoice_number LIKE $1 
    ORDER BY invoice_number DESC 
    LIMIT 1
  `;

    const result = await pool.query(sql, [pattern]);

    // If no invoice found for this date, start at 1
    if (result.rows.length === 0) {
        return 1;
    }

    // Extract sequence from the last invoice number
    const lastInvoiceNumber = result.rows[0].invoice_number;
    const parsed = parseInvoiceNumber(lastInvoiceNumber);

    if (!parsed) {
        return 1;
    }

    return parsed.sequence + 1;
};

/**
 * Check if an invoice number already exists in the database
 * @param invoiceNumber - Invoice number to check
 * @returns True if exists, false otherwise
 */
export const invoiceNumberExists = async (invoiceNumber: string): Promise<boolean> => {
    const sql = 'SELECT COUNT(*) as count FROM invoices WHERE invoice_number = $1';
    const result = await pool.query(sql, [invoiceNumber]);
    return parseInt(result.rows[0].count) > 0;
};

/**
 * Generate a unique invoice number with collision handling
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns Unique invoice number
 * @throws Error if unable to generate unique number after retries
 */
export const generateUniqueInvoiceNumber = async (maxRetries: number = 5): Promise<string> => {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const sequence = await getNextSequenceNumber(datePrefix);
        const invoiceNumber = formatInvoiceNumber(today, sequence);

        // Check if this number already exists
        const exists = await invoiceNumberExists(invoiceNumber);

        if (!exists) {
            return invoiceNumber;
        }

        // If exists, try next sequence number
        // (This handles race conditions where multiple invoices are created simultaneously)
    }

    // If we couldn't generate a unique number after retries, add random suffix
    const sequence = await getNextSequenceNumber(datePrefix);
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `${formatInvoiceNumber(today, sequence)}-${randomSuffix}`;
};

/**
 * Format currency amount for display
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};

/**
 * Calculate days until due date
 * @param dueDate - Invoice due date
 * @returns Number of days (negative if overdue)
 */
export const daysUntilDue = (dueDate: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};
