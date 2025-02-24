import { Router } from 'express';
import {
  login,
  register,
  changePassword,
} from '../controllers/auth.controller.js';
import {
  authenticateToken,
  requireRoles,
} from '../middlewares/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', authenticateToken, changePassword);

// Admin routes
router.get(
  '/admin/users',
  authenticateToken,
  requireRoles(['ADMIN']),
  async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      res.json({ users });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
