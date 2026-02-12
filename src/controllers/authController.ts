import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { sendSuccess } from '../utils/responseFormatter';
import { RegisterDTO, LoginDTO } from '../types/auth';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
    const registerData: RegisterDTO = req.body;
    const result = await authService.register(registerData);
    sendSuccess(res, result, 'User registered successfully', 201);
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
    const loginData: LoginDTO = req.body;
    const result = await authService.login(loginData);
    sendSuccess(res, result, 'Login successful');
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
    sendSuccess(res, { user: req.user }, 'User retrieved successfully');
};
