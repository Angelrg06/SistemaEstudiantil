import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription, debounceTime, distinctUntilChanged, Subject, map, filter } from 'rxjs';

interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
}

interface Chat {
  id_chat: number;
  usuario: Usuario;
  curso: string | null;
  seccion: string | null;
  ultimo_mensaje: string | null;
  fecha_ultimo_mensaje: string | null;
}

interface Alumno {
  id_usuario: number;
  id_estudiante: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  secciones: string[];
  cursos: string[];
  tieneChat: boolean;
  chatExistente: {
    id_chat: number;
    curso: string | null;
    seccion: string | null;
    ultimo_mensaje: string | null;
    fecha_ultimo_mensaje: string | null;
    iniciadoPorAlumno: boolean;
    totalMensajes?: number;
  } | null;
}

interface Mensaje {
  id_mensaje: number;
  contenido: string;
  fecha: string;
  id_chat: number;
  id_remitente: number;
  remitente?: {
    id_usuario: number;
    correo: string;
    rol: string;
  };
   // 🆕 AGREGAR SOPORTE PARA ARCHIVOS
  archivo?: {
    url: string;
    ruta: string;
    nombre: string;
    tipo: string;
    tamano?: number;
  } | null;
}

interface Seccion {
  id_seccion: number;
  nombre: string;
  curso?: string;
  id_curso?: number;
  _count?: {
    estudiantes: number;
  };
}

// 🆕 AGREGAR estas interfaces
interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError?: string;
  reconnectAttempts: number;
}

interface UploadProgress {
  chatId: number;
  progress: number;
}

interface PaginacionMensajes {
  paginaActual: number;
  porPagina: number;
  totalMensajes: number;
  totalPaginas: number;
  tieneMas: boolean;
}

interface MensajeSocket {
  id_mensaje: number;
  contenido: string;
  fecha: string;
  id_chat: number;
  id_remitente: number;
  remitente?: {
    id_usuario: number;
    correo: string;
    rol: string;
  };
  archivo?: {
    url: string;
    ruta: string;
    nombre: string;
    tipo: string;
    tamano?: number; // Hacer opcional
  } | null;
}

@Component({
  selector: 'app-docente-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docente-chat.html',
  styles: [`
  .animate-message-in {
    animation: messageIn 0.3s ease-out;
  }
  
  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .word-wrap-break {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* 🆕 ESTILOS SIMPLES PARA INDICADOR DE CONEXIÓN */
  .connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid;
  }
  
  .status-disconnected {
    background-color: #fefce8;
    color: #854d0e;
    border-color: #fef08a;
  }
  
  .status-connecting {
    background-color: #eff6ff;
    color: #1e40af;
    border-color: #dbeafe;
  }
  
  .status-error {
    background-color: #fef2f2;
    color: #991b1b;
    border-color: #fecaca;
  }

  /* 🆕 ESTILOS PARA BARRA DE PROGRESO */
  .progress-bar {
    width: 100%;
    background-color: #e5e7eb;
    border-radius: 9999px;
    height: 8px;
  }
  
  .progress-fill {
    height: 8px;
    border-radius: 9999px;
    transition: all 0.3s ease;
  }
`]
})
export class DocenteChat implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  @Input() seccionesDesdePadre: Seccion[] = [];
  @Output() seccionesActualizadas = new EventEmitter<Seccion[]>();

  // Datos principales
  alumnos: Alumno[] = [];

  
  mensajes: Mensaje[] = [];
  chatSeleccionado: Chat | null = null;
  nuevoMensaje: string = '';

  // Sistema de secciones y filtros
  secciones: Seccion[] = [];
  seccionSeleccionada: Seccion | null = null;
  mostrarSelectorSecciones: boolean = false;

  // Estados de carga
  cargandoAlumnos: boolean = false;
  cargandoMensajes: boolean = false;
  cargandoMasMensajes: boolean = false;
  enviandoMensaje: boolean = false;
  errorAlumnos: string = '';

    // 🟢 AGREGAR: Nuevas propiedades para control de envío
  private ultimoMensajeEnviado: string = '';
  private ultimoEnvioTimestamp: number = 0;

  // Usuario actual
  currentUser: any = null;

  // Búsqueda y filtros
  terminoBusqueda: string = '';
  alumnosFiltrados: Alumno[] = [];
  pestanaActiva: 'misAlumnos' | 'alumnosChat' = 'misAlumnos';
  private searchSubject = new Subject<string>();
  connectionState: ConnectionState = { status: 'disconnected', reconnectAttempts: 0 };
  uploadProgreso: number = 0;
  private connectionCheckTimer: any;
  private mensajesCache = new Map<number, Mensaje[]>();

  // Control responsive
  isMobile: boolean = false;

  // Control de scroll y paginación
  private autoScrollEnabled: boolean = true;
  private isNearTop: boolean = false;
  paginacionMensajes: PaginacionMensajes | null = null;

  // Subscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef
  ) {}

ngOnInit(): void {
  this.obtenerUsuarioActual();
  this.checkScreenSize();
  this.setupSearchDebounce();
  this.setupGlobalListeners();
  this.startConnectionMonitoring(); // 🆕 AGREGAR esta línea
  this.inicializarWebSocket();
  
  // 🆕 AGREGAR esta suscripción para upload progress
  this.subscriptions.add(
    this.chatService.uploadProgress$.subscribe(progress => {
      if (progress && progress.chatId === this.chatSeleccionado?.id_chat) {
        this.uploadProgreso = progress.progress;
      } else if (!progress) {
        this.uploadProgreso = 0;
      }
    })
  );
}

ngOnDestroy(): void {
  if (this.connectionCheckTimer) {
    clearInterval(this.connectionCheckTimer);
  }
  
  if (this.chatSeleccionado) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
    this.chatService.limpiarCacheChat(this.chatSeleccionado.id_chat); // 🆕 AGREGAR esta línea
  }
  
  this.subscriptions.unsubscribe();
  this.searchSubject.complete();
  this.removeGlobalListeners();
}

  ngOnChanges(): void {
    if (this.seccionesDesdePadre && this.seccionesDesdePadre.length > 0) {
      console.log('📥 Secciones recibidas desde el padre:', this.seccionesDesdePadre.length);
      this.secciones = this.seccionesDesdePadre;
      
      if (!this.seccionSeleccionada && this.secciones.length > 0) {
        this.seccionSeleccionada = this.secciones[0];
        console.log('✅ Sección seleccionada automáticamente:', this.seccionSeleccionada.nombre);
      }
      
      this.filtrarAlumnos();
    }
  }

  @HostListener('window:resize')
  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
    this.cdRef.detectChanges();
  }

  private setupSearchDebounce(): void {
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.filtrarAlumnos();
      })
    );
  } 

// 🆕 En configurarWebSocketParaChat(), cambiar MensajeSocket por Mensaje
private configurarWebSocketParaChat(id_chat: number): void {
  console.log('💬 Configurando WebSocket para chat:', id_chat);

  // Salir del chat anterior si existe
  if (this.chatSeleccionado && this.chatSeleccionado.id_chat !== id_chat) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
  }

  // Unirse al nuevo chat
  this.chatService.unirseAlChat(id_chat);
  
  // 🟢 CORRECCIÓN: No limpiar mensajes aquí, solo unirse al chat
  console.log('✅ WebSocket configurado para chat:', id_chat);
}

  private setupGlobalListeners(): void {
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  private removeGlobalListeners(): void {
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === 'token' && !event.newValue) {
      this.handleLogout();
    }
  }

  // 🆕 En la clase componente, agregar este método:
tieneArchivo(msg: Mensaje): boolean {
  return !!(msg.archivo && msg.archivo.url && msg.archivo.nombre);
}

// 🆕 Obtener URL del archivo
obtenerUrlArchivo(msg: Mensaje): string | null {
  return msg.archivo?.url || null;
}

// 🆕 AGREGAR estos métodos para manejar archivos de forma segura
obtenerTamanoArchivoSeguro(msg: Mensaje): number {
  return msg.archivo?.tamano || 0;
}

// Método auxiliar para template
tieneTamanoArchivo(msg: Mensaje): boolean {
  return !!(msg.archivo && typeof msg.archivo.tamano === 'number');
}

// Método auxiliar para obtener tamaño seguro
obtenerTamanoArchivo(msg: Mensaje): number {
  return msg.archivo?.tamano || 0;
}

// 🆕 Obtener nombre del archivo
obtenerNombreArchivo(msg: Mensaje): string {
  return msg.archivo?.nombre || 'Archivo adjunto';
}

archivoSeleccionado: File | null = null;

// 🆕 MÉTODO: Manejar selección de archivo
// 🟢 CORREGIR: Manejo de selección de archivos mejorado
onFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.mostrarError('El archivo es demasiado grande. Máximo 10MB permitido.');
      event.target.value = ''; // Limpiar input
      return;
    }
    
    // Validar tipo de archivo
    const tiposPermitidos = [
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
    
    if (!tiposPermitidos.includes(file.type)) {
      this.mostrarError('Tipo de archivo no permitido.');
      event.target.value = ''; // Limpiar input
      return;
    }
    
    this.archivoSeleccionado = file;
    console.log('📎 Archivo seleccionado:', {
      nombre: file.name, 
      tamano: file.size, 
      tipo: file.type,
      esFile: file instanceof File
    });
  }
}

