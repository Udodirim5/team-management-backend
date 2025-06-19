import { Request, Response } from 'express';
import prisma from '../../services/prismaClient';
import catchAsync from '../../utils/catchAsync';
import { exclude } from '../../utils/exclude';

const UserController = {
  getAllUsers: catchAsync(async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany();
    const safeUsers = users.map((user) =>
      exclude(user, ['password', 'passwordResetToken', 'passwordResetExpires']),
    );
    res.status(200).json(safeUsers);
  }),

  getUser: catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });

    if (!user) {
      res.status(404).json({ message: 'user not found' });
      return;
    }

    const safeUser = exclude(user, ['password', 'passwordResetToken', 'passwordResetExpires']);

    res.status(200).json(safeUser);
  }),

  updateUser: catchAsync(async (req: Request, res: Response) => {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }
    // 🛡️ Sanitize disallowed fields
    const disallowedFields = ['password', 'passwordResetToken', 'passwordResetExpires'];
    for (const field of disallowedFields) {
      if (field in req.body) {
        delete req.body[field]; // ❌ Strip it out silently
      }
    }

    const { name, email } = req.body;
    const updateduser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });

    // 🧼 Remove sensitive fields from response too
    const safeUser = exclude(updateduser, [
      'password',
      'passwordResetToken',
      'passwordResetExpires',
    ]);

    res.status(200).json(safeUser);
  }),

  deleteUser: catchAsync(async (req: Request, res: Response) => {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });
    res.status(204).send();
  }),

  myProfile: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            project: true, // include project details if needed
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const safeUser = exclude(user, ['password', 'passwordResetToken', 'passwordResetExpires']);

    return res.status(200).json(safeUser);
  }),
};

export default UserController;
