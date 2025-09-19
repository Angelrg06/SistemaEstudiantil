// backend/src/controllers/auth.controller.js
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../utils/generateToken.js';

const prisma = new PrismaClient();

// Login temporal sin hashing
export const login = async (req, res) => {
  const { correo, password } = req.body;

  try {
    const user = await prisma.usuario.findUnique({
      where: { correo }
    });

    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

    // Comparación en texto plano
    if (user.password !== password) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Generar JWT
    const token = generateToken(user); 
    res.json({ token, usuario: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el login" });
  }
};

export const register = async (req, res) => {
  try {
    const { correo, password, rol, nombre, apellido, codigo, dni } = req.body;

    if (!correo || !password || !rol) {
      return res.status(400).json({ error: 'Correo, contraseña y rol son requeridos' });
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { correo } });
    if (usuarioExistente) return res.status(400).json({ error: 'El usuario ya existe' });

    const nuevoUsuario = await prisma.usuario.create({ data: { correo, password, rol } });

    if (rol === 'docente') {
      await prisma.docente.create({ data: { codigo, dni, nombre, apellido, id_usuario: nuevoUsuario.id_usuario } });
    } else if (rol === 'estudiante') {
      await prisma.estudiante.create({ data: { codigo, dni, nombre, apellido, id_usuario: nuevoUsuario.id_usuario } });
    }

    console.log(`✅ Registro exitoso: ${correo} (${rol})`);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: { id: nuevoUsuario.id_usuario, correo: nuevoUsuario.correo, rol: nuevoUsuario.rol }
    });

  } catch (error) {
    console.error('💥 Error en registro:', error.message);
    res.status(500).json({ error: 'Error en el registro' });
  }
};
