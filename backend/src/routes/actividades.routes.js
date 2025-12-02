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
  actividadesEstudiante,
  diagnosticarPermisos
} from "../controllers/actividad.controller.js";

import { docenteMiddleware } from '../middlewares/docente.middleware.js';


const router = express.Router();

// ✅ AGREGAR authMiddleware a todas las rutas
router.get('/:id_seccion/cursos', authMiddleware, getCursosPorSeccion);
router.get("/seccion/:id", authMiddleware, docenteMiddleware, getActividadesBySeccion);
router.get("/diagnostico", authMiddleware, diagnosticoActividades); // 🟢 RUTA DE DIAGNÓSTICO

// 👉 NUEVA RUTA PARA ESTUDIANTES
router.get("/estudiante/mis-actividades", authMiddleware, actividadesEstudiante);

router.post("/", authMiddleware, docenteMiddleware, upload.single('archivo'), crearActividad);
router.put("/:id", authMiddleware, docenteMiddleware, uploadActividad, actualizarActividad);
router.delete("/:id", authMiddleware, docenteMiddleware, eliminarActividad);
router.get('/estado/:estado', obtenerActividadesPorEstado); // Ruta para filtrar por estado
router.get("/mes/:mes", authMiddleware, obtenerActividadesPorMes);
// Agregar esta ruta temporalmente
router.get("/diagnosticar-permisos/:id_seccion", authMiddleware, diagnosticarPermisos);
export default router;