// controllers/authController.ts
import { NextFunction, Request, Response } from 'express';
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
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

if (!JWT_SECRET || !JWT_EXPIRES_IN) {
  throw new Error('Missing JWT_SECRET or JWT_EXPIRES_IN in env');
}

const signToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

const createAndSendToken = async (userId: string, req: Request, res: Response) => {
  const token = signToken(userId);

  // Fetch full user data with memberships
  const fullUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!fullUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + JWT_COOKIE_EXPIRES_IN),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  return res.status(200).json({
    status: 'success',
    token,
    data: {
      user: fullUser, // Now returns the complete user object
    },
  });
};

export const signUp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, passwordConfirm, name } = req.body;

  const requiredFields = ['email', 'password', 'passwordConfirm', 'name'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(new AppError(`${field} is required`, 400));
    }
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return next(new AppError('Email already in use', 400));
  }
  if (!isValidEmail(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }
  if (password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  if (!newUser) {
    return next(new AppError('Failed to create user', 500));
  }

  createAndSendToken(newUser.id, req, res);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createAndSendToken(user.id, req, res);
});

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax', // or 'strict' for tighter CSRF protection
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
};

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Please provide your email address', 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new AppError('There is no user with that email address', 404));
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
  },
);

export const resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;
  const token = req.params['token'];

  if (!token) {
    return next(new AppError('Token is missing from the request', 400));
  }
  if (!password || !passwordConfirm) {
    return next(new AppError('Please provide both password and confirmation', 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  // 1) Hash the token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // 2) Find user by token and check if not expired
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Update password and clear reset fields
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password, // assume you're hashing this via middleware or hook
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  // 4) Send new JWT
  if (!updatedUser) {
    return next(new AppError('Failed to update password', 500));
  }

  createAndSendToken(updatedUser.id, req, res);
});

export const updatePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { passwordCurrent, newPassword, passwordConfirm } = req.body;

    // 1) Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return next(new AppError('Unauthorized', 401));
    }

    if (!passwordCurrent || !newPassword || !passwordConfirm) {
      return next(new AppError('All password fields are required', 400));
    }

    // 2) Get user from database
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // 3) Check if POSTed current password is correct
    if (!passwordCurrent || !(await bcrypt.compare(passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong', 401));
    }

    // 4) If all clear, Update the password
    if (!newPassword || !passwordConfirm) {
      return next(new AppError('Please provide new password and confirmation', 400));
    }
    if (newPassword !== passwordConfirm) {
      return next(new AppError('Passwords do not match', 400));
    }
    if (newPassword.length < 8) {
      return next(new AppError('Password must be at least 8 characters long', 400));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    // 5) Log the user in (set a new jwt)
    if (!updatedUser) {
      return next(new AppError('Failed to update password', 500));
    }

    createAndSendToken(updatedUser.id, req, res);
  },
);
