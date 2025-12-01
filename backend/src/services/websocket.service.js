import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import SupabaseService from './supabase.service.js'; // 🟢 IMPORTAR SUPABASE

const prisma = new PrismaClient();

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // id_usuario -> socket_id
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4200", 
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Usuario conectado:', socket.id);

      // 🟢 Usuario se identifica
      socket.on('user_connected', (userData) => {
        const { id_usuario } = userData;
        this.connectedUsers.set(id_usuario, socket.id);
        console.log(`👤 Usuario ${id_usuario} conectado como ${socket.id}`);
        
        // Unir a sala personal
        socket.join(`user_${id_usuario}`);
      });

      // 🟢 Unirse a un chat específico
      socket.on('join_chat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`💬 Socket ${socket.id} unido al chat ${chatId}`);
      });

      // 🟢 Dejar un chat
      socket.on('leave_chat', (chatId) => {
        socket.leave(`chat_${chatId}`);
        console.log(`🚪 Socket ${socket.id} salió del chat ${chatId}`);
      });

// websocket.service.js - VERSIÓN CORREGIDA
socket.on('send_message', async (messageData) => {
  try {
    const { id_chat, contenido, id_remitente, archivo, archivoBuffer } = messageData;
    
    console.log('📤 Mensaje WebSocket recibido:', { 
      id_chat, 
      id_remitente,
      contenido: contenido?.substring(0, 50),
      tieneArchivo: !!archivo,
      tieneBuffer: !!archivoBuffer
    });

    // 🟢 PROTECCIÓN MEJORADA CONTRA DUPLICADOS
    const ahora = new Date();
    const hace5Segundos = new Date(ahora.getTime() - 5000);

    const mensajeDuplicado = await prisma.mensaje.findFirst({
      where: {
        id_chat: Number(id_chat),
        id_remitente: Number(id_remitente),
        OR: [
          { contenido: contenido?.trim() || '' },
          { 
            AND: [
              { contenido: { contains: '📎' } },
              { archivo: { not: null } }
            ]
          }
        ],
        fecha: {
          gte: hace5Segundos
        }
      }
    });

    if (mensajeDuplicado) {
      console.log('🚫 Mensaje duplicado detectado y bloqueado en WebSocket');
      socket.emit('message_error', {
        error: 'Mensaje duplicado',
        details: 'Este mensaje ya fue enviado recientemente',
        mensajeId: mensajeDuplicado.id_mensaje
      });
      
      // 🟢 ENVIAR EL MENSAJE EXISTENTE EN LUGAR DE CREAR UNO NUEVO
      socket.emit('new_message', mensajeDuplicado);
      return;
    }

    let contenidoFinal = contenido || '';
    let archivoInfo = null;

    // 🟢 PROCESAR ARCHIVO SI EXISTE
    if (archivo && archivoBuffer) {
      try {
        console.log('📎 Procesando archivo para Supabase...');
        
        // Convertir Buffer
        const buffer = Buffer.from(archivoBuffer.data || archivoBuffer);
        
        // Subir a Supabase
        const resultadoSupabase = await SupabaseService.subirArchivo(
          buffer,
          archivo.nombre,
          'chat_archivos',
          archivo.tipo
        );

        if (resultadoSupabase) {
          console.log('✅ Archivo subido a Supabase:', resultadoSupabase.url);

          archivoInfo = {
            url: resultadoSupabase.url,
            ruta: resultadoSupabase.ruta,
            nombre: archivo.nombre,
            tipo: archivo.tipo,
            tamano: archivo.tamano || archivo.tamano
          };
          
          // 🟢 CORRECCIÓN: NO codificar en contenido, usar campos separados
          contenidoFinal = contenido || `📎 ${archivo.nombre}`;
        } else {
          throw new Error('No se pudo subir el archivo a Supabase');
        }
      } catch (error) {
        console.error('❌ Error procesando archivo:', error);
        socket.emit('message_error', {
          error: 'Error procesando archivo',
          details: error.message
        });
        return;
      }
    }

    // 🟢 GUARDAR EN BD CON CAMPOS SEPARADOS
    const nuevoMensaje = await prisma.mensaje.create({
      data: {
        contenido: contenidoFinal.trim(),
        id_chat: Number(id_chat),
        id_remitente: Number(id_remitente),
        archivo: archivoInfo?.url || null,
        archivo_ruta: archivoInfo?.ruta || null
      },
      include: {
        remitente: {
          select: {
            id_usuario: true,
            correo: true,
            rol: true,
            docente: { select: { nombre: true, apellido: true } },
            estudiante: { select: { nombre: true, apellido: true } }
          }
        }
      }
    });

    console.log('✅ Mensaje guardado en BD:', {
      id: nuevoMensaje.id_mensaje,
      tieneArchivo: !!archivoInfo,
      archivoUrl: nuevoMensaje.archivo
    });

    // 🟢 PREPARAR MENSAJE PARA ENVÍO
    const mensajeParaEnviar = {
      ...nuevoMensaje,
      archivo: archivoInfo ? {
        url: archivoInfo.url,
        ruta: archivoInfo.ruta,
        nombre: archivoInfo.nombre,
        tipo: archivoInfo.tipo,
        tamano: archivoInfo.tamano
      } : null
    };

    console.log('📡 Enviando por WebSocket:', {
      id_mensaje: mensajeParaEnviar.id_mensaje,
      id_chat: mensajeParaEnviar.id_chat,
      tieneArchivo: !!mensajeParaEnviar.archivo
    });

    // 🟢 ENVIAR A TODOS EN EL CHAT
    this.io.to(`chat_${id_chat}`).emit('new_message', mensajeParaEnviar);
    
    // 🟢 NOTIFICACIÓN AL DESTINATARIO
    const chat = await prisma.chat.findUnique({
      where: { id_chat: Number(id_chat) },
      select: { id_remitente: true, id_destinatario: true }
    });

    if (chat) {
      const id_destinatario = chat.id_remitente === Number(id_remitente) 
        ? chat.id_destinatario 
        : chat.id_remitente;

      this.io.to(`user_${id_destinatario}`).emit('message_notification', {
        chatId: id_chat,
        message: mensajeParaEnviar,
        sender: mensajeParaEnviar.remitente
      });

      console.log(`🔔 Notificación enviada a usuario ${id_destinatario}`);
    }

  } catch (error) {
    console.error('❌ Error enviando mensaje por WebSocket:', error);
    socket.emit('message_error', { 
      error: 'No se pudo enviar el mensaje',
      details: error.message
    });
  }
});

      // 🟢 Usuario escribiendo...
      socket.on('typing_start', (data) => {
        const { chatId, userId } = data;
        socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping: true });
        console.log(`✍️ Usuario ${userId} escribiendo en chat ${chatId}`);
      });

      socket.on('typing_stop', (data) => {
        const { chatId, userId } = data;
        socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping: false });
        console.log(`🛑 Usuario ${userId} dejó de escribir en chat ${chatId}`);
      });

      // 🟢 NUEVO: Evento para verificar estado de conexión
      socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
          callback({ 
            status: 'ok', 
            socketId: socket.id,
            timestamp: new Date().toISOString()
          });
        }
      });

      // 🟢 Desconexión
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Usuario desconectado: ${socket.id} - Razón: ${reason}`);
        
        // Remover usuario de connectedUsers
        for (let [id_usuario, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(id_usuario);
            console.log(`👋 Usuario ${id_usuario} removido de connectedUsers`);
            break;
          }
        }
      });

      // 🟢 NUEVO: Manejo de errores de socket
      socket.on('error', (error) => {
        console.error(`❌ Error en socket ${socket.id}:`, error);
      });
    });
  }

  // 🟢 Enviar notificación específica a usuario
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      console.log(`📨 Notificación ${event} enviada a usuario ${userId}`);
    } else {
      console.log(`⚠️ Usuario ${userId} no conectado para enviar ${event}`);
    }
  }

  // 🟢 Enviar a todos en un chat
  sendToChat(chatId, event, data) {
    this.io.to(`chat_${chatId}`).emit(event, data);
    console.log(`📢 Evento ${event} enviado a chat ${chatId}`);
  }

  // 🟢 NUEVO: Método para obtener estadísticas
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.io.sockets.adapter.rooms.size,
      totalSockets: this.io.engine.clientsCount
    };
  }

  // 🟢 NUEVO: Verificar si un usuario está conectado
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  // 🟢 NUEVO: Obtener socket ID de un usuario
  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }

  // 🟢 NUEVO: Método para procesar mensajes existentes con archivos codificados
  // websocket.service.js - AGREGAR/ACTUALIZAR método
async procesarMensajesConArchivos(mensajes) {
  try {
    return mensajes.map(mensaje => {
      // 🟢 SI EL MENSAJE YA TIENE ARCHIVO EN CAMPOS SEPARADOS, USAR ESOS
      if (mensaje.archivo && mensaje.archivo_ruta) {
        return {
          ...mensaje,
          archivo: {
            url: mensaje.archivo,
            ruta: mensaje.archivo_ruta,
            nombre: mensaje.archivo?.split('/').pop() || 'archivo',
            tipo: this.obtenerTipoArchivo(mensaje.archivo),
            tamano: null
          }
        };
      }
      
      // 🟢 SI ES UN MENSAJE ANTIGUO CON CODIFICACIÓN, PROCESARLO
      if (mensaje.contenido && mensaje.contenido.startsWith('[ARCHIVO]')) {
        try {
          const jsonStr = mensaje.contenido.substring(9);
          const archivoData = JSON.parse(jsonStr);
          
          return {
            ...mensaje,
            contenido: archivoData.contenidoOriginal,
            archivo: {
              url: archivoData.url,
              ruta: archivoData.ruta,
              nombre: archivoData.nombre,
              tipo: archivoData.tipoArchivo,
              tamano: archivoData.tamano
            }
          };
        } catch (error) {
          console.error('Error procesando mensaje antiguo con archivo:', error);
          return mensaje;
        }
      }
      
      return mensaje;
    });
  } catch (error) {
    console.error('Error procesando mensajes con archivos:', error);
    return mensajes;
  }
}

obtenerTipoArchivo(url) {
  const extension = url.split('.').pop()?.toLowerCase();
  const tipos = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };
  return tipos[extension] || 'application/octet-stream';
}
}

export default new WebSocketService();