// auth.middleware.js - VERSIÓN MEJORADA
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Acceso denegado, token requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    
    // Verificar que el usuario existe en la BD
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: decoded.id_usuario },
      include: {
        docente: true,
        estudiante: true
      }
    });

    if (!usuario) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no encontrado' 
      });
    }

    // Agregar información completa al request
    req.user = {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol,
      id_docente: usuario.docente?.id_docente,
      id_estudiante: usuario.estudiante?.id_estudiante,
      nombre: usuario.docente?.nombre || usuario.estudiante?.nombre,
      apellido: usuario.docente?.apellido || usuario.estudiante?.apellido
    };

    console.log(`✅ Usuario autenticado: ${req.user.correo} (${req.user.rol})`);
    next();
    
  } catch (error) {
    console.error('❌ Error en authMiddleware:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expirado' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: 'Token inválido o expirado' 
    });
  }
};