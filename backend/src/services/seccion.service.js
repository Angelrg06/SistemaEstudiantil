//sección.service.js:
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 🟢 NUEVO MÉTODO: Obtener información específica de una sección con validación de permisos
export const getSeccionById = async (id_seccion, id_usuario) => {
  try {
    console.log('🔍 Servicio: Obteniendo sección', id_seccion, 'para usuario', id_usuario);

    // 🟢 VERIFICAR que el docente tenga acceso a esta sección
    const docente = await prisma.docente.findFirst({
      where: {
        id_usuario: id_usuario,
        secciones: {
          some: {
            id_seccion: id_seccion
          }
        }
      }
    });

    if (!docente) {
      console.log('❌ Docente no tiene permisos para esta sección');
      return null;
    }

    // 🟢 OBTENER información completa de la sección
    const seccion = await prisma.seccion.findUnique({
      where: { id_seccion },
      include: {
        bimestre: {
          select: {
            id_bimestre: true,
            nombre: true,
            fecha_inicio: true,
            fecha_fin: true
          }
        },
        seccionesCurso: {
          include: {
            curso: {
              select: {
                id_curso: true,
                nombre: true
              }
            }
          }
        },
        _count: {
          select: {
            estudiantes: true,
            actividades: {
              where: {
                id_docente: docente.id_docente // 🟢 Solo actividades de este docente
              }
            }
          }
        }
      }
    });

    if (!seccion) {
      console.log('❌ Sección no encontrada');
      return null;
    }

    // 🟢 FORMATEAR respuesta
    const seccionFormateada = {
      id_seccion: seccion.id_seccion,
      nombre: seccion.nombre,
      bimestre: seccion.bimestre,
      cursos: seccion.seccionesCurso.map(sc => sc.curso),
      total_estudiantes: seccion._count.estudiantes,
      total_actividades: seccion._count.actividades,
      docente_actual: {
        id_docente: docente.id_docente,
        nombre: docente.nombre,
        apellido: docente.apellido
      }
    };

    console.log('✅ Servicio: Sección obtenida correctamente');
    return seccionFormateada;

  } catch (error) {
    console.error('❌ Error en getSeccionById:', error);
    throw error;
  }
};

// 🟢 FUNCIÓN HELPER - CORREGIDA: Exportar y hacer reusable
export const obtenerIdUsuarioDocente = async (id_docente) => {
  if (!id_docente) {
    throw new Error("ID de docente es requerido");
  }
  
  const docente = await prisma.docente.findUnique({
    where: { id_docente: Number(id_docente) },
    select: { id_usuario: true }
  });
  
  if (!docente) {
    throw new Error(`Docente con ID ${id_docente} no encontrado`);
  }
  
  return docente.id_usuario;
};

// 🟢 FUNCIÓN HELPER ALTERNATIVA - Más robusta
export const getDocenteInfo = async (id_docente) => {
  try {
    const docente = await prisma.docente.findUnique({
      where: { id_docente: Number(id_docente) },
      select: { 
        id_docente: true,
        id_usuario: true,
        nombre: true,
        apellido: true,
        codigo: true 
      }
    });
    
    if (!docente) {
      throw new Error(`Docente con ID ${id_docente} no encontrado`);
    }
    
    return docente;
  } catch (error) {
    console.error("❌ Error en getDocenteInfo:", error);
    throw new Error(`No se pudo obtener información del docente: ${error.message}`);
  }
};

/**
 * 🟢 Verificar si una sección está activa según el bimestre
 */
const estaSeccionActiva = (bimestre) => {
  if (!bimestre || !bimestre.fecha_inicio || !bimestre.fecha_fin) return false;
  
  const ahora = new Date();
  const fechaInicio = new Date(bimestre.fecha_inicio);
  const fechaFin = new Date(bimestre.fecha_fin);
  
  // Considerar el día completo de la fecha fin
  fechaFin.setHours(23, 59, 59, 999);
  
  return ahora >= fechaInicio && ahora <= fechaFin;
};

/**
 * 🟢 Obtener secciones del docente - CORREGIDO
 */
