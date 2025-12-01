import { PrismaClient } from "@prisma/client";
import * as actividadService from "../services/actividad.service.js";
import supabaseService from '../services/supabase.service.js';
import multer from 'multer';

// Middleware multer para recibir un archivo
export const uploadActividad = multer({ storage: multer.memoryStorage() }).single('archivo');

const prisma = new PrismaClient();

// 🟢 FORMATO ESTANDAR DE RESPUESTA
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

// 🟢 MÉTODO DE DIAGNÓSTICO - AGREGAR AL INICIO
export const diagnosticoActividades = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;

    console.log('🔍 DIAGNÓSTICO: Analizando datos del sistema');

    // 1. Obtener información del docente
    const docente = await prisma.docente.findFirst({
      where: { id_usuario },
      include: {
        secciones: {
          select: {
            id_seccion: true,
            nombre: true
          }
        }
      }
    });

    if (!docente) {
      return res.json({
        error: 'Docente no encontrado',
        id_usuario
      });
    }

    // 2. Obtener TODAS las actividades del docente
    const todasActividades = await prisma.actividad.findMany({
      where: { id_docente: docente.id_docente },
      select: {
        id_actividad: true,
        titulo: true,
        id_seccion: true,
        seccion: {
          select: { nombre: true }
        },
        curso: {
          select: { nombre: true }
        },
        docente: {
          select: { nombre: true, apellido: true }
        }
      },
      orderBy: { id_seccion: 'asc' }
    });

    // 3. Agrupar actividades por sección
    const actividadesPorSeccion = {};
    todasActividades.forEach(act => {
      const seccionId = act.id_seccion || 'sin-seccion';
      if (!actividadesPorSeccion[seccionId]) {
        actividadesPorSeccion[seccionId] = {
          seccion: act.seccion?.nombre || 'Sin sección',
          actividades: []
        };
      }
      actividadesPorSeccion[seccionId].actividades.push(act);
    });

    res.json({
      docente: {
        id: docente.id_docente,
        nombre: `${docente.nombre} ${docente.apellido}`,
        secciones: docente.secciones
      },
      resumen_actividades: {
        total: todasActividades.length,
        por_seccion: actividadesPorSeccion,
        secciones_con_actividades: Object.keys(actividadesPorSeccion).length
      },
      todas_las_actividades: todasActividades
    });

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getActividadesBySeccion = async (req, res) => {
  try {
    const id_seccion = parseInt(req.params.id);
    const id_usuario = req.user.id_usuario;

    console.log('🎯 Obteniendo actividades para sección:', id_seccion, 'Usuario:', id_usuario);

    if (!id_seccion || isNaN(id_seccion)) {
      return res.status(400).json(
        errorResponse('ID de sección inválido')
      );
    }

    // 🟢 VERIFICACIÓN MEJORADA - Primero obtener el docente
    const docente = await prisma.docente.findFirst({
      where: { id_usuario: id_usuario }
    });

    if (!docente) {
      console.log('❌ Usuario no es un docente válido');
      return res.status(403).json(
        errorResponse('No tienes permisos para acceder a estas actividades')
      );
    }

    console.log('🔍 Docente encontrado:', docente.id_docente);

    // 🟢 VERIFICAR relación con la sección
    const seccionDocente = await prisma.seccion.findFirst({
      where: {
        id_seccion: id_seccion,
        docentes: {
          some: {
            id_docente: docente.id_docente
          }
        }
      }
    });

    if (!seccionDocente) {
      console.log('❌ Docente no tiene acceso a esta sección');
      return res.status(403).json(
        errorResponse('No tienes permisos para ver actividades de esta sección')
      );
    }

    console.log('✅ Docente tiene acceso a la sección:', seccionDocente.nombre);

    // 🟢 OBTENER actividades
    const actividades = await prisma.actividad.findMany({
      where: {
        id_seccion: id_seccion,
        id_docente: docente.id_docente
      },
      include: {
        docente: {
          select: {
            id_docente: true,
            nombre: true,
            apellido: true,
            codigo: true
          }
        },
        seccion: {
          select: {
            id_seccion: true,
            nombre: true
          }
        },
        curso: {
          select: {
            id_curso: true,
            nombre: true
          }
        },
        _count: {
          select: {
            entregas: true
          }
        }
      },
      orderBy: {
        fecha_inicio: 'desc'
      }
    });

    console.log(`📚 Actividades encontradas: ${actividades.length}`);

    const actividadesFormateadas = actividades.map(act => ({
      id_actividad: act.id_actividad,
      curso: act.curso?.nombre || 'Sin curso',
      titulo: act.titulo,
      descripcion: act.descripcion,
      tipo: act.tipo,
      fecha_inicio: act.fecha_inicio,
      fecha_fin: act.fecha_fin,
      estado: act.estado || 'activo',
      fecha_entrega: act.fecha_entrega,
      id_docente: act.id_docente,
      id_seccion: act.id_seccion,
      docente: act.docente,
      seccion: act.seccion,
      total_entregas: act._count.entregas,
      max_intentos: act.max_intentos || 1,
      archivo: act.archivo || null,
      archivo_ruta: act.archivo_ruta || null
    }));

    res.json(successResponse(
      actividadesFormateadas,
      `Se encontraron ${actividadesFormateadas.length} actividades`
    ));

  } catch (error) {
    console.error("❌ Error al obtener actividades:", error);
    res.status(500).json(
      errorResponse("Error al obtener actividades", error)
    );
  }
};

