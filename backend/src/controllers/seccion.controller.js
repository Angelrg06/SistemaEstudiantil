import * as seccionesService from "../services/seccion.service.js";

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

// 🟢 NUEVO MÉTODO: Obtener información específica de una sección (para actividades)
export const getSeccionById = async (req, res) => {
  try {
    const id_seccion = parseInt(req.params.id);
    const id_usuario = req.user.id_usuario; // Del authMiddleware

    console.log('🔍 Controlador: Obteniendo información de sección:', id_seccion, 'Usuario:', id_usuario);

    if (!id_seccion || isNaN(id_seccion)) {
      return res.status(400).json(
        errorResponse("ID de sección inválido", "El ID de la sección debe ser un número válido", 400)
      );
    }

    // 🟢 VERIFICAR que el docente tenga acceso a esta sección
    const seccion = await seccionesService.getSeccionById(id_seccion, id_usuario);
    
    if (!seccion) {
      return res.status(404).json(
        errorResponse("Sección no encontrada o no tienes permisos", "No se pudo acceder a la sección solicitada", 404)
      );
    }

    console.log('✅ Controlador: Información de sección obtenida:', seccion.nombre);

    res.json(successResponse(
      seccion,
      `Información de la sección "${seccion.nombre}" cargada correctamente`,
      {
        seccion_id: id_seccion,
        docente_id: id_usuario,
        informacion_general: {
          total_estudiantes: seccion.total_estudiantes || 0,
          total_actividades: seccion.total_actividades || 0,
          total_cursos: seccion.cursos?.length || 0,
          bimestre_activo: seccion.bimestre?.nombre || 'No asignado'
        }
      }
    ));

  } catch (error) {
    console.error("❌ Error en getSeccionById:", error);
    res.status(500).json(
      errorResponse("Error al obtener información de la sección", error.message)
    );
  }
};

// 🟢 Obtener alumnos del docente filtrados por sección
export const obtenerAlumnosPorDocenteYSeccion = async (req, res) => {
  try {
    const { id_docente, id_seccion } = req.params;
    
    console.log('🎯 Controlador: Obteniendo alumnos para docente:', id_docente, 'sección:', id_seccion || 'todas');
    
    if (!id_docente || isNaN(Number(id_docente))) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const alumnos = await seccionesService.getAlumnosByDocenteYSeccion(
      Number(id_docente), 
      id_seccion ? Number(id_seccion) : null
    );
    
    console.log(`✅ Controlador: Enviando ${alumnos.length} alumnos`);
    
    res.json(successResponse(
      alumnos,
      `Se encontraron ${alumnos.length} alumnos`,
      {
        count: alumnos.length,
        docente_id: Number(id_docente),
        seccion_id: id_seccion ? Number(id_seccion) : 'todas',
        alumnos_con_chat: alumnos.filter(a => a.tieneChat).length,
        alumnos_sin_chat: alumnos.filter(a => !a.tieneChat).length
      }
    ));
  } catch (error) {
    console.error("❌ Error en obtenerAlumnosPorDocenteYSeccion:", error);
    res.status(500).json(
      errorResponse("Error al obtener alumnos del docente", error.message)
    );
  }
};

