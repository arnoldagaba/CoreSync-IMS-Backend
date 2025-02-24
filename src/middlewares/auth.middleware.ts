import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import {
    JWTPayload,
    AuthenticationError,
    AuthorizationError,
} from '../types/auth.types.js';

// Ensure JWT secret is available
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be defined');
}

// Middleware to validate and decode JWT tokens
export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            throw new AuthenticationError('Authentication token is required');
        }

        // Verify and decode the token
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

        // Fetch current user data to ensure it's still valid
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                roles: {
                    include: { role: true },
                },
            },
        });

        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // Update request with current user information
        req.user = {
            id: user.id,
            email: user.email,
            roleIds: user.roles.map((ur) => ur.roleId),
            roles: user.roles.map((ur) => ur.role.name),
        };

        // Log the authentication activity
        await prisma.userActivityLog.create({
            data: {
                userId: user.id,
                action: 'AUTHENTICATE',
                details: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            },
        });

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AuthenticationError('Invalid or expired token'));
        } else {
            next(error);
        }
    }
};

// Middleware to check if user has required roles
export const requireRoles = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new AuthenticationError('User not authenticated');
            }

            const hasAllowedRole = req.user.roles.some((role) =>
                allowedRoles.includes(role)
            );

            if (!hasAllowedRole) {
                throw new AuthorizationError('Insufficient permissions');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
