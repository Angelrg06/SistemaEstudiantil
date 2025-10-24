import * as chatService from "../services/chat.service.js";

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
    console.log('📤 Enviando mensaje:', { contenido, id_chat, id_remitente });
    
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

    if (contenido.trim().length === 0) {
      return res.status(400).json(
        errorResponse(
          "El mensaje no puede estar vacío", 
          "El contenido del mensaje debe tener al menos un carácter", 
          400
        )
      );
    }

    const nuevoMensaje = await chatService.enviarMensaje({
      contenido: contenido.trim(), 
      id_chat, 
      id_remitente
    });
    
    console.log('✅ Mensaje enviado exitosamente, ID:', nuevoMensaje.id_mensaje);
    
    res.json(successResponse(
      nuevoMensaje,
      "Mensaje enviado correctamente",
      {
        mensaje_id: nuevoMensaje.id_mensaje,
        chat_id: id_chat,
        remitente_id: id_remitente,
        longitud_mensaje: contenido.length
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