// 🆕 MÉTODO: Remover archivo seleccionado
removerArchivo(): void {
  this.archivoSeleccionado = null;
}

  private handleLogout(): void {
    this.chatSeleccionado = null;
    this.mensajes = [];
    this.alumnos = [];
    this.currentUser = null;
    this.errorAlumnos = 'Sesión expirada. Por favor, inicie sesión nuevamente.';
    this.cdRef.detectChanges();
  }

  obtenerUsuarioActual(): void {
    try {
      this.currentUser = this.authService.getCurrentUser();
      
      console.log('🔍 DEBUG - Usuario actual:', this.currentUser);
      
      if (!this.currentUser) {
        this.errorAlumnos = 'No hay usuario autenticado. Por favor, inicie sesión.';
        console.error('❌ No hay usuario actual');
        return;
      }

      let idDocente = this.currentUser.id_docente;
      
      if (!idDocente && this.currentUser.userData) {
        idDocente = this.currentUser.userData.id_docente;
      }
      if (!idDocente && this.currentUser.datos) {
        idDocente = this.currentUser.datos.id_docente;
      }
      if (!idDocente && this.currentUser.docente) {
        idDocente = this.currentUser.docente.id_docente;
      }

      if (!idDocente) {
        console.error('❌ No se encontró id_docente en:', this.currentUser);
        this.errorAlumnos = 'Error: No se pudo identificar el perfil de docente.';
        return;
      }

      this.currentUser.id_docente = idDocente;
      
      console.log('✅ ID Docente encontrado:', idDocente);

      if (this.seccionesDesdePadre.length === 0) {
        console.log('🔄 Cargando secciones desde el servicio...');
        this.cargarSecciones();
      } else {
        console.log('📥 Usando secciones del padre:', this.seccionesDesdePadre.length);
        this.cargarAlumnos();
      }
      
    } catch (error) {
      console.error('❌ Error al obtener usuario:', error);
      this.errorAlumnos = 'Error al cargar la información del usuario';
    }
  }

  private cargarSecciones(): void {
    if (!this.currentUser?.id_docente) {
      this.errorAlumnos = 'No se pudo identificar al docente';
      return;
    }

    console.log('🔄 Cargando secciones para docente ID:', this.currentUser.id_docente);

    this.subscriptions.add(
      this.chatService.obtenerSeccionesDocente(this.currentUser.id_docente)
        .subscribe({
          next: (response: any) => {
            console.log('📋 Respuesta de secciones:', response);
            
            let seccionesData = response;
            if (response && response.data) {
              seccionesData = response.data;
            }
            
            if (Array.isArray(seccionesData)) {
              this.secciones = seccionesData;
              this.seccionesActualizadas.emit(this.secciones);
              
              if (this.secciones.length > 0) {
                this.seccionSeleccionada = this.secciones[0];
                console.log('✅ Sección seleccionada:', this.seccionSeleccionada.nombre);
              } else {
                console.warn('⚠️ No se encontraron secciones para el docente');
                this.seccionSeleccionada = null;
                this.errorAlumnos = 'No tienes secciones asignadas.';
              }
            } else {
              console.error('❌ Formato de secciones inválido:', response);
              this.secciones = [];
              this.errorAlumnos = 'Error en el formato de secciones recibido.';
            }
            
            this.cargarAlumnos();
          },
          error: (error: any) => {
            console.error('❌ Error al cargar secciones:', error);
            this.secciones = [];
            this.seccionSeleccionada = null;
            this.errorAlumnos = this.obtenerMensajeError(error);
            this.cargarAlumnos();
          }
        })
    );
  }

  private cargarAlumnos(): void {
    if (!this.currentUser?.id_docente) {
      this.errorAlumnos = 'No se pudo identificar al docente';
      return;
    }

    this.cargandoAlumnos = true;
    this.errorAlumnos = '';

    console.log('🔄 Cargando alumnos para docente ID:', this.currentUser.id_docente);

    this.subscriptions.add(
      this.chatService.obtenerAlumnosDocente(this.currentUser.id_docente)
        .subscribe({
          next: (response: any) => {
            console.log('👥 Respuesta completa de alumnos:', response);
            
            let alumnosData = response;
            if (response && response.data) {
              alumnosData = response.data;
            }
            
            if (Array.isArray(alumnosData)) {
              this.alumnos = this.procesarAlumnosBackend(alumnosData);
              console.log(`✅ ${this.alumnos.length} alumnos procesados correctamente`);
            } else {
              console.error('❌ Formato de alumnos inválido:', response);
              this.alumnos = [];
              this.errorAlumnos = 'Error en el formato de alumnos recibido.';
            }
            
            this.filtrarAlumnos();
            this.cargandoAlumnos = false;
            this.cdRef.detectChanges();
          },
          error: (error: any) => {
            console.error('❌ Error al cargar alumnos:', error);
            this.errorAlumnos = this.obtenerMensajeError(error);
            this.cargandoAlumnos = false;
            this.cdRef.detectChanges();
          }
        })
    );
  }

  private procesarAlumnosBackend(alumnosData: any[]): Alumno[] {
    return alumnosData.map(alumno => {
      const seccionesAlumno = Array.isArray(alumno.secciones) ? alumno.secciones : 
                             alumno.seccion ? [alumno.seccion] : [];
      
      const cursosAlumno = Array.isArray(alumno.cursos) ? alumno.cursos : 
                          alumno.curso ? [alumno.curso] : [];

      return {
        id_usuario: alumno.id_usuario || 0,
        id_estudiante: alumno.id_estudiante || 0,
        nombre: alumno.nombre || 'Sin nombre',
        apellido: alumno.apellido || '',
        correo: alumno.correo || '',
        rol: alumno.rol || 'estudiante',
        secciones: seccionesAlumno,
        cursos: cursosAlumno,
        tieneChat: alumno.tieneChat || false,
        chatExistente: alumno.chatExistente && typeof alumno.chatExistente === 'object' ? {
          id_chat: alumno.chatExistente.id_chat || 0,
          curso: alumno.chatExistente.curso || null,
          seccion: alumno.chatExistente.seccion || null,
          ultimo_mensaje: alumno.chatExistente.ultimo_mensaje || null,
          fecha_ultimo_mensaje: alumno.chatExistente.fecha_ultimo_mensaje || null,
          iniciadoPorAlumno: alumno.chatExistente.iniciadoPorAlumno || false,
          totalMensajes: alumno.chatExistente.totalMensajes || 0
        } : null
      };
    });
  }

  filtrarAlumnos(): void {
    if (!this.alumnos.length) {
      this.alumnosFiltrados = [];
      return;
    }

    let alumnosAFiltrar = this.pestanaActiva === 'misAlumnos' 
      ? this.obtenerMisAlumnos() 
      : this.obtenerAlumnosConChat();

    console.log('🔍 Filtrado - Sección seleccionada:', this.seccionSeleccionada?.nombre || 'Todas las secciones');
    console.log('🔍 Filtrado - Alumnos antes de filtrar:', alumnosAFiltrar.length);

    if (this.seccionSeleccionada) {
      alumnosAFiltrar = alumnosAFiltrar.filter(alumno => {
        const perteneceASeccion = alumno.secciones?.some((sec: string) => 
          sec === this.seccionSeleccionada!.nombre
        );
        return perteneceASeccion;
      });
    } else {
      console.log('🔍 Mostrando TODOS los alumnos (sin filtro por sección)');
    }

    if (this.terminoBusqueda.trim()) {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      alumnosAFiltrar = alumnosAFiltrar.filter(alumno =>
        alumno.nombre?.toLowerCase().includes(termino) ||
        alumno.apellido?.toLowerCase().includes(termino) ||
        alumno.correo?.toLowerCase().includes(termino)
      );
    }

    this.alumnosFiltrados = alumnosAFiltrar;
    console.log(`🔍 Alumnos filtrados final: ${this.alumnosFiltrados.length}`);
  }

  onSearchInput(): void {
    this.searchSubject.next(this.terminoBusqueda);
  }

  obtenerMisAlumnos(): Alumno[] {
    return this.alumnos.filter(alumno => 
      alumno && 
      typeof alumno.id_estudiante === 'number' && 
      alumno.rol === 'estudiante'
    );
  }

  obtenerAlumnosConChat(): Alumno[] {
    // 🟢 CORRECCIÓN: Solo mostrar alumnos que tienen mensajes (chat activo)
    return this.alumnos.filter(alumno => 
      alumno && 
      alumno.tieneChat && 
      alumno.chatExistente && 
      alumno.chatExistente.id_chat &&
      alumno.chatExistente.ultimo_mensaje // Solo si tiene al menos un mensaje
    );
  }

  cambiarPestana(pestana: 'misAlumnos' | 'alumnosChat'): void {
    this.pestanaActiva = pestana;
    this.filtrarAlumnos();
  }

  seleccionarSeccion(seccion: Seccion): void {
    if (!seccion || !seccion.id_seccion) {
      console.error('❌ Sección inválida');
      return;
    }

    this.seccionSeleccionada = seccion;
    this.mostrarSelectorSecciones = false;
    console.log('🎯 Sección seleccionada:', seccion.nombre);
    this.filtrarAlumnos();
  }

  // CORREGIR en docente-chat.ts - MEJORAR selección de alumno
