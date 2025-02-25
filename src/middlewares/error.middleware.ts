import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  details?: any;
}

/**
 * Global error handler middleware for Express.
 * Logs the error and sends a JSON response with the error details.
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error stack trace along with the timestamp
  console.error(`[${new Date().toISOString()}] Error: ${err.stack}`);

  // Determine the status code. Default to 500 if not provided.
  const statusCode: number = err.status || 500;

  // Build the error response
  const errorResponse = {
    message: err.message || 'Internal Server Error',
    // In production, avoid sending stack trace details to the client.
    details: process.env.NODE_ENV === 'production' ? undefined : err.details || err.stack,
  };

  // Send the error response in JSON format
  res.status(statusCode).json(errorResponse);
};
