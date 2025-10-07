import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getIdEstudiante, getCursosByEstudiante, getDatosEstudiantes } from '../controllers/estudiante.controller.js';

const router = express.Router();

router.get('/mi-estudiante', authMiddleware, getIdEstudiante);
router.get('/cursos/:id', authMiddleware ,getCursosByEstudiante);
router.get('/datos/:id', authMiddleware, getDatosEstudiantes);

export default router;