// 🟢 CORREGIDO: Obtener secciones del docente BASADO EN RELACIONES REALES
export const getSeccionesByDocente = async (id_docente) => {
  try {
    console.log('🔍 Buscando secciones REALES para docente ID:', id_docente);
    
    // ✅ PRIMERO: Verificar que el docente existe
    const docenteExiste = await prisma.docente.findUnique({
      where: { id_docente: Number(id_docente) },
      select: { id_docente: true, nombre: true, apellido: true }
    });

    if (!docenteExiste) {
      throw new Error(`Docente con ID ${id_docente} no encontrado`);
    }

    console.log('✅ Docente encontrado:', docenteExiste.nombre, docenteExiste.apellido);

    // ✅ OBTENER secciones BASADO EN RELACIONES (no en actividades)
    const secciones = await prisma.seccion.findMany({
      where: {
        docentes: {
          some: { 
            id_docente: Number(id_docente) 
          }
        }
      },
      include: {
        seccionesCurso: {
          include: {
            curso: {
              select: { 
                id_curso: true,
                nombre: true 
              }
            }
          }
        },
        bimestre: {
          select: {
            id_bimestre: true,
            nombre: true,
            fecha_inicio: true,
            fecha_fin: true
          }
        },
        estudiantes: {
          select: {
            id_estudiante: true
          }
        },
        actividades: {
          where: {
            id_docente: Number(id_docente)
          },
          select: {
            id_actividad: true
          }
        },
        docentes: {
          where: { id_docente: Number(id_docente) },
          select: {
            id_docente: true,
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`📋 Secciones REALES encontradas para ${docenteExiste.nombre}:, secciones.length`);
    
    // ✅ LOG DETALLADO para diagnóstico
    secciones.forEach(sec => {
      console.log(`   - ${sec.nombre}: ${sec.estudiantes.length} estudiantes, ${sec.actividades.length} actividades`);
    });

    // ✅ FORMATEAR respuesta basada en relaciones reales
    return secciones.map(seccion => {
      const cursos = seccion.seccionesCurso.map(sc => sc.curso?.nombre).filter(Boolean);
      const cursoPrincipal = cursos[0] || 'Sin curso asignado';
      
      return {
        id_seccion: seccion.id_seccion,
        nombre: seccion.nombre,
        curso: cursoPrincipal,
        id_curso: seccion.seccionesCurso[0]?.curso?.id_curso,
        cursos: cursos,
        bimestre: seccion.bimestre,
        docente: seccion.docentes[0],
        _count: {
          estudiantes: seccion.estudiantes.length,
          actividades: seccion.actividades.length
        },
        metadata: {
          tiene_curso: seccion.seccionesCurso.length > 0,
          total_cursos: seccion.seccionesCurso.length,
          total_docentes: seccion.docentes.length,
          bimestre_activo: seccion.bimestre ? estaSeccionActiva(seccion.bimestre) : false,
          fecha_consulta: new Date().toISOString()
        }
      };
    });
  } catch (error) {
    console.error("❌ Error al obtener secciones del docente:", error);
    throw new Error(`No se pudieron obtener las secciones: ${error.message}`);
  }
};

/**
 * 🟢 Obtener detalle completo de una sección específica - CORREGIDO
 */
export const getDetalleSeccion = async (id_seccion) => {
  try {
    console.log('🔍 Obteniendo detalle de sección ID:', id_seccion);
    
    const seccion = await prisma.seccion.findUnique({
      where: { id_seccion: id_seccion },
      include: {
        seccionesCurso: {
          include: {
            curso: {
              select: {
                id_curso: true,
                nombre: true
              }
            }
          }
        },
        bimestre: {
          select: {
            id_bimestre: true,
            nombre: true,
            fecha_inicio: true,
            fecha_fin: true
          }
        },
        estudiantes: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                correo: true,
                rol: true
              }
            },
            // ✅ INCLUIR ENTREGAS PARA ESTADÍSTICAS
            entregas: {
              select: {
                id_entrega: true,
                estado_entrega: true,
                fecha_entrega: true
              }
            }
          },
          orderBy: [
            { apellido: 'asc' },
            { nombre: 'asc' }
          ]
        },
        actividades: {
          include: {
            docente: {
              select: {
                nombre: true,
                apellido: true
              }
            },
            entregas: {
              select: {
                id_entrega: true,
                estado_entrega: true,
                fecha_entrega: true
              }
            }
          },
          orderBy: {
            fecha_inicio: 'desc'
          },
          take: 10
        },
        docentes: {
          select: {
            id_docente: true,
            nombre: true,
            apellido: true,
            codigo: true,
            usuario: {
              select: {
                correo: true
              }
            }
          }
        },
        _count: {
          select: {
            estudiantes: true,
            actividades: true,
            grupos: true
          }
        }
      }
    });

    if (!seccion) {
      throw new Error(`Sección con ID ${id_seccion} no encontrada`);
    }

    console.log(`✅ Detalle de sección "${seccion.nombre}" cargado: ${seccion.estudiantes.length} estudiantes, ${seccion.actividades.length} actividades`);

    const cursos = seccion.seccionesCurso.map(sc => sc.curso).filter(Boolean);
    const estudiantesActivos = seccion.estudiantes.filter(est => 
      est.entregas && est.entregas.length > 0
    ).length;
    
    return {
      ...seccion,
      cursos: cursos,
      curso_principal: cursos[0] || null,
      estadisticas: {
        estudiantes_activos: estudiantesActivos,
        actividades_activas: seccion.actividades.filter(act => 
          act.estado === 'activo' || !act.estado
        ).length,
        entregas_totales: seccion.actividades.reduce((total, act) => 
          total + (act.entregas?.length || 0), 0
        ),
        porcentaje_participacion: seccion.estudiantes.length > 0 ? 
          ((estudiantesActivos / seccion.estudiantes.length) * 100).toFixed(1) : 0
      },
      metadata: {
        tiene_bimestre_activo: seccion.bimestre ? estaSeccionActiva(seccion.bimestre) : false,
        total_cursos: cursos.length,
        fecha_consulta: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("❌ Error al obtener detalle de sección:", error);
    throw new Error(`No se pudo obtener el detalle de la sección: ${error.message}`);
  }
};

/**
 * 🟢 Obtener estudiantes de una sección específica - OPTIMIZADO
 */
export const getEstudiantesBySeccion = async (id_seccion) => {
  try {
    console.log('👥 Obteniendo estudiantes para sección ID:', id_seccion);
    
    const estudiantes = await prisma.estudiante.findMany({
      where: { id_seccion: id_seccion },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true
          }
        },
        seccion: {
          select: {
            nombre: true,
            seccionesCurso: {
              include: {
                curso: {
                  select: {
                    nombre: true
                  }
                }
              }
            }
          }
        },
        entregas: {
          select: {
            id_actividad: true,
            estado_entrega: true,
            calificacion: true,
            fecha_entrega: true
          },
          take: 10
        }
      },
      orderBy: [
        { apellido: 'asc' },
        { nombre: 'asc' }
      ]
    });

    console.log(`✅ Estudiantes encontrados: ${estudiantes.length} para sección ${id_seccion}`);

    return estudiantes.map(est => {
      const cursosSeccion = est.seccion?.seccionesCurso?.map(sc => sc.curso?.nombre).filter(Boolean) || [];
      
      return {
        id_estudiante: est.id_estudiante,
        id_usuario: est.id_usuario,
        codigo: est.codigo,
        dni: est.dni,
        nombre: est.nombre,
        apellido: est.apellido,
        correo: est.usuario.correo,
        seccion: est.seccion?.nombre,
        curso: cursosSeccion[0] || 'Sin curso',
        cursos: cursosSeccion,
        info_academica: {
          total_entregas: est.entregas.length,
          entregas_pendientes: est.entregas.filter(e => 
            e.estado_entrega === 'PENDIENTE' || e.estado_entrega === 'ENTREGADO'
          ).length,
          entregas_calificadas: est.entregas.filter(e => e.calificacion !== null).length,
          promedio_calificaciones: est.entregas.filter(e => e.calificacion !== null).length > 0 ?
            (est.entregas.reduce((sum, e) => sum + (e.calificacion || 0), 0) / 
             est.entregas.filter(e => e.calificacion !== null).length).toFixed(1) : null,
          ultima_entrega: est.entregas.length > 0 ? 
            est.entregas.reduce((latest, e) => 
              new Date(e.fecha_entrega) > new Date(latest.fecha_entrega) ? e : latest
            ).fecha_entrega : null
        },
        metadata: {
          estudiante_activo: est.entregas.length > 0,
          tiene_calificaciones: est.entregas.some(e => e.calificacion !== null)
        }
      };
    });
  } catch (error) {
    console.error("❌ Error al obtener estudiantes de sección:", error);
    throw new Error(`No se pudieron obtener los estudiantes: ${error.message}`);
  }
};

