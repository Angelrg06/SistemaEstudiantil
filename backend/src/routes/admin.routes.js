// backend/src/routes/admin.routes.js
import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkAdmin } from '../middlewares/checkAdmin.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

// Aplicar middlewares a todas las rutas
router.use(authMiddleware);
router.use(checkAdmin);

// Rutas de docentes
router.post('/docentes', adminController.createDocente);
router.get('/docentes', adminController.getDocentes);
router.put('/docentes/:id', adminController.updateDocente);
router.delete('/docentes/:id', adminController.deleteDocente);

// Rutas de estudiantes
router.post('/estudiantes', adminController.createEstudiante);
router.get('/estudiantes', adminController.getEstudiantes);
router.put('/estudiantes/:id', adminController.updateEstudiante);
router.delete('/estudiantes/:id', adminController.deleteEstudiante);

// Rutas de secciones
router.get('/secciones', adminController.getSecciones);
router.post('/secciones', adminController.createSeccion);

// Rutas de notificaciones
router.post('/notificaciones', adminController.createNotificacion);
router.get('/notificaciones', adminController.getNotificaciones);

// Dashboard stats
router.get('/stats', adminController.getDashboardStats);

export default router;
