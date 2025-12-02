import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/checkRole.middleware.js';
import {
  obtenerNotificacionesDocente,
  obtenerNotificacionesEstudiante,
  crearNotificacion,
  eliminarNotificacion,
  obtenerEstadisticasNotificaciones,
  healthCheck
} from "../controllers/notificacion.controller.js";
// En notificaciones.routes.js


const router = express.Router();





// 🟢 Health check (público)
router.get("/health", healthCheck);

// 🟢 Notificaciones para docente (solo docentes pueden verlas)
router.get("/docente/:id", 
  authMiddleware, 
  checkRole(['docente']), 
  obtenerNotificacionesDocente
);

// Notificaciones para estudiante
router.get("/estudiante/:id", 
  authMiddleware, 
  checkRole(['estudiante']), 
  obtenerNotificacionesEstudiante
);

// 🟢 Estadísticas de notificaciones (solo docentes)
router.get("/docente/:id/estadisticas", 
  authMiddleware, 
  checkRole(['docente']), 
  obtenerEstadisticasNotificaciones
);

// 🟢 Crear notificación (sistema/admin/docente)
router.post("/", 
  authMiddleware, 
  checkRole(['admin', 'docente']), 
  crearNotificacion
);

// 🟢 Eliminar notificación (cualquier usuario puede eliminar sus notificaciones)
router.delete("/:id", 
  authMiddleware, 
  eliminarNotificacion
);

export default router;