export const crearActividad = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const archivo = req.file;
    console.log('Archivo recibido:', archivo);

    console.log('Body:', req.body);       // campos de texto
    console.log('Archivo:', req.file);    // archivo subido

    console.log('🆕 Creando actividad. Usuario:', id_usuario);

    // 🟢 OBTENER el ID del docente del usuario autenticado
    const docente = await prisma.docente.findFirst({
      where: { id_usuario },
      include: {
        secciones: {
          where: {
            id_seccion: parseInt(req.body.id_seccion)
          }
        }
      }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('Usuario no es un docente válido')
      );
    }

    // 🟢 VERIFICAR que el docente tenga acceso a esta sección
    if (docente.secciones.length === 0) {
      return res.status(403).json(
        errorResponse('No tienes permisos para crear actividades en esta sección')
      );
    }

    // 🟢 BUSCAR el curso por nombre
    const curso = await prisma.curso.findFirst({
      where: {
        nombre: {
          contains: req.body.curso,
          mode: 'insensitive'
        }
      }
    });

    if (!curso) {
      return res.status(400).json(
        errorResponse(`Curso "${req.body.curso}" no encontrado`)
      );
    }


    // Subir archivo a Supabase si existe
    let archivo_url = null;
    let archivo_ruta = null;

    if (archivo) {
      const resultado = await supabaseService.subirArchivo(
        archivo.buffer,
        archivo.originalname,
        'actividades',           // carpeta en tu bucket
        archivo.mimetype
      );

      archivo_ruta = resultado.ruta;
      archivo_url = resultado.url;
    }

    // 🟢 CREAR la actividad directamente
    const nuevaActividad = await prisma.actividad.create({
      data: {
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        tipo: req.body.tipo,
        fecha_inicio: new Date(req.body.fecha_inicio),
        fecha_fin: new Date(req.body.fecha_fin),
        fecha_entrega: new Date(req.body.fecha_entrega),
        estado: 'activo',
        max_intentos: parseInt(req.body.max_intentos) || 3,
        archivo: archivo_url,
        archivo_ruta: archivo_ruta,
        id_curso: curso.id_curso,
        id_docente: docente.id_docente,
        id_seccion: parseInt(req.body.id_seccion)
        /*titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        tipo: req.body.tipo,
        fecha_inicio: new Date(req.body.fecha_inicio),
        fecha_fin: new Date(req.body.fecha_fin),
        fecha_entrega: new Date(req.body.fecha_entrega),
        estado: 'activo',
        id_curso: curso.id_curso,
        id_docente: docente.id_docente,
        id_seccion: parseInt(req.body.id_seccion)*/
      },
      include: {
        curso: true,
        docente: true,
        seccion: true
      }
    });

    console.log('✅ Actividad creada:', nuevaActividad.id_actividad);

    res.json({ success: true, message: 'Actividad creada correctamente', data: nuevaActividad });

  } catch (error) {
    console.error("❌ Error en crearActividad:", error);
    res.status(500).json(
      errorResponse("Error al crear actividad", error)
    );
  }
};

