// controllers/retroalimentacion.controller.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 🟢 Formato estándar de respuesta
const successResponse = (data, message = null) => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

const errorResponse = (message, error = null) => ({
  success: false,
  message,
  error: error?.message || error,
  timestamp: new Date().toISOString()
});

// 📋 Obtener entregas de una actividad para calificar
export const obtenerEntregasParaCalificar = async (req, res) => {
  try {
    const { id_actividad } = req.params;
    const id_usuario = req.user.id_usuario;

    console.log('📋 Obteniendo entregas para calificar de actividad:', id_actividad);

    // 🟢 Verificar que el usuario es docente
    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('No tienes permisos para calificar entregas')
      );
    }

    // 🟢 Verificar que la actividad pertenece al docente
    const actividad = await prisma.actividad.findFirst({
      where: {
        id_actividad: parseInt(id_actividad),
        id_docente: docente.id_docente
      },
      include: {
        curso: {
          select: {
            nombre: true
          }
        },
        seccion: {
          select: {
            nombre: true
          }
        }
      }
    });

    if (!actividad) {
      return res.status(404).json(
        errorResponse('Actividad no encontrada o no tienes permisos')
      );
    }

    // 🟢 Obtener todas las entregas de esta actividad
    const entregas = await prisma.entrega.findMany({
      where: {
        id_actividad: parseInt(id_actividad)
      },
      include: {
        estudiante: {
          select: {
            id_estudiante: true,
            codigo: true,
            nombre: true,
            apellido: true,
            id_seccion: true
          }
        },
        retroalimentacion: {
          select: {
            id_retroalimentacion: true,
            calificacion: true,
            comentario: true,
            fecha: true
          }
        }
      },
      orderBy: [
        { estudiante: { apellido: 'asc' } },
        { estudiante: { nombre: 'asc' } },
        { intento: 'asc' }
      ]
    });

    console.log(`📊 Encontradas ${entregas.length} entregas para calificar`);

    // 🟢 Agrupar entregas por estudiante
    const entregasPorEstudiante = {};
    
    entregas.forEach(entrega => {
      const estudianteId = entrega.id_estudiante;
      
      if (!entregasPorEstudiante[estudianteId]) {
        entregasPorEstudiante[estudianteId] = {
          estudiante: entrega.estudiante,
          entregas: [],
          mejorIntento: null,
          calificacionFinal: null
        };
      }
      
      entregasPorEstudiante[estudianteId].entregas.push(entrega);
    });

    // 🟢 Calcular mejor intento y calificación final para cada estudiante
    Object.values(entregasPorEstudiante).forEach(infoEstudiante => {
      const entregasConCalificacion = infoEstudiante.entregas.filter(
        e => e.retroalimentacion?.calificacion !== null && e.retroalimentacion?.calificacion !== undefined
      );
      
      if (entregasConCalificacion.length > 0) {
        // Encontrar la calificación más alta
        const mejorEntrega = entregasConCalificacion.reduce((prev, current) => 
          (prev.retroalimentacion.calificacion > current.retroalimentacion.calificacion) ? prev : current
        );
        
        infoEstudiante.mejorIntento = mejorEntrega.intento;
        infoEstudiante.calificacionFinal = mejorEntrega.retroalimentacion.calificacion;
      }
    });

    // 🟢 Preparar datos para respuesta
    const resultado = {
      actividad: {
        id_actividad: actividad.id_actividad,
        titulo: actividad.titulo,
        curso: actividad.curso.nombre,
        seccion: actividad.seccion.nombre,
        tipo: actividad.tipo
      },
      estudiantes: Object.values(entregasPorEstudiante).map(info => ({
        estudiante: info.estudiante,
        totalEntregas: info.entregas.length,
        entregas: info.entregas.map(e => ({
          id_entrega: e.id_entrega,
          intento: e.intento,
          fecha_entrega: e.fecha_entrega,
          archivo: e.archivo,
          comentario_estudiante: e.comentario_estudiante,
          estado_entrega: e.estado_entrega,
          retroalimentacion: e.retroalimentacion
        })),
        mejorIntento: info.mejorIntento,
        calificacionFinal: info.calificacionFinal
      })),
      estadisticas: {
        totalEstudiantes: Object.keys(entregasPorEstudiante).length,
        totalEntregas: entregas.length,
        estudiantesCalificados: Object.values(entregasPorEstudiante).filter(
          e => e.calificacionFinal !== null
        ).length,
        promedioCalificaciones: Object.values(entregasPorEstudiante)
          .filter(e => e.calificacionFinal !== null)
          .reduce((sum, e) => sum + e.calificacionFinal, 0) / 
          Object.values(entregasPorEstudiante).filter(e => e.calificacionFinal !== null).length || 0
      }
    };

    res.json(successResponse(
      resultado,
      `Se encontraron ${entregas.length} entregas de ${Object.keys(entregasPorEstudiante).length} estudiantes`
    ));

  } catch (error) {
    console.error("❌ Error al obtener entregas para calificar:", error);
    res.status(500).json(
      errorResponse("Error al obtener entregas para calificar", error)
    );
  }
};

