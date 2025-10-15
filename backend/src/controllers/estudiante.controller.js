import { getEstudianteByUsuario } from '../services/estudiante.service.js';

export const getIdEstudiante = async (req, res) => {

    try {
        console.log("req.user:", req.user);

        if (!req.user || !req.user.id_usuario) {
            return res.status(401).json({ error: "Usuario no autenticado o token inválido" });
        }

        const id_usuario = req.user.id_usuario;
        console.log("Buscando estudiante con id_usuario:", id_usuario);

        const estudiante = await getEstudianteByUsuario(id_usuario);

        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        res.json({ id_estudiante: estudiante.id_estudiante });
    } catch (error) {
        console.error('Error en getMiEstudiante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }

}

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getActividadByID = async (req, res) => {

    try {

        const id_actividad = parseInt(req.params.id);

        const actividad = await prisma.actividad.findUnique({
            where: { id_actividad },
            select: {
                id_actividad: true,
                titulo: true,
                tipo: true,
                descripcion: true,
                fecha_inicio: true,
                fecha_fin: true,
                archivo: true
            }
        })

        const resultado = [{
            titulo: actividad.titulo,
            tipo: actividad.tipo,
            descripcion: actividad.descripcion,
            fecha_inicio: actividad.fecha_inicio
                ? new Date(actividad.fecha_inicio).toLocaleString('es-PE', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })
                : null,
            fecha_fin: actividad.fecha_fin
                ? new Date(actividad.fecha_fin).toLocaleString('es-PE', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })
                : null,
            archivo: actividad.archivo,
        }
        ]

        res.json(resultado)
    } catch (error) {
        console.error("Error al obtener actividad:", error);
        res.status(500).json({ error: "Error al obtener actividad" });
    }

}

export const getActividadesByCurso = async (req, res) => {

    try {

        const id_curso = parseInt(req.params.id);

        const cursoExiste = await prisma.curso.findUnique({
            where: { id_curso },
            select: { id_curso: true }
        });

        if (!cursoExiste) {
            return res.status(404).json({ message: "Curso no encontrado" });
        }

        const actividades = await prisma.actividad.findMany({
            where: {
                id_curso: id_curso
            },
            select: {
                id_actividad: true,
                titulo: true,
                descripcion: true,
                tipo: true,
                fecha_inicio: true,
                fecha_fin: true,
                estado: true,
                archivo: true,
                seccion: {
                    select: {
                        id_seccion: true,
                        nombre: true
                    }
                },
                docente: {
                    select: {
                        id_docente: true,
                        nombre: true,
                        apellido: true
                    }
                }
            },
            orderBy: {
                fecha_inicio: 'asc'
            }
        });

        const actividadesFormateadas = actividades.map(actividad => ({
            ...actividad,
            fecha_inicio: actividad.fecha_inicio?.toLocaleString("es-PE", {
                dateStyle: "medium",
                timeStyle: "short",
            }),
            fecha_fin: actividad.fecha_fin?.toLocaleString("es-PE", {
                dateStyle: "medium",
                timeStyle: "short",
            }),
            seccion_nombre: actividad.seccion?.nombre || "General",
            docente_nombre: actividad.docente ?
                `${actividad.docente.nombre} ${actividad.docente.apellido}` : null
        }));

        res.json({
            success: true,
            data: actividadesFormateadas,
            curso: {
                id_curso: cursoExiste.id_curso,
                nombre: cursoExiste.nombre
            }
        });
    } catch (error) {
        console.error("Error al obtener actividades:", error);
        res.status(500).json({ error: "Error al obtener actividades" });
    }

}

export const getCursosByEstudiante = async (req, res) => {

    try {
        const id_estudiante = parseInt(req.params.id);

        const estudiante = await prisma.estudiante.findUnique({
            where: { id_estudiante },
            select: {
                id_estudiante: true,
                seccion: {
                    select: {
                        id_seccion: true,
                        seccionesCurso: {
                            select: {
                                curso: {
                                    select: {
                                        id_curso: true,
                                        nombre: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!estudiante) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }

        if (!estudiante.seccion || !estudiante.seccion.seccionesCurso?.length) {
            return res.json([]);
        }

        const resultado = estudiante.seccion.seccionesCurso.map((sc) => ({
            id_estudiante: estudiante.id_estudiante,
            id_seccion: estudiante.seccion.id_seccion,
            id_curso: sc.curso.id_curso,
            curso: sc.curso.nombre,
        }));

        res.json(resultado);
    } catch (error) {
        console.error("Error al obtener cursos:", error);
        res.status(500).json({ error: "Error al obtener cursos" });
    }

}

export const getDatosEstudiantes = async (req, res) => {

    try {
        const id_estudiante = parseInt(req.params.id);

        const datos = await prisma.estudiante.findUnique({
            where: { id_estudiante },
            select: {
                codigo: true,
                dni: true,
                nombre: true,
                apellido: true,
                usuario: {
                    select: {
                        correo: true
                    }
                }
            }
        });

        const formato = [
            {
                correo: datos.usuario?.correo,
                codigo: datos.codigo,
                dni: datos.dni,
                nombre: datos.nombre,
                apellido: datos.apellido
            }
        ]

        res.json(formato);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        res.status(500).json({ error: "Error al obtener datos" });
    }

}

export const notificacionesByEstudiante = async (req, res) => {

    try {

        const id_estudiante = parseInt(req.params.id);

        const estudiante = await prisma.estudiante.findUnique({
            where: { id_estudiante },
            select: {
                entregas: {
                    select: {
                        notificacion: {
                            select: {
                                mensaje: true,
                                tipo: true,
                                fecha_envio: true
                            }
                        }
                    }
                }
            }
        })

        if (!estudiante) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }

        const resultado = estudiante.entregas.map((e) => ({
            mensaje: e.notificacion.mensaje,
            tipo: e.notificacion.tipo,
            fecha: e.notificacion?.fecha_envio
                ? new Date(e.notificacion.fecha_envio).toLocaleString('es-PE', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })
                : null

        }));

        res.json(resultado);

    } catch (error) {
        console.error("Error al obtener notificaciones:", error);
        res.status(500).json({ error: "Error al obtener notificaciones" });
    }

}

//Temporal
export const getMisEntregas = async (req, res) => {
  try {
    const id_curso = parseInt(req.params.id_curso);
    const id_estudiante = req.user.id_estudiante; // Del token

    const entregas = await prisma.entrega.findMany({
      where: {
        id_estudiante: id_estudiante,
        actividad: {
          id_curso: id_curso
        }
      },
      include: {
        actividad: {
          select: {
            id_actividad: true,
            titulo: true,
            tipo: true
          }
        }
      },
      orderBy: {
        fecha_entrega: 'desc'
      }
    });

    res.json({
      success: true,
      data: entregas
    });

  } catch (error) {
    console.error('Error obteniendo mis entregas:', error);
    res.status(500).json({ error: 'Error al obtener entregas' });
  }
};