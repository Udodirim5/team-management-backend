// routes/project.routes.ts
import express, { Router } from 'express';
import ProjectController from './project.controller';
import { protect, restrictToProjectAccess } from '../../middlewares/auth.middleware';
import taskRoutes from '../tasks/task.routes';

const router: Router = express.Router();

const {
  getAllProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  makeAdmin,
  removeAdmin,
} = ProjectController;

// ✅ Protect all routes
router.use(protect);
router.use('/:projectId/tasks', taskRoutes);

// ✅ Routes
router.route('/').post(createProject).get(getAllProjects);

router
  .route('/:projectId')
  .get(
    restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER']), // anyone in the project
    getProject,
  )
  .patch(
    restrictToProjectAccess(['OWNER', 'ADMIN']), // only owner/admin
    updateProject,
  )
  .delete(
    restrictToProjectAccess(['OWNER']), // only owner
    deleteProject,
  );

router
  .route('/:projectId/members/add')
  .post(restrictToProjectAccess(['OWNER', 'ADMIN']), addMember);

router
  .route('/:projectId/members/remove')
  .delete(restrictToProjectAccess(['OWNER', 'ADMIN']), removeMember);
router
  .route('/:projectId/members/role/makeAdmin')
  .patch(restrictToProjectAccess(['OWNER', 'ADMIN']), makeAdmin);
router
  .route('/:projectId/members/role/remove-admin')
  .patch(restrictToProjectAccess(['OWNER', 'ADMIN']), removeAdmin);

export default router;