// 🟢 CORREGIDO: No eliminar todas las suscripciones
// 🟢 CORREGIDO: Selección de alumno mejorada
seleccionarAlumno(alumno: Alumno): void {
  console.log('🎯 INICIANDO seleccionarAlumno para:', alumno.nombre);
  
  if (!this.validarAlumnoSeleccionable(alumno)) {
    return;
  }

  // 🟢 USAR el método de limpieza unificado
  this.limpiarChatAnterior();

  console.log('👤 Alumno seleccionado:', {
    nombre: alumno.nombre,
    tieneChat: alumno.tieneChat,
    chatExistente: alumno.chatExistente?.id_chat
  });

  try {
    if (alumno.tieneChat && alumno.chatExistente?.id_chat) {
      console.log('💬 Chat existente encontrado, ID:', alumno.chatExistente.id_chat);
      this.inicializarChatExistente(alumno);
    } else {
      console.log('🆕 No hay chat existente, creando nuevo...');
      this.crearNuevoChat(alumno);
    }
  } catch (error) {
    console.error('❌ Error crítico al seleccionar alumno:', error);
    this.mostrarError('Error al seleccionar alumno: ' + this.obtenerMensajeError(error));
  }
}

  private validarAlumnoSeleccionable(alumno: Alumno): boolean {
    if (!this.currentUser) {
      console.error('❌ No hay usuario actual');
      this.errorAlumnos = 'No se pudo identificar al docente';
      return false;
    }

    if (this.enviandoMensaje) {
      console.warn('⚠️ No se puede seleccionar alumno mientras se envía mensaje');
      return false;
    }

    if (!alumno || !alumno.id_estudiante) {
      console.error('❌ Alumno inválido');
      return false;
    }

    return true;
  }

  // 🟢 CORREGIR: Al seleccionar alumno, configurar correctamente
// 🟢 CORREGIR: Inicialización de chat existente
private inicializarChatExistente(alumno: Alumno): void {
  if (!alumno.chatExistente) return;

  const curso = alumno.cursos.length > 0 ? alumno.cursos[0] : alumno.chatExistente.curso || 'Curso no asignado';
  const seccion = alumno.secciones.length > 0 ? alumno.secciones[0] : alumno.chatExistente.seccion || 'Sección no asignada';

  this.chatSeleccionado = {
    id_chat: alumno.chatExistente.id_chat,
    usuario: {
      id_usuario: alumno.id_usuario,
      nombre: alumno.nombre || 'Alumno',
      apellido: alumno.apellido || '',
      correo: alumno.correo || '',
      rol: alumno.rol || 'estudiante'
    },
    curso: curso,
    seccion: seccion,
    ultimo_mensaje: alumno.chatExistente.ultimo_mensaje,
    fecha_ultimo_mensaje: alumno.chatExistente.fecha_ultimo_mensaje
  };
  
  console.log('💬 Chat seleccionado INICIALIZADO:', this.chatSeleccionado.id_chat);
  
  this.cdRef.detectChanges();
  
  // 🟢 CONFIGURAR WebSocket para el chat
  this.configurarWebSocketParaChat(alumno.chatExistente.id_chat);
  
  // 🟢 CARGAR mensajes históricos
  this.cargarMensajes(alumno.chatExistente.id_chat);
  
  // 🟢 CONFIGURAR suscripción a mensajes en tiempo real
  this.configurarSuscripcionMensajes();
}

  // 🟢 NUEVO: Configurar suscripción única de mensajes
// CORREGIR en docente-chat.ts - REEMPLAZAR el método completo
// 🟢 CORREGIR: Configurar suscripción a mensajes de forma segura
// CORREGIR: El método actual puede causar duplicación
private configurarSuscripcionMensajes(): void {
  if (!this.chatSeleccionado) return;

  console.log('🔗 Configurando recepción de mensajes para chat:', this.chatSeleccionado.id_chat);

  // 🟢 LIMPIAR cualquier suscripción anterior de mensajes
  this.subscriptions.add(
    this.chatService.mensajes$.pipe(
      // 🟢 FILTRAR solo mensajes del chat actual
      map((mensajesDelServicio: Mensaje[]) => 
        mensajesDelServicio.filter(m => m && m.id_chat === this.chatSeleccionado!.id_chat)
      ),
      // 🟢 EVITAR procesar si no hay mensajes nuevos
      filter(mensajesFiltrados => mensajesFiltrados.length > 0),
      // 🟢 EVITAR duplicados basado en IDs
      distinctUntilChanged((prev, curr) => {
        if (prev.length !== curr.length) return false;
        return prev.every((msg, i) => msg.id_mensaje === curr[i]?.id_mensaje);
      })
    ).subscribe({
      next: (mensajesFiltrados: Mensaje[]) => {
        console.log('📥 Mensajes filtrados recibidos:', mensajesFiltrados.length);
        
        // 🟢 ACTUALIZAR solo si hay cambios reales
        const idsActuales = new Set(this.mensajes.map(m => m.id_mensaje));
        const mensajesNuevos = mensajesFiltrados.filter(m => !idsActuales.has(m.id_mensaje));
        
        if (mensajesNuevos.length > 0) {
          console.log('🆕 Agregando', mensajesNuevos.length, 'mensajes nuevos');
          this.mensajes = [...this.mensajes, ...mensajesNuevos];
          
          // Ordenar por fecha
          this.mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
          
          if (this.autoScrollEnabled) {
            setTimeout(() => this.scrollToBottom(), 100);
          }
          
          this.cdRef.detectChanges();
        }
      },
      error: (error) => {
        console.error('❌ Error en recepción de mensajes:', error);
      }
    })
  );
}

  private crearNuevoChat(alumno: Alumno): void {
    const chatData = {
      id_docente: this.currentUser.id_docente,
      id_estudiante: alumno.id_estudiante,
      id_curso: this.obtenerIdCursoDeAlumno(alumno),
      id_seccion: this.obtenerIdSeccionDeAlumno(alumno)
    };

    console.log('🆕 Creando nuevo chat para alumno:', alumno.nombre, 'Datos:', chatData);

    this.subscriptions.add(
      this.chatService.crearChat(chatData).subscribe({
        next: (response: any) => {
          console.log('✅ Respuesta de crear chat:', response);
          
          const nuevoChat = response.data || response;
          
          if (nuevoChat && nuevoChat.id_chat) {
            console.log('✅ Chat creado exitosamente, ID:', nuevoChat.id_chat);
            
            // 🟢 CORRECCIÓN: No marcar como activo hasta que haya mensajes
            this.actualizarAlumnoConNuevoChat(alumno, nuevoChat);
            
            this.inicializarChatDesdeRespuesta(alumno, nuevoChat);
            
          } else {
            console.error('❌ Chat creado pero sin ID válido:', response);
            this.mostrarError('Error: No se pudo crear el chat correctamente');
          }
        },
        error: (error: any) => {
          console.error('❌ Error al crear chat:', error);
          this.mostrarError('Error al crear chat: ' + this.obtenerMensajeError(error));
        }
      })
    );
  }

  private inicializarChatDesdeRespuesta(alumno: Alumno, nuevoChat: any): void {
    console.log('🔄 Inicializando chat desde respuesta...');
    
    this.chatSeleccionado = {
      id_chat: nuevoChat.id_chat,
      usuario: {
        id_usuario: alumno.id_usuario,
        nombre: alumno.nombre || 'Alumno',
        apellido: alumno.apellido || '',
        correo: alumno.correo || '',
        rol: alumno.rol || 'estudiante'
      },
      curso: nuevoChat.curso?.nombre || alumno.cursos[0] || 'Curso no asignado',
      seccion: nuevoChat.seccion?.nombre || alumno.secciones[0] || 'Sección no asignada',
      ultimo_mensaje: null,
      fecha_ultimo_mensaje: null
    };
    
    console.log('💬 NUEVO Chat seleccionado desde respuesta:', {
      id: this.chatSeleccionado.id_chat,
      alumno: `${alumno.nombre} ${alumno.apellido}`
    });
    
    this.cdRef.detectChanges();
    
    this.cargarMensajes(nuevoChat.id_chat);
  }

  private actualizarAlumnoConNuevoChat(alumno: Alumno, nuevoChat: any): void {
    const alumnoIndex = this.alumnos.findIndex(a => a.id_estudiante === alumno.id_estudiante);
    if (alumnoIndex !== -1) {
      // 🟢 CORRECCIÓN: Solo marcar tieneChat como true, pero no como activo hasta que haya mensajes
      this.alumnos[alumnoIndex].tieneChat = true;
      this.alumnos[alumnoIndex].chatExistente = {
        id_chat: nuevoChat.id_chat,
        curso: alumno.cursos[0] || nuevoChat.curso?.nombre || null,
        seccion: alumno.secciones[0] || nuevoChat.seccion?.nombre || null,
        ultimo_mensaje: null, // Sin mensajes aún
        fecha_ultimo_mensaje: null, // Sin mensajes aún
        iniciadoPorAlumno: false,
        totalMensajes: 0
      };
      
      console.log('✅ Alumno actualizado con nuevo chat (sin mensajes):', this.alumnos[alumnoIndex]);
    }
  }

  private obtenerIdCursoDeAlumno(alumno: Alumno): number | null {
    if (this.seccionSeleccionada?.id_curso) {
      return this.seccionSeleccionada.id_curso;
    }
    
    if (alumno.secciones.length > 0 && this.secciones.length > 0) {
      const seccionAlumno = this.secciones.find(s => 
        s.nombre === alumno.secciones[0] && s.id_curso
      );
      return seccionAlumno?.id_curso || null;
    }
    
    return null;
  }

  private obtenerIdSeccionDeAlumno(alumno: Alumno): number | null {
    if (this.seccionSeleccionada) {
      return this.seccionSeleccionada.id_seccion;
    }
    
    if (alumno.secciones.length > 0) {
      const seccion = this.secciones.find(s => s.nombre === alumno.secciones[0]);
      return seccion?.id_seccion || null;
    }
    
    return null;
  }

  private cargarMensajes(id_chat: number, pagina: number = 1, cargarMas: boolean = false): void {
    if (!id_chat || isNaN(id_chat)) {
      console.error('❌ ID de chat inválido:', id_chat);
      return;
    }

    console.log('📨 CARGANDO MENSAJES - Chat ID:', id_chat, 'Página:', pagina, 'Cargar más:', cargarMas);

    if (!cargarMas) {
      this.cargandoMensajes = true;
      this.mensajes = [];
      this.paginacionMensajes = null;
      this.configurarWebSocketParaChat(id_chat);
    } else {
      this.cargandoMasMensajes = true;
    }

    this.autoScrollEnabled = !cargarMas;

    this.subscriptions.add(
      this.chatService.obtenerMensajes(id_chat, pagina).subscribe({
        next: (response: any) => {
          console.log('✅ RESPUESTA COMPLETA DE MENSAJES:', response);
          
          let mensajesData: any[] = [];
          let paginacionData: any = null;

          if (response && response.data) {
            console.log('📦 Estructura con data');
            
            if (Array.isArray(response.data)) {
              mensajesData = response.data;
              console.log('📨 Mensajes en data (array):', mensajesData.length);
            } else if (response.data.mensajes && Array.isArray(response.data.mensajes)) {
              mensajesData = response.data.mensajes;
              paginacionData = response.data.paginacion;
              console.log('📨 Mensajes en data.mensajes:', mensajesData.length);
            } else if (response.data && typeof response.data === 'object') {
              mensajesData = [response.data];
              console.log('📨 Mensaje único en data:', mensajesData.length);
            }
          } 
          else if (Array.isArray(response)) {
            console.log('📦 Respuesta es array directo');
            mensajesData = response;
          }
          else if (response && response.mensajes && Array.isArray(response.mensajes)) {
            console.log('📦 Respuesta con propiedad mensajes');
            mensajesData = response.mensajes;
            paginacionData = response.paginacion;
          }
          else if (response && response.id_mensaje) {
            console.log('📦 Respuesta de mensaje único');
            mensajesData = [response];
          }

          console.log('📨 Mensajes extraídos:', mensajesData);

          const mensajesProcesados = this.procesarMensajesBackend(mensajesData);
          console.log('✅ Mensajes procesados:', mensajesProcesados.length);

          if (cargarMas) {
            this.mensajes = [...mensajesProcesados, ...this.mensajes];
          } else {
            this.mensajes = mensajesProcesados;
          }

          this.paginacionMensajes = paginacionData || {
            paginaActual: pagina,
            porPagina: mensajesProcesados.length,
            totalMensajes: mensajesProcesados.length,
            totalPaginas: 1,
            tieneMas: false
          };

          console.log('💬 Estado final de mensajes:', this.mensajes.length);

          if (!cargarMas && this.mensajes.length > 0) {
            setTimeout(() => {
              this.scrollToBottom();
              this.autoScrollEnabled = true;
            }, 100);
          }

          if (cargarMas) {
            this.cargandoMasMensajes = false;
          } else {
            this.cargandoMensajes = false;
          }
          
          this.cdRef.detectChanges();
        },
        error: (error: any) => {
          console.error('❌ ERROR AL CARGAR MENSAJES:', error);
          
          if (cargarMas) {
            this.cargandoMasMensajes = false;
          } else {
            this.cargandoMensajes = false;
          }
          this.mostrarError('Error al cargar mensajes: ' + this.obtenerMensajeError(error));
          this.cdRef.detectChanges();
        }
      })
    );
  }

  

  // 🟢 CORREGIR: Procesamiento de mensajes con archivos mejorado
