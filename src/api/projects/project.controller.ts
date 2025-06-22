import { Request, Response } from 'express';
import prisma from '../../services/prismaClient';
import { extractProjectId } from '../../utils/extractProjectId';
import { isUserInProject } from '../../utils/isUserInProject';
import catchAsync from '../../utils/catchAsync';

const ProjectController = {
  getAllProjects: catchAsync(async (req: Request, res: Response) => {
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
  }),

  createProject: catchAsync(async (req: Request, res: Response) => {
    const { name, description, startDate, endDate } = req.body;
    const creatorId = req.user?.id;

    if (!name || !description || !startDate || !endDate) {
      return res.status(400).json({ message: 'Fill in the required fields' });
    }

    if (!creatorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

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
  }),

  getProject: catchAsync(async (req: Request, res: Response): Promise<void> => {
    const projectId = extractProjectId(req);
    const userId = req.user?.id;

    if (!projectId) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // 1. Find the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    // 2. Validate the project
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // 3. Check if the user is part of the project
    const isMember = await isUserInProject({ userId, projectId });

    // 4. Validate membership
    if (!isMember) {
      res.status(403).json({ message: 'You are not a member of this project' });
      return;
    }

    // 5. Give a response
    res.status(200).json(project);
  }),

  updateProject: catchAsync(async (req: Request, res: Response) => {
    const projectId = extractProjectId(req);
    if (!projectId) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }

    const { name, description, startDate, endDate } = req.body;
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    res.status(200).json(updatedProject);
  }),
  

  deleteProject: catchAsync(async (req: Request, res: Response) => {
    const projectId = extractProjectId(req);

    const userId = req.user?.id;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const membership = await isUserInProject({
      userId,
      projectId,
      allowedRoles: ['OWNER', 'ADMIN'],
    });

    if (!membership) {
      return res.status(403).json({ message: 'You do not have permission to delete this project' });
    }

    await prisma.$transaction([
      // Delete comments linked to tasks under this project
      // prisma.comment.deleteMany({
      //   where: {
      //     task: {
      //       projectId,
      //     },
      //   },
      // }),

      // Delete all tasks linked to the project
      // prisma.task.deleteMany({
      //   where: { projectId },
      // }),

      // Delete activity logs
      // prisma.activity.deleteMany({
      //   where: { projectId },
      // }),

      // Delete memberships
      prisma.membership.deleteMany({
        where: { projectId },
      }),

      // Finally, delete the project itself
      prisma.project.delete({
        where: { id: projectId },
      }),
    ]);

    return res.status(204).send();
  }),

  addMember: catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const projectId = extractProjectId(req);

    const currentUserId = req.user?.id;
    if (!projectId || !email) {
      return res.status(400).json({ message: 'Missing projectId or email' });
    }

    // Check current user's permission to invite
    const inviter = await isUserInProject({
      userId: currentUserId,
      projectId,
      allowedRoles: ['OWNER', 'ADMIN'],
    });

    if (!inviter) {
      return res.status(403).json({ message: 'You don’t have permission to add members' });
    }

    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existing = await prisma.membership.findUnique({
      where: {
        userId_projectId: {
          userId: userToAdd.id,
          projectId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'User is already a member' });
    }

    // Add member as MEMBER
    const newMember = await prisma.membership.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role: 'MEMBER',
      },
    });

    return res.status(200).json(newMember);
  }),

  removeMember: catchAsync(async (req: Request, res: Response) => {
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

    await prisma.membership.delete({
      where: {
        userId_projectId: {
          userId: userIdToRemove,
          projectId: projectId,
        },
      },
    });

    return res.status(200).json({ message: 'Member removed' });
  }),

  makeAdmin: catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.body;
    const projectId = extractProjectId(req);
    const currentUserId = req.user?.id;

    if (!projectId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const currentMembership = await prisma.membership.findUnique({
      where: {
        userId_projectId: {
          userId: currentUserId!,
          projectId,
        },
      },
    });

    if (!currentMembership || !['OWNER', 'ADMIN'].includes(currentMembership.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({ message: 'Target member not found' });
    }

    if (targetMembership.role === 'OWNER') {
      return res.status(403).json({ message: 'Cannot promote/demote OWNER' });
    }

    const updated = await prisma.membership.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: {
        role: 'ADMIN',
      },
    });

    return res.status(200).json(updated);
  }),

  removeAdmin: catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.body;
    const projectId = extractProjectId(req);
    const currentUserId = req.user?.id;

    if (!projectId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const currentMembership = await prisma.membership.findUnique({
      where: {
        userId_projectId: {
          userId: currentUserId!,
          projectId,
        },
      },
    });

    if (!currentMembership || !['OWNER', 'ADMIN'].includes(currentMembership.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({ message: 'Target member not found' });
    }

    if (targetMembership.role === 'OWNER') {
      return res.status(403).json({ message: 'Cannot modify OWNER role' });
    }

    const updated = await prisma.membership.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: {
        role: 'MEMBER',
      },
    });

    return res.status(200).json(updated);
  }),
};

export default ProjectController;

// abstracted into a service for cleaner controllers
