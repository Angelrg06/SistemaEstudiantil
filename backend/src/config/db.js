  // src/config/db.js
  import { PrismaClient } from '@prisma/client';

  export const prisma = new PrismaClient();

  // Conexión a la BD con log de éxito o error
  async function connectDB() {
    try {
      await prisma.$connect();
      console.log('✅ Conexión a la base de datos exitosa');
    } catch (err) {
      console.error('❌ Error al conectar con la base de datos:', err.message);
      process.exit(1); // sale del servidor si no puede conectar
    }
  }

  connectDB();
