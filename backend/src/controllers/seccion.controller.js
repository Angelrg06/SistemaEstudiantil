// controllers/seccion.controller.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getSecciones = async (req, res) => {
  try {
    const secciones = await prisma.seccion.findMany({
      select: {
        id_seccion: true,
        nombre: true,
      },
    });
    res.json(secciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las secciones" });
  }
};
