import { Router } from 'express';
import { register, login, resetPassword, requestPasswordReset, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Resetting password
router.post("/reset-password", resetPassword);
router.post("/request-password-reset", requestPasswordReset);
router.post("/change-password", authenticate, changePassword);

export default router;