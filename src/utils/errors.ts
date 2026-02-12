/**
 * Base API Error interface
 */
export interface ApiError extends Error {
    statusCode: number;
    isOperational: boolean;
}

/**
 * Validation Error interface
 */
export interface ValidationErrorType extends ApiError {
    errors: Record<string, string[]>;
}

/**
 * Create a base API Error
 */
export const createApiError = (
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
): ApiError => {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    error.isOperational = isOperational;
    Error.captureStackTrace(error, createApiError);
    return error;
};

/**
 * Check if error is an API Error
 */
export const isApiError = (error: any): error is ApiError => {
    return error && typeof error.statusCode === 'number' && typeof error.isOperational === 'boolean';
};

/**
 * Bad Request Error (400)
 */
export const BadRequestError = (message: string = 'Bad request'): ApiError => {
    return createApiError(message, 400);
};

/**
 * Unauthorized Error (401)
 */
export const UnauthorizedError = (message: string = 'Unauthorized'): ApiError => {
    return createApiError(message, 401);
};

/**
 * Forbidden Error (403)
 */
export const ForbiddenError = (message: string = 'Forbidden'): ApiError => {
    return createApiError(message, 403);
};

/**
 * Not Found Error (404)
 */
export const NotFoundError = (message: string = 'Resource not found'): ApiError => {
    return createApiError(message, 404);
};

/**
 * Conflict Error (409)
 */
export const ConflictError = (message: string = 'Resource conflict'): ApiError => {
    return createApiError(message, 409);
};

/**
 * Validation Error (422)
 */
export const ValidationError = (errors: Record<string, string[]>): ValidationErrorType => {
    const error = createApiError('Validation failed', 422) as ValidationErrorType;
    error.errors = errors;
    return error;
};

/**
 * Internal Server Error (500)
 */
export const InternalServerError = (message: string = 'Internal server error'): ApiError => {
    return createApiError(message, 500);
};
