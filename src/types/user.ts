export type UserRole = 'admin' | 'student';

export interface User {
    id: number;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
}

export interface UserResponse {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    created_at: Date;
}

export interface CreateUserDTO {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: UserRole;
}

export interface UpdateUserDTO {
    first_name?: string;
    last_name?: string;
    email?: string;
}

export interface LoginDTO {
    email: string;
    password: string;
}
