import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import getEnv from '../config/env';

interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

const isDev = getEnv('NODE_ENV') === 'development';

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // operational error: known and handled
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message,
    });
  }

  // programming/unknown error
  console.error('🔥 Unexpected Error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

const handlePrismaError = (err: unknown): AppError => {
  // Unique constraint (e.g. email already exists)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.['target'] as string[])?.join(', ') || 'field';
      return createAppError(`Duplicate field value: ${target}`, 400);
    }
    if (err.code === 'P2025') {
      return createAppError('Record not found', 404);
    }
  }

  // Invalid input types or constraints
  if (err instanceof Prisma.PrismaClientValidationError) {
    return createAppError('Invalid input data', 400);
  }

  return createAppError('Database error', 500);
};

const handleZodError = (err: ZodError): AppError => {
  const messages = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
  return createAppError(`Invalid input: ${messages.join(' | ')}`, 400);
};

const handleJWTError = (): AppError => createAppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = (): AppError =>
  createAppError('Your token has expired. Please log in again!', 401);

const createAppError = (message: string, statusCode = 500): AppError => {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  err.isOperational = true;
  return err;
};

// Main global error handler middleware
const globalErrorHandler = (err: unknown, _req: Request, res: Response) => {
  let error: AppError =
    err instanceof Error
      ? Object.assign(createAppError(err.message, (err as AppError).statusCode), err)
      : createAppError('An unknown error occurred');

  if (err instanceof ZodError) error = handleZodError(err);
  if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  )
    error = handlePrismaError(err);
  if (typeof err === 'object' && err !== null && 'name' in err) {
    if ((err as { name: string }).name === 'JsonWebTokenError') error = handleJWTError();
    if ((err as { name: string }).name === 'TokenExpiredError') error = handleJWTExpiredError();
  }

  if (isDev) {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;
