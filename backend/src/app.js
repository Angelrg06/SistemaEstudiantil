// src/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/usuarios.routes.js';
import panelRoutes from './routes/panel.routes.js';
import seccionesRoutes from './routes/secciones.routes.js'; // importamos secciones
import actividadesRoutes from "./routes/actividades.routes.js"; // importamos actividades
import { authMiddleware } from './middlewares/auth.middleware.js';
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
app.use("/api/secciones", seccionesRoutes); // Aquí montamos la ruta de secciones
app.use("/api/actividades", actividadesRoutes); // Aquí montamos la ruta de act

export default app;