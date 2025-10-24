// src/services/docente.service.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// MEJORA OPCIONAL:
export const getDocenteByUsuario = async (id_usuario) => {
  try {
    return await prisma.docente.findFirst({
      where: { id_usuario },
      select: { id_docente: true }
    });
  } catch (error) {
    console.error("❌ Error en getDocenteByUsuario:", error);
    throw new Error(`No se pudo obtener el docente: ${error.message}`);
  }
}