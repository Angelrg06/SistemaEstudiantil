// server.js completo para Render

import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import cors from 'cors';
import { authMiddleware } from './src/middlewares/auth.middleware.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
// 🔹 MODIFICACIÓN: usar FRONTEND_URL desde Environment Variables en vez de localhost
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// 🔹 NUEVO: Ruta Health Check para Render
app.get('/healthz', (req, res) => {
    res.send('ok');
});

// Ruta raíz de prueba (opcional)
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente!');
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/users', authMiddleware, userRoutes);

// Puerto y arranque del servidor
// 🔹 MODIFICACIÓN: usar process.env.PORT que Render asigna
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
