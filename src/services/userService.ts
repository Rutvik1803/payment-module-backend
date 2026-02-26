/**
 * User Service
 * 
 * Business logic layer for user operations.
 * Acts as intermediary between controllers and models.
 */

import {
    findAllUsers,
    findUserById,
    findUserByEmail,
    updateUser,
    deleteUser,
} from '../models/User';
import { User, UpdateUserDTO, UserResponse } from '../types/user';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { sanitizeUser } from '../utils/userUtils';

/**
 * Get all users with optional role filter
 */
export const getAllUsers = async (filters?: { role?: string }): Promise<UserResponse[]> => {
    const users = await findAllUsers(filters);

    // Remove password_hash from all users
    return users.map(user => sanitizeUser(user));
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<UserResponse> => {
    const user = await findUserById(userId);

    if (!user) {
        throw NotFoundError(`User with ID ${userId} not found`);
    }

    return sanitizeUser(user);
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<UserResponse> => {
    const user = await findUserByEmail(email);

    if (!user) {
        throw NotFoundError(`User with email ${email} not found`);
    }

    return sanitizeUser(user);
};

/**
 * Update user information
 */
export const updateUserInfo = async (
    userId: number,
    updates: UpdateUserDTO
): Promise<UserResponse> => {
    // Verify user exists
    const existingUser = await findUserById(userId);
    if (!existingUser) {
        throw NotFoundError(`User with ID ${userId} not found`);
    }

    // Validate email if being updated
    if (updates.email && updates.email !== existingUser.email) {
        const emailExists = await findUserByEmail(updates.email);
        if (emailExists) {
            throw BadRequestError('Email already in use');
        }
    }

    const updatedUser = await updateUser(userId, updates);
    if (!updatedUser) {
        throw BadRequestError('Failed to update user');
    }

    return sanitizeUser(updatedUser);
};

/**
 * Delete user
 */
export const deleteUserById = async (userId: number): Promise<boolean> => {
    const user = await findUserById(userId);
    if (!user) {
        throw NotFoundError(`User with ID ${userId} not found`);
    }

    return await deleteUser(userId);
};

export default {
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUserInfo,
    deleteUserById,
};
