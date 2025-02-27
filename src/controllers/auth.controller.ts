import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import crypto from 'crypto'; // Node.js built-in module for generating tokens
import nodemailer from 'nodemailer'; // For sending emails

const JWT_SECRET = env.JWT_SECRET;
const EMAIL_FROM = env.EMAIL_FROM;
const RESET_TOKEN_EXPIRES = 3600000; // 1 hour in milliseconds

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
    },
});

export const register = async (req: Request, res: Response) => {
    try {
        // Extract user details from request body
        const { firstName, lastName, email, password, department, roles } =
            req.body;

        // Basic validation
        if (!firstName || !lastName || !email || !password) {
            res.status(400).json({
                message:
                    'Missing required fields: firstName, lastName, email, and password are required',
            });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: 'Invalid email format' });
            return;
        }

        // Password strength validation (at least 8 characters, containing letters and numbers)
        if (
            password.length < 8 ||
            !/[A-Za-z]/.test(password) ||
            !/[0-9]/.test(password)
        ) {
            res.status(400).json({
                message:
                    'Password must be at least 8 characters long and include both letters and numbers',
            });
            return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            res.status(409).json({ message: 'User with this email already exists' });
            return;
        }

        // Validate roles input
        if (!roles) {
            res.status(400).json({ message: 'At least one role must be selected' });
            return;
        }

        // Ensure roles is an array
        const rolesArray = Array.isArray(roles) ? roles : [roles];

        if (rolesArray.length === 0) {
            res.status(400).json({ message: 'At least one role must be selected' });
            return;
        }

        // Log for debugging
        console.log('Roles received:', roles);
        console.log('Roles processed as:', rolesArray);

        // Lookup roles by name
        const rolesFound = await prisma.role.findMany({
            where: { name: { in: rolesArray } },
        });

        if (rolesFound.length === 0) {
            res.status(400).json({ message: 'Invalid role(s) provided' });
            return;
        }

        // Variable to store department ID
        let departmentId = null;

        // Only process department if provided
        if (department) {
            // Lookup the department by name
            const dept = await prisma.department.findUnique({
                where: { name: department },
            });

            if (!dept) {
                res.status(400).json({ message: 'Department not found' });
                return;
            }

            departmentId = dept.id;
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
                    departmentId,
                },
            });

            // Assign roles using their ids
            for (const role of rolesFound) {
                await tx.userRole.create({
                    data: {
                        userId: newUser.id,
                        roleId: role.id,
                    },
                });
            }

            // Log the user creation including auto-generated ids
            await tx.userActivityLog.create({
                data: {
                    userId: newUser.id,
                    action: 'USER_CREATED',
                    details: JSON.stringify({
                        createdWith: {
                            departmentId,
                            roles: rolesFound.map((r) => ({ id: r.id, name: r.name })),
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

        // Format the response including the auto-generated id's
        const formattedUser = {
            ...user,
            password: undefined, // Remove password from response
            roles: user?.userRoles.map((ur) => ur.role) || [],
        };

        // Generate JWT token
        const token = jwt.sign({ id: user?.id, email: user?.email }, JWT_SECRET, {
            expiresIn: '24h',
        });

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

        // Basic validation
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

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

        // Log the login activity
        await prisma.userActivityLog.create({
            data: {
                userId: user.id,
                action: 'USER_LOGIN',
                details: JSON.stringify({
                    timestamp: new Date(),
                }),
            },
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

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ message: 'Email is required' });
            return;
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // For security reasons, don't reveal if user exists
            res.status(200).json({
                message:
                    'If the email is registered, you will receive a password reset link',
            });
            return;
        }

        // Generate a random reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRES);

        // Hash the token before storing it (additional security layer)
        const hashedResetToken = await bcrypt.hash(resetToken, 10);

        // Store the reset token in a database table (we'll create a temporary record here)
        await prisma.$transaction(async (tx) => {
            // First, remove any existing reset tokens for this user (optional)
            // Note: This would require adding a PasswordReset model to your Prisma schema
            // await tx.passwordReset.deleteMany({
            //   where: { userId: user.id },
            // });

            // Since we don't have a dedicated PasswordReset model in the provided schema,
            // we'll use the UserActivityLog to store the token (not ideal, but works within constraints)
            await tx.userActivityLog.create({
                data: {
                    userId: user.id,
                    action: 'PASSWORD_RESET_REQUESTED',
                    details: JSON.stringify({
                        resetToken: hashedResetToken, // Store hashed token
                        expires: resetTokenExpiry,
                    }),
                },
            });
        });

        // Create the reset URL (frontend would handle this)
        const resetUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${email}`;

        // Send email with the reset link
        const mailOptions = {
            from: EMAIL_FROM,
            to: email,
            subject: 'Password Reset Request',
            html: `
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `,
        };

        await transporter.sendMail(mailOptions);

        // Send a success response (without revealing too much information)
        res.status(200).json({
            message:
                'If the email is registered, you will receive a password reset link',
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        res
            .status(500)
            .json({ message: 'Failed to process password reset request' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            res.status(400).json({
                message: 'Email, token, and new password are required',
            });
            return;
        }

        // Password strength validation
        if (
            newPassword.length < 8 ||
            !/[A-Za-z]/.test(newPassword) ||
            !/[0-9]/.test(newPassword)
        ) {
            res.status(400).json({
                message:
                    'Password must be at least 8 characters long and include both letters and numbers',
            });
            return;
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Find the latest password reset request for this user
        const resetRequest = await prisma.userActivityLog.findFirst({
            where: {
                userId: user.id,
                action: 'PASSWORD_RESET_REQUESTED',
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        if (!resetRequest) {
            res.status(400).json({ message: 'Invalid or expired reset token' });
            return;
        }

        const resetDetails = JSON.parse(String(resetRequest.details));
        const hashedToken = resetDetails.resetToken;
        const expiryDate = new Date(resetDetails.expires);

        // Check if the token has expired
        if (Date.now() > expiryDate.getTime()) {
            res.status(400).json({ message: 'Reset token has expired' });
            return;
        }

        // Verify the token
        const isValidToken = await bcrypt.compare(token, hashedToken);
        if (!isValidToken) {
            res.status(400).json({ message: 'Invalid reset token' });
            return;
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        await prisma.$transaction(async (tx) => {
            // Update the password
            await tx.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });

            // Log the password change
            await tx.userActivityLog.create({
                data: {
                    userId: user.id,
                    action: 'PASSWORD_CHANGED',
                    details: JSON.stringify({
                        method: 'RESET',
                        timestamp: new Date(),
                    }),
                },
            });

            // Optionally, invalidate the used token
            // We'd mark it as used in a dedicated table, but for our implementation we'll add a new log
            await tx.userActivityLog.create({
                data: {
                    userId: user.id,
                    action: 'PASSWORD_RESET_COMPLETED',
                    details: JSON.stringify({
                        timestamp: new Date(),
                    }),
                },
            });
        });

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Failed to reset password', error });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id; // Assuming middleware sets req.user

        if (!userId) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                message: 'Current password and new password are required',
            });
            return;
        }

        // Password strength validation
        if (
            newPassword.length < 8 ||
            !/[A-Za-z]/.test(newPassword) ||
            !/[0-9]/.test(newPassword)
        ) {
            res.status(400).json({
                message:
                    'New password must be at least 8 characters long and include both letters and numbers',
            });
            return;
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            user.password
        );
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Current password is incorrect' });
            return;
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });

            // Log the password change
            await tx.userActivityLog.create({
                data: {
                    userId,
                    action: 'PASSWORD_CHANGED',
                    details: JSON.stringify({
                        method: 'USER_INITIATED',
                        timestamp: new Date(),
                    }),
                },
            });
        });

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Failed to change password', error });
    }
};
