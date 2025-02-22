export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational: true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace for debugging
        Error.captureStackTrace(this, this.constructor);
    }
}


