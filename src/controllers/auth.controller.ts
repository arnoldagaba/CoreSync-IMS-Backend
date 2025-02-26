import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const JWT_SECRET = env.JWT_SECRET;

export const register = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, password, departmentId, roleIds } =
            req.body;

        // Validation
        if (!roleIds || roleIds.length === 0) {
            res.status(400).json({ message: 'At least one role must be selected' });
            return;
        }

        // Check for role-specific requirements
        const roles = await prisma.role.findMany({
            where: { id: { in: roleIds } },
        });

        const requiresDepartment = roles.some((role) =>
            ['Manager', 'Department Head', 'Team Lead'].includes(role.name)
        );

        if (requiresDepartment && !departmentId) {
            res.status(400).json({
                message: 'A department is required for the selected role(s)',
            });
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a transaction to ensure all operations succeed or fail together
        const user = await prisma.$transaction(async (tx) => {
            // Create the user
            const newUser = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    password: hashedPassword,
                    departmentId: departmentId || null,
                },
            });

            // Assign roles
            for (const roleId of roleIds) {
                await tx.userRole.create({
                    data: {
                        userId: newUser.id,
                        roleId: roleId,
                    },
                });
            }

            // Log the user creation
            await tx.userActivityLog.create({
                data: {
                    userId: newUser.id,
                    action: 'USER_CREATED',
                    details: JSON.stringify({
                        createdWith: {
                            departmentId,
                            roles: roles.map((r) => r.name),
                        },
                    }),
                },
            });

            // Return the user with roles
            return tx.user.findUnique({
                where: { id: newUser.id },
                include: {
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                    department: true,
                },
            });
        });

        // Format the response
        const formattedUser = {
            ...user,
            roles: user?.userRoles.map((ur) => ur.role) || [],
        };

        // Generate JWT token
        const token = jwt.sign(
            { id: user?.id, email: user?.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            user: formattedUser,
            token,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Failed to register user', error });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
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
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Format the response
        const formattedUser = {
            ...user,
            password: undefined, // Remove password from response
            roles: user.userRoles.map((ur) => ur.role),
        };

        // Generate JWT token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '24h',
        });

        res.status(200).json({
            user: formattedUser,
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Failed to login', error });
    }
};
