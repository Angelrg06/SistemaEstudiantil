import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 🟢 Formato estándar de respuesta exitosa
const successResponse = (data, message = null, metadata = {}) => ({
  success: true,
  data,
  message,
  ...metadata,
  timestamp: new Date().toISOString()
});

// 🟢 Formato estándar de error
const errorResponse = (message, error = null, statusCode = 500) => ({
  success: false,
  message,
  error,
  timestamp: new Date().toISOString()
});

/**
 * 🟢 Obtener notificaciones de un docente
 */
export const obtenerNotificacionesDocente = async (req, res) => {
  try {
    console.log('🎯 Obteniendo notificaciones para docente ID:', req.params.id);
    const id_docente = Number(req.params.id);
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const notificaciones = await prisma.notificacion.findMany({
      where: {
        id_docente: id_docente
      },
      include: {
        actividad: {
          select: {
            id_actividad: true,
            titulo: true,
            tipo: true
          }
        },
        entrega: {
          include: {
            estudiante: {
              select: {
                nombre: true,
                apellido: true,
                codigo: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha_envio: 'desc'
      },
      take: 50 // Limitar a las 50 más recientes
    });

    console.log(`✅ Encontradas ${notificaciones.length} notificaciones`);

    // Formatear las notificaciones
    const notificacionesFormateadas = notificaciones.map(notif => ({
      id_notificacion: notif.id_notificacion,
      mensaje: notif.mensaje,
      tipo: notif.tipo,
      fecha_envio: notif.fecha_envio.toLocaleString('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      actividad: notif.actividad ? {
        id_actividad: notif.actividad.id_actividad,
        titulo: notif.actividad.titulo,
        tipo: notif.actividad.tipo
      } : null,
      entrega: notif.entrega ? {
        id_entrega: notif.entrega.id_entrega,
        estudiante: notif.entrega.estudiante ? {
          nombre: notif.entrega.estudiante.nombre,
          apellido: notif.entrega.estudiante.apellido,
          codigo: notif.entrega.estudiante.codigo
        } : null
      } : null,
      metadata: {
        tiene_actividad: !!notif.actividad,
        tiene_entrega: !!notif.entrega,
        es_reciente: new Date() - new Date(notif.fecha_envio) < 24 * 60 * 60 * 1000 // Menos de 24 horas
      }
    }));

    res.json(successResponse(
      notificacionesFormateadas,
      `Se encontraron ${notificaciones.length} notificaciones`,
      {
        count: notificaciones.length,
        docente_id: id_docente,
        estadisticas: {
          no_leidas: notificacionesFormateadas.filter(n => n.metadata.es_reciente).length,
          con_entregas: notificacionesFormateadas.filter(n => n.metadata.tiene_entrega).length,
          con_actividades: notificacionesFormateadas.filter(n => n.metadata.tiene_actividad).length
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener notificaciones del docente:", error);
    res.status(500).json(
      errorResponse("Error al obtener notificaciones del docente", error.message)
    );
  }
};

/**
 * 🟢 Obtener notificaciones de un estudiante
 */
export const obtenerNotificacionesEstudiante = async (req, res) => {
  try {
    console.log('🎯 Obteniendo notificaciones para estudiante ID:', req.params.id);
    const id_estudiante = Number(req.params.id);
    
    if (!id_estudiante || isNaN(id_estudiante)) {
      return res.status(400).json(
        errorResponse("ID de estudiante inválido", "El ID del estudiante debe ser un número válido", 400)
      );
    }

    const notificaciones = await prisma.notificacion.findMany({
      where: {
        entrega: {
          id_estudiante: id_estudiante
        }
      },
      include: {
        actividad: {
          select: {
            id_actividad: true,
            titulo: true,
            tipo: true
          }
        },
        docente: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        fecha_envio: 'desc'
      },
      take: 30 // Limitar a las 30 más recientes
    });

    console.log(`✅ Encontradas ${notificaciones.length} notificaciones para el estudiante`);

    const notificacionesFormateadas = notificaciones.map(notif => ({
      id_notificacion: notif.id_notificacion,
      mensaje: notif.mensaje,
      tipo: notif.tipo,
      fecha_envio: notif.fecha_envio.toLocaleString('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      actividad: notif.actividad ? {
        id_actividad: notif.actividad.id_actividad,
        titulo: notif.actividad.titulo
      } : null,
      docente: notif.docente ? {
        nombre: `${notif.docente.nombre} ${notif.docente.apellido}`
      } : null,
      metadata: {
        es_reciente: new Date() - new Date(notif.fecha_envio) < 24 * 60 * 60 * 1000,
        tiene_actividad: !!notif.actividad,
        tiene_docente: !!notif.docente
      }
    }));

    res.json(successResponse(
      notificacionesFormateadas,
      `Se encontraron ${notificaciones.length} notificaciones`,
      {
        count: notificaciones.length,
        estudiante_id: id_estudiante,
        estadisticas: {
          no_leidas: notificacionesFormateadas.filter(n => n.metadata.es_reciente).length,
          del_docente: notificacionesFormateadas.filter(n => n.metadata.tiene_docente).length,
          de_actividades: notificacionesFormateadas.filter(n => n.metadata.tiene_actividad).length
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener notificaciones del estudiante:", error);
    res.status(500).json(
      errorResponse("Error al obtener notificaciones del estudiante", error.message)
    );
  }
};

/**
 * 🟢 Crear nueva notificación
 */
export const crearNotificacion = async (req, res) => {
  try {
    const { mensaje, tipo, id_actividad, id_docente, id_entrega } = req.body;
    
    console.log('🆕 Creando nueva notificación:', { 
      tipo, 
      id_actividad, 
      id_docente, 
      id_entrega,
      longitud_mensaje: mensaje?.length 
    });

    // Validaciones
    if (!mensaje || mensaje.trim().length === 0) {
      return res.status(400).json(
        errorResponse("El mensaje es requerido", "La notificación debe contener un mensaje", 400)
      );
    }

    if (!id_docente) {
      return res.status(400).json(
        errorResponse("ID de docente requerido", "Toda notificación debe estar asociada a un docente", 400)
      );
    }

    const nuevaNotificacion = await prisma.notificacion.create({
      data: {
        mensaje: mensaje.trim(),
        tipo: tipo || 'sistema',
        fecha_envio: new Date(),
        id_actividad: id_actividad ? Number(id_actividad) : null,
        id_docente: Number(id_docente),
        id_entrega: id_entrega ? Number(id_entrega) : null
      },
      include: {
        actividad: {
          select: {
            titulo: true
          }
        },
        docente: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      }
    });

    console.log('✅ Notificación creada exitosamente, ID:', nuevaNotificacion.id_notificacion);

    res.json(successResponse(
      nuevaNotificacion,
      "Notificación creada correctamente",
      {
        notificacion_id: nuevaNotificacion.id_notificacion,
        docente_id: id_docente,
        tipo: tipo || 'sistema'
      }
    ));
  } catch (error) {
    console.error("❌ Error al crear notificación:", error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2003') {
      return res.status(400).json(
        errorResponse("Referencia inválida", "Uno de los IDs proporcionados no existe", 400)
      );
    }

    res.status(500).json(
      errorResponse("Error al crear notificación", error.message)
    );
  }
};

/**
 * 🟢 Marcar notificación como leída (eliminar)
 */
export const eliminarNotificacion = async (req, res) => {
  try {
    const id_notificacion = Number(req.params.id);
    
    console.log('🗑️ Eliminando notificación ID:', id_notificacion);

    if (!id_notificacion || isNaN(id_notificacion)) {
      return res.status(400).json(
        errorResponse("ID de notificación inválido", "El ID de la notificación debe ser un número válido", 400)
      );
    }

    const notificacion = await prisma.notificacion.findUnique({
      where: { id_notificacion }
    });

    if (!notificacion) {
      return res.status(404).json(
        errorResponse("Notificación no encontrada", "La notificación solicitada no existe", 404)
      );
    }

    await prisma.notificacion.delete({
      where: { id_notificacion }
    });

    console.log('✅ Notificación eliminada exitosamente');

    res.json(successResponse(
      null,
      "Notificación eliminada correctamente",
      {
        notificacion_id: id_notificacion,
        mensaje: notificacion.mensaje.substring(0, 50) + '...'
      }
    ));
  } catch (error) {
    console.error("❌ Error al eliminar notificación:", error);
    res.status(500).json(
      errorResponse("Error al eliminar notificación", error.message)
    );
  }
};

/**
 * 🟢 Obtener estadísticas de notificaciones
 */
export const obtenerEstadisticasNotificaciones = async (req, res) => {
  try {
    const id_docente = Number(req.params.id);
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const [total, hoy, conEntregas, conActividades] = await Promise.all([
      // Total de notificaciones
      prisma.notificacion.count({
        where: { id_docente }
      }),
      // Notificaciones de hoy
      prisma.notificacion.count({
        where: {
          id_docente,
          fecha_envio: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      // Notificaciones con entregas
      prisma.notificacion.count({
        where: {
          id_docente,
          id_entrega: { not: null }
        }
      }),
      // Notificaciones con actividades
      prisma.notificacion.count({
        where: {
          id_docente,
          id_actividad: { not: null }
        }
      })
    ]);

    const estadisticas = {
      total_notificaciones: total,
      notificaciones_hoy: hoy,
      notificaciones_entregas: conEntregas,
      notificaciones_actividades: conActividades,
      notificaciones_sistema: total - conEntregas - conActividades,
      promedio_diario: total > 0 ? (total / 30).toFixed(1) : 0 // Promedio último mes
    };

    res.json(successResponse(
      estadisticas,
      "Estadísticas de notificaciones obtenidas",
      {
        docente_id: id_docente,
        periodo_consulta: new Date().toISOString().split('T')[0]
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener estadísticas de notificaciones:", error);
    res.status(500).json(
      errorResponse("Error al obtener estadísticas de notificaciones", error.message)
    );
  }
};

/**
 * 🟢 Health check del servicio de notificaciones
 */
export const healthCheck = async (req, res) => {
  try {
    console.log('🏥 Health check del servicio de notificaciones');
    
    // Verificar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;
    
    // Obtener estadísticas básicas
    const [totalNotificaciones, totalDocentes, totalEstudiantes] = await Promise.all([
      prisma.notificacion.count(),
      prisma.notificacion.groupBy({
        by: ['id_docente'],
        _count: true
      }),
      prisma.notificacion.count({
        where: {
          entrega: {
            isNot: null
          }
        }
      })
    ]);

    const healthStatus = {
      status: 'healthy',
      database: 'connected',
      service: 'notification-service',
      stats: {
        total_notificaciones: totalNotificaciones,
        docentes_con_notificaciones: totalDocentes.length,
        notificaciones_estudiantes: totalEstudiantes
      }
    };

    console.log('✅ Health check completado, estado:', healthStatus.status);
    
    res.json(successResponse(
      healthStatus,
      "Servicio de notificaciones operativo",
      {
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    ));
  } catch (error) {
    console.error("❌ Error en health check:", error);
    res.status(503).json(
      errorResponse("Servicio de notificaciones no disponible", error.message, 503)
    );
  }
};