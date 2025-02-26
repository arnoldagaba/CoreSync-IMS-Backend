import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const JWT_SECRET = env.JWT_SECRET;

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authentication required' });
            return
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Get user with roles and department
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
                department: true,
            },
        });

        if (!user) {
            res.status(401).json({ message: 'User not found' });
            return; 
        }

        // Format user with roles
        req.user = {
            ...user,
            password: undefined,
            roles: user.userRoles.map((ur) => ur.role),
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Role-based authorization middleware
export const authorize = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return; 
        }

        const userRoles = req.user.roles.map((role: any) => role.name);
        const hasRequiredRole = requiredRoles.some((role) =>
            userRoles.includes(role)
        );

        if (!hasRequiredRole) {
            res.status(403).json({ message: 'Insufficient permissions' });
            return; 
        }

        next();
    };
};