/**
 * 🟢 Health check del servicio - MEJORADO
 */
export const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    const [totalSecciones, totalDocentes, totalEstudiantes, totalCursos] = await Promise.all([
      prisma.seccion.count(),
      prisma.docente.count(),
      prisma.estudiante.count(),
      prisma.curso.count()
    ]);
    
    return { 
      status: 'healthy', 
      database: 'connected',
      stats: {
        total_secciones: totalSecciones,
        total_docentes: totalDocentes,
        total_estudiantes: totalEstudiantes,
        total_cursos: totalCursos,
        secciones_por_docente: totalDocentes > 0 ? (totalSecciones / totalDocentes).toFixed(1) : 0
      }
    };
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return { 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    };
  }
};

/**
 * 🟢 Calcular nivel de rendimiento para dashboard
 */
const calcularNivelRendimiento = (estadisticas) => {
  if (estadisticas.total_estudiantes === 0) return 'Sin datos';
  
  const porcentajeActivos = (estadisticas.estudiantes_activos / estadisticas.total_estudiantes) * 100;
  const promedioEntregas = parseFloat(estadisticas.promedio_entregas) || 0;
  
  if (porcentajeActivos >= 80 && promedioEntregas >= 3) return 'Excelente';
  if (porcentajeActivos >= 60 && promedioEntregas >= 2) return 'Bueno';
  if (porcentajeActivos >= 40 && promedioEntregas >= 1) return 'Regular';
  return 'Bajo';
};

