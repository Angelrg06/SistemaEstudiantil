// chat.service.ts - VERSIÓN COMPLETA OPTIMIZADA
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType } from '@angular/common/http';
import { Observable, catchError, throwError, BehaviorSubject, Subscription, of, tap, filter, map } from 'rxjs';
import { WebsocketService, MensajeSocket, ConnectionState } from './websocket.service';
import { AuthService } from './auth.service'; // 🟢 IMPORTAR AuthService



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
    tamano?: number;
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

  // 🟢 NUEVO: Control de mensajes pendientes
  private mensajesPendientes = new Map<number, MensajeSocket>();
  private mensajesConfirmados = new Set<number>();

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
    private websocketService: WebsocketService,
    private authService: AuthService 
  ) {
    console.log('🔧 ChatService inicializado - Versión Optimizada');
    this.initializeWebSocket();
  }

  // chat.service.ts - AGREGAR este método en la clase ChatService

// 🟢 AGREGAR: Método para obtener nombre de archivo desde URL
private obtenerNombreArchivoDesdeUrl(url: any): string {
  if (!url) return 'archivo';
  
  try {
    // 🟢 CORRECCIÓN: Manejar tanto string como objeto
    const urlString = typeof url === 'string' ? url : 
                     (typeof url === 'object' && url.url ? url.url : '');
    
    if (!urlString) return 'archivo';
    
    // Intentar como URL válida
    try {
      const urlObj = new URL(urlString);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'archivo';
    } catch {
      // Si no es URL válida, intentar extraer de la cadena
      const segments = urlString.split('/');
      const fileName = segments.pop() || 'archivo';
      
      // Limpiar parámetros de query si existen
      return fileName.split('?')[0] || 'archivo';
    }
  } catch (error) {
    console.warn('⚠️ Error obteniendo nombre de archivo:', error);
    return 'archivo';
  }
}

  // 🆕 MEJORA: Inicialización optimizada del WebSocket
// chat.service.ts - CORREGIR inicialización

