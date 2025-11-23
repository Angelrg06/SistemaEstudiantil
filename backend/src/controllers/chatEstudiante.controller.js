// src/controllers/chatEstudiante.controller.js - COMPLETADO
import { PrismaClient } from "@prisma/client";
import * as chatService from "../services/chat.service.js";
import { getDocentesByEstudiante, getChatsByEstudiante } from "../services/chatEstudiante.service.js";

const prisma = new PrismaClient();

const successResponse = (data, message = null) => ({
  success: true, data, message, timestamp: new Date().toISOString()
});

const errorResponse = (message, error = null) => ({
  success: false, message, error, timestamp: new Date().toISOString()
});

// 🟢 Obtener chats del estudiante - COMPLETADO
export const obtenerChatsEstudiante = async (req, res) => {
  try {
    const id_estudiante = Number(req.params.id);
    const id_usuario = req.user.id_usuario;

    console.log('🎯 Obteniendo chats para estudiante ID:', id_estudiante);

    // Validar que el estudiante accede a sus propios chats
    const estudiante = await prisma.estudiante.findFirst({
      where: { id_estudiante, id_usuario }
    });

    if (!estudiante) {
      return res.status(403).json(
        errorResponse("No tienes permisos para acceder a estos chats")
      );
    }

    // Obtener el id_usuario del estudiante
    const id_usuario_estudiante = estudiante.id_usuario;

    // Buscar chats donde el estudiante es remitente o destinatario
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: id_usuario_estudiante },
          { id_destinatario: id_usuario_estudiante },
        ],
      },
      include: {
        remitente: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            docente: { 
              select: { nombre: true, apellido: true, id_docente: true }
            },
            estudiante: { 
              select: { nombre: true, apellido: true, id_estudiante: true }
            }
          }
        },
        destinatario: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            docente: { 
              select: { nombre: true, apellido: true, id_docente: true }
            },
            estudiante: { 
              select: { nombre: true, apellido: true, id_estudiante: true }
            }
          }
        },
        curso: { select: { nombre: true } },
        seccion: { select: { nombre: true } },
        mensajes: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: {
            contenido: true,
            fecha: true,
            id_remitente: true
          }
        }
      },
      orderBy: {
        mensajes: {
          _count: 'desc'
        }
      }
    });

    // Formatear respuesta
    const chatsFormateados = chats.map(chat => {
      const esRemitente = chat.id_remitente === id_usuario_estudiante;
      const otroUsuario = esRemitente ? chat.destinatario : chat.remitente;
      
      const usuarioInfo = otroUsuario.docente || otroUsuario.estudiante;
      const ultimoMensaje = chat.mensajes[0];
      
      return {
        id_chat: chat.id_chat,
        usuario: {
          id_usuario: otroUsuario.id_usuario,
          correo: otroUsuario.correo,
          nombre: usuarioInfo?.nombre || 'Usuario',
          apellido: usuarioInfo?.apellido || '',
          rol: otroUsuario.rol,
          id_docente: usuarioInfo?.id_docente
        },
        curso: chat.curso?.nombre || 'Sin curso',
        seccion: chat.seccion?.nombre || 'Sin sección',
        ultimo_mensaje: ultimoMensaje?.contenido,
        fecha_ultimo_mensaje: ultimoMensaje?.fecha,
        iniciadoPorEstudiante: chat.id_remitente === id_usuario_estudiante,
        metadata: {
          es_chat_activo: !!ultimoMensaje,
          total_mensajes: chat.mensajes?.length || 0
        }
      };
    });

    res.json(successResponse(
      chatsFormateados,
      `Encontrados ${chatsFormateados.length} chats`
    ));
  } catch (error) {
    console.error("❌ Error al obtener chats del estudiante:", error);
    res.status(500).json(
      errorResponse("Error al obtener chats", error.message)
    );
  }
};

// 🟢 Obtener docentes disponibles para chat - VERSIÓN CORREGIDA
export const obtenerDocentesParaChat = async (req, res) => {
  try {
    const id_estudiante = Number(req.params.id);
    
    console.log('🎯 Obteniendo docentes para estudiante ID:', id_estudiante);

    // Obtener información del estudiante
    const estudiante = await prisma.estudiante.findUnique({
      where: { id_estudiante },
      include: {
        seccion: {
          include: {
            docentes: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    correo: true,
                    rol: true
                  }
                }
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
            }
          }
        }
      }
    });

    if (!estudiante) {
      return res.status(404).json(
        errorResponse("Estudiante no encontrado")
      );
    }

    if (!estudiante.seccion) {
      return res.json(successResponse([], "El estudiante no tiene sección asignada"));
    }

    // Obtener docentes de la sección del estudiante
    const docentesSeccion = estudiante.seccion.docentes;
    
    // Obtener cursos de la sección
    const cursosSeccion = estudiante.seccion.seccionesCurso.map(sc => sc.curso);

    // Obtener chats existentes del estudiante
    const id_usuario_estudiante = estudiante.id_usuario;
    const chatsExistentes = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: id_usuario_estudiante },
          { id_destinatario: id_usuario_estudiante },
        ]
      },
      select: {
        id_chat: true,
        id_remitente: true,
        id_destinatario: true,
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
    }); // ← CIERRE CORRECTO DEL findMany

    // Procesar docentes
    const docentesConInfo = docentesSeccion.map(docente => {
      const id_usuario_docente = docente.usuario.id_usuario;
      
      // Buscar chat existente
      const chatExistente = chatsExistentes.find(chat => 
        chat.id_remitente === id_usuario_docente || 
        chat.id_destinatario === id_usuario_docente
      );

      return {
        id_docente: docente.id_docente,
        id_usuario: id_usuario_docente,
        nombre: docente.nombre,
        apellido: docente.apellido,
        correo: docente.usuario.correo,
        cursos: cursosSeccion.map(curso => curso.nombre),
        seccion: estudiante.seccion.nombre,
        id_seccion: estudiante.seccion.id_seccion,
        tieneChat: !!chatExistente,
        chatExistente: chatExistente ? {
          id_chat: chatExistente.id_chat,
          ultimo_mensaje: chatExistente.mensajes[0]?.contenido,
          fecha_ultimo_mensaje: chatExistente.mensajes[0]?.fecha,
          totalMensajes: chatExistente._count.mensajes
        } : null
      };
    });

    console.log(`✅ Encontrados ${docentesConInfo.length} docentes`);

    res.json(successResponse(
      docentesConInfo,
      `Encontrados ${docentesConInfo.length} docentes`
    ));
  } catch (error) {
    console.error("❌ Error al obtener docentes:", error);
    res.status(500).json(
      errorResponse("Error al obtener docentes", error.message)
    );
  }
};