// 🟢 Obtener secciones del docente
export const obtenerSeccionesDocente = async (req, res) => {
  try {
    console.log('🎯 Obteniendo secciones para docente ID:', req.params.id);
    const id_docente = Number(req.params.id);
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const secciones = await seccionesService.getSeccionesByDocente(id_docente);
    console.log(`✅ Encontradas ${secciones.length} secciones para el docente`);
    
    const estadisticas = {
      secciones_con_curso: secciones.filter(s => s.cursos && s.cursos.length > 0).length,
      secciones_activas: secciones.filter(s => s._count?.estudiantes > 0).length
    };
    
    res.json(successResponse(
      secciones,
      `Se encontraron ${secciones.length} secciones`,
      {
        count: secciones.length,
        docente_id: id_docente,
        version: "1.0.0",
        estadisticas: estadisticas
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener secciones del docente:", error);
    res.status(500).json(
      errorResponse("Error al obtener secciones del docente", error.message)
    );
  }
};

// 🟢 Obtener secciones con estadísticas completas para dashboard
export const obtenerSeccionesConEstadisticas = async (req, res) => {
  try {
    console.log('📊 Obteniendo secciones con estadísticas para docente ID:', req.params.id);
    const id_docente = Number(req.params.id);
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const secciones = await seccionesService.getSeccionesConEstadisticas(id_docente);
    console.log(`✅ Estadísticas cargadas para ${secciones.length} secciones`);
    
    const estadisticasGenerales = {
      total_secciones: secciones.length,
      total_estudiantes: secciones.reduce((sum, sec) => sum + sec.estadisticas.total_estudiantes, 0),
      estudiantes_activos: secciones.reduce((sum, sec) => sum + sec.estadisticas.estudiantes_activos, 0),
      promedio_entregas_global: secciones.length > 0 ? 
        (secciones.reduce((sum, sec) => sum + parseFloat(sec.estadisticas.promedio_entregas), 0) / secciones.length).toFixed(1) : 0
    };

    res.json(successResponse(
      secciones,
      `Estadísticas cargadas para ${secciones.length} secciones`,
      {
        count: secciones.length,
        docente_id: id_docente,
        estadisticas_generales: estadisticasGenerales,
        resumen: {
          seccion_mas_estudiantes: secciones.reduce((max, sec) => 
            sec.estadisticas.total_estudiantes > max.estadisticas.total_estudiantes ? sec : max
          )?.nombre || 'N/A',
          seccion_mas_activa: secciones.reduce((max, sec) => 
            parseFloat(sec.estadisticas.promedio_entregas) > parseFloat(max.estadisticas.promedio_entregas) ? sec : max
          )?.nombre || 'N/A'
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener secciones con estadísticas:", error);
    res.status(500).json(
      errorResponse("Error al obtener estadísticas de secciones", error.message)
    );
  }
};

// 🟢 Obtener detalles completos de una sección específica
export const obtenerDetalleSeccion = async (req, res) => {
  try {
    const id_seccion = Number(req.params.id);
    
    if (!id_seccion || isNaN(id_seccion)) {
      return res.status(400).json(
        errorResponse("ID de sección inválido", "El ID de la sección debe ser un número válido", 400)
      );
    }

    const seccion = await seccionesService.getDetalleSeccion(id_seccion);
    
    if (!seccion) {
      return res.status(404).json(
        errorResponse("Sección no encontrada", "La sección solicitada no existe", 404)
      );
    }
    
    const informacionGeneral = {
      total_estudiantes: seccion.estudiantes?.length || 0,
      total_actividades: seccion.actividades?.length || 0,
      total_docentes: seccion.docentes?.length || 0,
      tiene_curso: seccion.cursos?.length > 0,
      tiene_bimestre: !!seccion.bimestre
    };
    
    res.json(successResponse(
      seccion,
      `Detalles de la sección "${seccion.nombre}" cargados correctamente`,
      {
        seccion_id: id_seccion,
        informacion_general: informacionGeneral
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener detalle de sección:", error);
    res.status(500).json(
      errorResponse("Error al obtener detalle de sección", error.message)
    );
  }
};

// 🟢 Obtener estudiantes de una sección específica
export const obtenerEstudiantesSeccion = async (req, res) => {
  try {
    const id_seccion = Number(req.params.id);
    
    if (!id_seccion || isNaN(id_seccion)) {
      return res.status(400).json(
        errorResponse("ID de sección inválido", "El ID de la sección debe ser un número válido", 400)
      );
    }

    const estudiantes = await seccionesService.getEstudiantesBySeccion(id_seccion);
    
    res.json(successResponse(
      estudiantes,
      `Se encontraron ${estudiantes.length} estudiantes en la sección`,
      {
        count: estudiantes.length,
        seccion_id: id_seccion,
        estadisticas_estudiantes: {
          con_entregas: estudiantes.filter(e => e.info_academica.total_entregas > 0).length,
          sin_entregas: estudiantes.filter(e => e.info_academica.total_entregas === 0).length,
          entregas_pendientes: estudiantes.reduce((sum, e) => sum + e.info_academica.entregas_pendientes, 0),
          promedio_entregas: estudiantes.length > 0 ? 
            (estudiantes.reduce((sum, e) => sum + e.info_academica.total_entregas, 0) / estudiantes.length).toFixed(1) : 0
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener estudiantes de sección:", error);
    res.status(500).json(
      errorResponse("Error al obtener estudiantes de la sección", error.message)
    );
  }
};

// 🟢 Health check del servicio
export const healthCheck = async (req, res) => {
  try {
    const healthStatus = await seccionesService.healthCheck();
    
    res.json(successResponse(
      {
        status: healthStatus.status,
        database: healthStatus.database,
        service: 'secciones-service'
      },
      "Servicio de secciones operativo",
      {
        stats: healthStatus.stats,
        uptime: process.uptime(),
        version: "1.0.0"
      }
    ));
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json(
      errorResponse("Servicio de secciones no disponible", error.message, 503)
    );
  }
};

// 🟢 Middleware para validar docente
export const validarDocente = (req, res, next) => {
  const id_docente = Number(req.params.id);
  
  if (!id_docente || isNaN(id_docente)) {
    return res.status(400).json(
      errorResponse("ID de docente requerido", "Se debe proporcionar un ID de docente válido", 400)
    );
  }
  
  next();
};