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
app.use(express.json());
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));

// Ruta raíz
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente!');
});

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/users', authMiddleware, userRoutes);  // ✅ CORRECTO


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
