// src/routes/secciones.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  obtenerSeccionesDocente,
  obtenerDetalleSeccion,
  obtenerEstudiantesSeccion,
  obtenerSeccionesConEstadisticas,
  obtenerAlumnosPorDocenteYSeccion,
  healthCheck,
  validarDocente
} from "../controllers/seccion.controller.js";

const router = express.Router();

// 🟢 Health check del servicio (pública - no requiere autenticación)
router.get("/health", healthCheck);

// 🟢 TODAS las rutas de abajo requieren autenticación
router.use(authMiddleware);

// 🟢 Aplicar validación de docente a rutas que lo requieran
router.use("/docente/:id", validarDocente);
router.use("/docente/:id_docente/alumnos", validarDocente);
router.use("/docente/:id_docente/alumnos/seccion/:id_seccion", validarDocente);

// 🟢 Obtener todas las secciones del docente (formato básico)
router.get("/docente/:id", obtenerSeccionesDocente);

// 🟢 Obtener secciones del docente con estadísticas completas (para dashboard)
router.get("/docente/:id/estadisticas", obtenerSeccionesConEstadisticas);

// 🟢 Obtener TODOS los alumnos del docente
router.get("/docente/:id_docente/alumnos", obtenerAlumnosPorDocenteYSeccion);

// 🟢 Obtener alumnos del docente filtrados por sección específica
router.get("/docente/:id_docente/alumnos/seccion/:id_seccion", obtenerAlumnosPorDocenteYSeccion);

// 🟢 Obtener detalle completo de una sección específica
router.get("/:id", obtenerDetalleSeccion);

// 🟢 Obtener estudiantes de una sección específica
router.get("/:id/estudiantes", obtenerEstudiantesSeccion);

export default router;