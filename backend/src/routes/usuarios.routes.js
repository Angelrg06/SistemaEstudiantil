//usuarios.routes.js
import { Router } from 'express';
import { getAllUsers } from '../controllers/usuario.controller.js';

const router = Router();

// GET /api/users
router.get('/', getAllUsers);

export default router;
