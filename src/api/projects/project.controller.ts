import { Request, Response } from 'express';
import prisma from '../../services/prismaClient';
import { handleError } from '../../utils/errorHandler';

const ProjectController = {
  getAllProjects: async (_req: Request, res: Response) => {
    try {
      const projects = await prisma.project.findMany();
      res.status(200).json(projects);
    } catch (error) {
      handleError(res, error);
    }
  },

  createProject: async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name || !description) {
      res.status(400).json({ message: 'Name and description are required' });
      return;
    }
    try {
      const newProject = await prisma.project.create({
        data: {
          name,
          description,
        },
      });
      res.status(201).json(newProject);
    } catch (error) {
      handleError(res, error);
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
    if (!projectId) {
      res.status(400).json({ message: 'Invalid project ID' });
      return;
    }

    try {
      await prisma.project.delete({
        where: { id: projectId },
      });
      res.status(204).send();
    } catch (error) {
      handleError(res, error);
    }
  },
};

export default ProjectController;