// 🆕 Obtener cursos del estudiante
export const obtenerCursosEstudiante = async (req, res) => {
  try {
    const id_estudiante = Number(req.params.id);
    console.log('🎯 Obteniendo cursos para estudiante ID:', id_estudiante);

    // Obtener información del estudiante con sus cursos
    const estudiante = await prisma.estudiante.findUnique({
      where: { id_estudiante },
      include: {
        seccion: {
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
            docentes: {
              select: {
                nombre: true,
                apellido: true
              }
            }
          }
        }
      }
    });

    if (!estudiante) {
      return res.status(404).json(
        errorResponse("Estudiante no encontrado")
      );
    }

    if (!estudiante.seccion) {
      return res.json(successResponse([], "El estudiante no tiene sección asignada"));
    }

    // Procesar cursos con información del docente
    const cursosConInfo = estudiante.seccion.seccionesCurso.map(sc => {
      const curso = sc.curso;
      const docentePrincipal = estudiante.seccion.docentes[0]; // Primer docente de la sección
      
      return {
        id_curso: curso.id_curso,
        nombre: curso.nombre,
        docente: docentePrincipal ? `${docentePrincipal.nombre} ${docentePrincipal.apellido}` : 'Sin docente asignado',
        seccion: estudiante.seccion.nombre,
        id_seccion: estudiante.seccion.id_seccion
      };
    });

    console.log(`✅ Encontrados ${cursosConInfo.length} cursos para el estudiante`);

    res.json(successResponse(
      cursosConInfo,
      `Encontrados ${cursosConInfo.length} cursos`
    ));
  } catch (error) {
    console.error("❌ Error al obtener cursos del estudiante:", error);
    res.status(500).json(
      errorResponse("Error al obtener cursos", error.message)
    );
  }
};

// 🆕 Obtener compañeros de curso
export const obtenerCompanerosCurso = async (req, res) => {
  try {
    const { id, id_curso } = req.params;
    const id_estudiante = Number(id);
    const id_curso_num = Number(id_curso);
    
    console.log('🎯 Obteniendo compañeros para estudiante:', id_estudiante, 'curso:', id_curso_num);

    // Obtener información del estudiante actual
    const estudianteActual = await prisma.estudiante.findUnique({
      where: { id_estudiante },
      select: {
        id_seccion: true,
        id_usuario: true
      }
    });

    if (!estudianteActual) {
      return res.status(404).json(
        errorResponse("Estudiante no encontrado")
      );
    }

    // Obtener todos los estudiantes de la misma sección
    const companerosSeccion = await prisma.estudiante.findMany({
      where: {
        id_seccion: estudianteActual.id_seccion,
        id_estudiante: {
          not: id_estudiante // Excluir al estudiante actual
        }
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true
          }
        }
      }
    });

    // Obtener chats existentes del estudiante
    const chatsExistentes = await prisma.chat.findMany({
      where: {
        OR: [
          { id_remitente: estudianteActual.id_usuario },
          { id_destinatario: estudianteActual.id_usuario },
        ]
      },
      select: {
        id_chat: true,
        id_remitente: true,
        id_destinatario: true,
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

    // Procesar compañeros
    const companerosConInfo = companerosSeccion.map(companero => {
      // Buscar chat existente
      const chatExistente = chatsExistentes.find(chat => 
        chat.id_remitente === companero.id_usuario || 
        chat.id_destinatario === companero.id_usuario
      );

      return {
        id_estudiante: companero.id_estudiante,
        id_usuario: companero.id_usuario,
        nombre: companero.nombre,
        apellido: companero.apellido,
        correo: companero.usuario.correo,
        seccion: 'Misma sección',
        tieneChat: !!chatExistente,
        chatExistente: chatExistente ? {
          id_chat: chatExistente.id_chat,
          ultimo_mensaje: chatExistente.mensajes[0]?.contenido,
          fecha_ultimo_mensaje: chatExistente.mensajes[0]?.fecha,
          totalMensajes: chatExistente._count.mensajes
        } : null
      };
    });

    console.log(`✅ Encontrados ${companerosConInfo.length} compañeros`);

    res.json(successResponse(
      companerosConInfo,
      `Encontrados ${companerosConInfo.length} compañeros`
    ));
  } catch (error) {
    console.error("❌ Error al obtener compañeros:", error);
    res.status(500).json(
      errorResponse("Error al obtener compañeros", error.message)
    );
  }
};