// 📝 CORREGIR calificarEntrega - Versión mejorada
// 📝 FUNCIÓN ÚNICA Y CORREGIDA calificarEntrega
export const calificarEntrega = async (req, res) => {
  try {
    const { id_entrega } = req.params;
    const { calificacion, comentario } = req.body;
    const id_usuario = req.user.id_usuario;

    console.log('📝 Calificando entrega:', id_entrega);

    // 🟢 1. VALIDACIONES BÁSICAS
    if (!calificacion || isNaN(parseFloat(calificacion))) {
      return res.status(400).json(
        errorResponse('La calificación es requerida y debe ser un número')
      );
    }

    const calificacionNum = parseFloat(calificacion);
    if (calificacionNum < 0 || calificacionNum > 20) {
      return res.status(400).json(
        errorResponse('La calificación debe estar entre 0 y 20')
      );
    }

    // 🟢 2. VERIFICAR DOCENTE
    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('No tienes permisos para calificar')
      );
    }

    // 🟢 3. OBTENER ENTREGA CON INFORMACIÓN BÁSICA
    const entrega = await prisma.entrega.findUnique({
      where: { id_entrega: parseInt(id_entrega) },
      include: {
        actividad: {
          include: {
            docente: true,
            seccion: {
              select: {
                id_seccion: true,
                nombre: true
              }
            }
          }
        },
        estudiante: {
          select: {
            id_estudiante: true,
            nombre: true,
            apellido: true,
            id_seccion: true
          }
        }
      }
    });

    if (!entrega) {
      return res.status(404).json(
        errorResponse('Entrega no encontrada')
      );
    }

    // 🟢 4. VERIFICAR PERMISOS DETALLADOS
    if (entrega.actividad.id_docente !== docente.id_docente) {
      return res.status(403).json(
        errorResponse('No tienes permisos para calificar esta entrega')
      );
    }

    // Verificar que el estudiante pertenece a la sección de la actividad
    // SOLO si la actividad tiene sección
    if (entrega.actividad.seccion && entrega.actividad.seccion.id_seccion) {
      const estudianteEnSeccion = await prisma.estudiante.findFirst({
        where: {
          id_estudiante: entrega.id_estudiante,
          id_seccion: entrega.actividad.seccion.id_seccion
        }
      });

      if (!estudianteEnSeccion) {
        return res.status(403).json(
          errorResponse('El estudiante no pertenece a la sección de esta actividad')
        );
      }
    }

    // 🟢 5. MANEJAR RETROALIMENTACIÓN EXISTENTE O NUEVA
    let retroalimentacion;
    
    const retroExistente = await prisma.retroalimentacion.findUnique({
      where: { id_entrega: parseInt(id_entrega) }
    });

    if (retroExistente) {
      // Actualizar existente
      retroalimentacion = await prisma.retroalimentacion.update({
        where: { id_retroalimentacion: retroExistente.id_retroalimentacion },
        data: {
          calificacion: calificacionNum,
          comentario: comentario || retroExistente.comentario,
          fecha: new Date()
        }
      });
    } else {
      // Crear nueva
      retroalimentacion = await prisma.retroalimentacion.create({
        data: {
          calificacion: calificacionNum,
          comentario: comentario || null,
          fecha: new Date(),
          id_actividad: entrega.actividad.id_actividad,
          id_docente: docente.id_docente,
          id_entrega: parseInt(id_entrega)
        }
      });
    }

    // 🟢 6. ACTUALIZAR ESTADO DE ENTREGA
    await prisma.entrega.update({
      where: { id_entrega: parseInt(id_entrega) },
      data: { estado_entrega: 'CALIFICADO' }
    });

    // 🟢 7. MANEJAR NOTIFICACIÓN (con verificación de existencia)
    const notificacionExistente = await prisma.notificacion.findUnique({
      where: { id_entrega: parseInt(id_entrega) }
    });

    if (notificacionExistente) {
      await prisma.notificacion.update({
        where: { id_notificacion: notificacionExistente.id_notificacion },
        data: {
          mensaje: `Tu entrega "${entrega.actividad.titulo}" ha sido calificada: ${calificacionNum}/20`,
          fecha_envio: new Date()
        }
      });
    } else {
      await prisma.notificacion.create({
        data: {
          mensaje: `Tu entrega "${entrega.actividad.titulo}" ha sido calificada: ${calificacionNum}/20`,
          tipo: 'calificacion',
          fecha_envio: new Date(),
          id_actividad: entrega.actividad.id_actividad,
          id_docente: docente.id_docente,
          id_entrega: parseInt(id_entrega)
        }
      });
    }

    // 🟢 8. OBTENER RESPUESTA COMPLETA
    const respuesta = await prisma.entrega.findUnique({
      where: { id_entrega: parseInt(id_entrega) },
      include: {
        estudiante: {
          select: {
            id_estudiante: true,
            nombre: true,
            apellido: true,
            codigo: true
          }
        },
        actividad: {
          select: {
            id_actividad: true,
            titulo: true,
            tipo: true
          }
        },
        retroalimentacion: true
      }
    });

    res.json(successResponse(
      respuesta,
      retroExistente ? 'Calificación actualizada' : 'Entrega calificada correctamente'
    ));

  } catch (error) {
    console.error("❌ Error al calificar entrega:", error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(400).json(
        errorResponse('Ya existe una retroalimentación para esta entrega')
      );
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json(
        errorResponse('La entrega no existe')
      );
    }
    
    res.status(500).json(
      errorResponse("Error al calificar la entrega", error)
    );
  }
};

