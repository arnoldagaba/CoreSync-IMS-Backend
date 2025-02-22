import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/error.types.js';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
import { z } from 'zod';

// Schema for consistent error responses
const errorResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  errorCode: z.number(),
  details: z.any().optional(),
});

type ErrorResponse = z.infer<typeof errorResponseSchema>;

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
  });

  let errorResponse: ErrorResponse;

  // Handle different types of errors
  if (err instanceof AppError) {
    // Handle our custom application errors
    errorResponse = {
      status: 'error',
      message: err.message,
      errorCode: err.statusCode,
    };
  } else if (err instanceof ZodError) {
    // Handle validation errors
    errorResponse = {
      status: 'error',
      message: 'Validation error',
      errorCode: 400,
      details: err.errors,
    };
  } else if (err instanceof PrismaClientKnownRequestError) {
    // Handle Prisma database errors
    errorResponse = handlePrismaError(err);
  } else {
    // Handle unknown errors
    errorResponse = {
      status: 'error',
      message: 'Internal server error',
      errorCode: 500,
    };
  }

  // Send error response
  res.status(errorResponse.errorCode).json(errorResponse);
};

// Helper function to handle Prisma errors
function handlePrismaError(err: PrismaClientKnownRequestError): ErrorResponse {
  switch (err.code) {
    case 'P2002':
      return {
        status: 'error',
        message: 'Unique constraint violation',
        errorCode: 409,
        details: err.meta,
      };
    case 'P2025':
      return {
        status: 'error',
        message: 'Record not found',
        errorCode: 404,
        details: err.meta,
      };
    default:
      return {
        status: 'error',
        message: 'Database error',
        errorCode: 500,
        details: err.code,
      };
  }
}
