//auth.routes.js
import { Router } from 'express';
import { login, register } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkAdmin } from '../middlewares/checkAdmin.middleware.js';

const router = Router();

router.post('/login', login); // POST /api/auth/login
router.post('/register', authMiddleware, checkAdmin, register); // POST /api/auth/register

export default router;
