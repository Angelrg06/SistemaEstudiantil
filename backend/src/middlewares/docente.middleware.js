// middleware/docente.middleware.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const docenteMiddleware = async (req, res, next) => {
  try {
    if (req.user.rol !== 'docente') {
      return res.status(403).json({
        success: false,
        error: 'Acceso restringido a docentes'
      });
    }

    // Verificar que existe el docente
    const docente = await prisma.docente.findFirst({
      where: { id_usuario: req.user.id_usuario }
    });

    if (!docente) {
      return res.status(403).json({
        success: false,
        error: 'Perfil de docente no encontrado'
      });
    }

    req.docente = docente;
    next();
  } catch (error) {
    console.error('Error en docenteMiddleware:', error);
    res.status(500).json({
      success: false,
      error: 'Error de validación de docente'
    });
  }
};