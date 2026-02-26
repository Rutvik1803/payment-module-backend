import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { sendSuccess } from '../utils/responseFormatter';
import { BadRequestError } from '../utils/errors';

/**
 * Get all users with optional role filter
 */
export const getAllUsers = async (req: Request, res: Response) => {
    const { role } = req.query;

    const filters = role ? { role: role as string } : undefined;
    const users = await userService.getAllUsers(filters);

    sendSuccess(res, users, 'Users retrieved successfully');
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id as string, 10);

    if (isNaN(userId)) {
        throw BadRequestError('Invalid user ID');
    }

    const user = await userService.getUserById(userId);

    sendSuccess(res, user, 'User retrieved successfully');
};
