// controllers/authController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// import { promisify } from 'util';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getEnv from '../../config/env';
import catchAsync from '../../utils/catchAsync';
import AppError from '../../utils/AppError';
import EmailService from '../../utils/email';

const prisma = new PrismaClient();

const JWT_SECRET = getEnv('JWT_SECRET');
const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN') || '1d';
const JWT_COOKIE_EXPIRES_IN = Number(getEnv('JWT_COOKIE_EXPIRES_IN')) * 24 * 60 * 60 * 1000;

if (!JWT_SECRET || !JWT_EXPIRES_IN) {
  throw new Error('Missing JWT_SECRET or JWT_EXPIRES_IN in env');
}

const signToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

const createAndSendToken = (user: { id: string; email: string }, req: Request, res: Response) => {
  const token = signToken(user.id);

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + JWT_COOKIE_EXPIRES_IN),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
    },
  });
};

export const signUp = catchAsync(async (req: Request, res: Response) => {
  const { email, password, passwordConfirm, name } = req.body;

  const requiredFields = ['email', 'password', 'passwordConfirm', 'name'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      throw new AppError(`${field} is required`, 400);
    }
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already in use', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }
  if (password !== passwordConfirm) {
    throw new AppError('Passwords do not match', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  createAndSendToken({ id: newUser.id, email: newUser.email }, req, res);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  createAndSendToken({ id: user.id, email: user.email }, req, res);
});

export const logout = (req: Request, res: Response) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
};

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Please provide your email address', 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('There is no user with that email address', 404);
  }

  // 1. Generate token (this is a placeholder — you should use crypto)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.user.update({
    where: { email },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: expires,
    },
  });

  // 2. Send email
  const resetUrl = `${getEnv('FRONTEND_URL')}/reset-password/${resetToken}`;
  const safeUser = { ...user, name: user.name ?? '' }; // Ensure name is a string
  const emailService = new EmailService(safeUser, resetUrl);
  await emailService.sendPasswordReset();

  res.status(200).json({
    status: 'success',
    message: 'Reset token sent to email',
  });
});