// 🟢 CORREGIR: Inicialización mejorada del WebSocket
private initializeWebSocket(): void {
  console.log('🔄 Inicializando WebSocket en ChatService...');

  // Suscribirse al estado de conexión inmediatamente
  this.wsSubscriptions.add(
    this.websocketService.onConnectionState().subscribe({
      next: (state: ConnectionState) => {
        console.log('📡 Estado conexión WebSocket:', state.status);
        this.connectionState.next(state);
        
        if (state.status === 'disconnected') {
          // Intentar reconexión automática
          setTimeout(() => {
            if (!this.websocketService.isConnected()) {
              console.log('🔄 Intentando reconexión automática...');
              this.websocketService.connect();
            }
          }, 3000);
        }
      },
      error: (error) => {
        console.error('❌ Error en listener de conexión:', error);
      }
    })
  );

  // Configurar listeners inmediatamente
  this.setupWebSocketListeners();

  // Forzar conexión inicial
  setTimeout(() => {
    if (!this.websocketService.isConnected()) {
      console.log('🔌 Iniciando conexión WebSocket inicial...');
      this.websocketService.connect();
    }
  }, 1000);
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

  

// 🟢 CORREGIR: Método para procesar mensajes entrantes con archivos
// 🟢 CORRECCIÓN ESPECÍFICA: Método para procesar mensajes entrantes
private agregarMensajeEnTiempoReal(mensaje: MensajeSocket): void {
  console.log('📥 Procesando mensaje en tiempo real:', {
    id: mensaje.id_mensaje,
    chat: mensaje.id_chat,
    remitente: mensaje.id_remitente,
    tieneArchivo: !!mensaje.archivo,
    esPropio: mensaje.id_remitente === this.currentUser?.id_usuario
  });

  // 🟢 SOLUCIÓN: Solo ignorar mensajes propios con archivo (ya se procesaron optimistamente)
  const esMensajePropio = mensaje.id_remitente === this.currentUser?.id_usuario;
  const tieneArchivo = !!mensaje.archivo;
  
  if (esMensajePropio && tieneArchivo) {
    console.log('🚫 Ignorando mensaje propio con archivo (ya procesado):', mensaje.id_mensaje);
    return;
  }

  // 🟢 Validar que el mensaje tenga contenido válido
  const contenidoValido = mensaje.contenido?.trim() || mensaje.archivo;
  if (!contenidoValido) {
    console.error('🚫 Mensaje vacío recibido, ignorando:', mensaje);
    return;
  }

  // 🟢 NORMALIZAR contenido
  const mensajeNormalizado: MensajeSocket = {
    ...mensaje,
    contenido: mensaje.contenido?.trim() || '📎 Archivo compartido',
    archivo: mensaje.archivo ? this.procesarArchivoMensaje(mensaje.archivo) : undefined
  };

  const mensajesActuales = this.mensajesSubject.value;
  
  // 🟢 PROTECCIÓN CONTRA DUPLICADOS
  const mensajeDuplicado = mensajesActuales.find(m => 
    m.id_mensaje === mensaje.id_mensaje || 
    (m.contenido === mensaje.contenido &&
     m.id_remitente === mensaje.id_remitente &&
     m.archivo?.nombre === mensaje.archivo?.nombre &&
     Math.abs(new Date(m.fecha).getTime() - new Date(mensaje.fecha).getTime()) < 2000)
  );

  if (mensajeDuplicado) {
    console.log('⚠️ Mensaje duplicado ignorado:', mensaje.id_mensaje);
    return;
  }

  const nuevosMensajes = [...mensajesActuales, mensajeNormalizado];
  nuevosMensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  
  this.mensajesSubject.next(nuevosMensajes);
  console.log('✅ Mensaje agregado. Total:', nuevosMensajes.length);
  
  this.updateMessageCache(mensajeNormalizado);
}

// 🟢 AGREGAR: Método para limpiar mensajes de un chat específico
limpiarMensajesChat(id_chat: number): void {
  const mensajesActuales = this.mensajesSubject.value;
  const mensajesFiltrados = mensajesActuales.filter(m => m.id_chat !== id_chat);
  
  this.mensajesSubject.next(mensajesFiltrados);
  console.log(`🗑️ Mensajes del chat ${id_chat} limpiados. Antes: ${mensajesActuales.length}, Después: ${mensajesFiltrados.length}`);
}

// 🟢 NUEVO: Procesar archivo de mensaje entrante
private procesarArchivoMensaje(archivoData: any): any {
  if (!archivoData) return null;

  // 🟢 CORRECCIÓN: Manejar diferentes estructuras de archivo
  return {
    url: archivoData.url || archivoData,
    ruta: archivoData.ruta || '',
    nombre: archivoData.nombre || this.obtenerNombreArchivoDesdeUrl(archivoData.url || archivoData),
    tipo: archivoData.tipo || this.obtenerTipoArchivo(archivoData.url || archivoData),
    tamano: archivoData.tamano || archivoData.tamano || null
  };
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
// chat.service.ts - REEMPLAZAR método obtenerMensajes
obtenerMensajes(id_chat: number, pagina: number = 1, limite: number = 50, forceRefresh: boolean = false): Observable<any> {
  console.log('📞 Llamando a obtenerMensajes:', { id_chat, pagina, limite, forceRefresh });
  
  if (!id_chat || isNaN(id_chat)) {
    const error = new Error('ID de chat inválido');
    return throwError(() => error);
  }

  if (forceRefresh) {
    this.limpiarCacheChat(id_chat);
  }

  let params = new HttpParams()
    .set('pagina', pagina.toString())
    .set('limite', limite.toString());
  
  return this.http.get(`${this.apiUrl}/mensajes/${id_chat}`, { params }).pipe(
    tap((response: any) => {
      // 🟢 CORRECCIÓN COMPLETA: Procesamiento seguro de archivos
      if (response.data && Array.isArray(response.data)) {
        const mensajesConArchivos = response.data.map((mensaje: any) => {
          return this.procesarMensajeConArchivo(mensaje);
        });

        if (pagina === 1) {
          this.messagesCache.set(id_chat, mensajesConArchivos);
          this.cacheTimestamp.set(id_chat, Date.now());
          console.log('💾 Mensajes procesados guardados en cache para chat:', id_chat);
        }

        response.data = mensajesConArchivos;
      }
    }),
    catchError(this.handleError.bind(this))
  );
}

// 🟢 AGREGAR: Método para procesar mensajes con archivos de forma segura
private procesarMensajeConArchivo(mensaje: any): any {
  let archivoProcesado = null;
  
  if (mensaje.archivo) {
    // 🟢 CORRECCIÓN: Manejar tanto string como objeto
    if (typeof mensaje.archivo === 'string') {
      archivoProcesado = {
        url: mensaje.archivo,
        ruta: mensaje.archivo_ruta || '',
        nombre: this.obtenerNombreArchivoDesdeUrl(mensaje.archivo),
        tipo: this.obtenerTipoArchivo(mensaje.archivo),
        tamano: null
      };
    } 
    else if (typeof mensaje.archivo === 'object') {
      archivoProcesado = {
        url: mensaje.archivo.url || mensaje.archivo,
        ruta: mensaje.archivo.ruta || mensaje.archivo_ruta || '',
        nombre: mensaje.archivo.nombre || this.obtenerNombreArchivoDesdeUrl(mensaje.archivo.url || mensaje.archivo),
        tipo: mensaje.archivo.tipo || this.obtenerTipoArchivo(mensaje.archivo.url || mensaje.archivo),
        tamano: mensaje.archivo.tamano || mensaje.archivo.tamano || null
      };
    }
  }

  return {
    ...mensaje,
    archivo: archivoProcesado
  };
}

// 🟢 CORREGIR: Lista ampliada de tipos de archivo permitidos
private esTipoArchivoPermitido(tipo: string): boolean {
  if (!tipo) return false;

  // 🟢 LISTA AMPLIADA de tipos MIME permitidos
  const tiposPermitidos = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/rtf',
    
    // Imágenes
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    
    // Archivos comprimidos
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // Otros
    'application/json',
    'text/csv',
    'application/xml'
  ];

  // 🟢 PERMITIR también por extensión como fallback
  const extensionesPermitidas = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
    'zip', 'rar', '7z', 'json', 'csv', 'xml'
  ];

  // Verificar por tipo MIME
  const porTipoMIME = tiposPermitidos.includes(tipo.toLowerCase());
  
  // Verificar por extensión (fallback)
  const extension = this.obtenerExtensionDeTipo(tipo);
  const porExtension = extensionesPermitidas.includes(extension.toLowerCase());

  const esPermitido = porTipoMIME || porExtension;
  
  if (!esPermitido) {
    console.warn('⚠️ Tipo de archivo no permitido:', {
      tipo: tipo,
      extension: extension,
      porTipoMIME: porTipoMIME,
      porExtension: porExtension
    });
  }

  return esPermitido;
}