/**
 * 🟢 Obtener color para indicador de rendimiento
 */
const obtenerColorRendimiento = (estadisticas) => {
  const nivel = calcularNivelRendimiento(estadisticas);
  const colores = {
    'Excelente': 'green',
    'Bueno': 'blue', 
    'Regular': 'yellow',
    'Bajo': 'red',
    'Sin datos': 'gray'
  };
  return colores[nivel] || 'gray';
};

/**
 * 🟢 Obtener secciones con estadísticas para dashboard - OPTIMIZADO
 */
export const getSeccionesConEstadisticas = async (id_docente) => {
  try {
    console.log('📊 Obteniendo secciones con estadísticas para docente:', id_docente);
    
    const secciones = await getSeccionesByDocente(id_docente);
    
    const seccionesConStats = await Promise.all(
      secciones.map(async (seccion) => {
        try {
          const estudiantes = await getEstudiantesBySeccion(seccion.id_seccion);
          
          const estadisticasEstudiantes = {
            total_estudiantes: estudiantes.length,
            estudiantes_activos: estudiantes.filter(e => 
              e.info_academica.total_entregas > 0
            ).length,
            estudiantes_con_calificaciones: estudiantes.filter(e => 
              e.info_academica.entregas_calificadas > 0
            ).length,
            promedio_entregas: estudiantes.length > 0 ? 
              (estudiantes.reduce((sum, e) => sum + e.info_academica.total_entregas, 0) / estudiantes.length).toFixed(1) : 0,
            promedio_calificaciones: estudiantes.filter(e => e.info_academica.promedio_calificaciones).length > 0 ?
              (estudiantes.reduce((sum, e) => 
                sum + (parseFloat(e.info_academica.promedio_calificaciones) || 0), 0) / 
               estudiantes.filter(e => e.info_academica.promedio_calificaciones).length).toFixed(1) : null
          };

          return {
            ...seccion,
            estadisticas: estadisticasEstudiantes,
            rendimiento: {
              nivel: calcularNivelRendimiento(estadisticasEstudiantes),
              color: obtenerColorRendimiento(estadisticasEstudiantes)
            }
          };
        } catch (error) {
          console.error(`❌ Error procesando sección ${seccion.id_seccion}:, error`);
          return {
            ...seccion,
            estadisticas: {
              total_estudiantes: 0,
              estudiantes_activos: 0,
              estudiantes_con_calificaciones: 0,
              promedio_entregas: 0,
              promedio_calificaciones: null
            },
            rendimiento: {
              nivel: 'Sin datos',
              color: 'gray'
            },
            error: error.message
          };
        }
      })
    );

    console.log(`✅ Estadísticas procesadas para ${seccionesConStats.length} secciones`);
    return seccionesConStats;
  } catch (error) {
    console.error("❌ Error al obtener secciones con estadísticas:", error);
    throw new Error(`No se pudieron obtener las estadísticas de secciones: ${error.message}`);
  }
};

/**
 * 🟢 Obtener alumnos del docente filtrados por sección - CORREGIDO
 */
