import { UserResponse } from './user';

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
}

export interface AuthResponse {
    user: UserResponse;
    token: string;
}

export interface JWTPayload {
    userId: number;
    email: string;
    role: string;
}

export interface RegisterDTO {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: 'admin' | 'student';
}

export interface LoginDTO {
    email: string;
    password: string;
}
