// backend/src/controllers/auth.controller.js
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/generateToken.js';

const prisma = new PrismaClient();

export const login = async (req, res) => {
  const { correo, password } = req.body;

  try {
    console.log('🔍 Buscando usuario:', correo);
    
    const user = await prisma.usuario.findUnique({
      where: { correo },
      include: {
        docente: true,
        estudiante: true
      }
    });

    console.log('✅ Usuario encontrado:', JSON.stringify(user, null, 2));

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: "Usuario no encontrado" 
      });
    }

    if (user.password !== password) {
      return res.status(401).json({ 
        success: false,
        error: "Contraseña incorrecta" 
      });
    }

    let userData = {
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol
    };

    console.log('🔍 Datos del docente:', user.docente);
    console.log('🔍 Datos del estudiante:', user.estudiante);

    if (user.rol === 'docente' && user.docente) {
      userData = {
        ...userData,
        id_docente: user.docente.id_docente,
        nombre: user.docente.nombre,
        apellido: user.docente.apellido,
        codigo: user.docente.codigo,
        dni: user.docente.dni
      };
      console.log('✅ Datos del docente agregados');
    } else if (user.rol === 'estudiante' && user.estudiante) {
      userData = {
        ...userData,
        id_estudiante: user.estudiante.id_estudiante,
        nombre: user.estudiante.nombre,
        apellido: user.estudiante.apellido,
        codigo: user.estudiante.codigo,
        dni: user.estudiante.dni
      };
      console.log('✅ Datos del estudiante agregados');
    } else {
      console.warn('⚠️ Usuario no tiene datos de rol asociados');
    }

    console.log('📤 UserData final:', userData);

    const token = generateToken(user);
    
    res.json({ 
      success: true,
      message: 'Login exitoso',
      token, 
      usuario: userData
    });
    
  } catch (error) {
    console.error('💥 Error en login:', error);
    res.status(500).json({ 
      success: false,
      error: "Error en el login" 
    });
  }
};

export const register = async (req, res) => {
  try {
    const { correo, password, rol, nombre, apellido, codigo, dni } = req.body;

    if (!correo || !password || !rol) {
      return res.status(400).json({ 
        success: false,
        error: 'Correo, contraseña y rol son requeridos' 
      });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ 
      where: { correo } 
    });
    
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false,
        error: 'El usuario ya existe' 
      });
    }

    // Crear usuario
    const nuevoUsuario = await prisma.usuario.create({ 
      data: { correo, password, rol } 
    });

    // Crear docente o estudiante según el rol
    if (rol === 'docente') {
      await prisma.docente.create({ 
        data: { 
          codigo, 
          dni, 
          nombre, 
          apellido, 
          id_usuario: nuevoUsuario.id_usuario 
        } 
      });
    } else if (rol === 'estudiante') {
      await prisma.estudiante.create({ 
        data: { 
          codigo, 
          dni, 
          nombre, 
          apellido, 
          id_usuario: nuevoUsuario.id_usuario 
        } 
      });
    }

    console.log(`✅ Registro exitoso: ${correo} (${rol})`);

    // Obtener datos completos del usuario recién creado
    const usuarioCompleto = await prisma.usuario.findUnique({
      where: { id_usuario: nuevoUsuario.id_usuario },
      include: {
        docente: rol === 'docente',
        estudiante: rol === 'estudiante'
      }
    });

    let userResponse = {
      id_usuario: usuarioCompleto.id_usuario,
      correo: usuarioCompleto.correo,
      rol: usuarioCompleto.rol
    };

    if (rol === 'docente' && usuarioCompleto.docente) {
      userResponse = {
        ...userResponse,
        id_docente: usuarioCompleto.docente.id_docente,
        nombre: usuarioCompleto.docente.nombre,
        apellido: usuarioCompleto.docente.apellido,
        codigo: usuarioCompleto.docente.codigo,
        dni: usuarioCompleto.docente.dni
      };
    } else if (rol === 'estudiante' && usuarioCompleto.estudiante) {
      userResponse = {
        ...userResponse,
        id_estudiante: usuarioCompleto.estudiante.id_estudiante,
        nombre: usuarioCompleto.estudiante.nombre,
        apellido: usuarioCompleto.estudiante.apellido,
        codigo: usuarioCompleto.estudiante.codigo,
        dni: usuarioCompleto.estudiante.dni
      };
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      usuario: userResponse
    });

  } catch (error) {
    console.error('💥 Error en registro:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Error en el registro' 
    });
  }
};

// Opcional: Endpoint para verificar token
export const verifyToken = async (req, res) => {
  try {
    // El middleware authMiddleware ya verificó el token
    // y agregó los datos del usuario a req.user
    
    const user = await prisma.usuario.findUnique({
      where: { id_usuario: req.user.id_usuario },
      include: {
        docente: true,
        estudiante: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    let userData = {
      id_usuario: user.id_usuario,
      correo: user.correo,
      rol: user.rol
    };

    if (user.rol === 'docente' && user.docente) {
      userData = {
        ...userData,
        id_docente: user.docente.id_docente,
        nombre: user.docente.nombre,
        apellido: user.docente.apellido
      };
    } else if (user.rol === 'estudiante' && user.estudiante) {
      userData = {
        ...userData,
        id_estudiante: user.estudiante.id_estudiante,
        nombre: user.estudiante.nombre,
        apellido: user.estudiante.apellido
      };
    }

    res.json({
      success: true,
      usuario: userData
    });

  } catch (error) {
    console.error('💥 Error en verifyToken:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar token'
    });
  }
};