import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { 
  getActividadesBySeccion, 
  crearActividad, 
  actualizarActividad, 
  eliminarActividad,
  diagnosticoActividades  // 🟢 AGREGAR DIAGNÓSTICO
} from "../controllers/actividad.controller.js";

const router = express.Router();

// ✅ AGREGAR authMiddleware a todas las rutas
router.get("/seccion/:id", authMiddleware, getActividadesBySeccion);
router.get("/diagnostico", authMiddleware, diagnosticoActividades); // 🟢 RUTA DE DIAGNÓSTICO
router.post("/", authMiddleware, crearActividad);
router.put("/:id", authMiddleware, actualizarActividad);
router.delete("/:id", authMiddleware, eliminarActividad);

export default router;