import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import getEnv from '../config/env';
import catchAsync from '../utils/catchAsync';
import { extractProjectId } from '../utils/extractProjectId';

const prisma = new PrismaClient();
const JWT_SECRET = getEnv('JWT_SECRET');
const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN') || '1d';

if (!JWT_SECRET || !JWT_EXPIRES_IN) {
  throw new Error('Missing JWT_SECRET or JWT_EXPIRES_IN in env');
}

// Helper function to extract token from request
const extractToken = (req: Request): string | undefined => {
  // From Authorization header
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization.trim();
    if (/^bearer\s+/i.test(authHeader)) {
      const parts = authHeader.split(/\s+/);
      return parts.length >= 2 ? parts[parts.length - 1] : undefined;
    }
  }
  // From cookies
  return req.cookies?.['jwt'];
};

// Common user verification logic
const verifyUser = async (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET) as { id: string; iat?: number };
  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!currentUser) {
    throw new AppError('The user belonging to this token does no longer exist.', 401);
  }

  return currentUser;
};

// Main authentication middleware
export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    throw new AppError('You are not logged in! Please log in to get access.', 401);
  }

  const currentUser = await verifyUser(token);

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Optional authentication middleware
export const isLoggedIn = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) return next();

  try {
    const currentUser = await verifyUser(token);
    req.user = currentUser;
    res.locals.user = currentUser;
  } catch {
    // Silently fail for optional auth
  }

  next();
});

// Project access control middleware
export const restrictToProjectAccess = (allowedRoles: Role[] = []) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const projectId = extractProjectId(req);

    // 2. Validate required IDs
    if (!userId || !projectId) {
      return res.status(400).json({ message: 'Missing user or project info' });
    }

    // 3. Check membership
    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }

    // 4. Check role permissions
    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // 5. Attach membership to req if needed downstream
    return req.membership = membership;
    next();
  });
};
