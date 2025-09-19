//panel.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/checkRole.middleware.js';

const router = Router();

// Panel admin
router.get('/admin', authMiddleware, checkRole(['admin']), (req, res) => {
  res.json({ message: `Bienvenido admin ${req.user.nombre_usuario}` });
});

// Panel docente
router.get('/docente', authMiddleware, checkRole(['docente']), (req, res) => {
  res.json({ message: `Bienvenido docente ${req.user.nombre_usuario}` });
});

// Panel estudiante
router.get('/estudiante', authMiddleware, checkRole(['estudiante']), (req, res) => {
  res.json({ message: `Bienvenido estudiante ${req.user.nombre_usuario}` });
});

export default router;
