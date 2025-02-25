import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import {
    RegisterInput,
    LoginInput,
    ResetPasswordInput,
} from '../types/auth.types.js';
import { RequestWithUser } from '../types/RequestWithUser.js';
import { env } from '../config/env.js';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = env.JWT_SECRET;

// Add these helper functions at the top of the file after imports
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return passwordRegex.test(password);
};

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { message: 'Too many login attempts, please try again later' },
});

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { firstName, lastName, email, password, departmentId } =
            req.body as RegisterInput;

        if (!isValidEmail(email)) {
            res.status(400).json({ message: 'Invalid email format' });
            return
        }

        if (!isValidPassword(password)) {
            res.status(400).json({
                message:
                    'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
            });
            return
        }

        // Check if a user already exists with the same email
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user record
        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                departmentId,
            },
        });

        // Optionally, assign a default role if needed

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, email: user.email },
        });
    } catch (error) {
        console.error('Authentication error:', error);
        next(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body as LoginInput;

        // Retrieve the user by email, including their roles
        const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } },
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid email or password' });
            return
        }

        // Compare the provided password with the stored hash
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            res.status(400).json({ message: 'Invalid email or password' });
            return
        }

        // Build the payload for the JWT (including user roles)
        const payload = {
            id: user.id,
            email: user.email,
            roles: user.roles.map((userRole) => userRole.role.name),
        };

        // Sign a JWT token valid for 1 hour
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Authentication error:', error);
        next(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
};

export const resetPassword = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) => {
    try {
        // Ensure that the request is authenticated (the middleware attaches req.user)
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return
        }
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body as ResetPasswordInput;

        // Retrieve the user from the database
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(400).json({ message: 'User not found' });
            return;
        }

        // Verify that the provided old password matches the current one
        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) {
            res.status(400).json({ message: 'Old password is incorrect' });
            return
        }

        // Hash the new password and update the user record
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Authentication error:', error);
        next(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
};
