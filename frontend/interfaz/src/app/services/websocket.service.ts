// websocket.service.ts - VERSIÓN COMPLETA OPTIMIZADA
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface Usuario {
  id_usuario: number;
  correo: string;
  rol: string;
  nombre?: string; // 🆕 AGREGAR propiedad opcional
  apellido?: string; // 🆕 AGREGAR propiedad opcional
  docente?: {
    nombre: string;
    apellido: string;
  };
  estudiante?: {
    nombre: string;
    apellido: string;
  };
}

export interface MensajeSocket {
  id_mensaje: number;
  contenido: string;
  fecha: string;
  id_chat: number;
  id_remitente: number;
  remitente?: {
    id_usuario: number;
    correo: string;
    rol: string;
    docente?: { nombre: string; apellido: string };
    estudiante?: { nombre: string; apellido: string };
  };
  archivo?: {
    url: string;
    ruta: string;
    nombre: string;
    tipo: string;
    tamaño?: number;
  };
}

export interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError?: string;
  reconnectAttempts: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket | null = null;
  private readonly apiUrl = 'http://localhost:4000';
  
  // 🆕 MEJORA: Estado de conexión mejorado
  private connectionState = new BehaviorSubject<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });

   // 🟢 AGREGAR: Cache de mensajes recientes para detección de duplicados
  private recentMessagesCache = new Map<number, any[]>();
  private readonly MAX_RECENT_MESSAGES = 10;
  private readonly DUPLICATE_TIME_WINDOW = 3000; // 3 segundos

  // 🆕 MEJORA: Subjects optimizados
  private messageSubject = new BehaviorSubject<MensajeSocket | null>(null);
  private notificationSubject = new BehaviorSubject<any>(null);
  private typingSubject = new BehaviorSubject<{ userId: number; isTyping: boolean }>({ userId: 0, isTyping: false });
  private errorSubject = new BehaviorSubject<string>('');

  // 🆕 MEJORA: Control avanzado de conexión
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private connectionTimeout: any;

  // 🆕 MEJORA: Cache de rooms y mensajes pendientes
  private joinedRooms = new Set<number>();
  private messageQueue: any[] = [];
  private pendingIdentification = false;

  constructor(private authService: AuthService) {
    console.log('🔧 WebsocketService inicializado - Versión Optimizada');
    this.initializeWithSafetyDelay();
  }

