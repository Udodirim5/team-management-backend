import { Router } from 'express';
import { taskController } from './task.controller';
import { protect, restrictToProjectAccess } from '../../middlewares/auth.middleware';

const router = Router({ mergeParams: true }); // <== KEY for nested params

router.use(protect);

// router.use('/:taskId/comments', require('./comment/comment.routes').default);
// CREATE a task - POST /
router.post('/', restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER']), taskController.createTask);

// READ tasks - GET /
router.get('/', restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER']), taskController.getTasks);

// READ single task - GET /
router.get(
  '/:taskId',
  restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER']),
  taskController.getTask,
);

// UPDATE task - PUT /:taskId
router.put(
  '/:taskId',
  restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER']),
  taskController.updateTask,
);

// DELETE task - DELETE /:taskId
router.delete('/:taskId', restrictToProjectAccess(['OWNER', 'ADMIN']), taskController.deleteTask);

// ASSIGN task - PATCH /:taskId/assign
router.patch(
  '/:taskId/assign',
  restrictToProjectAccess(['OWNER', 'ADMIN']),
  taskController.assignTask,
);

// UNASSIGN task - PATCH /:taskId/unassign
router.patch(
  '/:taskId/unassign',
  restrictToProjectAccess(['OWNER', 'ADMIN']),
  taskController.unassignTask,
);

export default router;
