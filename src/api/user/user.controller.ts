import { Request, Response } from 'express';
import prisma from '../../services/prismaClient';
import { handleError } from '../../utils/errorHandler';

const UserController = {
  getAllUsers: async (_req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany();
      res.status(200).json(users);
    } catch (error) {
      handleError(res, error);
    }
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({ message: 'user not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      handleError(res, error);
    }
  },

  updateUser: async (req: Request, res: Response) => {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    try {
      const { name, email } = req.body;
      const updateduser = await prisma.user.update({
        where: { id: userId },
        data: { name, email },
      });
      res.status(200).json(updateduser);
    } catch (error) {
      handleError(res, error);
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    const userId = req.params['id'];
    if (!userId) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }

    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  },
};

export default UserController;
