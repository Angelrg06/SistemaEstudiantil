// routes/retroalimentacion.routes.js
import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  obtenerEntregasParaCalificar,
  calificarEntrega,
  obtenerCalificacionesPorActividad,
  obtenerReporteNotasSeccion
} from "../controllers/retroalimentacion.controller.js";

const router = express.Router();

// 🟢 Obtener entregas para calificar (por actividad)
router.get("/actividad/:id_actividad/entregas", authMiddleware, obtenerEntregasParaCalificar);

// 🟢 Calificar una entrega (crear/actualizar retroalimentación)
router.post("/entregas/:id_entrega/calificar", authMiddleware, calificarEntrega);
router.put("/entregas/:id_entrega/calificar", authMiddleware, calificarEntrega);

// 🟢 Obtener calificaciones por actividad
router.get("/actividad/:id_actividad/calificaciones", authMiddleware, obtenerCalificacionesPorActividad);

// 🟢 Obtener reporte de notas por sección
router.get("/seccion/:id_seccion/reporte", authMiddleware, obtenerReporteNotasSeccion);

export default router;