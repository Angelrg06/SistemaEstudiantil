// chat.service.ts - VERSIÓN COMPLETA OPTIMIZADA
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType } from '@angular/common/http';
import { Observable, catchError, throwError, BehaviorSubject, Subscription, of, tap } from 'rxjs';
import { WebsocketService, MensajeSocket, ConnectionState } from './websocket.service';

// 🆕 INTERFACES COMPLETAS Y CORREGIDAS
export interface Mensaje {
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
  } | null;
}

export interface ChatHealth {
  backend: boolean;
  websocket: boolean;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:4000/api/chat';
  
  // 🆕 MEJORA: Subjects optimizados
  private mensajesSubject = new BehaviorSubject<MensajeSocket[]>([]);
  public mensajes$ = this.mensajesSubject.asObservable();

  private notificacionesSubject = new BehaviorSubject<any>(null);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  // 🆕 MEJORA: Estado de conexión mejorado
  private connectionState = new BehaviorSubject<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  public connectionState$ = this.connectionState.asObservable();

  // 🆕 MEJORA: Cache de mensajes por chat
  private messagesCache = new Map<number, Mensaje[]>();
  private cacheTimestamp = new Map<number, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // 🆕 MEJORA: Estado de upload
  private uploadProgressSubject = new BehaviorSubject<{ chatId: number; progress: number } | null>(null);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

  // Subscripciones
  private wsSubscriptions: Subscription = new Subscription();

  constructor(
    private http: HttpClient,
    private websocketService: WebsocketService
  ) {
    console.log('🔧 ChatService inicializado - Versión Optimizada');
    this.initializeWebSocket();
  }

  // 🆕 MEJORA: Inicialización optimizada del WebSocket
  private initializeWebSocket(): void {
    console.log('🔄 Inicializando WebSocket en ChatService...');

    // Esperar a que el WebSocket service esté listo
    setTimeout(() => {
      if (!this.websocketService.isConnected()) {
        console.log('🔄 Forzando conexión inicial de WebSocket...');
        this.websocketService.connect();
      }

      this.setupWebSocketListeners();
    }, 2000);
  }

  // 🆕 MEJORA: Configuración completa de listeners
  private setupWebSocketListeners(): void {
    console.log('🔧 Configurando listeners de WebSocket...');

    // Escuchar estado de conexión CORREGIDO
    this.wsSubscriptions.add(
      this.websocketService.onConnectionState().subscribe({
        next: (state: ConnectionState) => {
          console.log('📡 Estado conexión WebSocket:', state.status);
          this.connectionState.next(state);
          
          // 🆕 MEJORA: Procesar mensajes en cola cuando se reconecta
          if (state.status === 'connected') {
            this.processPendingOperations();
          }
        },
        error: (error) => {
          console.error('❌ Error en listener de conexión:', error);
        }
      })
    );

    // Escuchar nuevos mensajes
    this.wsSubscriptions.add(
      this.websocketService.onNewMessage().subscribe({
        next: (mensaje: MensajeSocket | null) => {
          if (mensaje) {
            console.log('📥 Mensaje en tiempo real recibido:', {
              id: mensaje.id_mensaje,
              chat: mensaje.id_chat,
              remitente: mensaje.id_remitente
            });
            this.agregarMensajeEnTiempoReal(mensaje);
            
            // 🆕 MEJORA: Actualizar cache
            this.updateMessageCache(mensaje);
          }
        },
        error: (error) => {
          console.error('❌ Error en listener de mensajes:', error);
        }
      })
    );
    
    // Escuchar notificaciones
    this.wsSubscriptions.add(
      this.websocketService.onMessageNotification().subscribe({
        next: (notificacion) => {
          if (notificacion) {
            console.log('🔔 Notificación recibida:', notificacion.chatId);
            this.notificacionesSubject.next(notificacion);
          }
        },
        error: (error) => {
          console.error('❌ Error en listener de notificaciones:', error);
        }
      })
    );

    // Escuchar errores de mensajes
    this.wsSubscriptions.add(
      this.websocketService.onMessageError().subscribe({
        next: (errorMessage: string) => {
          if (errorMessage && errorMessage.trim() !== '') {
            console.error('❌ Error WebSocket:', errorMessage);
            // 🆕 MEJORA: Emitir error específico
            this.notificacionesSubject.next({
              type: 'error',
              message: errorMessage,
              timestamp: new Date()
            });
          }
        },
        error: (error) => {
          console.error('❌ Error en listener de errores:', error);
        }
      })
    );
  }

