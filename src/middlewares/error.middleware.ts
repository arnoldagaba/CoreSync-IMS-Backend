import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import pkg from 'jsonwebtoken';
const { JsonWebTokenError, TokenExpiredError } = pkg;

// Define a base error class that all our custom errors will extend
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public status: string = 'error',
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Custom error types for different scenarios
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'validation_error');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(401, message, 'authentication_error');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(403, message, 'authorization_error');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'not_found_error');
  }
}

// Helper function to determine if error is operational (expected) or programming error
const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

// Helper function to format error response
const formatError = (err: any) => {
  return {
    status: err.status || 'error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details,
    }),
  };
};

// Main error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.user?.id,
  });

  // Handle different types of errors

  // Handling Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'validation_error',
      message: 'Invalid input data',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handling Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle unique constraint violations
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'conflict_error',
        message: 'A record with this value already exists',
        details: {
          fields: err.meta?.target,
        },
      });
    }

    // Handle record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'not_found_error',
        message: 'Record not found',
      });
    }

    // Handle other Prisma errors
    return res.status(400).json({
      status: 'database_error',
      message: 'Database operation failed',
      ...(process.env.NODE_ENV === 'development' && {
        code: err.code,
        meta: err.meta,
      }),
    });
  }

  // Handling JWT errors
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      status: 'authentication_error',
      message: 'Invalid token',
    });
  }

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      status: 'authentication_error',
      message: 'Token expired',
    });
  }

  // Handle our custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(formatError(err));
  }

  // Handle unexpected errors
  const internalError = {
    status: 'error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  };

  // If it's not an operational error and we're in production, send generic error
  if (!isOperationalError(err) && process.env.NODE_ENV === 'production') {
    return res.status(500).json(internalError);
  }

  // In development, send full error details
  return res.status(500).json({
    ...internalError,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
};

// Catch unhandled rejections and exceptions
export const setupErrorHandling = (app: any) => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err: Error) => {
    console.error('Unhandled Promise Rejection:', err);
    // Gracefully shutdown the server if needed
    if (!isOperationalError(err)) {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err);
    // Always shutdown the server for uncaught exceptions
    process.exit(1);
  });

  // Add the error handling middleware last
  app.use(errorHandler);
};
