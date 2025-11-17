import WebSocketService from '../services/websocket.service.js';

/**
 * Configura e inicializa el servicio de WebSocket en el servidor
 */
export const initializeWebSocket = (server) => {
  try {
    console.log('🔌 Inicializando WebSocket Service...');
    
    // Inicializar el servicio de WebSocket
    WebSocketService.initialize(server);
    
    console.log('✅ WebSocket Service inicializado correctamente');
    
    return WebSocketService;
  } catch (error) {
    console.error('❌ Error al inicializar WebSocket:', error);
    throw error;
  }
};

/**
 * Middleware para verificar conexiones WebSocket (opcional)
 */
export const socketAuthMiddleware = (socket, next) => {
  try {
    // Aquí puedes agregar autenticación para WebSocket si es necesario
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('⚠️  Conexión WebSocket sin token');
      return next(new Error('Autenticación requerida'));
    }
    
    // Verificar token JWT (usar el mismo que en auth.middleware)
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // socket.userId = decoded.id_usuario;
    
    next();
  } catch (error) {
    console.error('❌ Error en autenticación WebSocket:', error);
    next(new Error('Token inválido'));
  }
};

export default {
  initializeWebSocket,
  socketAuthMiddleware
};