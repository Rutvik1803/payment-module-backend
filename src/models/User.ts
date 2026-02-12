import { QueryResult } from 'pg';
import { query } from '../utils/db';
import { User, UpdateUserDTO } from '../types/user';

/**
 * User Model - Function-based approach
 * Handles all database operations related to users
 */

/**
 * Create a new user
 */
export const createUser = async (
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'>
): Promise<User> => {
    const sql = `
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

    const values = [
        userData.email,
        userData.password_hash,
        userData.first_name,
        userData.last_name,
        userData.role,
    ];

    const result: QueryResult<User> = await query(sql, values);
    return result.rows[0];
};

/**
 * Find user by ID
 */
export const findUserById = async (id: number): Promise<User | null> => {
    const sql = 'SELECT * FROM users WHERE id = $1';
    const result: QueryResult<User> = await query(sql, [id]);
    return result.rows[0] || null;
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
    const sql = 'SELECT * FROM users WHERE email = $1';
    const result: QueryResult<User> = await query(sql, [email]);
    return result.rows[0] || null;
};

/**
 * Get all users with optional filters
 */
export const findAllUsers = async (filters?: { role?: string }): Promise<User[]> => {
    let sql = 'SELECT * FROM users';
    const values: any[] = [];

    if (filters?.role) {
        sql += ' WHERE role = $1';
        values.push(filters.role);
    }

    sql += ' ORDER BY created_at DESC';

    const result: QueryResult<User> = await query(sql, values);
    return result.rows;
};

/**
 * Update user
 */
export const updateUser = async (id: number, updates: UpdateUserDTO): Promise<User | null> => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.first_name !== undefined) {
        fields.push(`first_name = $${paramCount}`);
        values.push(updates.first_name);
        paramCount++;
    }

    if (updates.last_name !== undefined) {
        fields.push(`last_name = $${paramCount}`);
        values.push(updates.last_name);
        paramCount++;
    }

    if (updates.email !== undefined) {
        fields.push(`email = $${paramCount}`);
        values.push(updates.email);
        paramCount++;
    }

    if (fields.length === 0) {
        return findUserById(id);
    }

    values.push(id);

    const sql = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

    const result: QueryResult<User> = await query(sql, values);
    return result.rows[0] || null;
};

/**
 * Delete user
 */
export const deleteUser = async (id: number): Promise<boolean> => {
    const sql = 'DELETE FROM users WHERE id = $1';
    const result = await query(sql, [id]);
    return (result.rowCount || 0) > 0;
};

/**
 * Check if email exists
 */
export const emailExists = async (email: string): Promise<boolean> => {
    const sql = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
    const result = await query(sql, [email]);
    return parseInt(result.rows[0].count) > 0;
};

