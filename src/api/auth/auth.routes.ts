import express from 'express';
import {
  signUp,
  login,
  logout,
  forgotPassword,
  // resetPassword,
  // updatePassword,
} from './auth.controller';

// import { protect } from '../../middlewares/auth.middleware';

const router = express.Router();

router.post('/signup', signUp);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgotPassword', forgotPassword);
// router.patch('/resetPassword/:token', resetPassword);
// router.patch('/updateMyPassword', protect, updatePassword);

export default router;
