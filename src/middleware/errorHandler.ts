import { Request, Response, NextFunction } from 'express';
import { ApiError, ValidationErrorType, isApiError } from '../utils/errors';
import { ErrorResponse } from '../types/api';

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log error
    console.error('Error:', {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
    });

    // Handle API errors
    if (isApiError(err)) {
        const apiError = err as ApiError;

        // Handle validation errors
        if ('errors' in apiError) {
            const validationError = apiError as ValidationErrorType;
            return res.status(validationError.statusCode).json({
                success: false,
                error: validationError.message,
                message: validationError.message,
                statusCode: validationError.statusCode,
                errors: validationError.errors,
            });
        }

        const response: ErrorResponse = {
            success: false,
            error: apiError.message,
            message: apiError.message,
            statusCode: apiError.statusCode,
        };

        return res.status(apiError.statusCode).json(response);
    }

    // Handle unexpected errors
    const response: ErrorResponse = {
        success: false,
        error: 'Internal server error',
        message: err.message || 'An unexpected error occurred',
        statusCode: 500,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    };

    return res.status(500).json(response);
};

/**
 * Not found handler middleware
 */
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const response: ErrorResponse = {
        success: false,
        error: 'Not found',
        message: `Cannot ${req.method} ${req.url}`,
        statusCode: 404,
    };

    return res.status(404).json(response);
};
