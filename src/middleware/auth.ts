import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserResponse } from '../types/user';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: UserResponse;
        }
    }
}

/**
 * Verify JWT token middleware
 * Extracts token from Authorization header, verifies it, and attaches user to request
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw UnauthorizedError('No token provided');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token and get user
        const user = await authService.getUserByToken(token);

        // Attach user to request
        req.user = user;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Require admin role middleware
 * Must be used after authenticate middleware
 */
export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return next(UnauthorizedError('Authentication required'));
    }

    if (req.user.role !== 'admin') {
        return next(ForbiddenError('Admin access required'));
    }

    next();
};

/**
 * Require student role middleware
 * Must be used after authenticate middleware
 */
export const requireStudent = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return next(UnauthorizedError('Authentication required'));
    }

    if (req.user.role !== 'student') {
        return next(ForbiddenError('Student access required'));
    }

    next();
};

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't fail if missing or invalid
 * Useful for endpoints that change behavior based on authentication status
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const user = await authService.getUserByToken(token);
            req.user = user;
        }

        next();
    } catch (error) {
        // Don't fail if token invalid for optional auth
        next();
    }
};
