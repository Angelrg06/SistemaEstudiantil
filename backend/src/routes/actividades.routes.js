import express from "express";
import { getActividadesBySeccion } from "../controllers/actividad.controller.js";

const router = express.Router();

// GET /api/actividades/seccion/5  -> devuelve actividades de la sección con id 5
router.get("/seccion/:id", getActividadesBySeccion);

export default router;
