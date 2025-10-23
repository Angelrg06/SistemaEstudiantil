import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  obtenerNotificacionesDocente,
  obtenerNotificacionesEstudiante,
  crearNotificacion,
  eliminarNotificacion,
  obtenerEstadisticasNotificaciones,
  healthCheck
} from "../controllers/notificacion.controller.js"; // ✅ CORREGIDO: "notificacion" sin "i"

const router = express.Router();

// 🟢 Health check
router.get("/health", healthCheck);

// 🟢 Notificaciones para docente
router.get("/docente/:id", authMiddleware, obtenerNotificacionesDocente);

// 🟢 Notificaciones para estudiante  
router.get("/estudiante/:id", authMiddleware, obtenerNotificacionesEstudiante);

// 🟢 Estadísticas de notificaciones
router.get("/docente/:id/estadisticas", authMiddleware, obtenerEstadisticasNotificaciones);

// 🟢 Crear notificación (para sistema/admin)
router.post("/", authMiddleware, crearNotificacion);

// 🟢 Eliminar notificación (marcar como leída)
router.delete("/:id", authMiddleware, eliminarNotificacion);

export default router;