// 🟢 AGREGAR: Método auxiliar para obtener extensión
private obtenerExtensionDeTipo(tipo: string): string {
  const partes = tipo.split('/');
  if (partes.length > 1) {
    return partes[1].toLowerCase();
  }
  return tipo.toLowerCase();
}

// chat.service.ts - CORREGIR método obtenerTipoArchivo
private obtenerTipoArchivo(url: string): string {
  if (!url) return 'application/octet-stream';
  
  try {
    // 🟢 CORRECCIÓN: Manejar tanto URLs como objetos
    const urlString = typeof url === 'string' ? url : '';
    const extension = urlString.split('.').pop()?.toLowerCase();
    
    if (!extension) return 'application/octet-stream';
    
    const tipos: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    };
    
    return tipos[extension] || 'application/octet-stream';
  } catch (error) {
    console.warn('⚠️ Error obteniendo tipo de archivo:', error);
    return 'application/octet-stream';
  }
}
// chat.service.ts - AGREGAR MÉTODO ALTERNATIVO

// 🟢 NUEVO: Método alternativo para mantener compatibilidad con el código existente
enviarMensajeConOpciones(mensajeData: any, opciones?: { usarWebSocket?: boolean; archivo?: File }): Observable<any> | void {
  if (opciones?.archivo) {
    return this.enviarMensaje(mensajeData, opciones.archivo);
  } else {
    return this.enviarMensaje(mensajeData);
  }
}

  // 🆕 MEJORA: Verificar validez del cache
  private isCacheValid(chatId: number): boolean {
    const timestamp = this.cacheTimestamp.get(chatId);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.CACHE_DURATION;
  }


