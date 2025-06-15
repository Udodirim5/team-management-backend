// routes/project.routes.ts
import express from 'express';
import ProjectController from './project.controller';

const router = express.Router();

router
  .route('/')
  .get(ProjectController.getAllProjects)
  .post(ProjectController.createProject);

router
  .route('/:id')
  .get(ProjectController.getProject)
  .patch(ProjectController.updateProject)
  .delete(ProjectController.deleteProject);

// ✅ Correct ES module export
export default router;
