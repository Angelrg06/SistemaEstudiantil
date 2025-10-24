// src/routes/docente.routes.js
import express from "express";
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getIdDocente } from '../controllers/docente.controller.js';

const router = express.Router();

// 🟢 VERIFICA QUE ESTA RUTA ESTÉ BIEN ESCRITA
router.get('/mi-docente', authMiddleware, getIdDocente);

export default router;