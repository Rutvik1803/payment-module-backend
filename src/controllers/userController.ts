import { Request, Response } from 'express';
import { findAllUsers, findUserById } from '../models/User';
import { sendSuccess } from '../utils/responseFormatter';

/**
 * Get all users with optional role filter
 */
export const getAllUsers = async (req: Request, res: Response) => {
    const { role } = req.query;
    
    const filters = role ? { role: role as string } : undefined;
    const users = await findAllUsers(filters);
    
    // Remove password_hash from response
    const sanitizedUsers = users.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
    
    sendSuccess(res, sanitizedUsers, 'Users retrieved successfully');
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id as string, 10);
    
    const user = await findUserById(userId);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'Not found',
            message: 'User not found',
            statusCode: 404,
        });
    }
    
    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;
    
    sendSuccess(res, userWithoutPassword, 'User retrieved successfully');
};