// 🟢 NUEVO: Descargar archivo de mensaje
// 🟢 CORREGIDO: Método descargarArchivo con tipado adecuado
descargarArchivo(rutaArchivo: string): Observable<{ downloadUrl: string }> {
  console.log('📥 Solicitando descarga de archivo:', rutaArchivo);
  
  if (!rutaArchivo) {
    return throwError(() => new Error('Ruta de archivo no proporcionada'));
  }

  return this.http.get<{ 
    success: boolean;
    data: { downloadUrl: string; expiresAt: string };
    message?: string;
    timestamp: string;
  }>(`${this.apiUrl}/archivo/${encodeURIComponent(rutaArchivo)}`).pipe(
    // 🟢 CORRECCIÓN: Mapear la respuesta para extraer solo los datos necesarios
    map((response: any) => {
      if (response.success && response.data) {
        return {
          downloadUrl: response.data.downloadUrl
        };
      } else {
        throw new Error(response.message || 'Error al obtener URL de descarga');
      }
    }),
    catchError(this.handleError.bind(this))
  );
}




// 🟢 CORREGIR: Getter currentUser
private get currentUser(): any {
  try {
    // Obtener usuario del authService de forma segura
    return this.authService?.getCurrentUser?.() || null;
  } catch (error) {
    console.warn('⚠️ Error obteniendo currentUser:', error);
    return null;
  }
}


// chat.service.ts - MODIFICAR el método enviarMensajeConArchivo

