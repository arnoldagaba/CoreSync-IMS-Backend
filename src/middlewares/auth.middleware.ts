import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RequestWithUser } from '../types/RequestWithUser.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

const JWT_SECRET = env.JWT_SECRET;

export const authenticateToken = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer TOKEN"

    if (!token) {
        res.status(401).json({ message: 'Token missing' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;

        // Optionally, fetch the user to attach complete info (including roles)
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            include: { roles: { include: { role: true } } },
        });

        if (!user) {
            res.status(401).json({ message: 'Invalid token: user not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
        return;
    }
};
