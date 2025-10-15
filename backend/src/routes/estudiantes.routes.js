import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getIdEstudiante, getCursosByEstudiante, getDatosEstudiantes, notificacionesByEstudiante, getActividadesByCurso, getActividadByID, getMisEntregas } from '../controllers/estudiante.controller.js';

const router = express.Router();

router.get('/mi-estudiante', authMiddleware, getIdEstudiante);
router.get('/cursos/:id', authMiddleware ,getCursosByEstudiante);
router.get('/entregas/:id', authMiddleware, getActividadesByCurso); 
router.get('/notificaciones/:id', authMiddleware ,notificacionesByEstudiante);
router.get('/datos/:id', authMiddleware, getDatosEstudiantes);  
router.get('/actividades/:id', authMiddleware, getActividadByID);
router.get('/mis-entregas/:id_curso', authMiddleware, getMisEntregas);

export default router;