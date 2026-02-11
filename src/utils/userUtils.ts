import { User, UserResponse } from '../types/user';

/**
 * Remove sensitive data from user object
 */
export const sanitizeUser = (user: User): UserResponse => {
  const { password_hash, updated_at, ...sanitized } = user;
  return sanitized as UserResponse;
};

/**
 * Get user full name
 */
export const getUserFullName = (user: User | UserResponse): string => {
  return `${user.first_name} ${user.last_name}`;
};

/**
 * Check if user is admin
 */
export const isAdmin = (user: User | UserResponse): boolean => {
  return user.role === 'admin';
};

/**
 * Check if user is student
 */
export const isStudent = (user: User | UserResponse): boolean => {
  return user.role === 'student';
};
