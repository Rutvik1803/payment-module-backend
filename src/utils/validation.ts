/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Sanitize email (lowercase, trim)
 */
export const sanitizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
};

/**
 * Validate required fields
 */
export const validateRequired = (
    data: Record<string, any>,
    requiredFields: string[]
): { valid: boolean; missing: string[] } => {
    const missing = requiredFields.filter(field => !data[field]);
    return {
        valid: missing.length === 0,
        missing,
    };
};