// En actividad.controller.js - Endpoint de diagnóstico
export const diagnosticarPermisos = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const id_seccion = parseInt(req.params.id_seccion);

    console.log('🔍 DIAGNÓSTICO DE PERMISOS');
    console.log('Usuario:', id_usuario);
    console.log('Sección solicitada:', id_seccion);

    // 1. Obtener docente
    const docente = await prisma.docente.findFirst({
      where: { id_usuario: id_usuario },
      include: {
        secciones: {
          select: {
            id_seccion: true,
            nombre: true
          }
        }
      }
    });

    if (!docente) {
      return res.json({
        error: 'Usuario no es docente',
        id_usuario: id_usuario
      });
    }

    // 2. Verificar secciones del docente
    const seccionesDocente = docente.secciones.map(s => s.id_seccion);
    console.log('Secciones del docente:', seccionesDocente);

    // 3. Verificar acceso específico
    const tieneAcceso = seccionesDocente.includes(id_seccion);

    res.json({
      docente: {
        id: docente.id_docente,
        nombre: `${docente.nombre} ${docente.apellido}`,
        secciones: docente.secciones
      },
      seccion_solicitada: id_seccion,
      tiene_acceso: tieneAcceso,
      mensaje: tieneAcceso 
        ? '✅ Tiene acceso a la sección' 
        : '❌ NO tiene acceso a la sección'
    });

  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({ error: error.message });
  }
};

export const actualizarActividad = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const id_usuario = req.user.id_usuario;

    console.log('✏️ Actualizando actividad:', id, 'Usuario:', id_usuario);

    // 🟢 VERIFICAR permisos
    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('No autorizado')
      );
    }

    const actividadExistente = await prisma.actividad.findFirst({
      where: {
        id_actividad: id,
        id_docente: docente.id_docente
      }
    });

    if (!actividadExistente) {
      return res.status(404).json(
        errorResponse('Actividad no encontrada o no tienes permisos')
      );
    }

    // 🟢 BUSCAR curso si se proporciona
    let datosActualizacion = { ...req.body };

    if (req.body.curso) {
      const curso = await prisma.curso.findFirst({
        where: {
          nombre: {
            contains: req.body.curso,
            mode: 'insensitive'
          }
        }
      });

      if (curso) {
        datosActualizacion.id_curso = curso.id_curso;
        delete datosActualizacion.curso;
      }
    }

    // 🟢 ACTUALIZAR fechas si se proporcionan
    if (req.body.fecha_inicio) {
      datosActualizacion.fecha_inicio = new Date(req.body.fecha_inicio);
    }
    if (req.body.fecha_fin) {
      datosActualizacion.fecha_fin = new Date(req.body.fecha_fin);
    }
    if (req.body.fecha_entrega) {
      datosActualizacion.fecha_entrega = new Date(req.body.fecha_entrega);
    }

    // Subir archivo si hay
    if (req.file) {
      const resultado = await supabaseService.subirArchivo(
        req.file.buffer,
        req.file.originalname,
        'actividades',
        req.file.mimetype
      );
      datosActualizacion.archivo = resultado.url;
      datosActualizacion.archivo_ruta = resultado.ruta;
    }

    // 🔹 CONVERSIÓN DE max_intentos A NÚMERO
    if (datosActualizacion.max_intentos !== undefined) {
      datosActualizacion.max_intentos = parseInt(datosActualizacion.max_intentos, 10);
    }

    const actividadActualizada = await prisma.actividad.update({
      where: { id_actividad: id },
      data: datosActualizacion,
      include: {
        curso: true,
        docente: true,
        seccion: true
      }
    });

    res.json(successResponse(
      actividadActualizada,
      "Actividad actualizada correctamente"
    ));

  } catch (error) {
    console.error("❌ Error en actualizarActividad:", error);
    res.status(500).json(
      errorResponse("Error al actualizar actividad", error)
    );
  }
};

