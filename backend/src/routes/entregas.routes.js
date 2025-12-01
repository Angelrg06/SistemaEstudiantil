import express from 'express';
import { crearEntrega, descargarArchivo } from '../controllers/entrega.Controller.js';
import upload from '../middlewares/uploadMiddleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { uploadEntrega } from '../config/multer.config.js'; // 🟢 USAR CONFIG UNIFICADA


const router = express.Router();

// Ruta para subir entrega con archivo
router.post('/subir',
    authMiddleware, // Verificamos que el usuario está autenticado
    upload.single('archivo'), // Subir archivo con Multer
    crearEntrega // Ejecutar el controlador
);

// Ruta para descargar el archivo
router.get('/descargar/:ruta',
    authMiddleware,
    uploadEntrega,
    descargarArchivo
);

export default router; 