enviarMensajeConArchivo(mensajeData: any, archivo: File): Observable<any> {
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 🟢 Aumentar a 25MB
  
  console.log('📎 Validando archivo:', {
    nombre: archivo.name,
    tipo: archivo.type,
    tamano: archivo.size,
    tamanoMB: (archivo.size / 1024 / 1024).toFixed(2) + 'MB'
  });

  // 🟢 VALIDAR TAMANO
  if (archivo.size > MAX_FILE_SIZE) {
    const errorMsg = `El archivo es demasiado grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    console.error('❌', errorMsg);
    return throwError(() => new Error(errorMsg));
  }

  // 🟢 VALIDAR TIPO CON MÉTODO MEJORADO
  if (!this.esTipoArchivoPermitido(archivo.type)) {
    // 🟢 INTENTAR por nombre de archivo como fallback
    const extension = archivo.name.split('.').pop()?.toLowerCase() || '';
    const extensionesPermitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 
                                  'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'];
    
    if (!extensionesPermitidas.includes(extension)) {
      const errorMsg = `Tipo de archivo no permitido: ${archivo.type}. Formatos permitidos: PDF, Word, Excel, PowerPoint, imágenes, ZIP, RAR`;
      console.error('❌', errorMsg);
      return throwError(() => new Error(errorMsg));
    } else {
      console.log('✅ Archivo permitido por extensión:', extension);
    }
  }

  console.log('📎 Archivo validado correctamente, procediendo con envío...');

  // ... resto del método sin cambios
  const formData = new FormData();
  formData.append('contenido', mensajeData.contenido || '📎 Archivo compartido');
  formData.append('id_chat', mensajeData.id_chat.toString());
  formData.append('id_remitente', mensajeData.id_remitente.toString());
  formData.append('archivo', archivo, archivo.name);

  // 🟢 EMITIR estado de carga
  this.uploadProgressSubject.next({
    chatId: mensajeData.id_chat,
    progress: 0
  });

  return this.http.post(`${this.apiUrl}/enviar`, formData, {
    reportProgress: true,
    observe: 'events'
  }).pipe(
    tap(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        const progress = Math.round(100 * event.loaded / event.total);
        
        // 🆕 ACTUALIZAR progreso
        this.uploadProgressSubject.next({
          chatId: mensajeData.id_chat,
          progress: progress
        });
        
        this.websocketService.notificarEstadoArchivo(
          mensajeData.id_chat, 
          'subiendo', 
          progress,
          `temp-${Date.now()}`
        );
        
        console.log(`📤 Progreso de upload: ${progress}%`);
      }
      
      if (event.type === HttpEventType.Response) {
        this.uploadProgressSubject.next(null);
        
        // 🆕 EMITIR completado
        this.websocketService.notificarEstadoArchivo(
          mensajeData.id_chat, 
          'completado'
        );
        
        console.log('✅ Upload completado');
      }
    }),
    filter((event: any) => event.type === HttpEventType.Response),
    map((event: any) => {
      console.log('✅ Respuesta del servidor recibida:', event.body);
      return event.body;
    }),
    catchError((error) => {
      console.error('❌ Error en upload:', error);
      this.uploadProgressSubject.next(null);
      
      // 🆕 EMITIR error
      this.websocketService.notificarEstadoArchivo(
        mensajeData.id_chat, 
        'error'
      );
      
      return this.handleError(error);
    })
  );
}

// 🆕 AGREGAR: Método para crear mensaje de carga
crearMensajeCargando(chatId: number, usuario: any, archivo: File): MensajeSocket {
  const idTemporal = `cargando-${Date.now()}`;
  
  return {
    id_mensaje: -Date.now(), // ID negativo para identificar como temporal
    contenido: `Subiendo archivo: ${archivo.name}`,
    fecha: new Date().toISOString(),
    id_chat: chatId,
    id_remitente: usuario.id_usuario,
    remitente: {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      rol: usuario.rol
    },
    archivo: {
      url: '',
      ruta: 'cargando...',
      nombre: archivo.name,
      tipo: archivo.type,
      tamano: archivo.size
    },
    _estado: 'cargando',
    _idTemporal: idTemporal
  };
}

// 🆕 AGREGAR: Método para reemplazar mensaje de carga
reemplazarMensajeCargando(mensajes: MensajeSocket[], mensajeReal: MensajeSocket, idTemporal?: string): MensajeSocket[] {
  if (idTemporal) {
    // Buscar por ID temporal
    const index = mensajes.findIndex(m => m._idTemporal === idTemporal);
    if (index !== -1) {
      mensajes[index] = {
        ...mensajeReal,
        _estado: 'confirmado'
      };
    }
  } else {
    // Buscar por ID negativo (fallback)
    const index = mensajes.findIndex(m => m.id_mensaje < 0);
    if (index !== -1) {
      mensajes[index] = {
        ...mensajeReal,
        _estado: 'confirmado'
      };
    }
  }
  
  return mensajes;
}

// En chat.service.ts - AGREGAR esta propiedad

// 🆕 AGREGAR: Subject para estado de carga de archivos
private fileUploadSubject = new BehaviorSubject<{
  chatId: number, 
  estado: 'subiendo' | 'completado' | 'error', 
  progreso?: number, 
  idTemporal?: string
} | null>(null);
public fileUpload$ = this.fileUploadSubject.asObservable();

// 🆕 AGREGAR: Método para emitir estado de carga
notificarEstadoArchivo(chatId: number, estado: 'subiendo' | 'completado' | 'error', progreso?: number, idTemporal?: string): void {
  this.fileUploadSubject.next({
    chatId,
    estado,
    progreso,
    idTemporal
  });
}


// 🟢 CORREGIR COMPLETAMENTE: Método para enviar mensajes con archivos
// chat.service.ts - CORREGIR TYPO EN EL MÉTODO

// 🟢 CORRECCIÓN: Arreglar typo en el nombre del método
async enviarMensajeConArchivoWebSocket(mensajeData: any, archivo: File): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📤 Enviando archivo por WebSocket...');

      // 🟢 LEER ARCHIVO COMO ARRAY BUFFER
      const arrayBuffer = await this.leerArchivoComoBuffer(archivo);
      
      // 🟢 CORRECCIÓN: Convertir a Array normal (no Uint8Array)
      const bufferArray = Array.from(new Uint8Array(arrayBuffer));
      
      // 🟢 CORRECCIÓN: Estructura EXACTA que espera el backend
      const mensajeWebSocket = {
        id_chat: mensajeData.id_chat,
        contenido: mensajeData.contenido || `📎 ${archivo.name}`,
        id_remitente: mensajeData.id_remitente,
        archivo: {
          nombre: archivo.name,
          tipo: archivo.type,
          tamano: archivo.size
        },
        // 🟢 CRÍTICO: Esta es la clave - el buffer debe estar aquí
        archivoBuffer: bufferArray
      };

      console.log('📤 Enviando por WebSocket:', {
        nombre: archivo.name,
        tamano: archivo.size,
        bufferLength: bufferArray.length,
        tieneContenido: !!mensajeData.contenido
      });

      // 🟢 ENVIAR POR WEBSOCKET
      this.websocketService.sendMessage(mensajeWebSocket);
      resolve();

    } catch (error) {
      console.error('❌ Error preparando archivo para WebSocket:', error);
      reject(error);
    }
  });
}

// 🟢 MÉTODO AUXILIAR: Leer archivo como Buffer
private leerArchivoComoBuffer(archivo: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as ArrayBuffer);
      } else {
        reject(new Error('No se pudo leer el archivo'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    
    reader.readAsArrayBuffer(archivo);
  });
}

// 🟢 NUEVO: Método unificado para evitar duplicación
enviarMensajeUnificado(mensajeData: {
  id_chat: number;
  contenido: string;
  id_remitente: number;
}, archivo?: File): Observable<any> | void {
  
  console.log('🎯 ENVÍO UNIFICADO - Decidiendo método...', {
    tieneArchivo: !!archivo,
    websocketDisponible: this.isWebSocketConnected()
  });

  // 🟢 ESTRATEGIA: HTTP para archivos, WebSocket para texto
  if (archivo) {
    console.log('📎 Estrategia: HTTP para archivo');
    return this.enviarMensajeConArchivo(mensajeData, archivo);
  } else {
    if (this.isWebSocketConnected()) {
      console.log('📤 Estrategia: WebSocket para texto');
      this.enviarMensajeTiempoReal(mensajeData);
      return;
    } else {
      console.log('🔄 Estrategia: HTTP fallback para texto');
      return this.http.post(`${this.apiUrl}/enviar`, mensajeData).pipe(
        catchError(this.handleError.bind(this))
      );
    }
  }
}
// chat.service.ts - CORREGIR FIRMA DEL MÉTODO

// 🟢 CORRECCIÓN: Cambiar la firma para aceptar parámetros separados
// 🟢 MÉTODO PRINCIPAL CORREGIDO - USAR ESTE
enviarMensaje(mensajeData: {
  id_chat: number;
  contenido: string;
  id_remitente: number;
}, archivo?: File): Observable<{
  success: boolean;
  message: string;
  metodo: 'http' | 'websocket';
  data?: any;
}> {
  
  console.log('🎯 ENVÍO UNIFICADO INICIADO:', {
    chat: mensajeData.id_chat,
    remitente: mensajeData.id_remitente,
    tieneArchivo: !!archivo,
    contenidoLength: mensajeData.contenido?.length || 0
  });

  // 🟢 VALIDACIÓN
  if (!this.validarMensajeParaEnvio(mensajeData)) {
    return throwError(() => new Error('Validación de mensaje falló'));
  }

  return new Observable(subscriber => {
    // 🟢 ESTRATEGIA: HTTP para archivos, WebSocket para texto
    if (archivo) {
      console.log('📎 Estrategia: HTTP para archivo');
      
      this.enviarMensajeConArchivo(mensajeData, archivo).subscribe({
        next: (response: any) => {
          subscriber.next({
            success: true,
            message: 'Archivo enviado exitosamente',
            metodo: 'http',
            data: response
          });
          subscriber.complete();
        },
        error: (error: any) => {
          subscriber.error(error);
        }
      });
      
    } else {
      if (this.isWebSocketConnected()) {
        console.log('📤 Estrategia: WebSocket para texto');
        
        try {
          this.enviarMensajeTiempoReal(mensajeData);
          subscriber.next({
            success: true,
            message: 'Mensaje enviado por WebSocket',
            metodo: 'websocket'
          });
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
        
      } else {
        console.log('🔄 Estrategia: HTTP para texto (fallback)');
        
        this.http.post(`${this.apiUrl}/enviar`, mensajeData).pipe(
          catchError(this.handleError.bind(this))
        ).subscribe({
          next: (response: any) => {
            subscriber.next({
              success: true,
              message: 'Mensaje enviado por HTTP',
              metodo: 'http',
              data: response
            });
            subscriber.complete();
          },
          error: (error: any) => {
            subscriber.error(error);
          }
        });
      }
    }
  });
}

// 🟢 NUEVO MÉTODO: Obtener URL de descarga de archivo
obtenerUrlDescargaArchivo(rutaArchivo: string): Observable<{ url: string }> {
  console.log('📥 Solicitando URL de descarga para:', rutaArchivo);
  
  if (!rutaArchivo) {
    return throwError(() => new Error('Ruta de archivo no proporcionada'));
  }

  return this.http.get<{ success: boolean; data: { url: string } }>(
    `${this.apiUrl}/archivo/url/${encodeURIComponent(rutaArchivo)}`
  ).pipe(
    map(response => {
      if (response.success && response.data) {
        return { url: response.data.url };
      } else {
        throw new Error('Error al obtener URL de descarga');
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
// 🟢 NUEVO: Servicio de mensajería unificado (puedes agregarlo a chat.service.ts)
export class MensajeriaUnificadaService {
  
  constructor(
    private chatService: ChatService,
    private websocketService: WebsocketService
  ) {}

  // 🟢 MÉTODO PRINCIPAL: Envío seguro sin duplicados
  async enviarMensajeSeguro(mensajeData: {
    id_chat: number;
    contenido: string;
    id_remitente: number;
  }, archivo?: File): Promise<any> {
    
    console.log('🛡️ ENVÍO SEGURO INICIADO:', {
      chat: mensajeData.id_chat,
      remitente: mensajeData.id_remitente,
      tieneArchivo: !!archivo
    });

    // 🟢 ESTRATEGIA DEFINITIVA:
    // - Archivos: SIEMPRE por HTTP
    // - Texto: WebSocket si disponible, si no HTTP
    
    if (archivo) {
      console.log('📎 Estrategia: HTTP para archivo');
      return new Promise((resolve, reject) => {
        this.chatService.enviarMensajeConArchivo(mensajeData, archivo).subscribe({
          next: (response) => resolve(response),
          error: (error) => reject(error)
        });
      });
    } else {
      if (this.websocketService.isConnected()) {
        console.log('📤 Estrategia: WebSocket para texto');
        this.chatService.enviarMensajeTiempoReal(mensajeData);
        return Promise.resolve({ 
          success: true, 
          message: 'Enviado por WebSocket',
          metodo: 'websocket'
        });
      } else {
        console.log('🔄 Estrategia: HTTP para texto (fallback)');
        return new Promise((resolve, reject) => {
          this.chatService.enviarMensaje(mensajeData).subscribe({
            next: (response) => resolve(response),
            error: (error) => reject(error)
          });
        });
      }
    }
  }
}