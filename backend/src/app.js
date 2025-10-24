// src/app.js - VERSIÓN CORREGIDA
import express from 'express';
import cors from 'cors';
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
import notificacionesRoutes from './routes/notificaciones.routes.js'; // 🆕 AÑADIR ESTA LÍNEA

dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Health check
app.get('/healthz', (req, res) => res.send('ok'));

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/usuarios', authMiddleware, userRoutes);
app.use('/api/panel', panelRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/secciones", seccionesRoutes);
app.use("/api/actividades", actividadesRoutes);
app.use('/api/docentes', docenteRoutes);
app.use('/api/estudiante', estudianteRoutes);
app.use("/api/chat", chatRoutes);
app.use('/api/entregas', authMiddleware, entregaRoutes);
app.use('/api/notificaciones', authMiddleware, notificacionesRoutes); // 🆕 AÑADIR ESTA LÍNEA

export default app;