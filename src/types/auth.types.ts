import { User, Role } from '@prisma/client';

// Define the structure for login requests
export interface LoginRequestBody {
    email: string;
    password: string;
}

// Define the structure for registration requests
export interface RegisterRequestBody {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    departmentId?: number;
    roles?: number[];
}

// Define the structure for password change requests
export interface ChangePasswordBody {
    currentPassword: string;
    newPassword: string;
}

// Define the structure for successful authentication responses
export interface AuthResponse {
    user: Omit<User, 'password'>; // Exclude password from user data
    token: string;
    roles: Role[];
}

// Define the structure for the JWT payload
export interface JWTPayload {
    userId: number;
    email: string;
    roleIds: number[]; // Store role IDs in the token
    roles: string[]; // Store role names in the token
    iat?: number; // Token creation timestamp
    exp?: number; // Token expiration timestamp
}

// Extend Express Request to include our custom user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                roleIds: number[];
                roles: string[];
            };
        }
    }
}

// Define custom error types for better error handling
export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthorizationError';
    }
}
