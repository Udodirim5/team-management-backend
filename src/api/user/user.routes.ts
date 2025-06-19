import express from 'express';
import UserController from './user.controller';
import { isLoggedIn } from '../../middlewares/auth.middleware';

const router = express.Router();

router.route('/').get( UserController.getAllUsers);
router.get('/me', isLoggedIn, UserController.myProfile);

router
  .route('/:id')
  .get(UserController.getUser)
  .patch(UserController.updateUser)
  .delete(UserController.deleteUser);

export default router;
