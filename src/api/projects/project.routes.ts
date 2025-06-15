// routes/project.routes.ts
import express, { Request, Response, NextFunction, Router } from 'express';
import ProjectController from './project.controller';
import { protect, restrictToProjectAccess } from '../../middlewares/auth.middleware';

const router: Router = express.Router();

const {
  getAllProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = ProjectController;

// Typed async handler
type AsyncRouteHandler<Req = Request, Res = Response> = (
  req: Req,
  res: Res,
  next: NextFunction,
) => Promise<unknown>;

const asyncHandler =
  <R extends Request, S extends Response>(fn: AsyncRouteHandler<R, S>) =>
  (req: R, res: S, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ✅ Protect all routes
router.use(protect);

// ✅ Routes
router.route('/').post(asyncHandler(createProject));

router.route('/my-projects/:id').get(
  asyncHandler(restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER'])), // anyone in the project
  asyncHandler(getAllProjects),
);

router
  .route('/:id')
  .get(
    asyncHandler(restrictToProjectAccess(['OWNER', 'ADMIN', 'MEMBER'])), // anyone in the project
    asyncHandler(getProject),
  )
  .patch(
    asyncHandler(restrictToProjectAccess(['OWNER', 'ADMIN'])), // only owner/admin
    asyncHandler(updateProject),
  )
  .delete(
    asyncHandler(restrictToProjectAccess(['OWNER'])), // only owner
    asyncHandler(deleteProject),
  );

router
  .route('/add-member/:id')
  .post(asyncHandler(restrictToProjectAccess(['OWNER', 'ADMIN'])), asyncHandler(addMember));

router
  .route('/remove-member/:id')
  .delete(asyncHandler(restrictToProjectAccess(['OWNER', 'ADMIN'])), asyncHandler(removeMember));

export default router;