// 📊 Obtener calificaciones por actividad
export const obtenerCalificacionesPorActividad = async (req, res) => {
  try {
    const { id_actividad } = req.params;
    const id_usuario = req.user.id_usuario;

    console.log('📊 Obteniendo calificaciones para actividad:', id_actividad);

    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('No autorizado')
      );
    }

    // 🟢 Obtener todas las retroalimentaciones de esta actividad
    const retroalimentaciones = await prisma.retroalimentacion.findMany({
      where: {
        id_actividad: parseInt(id_actividad),
        id_docente: docente.id_docente
      },
      include: {
        entrega: {
          include: {
            estudiante: {
              select: {
                id_estudiante: true,
                codigo: true,
                nombre: true,
                apellido: true
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // 🟢 Formatear respuesta
    const calificaciones = retroalimentaciones.map(r => ({
      id_retroalimentacion: r.id_retroalimentacion,
      estudiante: {
        id_estudiante: r.entrega.estudiante.id_estudiante,
        codigo: r.entrega.estudiante.codigo,
        nombre: r.entrega.estudiante.nombre,
        apellido: r.entrega.estudiante.apellido
      },
      intento: r.entrega.intento,
      calificacion: r.calificacion,
      comentario: r.comentario,
      fecha_calificacion: r.fecha,
      fecha_entrega: r.entrega.fecha_entrega
    }));

    // 🟢 Calcular estadísticas
    const calificacionesNumeros = retroalimentaciones.map(r => r.calificacion).filter(c => c !== null);
    const estadisticas = {
      total_calificaciones: calificacionesNumeros.length,
      promedio: calificacionesNumeros.length > 0 
        ? calificacionesNumeros.reduce((a, b) => a + b, 0) / calificacionesNumeros.length 
        : 0,
      maxima: calificacionesNumeros.length > 0 ? Math.max(...calificacionesNumeros) : 0,
      minima: calificacionesNumeros.length > 0 ? Math.min(...calificacionesNumeros) : 0
    };

    res.json(successResponse(
      {
        calificaciones,
        estadisticas
      },
      `Se encontraron ${calificaciones.length} calificaciones`
    ));

  } catch (error) {
    console.error("❌ Error al obtener calificaciones:", error);
    res.status(500).json(
      errorResponse("Error al obtener calificaciones", error)
    );
  }
};

// 📈 Obtener reporte de notas por sección
export const obtenerReporteNotasSeccion = async (req, res) => {
  try {
    const { id_seccion } = req.params;
    const id_usuario = req.user.id_usuario;

    console.log('📈 Generando reporte de notas para sección:', id_seccion);

    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('No autorizado')
      );
    }

    // 🟢 Obtener todas las actividades del docente en esta sección
    const actividades = await prisma.actividad.findMany({
      where: {
        id_seccion: parseInt(id_seccion),
        id_docente: docente.id_docente
      },
      include: {
        curso: {
          select: {
            nombre: true
          }
        }
      }
    });

    // 🟢 Obtener estudiantes de la sección
    const estudiantes = await prisma.estudiante.findMany({
      where: {
        id_seccion: parseInt(id_seccion)
      },
      select: {
        id_estudiante: true,
        codigo: true,
        nombre: true,
        apellido: true
      },
      orderBy: [
        { apellido: 'asc' },
        { nombre: 'asc' }
      ]
    });

    // 🟢 Obtener calificaciones para cada actividad
    const reporte = await Promise.all(
      estudiantes.map(async (estudiante) => {
        const calificaciones = await Promise.all(
          actividades.map(async (actividad) => {
            // Buscar la mejor calificación del estudiante para esta actividad
            const entregas = await prisma.entrega.findMany({
              where: {
                id_actividad: actividad.id_actividad,
                id_estudiante: estudiante.id_estudiante
              },
              include: {
                retroalimentacion: {
                  select: {
                    calificacion: true,
                    fecha: true
                  }
                }
              },
              orderBy: {
                intento: 'desc'
              }
            });

            // Encontrar la calificación más alta
            let mejorCalificacion = null;
            let intento = null;

            entregas.forEach(entrega => {
              if (entrega.retroalimentacion?.calificacion !== null && 
                  entrega.retroalimentacion?.calificacion !== undefined) {
                if (mejorCalificacion === null || entrega.retroalimentacion.calificacion > mejorCalificacion) {
                  mejorCalificacion = entrega.retroalimentacion.calificacion;
                  intento = entrega.intento;
                }
              }
            });

            return {
              id_actividad: actividad.id_actividad,
              titulo: actividad.titulo,
              curso: actividad.curso.nombre,
              calificacion: mejorCalificacion,
              intento: intento,
              entregas_totales: entregas.length
            };
          })
        );

        // Calcular promedio
        const calificacionesValidas = calificaciones.filter(c => c.calificacion !== null);
        const promedio = calificacionesValidas.length > 0
          ? calificacionesValidas.reduce((sum, c) => sum + c.calificacion, 0) / calificacionesValidas.length
          : null;

        return {
          estudiante,
          calificaciones,
          promedio: promedio !== null ? parseFloat(promedio.toFixed(2)) : null,
          actividades_calificadas: calificacionesValidas.length,
          actividades_totales: actividades.length
        };
      })
    );

    // 🟢 Calcular estadísticas generales
    const promediosEstudiantes = reporte.map(r => r.promedio).filter(p => p !== null);
    const estadisticasGenerales = {
      total_estudiantes: reporte.length,
      estudiantes_calificados: promediosEstudiantes.length,
      promedio_general: promediosEstudiantes.length > 0
        ? promediosEstudiantes.reduce((a, b) => a + b, 0) / promediosEstudiantes.length
        : 0,
      max_promedio: promediosEstudiantes.length > 0 ? Math.max(...promediosEstudiantes) : 0,
      min_promedio: promediosEstudiantes.length > 0 ? Math.min(...promediosEstudiantes) : 0
    };

    res.json(successResponse(
      {
        actividades: actividades.map(a => ({
          id_actividad: a.id_actividad,
          titulo: a.titulo,
          curso: a.curso.nombre,
          tipo: a.tipo
        })),
        reporte,
        estadisticas_generales: estadisticasGenerales
      },
      `Reporte generado para ${reporte.length} estudiantes`
    ));

  } catch (error) {
    console.error("❌ Error al generar reporte de notas:", error);
    res.status(500).json(
      errorResponse("Error al generar reporte de notas", error)
    );
  }
};