// 🟢 CORREGIR: Reemplazar estas líneas problemáticas
private procesarMensajesBackend(mensajesData: any[]): Mensaje[] {
  if (!Array.isArray(mensajesData)) {
    console.error('❌ mensajesData no es array:', mensajesData);
    return [];
  }

  return mensajesData
    .filter(msg => {
      const esValido = msg && 
        msg.id_mensaje && 
        (msg.contenido || msg.archivo) &&
        msg.fecha &&
        msg.id_remitente;
      
      if (!esValido) {
        console.warn('⚠️ Mensaje inválido filtrado:', msg);
      }
      
      return esValido;
    })
    .map(msg => {
      // 🟢 PROCESAR ARCHIVOS CORRECTAMENTE
      let archivoProcesado = null;
      if (msg.archivo) {
        archivoProcesado = {
          url: msg.archivo.url || msg.archivo,
          ruta: msg.archivo.ruta || '',
          nombre: msg.archivo.nombre || this.obtenerNombreArchivoDesdeUrl(msg.archivo.url || msg.archivo),
          tipo: msg.archivo.tipo || 'application/octet-stream',
          tamano: msg.archivo.tamano || msg.archivo.tamano || 0
        };
      }

      // 🟢 CORRECCIÓN CRÍTICA: Manejo seguro del remitente
      let remitenteProcesado;
      
      if (msg.remitente && typeof msg.remitente === 'object') {
        // Caso 1: remitente existe y es un objeto
        remitenteProcesado = {
          id_usuario: msg.remitente.id_usuario || msg.id_remitente,
          correo: msg.remitente.correo || 'sin-correo',
          rol: msg.remitente.rol || 'estudiante'
        };
      } else {
        // Caso 2: remitente no existe o no es un objeto válido
        remitenteProcesado = {
          id_usuario: msg.id_remitente,
          correo: 'sin-correo',
          rol: 'estudiante'
        };
      }

      return {
        id_mensaje: msg.id_mensaje,
        contenido: msg.contenido || '📎 Archivo compartido',
        fecha: msg.fecha,
        id_chat: msg.id_chat,
        id_remitente: msg.id_remitente,
        remitente: remitenteProcesado, // 🟢 Usar el objeto procesado
        archivo: archivoProcesado
      };
    });
}

// 🟢 AGREGAR: Método auxiliar para obtener nombre de archivo desde URL
private obtenerNombreArchivoDesdeUrl(url: string): string {
  if (!url) return 'archivo';
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'archivo';
  } catch {
    return 'archivo';
  }
}

  cargarMasMensajes(): void {
    if (this.cargandoMasMensajes || 
        !this.paginacionMensajes?.tieneMas || 
        !this.chatSeleccionado) {
      return;
    }
    
    const siguientePagina = this.paginacionMensajes.paginaActual + 1;
    this.cargarMensajes(this.chatSeleccionado.id_chat, siguientePagina, true);
  }

  // 🆕 CONECTAR WEBSOCKET AL INICIAR CHAT
private conectarWebSocket(): void {
  const currentUser = this.authService.getCurrentUser();
  if (currentUser) {
    this.chatService.unirseAlChat(this.chatSeleccionado!.id_chat);
    
  }
}

// 🟢 CORREGIR COMPLETAMENTE: Método enviarMensaje unificado
async enviarMensaje(): Promise<void> {
  // 🔴 PROTECCIÓN MEJORADA CONTRA DOBLE ENVÍO
  if (this.enviandoMensaje) {
    console.warn('🚫 Envío en progreso - Evitando doble envío');
    return;
  }

  const contenido = this.nuevoMensaje?.trim() || '';
  const tieneContenido = contenido.length > 0;
  const tieneArchivo = !!this.archivoSeleccionado;

  console.log('🔍 Verificando condiciones de envío:', {
    tieneContenido,
    tieneArchivo,
    contenido
  });

  if (!tieneContenido && !tieneArchivo) {
    this.mostrarError('El mensaje no puede estar vacío');
    return;
  }

  if (!this.chatSeleccionado) {
    this.mostrarError('No hay chat seleccionado');
    return;
  }

  if (!this.currentUser) {
    this.mostrarError('Usuario no identificado');
    return;
  }

  this.enviandoMensaje = true;

  try {
    // 🟢 ESTRATEGIA UNIFICADA: HTTP para archivos, WebSocket para texto
    if (tieneArchivo) {
      await this.enviarMensajeConArchivo(contenido);
    } else {
      await this.enviarMensajeNormal(contenido);
    }
    
    console.log('✅ Mensaje enviado exitosamente');
    
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    this.mostrarError('Error al enviar mensaje: ' + this.obtenerMensajeError(error));
  } finally {
    this.enviandoMensaje = false;
    this.cdRef.detectChanges();
  }
}

