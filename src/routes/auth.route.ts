import { Router } from 'express';
import {
  register,
  login,
  resetPassword,
  loginLimiter,
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
// The reset-password route is protected, so only authenticated users can access it.
router.post('/reset-password', authenticateToken, resetPassword);

export default router;
