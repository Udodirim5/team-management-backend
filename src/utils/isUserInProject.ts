import { Role } from '@prisma/client';
import prisma from '../services/prismaClient';

/**
 * Fetch a user's membership in a project.
 * Optional: pass role filter and/or userId.
 */

export async function isUserInProject({
  userId,
  projectId,
  allowedRoles,
}: {
  userId: string | undefined;
  projectId: string;
  allowedRoles?: Role[] | undefined;
}) {
  if (!projectId) return null;

  return await prisma.membership.findFirst({
    where: {
      projectId,
      ...(userId ? { userId } : {}),
      ...(allowedRoles?.length ? { role: { in: allowedRoles } } : {}),
    },
  });
}