// 🟢 AGREGAR: Método para enviar mensaje solo texto
private async enviarMensajeNormal(contenido: string): Promise<void> {
  const mensajeData = {
    contenido: contenido,
    id_chat: this.chatSeleccionado!.id_chat,
    id_remitente: this.currentUser.id_usuario
  };

  // Mensaje optimista para UI inmediata
  const mensajeOptimista: Mensaje = {
    id_mensaje: Date.now(), // ID temporal
    contenido,
    fecha: new Date().toISOString(),
    id_chat: this.chatSeleccionado!.id_chat,
    id_remitente: this.currentUser.id_usuario,
    remitente: {
      id_usuario: this.currentUser.id_usuario,
      correo: this.currentUser.correo,
      rol: this.currentUser.rol
    }
  };

  // 🟢 AGREGAR mensaje optimista a la UI
  this.agregarMensajeOptimista(mensajeOptimista);

  try {
    // 🟢 USAR EL MÉTODO CORREGIDO DEL SERVICIO
    const resultado = this.chatService.enviarMensaje(mensajeData);

    if (resultado && 'subscribe' in resultado) {
      // 🟢 SOLO HTTP: Suscribirse para confirmación
      await new Promise((resolve, reject) => {
        resultado.subscribe({
          next: (response: any) => {
            console.log('✅ Mensaje confirmado por HTTP:', response);
            // Reemplazar mensaje optimista con el real
            this.reemplazarMensajeOptimista(mensajeOptimista, response);
            this.actualizarUltimoMensajeEnLista(response);
            resolve(response);
          },
          error: (error: any) => {
            this.manejarErrorEnvioMensaje(mensajeOptimista, error);
            reject(error);
          }
        });
      });
    } else {
      // 🟢 WEBSOCKET: No hacer nada más - el mensaje real llegará por WebSocket
      console.log('✅ Mensaje enviado por WebSocket, esperando llegada automática...');
      // Limpiar el campo de texto inmediatamente
      this.nuevoMensaje = '';
    }
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    this.manejarErrorEnvioMensaje(mensajeOptimista, error);
    throw error;
  }
}



// docente-chat.ts - MODIFICAR el método enviarMensajeConArchivo

private async enviarMensajeConArchivo(contenido: string): Promise<void> {
  if (!this.archivoSeleccionado) {
    console.error('❌ No hay archivo seleccionado para enviar');
    this.mostrarError('No se ha seleccionado ningún archivo');
    return;
  }

  console.log('📤 Preparando archivo para envío:', {
    nombre: this.archivoSeleccionado.name,
    tamano: this.archivoSeleccionado.size,
    tipo: this.archivoSeleccionado.type
  });

  // 🆕 CREAR mensaje de carga (NO optimista)
  const mensajeCargando = (this.chatService as any).crearMensajeCargando(
    this.chatSeleccionado!.id_chat,
    this.currentUser!,
    this.archivoSeleccionado
  );

  // 🆕 AGREGAR mensaje de carga a la UI
  this.agregarMensajeCargando(mensajeCargando);

  try {
    const resultado = this.chatService.enviarMensajeConArchivo({
      contenido: contenido || '📎 Archivo compartido',
      id_chat: this.chatSeleccionado!.id_chat,
      id_remitente: this.currentUser!.id_usuario
    }, this.archivoSeleccionado);

    if (resultado) {
      await new Promise((resolve, reject) => {
        console.log('🔄 Iniciando envío real del archivo:', this.archivoSeleccionado!.name);
        
        const subscription = resultado.subscribe({
          next: (response: any) => {
            console.log('✅ Respuesta completa del servidor:', response);
            
            if (response && response.success) {
              // 🆕 ELIMINAR mensaje de carga y agregar el real
              this.procesarRespuestaArchivo(response, mensajeCargando);
              
              // Limpiar archivo después de éxito
              this.archivoSeleccionado = null;
              this.removerArchivoDelInput();
              this.actualizarUltimoMensajeEnLista(response);
              resolve(response);
            } else {
              console.error('❌ Respuesta inválida del servidor:', response);
              this.manejarErrorArchivo(mensajeCargando, 'Respuesta inválida del servidor');
              reject(new Error('Respuesta inválida del servidor'));
            }
          },
          error: (error: any) => {
            console.error('❌ Error enviando mensaje con archivo:', error);
            this.manejarErrorArchivo(mensajeCargando, error);
            reject(error);
          },
          complete: () => {
            console.log('✅ Envío de archivo completado');
            subscription.unsubscribe();
          }
        });
      });
    } else {
      throw new Error('No se pudo iniciar el envío del archivo');
    }
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    this.manejarErrorArchivo(mensajeCargando, error);
    throw error;
  }
}

// 🟢 AGREGAR: Métodos auxiliares faltantes
private agregarMensajeOptimista(mensaje: Mensaje): void {
  // Verificar que no sea duplicado
  const esDuplicado = this.mensajes.some(m => 
    m.id_remitente === mensaje.id_remitente && 
    m.contenido === mensaje.contenido &&
    Math.abs(new Date(m.fecha).getTime() - new Date(mensaje.fecha).getTime()) < 1000
  );

  if (!esDuplicado) {
    this.mensajes.push(mensaje);
    
    // 🟢 LIMPIAR SOLO EL TEXTO, NO EL ARCHIVO (se limpia después del éxito)
    this.nuevoMensaje = '';
    
    this.autoScrollEnabled = true;
    
    setTimeout(() => this.scrollToBottom(), 50);
    this.cdRef.detectChanges();
    
    console.log('📝 Mensaje optimista agregado:', mensaje.id_mensaje);
  } else {
    console.warn('🚫 Mensaje optimista duplicado, ignorando:', mensaje.id_mensaje);
  }
}

private reemplazarMensajeOptimista(mensajeOptimista: Mensaje, mensajeReal: any): void {
  const index = this.mensajes.findIndex(m => m.id_mensaje === mensajeOptimista.id_mensaje);
  
  if (index !== -1) {
    this.mensajes[index] = {
      ...mensajeReal,
      // Mantener algunas propiedades del optimista si es necesario
      fecha: mensajeReal.fecha || mensajeOptimista.fecha
    };
    console.log('🔄 Mensaje optimista reemplazado:', mensajeOptimista.id_mensaje, '→', mensajeReal.id_mensaje);
    this.cdRef.detectChanges();
  } else {
    console.warn('⚠️ Mensaje optimista no encontrado para reemplazar:', mensajeOptimista.id_mensaje);
  }
}

private procesarRespuestaMensaje(response: any, mensajeOptimista: Mensaje): void {
  console.log('🔄 Procesando respuesta del servidor:', response);
  
  // 🟢 EXTRAER correctamente el mensaje de la respuesta
  let nuevoMensaje: any;
  
  if (response && response.success && response.data) {
    // Caso: respuesta con formato { success: true, data: mensaje }
    nuevoMensaje = response.data;
  } else if (response && response.id_mensaje) {
    // Caso: respuesta es directamente el mensaje
    nuevoMensaje = response;
  } else {
    console.error('❌ Formato de respuesta inválido:', response);
    return;
  }

  console.log('✅ Mensaje extraído:', nuevoMensaje);

  // 🟢 BUSCAR y reemplazar el mensaje optimista
  const index = this.mensajes.findIndex(m => m.id_mensaje === mensajeOptimista.id_mensaje);
  
  if (index !== -1) {
    // 🟢 PRESERVAR información del archivo si es necesario
    if (mensajeOptimista.archivo && (!nuevoMensaje.archivo || !nuevoMensaje.archivo.url)) {
      nuevoMensaje.archivo = {
        ...mensajeOptimista.archivo,
        // Mantener la URL real si existe, sino usar la del optimista
        url: nuevoMensaje.archivo?.url || mensajeOptimista.archivo.url,
        ruta: nuevoMensaje.archivo?.ruta || mensajeOptimista.archivo.ruta
      };
    }
    
    this.mensajes[index] = nuevoMensaje;
    console.log('✅ Mensaje optimista reemplazado con archivo');
  } else {
    // Si no encuentra el optimista, agregar el nuevo mensaje
    this.mensajes.push(nuevoMensaje);
    console.log('✅ Nuevo mensaje con archivo agregado');
  }
  
  this.actualizarUltimoMensajeEnLista(nuevoMensaje);
  
  // 🟢 ACTUALIZAR UI
  setTimeout(() => this.scrollToBottom(), 100);
  this.cdRef.detectChanges();
}

private manejarErrorEnvioMensaje(mensajeOptimista: Mensaje, error: any): void {
  console.error('❌ Error enviando mensaje, removiendo optimista:', mensajeOptimista.id_mensaje);
  
  // Remover mensaje optimista
  const index = this.mensajes.findIndex(m => m.id_mensaje === mensajeOptimista.id_mensaje);
  if (index !== -1) {
    this.mensajes.splice(index, 1);
    this.cdRef.detectChanges();
    console.log('🗑️ Mensaje optimista removido por error');
  }
  
  this.mostrarError('Error al enviar mensaje: ' + this.obtenerMensajeError(error));
}

