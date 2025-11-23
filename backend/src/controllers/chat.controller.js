import multer from 'multer';
import * as chatService from "../services/chat.service.js";
import supabaseService from '../services/supabase.service.js';
import WebSocketService from '../services/websocket.service.js';
import { PrismaClient } from '@prisma/client';
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

// 🟢 Obtener todos los chats de un docente
export const obtenerChatsDocente = async (req, res) => {
  try {
    console.log('🎯 Obteniendo chats para docente ID:', req.params.id);
    const id_docente = Number(req.params.id);
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const chats = await chatService.getChatsByDocente(id_docente);
    console.log(`✅ Encontrados ${chats.length} chats`);
    
    res.json(successResponse(
      chats,
      null,
      {
        count: chats.length,
        docente_id: id_docente,
        version: "1.0.0"
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener chats del docente:", error);
    res.status(500).json(
      errorResponse("Error al obtener chats del docente", error.message)
    );
  }
};

// 🟢 Obtener todos los alumnos del docente (con y sin chat) - ACTUALIZADO
// 🟢 Obtener alumnos del docente (con filtro opcional por sección)
export const obtenerAlumnosDocente = async (req, res) => {
  try {
    console.log('🎯 Obteniendo alumnos para docente ID:', req.params.id);
    const id_docente = Number(req.params.id);
    const id_seccion = req.query.id_seccion ? Number(req.query.id_seccion) : null;
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const alumnos = await chatService.getAlumnosByDocente(id_docente, id_seccion);
    const alumnosConChat = alumnos.filter(a => a.tieneChat).length;
    
    console.log(`✅ Encontrados ${alumnos.length} alumnos (${alumnosConChat} con chat activo)`);
    
    res.json(successResponse(
      alumnos,
      `Se encontraron ${alumnos.length} alumnos`,
      {
        total_alumnos: alumnos.length,
        alumnos_con_chat: alumnosConChat,
        alumnos_sin_chat: alumnos.length - alumnosConChat,
        docente_id: id_docente,
        seccion_filtrada: id_seccion,
        estadisticas: {
          porcentaje_con_chat: alumnos.length > 0 ? ((alumnosConChat / alumnos.length) * 100).toFixed(1) : 0
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener alumnos del docente:", error);
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

    const secciones = await chatService.getSeccionesByDocente(id_docente);
    console.log(`✅ Encontradas ${secciones.length} secciones para el docente`);
    
    res.json(successResponse(
      secciones,
      null,
      {
        count: secciones.length,
        docente_id: id_docente,
        version: "1.0.0"
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener secciones del docente:", error);
    res.status(500).json(
      errorResponse("Error al obtener secciones del docente", error.message)
    );
  }
};

// 🟢 Obtener mensajes de un chat - ACTUALIZADO CON PAGINACIÓN
export const obtenerMensajes = async (req, res) => {
  try {
    console.log('=== 🎯 INICIANDO OBTENER MENSAJES ===');
    console.log('📋 Parámetros recibidos:', req.params);
    console.log('🔍 Query parameters:', req.query);
    
    const id_chat = Number(req.params.id_chat);
    const pagina = Number(req.query.pagina) || 1;
    const limite = Number(req.query.limite) || 50;
    
    console.log('🆔 Chat ID a buscar:', id_chat);
    console.log('📄 Página:', pagina, 'Límite:', limite);
    
    if (!id_chat || isNaN(id_chat)) {
      return res.status(400).json(
        errorResponse("ID de chat inválido", "El ID del chat debe ser un número válido", 400)
      );
    }

    console.log('🔍 Buscando mensajes en la base de datos...');
    
    let resultado;
    if (pagina > 1 || limite !== 50) {
      // Usar paginación si se solicita
      resultado = await chatService.getMensajesByChatPaginado(id_chat, pagina, limite);
    } else {
      // Usar método tradicional para compatibilidad
      const mensajes = await chatService.getMensajesByChat(id_chat);
      resultado = {
        mensajes: mensajes,
        paginacion: {
          paginaActual: 1,
          porPagina: mensajes.length,
          totalMensajes: mensajes.length,
          tieneMas: false
        }
      };
    }
    
    console.log(`✅ ÉXITO: Encontrados ${resultado.mensajes.length} mensajes para chat ${id_chat}`);
    console.log('📊 Paginación:', resultado.paginacion);
    
    res.json(successResponse(
      resultado.mensajes,
      null,
      {
        chat_id: id_chat,
        paginacion: resultado.paginacion,
        consulta: {
          pagina,
          limite,
          con_paginacion: pagina > 1 || limite !== 50
        }
      }
    ));
  } catch (error) {
    console.error("❌ ERROR en obtenerMensajes:", error);
    console.error("📋 Stack trace:", error.stack);
    res.status(500).json(
      errorResponse("Error al obtener mensajes", error.message)
    );
  }
};



// 🟢 Enviar mensaje - OPTIMIZADO
export const enviarMensaje = async (req, res) => {
  try {
    const { contenido, id_chat, id_remitente } = req.body;
    const archivo = req.file;
    console.log('📤 Enviando mensaje:', { contenido, id_chat, id_remitente, tieneArchivo: !!archivo });
    
    // Validaciones
    if (!contenido || !id_chat || !id_remitente) {
      return res.status(400).json(
        errorResponse(
          "Faltan campos requeridos", 
          "Los campos 'contenido', 'id_chat' e 'id_remitente' son obligatorios", 
          400
        )
      );
    }

    if ((!contenido || contenido.trim().length === 0) && !archivo) {
      return res.status(400).json(
        errorResponse(
          "El mensaje no puede estar vacío", 
          "El contenido del mensaje debe tener al menos un carácter", 
          400
        )
      );
    }

    
    // 🟢 VERIFICAR DUPLICADOS EN EL BACKEND
    const mensajeDuplicado = await prisma.mensaje.findFirst({
      where: {
        id_chat: Number(id_chat),
        id_remitente: Number(id_remitente),
        contenido: contenido?.trim() || '',
        fecha: {
          gte: new Date(Date.now() - 5000) // Últimos 5 segundos
        }
      }
    });

    if (mensajeDuplicado) {
      console.log('⚠️ Mensaje duplicado detectado en backend');
      return res.status(400).json(
        errorResponse("Mensaje duplicado detectado")
      );
    }


    // 🟢 SUBIR ARCHIVO SI EXISTE
    let archivoData = null;
    if (archivo) {
      const resultado = await supabaseService.subirArchivo(
        archivo.buffer,
        archivo.originalname,
        'mensajes-chat',
        archivo.mimetype
      );
      archivoData = {
        url: resultado.url,
        ruta: resultado.ruta,
        nombre: resultado.nombre,
        tipo: archivo.mimetype
      };
      console.log('📎 Archivo subido:', archivoData.nombre);
    }

        // 🟢 GUARDAR EN BASE DE DATOS
    const nuevoMensaje = await chatService.enviarMensaje({
      contenido: contenido.trim(), 
      id_chat, 
      id_remitente,
      archivo: archivoData // 🆕 Pasar info del archivo al servicio
    });
    
    console.log('✅ Mensaje enviado exitosamente, ID:', nuevoMensaje.id_mensaje);

    // 🟢 USAR WEBSOCKET PARA ENVÍO EN TIEMPO REAL
    const messageData = {
      id_chat: Number(id_chat),
      contenido: contenido?.trim() || '',
      id_remitente: Number(id_remitente),
      archivo: archivoData
    };

    // Emitir a través de WebSocket (se guarda en BD automáticamente)
    WebSocketService.sendToChat(id_chat, 'send_message', messageData);

    // 🟢 UNA SOLA RESPUESTA
    res.json(successResponse(
      {
        ...nuevoMensaje,
        usandoWebSocket: true
      },
      "Mensaje enviado correctamente",
      {
        mensaje_id: nuevoMensaje.id_mensaje,
        chat_id: id_chat,
        remitente_id: id_remitente,
        longitud_mensaje: contenido.length,
        tiene_archivo: !!archivoData,
        timestamp: new Date().toISOString()
      }
    ));

  } catch (error) {
    console.error("❌ Error al enviar mensaje:", error);
    res.status(500).json(
      errorResponse("Error al enviar mensaje", error.message)
    );
  }
};

// 🟢 Obtener chat entre dos usuarios específicos
export const obtenerChatEntreUsuarios = async (req, res) => {
  try {
    const { id_usuario1, id_usuario2 } = req.params;
    
    console.log('🔍 Buscando chat entre usuarios:', { id_usuario1, id_usuario2 });
    
    if (!id_usuario1 || !id_usuario2 || isNaN(id_usuario1) || isNaN(id_usuario2)) {
      return res.status(400).json(
        errorResponse(
          "IDs de usuario inválidos", 
          "Ambos IDs de usuario deben ser números válidos", 
          400
        )
      );
    }

    const chat = await chatService.obtenerChatEntreUsuarios(
      Number(id_usuario1), 
      Number(id_usuario2)
    );
    
    if (!chat) {
      console.log('ℹ️ No se encontró chat entre los usuarios');
      return res.status(404).json(
        errorResponse(
          "Chat no encontrado", 
          "No existe un chat entre los usuarios especificados", 
          404
        )
      );
    }
    
    console.log('✅ Chat encontrado, ID:', chat.id_chat);
    
    res.json(successResponse(
      chat,
      "Chat encontrado exitosamente",
      {
        chat_id: chat.id_chat,
        usuarios: [id_usuario1, id_usuario2],
        total_mensajes: chat.mensajes?.length || 0
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener chat entre usuarios:", error);
    res.status(500).json(
      errorResponse("Error al obtener chat", error.message)
    );
  }
};

// 🟢 Crear chat si no existe - ACTUALIZADO
export const crearChat = async (req, res) => {
  try {
    const { id_docente, id_estudiante, id_curso, id_seccion } = req.body;
    
    console.log('🆕 Solicitando creación de chat:', { 
      id_docente, 
      id_estudiante, 
      id_curso, 
      id_seccion 
    });

    // Validaciones
    if (!id_docente || !id_estudiante) {
      return res.status(400).json(
        errorResponse(
          "Faltan campos requeridos", 
          "Los campos 'id_docente' e 'id_estudiante' son obligatorios", 
          400
        )
      );
    }

    const chat = await chatService.crearChatSiNoExiste(
      Number(id_docente), 
      Number(id_estudiante), 
      id_curso ? Number(id_curso) : null, 
      id_seccion ? Number(id_seccion) : null
    );
    
    console.log('✅ Chat procesado exitosamente, ID:', chat.id_chat);
    
    // Determinar si es nuevo chat o existente
    const esNuevoChat = !chat.mensajes || chat.mensajes.length === 0;
    const totalMensajes = chat.mensajes?.length || 0;
    
    res.json(successResponse(
      chat,
      esNuevoChat ? "Nuevo chat creado" : "Chat existente recuperado",
      {
        chat_id: chat.id_chat,
        es_nuevo_chat: esNuevoChat,
        docente_id: id_docente,
        estudiante_id: id_estudiante,
        total_mensajes: totalMensajes,
        contexto: {
          curso_id: id_curso || null,
          seccion_id: id_seccion || null
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al crear chat:", error);
    res.status(500).json(
      errorResponse("Error al crear chat", error.message)
    );
  }
};

// 🟢 NUEVO: Crear chat entre estudiantes - VERSIÓN MEJORADA
export const crearChatEntreEstudiantes = async (req, res) => {
  try {
    const { id_estudiante1, id_estudiante2, id_curso, id_seccion } = req.body;
    
    console.log('🆕 Solicitando creación de chat entre estudiantes:', { 
      id_estudiante1, 
      id_estudiante2, 
      id_curso, 
      id_seccion 
    });

    // 🟢 VALIDACIONES MEJORADAS
    if (!id_estudiante1 || !id_estudiante2) {
      return res.status(400).json(
        errorResponse(
          "Faltan campos requeridos", 
          "Los campos 'id_estudiante1' e 'id_estudiante2' son obligatorios", 
          400
        )
      );
    }

    // Verificar que los estudiantes existen
    const [estudiante1, estudiante2] = await Promise.all([
      prisma.estudiante.findUnique({
        where: { id_estudiante: Number(id_estudiante1) },
        include: { usuario: { select: { id_usuario: true } } }
      }),
      prisma.estudiante.findUnique({
        where: { id_estudiante: Number(id_estudiante2) },
        include: { usuario: { select: { id_usuario: true } } }
      })
    ]);

    if (!estudiante1 || !estudiante2) {
      return res.status(404).json(
        errorResponse("Uno o ambos estudiantes no existen")
      );
    }

    // Verificar si ya existe un chat entre estos estudiantes
    const chatExistente = await prisma.chat.findFirst({
      where: {
        OR: [
          {
            id_remitente: estudiante1.usuario.id_usuario,
            id_destinatario: estudiante2.usuario.id_usuario
          },
          {
            id_remitente: estudiante2.usuario.id_usuario,
            id_destinatario: estudiante1.usuario.id_usuario
          }
        ]
      },
      include: {
        mensajes: {
          orderBy: { fecha: 'desc' },
          take: 10,
          include: {
            remitente: {
              select: {
                id_usuario: true,
                correo: true,
                rol: true,
                estudiante: { select: { nombre: true, apellido: true } }
              }
            }
          }
        }
      }
    });

    if (chatExistente) {
      console.log('✅ Chat existente encontrado, ID:', chatExistente.id_chat);
      return res.json(successResponse(
        chatExistente,
        "Chat existente recuperado",
        {
          chat_id: chatExistente.id_chat,
          es_nuevo_chat: false,
          estudiantes: [id_estudiante1, id_estudiante2],
          total_mensajes: chatExistente.mensajes?.length || 0
        }
      ));
    }

    // 🆕 Crear nuevo chat entre estudiantes
    const nuevoChat = await prisma.chat.create({
      data: {
        id_remitente: estudiante1.usuario.id_usuario,
        id_destinatario: estudiante2.usuario.id_usuario,
        id_curso: id_curso ? Number(id_curso) : null,
        id_seccion: id_seccion ? Number(id_seccion) : null,
      },
      include: {
        mensajes: {
          include: {
            remitente: {
              select: {
                id_usuario: true,
                correo: true,
                rol: true,
                estudiante: { select: { nombre: true, apellido: true } }
              }
            }
          }
        }
      }
    });

    console.log('✅ Nuevo chat entre estudiantes creado, ID:', nuevoChat.id_chat);

    res.json(successResponse(
      nuevoChat,
      "Nuevo chat entre estudiantes creado",
      {
        chat_id: nuevoChat.id_chat,
        es_nuevo_chat: true,
        estudiantes: [id_estudiante1, id_estudiante2],
        contexto: {
          curso_id: id_curso || null,
          seccion_id: id_seccion || null
        }
      }
    ));
  } catch (error) {
    console.error("❌ Error al crear chat entre estudiantes:", error);
    res.status(500).json(
      errorResponse("Error al crear chat entre estudiantes", error.message)
    );
  }
};

// 🟢 Health check del servicio de chat
export const healthCheck = async (req, res) => {
  try {
    console.log('🏥 Health check del servicio de chat');
    
    const healthStatus = await chatService.healthCheck();
    const timestamp = new Date().toISOString();
    
    console.log('✅ Health check completado, estado:', healthStatus.status);
    
    res.json(successResponse(
      {
        status: healthStatus.status,
        database: healthStatus.database,
        service: 'chat-service'
      },
      "Servicio de chat operativo",
      {
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: timestamp
      }
    ));
  } catch (error) {
    console.error("❌ Error en health check:", error);
    res.status(503).json(
      errorResponse("Servicio de chat no disponible", error.message, 503)
    );
  }
};

// 🟢 Nuevo: Endpoint para obtener estadísticas de chat
export const obtenerEstadisticasChat = async (req, res) => {
  try {
    const id_docente = Number(req.params.id);
    
    if (!id_docente || isNaN(id_docente)) {
      return res.status(400).json(
        errorResponse("ID de docente inválido", "El ID del docente debe ser un número válido", 400)
      );
    }

    const alumnos = await chatService.getAlumnosByDocente(id_docente);
    const chats = await chatService.getChatsByDocente(id_docente);
    
    const estadisticas = {
      total_alumnos: alumnos.length,
      alumnos_con_chat: alumnos.filter(a => a.tieneChat).length,
      total_chats: chats.length,
      chats_activos: chats.filter(c => c.ultimo_mensaje).length,
      mensajes_totales: chats.reduce((total, chat) => total + (chat.mensajes?.length || 0), 0)
    };
    
    res.json(successResponse(
      estadisticas,
      "Estadísticas de chat obtenidas",
      {
        docente_id: id_docente,
        fecha_consulta: new Date().toISOString()
      }
    ));
  } catch (error) {
    console.error("❌ Error al obtener estadísticas:", error);
    res.status(500).json(
      errorResponse("Error al obtener estadísticas de chat", error.message)
    );
  }
};

// 🟢 AGREGAR middleware de upload
// 🟢 MIDDLEWARE DE MULTER PARA MENSAJES
export const uploadMensaje = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos para mensajes
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      console.log(`✅ Archivo aceptado: ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      console.log(`❌ Tipo de archivo rechazado: ${file.mimetype}`);
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
    }
  }
}).single('archivo');

// 🟢 NUEVO: Descargar archivo de mensaje
export const descargarArchivoMensaje = async (req, res) => {
  try {
    const { ruta } = req.params;
    console.log(`📥 Solicitando descarga de archivo: ${ruta}`);

    const { data, error } = await supabaseService.supabase.storage
      .from('archivos')
      .createSignedUrl(ruta, 3600); // 1 hora de expiración

    if (error) throw error;

    res.json(successResponse(
      {
        downloadUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      },
      "URL de descarga generada"
    ));

  } catch (error) {
    console.error('❌ Error descargando archivo:', error);
    res.status(500).json(
      errorResponse("Error al obtener archivo", error.message)
    );
  }
  
};
// 🟢 Obtener cursos del estudiante - AGREGAR AL FINAL DEL ARCHIVO
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
      const docentePrincipal = estudiante.seccion.docentes[0];
      
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

// 🟢 Obtener compañeros de curso - AGREGAR AL FINAL DEL ARCHIVO
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

