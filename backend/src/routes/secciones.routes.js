// routes/secciones.routes.ts
import express from "express";
import { getSecciones } from "../controllers/seccion.controller.js";

const router = express.Router();

router.get("/", getSecciones);

export default router;