// 🟢 AGREGAR: Métodos para manejar mensajes recientes
  private getRecentMessages(chatId: number): any[] {
    return this.recentMessagesCache.get(chatId) || [];
  }

  private addToRecentMessages(chatId: number, message: any): void {
    if (!this.recentMessagesCache.has(chatId)) {
      this.recentMessagesCache.set(chatId, []);
    }
    
    const messages = this.recentMessagesCache.get(chatId)!;
    messages.unshift(message);
    
    // Mantener solo los mensajes más recientes
    if (messages.length > this.MAX_RECENT_MESSAGES) {
      messages.pop();
    }
    
    // Limpiar mensajes antiguos automáticamente
    this.cleanOldMessages(chatId);
  }

  private cleanOldMessages(chatId: number): void {
    if (!this.recentMessagesCache.has(chatId)) return;
    
    const now = Date.now();
    const messages = this.recentMessagesCache.get(chatId)!;
    const filteredMessages = messages.filter(msg => {
      const messageTime = new Date(msg.fecha).getTime();
      return (now - messageTime) < this.DUPLICATE_TIME_WINDOW;
    });
    
    this.recentMessagesCache.set(chatId, filteredMessages);
  }

  private isDuplicateMessage(contenido: string, chatId: number): boolean {
    const recentMessages = this.getRecentMessages(chatId);
    const now = Date.now();
    
    return recentMessages.some((msg: any) => {
      const messageTime = new Date(msg.fecha).getTime();
      const timeDiff = now - messageTime;
      
      return msg.contenido === contenido && timeDiff < this.DUPLICATE_TIME_WINDOW;
    });
  }

  // 🆕 MEJORA: Inicialización con delay de seguridad
  private initializeWithSafetyDelay(): void {
    // Esperar a que Angular esté completamente inicializado
    setTimeout(() => {
      this.initializeConnection();
    }, 1000);
  }

  private initializeConnection(): void {
    console.log('🔄 Inicializando conexión WebSocket optimizada...');
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.warn('⏳ Usuario no disponible aún, reintentando en 2 segundos...');
      setTimeout(() => this.initializeConnection(), 2000);
      return;
    }

    this.connect();
  }

  // 🆕 MEJORA: Conexión completamente optimizada
  connect(): void {
    const currentState = this.connectionState.value;
    
    // Evitar conexiones duplicadas
    if (currentState.status === 'connecting' || currentState.status === 'connected') {
      console.log('⏳ Conexión ya en progreso o establecida');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('❌ No hay usuario autenticado para conectar WebSocket');
      this.updateConnectionState('error', 'Usuario no autenticado');
      return;
    }

    console.log('🔌 Iniciando conexión WebSocket optimizada...');
    this.updateConnectionState('connecting');

    try {
      // 🆕 MEJORA: Limpieza completa del socket anterior
      this.cleanupSocket();

      // 🆕 MEJORA: Configuración mejorada del socket
      this.socket = io(this.apiUrl, {
        transports: ['websocket', 'polling'],
        timeout: 15000,
        reconnection: false, // 🆕 Manejar reconexión manualmente
        autoConnect: true,
        auth: {
          token: localStorage.getItem('token'),
          userId: currentUser.id_usuario
        },
        query: {
          userRole: currentUser.rol,
          userId: currentUser.id_usuario
        }
      });

      this.setupEventListeners();
      this.setupConnectionTimeout();
      
      console.log('🔌 Socket.io configurado, esperando conexión...');
      
    } catch (error) {
      console.error('❌ Error crítico creando socket:', error);
      this.updateConnectionState('error', 'Error creando conexión WebSocket');
      this.scheduleReconnect();
    }
  }

  // 🆕 MEJORA: Timeout de conexión
  private setupConnectionTimeout(): void {
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState.value.status === 'connecting') {
        console.error('⏰ Timeout de conexión WebSocket');
        this.cleanupSocket();
        this.updateConnectionState('error', 'Timeout de conexión');
        this.scheduleReconnect();
      }
    }, 15000);
  }

  // 🆕 MEJORA: Limpieza completa del socket
  private cleanupSocket(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    // 🟢 LIMPIAR CACHE AL DESCONECTAR
  this.clearRecentMessages();
  }

  // 🆕 MEJORA: Configuración de listeners optimizada
  private setupEventListeners(): void {
    if (!this.socket) {
      console.error('❌ No hay socket para configurar listeners');
      return;
    }

    // 🆕 MEJORA: Agrupar eventos por categoría
    this.setupConnectionEvents();
    this.setupChatEvents();
    this.setupErrorEvents();
  }

  private setupConnectionEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket CONECTADO - ID:', this.socket?.id);
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.updateConnectionState('connected');
      this.errorSubject.next('');
      
      // 🆕 MEJORA: Identificación inmediata pero segura
      this.safeIdentifyUser();
      
      // 🆕 MEJORA: Reunirse a rooms automáticamente
      this.rejoinRooms();
      
      // 🆕 MEJORA: Procesar mensajes en cola
      this.processMessageQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket DESCONECTADO - Razón:', reason);
      this.updateConnectionState('disconnected');
      
      // 🆕 MEJORA: Estrategia de reconexión basada en la razón
      if (reason === 'io server disconnect') {
        // El servidor nos desconectó, esperar antes de reconectar
        console.log('🔄 Reconectando después de desconexión del servidor...');
        setTimeout(() => this.connect(), 5000);
      } else {
        // Otra razón, reconectar más rápido
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
      this.updateConnectionState('error', `Error de conexión: ${error.message}`);
      this.scheduleReconnect();
    });
  }

  private setupChatEvents(): void {
    if (!this.socket) return;

    this.socket.on('new_message', (message: MensajeSocket) => {
      console.log('📥 Nuevo mensaje recibido:', {
        id: message.id_mensaje,
        chat: message.id_chat,
        remitente: message.remitente?.id_usuario,
        contenido: message.contenido?.substring(0, 50)
      });

      // 🟢 AGREGAR A MENSAJES RECIENTES cuando recibimos mensajes
    if (message.contenido) {
      this.addToRecentMessages(message.id_chat, {
        contenido: message.contenido,
        fecha: message.fecha,
        id_remitente: message.id_remitente
      });
    }
      this.messageSubject.next(message);
    });

    

    this.socket.on('message_notification', (notification) => {
      console.log('🔔 Notificación recibida para chat:', notification.chatId);
      this.notificationSubject.next(notification);
    });

    this.socket.on('user_typing', (data: { userId: number; isTyping: boolean }) => {
      console.log('✍️ Usuario escribiendo:', data);
      this.typingSubject.next(data);
    });
  }

  private setupErrorEvents(): void {
    if (!this.socket) return;

    this.socket.on('message_error', (error: { error: string }) => {
      console.error('❌ Error en mensaje WebSocket:', error);
      this.errorSubject.next(error.error || 'Error desconocido en mensaje');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Error en reconexión:', error);
      this.errorSubject.next('Error en reconexión WebSocket');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💥 Reconexión fallida después de múltiples intentos');
      this.errorSubject.next('Reconexión fallida');
    });
  }

  // 🆕 MEJORA: Identificación segura del usuario
  private safeIdentifyUser(): void {
    if (this.pendingIdentification) {
      console.log('⏳ Identificación ya en progreso...');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && this.socket?.connected) {
      this.pendingIdentification = true;
      
      console.log('👤 Identificando usuario en WebSocket:', currentUser.id_usuario);
      this.socket.emit('user_connected', {
        id_usuario: currentUser.id_usuario,
        rol: currentUser.rol,
      });
      
      // Resetear flag después de un tiempo razonable
      setTimeout(() => {
        this.pendingIdentification = false;
      }, 1000);
    }
  }

  // 🆕 MEJORA: Reunirse a rooms automáticamente
  private rejoinRooms(): void {
    if (this.joinedRooms.size > 0 && this.socket?.connected) {
      console.log(`🔄 Reuniéndose a ${this.joinedRooms.size} rooms...`);
      this.joinedRooms.forEach(chatId => {
        this.joinChatInternal(chatId);
      });
    }
  }

  // 🆕 MEJORA: Procesar cola de mensajes pendientes
  private processMessageQueue(): void {
    if (this.messageQueue.length > 0 && this.socket?.connected) {
      console.log(`📤 Procesando ${this.messageQueue.length} mensajes en cola...`);
      
      // Enviar mensajes en orden
      this.messageQueue.forEach((message, index) => {
        setTimeout(() => {
          this.sendMessageInternal(message);
        }, index * 100); // Espaciar envíos para evitar sobrecarga
      });
      
      this.messageQueue = [];
    }
  }

  // 🆕 MEJORA: Actualización centralizada del estado
  private updateConnectionState(status: ConnectionState['status'], error?: string): void {
    const currentState = this.connectionState.value;
    const newState: ConnectionState = {
      status,
      reconnectAttempts: status === 'connecting' ? currentState.reconnectAttempts + 1 : 0,
      lastError: error
    };
    
    this.connectionState.next(newState);
    console.log(`📡 Estado de conexión: ${status}`, error ? `- Error: ${error}` : '');
  }

  // 🆕 MEJORA: Reconexión programada inteligente
  private scheduleReconnect(): void {
    const currentState = this.connectionState.value;
    
    if (currentState.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('💥 Máximo de intentos de reconexión alcanzado');
      this.updateConnectionState('error', 'Máximo de intentos de reconexión alcanzado');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(1.5, currentState.reconnectAttempts);
    const nextAttempt = currentState.reconnectAttempts + 1;
    
    console.log(`🔄 Reintentando conexión en ${Math.round(delay/1000)}s (intento ${nextAttempt}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.connectionState.value.status !== 'connected') {
        this.connect();
      }
    }, delay);
  }

  // 🆕 MEJORA: Unirse a chat con verificación completa
  joinChat(chatId: number): void {
    if (!chatId || isNaN(chatId)) {
      console.error('❌ ID de chat inválido:', chatId);
      return;
    }

    // Agregar a la lista de rooms independientemente del estado de conexión
    this.joinedRooms.add(chatId);

    if (!this.socket?.connected) {
      console.log(`💬 Chat ${chatId} agregado a la lista, uniéndose cuando se conecte...`);
      return;
    }

    this.joinChatInternal(chatId);
  }

  private joinChatInternal(chatId: number): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ WebSocket no conectado para unirse al chat');
      return;
    }

    console.log(`💬 Uniéndose al chat ${chatId}`);
    this.socket.emit('join_chat', chatId);
  }

  // 🆕 MEJORA: Salir de chat optimizado
  leaveChat(chatId: number): void {
    this.joinedRooms.delete(chatId);

    if (!this.socket?.connected) {
      console.log(`🚪 Chat ${chatId} removido de la lista`);
      return;
    }

    console.log(`🚪 Saliendo del chat ${chatId}`);
    this.socket.emit('leave_chat', chatId);
  }

  // 🆕 MEJORA: Envío de mensajes con cola y verificación
  sendMessage(messageData: {
    id_chat: number;
    contenido: string;
    id_remitente: number;
    archivo?: any;
  }): void {
    // Validación exhaustiva
    if (!this.validateMessageData(messageData)) {
      return;
    }

     // 🟢 AGREGAR TIMESTAMP PARA EVITAR DUPLICADOS
  const mensajeConTimestamp = {
    ...messageData,
    _timestamp: Date.now(),
    _socketId: this.socket?.id
  };

  console.log('📤 Enviando mensaje por WebSocket:', {
    id_chat: messageData.id_chat,
    id_remitente: messageData.id_remitente,
    timestamp: mensajeConTimestamp._timestamp,
    socketId: mensajeConTimestamp._socketId
  });

   // 🟢 AGREGAR A MENSAJES RECIENTES ANTES DE ENVIAR
    if (messageData.contenido?.trim()) {
      this.addToRecentMessages(messageData.id_chat, {
        contenido: messageData.contenido.trim(),
        fecha: new Date().toISOString(),
        id_remitente: messageData.id_remitente
      });
    }

    // 🆕 MEJORA: Usar envío interno que maneja la cola
    this.sendMessageInternal(messageData);
  }

  // 🟢 AGREGAR: Método para limpiar la cache de mensajes
  clearRecentMessages(chatId?: number): void {
    if (chatId) {
      this.recentMessagesCache.delete(chatId);
      console.log(`🗑️ Cache de mensajes recientes limpiada para chat: ${chatId}`);
    } else {
      this.recentMessagesCache.clear();
      console.log('🗑️ Cache de mensajes recientes limpiada completamente');
    }
  }

  // 🟢 AGREGAR: Método para obtener estadísticas de la cache
  getCacheStats(): { totalChats: number; totalMessages: number } {
    let totalMessages = 0;
    
    this.recentMessagesCache.forEach((messages, chatId) => {
      totalMessages += messages.length;
    });
    
    return {
      totalChats: this.recentMessagesCache.size,
      totalMessages: totalMessages
    };
  }

  private validateMessageData(messageData: any): boolean {
    if (!messageData.id_chat || !messageData.id_remitente) {
      console.error('❌ Datos de mensaje incompletos:', messageData);
      this.errorSubject.next('Datos de mensaje incompletos');
      return false;
    }

    if (!messageData.contenido?.trim() && !messageData.archivo) {
      console.error('❌ Mensaje vacío - debe tener contenido o archivo');
      this.errorSubject.next('El mensaje no puede estar vacío');
      return false;
    }

    if (messageData.contenido && messageData.contenido.length > 4000) {
      console.error('❌ Mensaje demasiado largo');
      this.errorSubject.next('El mensaje es demasiado largo (máximo 4000 caracteres)');
      return false;
    }

    // 🟢 EVITAR MENSAJES DUPLICADOS POR CONTENIDO
  const contenido = messageData.contenido?.trim() || '';
  if (contenido && this.isDuplicateMessage(contenido, messageData.id_chat)) {
    console.error('❌ Mensaje duplicado detectado');
    this.errorSubject.next('Mensaje duplicado detectado. Espera unos segundos.');
    return false;
  }

    return true;
  }


  private sendMessageInternal(messageData: any): void {
    if (!this.socket?.connected) {
      console.log('📝 Mensaje agregado a la cola (WebSocket desconectado)');
      this.messageQueue.push(messageData);
      
      // 🆕 MEJORA: Intentar reconexión si no hay conexión
      if (this.connectionState.value.status === 'disconnected') {
        this.connect();
      }
      return;
    }

    console.log('📤 Enviando mensaje por WebSocket:', {
      id_chat: messageData.id_chat,
      id_remitente: messageData.id_remitente,
      contenido: messageData.contenido?.substring(0, 100) + (messageData.contenido?.length > 100 ? '...' : ''),
      tieneArchivo: !!messageData.archivo
    });

    this.socket.emit('send_message', messageData);
  }

  // 🆕 MEJORA: Indicador de escritura optimizado
  startTyping(chatId: number, userId: number): void {
    if (!this.socket?.connected) {
      return;
    }
    
    console.log(`✍️ Iniciando typing en chat ${chatId}`);
    this.socket.emit('typing_start', { chatId, userId });
  }

  stopTyping(chatId: number, userId: number): void {
    if (!this.socket?.connected) {
      return;
    }
    
    console.log(`🛑 Deteniendo typing en chat ${chatId}`);
    this.socket.emit('typing_stop', { chatId, userId });
  }

  // 🆕 MEJORA: API pública mejorada
  onNewMessage(): Observable<MensajeSocket | null> {
    return this.messageSubject.asObservable();
  }

  onMessageNotification(): Observable<any> {
    return this.notificationSubject.asObservable();
  }

  onUserTyping(): Observable<{ userId: number; isTyping: boolean }> {
    return this.typingSubject.asObservable();
  }

  onMessageError(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  onConnectionState(): Observable<ConnectionState> {
    return this.connectionState.asObservable();
  }

  // 🆕 MEJORA: Métodos de utilidad mejorados
  disconnect(): void {
    console.log('🔌 Desconectando WebSocket...');
    this.cleanupSocket();
    this.joinedRooms.clear();
    this.messageQueue = [];
    this.updateConnectionState('disconnected');
    console.log('🔌 WebSocket desconectado y limpiado');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState.value;
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  getJoinedRooms(): number[] {
    return Array.from(this.joinedRooms);
  }

  getQueuedMessagesCount(): number {
    return this.messageQueue.length;
  }

  // 🆕 MEJORA: Reconexión forzada
  reconnect(): void {
    console.log('🔄 Forzando reconexión WebSocket...');
    this.cleanupSocket();
    this.updateConnectionState('disconnected');
    this.connect();
  }

  // 🆕 MEJORA: Limpieza completa
  clearErrors(): void {
    this.errorSubject.next('');
  }

  // 🆕 MEJORA: Verificación de salud
  healthCheck(): { healthy: boolean; details: any } {
    const state = this.connectionState.value;
    
    return {
      healthy: state.status === 'connected',
      details: {
        status: state.status,
        socketConnected: this.isConnected(),
        socketId: this.getSocketId(),
        joinedRooms: this.getJoinedRooms().length,
        queuedMessages: this.getQueuedMessagesCount(),
        reconnectAttempts: state.reconnectAttempts,
        lastError: state.lastError
      }
    };
  }

  // 🆕 MEJORA: Limpiar rooms específicos
  clearRoom(chatId: number): void {
    this.joinedRooms.delete(chatId);
    console.log(`🗑️ Room ${chatId} removido de la lista`);
  }

  // 🆕 MEJORA: Limpiar toda la cache
  clearCache(): void {
    this.joinedRooms.clear();
    this.messageQueue = [];
    console.log('🗑️ Cache de WebSocket limpiada completamente');
  }
}