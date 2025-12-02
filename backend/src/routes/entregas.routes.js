// routes/entregas.routes.js - VERSIÓN CORREGIDA
import express from 'express';
import { 
  crearEntrega, 
  descargarArchivo,
  getMisEntregas,
  verificarIntentos
} from '../controllers/entrega.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// 🟢 RUTA PARA SUBIR ENTREGA (POST con archivo)
router.post('/subir',
  authMiddleware,
  upload.single('archivo'), // Solo en POST se usa multer
  crearEntrega
);

// 🟢 RUTA PARA DESCARGAR ARCHIVO (GET sin multer)
router.get('/descargar/:ruta',
  authMiddleware,
  descargarArchivo // NO necesita multer porque es GET
);

// 🟢 NUEVAS RUTAS PARA ESTUDIANTES
router.get('/mis-entregas/:id_curso', authMiddleware, getMisEntregas);
router.get('/verificar-intentos/:id_actividad', authMiddleware, verificarIntentos);

export default router;