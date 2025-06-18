import { Request, Response, NextFunction } from 'express';
import prisma from '../../services/prismaClient';
import { extractProjectId } from '../../utils/extractProjectId';
import catchAsync from '../../utils/catchAsync';

export const taskController = {
  // CREATE a task
  createTask: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, priority, dueDate } = req.body;
    const projectId = extractProjectId(req);
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }
    const createdById = req.user.id;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate,
        status: 'TODO',
        projectId,
        createdById,
      },
    });

    return res.status(201).json(task);
    next()
  }),

  // READ tasks for a project
  getTasks: catchAsync(async (req: Request, res: Response) => {
    const projectId = extractProjectId(req);
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: { assignedTo: true },
    });
    return res.json(tasks);
  }),

  // READ task for a project
  getTask: catchAsync(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    const task = await prisma.task.findUnique({
      where: { id: taskId as string },
      include: { assignedTo: true },
    });
    return res.json(task);
  }),

  // UPDATE a task
  updateTask: catchAsync(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }
    const userId = req.user.id;
    const updates = req.body;

    // Ensure taskId is a string
    const task = await prisma.task.findUnique({ where: { id: taskId as string } });
    if (!task || task.createdById !== userId) {
      return res.status(403).json({ message: 'Not allowed to update this task' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId as string },
      data: updates,
    });

    return res.json(updatedTask);
  }),

  // DELETE a task
  deleteTask: catchAsync(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }
    const userId = req.user.id;

    // Ensure taskId is a string
    const task = await prisma.task.findUnique({ where: { id: taskId as string } });
    if (!task || task.createdById !== userId) {
      return res.status(403).json({ message: 'Not allowed to delete this task' });
    }

    await prisma.task.delete({ where: { id: taskId } });
    return res.status(204).send();
  }),

  // ASSIGN task to a user
  assignTask: catchAsync(async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { userId } = req.body;

    const updated = await prisma.task.update({
      where: { id: taskId as string },
      data: { assignedToId: userId },
    });

    res.json(updated);
  }),

  // UNASSIGN task
  unassignTask: catchAsync(async (req: Request, res: Response) => {
    const { taskId } = req.params;

    const updated = await prisma.task.update({
      where: { id: taskId as string },
      data: { assignedToId: null },
    });

    res.json(updated);
  }),
};
