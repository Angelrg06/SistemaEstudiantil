import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

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

      // 🟢 Enviar mensaje en tiempo real
      socket.on('send_message', async (messageData) => {
        try {
          const { id_chat, contenido, id_remitente, archivo } = messageData;
          
          console.log('📤 Mensaje en tiempo real:', { id_chat, id_remitente });

          // Guardar en base de datos
          const nuevoMensaje = await prisma.mensaje.create({
            data: {
              contenido,
              id_chat: Number(id_chat),
              id_remitente: Number(id_remitente),
              archivo: archivo?.url || null,
              archivo_ruta: archivo?.ruta || null
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

          // 🟢 Enviar a todos en el chat
          this.io.to(`chat_${id_chat}`).emit('new_message', nuevoMensaje);
          
          // 🟢 Notificación al destinatario si no está en el chat
          const chat = await prisma.chat.findUnique({
            where: { id_chat: Number(id_chat) },
            select: { id_remitente: true, id_destinatario: true }
          });

          const id_destinatario = chat.id_remitente === Number(id_remitente) 
            ? chat.id_destinatario 
            : chat.id_remitente;

          this.io.to(`user_${id_destinatario}`).emit('message_notification', {
            chatId: id_chat,
            message: nuevoMensaje,
            sender: nuevoMensaje.remitente
          });

        } catch (error) {
          console.error('❌ Error enviando mensaje por WebSocket:', error);
          socket.emit('message_error', { error: 'No se pudo enviar el mensaje' });
        }
      });

      // 🟢 Usuario escribiendo...
      socket.on('typing_start', (data) => {
        const { chatId, userId } = data;
        socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping: true });
      });

      socket.on('typing_stop', (data) => {
        const { chatId, userId } = data;
        socket.to(`chat_${chatId}`).emit('user_typing', { userId, isTyping: false });
      });

      // 🟢 Desconexión
      socket.on('disconnect', () => {
        // Remover usuario de connectedUsers
        for (let [id_usuario, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(id_usuario);
            console.log(`👋 Usuario ${id_usuario} desconectado`);
            break;
          }
        }
        console.log('🔌 Usuario desconectado:', socket.id);
      });
    });
  }

  // 🟢 Enviar notificación específica a usuario
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // 🟢 Enviar a todos en un chat
  sendToChat(chatId, event, data) {
    this.io.to(`chat_${chatId}`).emit(event, data);
  }
}

export default new WebSocketService();