import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getActividadesBySeccion = async (req, res) => {
  try {
    const id_seccion = parseInt(req.params.id);

    const actividades = await prisma.actividad.findMany({
      where: { id_seccion },
      include: { docente: true, seccion: true },
    });

    res.json(actividades);
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    res.status(500).json({ error: "Error al obtener actividades" });
  }
};