  // 🆕 MEJORA: Procesar operaciones pendientes al reconectar
  private processPendingOperations(): void {
    console.log('🔄 Procesando operaciones pendientes...');
    // Aquí podrías procesar mensajes pendientes, etc.
  }

  // 🆕 MEJORA: Agregar mensaje en tiempo real optimizado
  private agregarMensajeEnTiempoReal(mensaje: MensajeSocket): void {
    const mensajesActuales = this.mensajesSubject.value;
    
    // 🆕 MEJORA: Verificar duplicados de forma más eficiente
    const mensajeDuplicado = mensajesActuales.find(m => 
      m.id_mensaje === mensaje.id_mensaje || 
      (m.fecha === mensaje.fecha && m.id_remitente === mensaje.id_remitente && m.contenido === mensaje.contenido)
    );

    if (!mensajeDuplicado) {
      const nuevosMensajes = [...mensajesActuales, mensaje];
      this.mensajesSubject.next(nuevosMensajes);
      console.log('✅ Mensaje agregado en tiempo real. Total:', nuevosMensajes.length);
    } else {
      console.log('⚠️ Mensaje duplicado ignorado:', mensaje.id_mensaje);
    }
  }

  // 🆕 MEJORA: Actualizar cache de mensajes
  private updateMessageCache(mensaje: MensajeSocket): void {
    const chatId = mensaje.id_chat;
    if (this.messagesCache.has(chatId)) {
      const cachedMessages = this.messagesCache.get(chatId)!;
      
      // Evitar duplicados en cache
      if (!cachedMessages.find(m => m.id_mensaje === mensaje.id_mensaje)) {
        cachedMessages.push(mensaje as Mensaje);
        this.cacheTimestamp.set(chatId, Date.now());
        console.log('💾 Cache actualizado para chat:', chatId);
      }
    }
  }

  // 🆕 MEJORA: Unirse a un chat con verificación
  unirseAlChat(id_chat: number): void {
    if (!id_chat || isNaN(id_chat)) {
      console.error('❌ ID de chat inválido para unirse:', id_chat);
      return;
    }

    console.log(`💬 Solicitando unirse al chat ${id_chat}`);
    this.websocketService.joinChat(id_chat);
  }

  // 🆕 MEJORA: Salir de un chat optimizado
  salirDelChat(id_chat: number): void {
    if (!id_chat || isNaN(id_chat)) {
      console.error('❌ ID de chat inválido para salir:', id_chat);
      return;
    }

    console.log(`🚪 Saliendo del chat ${id_chat}`);
    this.websocketService.leaveChat(id_chat);
    
    // 🆕 MEJORA: Limpiar cache específico
    this.limpiarCacheChat(id_chat);
  }

  // 🆕 MEJORA: Enviar mensaje con WebSocket optimizado
  enviarMensajeTiempoReal(mensaje: any): void {
    if (!this.validarMensajeParaEnvio(mensaje)) {
      return;
    }

    console.log('📤 Enviando mensaje por WebSocket:', {
      id_chat: mensaje.id_chat,
      id_remitente: mensaje.id_remitente,
      tieneArchivo: !!mensaje.archivo
    });

    this.websocketService.sendMessage(mensaje);
  }

  
  // 🆕 MEJORA: Validación completa de mensaje
  private validarMensajeParaEnvio(mensaje: any): boolean {
    if (!mensaje?.id_chat || !mensaje?.id_remitente) {
      console.error('❌ Datos de mensaje incompletos:', mensaje);
      this.notificacionesSubject.next({
        type: 'error',
        message: 'Datos de mensaje incompletos',
        timestamp: new Date()
      });
      return false;
    }

    if (!mensaje.contenido?.trim() && !mensaje.archivo) {
      console.error('❌ Mensaje vacío - debe tener contenido o archivo');
      this.notificacionesSubject.next({
        type: 'error',
        message: 'El mensaje no puede estar vacío',
        timestamp: new Date()
      });
      return false;
    }

    if (mensaje.contenido && mensaje.contenido.length > 4000) {
      console.error('❌ Mensaje demasiado largo');
      this.notificacionesSubject.next({
        type: 'error',
        message: 'El mensaje es demasiado largo (máximo 4000 caracteres)',
        timestamp: new Date()
      });
      return false;
    }

    return true;
  }

