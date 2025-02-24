import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
    LoginRequestBody,
    RegisterRequestBody,
    JWTPayload,
    AuthenticationError,
} from '../types/auth.types.js';

// Validation schemas
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    departmentId: z.number().optional(),
    roles: z.array(z.number()).optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z
        .string()
        .min(6, 'Current password must be at least 6 characters'),
    newPassword: z
        .string()
        .min(6, 'New password must be at least 6 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase, and numbers'
        ),
});

// Helper function to generate JWT token
const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET not defined');

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const login = async (
    req: Request<{}, {}, LoginRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        // Validate request body
        const { email, password } = loginSchema.parse(req.body);

        // Find user with their roles
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new AuthenticationError('Invalid credentials');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new AuthenticationError('Invalid credentials');
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            roleIds: user.roles.map((ur) => ur.roleId),
            roles: user.roles.map((ur) => ur.role.name),
        });

        // Log successful login
        await prisma.userActivityLog.create({
            data: {
                userId: user.id,
                action: 'LOGIN',
                details: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            },
        });

        // Return user data (excluding password) and token
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            token,
            roles: user.roles.map((ur) => ur.role),
        });
    } catch (error) {
        next(error);
    }
};

export const register = async (
    req: Request<{}, {}, RegisterRequestBody>,
    res: Response,
    next: NextFunction
) => {
    try {
        // Validate request body
        const userData = registerSchema.parse(req.body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
        });

        if (existingUser) {
            throw new AuthenticationError('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user and assign roles in a transaction
        const user = await prisma.$transaction(async (prisma) => {
            // Create user
            const newUser = await prisma.user.create({
                data: {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    password: hashedPassword,
                    departmentId: userData.departmentId,
                },
            });

            // Assign default role if no roles provided
            const rolesToAssign = userData.roles?.length ? userData.roles : [1]; // Assuming 1 is the default USER role ID

            // Create role assignments
            await prisma.userRole.createMany({
                data: rolesToAssign.map((roleId) => ({
                    userId: newUser.id,
                    roleId,
                })),
            });

            // Return complete user data
            return prisma.user.findUnique({
                where: { id: newUser.id },
                include: {
                    roles: {
                        include: { role: true },
                    },
                },
            });
        });

        if (!user) {
            throw new Error('Failed to create user');
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            roleIds: user.roles.map((ur) => ur.roleId),
            roles: user.roles.map((ur) => ur.role.name),
        });

        // Log registration
        await prisma.userActivityLog.create({
            data: {
                userId: user.id,
                action: 'REGISTER',
                details: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            },
        });

        // Return user data (excluding password) and token
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            user: userWithoutPassword,
            token,
            roles: user.roles.map((ur) => ur.role),
        });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            throw new AuthenticationError('User not authenticated');
        }

        const { currentPassword, newPassword } = changePasswordSchema.parse(
            req.body
        );

        // Get user with current password
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(
            currentPassword,
            user.password
        );
        if (!isValidPassword) {
            throw new AuthenticationError('Current password is incorrect');
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        // Log password change
        await prisma.userActivityLog.create({
            data: {
                userId: user.id,
                action: 'PASSWORD_CHANGE',
                details: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            },
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