export const eliminarActividad = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const id_usuario = req.user.id_usuario;

    console.log('🗑️ Eliminando actividad:', id, 'Usuario:', id_usuario);

    // 🟢 VERIFICAR permisos
    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json(
        errorResponse('No autorizado')
      );
    }

    const actividadExistente = await prisma.actividad.findFirst({
      where: {
        id_actividad: id,
        id_docente: docente.id_docente
      }
    });

    if (!actividadExistente) {
      return res.status(404).json(
        errorResponse('Actividad no encontrada o no tienes permisos')
      );
    }

    const actividadEliminada = await prisma.actividad.delete({
      where: { id_actividad: id }
    });

    res.json(successResponse(
      actividadEliminada,
      "Actividad eliminada correctamente"
    ));

  } catch (error) {
    console.error("❌ Error en eliminarActividad:", error);
    res.status(500).json(
      errorResponse("Error al eliminar actividad", error)
    );
  }
};

// Obtener actividades por estado
export const obtenerActividadesPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;

    // Validar estado permitido
    const estadosPermitidos = ['activo', 'completado', 'pendiente'];
    if (!estadosPermitidos.includes(estado.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Usa: activo, completado o pendiente.'
      });
    }

    const actividades = await actividadService.obtenerPorEstado(estado);
    res.json({
      success: true,
      data: actividades,
      message: `Actividades con estado '${estado}' obtenidas correctamente`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener actividades por estado',
      error: error.message
    });
  }
};

// Obtener actividades por mes (solo del docente autenticado)
export const obtenerActividadesPorMes = async (req, res) => {
  try {
    const { mes } = req.params;
    const id_usuario = req.user.id_usuario;

    console.log(`📅 Buscando actividades del mes ${mes} para el usuario ${id_usuario}`);

    // 🟢 OBTENER el docente del usuario autenticado
    const docente = await prisma.docente.findFirst({
      where: { id_usuario }
    });

    if (!docente) {
      return res.status(403).json({
        success: false,
        message: "Usuario no autorizado o no es docente"
      });
    }

    // 🔹 Llamar al servicio con id_docente
    const actividades = await actividadService.obtenerPorMes(parseInt(mes), docente.id_docente);

    if (!actividades || actividades.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron actividades del docente para el mes ${mes}`
      });
    }

    res.json({
      success: true,
      message: `Se encontraron ${actividades.length} actividades del mes ${mes}`,
      data: actividades
    });

  } catch (error) {
    console.error("❌ Error al obtener actividades por mes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener actividades por mes",
      error: error.message
    });
  }
};

export const getCursosPorSeccion = async (req, res) => {
  try {
    const id_seccion = parseInt(req.params.id_seccion);

    if (isNaN(id_seccion)) {
      return res.status(400).json(errorResponse("ID de sección inválido"));
    }

    const cursos = await prisma.seccionCurso.findMany({
      where: { id_seccion },
      include: { curso: true },
    });

    // Extraemos solo los cursos
    const listaCursos = cursos.map(sc => sc.curso);

    res.json(successResponse(listaCursos, "Cursos obtenidos correctamente"));

  } catch (error) {
    console.error("❌ Error al obtener cursos por sección:", error);
    res.status(500).json(errorResponse("Error al obtener cursos", error));
  }
};

export const actividadesEstudiante = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;

    // Encontrar estudiante por id_usuario
    const estudiante = await prisma.estudiante.findUnique({
      where: { id_usuario },
    });

    if (!estudiante) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    if (!estudiante.id_seccion) {
      return res.status(400).json({ error: "No tienes una sección asignada" });
    }

    // Obtener actividades de esa sección
    const actividades = await prisma.actividad.findMany({
      where: { id_seccion: estudiante.id_seccion },
      include: {
        curso: true,
        docente: true
      }
    });

    // Formato para FullCalendar
    const eventos = actividades.map(a => ({
      id: a.id_actividad,
      title: `${a.titulo} (${a.curso.nombre})`,
      start: a.fecha_inicio,
      end: a.fecha_fin,
      extendedProps: {
        descripcion: a.descripcion,
        estado: a.estado,
        docente: `${a.docente.nombre} ${a.docente.apellido}`,
        curso: a.curso.nombre
      }
    }));

    return res.json(eventos);

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error obteniendo actividades" });
  }
};
