import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as UserModel from '../models/User';
import { RegisterDTO, LoginDTO, AuthResponse, JWTPayload } from '../types/auth';
import { sanitizeUser } from '../utils/userUtils';
import {
    BadRequestError,
    UnauthorizedError,
    ConflictError,
    NotFoundError
} from '../utils/errors';
import { query } from '../utils/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

/**
 * Register a new user
 */
export const register = async (registerData: RegisterDTO): Promise<AuthResponse> => {
    const { email, password, first_name, last_name, role = 'student' } = registerData;

    // Validate input
    if (!email || !password || !first_name || !last_name) {
        throw BadRequestError('All fields are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw BadRequestError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
        throw BadRequestError('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await UserModel.findUserByEmail(email.toLowerCase());
    if (existingUser) {
        throw ConflictError('Email already registered');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await UserModel.createUser({
        email: email.toLowerCase(),
        password_hash,
        first_name,
        last_name,
        role,
    });

    // Generate token
    const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    return {
        user: sanitizeUser(user),
        token,
    };
};

/**
 * Login user
 */
export const login = async (loginData: LoginDTO): Promise<AuthResponse> => {
    const { email, password } = loginData;

    // Validate input
    if (!email || !password) {
        throw BadRequestError('Email and password are required');
    }

    // Find user
    const user = await UserModel.findUserByEmail(email.toLowerCase());
    if (!user) {
        throw UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        throw UnauthorizedError('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    return {
        user: sanitizeUser(user),
        token,
    };
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        throw UnauthorizedError('Invalid or expired token');
    }
};

/**
 * Get user by token
 */
export const getUserByToken = async (token: string): Promise<AuthResponse['user']> => {
    const decoded = verifyToken(token);

    const user = await UserModel.findUserById(decoded.userId);
    if (!user) {
        throw NotFoundError('User not found');
    }

    return sanitizeUser(user);
};

/**
 * Change password
 */
export const changePassword = async (
    userId: number,
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    // Find user
    const user = await UserModel.findUserById(userId);
    if (!user) {
        throw NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
        throw UnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
        throw BadRequestError('New password must be at least 8 characters');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update user with new password hash
    const sql = 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await query(sql, [newPasswordHash, userId]);
};