  // 🆕 MEJORA: Indicador "escribiendo..." optimizado
  empezarAEscribir(chatId: number, userId: number): void {
    if (!chatId || !userId) {
      console.error('❌ Datos inválidos para indicador de escritura');
      return;
    }

    this.websocketService.startTyping(chatId, userId);
  }

  dejarDeEscribir(chatId: number, userId: number): void {
    if (!chatId || !userId) {
      return;
    }

    this.websocketService.stopTyping(chatId, userId);
  }

  // 🆕 MEJORA: Escuchar indicador de escritura
  onUsuarioEscribiendo(): Observable<{ userId: number; isTyping: boolean }> {
    return this.websocketService.onUserTyping();
  }

  // 🟢 MÉTODOS HTTP TRADICIONALES - OPTIMIZADOS

  // 🆕 MEJORA: Manejo de errores centralizado mejorado
  private handleError(error: any) {
    console.error('❌ Error en ChatService:', error);
    
    let errorMessage = 'Error desconocido en el servicio de chat';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
          break;
        case 401:
          errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente.';
          // 🆕 MEJORA: Limpiar datos de sesión
          this.cleanupOnAuthError();
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
          break;
        default:
          errorMessage = error.error?.message || error.message || `Error ${error.status}`;
      }
    }
    
    console.error('💥 Mensaje de error procesado:', errorMessage);
    
    // 🆕 MEJORA: Emitir notificación de error
    this.notificacionesSubject.next({
      type: 'error',
      message: errorMessage,
      timestamp: new Date(),
      originalError: error
    });
    
    return throwError(() => new Error(errorMessage));
  }

  // 🆕 MEJORA: Limpieza en error de autenticación
  private cleanupOnAuthError(): void {
    console.warn('🔐 Limpiando datos por error de autenticación...');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.mensajesSubject.next([]);
    this.messagesCache.clear();
    this.cacheTimestamp.clear();
  }

  // 🆕 MEJORA: Obtener cursos del estudiante con cache
  obtenerCursosEstudiante(id_estudiante: number): Observable<any> {
    console.log('📞 Llamando a obtenerCursosEstudiante con ID:', id_estudiante);

    if (!id_estudiante || isNaN(id_estudiante)) {
      const error = new Error('ID de estudiante inválido');
      return throwError(() => error);
    }

    const cacheKey = `cursos_${id_estudiante}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      console.log('💾 Usando cursos en cache');
      return of(cached);
    }

    return this.http.get(`${this.apiUrl}/estudiante/${id_estudiante}/cursos`).pipe(
      tap(response => this.setCachedData(cacheKey, response, 10 * 60 * 1000)), // 10 minutos
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Cache genérico
  private getCachedData(key: string): any {
    const cached = localStorage.getItem(`chat_cache_${key}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() < data.expiry) {
          return data.value;
        }
      } catch (e) {
        console.warn('⚠️ Error leyendo cache:', e);
      }
    }
    return null;
  }

  private setCachedData(key: string, value: any, duration: number): void {
    try {
      const data = {
        value: value,
        expiry: Date.now() + duration
      };
      localStorage.setItem(`chat_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('⚠️ Error guardando en cache:', e);
    }
  }

  // 🆕 MEJORA: Obtener alumnos del docente optimizado
  obtenerAlumnosDocente(id_docente: number, forceRefresh: boolean = false): Observable<any> {
    console.log('📞 Llamando a obtenerAlumnosDocente con ID:', id_docente);
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }

    const cacheKey = `alumnos_${id_docente}`;
    
    if (!forceRefresh) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log('💾 Usando alumnos en cache');
        return of(cached);
      }
    }

    return this.http.get(`${this.apiUrl}/docente/${id_docente}/alumnos`).pipe(
      tap(response => this.setCachedData(cacheKey, response, 5 * 60 * 1000)), // 5 minutos
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener secciones con cache
  obtenerSeccionesDocente(id_docente: number): Observable<any> {
    console.log('📞 Llamando a obtenerSeccionesDocente con ID:', id_docente);
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }

    const cacheKey = `secciones_${id_docente}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      console.log('💾 Usando secciones en cache');
      return of(cached);
    }

    return this.http.get(`${this.apiUrl}/docente/${id_docente}/secciones`).pipe(
      tap(response => this.setCachedData(cacheKey, response, 10 * 60 * 1000)), // 10 minutos
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener docentes para chat optimizado
  obtenerDocentesParaChat(id_estudiante: number): Observable<any> {
    console.log('📞 Llamando a obtenerDocentesParaChat con ID:', id_estudiante);
    
    if (!id_estudiante || isNaN(id_estudiante)) {
      const error = new Error('ID de estudiante inválido');
      return throwError(() => error);
    }

    const cacheKey = `docentes_chat_${id_estudiante}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      console.log('💾 Usando docentes en cache');
      return of(cached);
    }

    return this.http.get(`${this.apiUrl}/estudiante/${id_estudiante}/docentes`).pipe(
      tap(response => this.setCachedData(cacheKey, response, 2 * 60 * 1000)), // 2 minutos
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener alumnos filtrados por sección
  obtenerAlumnosPorSeccion(id_docente: number, id_seccion: number): Observable<any> {
    console.log('📞 Llamando a obtenerAlumnosPorSeccion:', { id_docente, id_seccion });
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }
    
    let params = new HttpParams();
    if (id_seccion) {
      params = params.set('id_seccion', id_seccion.toString());
    }
    
    return this.http.get(`${this.apiUrl}/docente/${id_docente}/alumnos`, { params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener mensajes con cache inteligente
  obtenerMensajes(id_chat: number, pagina: number = 1, limite: number = 50, forceRefresh: boolean = false): Observable<any> {
    console.log('📞 Llamando a obtenerMensajes:', { id_chat, pagina, limite, forceRefresh });
    
    if (!id_chat || isNaN(id_chat)) {
      const error = new Error('ID de chat inválido');
      return throwError(() => error);
    }

    // 🆕 MEJORA: Verificar cache primero (solo para primera página)
    if (!forceRefresh && pagina === 1 && this.isCacheValid(id_chat)) {
      const cachedMessages = this.messagesCache.get(id_chat);
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('💾 Usando mensajes en cache para chat', id_chat);
        return of({
          data: cachedMessages,
          paginacion: {
            paginaActual: 1,
            porPagina: cachedMessages.length,
            totalMensajes: cachedMessages.length,
            tieneMas: false
          }
        });
      }
    }

    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());
    
    return this.http.get(`${this.apiUrl}/mensajes/${id_chat}`, { params }).pipe(
      tap((response: any) => {
        // 🆕 MEJORA: Actualizar cache solo para primera página
        if (pagina === 1 && response.data && Array.isArray(response.data)) {
          this.messagesCache.set(id_chat, response.data);
          this.cacheTimestamp.set(id_chat, Date.now());
          console.log('💾 Mensajes guardados en cache para chat:', id_chat);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Verificar validez del cache
  private isCacheValid(chatId: number): boolean {
    const timestamp = this.cacheTimestamp.get(chatId);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.CACHE_DURATION;
  }

 // 🟢 MODIFICAR enviarMensaje para evitar doble envío
// 🟢 CORREGIR: Método enviarMensaje para evitar doble envío
enviarMensaje(mensaje: any, usarWebSocket: boolean = true): Observable<any> | void {
  console.log('📤 Enviando mensaje:', { 
    id_chat: mensaje.id_chat, 
    usarWebSocket,
    tieneArchivo: !!mensaje.archivo 
  });
  
  // Validaciones antes de enviar
  if (!this.validarMensajeParaEnvio(mensaje)) {
    const error = new Error('Validación de mensaje falló');
    return throwError(() => error);
  }

  // 🟢 CORRECCIÓN DEFINITIVA: SOLO UN MÉTODO DE ENVÍO
  if (usarWebSocket && this.websocketService.isConnected()) {
    console.log('📤 Enviando exclusivamente por WebSocket');
    this.enviarMensajeTiempoReal(mensaje);
    return; // No retorna Observable cuando usa WebSocket
  } else {
    // 🟢 SOLO HTTP si WebSocket no está disponible
    console.log('🔄 Usando HTTP (WebSocket no disponible)');
    
    if (mensaje.archivo) {
      return this.enviarMensajeConArchivo(mensaje, mensaje.archivo);
    } else {
      return this.http.post(`${this.apiUrl}/enviar`, mensaje).pipe(
        catchError(this.handleError.bind(this))
      );
    }
  }
}



  // 🆕 MEJORA: Enviar mensaje con archivo optimizado
  enviarMensajeConArchivo(mensaje: any, archivo: File): Observable<any> {
    console.log('📎 Enviando mensaje con archivo:', archivo.name);
    
    const formData = new FormData();
    formData.append('contenido', mensaje.contenido || '');
    formData.append('id_chat', mensaje.id_chat.toString());
    formData.append('id_remitente', mensaje.id_remitente.toString());
    formData.append('archivo', archivo);

    return this.http.post(`${this.apiUrl}/enviar`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      tap(event => {
        // 🆕 MEJORA: Emitir progreso de upload
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          this.uploadProgressSubject.next({
            chatId: mensaje.id_chat,
            progress: progress
          });
          console.log(`📤 Progreso de upload: ${progress}%`);
        }
        
        if (event.type === HttpEventType.Response) {
          // 🆕 MEJORA: Limpiar progreso al completar
          this.uploadProgressSubject.next(null);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Crear chat optimizado
  crearChat(data: any): Observable<any> {
    console.log('📞 Llamando a crearChat con datos:', { 
      id_docente: data.id_docente, 
      id_estudiante: data.id_estudiante 
    });
    
    if (!data.id_docente || !data.id_estudiante) {
      console.error('❌ Datos incompletos para crear chat:', data);
      const error = new Error('Datos incompletos: se requiere id_docente e id_estudiante');
      return throwError(() => error);
    }

    const chatData = {
      id_docente: data.id_docente,
      id_estudiante: data.id_estudiante,
      id_curso: data.id_curso || null,
      id_seccion: data.id_seccion || null
    };

    console.log('📤 Enviando datos de chat al backend:', chatData);
    
    return this.http.post(`${this.apiUrl}/crear`, chatData).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Health check completo
  healthCheck(): Observable<any> {
    console.log('📞 Llamando a healthCheck');
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Crear chat entre estudiantes optimizado
  crearChatEntreEstudiantes(data: {
    id_estudiante1: number;
    id_estudiante2: number;
    id_curso?: number;
    id_seccion?: number;
  }): Observable<any> {
    console.log('📞 Llamando a crearChatEntreEstudiantes con datos:', data);
    
    if (!data.id_estudiante1 || !data.id_estudiante2) {
      console.error('❌ Datos incompletos para crear chat entre estudiantes:', data);
      const error = new Error('Datos incompletos: se requiere id_estudiante1 e id_estudiante2');
      return throwError(() => error);
    }

    const chatData = {
      id_estudiante1: data.id_estudiante1,
      id_estudiante2: data.id_estudiante2,
      id_curso: data.id_curso || null,
      id_seccion: data.id_seccion || null
    };

    console.log('📤 Enviando datos de chat entre estudiantes al backend:', chatData);
    
    return this.http.post(`${this.apiUrl}/estudiantes/crear`, chatData).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener compañeros de curso con cache
  obtenerCompanerosCurso(id_estudiante: number, id_curso: number): Observable<any> {
    console.log('📞 Llamando a obtenerCompanerosCurso:', { id_estudiante, id_curso });

    if (!id_estudiante || !id_curso || isNaN(id_estudiante) || isNaN(id_curso)) {
      const error = new Error('IDs de estudiante o curso inválidos');
      return throwError(() => error);
    }

    const cacheKey = `companeros_${id_estudiante}_${id_curso}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      console.log('💾 Usando compañeros en cache');
      return of(cached);
    }

    return this.http.get(`${this.apiUrl}/estudiante/${id_estudiante}/curso/${id_curso}/companeros`).pipe(
      tap(response => this.setCachedData(cacheKey, response, 5 * 60 * 1000)), // 5 minutos
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener chat entre usuarios
  obtenerChatEntreUsuarios(id_usuario1: number, id_usuario2: number): Observable<any> {
    console.log('📞 Llamando a obtenerChatEntreUsuarios:', { id_usuario1, id_usuario2 });
    
    if (!id_usuario1 || !id_usuario2 || isNaN(id_usuario1) || isNaN(id_usuario2)) {
      const error = new Error('IDs de usuario inválidos');
      return throwError(() => error);
    }
    
    return this.http.get(`${this.apiUrl}/usuarios/${id_usuario1}/${id_usuario2}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Obtener chats del docente optimizado
  obtenerChatsDocente(id_docente: number): Observable<any> {
    console.log('📞 Llamando a obtenerChatsDocente:', id_docente);
    
    if (!id_docente || isNaN(id_docente)) {
      const error = new Error('ID de docente inválido');
      return throwError(() => error);
    }

    const cacheKey = `chats_docente_${id_docente}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      console.log('💾 Usando chats en cache');
      return of(cached);
    }

    return this.http.get(`${this.apiUrl}/docente/${id_docente}`).pipe(
      tap(response => this.setCachedData(cacheKey, response, 2 * 60 * 1000)), // 2 minutos
      catchError(this.handleError.bind(this))
    );
  }

  // 🆕 MEJORA: Verificar conexión completa
  verificarConexion(): Observable<ChatHealth> {
    return new Observable(observer => {
      this.healthCheck().subscribe({
        next: (response) => {
          console.log('✅ Conexión con backend exitosa');
          const health: ChatHealth = {
            backend: true,
            websocket: this.websocketService.isConnected(),
            details: {
              backendResponse: response,
              websocketState: this.websocketService.getConnectionState()
            }
          };
          observer.next(health);
          observer.complete();
        },
        error: (error) => {
          console.error('❌ Error de conexión con backend:', error);
          const health: ChatHealth = {
            backend: false,
            websocket: this.websocketService.isConnected(),
            details: {
              backendError: error,
              websocketState: this.websocketService.getConnectionState()
            }
          };
          observer.next(health);
          observer.complete();
        }
      });
    });
  }

  // 🆕 MEJORA: Limpiar mensajes específicos
  limpiarMensajes(): void {
    console.log('🗑️ Limpiando todos los mensajes del subject');
    this.mensajesSubject.next([]);
  }

  // 🆕 MEJORA: Limpiar cache específico
  limpiarCacheChat(id_chat: number): void {
    this.messagesCache.delete(id_chat);
    this.cacheTimestamp.delete(id_chat);
    console.log('🗑️ Cache limpiado para chat:', id_chat);
  }

  // 🆕 MEJORA: Limpiar toda la cache
  limpiarCacheCompleta(): void {
    this.messagesCache.clear();
    this.cacheTimestamp.clear();
    
    // Limpiar cache de localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith('chat_cache_'))
      .forEach(key => localStorage.removeItem(key));
    
    console.log('🗑️ Cache completa limpiada');
  }

  // 🆕 MEJORA: Obtener mensajes actuales
  obtenerMensajesActuales(): MensajeSocket[] {
    return this.mensajesSubject.value;
  }

  // 🆕 MEJORA: Verificar conexión WebSocket
  isWebSocketConnected(): boolean {
    return this.websocketService.isConnected();
  }
  

  // 🆕 MEJORA: Obtener estado de conexión
  getConnectionState(): ConnectionState {
    return this.websocketService.getConnectionState();
  }

  // 🆕 MEJORA: Forzar reconexión WebSocket
  reconectarWebSocket(): void {
    console.log('🔄 Forzando reconexión WebSocket desde ChatService...');
    this.websocketService.reconnect();
  }

  ngOnDestroy(): void {
    console.log('🔚 Destruyendo ChatService...');
    this.wsSubscriptions.unsubscribe();
    this.uploadProgressSubject.next(null);
    
    // 🆕 MEJORA: Limpiar recursos
    this.limpiarMensajes();
    console.log('✅ ChatService destruido correctamente');
  }
}