// src/app.js - VERSIÓN SIMPLIFICADA Y SEGURA
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/usuarios.routes.js';
import panelRoutes from './routes/panel.routes.js';
import seccionesRoutes from './routes/seccion.routes.js';
import actividadesRoutes from "./routes/actividades.routes.js";
import { authMiddleware } from './middlewares/auth.middleware.js';
import docenteRoutes from './routes/docente.routes.js';
import estudianteRoutes from './routes/estudiantes.routes.js';
import chatRoutes from "./routes/chat.routes.js";
import entregaRoutes from './routes/entregas.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import WebSocketService from './services/websocket.service.js';

dotenv.config();

const app = express();

// Middlewares básicos
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "http://localhost:4200", 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Crear servidor HTTP
const server = createServer(app);

// Inicializar WebSockets
WebSocketService.initialize(server);

// Rutas protegidas
app.use('/api/usuarios', authMiddleware, userRoutes);
app.use('/api/panel', authMiddleware, panelRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use("/api/secciones", authMiddleware, seccionesRoutes);
app.use("/api/actividades", authMiddleware, actividadesRoutes);
app.use('/api/docentes', authMiddleware, docenteRoutes);
app.use('/api/estudiante', authMiddleware, estudianteRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use('/api/entregas', authMiddleware, entregaRoutes);
app.use('/api/notificaciones', authMiddleware, notificacionesRoutes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`💬 WebSocket Service: ACTIVO`);
});

export default app;