import { Router } from 'express';
import { getRoles, getDepartments } from '../controllers/meta.controller.js';

const router = Router();

router.get('/roles', getRoles);
router.get('/departments', getDepartments);

export default router;
