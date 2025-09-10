import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

// Importamos rutas
import estudiantesRoutes from './routes/estudiantes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(helmet());

// Rutas
app.use('/estudiantes', estudiantesRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente!');
});

export default app;
