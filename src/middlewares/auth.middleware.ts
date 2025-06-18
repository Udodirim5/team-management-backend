import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Role } from '@prisma/client'; // Assuming you're using the Role enum
import jwt, { JwtPayload } from 'jsonwebtoken';
import AppError from '../utils/AppError';
import getEnv from '../config/env';
import catchAsync from '../utils/catchAsync';
import { extractProjectId } from '../utils/extractProjectId';

const prisma = new PrismaClient();

const JWT_SECRET = getEnv('JWT_SECRET');
const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN') || '1d';
// const JWT_COOKIE_EXPIRES_IN = Number(getEnv('JWT_COOKIE_EXPIRES_IN')) * 24 * 60 * 60 * 1000;

if (!JWT_SECRET || !JWT_EXPIRES_IN) {
  throw new Error('Missing JWT_SECRET or JWT_EXPIRES_IN in env');
}

export const restrictToProjectAccess = (allowedRoles: Role[] = []) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user?.id;
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

    // 4. Check role permissions (case-insensitive)
    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // 5. Attach membership to req if needed downstream
    req.membership = membership;

    return next();
  });
};

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1. Get token from Authorization header or cookies
  if (req.headers.authorization) {
    // Trim and clean the authorization header
    const authHeader = req.headers.authorization.trim();

    // Check for "Bearer" prefix (case insensitive)
    if (/^bearer\s+/i.test(authHeader)) {
      // Split and get the token part
      const parts = authHeader.split(/\s+/);

      // Handle cases where "Bearer" might be duplicated
      token = parts.length >= 2 ? parts[parts.length - 1] : undefined;
    }
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  // 2. If no token, kick them out
  if (!token) {
    throw new AppError('You are not logged in! Please log in to get access.', 401);
  }

  // 3. Verify token
  const decoded = jwt.verify(token, JWT_SECRET) as { id: string; iat?: number };

  // 4. Check if user still exists
  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!currentUser) {
    throw new AppError('The user belonging to this token does no longer exist.', 401);
  }

  // 5. Check if password was changed after the token was issued
  // if (currentUser.passwordChangedAt && decoded.iat) {
  //   const changedTimestamp = Math.floor(currentUser.passwordChangedAt.getTime() / 1000);
  //   if (decoded.iat < changedTimestamp) {
  //     throw new AppError('Password changed recently. Please log in again.', 401);
  //   }
  // }

  // 6. Grant access
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

export const isLoggedIn = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.cookies.jwt) {
      // 1) Verify the token
      const decoded = await new Promise<JwtPayload | string>((resolve, reject) => {
        jwt.verify(
          req.cookies.jwt,
          getEnv('JWT_SECRET') as string,
          (err: jwt.VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
            if (err) return reject(err);
            resolve(decoded as JwtPayload | string);
          },
        );
      });

      // 2) Check if the user still exists
      let userId: string | undefined;
      if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
        userId = (decoded as JwtPayload & { id?: string }).id;
      }
      if (!userId) {
        return next();
      }
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      // if (
      //   typeof decoded === 'object' &&
      //   decoded !== null &&
      //   'iat' in decoded &&
      //   currentUser.changedPasswordAfter((decoded as JwtPayload).iat)
      // ) {
      //   return next();
      // }

      // There's a logged in user
      res.locals.user = currentUser;
      req.user = currentUser; // Also set on request for consistency
    }
    next();
  },
);
