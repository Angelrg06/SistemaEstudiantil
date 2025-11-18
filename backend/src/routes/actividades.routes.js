import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  getActividadesBySeccion,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  diagnosticoActividades,
  obtenerActividadesPorEstado,
  obtenerActividadesPorMes,
  getCursosPorSeccion,
  uploadActividad,
  actividadesEstudiante
} from "../controllers/actividad.controller.js";

const router = express.Router();

// ✅ AGREGAR authMiddleware a todas las rutas
router.get('/:id_seccion/cursos', authMiddleware, getCursosPorSeccion);
router.get("/seccion/:id", authMiddleware, getActividadesBySeccion);
router.get("/diagnostico", authMiddleware, diagnosticoActividades); // 🟢 RUTA DE DIAGNÓSTICO

// 👉 NUEVA RUTA PARA ESTUDIANTES
router.get("/estudiante/mis-actividades", authMiddleware, actividadesEstudiante);

router.post("/", authMiddleware, upload.single('archivo'), crearActividad);
router.put("/:id", authMiddleware, uploadActividad, actualizarActividad);
router.delete("/:id", authMiddleware, eliminarActividad);
router.get('/estado/:estado', obtenerActividadesPorEstado); // Ruta para filtrar por estado
router.get("/mes/:mes", authMiddleware, obtenerActividadesPorMes);

export default router;