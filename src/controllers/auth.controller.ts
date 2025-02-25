import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
    RegisterInput,
    LoginInput,
    ResetPasswordInput,
} from '../types/auth.types.js';
import { RequestWithUser } from '../types/RequestWithUser.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// In-memory store for tracking login attempts per email
interface LoginAttempt {
    count: number;
    lastAttempt: number; // timestamp in milliseconds
}

const loginAttempts = new Map<string, LoginAttempt>();

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { firstName, lastName, email, password, departmentId } =
            req.body as RegisterInput;

        // Ensure a departmentId is provided
        if (!departmentId) {
            res.status(400).json({ message: 'Department ID is required' });
            return;
        }

        // Check if the provided department exists
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
        });
        if (!department) {
            res
                .status(400)
                .json({ message: 'The specified department does not exist' });
            return;
        }

        // Check if a user already exists with the same email
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
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

        // Optionally, assign a default role if needed here

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, email: user.email },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body as LoginInput;
        const now = Date.now();

        // Check the login attempts for this email
        const attempt = loginAttempts.get(email);
        if (attempt) {
            // If maximum attempts exceeded within the time window, block the request
            if (
                attempt.count >= MAX_ATTEMPTS &&
                now - attempt.lastAttempt < WINDOW_MS
            ) {
                res.status(429).json({
                    message: 'Too many login attempts. Please try again later.',
                });
                return;
            }
            // If the time window has passed, reset the attempts for this email
            if (now - attempt.lastAttempt >= WINDOW_MS) {
                loginAttempts.delete(email);
            }
        }

        // Retrieve the user by email, including their roles
        const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } },
        });
        if (!user) {
            // Update login attempts on failure
            updateLoginAttempts(email, now);
            res.status(400).json({ message: 'Invalid email or password' });
            return;
        }

        // Compare the provided password with the stored hash
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            updateLoginAttempts(email, now);
            res.status(400).json({ message: 'Invalid email or password' });
            return;
        }

        // Successful login: reset login attempts
        loginAttempts.delete(email);

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
        next(error);
    }
};

function updateLoginAttempts(email: string, now: number) {
    const attempt = loginAttempts.get(email);
    if (attempt) {
        loginAttempts.set(email, { count: attempt.count + 1, lastAttempt: now });
    } else {
        loginAttempts.set(email, { count: 1, lastAttempt: now });
    }
}

export const resetPassword = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body as ResetPasswordInput;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(400).json({ message: 'User not found' });
            return;
        }

        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) {
            res.status(400).json({ message: 'Old password is incorrect' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
