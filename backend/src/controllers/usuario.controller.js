// src/controllers/usuario.controller.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllUsers = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id_usuario: true,
        correo: true,
        rol: true
      }
    });

    res.json(usuarios);
  } catch (error) {
    console.error("Error en getAllUsers:", error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};