export const getAlumnosByDocenteYSeccion = async (id_docente, id_seccion = null) => {
  try {
    console.log('🎯 Obteniendo alumnos para docente ID:', id_docente, 'sección:', id_seccion);
    
    // ✅ CORREGIDO: Usar la función helper exportada
    const id_usuario_docente = await obtenerIdUsuarioDocente(id_docente);
    console.log('✅ ID Usuario Docente obtenido:', id_usuario_docente);
    
    // 1. Obtener las secciones del docente
    const whereClause = {
      docentes: {
        some: { id_docente: Number(id_docente) }
      }
    };
    
    if (id_seccion) {
      whereClause.id_seccion = Number(id_seccion);
    }
    
    const seccionesDocente = await prisma.seccion.findMany({
      where: whereClause,
      select: {
        id_seccion: true,
        nombre: true,
        estudiantes: {
          select: {
            id_estudiante: true,
            nombre: true,
            apellido: true,
            id_usuario: true,
            usuario: {
              select: {
                id_usuario: true,
                correo: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Secciones del docente después de filtro: ${seccionesDocente.length}`);

    // 2. Obtener todos los estudiantes de las secciones del docente
    const todosLosEstudiantes = [];
    seccionesDocente.forEach(seccion => {
      seccion.estudiantes.forEach(estudiante => {
        todosLosEstudiantes.push({
          ...estudiante,
          seccion_nombre: seccion.nombre,
          id_seccion: seccion.id_seccion
        });
      });
    });

    console.log(`📊 Total estudiantes en secciones después de filtro: ${todosLosEstudiantes.length}`);

    // 3. Obtener chats existentes con mensajes
    const chatsExistentes = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: id_usuario_docente },
          { id_destinatario: id_usuario_docente },
        ]
      },
      include: {
        mensajes: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: {
            contenido: true,
            fecha: true
          }
        },
        _count: {
          select: { mensajes: true }
        }
      }
    });

    console.log(`📊 Chats existentes: ${chatsExistentes.length}`);

    // 4. Procesar la información
    const alumnosMap = new Map();

    todosLosEstudiantes.forEach(estudiante => {
      alumnosMap.set(estudiante.id_estudiante, {
        id_usuario: estudiante.id_usuario,
        id_estudiante: estudiante.id_estudiante,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        correo: estudiante.usuario.correo,
        rol: 'estudiante',
        secciones: [estudiante.seccion_nombre],
        id_seccion: estudiante.id_seccion,
        cursos: ['Sin curso'],
        tieneChat: false,
        chatExistente: null
      });
    });

    chatsExistentes.forEach(chat => {
      const esRemitente = chat.id_remitente === id_usuario_docente;
      const idOtroUsuario = esRemitente ? chat.id_destinatario : chat.id_remitente;
      
      const estudianteConChat = todosLosEstudiantes.find(est => est.id_usuario === idOtroUsuario);
      
      if (estudianteConChat && chat._count.mensajes > 0) {
        const alumno = alumnosMap.get(estudianteConChat.id_estudiante);
        if (alumno) {
          alumno.tieneChat = true;
          alumno.chatExistente = {
            id_chat: chat.id_chat,
            curso: 'Sin curso',
            seccion: alumno.secciones[0],
            ultimo_mensaje: chat.mensajes[0]?.contenido,
            fecha_ultimo_mensaje: chat.mensajes[0]?.fecha,
            iniciadoPorAlumno: chat.id_remitente !== id_usuario_docente,
            totalMensajes: chat._count.mensajes
          };
        }
      }
    });

    const alumnosArray = Array.from(alumnosMap.values());
    
    alumnosArray.sort((a, b) => {
      if (a.tieneChat && !b.tieneChat) return -1;
      if (!a.tieneChat && b.tieneChat) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    console.log(`✅ Encontrados ${alumnosArray.length} alumnos (${alumnosArray.filter(a => a.tieneChat).length} con chat activo)`);
    
    return alumnosArray;

  } catch (error) {
    console.error("❌ Error en getAlumnosByDocenteYSeccion:", error);
    console.error("📋 Stack trace:", error.stack);
    throw new Error(`No se pudieron obtener los alumnos: ${error.message}`);
  }
};

/**
 * 🟢 Obtener resumen general para dashboard
 */
export const getResumenDashboard = async (id_docente) => {
  try {
    const secciones = await getSeccionesConEstadisticas(id_docente);
    
    const resumen = {
      total_secciones: secciones.length,
      total_estudiantes: secciones.reduce((sum, sec) => sum + sec.estadisticas.total_estudiantes, 0),
      estudiantes_activos: secciones.reduce((sum, sec) => sum + sec.estadisticas.estudiantes_activos, 0),
      secciones_activas: secciones.filter(sec => sec.estadisticas.estudiantes_activos > 0).length,
      promedio_rendimiento: secciones.length > 0 ? 
        secciones.reduce((sum, sec) => {
          const niveles = { 'Excelente': 4, 'Bueno': 3, 'Regular': 2, 'Bajo': 1, 'Sin datos': 0 };
          return sum + (niveles[sec.rendimiento.nivel] || 0);
        }, 0) / secciones.length : 0
    };

    return resumen;
  } catch (error) {
    console.error("❌ Error al obtener resumen del dashboard:", error);
    throw new Error(`No se pudo obtener el resumen del dashboard: ${error.message}`);
  }
};