private removerArchivoDelInput(): void {
  this.archivoSeleccionado = null;
  // También limpiar el input file del DOM si es necesario
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
  console.log('🗑️ Input de archivo limpiado');
}

// 🟢 AGREGAR: Métodos para el indicador de conexión
getConnectionClass(): string {
  switch (this.connectionState.status) {
    case 'connected': return 'text-green-500';
    case 'connecting': return 'text-yellow-500';
    case 'disconnected': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

getConnectionText(): string {
  switch (this.connectionState.status) {
    case 'connected': return 'Conectado';
    case 'connecting': return 'Conectando...';
    case 'disconnected': return 'Desconectado';
    default: return 'Sin conexión';
  }
}

// 🟢 AGREGAR ESTE MÉTODO - FALTANTE
isWebSocketConnected(): boolean {
  return this.chatService.isWebSocketConnected();
}

private startConnectionMonitoring(): void {
  this.connectionCheckTimer = setInterval(() => {
    this.verificarEstadoConexion();
  }, 10000); // Verificar cada 10 segundos
}
// 🟢 NUEVO: Verificar y mostrar estado de conexión
verificarEstadoConexion(): void {
  const estado = this.chatService.getConnectionState();
  this.connectionState = estado;
  
  console.log('📡 Estado de conexión WebSocket:', {
    estado: estado.status,
    conectado: this.chatService.isWebSocketConnected(),
    chatActual: this.chatSeleccionado?.id_chat
  });
  
  this.cdRef.detectChanges();
}

// 🟢 AGREGAR: Método para verificar si un mensaje tiene archivo válido
// 🟢 CORREGIR: Método para verificar archivo válido
tieneArchivoValido(msg: Mensaje): boolean {
  if (!msg.archivo) return false;
  
  // Verificar estructura básica
  if (!msg.archivo.url || !msg.archivo.nombre || !msg.archivo.tipo) {
    return false;
  }
  
  // Verificar que no sea un archivo en proceso de upload
  if (msg.archivo.nombre === 'uploading...' || msg.archivo.ruta === 'uploading...') {
    return false;
  }
  
  return true;
}

obtenerUrlDescarga(mensaje: Mensaje): string {
  if (!this.tieneArchivoValido(mensaje)) {
    return '';
  }
  
  if (mensaje.archivo!.url.startsWith('http')) {
    return mensaje.archivo!.url;
  }
  
  if (mensaje.archivo!.ruta) {
    return `http://localhost:4000/api/chat/archivo/${encodeURIComponent(mensaje.archivo!.ruta)}`;
  }
  
  return '';
}
// 🟢 NUEVO: Configurar solo listeners de conexión, NO de mensajes
private setupConnectionListeners(): void {
  console.log('🔧 Configurando listeners de CONEXIÓN para docente...');

  this.subscriptions.add(
    this.chatService.connectionState$.subscribe({
      next: (state: ConnectionState) => {
        console.log('📡 Estado conexión docente:', state.status);
        this.connectionState = state;
        
        // 🟢 RECONEXIÓN AUTOMÁTICA si está desconectado y hay chat activo
        if (state.status === 'disconnected' && this.chatSeleccionado) {
          console.log('🔄 Intentando reconexión automática...');
          setTimeout(() => {
            this.chatService.reconectarWebSocket();
          }, 2000);
        }
        
        this.cdRef.detectChanges();
      },
      error: (error) => console.error('❌ Error en connectionState:', error)
    })
  );
}

async descargarArchivo(mensaje: Mensaje): Promise<void> {
  if (!this.tieneArchivoValido(mensaje)) {
    console.error('❌ No se puede descargar: archivo no válido', mensaje);
    this.mostrarError('No se puede descargar el archivo: información incompleta');
    return;
  }

  try {
    const urlDescarga = this.obtenerUrlDescarga(mensaje);
    
    if (!urlDescarga) {
      console.error('❌ No hay URL de descarga disponible');
      this.mostrarError('No se puede descargar el archivo: URL no disponible');
      return;
    }

    console.log('📥 Iniciando descarga:', {
      nombre: mensaje.archivo!.nombre,
      url: urlDescarga
    });

    const link = document.createElement('a');
    link.href = urlDescarga;
    link.download = mensaje.archivo!.nombre;
    link.target = '_blank';
    
    const token = localStorage.getItem('token');
    if (token) {
      link.setAttribute('Authorization', `Bearer ${token}`);
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ Descarga iniciada para:', mensaje.archivo!.nombre);
    
  } catch (error) {
    console.error('❌ Error al descargar archivo:', error);
    this.mostrarError('Error al descargar el archivo: ' + this.obtenerMensajeError(error));
  }
}

verArchivo(mensaje: Mensaje): void {
  if (!this.tieneArchivoValido(mensaje)) {
    return;
  }

  const url = this.obtenerUrlDescarga(mensaje);
  if (url) {
    window.open(url, '_blank');
  }
}

// 🟢 AGREGAR: Método para obtener icono según tipo de archivo
obtenerIconoArchivo(msg: Mensaje): string {
  if (!msg.archivo?.tipo) {
    return 'fas fa-file text-gray-400';
  }
  
  const tipo = msg.archivo.tipo.toLowerCase();
  const nombre = msg.archivo.nombre.toLowerCase();
  
  if (tipo.includes('pdf')) return 'fas fa-file-pdf text-red-500';
  if (tipo.includes('word') || nombre.endsWith('.doc') || nombre.endsWith('.docx')) 
    return 'fas fa-file-word text-blue-500';
  if (tipo.includes('excel') || nombre.endsWith('.xls') || nombre.endsWith('.xlsx')) 
    return 'fas fa-file-excel text-green-500';
  if (tipo.includes('powerpoint') || nombre.endsWith('.ppt') || nombre.endsWith('.pptx')) 
    return 'fas fa-file-powerpoint text-orange-500';
  if (tipo.includes('image')) return 'fas fa-file-image text-purple-500';
  if (tipo.includes('zip') || tipo.includes('rar') || tipo.includes('compressed')) 
    return 'fas fa-file-archive text-yellow-600';
  if (tipo.includes('text')) return 'fas fa-file-alt text-gray-500';
  
  return 'fas fa-file text-gray-400';
}


// 🟢 AGREGAR: Método alternativo para descarga directa
descargarArchivoDirecto(mensaje: Mensaje): void {
  if (!this.tieneArchivoValido(mensaje)) {
    return;
  }

  const urlDescarga = mensaje.archivo!.url;
  
  if (!urlDescarga) {
    console.error('❌ No hay URL de descarga disponible');
    return;
  }

  console.log('📥 Descargando desde URL directa:', urlDescarga);

  // Abrir en nueva pestaña para descarga
  window.open(urlDescarga, '_blank');
}

// 🆕 AGREGAR métodos para manejo de archivos
formatearTamanoArchivo(bytes: number = 0): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

obtenerTipoArchivo(msg: Mensaje): string {
  if (!msg.archivo?.tipo) return 'Archivo';
  const tipo = msg.archivo.tipo.split('/')[1]?.toUpperCase() || 'Archivo';
  return tipo;
}

// 🟢 AGREGAR: Inicialización mejorada del WebSocket
// 🟢 CORREGIR: Configuración única de WebSocket
private inicializarWebSocket(): void {
  console.log('🔄 Inicializando WebSocket para docente...');
  
  // 🟢 SOLO configurar listeners de conexión
  this.setupConnectionListeners();
  
  // 🟢 NO configurar listeners de mensajes aquí
}

// 🟢 NUEVO: Método único para configurar recepción de mensajes
private configurarRecepcionMensajes(): void {
  if (!this.chatSeleccionado) return;

  console.log('🔗 Configurando recepción de mensajes para chat:', this.chatSeleccionado.id_chat);

  // 🟢 LIMPIAR cualquier suscripción anterior específica de mensajes
  this.subscriptions.add(
    this.chatService.mensajes$.pipe(
      // 🟢 FILTRAR solo mensajes del chat actual
      filter((mensajes: Mensaje[]) => {
        return mensajes.some(m => m && m.id_chat === this.chatSeleccionado!.id_chat);
      }),
      // 🟢 EVITAR procesar arrays vacíos
      filter(mensajes => mensajes.length > 0),
      // 🟢 DEBOUNCE para evitar procesamiento excesivo
      debounceTime(100)
    ).subscribe({
      next: (mensajesDelServicio: Mensaje[]) => {
        this.procesarMensajesRecibidos(mensajesDelServicio);
      },
      error: (error) => {
        console.error('❌ Error en recepción de mensajes:', error);
      }
    })
  );
}
// 🟢 CORREGIR: Procesamiento seguro de mensajes recibidos
// 🟢 CORREGIR: En el método procesarMensajesRecibidos
private procesarMensajesRecibidos(mensajesRecibidos: Mensaje[]): void {
  if (!this.chatSeleccionado) return;

  console.log('📥 Mensajes recibidos para procesar:', mensajesRecibidos.length);

  // 🟢 FILTRAR solo mensajes del chat actual Y con contenido válido
  const mensajesFiltrados = mensajesRecibidos.filter(m => {
    if (!m || m.id_chat !== this.chatSeleccionado!.id_chat) return false;
    
    // 🟢 CRÍTICO: Validar que el mensaje tenga contenido
    const tieneContenidoValido = m.contenido?.trim() || m.archivo;
    if (!tieneContenidoValido) {
      console.warn('🚫 Mensaje filtrado por falta de contenido:', m);
      return false;
    }
    
    return true;
  });

  if (mensajesFiltrados.length === 0) return;

  let mensajesAgregados = 0;
  const idsExistentes = new Set(this.mensajes.map(m => m.id_mensaje));

  mensajesFiltrados.forEach(mensaje => {
    // 🟢 VERIFICACIÓN ROBUSTA de duplicados
    const esDuplicado = idsExistentes.has(mensaje.id_mensaje);
    const esMensajePropioReciente = this.esMensajePropioReciente(mensaje);

    if (!esDuplicado && !esMensajePropioReciente) {
      // 🟢 CORRECCIÓN: Manejo seguro del remitente
      let remitenteProcesado;
      
      if (mensaje.remitente && typeof mensaje.remitente === 'object') {
        remitenteProcesado = {
          id_usuario: mensaje.remitente.id_usuario || mensaje.id_remitente,
          correo: mensaje.remitente.correo || 'sin-correo',
          rol: mensaje.remitente.rol || 'estudiante'
        };
      } else {
        remitenteProcesado = {
          id_usuario: mensaje.id_remitente,
          correo: 'sin-correo',
          rol: 'estudiante'
        };
      }

      // 🟢 NORMALIZAR estructura del mensaje
      const mensajeNormalizado: Mensaje = {
        id_mensaje: mensaje.id_mensaje,
        contenido: mensaje.contenido?.trim() || '📎 Archivo compartido',
        fecha: mensaje.fecha,
        id_chat: mensaje.id_chat,
        id_remitente: mensaje.id_remitente,
        remitente: remitenteProcesado, // 🟢 Usar el objeto procesado
        archivo: mensaje.archivo ? {
          url: mensaje.archivo.url || '',
          ruta: mensaje.archivo.ruta || '',
          nombre: mensaje.archivo.nombre || 'Archivo',
          tipo: mensaje.archivo.tipo || 'application/octet-stream',
          tamano: mensaje.archivo.tamano || 0
        } : null
      };

      this.mensajes.push(mensajeNormalizado);
      mensajesAgregados++;
      idsExistentes.add(mensaje.id_mensaje);
      
      console.log('✅ Mensaje agregado:', {
        id: mensaje.id_mensaje,
        contenido: mensaje.contenido?.substring(0, 50),
        tieneArchivo: !!mensaje.archivo
      });
    }
  });

  if (mensajesAgregados > 0) {
    console.log(`🆕 ${mensajesAgregados} mensajes nuevos agregados`);
    
    // Ordenar por fecha
    this.mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    if (this.autoScrollEnabled) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
    
    this.cdRef.detectChanges();
  }
}

// 🟢 NUEVO: Detectar mensajes propios recientes para evitar duplicados
private esMensajePropioReciente(mensaje: Mensaje): boolean {
  if (!this.currentUser || mensaje.id_remitente !== this.currentUser.id_usuario) {
    return false;
  }

  // Buscar mensajes propios en los últimos 5 segundos con mismo contenido
  const ahora = new Date().getTime();
  const fechaMensaje = new Date(mensaje.fecha).getTime();
  const diferencia = Math.abs(ahora - fechaMensaje);

  return this.mensajes.some(m => 
    m.id_remitente === this.currentUser!.id_usuario &&
    m.contenido === mensaje.contenido &&
    (!mensaje.archivo || m.archivo?.nombre === mensaje.archivo?.nombre) &&
    Math.abs(new Date(m.fecha).getTime() - fechaMensaje) < 5000
  );
}

// 🟢 AGREGAR: Métodos faltantes para el template
obtenerIconoArchivoPorTipo(tipo: string): string {
  if (tipo.match(/pdf/)) return 'fas fa-file-pdf text-red-500';
  if (tipo.match(/word/)) return 'fas fa-file-word text-blue-500';
  if (tipo.match(/excel|spreadsheet/)) return 'fas fa-file-excel text-green-500';
  if (tipo.match(/powerpoint|presentation/)) return 'fas fa-file-powerpoint text-orange-500';
  if (tipo.match(/image/)) return 'fas fa-file-image text-purple-500';
  if (tipo.match(/zip|rar|compressed/)) return 'fas fa-file-archive text-yellow-600';
  if (tipo.match(/text/)) return 'fas fa-file-alt text-gray-500';
  return 'fas fa-file text-gray-400';
}

obtenerTipoArchivoDeFile(file: File): string {
  const tipo = file.type.split('/')[1]?.toUpperCase() || 'ARCHIVO';
  return tipo;
}

  manejarEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  private scrollToBottom(): void {
    if (!this.messagesContainer || !this.autoScrollEnabled) return;

    try {
      setTimeout(() => {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 100);
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  onMessagesScroll(): void {
    if (!this.messagesContainer) return;

    const element = this.messagesContainer.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    this.isNearTop = scrollTop < 100;
    
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    this.autoScrollEnabled = distanceFromBottom < 100;

    if (this.isNearTop && this.paginacionMensajes?.tieneMas && !this.cargandoMasMensajes) {
      this.cargarMasMensajes();
    }
  }

  private actualizarUltimoMensajeEnLista(nuevoMensaje: any): void {
    const alumnoIndex = this.alumnos.findIndex(alumno => 
      alumno.chatExistente?.id_chat === this.chatSeleccionado?.id_chat
    );
    
    if (alumnoIndex !== -1 && this.alumnos[alumnoIndex].chatExistente) {
      // 🟢 CORRECCIÓN: Solo marcar como activo cuando hay mensajes
      this.alumnos[alumnoIndex].tieneChat = true;
      this.alumnos[alumnoIndex].chatExistente!.ultimo_mensaje = nuevoMensaje.contenido;
      this.alumnos[alumnoIndex].chatExistente!.fecha_ultimo_mensaje = nuevoMensaje.fecha;
      this.alumnos[alumnoIndex].chatExistente!.totalMensajes = (this.alumnos[alumnoIndex].chatExistente!.totalMensajes || 0) + 1;
      
      this.filtrarAlumnos();
    }
  }

  // docente-chat.ts - AGREGAR estos métodos en la clase

// 🆕 AGREGAR: Método para verificar si es mensaje de carga
esMensajeCargando(msg: Mensaje): boolean {
  return (msg as any)._estado === 'cargando';
}

// 🆕 AGREGAR: Método para obtener progreso de archivo
obtenerProgresoArchivo(): number {
  return this.uploadProgreso;
}

// 🆕 AGREGAR: Método para agregar mensaje de carga
private agregarMensajeCargando(mensaje: Mensaje): void {
  this.mensajes.push(mensaje);
  
  // Limpiar campos
  this.nuevoMensaje = '';
  
  this.autoScrollEnabled = true;
  setTimeout(() => this.scrollToBottom(), 50);
  this.cdRef.detectChanges();
  
  console.log('⏳ Mensaje de carga agregado:', (mensaje as any)._idTemporal);
}

// 🆕 AGREGAR: Método para procesar respuesta de archivo
private procesarRespuestaArchivo(response: any, mensajeCargando: Mensaje): void {
  console.log('🔄 Procesando respuesta de archivo:', response);
  
  let nuevoMensaje: any;
  
  if (response && response.success && response.data) {
    nuevoMensaje = response.data;
  } else if (response && response.id_mensaje) {
    nuevoMensaje = response;
  } else {
    console.error('❌ Formato de respuesta inválido:', response);
    this.manejarErrorArchivo(mensajeCargando, 'Formato de respuesta inválido');
    return;
  }

  console.log('✅ Archivo subido correctamente:', nuevoMensaje);

  // 🆕 REEMPLAZAR mensaje de carga por el real
  const index = this.mensajes.findIndex(m => (m as any)._idTemporal === (mensajeCargando as any)._idTemporal);
  
  if (index !== -1) {
    this.mensajes[index] = {
      ...nuevoMensaje,
      _estado: 'confirmado'
    };
    console.log('✅ Mensaje de carga reemplazado por mensaje real');
  } else {
    // Si no encuentra el de carga, agregar el nuevo mensaje
    this.mensajes.push({
      ...nuevoMensaje,
      _estado: 'confirmado'
    });
    console.log('✅ Nuevo mensaje con archivo agregado');
  }
  
  this.actualizarUltimoMensajeEnLista(nuevoMensaje);
  
  // Actualizar UI
  setTimeout(() => this.scrollToBottom(), 100);
  this.cdRef.detectChanges();
}

// 🆕 AGREGAR: Método para manejar error de archivo
private manejarErrorArchivo(mensajeCargando: Mensaje, error: any): void {
  console.error('❌ Error subiendo archivo, removiendo mensaje de carga:', (mensajeCargando as any)._idTemporal);
  
  // Remover mensaje de carga
  const index = this.mensajes.findIndex(m => (m as any)._idTemporal === (mensajeCargando as any)._idTemporal);
  if (index !== -1) {
    this.mensajes.splice(index, 1);
    this.cdRef.detectChanges();
    console.log('🗑️ Mensaje de carga removido por error');
  }
  
  this.mostrarError('Error al subir archivo: ' + this.obtenerMensajeError(error));
}

  private obtenerMensajeError(error: any): string {
    if (error.status === 0) return 'No se puede conectar al servidor. Verifique su conexión.';
    if (error.status === 404) return 'Recurso no encontrado.';
    if (error.status === 500) return 'Error interno del servidor.';
    if (error.status === 401) return 'No autorizado. Por favor, inicie sesión nuevamente.';
    if (error.status === 400) return error.error?.message || 'Solicitud incorrecta.';
    return error.error?.message || error.message || 'Ha ocurrido un error inesperado.';
  }

  private mostrarError(mensaje: string): void {
    console.error('💥 Error:', mensaje);
    alert(mensaje);
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) return '';
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      const ahora = new Date();
      const diferencia = ahora.getTime() - date.getTime();
      const minutos = Math.floor(diferencia / 60000);
      const horas = Math.floor(minutos / 60);
      const dias = Math.floor(horas / 24);

      if (dias > 7) return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      if (dias > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
      if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
      if (minutos > 0) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
      return 'Ahora mismo';
    } catch {
      return 'Fecha inválida';
    }
  }



  obtenerIniciales(alumno: Alumno): string {
    const nombre = alumno.nombre?.charAt(0) || '';
    const apellido = alumno.apellido?.charAt(0) || '';
    return (nombre + apellido).toUpperCase() || 'A';
  }

  obtenerInicialesChat(chat: Chat): string {
    const nombre = chat.usuario.nombre?.charAt(0) || '';
    const apellido = chat.usuario.apellido?.charAt(0) || '';
    return (nombre + apellido).toUpperCase() || 'A';
  }

  esMensajePropio(mensaje: Mensaje): boolean {
    return this.currentUser ? mensaje.id_remitente === this.currentUser.id_usuario : false;
  }

  obtenerBadgeInfo(alumno: Alumno): string {
    const curso = alumno.cursos[0] || '';
    const seccion = alumno.secciones[0] || '';
    
    if (curso && seccion) return `${curso} • ${seccion}`;
    if (curso) return curso;
    if (seccion) return seccion;
    return 'Sin información académica';
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.filtrarAlumnos();
  }

  

// 🆕 MEJORAR: Limpieza completa al volver a la lista
// CORREGIR en docente-chat.ts - MEJORAR limpieza
// MEJORAR: Limpieza más completa
// 🟢 CORREGIDO: Método volverALista
volverALista(): void {
  console.log('🔙 Volviendo a la lista de alumnos');
  
  // 🟢 PRIMERO salir del chat si existe, LUEGO limpiar
  if (this.chatSeleccionado) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
    this.chatService.limpiarCacheChat(this.chatSeleccionado.id_chat);
  }
  
  // 🟢 LUEGO limpiar todo
  this.limpiarChatAnterior();
  this.chatSeleccionado = null;
  
  console.log('✅ Limpieza completa realizada');
  this.cdRef.detectChanges();
}

// 🟢 CORREGIR: Método setupWebSocketListeners sin duplicados
private setupWebSocketListeners(): void {
  console.log('🔧 Configurando listeners WebSocket para docente...');

  // Escuchar estado de conexión
  this.subscriptions.add(
    this.chatService.connectionState$.subscribe({
      next: (state: ConnectionState) => {
        console.log('📡 Estado conexión docente:', state.status);
        this.connectionState = state;
        
        // Reconexión automática si está desconectado
        if (state.status === 'disconnected' && this.chatSeleccionado) {
          console.log('🔄 Intentando reconexión automática...');
          setTimeout(() => {
            this.chatService.reconectarWebSocket();
          }, 2000);
        }
        
        this.cdRef.detectChanges();
      },
      error: (error) => console.error('❌ Error en connectionState:', error)
    })
  );

  // 🟢 CORREGIR: Solo UN listener de mensajes
  this.subscriptions.add(
    this.chatService.mensajes$.subscribe({
      next: (mensajesSocket: any[]) => {
        console.log('📥 Mensajes recibidos en tiempo real:', mensajesSocket.length);
        
        if (this.chatSeleccionado && mensajesSocket.length > 0) {
          // 🟢 FILTRAR SOLO mensajes del chat actual Y que no sean propios con archivo
          const mensajesFiltrados = mensajesSocket.filter(m => {
            if (!m || m.id_chat !== this.chatSeleccionado!.id_chat) return false;
            
            // 🟢 CORRECCIÓN: Ignorar mensajes propios con archivo (ya se mostraron optimistamente)
            const esPropio = m.id_remitente === this.currentUser?.id_usuario;
            const tieneArchivo = !!m.archivo;
            
            if (esPropio && tieneArchivo) {
              console.log('🚫 Ignorando mensaje propio con archivo en componente:', m.id_mensaje);
              return false;
            }
            
            return true;
          });
          
          if (mensajesFiltrados.length > 0) {
            console.log('💬 Mensajes filtrados para chat actual:', mensajesFiltrados.length);
            this.procesarMensajesTiempoReal(mensajesFiltrados);
          }
        }
      },
      error: (error) => console.error('❌ Error en mensajes$:', error)
    })
  );
}
// En estudiante-chat.ts y docente-chat.ts
private procesarMensajesTiempoReal(mensajesSocket: any[]): void {
  if (!mensajesSocket || mensajesSocket.length === 0) return;

  console.log('🔄 Procesando mensajes tiempo real:', mensajesSocket.length);
  
  const idsExistentes = new Set(this.mensajes.map(m => m.id_mensaje));
  let mensajesAgregados = 0;

  mensajesSocket.forEach(mensaje => {
    // 🟢 VERIFICACIÓN MÁS ROBUSTA CONTRA DUPLICADOS
    const esDuplicado = idsExistentes.has(mensaje.id_mensaje) || 
                       this.mensajes.some(m => 
                         m.id_remitente === mensaje.id_remitente && 
                         m.contenido === mensaje.contenido && 
                         (!mensaje.archivo || m.archivo?.nombre === mensaje.archivo?.nombre) &&
                         Math.abs(new Date(m.fecha).getTime() - new Date(mensaje.fecha).getTime()) < 3000
                       );

    if (!esDuplicado) {
      // 🟢 NORMALIZAR ESTRUCTURA DEL ARCHIVO
      if (mensaje.archivo) {
        mensaje.archivo = {
          url: mensaje.archivo.url || '',
          ruta: mensaje.archivo.ruta || '',
          nombre: mensaje.archivo.nombre || 'Archivo sin nombre',
          tipo: mensaje.archivo.tipo || 'application/octet-stream',
          tamano: mensaje.archivo.tamano || mensaje.archivo.tamano || 0
        };
      }
      
      this.mensajes.push(mensaje);
      mensajesAgregados++;
      idsExistentes.add(mensaje.id_mensaje);
      
      console.log('✅ Mensaje agregado en tiempo real:', {
        id: mensaje.id_mensaje,
        remitente: mensaje.id_remitente,
        tieneArchivo: !!mensaje.archivo
      });
    } else {
      console.log('⚠️ Mensaje duplicado ignorado en tiempo real:', mensaje.id_mensaje);
    }
  });

  if (mensajesAgregados > 0) {
    console.log(`🆕 Agregados ${mensajesAgregados} mensajes en tiempo real`);
    
    // Ordenar por fecha
    this.mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    // Scroll automático solo si el usuario está abajo
    if (this.autoScrollEnabled) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
    
    this.cdRef.detectChanges();
  }
}

// 🟢 AGREGAR: Método faltante
private limpiarChatAnterior(): void {
  console.log('🧹 Limpiando chat anterior...');
  
  this.mensajes = [];
  this.nuevoMensaje = '';
  this.archivoSeleccionado = null;
  this.uploadProgreso = 0;
  this.autoScrollEnabled = true;
  this.paginacionMensajes = null;
  
  if (this.chatSeleccionado) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
  }
}

// AGREGAR en docente-chat.ts - Método de debug
private debugMensajes(mensajes: Mensaje[], fuente: string): void {
  console.log(`🔍 DEBUG ${fuente}:`, {
    cantidad: mensajes.length,
    ids: mensajes.map(m => m.id_mensaje),
    contenidos: mensajes.map(m => m.contenido?.substring(0, 50)),
    tieneArchivos: mensajes.filter(m => m.archivo).length
  });
}

  limpiarFiltroSecciones(): void {
    this.seccionSeleccionada = null;
    this.mostrarSelectorSecciones = false;
    console.log('🎯 Filtro de sección limpiado - Mostrando TODOS los alumnos');
    this.filtrarAlumnos();
  }

  trackByAlumnoId(index: number, alumno: Alumno): number {
    return alumno.id_estudiante;
  }

  trackByMensajeId(index: number, mensaje: Mensaje): number {
    return mensaje.id_mensaje;
  }

  trackBySeccionId(index: number, seccion: Seccion): number {
    return seccion.id_seccion;
  }
  

  
}

