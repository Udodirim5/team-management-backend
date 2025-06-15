import { Request, Response } from 'express';
import prisma from '../../services/prismaClient';
import { handleError } from '../../utils/errorHandler';
import { Prisma } from '@prisma/client';

const ProjectController = {
getAllProjects: async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: {
        memberships: {
          some: { userId }, // user is in membership table
        },
      },
      include: {
        memberships: true, // optional — include membership info
      },
    });

    return res.status(200).json(projects);
  } catch (error) {
    handleError(res, error);
    return;
  }
},

  createProject: async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const creatorId = req.user?.id;

    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    if (!creatorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // Use a transaction to ensure both operations succeed
      const result = await prisma.$transaction(async (prisma) => {
        // 1. Create the project
        const newProject = await prisma.project.create({
          data: {
            name,
            description,
            creator: { connect: { id: creatorId } },
          },
        });

        // 2. Create the membership
        await prisma.membership.create({
          data: {
            user: { connect: { id: creatorId } },
            project: { connect: { id: newProject.id } },
            role: 'OWNER',
          },
        });

        return newProject;
      });

      return res.status(201).json(result);
    } catch (error) {
      handleError(res, error);
      return;
    }
  },

  getProject: async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'];
    if (!projectId) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        res.status(404).json({ message: 'Project not found' });
        return;
      }

      res.status(200).json(project);
    } catch (error) {
      handleError(res, error);
    }
  },

  updateProject: async (req: Request, res: Response) => {
    const projectId = req.params['id'];
    if (!projectId) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }

    try {
      const { name, description } = req.body;
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          name,
          description,
        },
      });
      res.status(200).json(updatedProject);
    } catch (error) {
      handleError(res, error);
    }
  },

  deleteProject: async (req: Request, res: Response) => {
    const projectId = req.params['id'];
    const userId = req.user?.id; // Assuming you have user info in req.user

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // First check if the user is the project owner (or has ADMIN role)
      const membership = await prisma.membership.findFirst({
        where: {
          userId,
          projectId,
          role: { in: ['OWNER', 'ADMIN'] }, // Only owners/admins can delete
        },
      });

      if (!membership) {
        return res
          .status(403)
          .json({ message: 'You do not have permission to delete this project' });
      }

      // Use a transaction to ensure all deletions succeed
      await prisma.$transaction([
        // 1. Delete all memberships first (to satisfy foreign key constraints)
        prisma.membership.deleteMany({
          where: { projectId },
        }),
        // 2. Then delete the project
        prisma.project.delete({
          where: { id: projectId },
        }),
      ]);

      return res.status(204).send();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ message: 'Project not found' });
      }
      handleError(res, error);
      return;
    }
  },

  addMember: async (req: Request, res: Response) => {
    const { projectId, userIdToAdd, role } = req.body;
    const currentUserId = req.user?.id;

    // Only allow OWNER or ADMIN to invite
    const membership = await prisma.membership.findFirst({
      where: {
        projectId,
        ...(currentUserId !== undefined ? { userId: currentUserId } : {}),
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) return res.status(403).json({ message: 'No permission' });

    try {
      const newMember = await prisma.membership.create({
        data: {
          project: { connect: { id: projectId } },
          user: { connect: { id: userIdToAdd } },
          role: role ?? 'MEMBER',
        },
      });

      return res.status(200).json(newMember);
    } catch (error) {
      handleError(res, error);
      return;
    }
  },

  removeMember: async (req: Request, res: Response) => {
    const { projectId, userIdToRemove } = req.body;
    const currentUserId = req.user?.id;

    if (!projectId || !userIdToRemove) {
      return res.status(400).json({ message: 'Project ID and User ID to remove are required' });
    }
    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Only allow OWNER or ADMIN to invite
    const membership = await prisma.membership.findFirst({
      where: {
        projectId,
        ...(currentUserId !== undefined ? { userId: currentUserId } : {}),
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) return res.status(403).json({ message: 'No permission' });

    try {
      await prisma.membership.delete({
        where: {
          userId_projectId: {
            userId: userIdToRemove,
            projectId: projectId,
          },
        },
      });

      return res.status(200).json({ message: 'Member removed' });
    } catch (error) {
      handleError(res, error);
      return;
    }
  },
};

export default ProjectController;
