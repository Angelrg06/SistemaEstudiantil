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

import * as actividadService from "../services/actividad.service.js";

export const crearActividad = async (req, res) => {
  try {
    const nueva = await actividadService.crear(req.body);
    res.json(nueva);
  } catch (error) {
    console.error("❌ Error en crearActividad:", error);
    res.status(500).json({ error: "Error al crear actividad" });
  }
};

export const actualizarActividad = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const actualizada = await actividadService.actualizar(id, req.body);
    res.json(actualizada);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar actividad" });
  }
}

export const eliminarActividad = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const eliminada = await actividadService.eliminar(id);
    res.json(eliminada);
  } catch (error) {
    console.error("❌ Error en eliminar controller:", error);
    res.status(500).json({
      error: "Error al eliminar actividad",
      detalle: error.message
    });
  }
}