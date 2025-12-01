// estudiante-chat.ts - ARCHIVO COMPLETO
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

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

interface Docente {
  id_docente: number;
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  seccion: string;
  cursos: string[];
  tieneChat: boolean;
  chatExistente: {
    id_chat: number;
    ultimo_mensaje: string | null;
    fecha_ultimo_mensaje: string | null;
    totalMensajes: number;
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
  archivo?: {
    url: string;
    ruta: string;
    nombre: string;
    tipo: string;
  };
}

@Component({
  selector: 'app-estudiante-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-chat.html',
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
`]
})
export class EstudianteChat implements OnInit, OnDestroy {
   archivoSeleccionado: File | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;


  // 🟢 AGREGAR propiedad para estado de conexión
  conexionEstado: 'conectado' | 'conectando' | 'desconectado' = 'conectando';

  // Datos principales
  docentes: Docente[] = [];
  mensajes: Mensaje[] = [];
  chatSeleccionado: Chat | null = null;
  nuevoMensaje: string = '';

  // Estados de carga
  cargandoDocentes: boolean = false;
  cargandoMensajes: boolean = false;
  enviandoMensaje: boolean = false;
  errorDocentes: string = '';

  private ultimoMensajeEnviado: string = '';
  private ultimoEnvioTimestamp: number = 0;

  // Usuario actual
  currentUser: any = null;

  // Control responsive
  isMobile: boolean = false;

  // Sistema de cursos y compañeros
  cursos: any[] = [];
cursoSeleccionado: any = null;
companeros: any[] = [];
mostrarSelectorCursos: boolean = false;
vistaActiva: 'docentes' | 'companeros' = 'docentes';

// 🟢 MÉTODOS PARA MANEJO DE ARCHIVOS
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.mostrarError('El archivo es demasiado grande. Máximo 10MB permitido.');
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
        return;
      }
      
      this.archivoSeleccionado = file;
      console.log('📎 Archivo seleccionado:', file.name, file.size, file.type);
    }
  }

   removerArchivo(): void {
    this.archivoSeleccionado = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Control de scroll
  private autoScrollEnabled: boolean = true;
  
  private connectionStateSubscription?: Subscription;

  // Subscripciones
  private subscriptions: Subscription = new Subscription();

  

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef
  ) {}

  isWebSocketConnected(): boolean {
    const conectado = this.chatService.isWebSocketConnected();
    this.conexionEstado = conectado ? 'conectado' : 'desconectado';
    return conectado;
  }

   // 🟢 AGREGAR método para obtener clase CSS dinámica
  getConnectionClass(): string {
    switch (this.conexionEstado) {
      case 'conectado': return 'text-green-500';
      case 'conectando': return 'text-yellow-500';
      case 'desconectado': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  getConnectionText(): string {
    switch (this.conexionEstado) {
      case 'conectado': return 'Conectado';
      case 'conectando': return 'Conectando...';
      case 'desconectado': return 'Desconectado';
      default: return 'Sin conexión';
    }
  }

  getConnectionStatus(): string {
    return this.isWebSocketConnected() ? 'Conectado' : 'Conectando...';
  }

 ngOnInit(): void {
  console.log('🎯 Inicializando chat de ESTUDIANTE');
  
  this.obtenerUsuarioActual();
  this.checkScreenSize();
  
  // 🟢 MEJOR ORDEN DE INICIALIZACIÓN
  setTimeout(() => {
    this.inicializarWebSocket();
    this.configurarWebSocketListeners();

    
  }, 1500);
}



  // 🆕 CONFIGURAR LISTENERS DE WEBSOCKET
  private configurarWebSocketListeners(): void {
    console.log('🔧 Configurando listeners WebSocket para estudiante...');

    // Escuchar estado de conexión
    this.connectionStateSubscription = this.chatService.connectionState$.subscribe({
      next: (state) => {
        console.log('📡 Estado conexión estudiante:', state.status);
        
        // 🟢 ACTUALIZAR estado local
        switch (state.status) {
          case 'connected': 
            this.conexionEstado = 'conectado';
            break;
          case 'connecting': 
            this.conexionEstado = 'conectando';
            break;
          case 'disconnected': 
          case 'error':
            this.conexionEstado = 'desconectado';
            break;
        }
        
        this.cdRef.detectChanges();
        
        // Reconectar automáticamente si se desconecta
        if (state.status === 'disconnected' && this.chatSeleccionado) {
          setTimeout(() => {
            if (this.chatSeleccionado && !this.chatService.isWebSocketConnected()) {
              console.log('🔄 Reconectando WebSocket...');
              this.chatService.reconectarWebSocket();
            }
          }, 3000);
        }
      },
      error: (error) => console.error('❌ Error en connectionState:', error)
    });

  // Escuchar mensajes en tiempo real
  this.subscriptions.add(
    this.chatService.mensajes$.subscribe({
      next: (mensajesSocket: Mensaje[]) => {
        if (this.chatSeleccionado && mensajesSocket.length > 0) {
          const mensajesFiltrados = mensajesSocket.filter(m => 
            m.id_chat === this.chatSeleccionado!.id_chat
          );
          
          if (mensajesFiltrados.length > 0) {
            console.log('🆕 Mensajes en tiempo real recibidos:', mensajesFiltrados.length);
            this.procesarMensajesTiempoReal(mensajesFiltrados);
          }
        }
      },
      error: (error) => console.error('❌ Error en mensajes$:', error)
    })
  );
}

  // 🆕 PROCESAR MENSAJES EN TIEMPO REAL
// 🟢 CORREGIDO: Procesamiento más estricto de mensajes
private procesarMensajesTiempoReal(mensajesSocket: any[]): void {
  if (!mensajesSocket || mensajesSocket.length === 0) return;

  console.log('🔄 Procesando mensajes tiempo real:', mensajesSocket.length);
  
  const idsExistentes = new Set(this.mensajes.map(m => m.id_mensaje));
  let mensajesAgregados = 0;
  let mensajesDuplicados = 0;

  mensajesSocket.forEach(mensaje => {
    // 🟢 VERIFICACIÓN MÁS ESTRICTA - Evitar cualquier duplicado
    const esDuplicado = idsExistentes.has(mensaje.id_mensaje) || 
                       this.mensajes.some(m => 
                         m.id_remitente === mensaje.id_remitente && 
                         m.contenido === mensaje.contenido && 
                         Math.abs(new Date(m.fecha).getTime() - new Date(mensaje.fecha).getTime()) < 3000
                       );

    if (!esDuplicado) {
      this.mensajes.push(mensaje);
      mensajesAgregados++;
      console.log('✅ Mensaje agregado:', mensaje.id_mensaje);
    } else {
      mensajesDuplicados++;
      console.log('🚫 Mensaje duplicado ignorado:', mensaje.id_mensaje);
    }
  });

  if (mensajesAgregados > 0) {
    console.log(`🆕 Agregados ${mensajesAgregados} mensajes en tiempo real (${mensajesDuplicados} duplicados ignorados)`);
    
    // Ordenar por fecha
    this.mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    // Scroll automático solo si el usuario está abajo
    if (this.autoScrollEnabled) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
    
    this.cdRef.detectChanges();
  } else if (mensajesDuplicados > 0) {
    console.log(`⚠️ Todos los mensajes eran duplicados (${mensajesDuplicados} ignorados)`);
  }
}

// 🟢 MEJORAR: Configuración completa del WebSocket
private setupWebSocketListeners(): void {
  console.log('🔧 Configurando listeners WebSocket para estudiante...');

  // Limpiar suscripciones anteriores
  if (this.connectionStateSubscription) {
    this.connectionStateSubscription.unsubscribe();
  }

  // Escuchar estado de conexión
  this.connectionStateSubscription = this.chatService.connectionState$.subscribe({
    next: (state) => {
      console.log('📡 Estado conexión estudiante:', state.status);
      
      // 🟢 ACTUALIZAR estado local
      switch (state.status) {
        case 'connected': 
          this.conexionEstado = 'conectado';
          break;
        case 'connecting': 
          this.conexionEstado = 'conectando';
          break;
        case 'disconnected': 
        case 'error':
          this.conexionEstado = 'desconectado';
          break;
      }
      
      this.cdRef.detectChanges();
      
      // Reconectar automáticamente si se desconecta
      if (state.status === 'disconnected' && this.chatSeleccionado) {
        setTimeout(() => {
          if (this.chatSeleccionado && !this.isWebSocketConnected()) {
            console.log('🔄 Reconectando WebSocket...');
            this.chatService.reconectarWebSocket();
          }
        }, 3000);
      }
    },
    error: (error) => console.error('❌ Error en connectionState:', error)
  });

  // 🟢 CORRECCIÓN: Escuchar mensajes en tiempo real SIN filtrar por remitente
  this.subscriptions.add(
    this.chatService.mensajes$.subscribe({
      next: (mensajesSocket: any[]) => {
        console.log('📥 Mensajes recibidos en estudiante:', mensajesSocket.length);
        
        if (this.chatSeleccionado && mensajesSocket.length > 0) {
          // Filtrar solo mensajes del chat actual
          const mensajesFiltrados = mensajesSocket.filter(m => 
            m && m.id_chat === this.chatSeleccionado!.id_chat
          );
          
          if (mensajesFiltrados.length > 0) {
            console.log('💬 Mensajes filtrados para chat actual:', mensajesFiltrados.length);
            this.procesarMensajesTiempoReal(mensajesFiltrados);
          }
        }
      },
      error: (error) => console.error('❌ Error en mensajes$ estudiante:', error)
})
  );
       // Escuchar notificaciones
  this.subscriptions.add(
    this.chatService.notificaciones$.subscribe({
      next: (notificacion) => {
        if (notificacion && notificacion.type === 'error') {
          console.error('❌ Error recibido:', notificacion.message);
          this.mostrarError(notificacion.message);
        }
      }
    })
  );
}

// 🟢 CORREGIDO: Método mejorado para seleccionar chat
private configurarChatParaEstudiante(id_chat: number): void {
  console.log('💬 Configurando chat para estudiante, ID:', id_chat);

    this.limpiarMensajesAlCambiarChat();

  // 🟢 IMPORTANTE: Unirse al chat a través del servicio
  this.chatService.unirseAlChat(id_chat);
  
  // 🟢 Cargar mensajes iniciales
  this.cargarMensajes(id_chat);
  
  console.log('✅ Chat configurado para estudiante:', id_chat);
}

  // 🆕 MEJORAR inicialización de WebSocket
  // 🟢 AGREGAR: Inicialización mejorada del WebSocket
// 🟢 CORREGIDO: Inicialización mejorada del WebSocket
private inicializarWebSocket(): void {
  console.log('🔄 Inicializando WebSocket específico para estudiante...');
  
  // Esperar a que el usuario esté disponible
  setTimeout(() => {
    if (!this.currentUser) {
      console.log('⏳ Esperando usuario para conectar WebSocket...');
      this.inicializarWebSocket();
      return;
    }

    // Forzar reconexión si es necesario
    if (!this.isWebSocketConnected()) {
      console.log('🔌 WebSocket desconectado, reconectando para estudiante...');
      this.chatService.reconectarWebSocket();
    }

    // 🟢 CONFIGURACIÓN ESPECÍFICA PARA ESTUDIANTE
    this.setupWebSocketListeners();
    
  }, 1000);
}
  
// 🟢 Cargar cursos del estudiante
cargarCursos(): void {
  if (!this.currentUser?.id_estudiante) {
    console.error('❌ No hay ID de estudiante para cargar cursos');
    return;
  }

  console.log('📚 Cargando cursos para estudiante:', this.currentUser.id_estudiante);
  
  this.subscriptions.add(
    this.chatService.obtenerCursosEstudiante(this.currentUser.id_estudiante).subscribe({
      next: (response: any) => {
        console.log('✅ Cursos recibidos:', response);
        
        let cursosData = response;
        if (response && response.data) {
          cursosData = response.data;
        }
        
        if (Array.isArray(cursosData)) {
          this.cursos = cursosData;
          console.log(`📚 ${this.cursos.length} cursos cargados`);
          
          // Seleccionar primer curso por defecto si hay cursos
          if (this.cursos.length > 0 && !this.cursoSeleccionado) {
            this.cursoSeleccionado = this.cursos[0];
            console.log('🎯 Curso seleccionado por defecto:', this.cursoSeleccionado.nombre);
            this.cargarDocentes(); // Cargar docentes del curso seleccionado
          }
        } else {
          console.error('❌ Formato de cursos inválido:', response);
          this.cursos = [];
        }
        
        this.cdRef.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error al cargar cursos:', error);
        this.mostrarError('Error al cargar cursos: ' + this.obtenerMensajeError(error));
      }
    })
  );
}

// 🟢 Seleccionar curso
seleccionarCurso(curso: any): void {
  if (!curso) return;
  
  this.cursoSeleccionado = curso;
  this.mostrarSelectorCursos = false;
  console.log('🎯 Curso seleccionado:', curso.nombre);
  
  // Recargar docentes y compañeros del curso seleccionado
  this.cargarDocentes();
  this.cargarCompaneros();
}

// 🟢 Cambiar entre vista de docentes y compañeros
cambiarVista(vista: 'docentes' | 'companeros'): void {
  this.vistaActiva = vista;
  console.log('👁️ Cambiando a vista:', vista);
  
  if (vista === 'companeros' && this.companeros.length === 0) {
    this.cargarCompaneros();
  }
}



// 🟢 Cargar compañeros del curso
cargarCompaneros(): void {
  if (!this.currentUser?.id_estudiante || !this.cursoSeleccionado) {
    console.error('❌ Faltan datos para cargar compañeros');
    return;
  }

  console.log('👥 Cargando compañeros para curso:', this.cursoSeleccionado.nombre);
  
  this.subscriptions.add(
    this.chatService.obtenerCompanerosCurso(
      this.currentUser.id_estudiante, 
      this.cursoSeleccionado.id_curso
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Compañeros recibidos:', response);
        
        let companerosData = response;
        if (response && response.data) {
          companerosData = response.data;
        }
        
        if (Array.isArray(companerosData)) {
          this.companeros = companerosData;
          console.log(`👥 ${this.companeros.length} compañeros cargados`);
        } else {
          console.error('❌ Formato de compañeros inválido:', response);
          this.companeros = [];
        }
        
        this.cdRef.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error al cargar compañeros:', error);
        this.mostrarError('Error al cargar compañeros: ' + this.obtenerMensajeError(error));
      }
    })
  );
}

  ngOnDestroy(): void {
    console.log('🔚 Destruyendo componente estudiante-chat');
    if (this.chatSeleccionado) {
      this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
    }
    this.subscriptions.unsubscribe();
     if (this.connectionStateSubscription) {
    this.connectionStateSubscription.unsubscribe();
  }
  
  // Limpiar mensajes del servicio
  this.chatService.limpiarMensajes();
  
  console.log('✅ Componente estudiante-chat destruido correctamente');
  }

  @HostListener('window:resize')
  checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
    this.cdRef.detectChanges();
  }

  // ENCONTRAR ESTE MÉTODO y MODIFICAR la última parte:
obtenerUsuarioActual(): void {
  try {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.errorDocentes = 'No hay usuario autenticado.';
      return;
    }

    const idEstudiante = this.currentUser.id_estudiante;
    
    if (!idEstudiante) {
      this.errorDocentes = 'Error: No se pudo identificar el perfil de estudiante.';
      return;
    }

    // 🆕 CAMBIAR esta línea:
    // this.cargarDocentes(idEstudiante); // ← LINEA ORIGINAL
    // POR:
    this.cargarCursos(); // ← NUEVA LÍNEA
    
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    this.errorDocentes = 'Error al cargar la información del usuario';
  }
}

  cargarDocentes(): void {
  if (!this.cursoSeleccionado) {
    console.warn('⚠️ No hay curso seleccionado para cargar docentes');
    return;
  }

  if (!this.currentUser?.id_estudiante) {
    console.error('❌ No hay ID de estudiante');
    return;
  }

  this.cargandoDocentes = true;
  this.errorDocentes = '';

  console.log('👨‍🏫 Cargando docentes para estudiante:', this.currentUser.id_estudiante);

  this.subscriptions.add(
    this.chatService.obtenerDocentesParaChat(this.currentUser.id_estudiante).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta de docentes:', response);
        
        let docentesData = response;
        if (response && response.data) {
          docentesData = response.data;
        }
        
        if (Array.isArray(docentesData)) {
          this.docentes = docentesData;
          console.log(`✅ ${this.docentes.length} docentes cargados`);
        } else {
          console.error('❌ Formato de docentes inválido:', response);
          this.docentes = [];
          this.errorDocentes = 'Error en el formato de docentes recibido.';
        }
        
        this.cargandoDocentes = false;
        this.cdRef.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Error al cargar docentes:', error);
        this.errorDocentes = this.obtenerMensajeError(error);
        this.cargandoDocentes = false;
        this.cdRef.detectChanges();
      }
    })
  );
}

seleccionarCompanero(companero: any): void {
  console.log('🎯 Seleccionando compañero:', companero.nombre);

  if (!this.validarCompaneroSeleccionable(companero)) {
    return;
  }

  try {
    if (companero.tieneChat && companero.chatExistente?.id_chat) {
      this.inicializarChatExistenteCompanero(companero);
    } else {
      this.crearNuevoChatCompanero(companero);
    }
  } catch (error) {
    console.error('❌ Error al seleccionar compañero:', error);
    this.mostrarError('Error al seleccionar compañero: ' + this.obtenerMensajeError(error));
  }
}

private validarCompaneroSeleccionable(companero: any): boolean {
  if (!this.currentUser) {
    this.errorDocentes = 'No se pudo identificar al estudiante';
    return false;
  }

  if (this.enviandoMensaje) {
    console.warn('⚠️ No se puede seleccionar compañero mientras se envía mensaje');
    return false;
  }

  if (!companero || !companero.id_estudiante) {
    console.error('❌ Compañero inválido');
    return false;
  }

  return true;
}

private inicializarChatExistenteCompanero(companero: any): void {
  if (!companero.chatExistente) {
    console.error('❌ No hay chat existente para inicializar');
    return;
  }

  this.chatSeleccionado = {
    id_chat: companero.chatExistente.id_chat,
    usuario: {
      id_usuario: companero.id_usuario,
      nombre: companero.nombre || 'Compañero',
      apellido: companero.apellido || '',
      correo: companero.correo || '',
      rol: 'estudiante'
    },
    curso: this.cursoSeleccionado?.nombre || 'Curso actual',
    seccion: companero.seccion || 'Sección no asignada',
    ultimo_mensaje: companero.chatExistente.ultimo_mensaje,
    fecha_ultimo_mensaje: companero.chatExistente.fecha_ultimo_mensaje
  };
  
  console.log('💬 Chat con compañero seleccionado:', this.chatSeleccionado);
  
  this.cdRef.detectChanges();
  
  // 🟢 USAR EL MÉTODO CORREGIDO
  this.configurarChatParaEstudiante(companero.chatExistente.id_chat);
}


private crearNuevoChatCompanero(companero: any): void {
  console.log('🆕 Iniciando chat con compañero:', companero.nombre);
  
  // 🟢 USAR EL MÉTODO ESPECÍFICO PARA CHATS ENTRE ESTUDIANTES
  const chatData = {
    id_estudiante1: this.currentUser.id_estudiante,
    id_estudiante2: companero.id_estudiante,
    id_curso: this.cursoSeleccionado?.id_curso || null,
    id_seccion: undefined
  };

  console.log('📤 Datos para chat entre estudiantes:', chatData);

  this.subscriptions.add(
    this.chatService.crearChatEntreEstudiantes(chatData).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta de crear chat con compañero:', response);
        
        const nuevoChat = response.data || response;
        
        if (nuevoChat && nuevoChat.id_chat) {
          console.log('✅ Chat con compañero creado exitosamente, ID:', nuevoChat.id_chat);
          this.inicializarChatDesdeRespuestaCompanero(companero, nuevoChat);
        } else {
          console.error('❌ Chat creado pero sin ID válido:', response);
          this.mostrarError('Error: No se pudo crear el chat correctamente');
        }
      },
      error: (error: any) => {
        console.error('❌ Error al crear chat con compañero:', error);
        this.mostrarError('Error al crear chat: ' + this.obtenerMensajeError(error));
      }
    })
  );
}

private inicializarChatDesdeRespuestaCompanero(companero: any, nuevoChat: any): void {
  this.chatSeleccionado = {
    id_chat: nuevoChat.id_chat,
    usuario: {
      id_usuario: companero.id_usuario,
      nombre: companero.nombre || 'Compañero',
      apellido: companero.apellido || '',
      correo: companero.correo || '',
      rol: 'estudiante'
    },
    curso: nuevoChat.curso?.nombre || this.cursoSeleccionado?.nombre || 'Curso actual',
    seccion: nuevoChat.seccion?.nombre || companero.seccion || 'Sección no asignada',
    ultimo_mensaje: null,
    fecha_ultimo_mensaje: null
  };
  
  console.log('💬 NUEVO Chat con compañero:', this.chatSeleccionado);
  
  this.cdRef.detectChanges();
  this.cargarMensajes(nuevoChat.id_chat);
  this.conectarWebSocket();
}

// 🟢 Métodos de utilidad para compañeros
obtenerInicialesCompanero(companero: any): string {
  const nombre = companero.nombre?.charAt(0) || '';
  const apellido = companero.apellido?.charAt(0) || '';
  return (nombre + apellido).toUpperCase() || 'C';
}

trackByCompaneroId(index: number, companero: any): number {
  return companero.id_estudiante;
}

  seleccionarDocente(docente: Docente): void {
    console.log('🎯 Seleccionando docente:', docente.nombre);

    if (!this.validarDocenteSeleccionable(docente)) {
      return;
    }

    try {
      if (docente.tieneChat && docente.chatExistente?.id_chat) {
        this.inicializarChatExistente(docente);
      } else {
        this.crearNuevoChat(docente);
      }
    } catch (error) {
      console.error('❌ Error al seleccionar docente:', error);
      this.mostrarError('Error al seleccionar docente: ' + this.obtenerMensajeError(error));
    }
  }

  

  private validarDocenteSeleccionable(docente: Docente): boolean {
    if (!this.currentUser) {
      this.errorDocentes = 'No se pudo identificar al estudiante';
      return false;
    }

    if (this.enviandoMensaje) {
      console.warn('⚠️ No se puede seleccionar docente mientras se envía mensaje');
      return false;
    }

    if (!docente || !docente.id_docente) {
      console.error('❌ Docente inválido');
      return false;
    }

    return true;
  }

  private inicializarChatExistente(docente: Docente): void {
    if (!docente.chatExistente) {
      console.error('❌ No hay chat existente para inicializar');
      return;
    }

    this.chatSeleccionado = {
      id_chat: docente.chatExistente.id_chat,
      usuario: {
        id_usuario: docente.id_usuario,
        nombre: docente.nombre || 'Docente',
        apellido: docente.apellido || '',
        correo: docente.correo || '',
        rol: 'docente'
      },
      curso: docente.cursos[0] || 'Curso no asignado',
      seccion: docente.seccion || 'Sección no asignada',
      ultimo_mensaje: docente.chatExistente.ultimo_mensaje,
      fecha_ultimo_mensaje: docente.chatExistente.fecha_ultimo_mensaje
    };
    
    console.log('💬 Chat seleccionado:', this.chatSeleccionado);
    
    this.cdRef.detectChanges();
  
  // 🟢 USAR EL MÉTODO CORREGIDO
  this.configurarChatParaEstudiante(docente.chatExistente.id_chat);
  }

  private crearNuevoChat(docente: Docente): void {
    const chatData = {
      id_docente: docente.id_docente,
      id_estudiante: this.currentUser.id_estudiante,
      id_curso: docente.cursos.length > 0 ? null : null, // El backend manejará esto
      id_seccion: null // El backend manejará esto
    };

    console.log('🆕 Creando nuevo chat para docente:', docente.nombre);

    this.subscriptions.add(
      this.chatService.crearChat(chatData).subscribe({
        next: (response: any) => {
          console.log('✅ Respuesta de crear chat:', response);
          
          const nuevoChat = response.data || response;
          
          if (nuevoChat && nuevoChat.id_chat) {
            console.log('✅ Chat creado exitosamente, ID:', nuevoChat.id_chat);
            this.inicializarChatDesdeRespuesta(docente, nuevoChat);
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

  private inicializarChatDesdeRespuesta(docente: Docente, nuevoChat: any): void {
    this.chatSeleccionado = {
      id_chat: nuevoChat.id_chat,
      usuario: {
        id_usuario: docente.id_usuario,
        nombre: docente.nombre || 'Docente',
        apellido: docente.apellido || '',
        correo: docente.correo || '',
        rol: 'docente'
      },
      curso: nuevoChat.curso?.nombre || docente.cursos[0] || 'Curso no asignado',
      seccion: nuevoChat.seccion?.nombre || docente.seccion || 'Sección no asignada',
      ultimo_mensaje: null,
      fecha_ultimo_mensaje: null
    };
    
    console.log('💬 NUEVO Chat seleccionado:', this.chatSeleccionado);
    
    this.cdRef.detectChanges();
    this.cargarMensajes(nuevoChat.id_chat);
    this.conectarWebSocket();
  }

  private cargarMensajes(id_chat: number): void {
    this.cargandoMensajes = true;
    this.mensajes = [];

    this.subscriptions.add(
      this.chatService.obtenerMensajes(id_chat).subscribe({
        next: (response: any) => {
          console.log('✅ Mensajes cargados:', response);
          
          let mensajesData: any[] = [];

          if (response && response.data) {
            if (Array.isArray(response.data)) {
              mensajesData = response.data;
            } else if (response.data.mensajes && Array.isArray(response.data.mensajes)) {
              mensajesData = response.data.mensajes;
            }
          } else if (Array.isArray(response)) {
            mensajesData = response;
          }

          this.mensajes = this.procesarMensajesBackend(mensajesData);
          this.cargandoMensajes = false;
          
          setTimeout(() => {
            this.scrollToBottom();
            this.autoScrollEnabled = true;
          }, 100);
          
          this.cdRef.detectChanges();
        },
        error: (error: any) => {
          console.error('❌ Error al cargar mensajes:', error);
          this.cargandoMensajes = false;
          this.mostrarError('Error al cargar mensajes: ' + this.obtenerMensajeError(error));
          this.cdRef.detectChanges();
        }
      })
    );
  }

  private procesarMensajesBackend(mensajesData: any[]): Mensaje[] {
    return mensajesData
      .filter(msg => msg && msg.id_mensaje && msg.contenido && msg.fecha && msg.id_remitente)
      .map(msg => ({
        id_mensaje: msg.id_mensaje,
        contenido: msg.contenido,
        fecha: msg.fecha,
        id_chat: msg.id_chat,
        id_remitente: msg.id_remitente,
        remitente: msg.remitente || {
          id_usuario: msg.id_remitente,
          correo: msg.remitente?.correo || 'sin-correo',
          rol: msg.remitente?.rol || 'docente'
        },
        archivo: msg.archivo
      }));
  }

// 🟢 MEJORAR el método de conexión WebSocket
private conectarWebSocket(): void {
  if (this.chatSeleccionado) {
    console.log('💬 Conectando WebSocket al chat:', this.chatSeleccionado.id_chat);
    this.chatService.unirseAlChat(this.chatSeleccionado.id_chat);
    
    // 🟢 LIMPIAR MENSAJES ANTERIORES al cambiar de chat
    this.chatService.limpiarMensajes();
  }
}


  private agregarMensajeEnTiempoReal(mensaje: Mensaje): void {
    const mensajeExiste = this.mensajes.some(m => m.id_mensaje === mensaje.id_mensaje);
    
    if (!mensajeExiste) {
      this.mensajes.push(mensaje);
      
      if (this.autoScrollEnabled) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
      
      this.cdRef.detectChanges();
    }
  }

// 🟢 CORREGIR: Método enviarMensaje para estudiante
async enviarMensaje(): Promise<void> {
  // 🔴 PROTECCIÓN MEJORADA CONTRA DOBLE ENVÍO
  if (this.enviandoMensaje) {
    console.warn('🚫 Envío en progreso - Evitando doble envío');
    return;
  }

  const contenido = this.nuevoMensaje.trim();
  const tieneContenido = contenido.length > 0;
  const tieneArchivo = !!this.archivoSeleccionado;

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

  // 🟢 EVITAR ENVÍOS DUPLICADOS RÁPIDOS
  const mensajeIdentificador = `${contenido}_${tieneArchivo}_${Date.now()}`;
  if (this.ultimoMensajeEnviado === mensajeIdentificador && Date.now() - this.ultimoEnvioTimestamp < 2000) {
    console.warn('🚫 Mensaje duplicado detectado');
    return;
  }

  this.enviandoMensaje = true;
  this.ultimoMensajeEnviado = mensajeIdentificador;
  this.ultimoEnvioTimestamp = Date.now();

  console.log('📤 Iniciando envío de mensaje (estudiante):', { 
    tieneContenido, 
    tieneArchivo,
    chatId: this.chatSeleccionado.id_chat 
  });

  try {
    if (tieneArchivo) {
      await this.enviarMensajeConArchivo(contenido);
    } else {
      await this.enviarMensajeNormal(contenido);
    }
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    this.mostrarError('Error al enviar mensaje: ' + this.obtenerMensajeError(error));
  } finally {
    // 🔴 RESETEO GARANTIZADO CON TIMEOUT DE SEGURIDAD
    setTimeout(() => {
      this.enviandoMensaje = false;
    }, 500);
  }
}

  // 🟢 MÉTODO PARA ENVIAR MENSAJE CON ARCHIVO
// 🟢 CORREGIR: Enviar mensaje con archivo
private async enviarMensajeConArchivo(contenido: string): Promise<void> {
  // 🟢 VERIFICAR que el archivo existe ANTES de continuar

  if (!this.archivoSeleccionado) {
    console.error('❌ No hay archivo seleccionado para enviar');
    this.mostrarError('No se ha seleccionado ningún archivo');
    return;
  }
  // Mensaje optimista para UI inmediata
  const mensajeOptimista: Mensaje = {
    id_mensaje: Date.now(),
    contenido: contenido || '📎 Archivo compartido',
    fecha: new Date().toISOString(),
    id_chat: this.chatSeleccionado!.id_chat,
    id_remitente: this.currentUser.id_usuario,
    remitente: {
      id_usuario: this.currentUser.id_usuario,
      correo: this.currentUser.correo,
      rol: this.currentUser.rol
    },
    archivo: {
      url: '', // Se llenará con la respuesta del servidor
      ruta: '',
      nombre: this.archivoSeleccionado!.name,
      tipo: this.archivoSeleccionado!.type
    }
  };

  this.mensajes.push(mensajeOptimista);
  this.nuevoMensaje = '';
  this.autoScrollEnabled = true;
  setTimeout(() => this.scrollToBottom(), 50);

  return new Promise((resolve, reject) => {
    const subscription = this.chatService.enviarMensajeConArchivo({
      contenido: contenido || '📎 Archivo compartido',
      id_chat: this.chatSeleccionado!.id_chat,
      id_remitente: this.currentUser.id_usuario
    }, this.archivoSeleccionado!).subscribe({
      next: (response: any) => {
        console.log('✅ Mensaje con archivo enviado:', response);
        this.procesarRespuestaMensaje(response, mensajeOptimista);
        this.archivoSeleccionado = null;
        this.enviandoMensaje = false;
        resolve();
        subscription.unsubscribe();
      },
      error: (error: any) => {
        console.error('❌ Error enviando mensaje con archivo:', error);
        this.manejarErrorEnvioMensaje(mensajeOptimista, error);
        this.enviandoMensaje = false;
        reject(error);
        subscription.unsubscribe();
      }
    });
  });
}

// 🟢 AGREGAR: Actualizar último mensaje en la lista
private actualizarUltimoMensajeEnLista(nuevoMensaje: any): void {
  // Actualizar el último mensaje en la lista de docentes o compañeros
  if (this.chatSeleccionado) {
    const usuarioId = this.chatSeleccionado.usuario.id_usuario;
    
    // Buscar en docentes
    const docenteIndex = this.docentes.findIndex(d => d.id_usuario === usuarioId);
    if (docenteIndex !== -1 && this.docentes[docenteIndex].chatExistente) {
      this.docentes[docenteIndex].chatExistente!.ultimo_mensaje = nuevoMensaje.contenido;
      this.docentes[docenteIndex].chatExistente!.fecha_ultimo_mensaje = nuevoMensaje.fecha;
    }
    
    // Buscar en compañeros
    const companeroIndex = this.companeros.findIndex(c => c.id_usuario === usuarioId);
    if (companeroIndex !== -1 && this.companeros[companeroIndex].chatExistente) {
      this.companeros[companeroIndex].chatExistente!.ultimo_mensaje = nuevoMensaje.contenido;
      this.companeros[companeroIndex].chatExistente!.fecha_ultimo_mensaje = nuevoMensaje.fecha;
    }
  }
}

  // 🟢 MÉTODO PARA ENVIAR MENSAJE NORMAL
// 🟢 CORREGIDO: Enviar mensaje normal SIN procesamiento duplicado
private async enviarMensajeNormal(contenido: string): Promise<void> {
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
    // 🟢 USAR SOLO EL SERVICIO PRINCIPAL
    const resultado = this.chatService.enviarMensaje({
      contenido,
      id_chat: this.chatSeleccionado!.id_chat,
      id_remitente: this.currentUser.id_usuario
    }, true); // true = usar WebSocket

    if (resultado && 'subscribe' in resultado) {
      // 🟢 SOLO HTTP: Suscribirse para confirmación
      await new Promise((resolve, reject) => {
        resultado.subscribe({
          next: (response: any) => {
            console.log('✅ Mensaje confirmado por HTTP:', response);
            // Reemplazar mensaje optimista con el real
            this.reemplazarMensajeOptimista(mensajeOptimista, response);
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
      // NO llamar a procesarRespuestaMensaje - el WebSocket lo hará
    }
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    this.manejarErrorEnvioMensaje(mensajeOptimista, error);
    throw error;
  }
}

// 🟢 MEJORADO: Agregar mensaje optimista con verificación
private agregarMensajeOptimista(mensaje: Mensaje): void {
  // Verificar que no sea duplicado
  const esDuplicado = this.mensajes.some(m => 
    m.id_remitente === mensaje.id_remitente && 
    m.contenido === mensaje.contenido &&
    Math.abs(new Date(m.fecha).getTime() - new Date(mensaje.fecha).getTime()) < 1000
  );

  if (!esDuplicado) {
    this.mensajes.push(mensaje);
    this.nuevoMensaje = '';
    this.archivoSeleccionado = null;
    this.autoScrollEnabled = true;
    
    setTimeout(() => this.scrollToBottom(), 50);
    this.cdRef.detectChanges();
    
    console.log('📝 Mensaje optimista agregado:', mensaje.id_mensaje);
  } else {
    console.warn('🚫 Mensaje optimista duplicado, ignorando:', mensaje.id_mensaje);
  }
}

// 🟢 AGREGAR: Método para agregar mensaje optimista
// 🟢 AGREGAR: Método para reemplazar mensaje optimista con el real
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

// 🟢 AGREGAR: Propiedades para control de envíos rápidos
private ultimoEnvioTime: number = 0;
private readonly TIEMPO_ENTRE_ENVIOS = 1000; // 1 segundo

private puedeEnviarMensaje(): boolean {
  const ahora = Date.now();
  const tiempoDesdeUltimoEnvio = ahora - this.ultimoEnvioTime;
  
  if (tiempoDesdeUltimoEnvio < this.TIEMPO_ENTRE_ENVIOS) {
    console.warn(`🚫 Espere ${this.TIEMPO_ENTRE_ENVIOS - tiempoDesdeUltimoEnvio}ms antes de enviar otro mensaje`);
    this.mostrarError(`Espere ${Math.ceil((this.TIEMPO_ENTRE_ENVIOS - tiempoDesdeUltimoEnvio) / 1000)} segundos antes de enviar otro mensaje`);
    return false;
  }
  
  this.ultimoEnvioTime = ahora;
  return true;
}


  // 🆕 MÉTODO PARA ENVÍO HTTP
private async enviarMensajePorHTTP(contenido: string, mensajeOptimista: Mensaje): Promise<void> {
  return new Promise((resolve, reject) => {
    const resultado = this.chatService.enviarMensaje({
      contenido,
      id_chat: this.chatSeleccionado!.id_chat,
      id_remitente: this.currentUser.id_usuario
    }, false); // 🟢 false para usar HTTP

    if (resultado && 'subscribe' in resultado) {
      resultado.subscribe({
        next: (response: any) => {
          console.log('✅ Mensaje enviado por HTTP:', response);
          this.procesarRespuestaMensaje(response, mensajeOptimista);
          this.enviandoMensaje = false; // 🔴 RESETEAR AQUÍ
          resolve();
        },
        error: (error: any) => {
          this.manejarErrorEnvioMensaje(mensajeOptimista, error);
          this.enviandoMensaje = false; // 🔴 RESETEAR EN ERROR
          reject(error);
        }
      });
    } else {
      console.log('✅ Mensaje enviado');
      this.enviandoMensaje = false;
      resolve();
    }
  });
}

   // 🆕 PROCESAR RESPUESTA DEL SERVIDOR
// 🟢 MEJORAR: Procesar respuesta del mensaje
private procesarRespuestaMensaje(response: any, mensajeOptimista: Mensaje): void {
  const nuevoMensaje = response.data || response;
  console.log('✅ Mensaje confirmado por servidor:', nuevoMensaje);
  
  // Reemplazar mensaje optimista con el real del servidor
  const index = this.mensajes.findIndex(m => m.id_mensaje === mensajeOptimista.id_mensaje);
  if (index !== -1) {
    this.mensajes[index] = nuevoMensaje;
  }
  
  this.actualizarUltimoMensajeEnLista(nuevoMensaje);
  this.enviandoMensaje = false;
  this.cdRef.detectChanges();
}

// 🟢 AGREGAR: Limpiar mensajes al cambiar de chat
private limpiarMensajesAlCambiarChat(): void {
  console.log('🧹 Limpiando mensajes al cambiar de chat...');
  this.mensajes = [];
  this.chatService.limpiarMensajes();
  this.cdRef.detectChanges();
}

// 🟢 AGREGAR: Método para manejar error de envío (FALTANTE)
// 🟢 MEJORADO: Manejo de errores de envío
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


  private validarMensajeAntesDeEnviar(): boolean {
    if (!this.nuevoMensaje?.trim() && !this.archivoSeleccionado) {
      this.mostrarError('El mensaje no puede estar vacío o debe incluir un archivo');
      return false;
    }

    if (!this.chatSeleccionado) {
      this.mostrarError('No hay chat seleccionado');
      return false;
    }

    if (this.enviandoMensaje) {
      return false;
    }

    if (!this.currentUser) {
      this.mostrarError('Usuario no identificado');
      return false;
    }

    return true;
  }

  volverALista(): void {
  console.log('🔙 Volviendo a la lista');
  
  // 🆕 Limpiar WebSocket
  if (this.chatSeleccionado) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
    this.chatService.limpiarCacheChat(this.chatSeleccionado.id_chat);
  }
  
  this.chatSeleccionado = null;
  this.mensajes = [];
  this.nuevoMensaje = '';
  this.autoScrollEnabled = true;
  
  // 🆕 Limpiar mensajes del servicio
  this.chatService.limpiarMensajes();
  
  this.cdRef.detectChanges();
}

// AGREGAR ESTE MÉTODO PARA MANEJAR SCROLL
onMessagesScroll(): void {
  if (!this.messagesContainer) return;

  const element = this.messagesContainer.nativeElement;
  const scrollTop = element.scrollTop;
  const scrollHeight = element.scrollHeight;
  const clientHeight = element.clientHeight;
  
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  this.autoScrollEnabled = distanceFromBottom < 100;
}

  private scrollToBottom(): void {
    if (!this.messagesContainer) return;

    try {
      setTimeout(() => {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 100);
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  // Métodos de utilidad
  obtenerMensajeError(error: any): string {
    if (error.status === 0) return 'No se puede conectar al servidor.';
    if (error.status === 401) return 'No autorizado.';
    return error.error?.message || error.message || 'Error desconocido';
  }

  private mostrarError(mensaje: string): void {
    console.error('💥 Error:', mensaje);
    alert(mensaje);
  }

 // MEJORAR formatearFecha
formatearFecha(fecha: string | null): string {
  if (!fecha) return '';
  try {
    const date = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora.getTime() - date.getTime();
    const minutos = Math.floor(diferencia / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (minutos > 0) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    return 'Ahora mismo';
  } catch {
    return 'Fecha inválida';
  }
}

  obtenerIniciales(docente: Docente): string {
    const nombre = docente.nombre?.charAt(0) || '';
    const apellido = docente.apellido?.charAt(0) || '';
    return (nombre + apellido).toUpperCase() || 'D';
  }

  obtenerInicialesChat(chat: Chat): string {
    const nombre = chat.usuario.nombre?.charAt(0) || '';
    const apellido = chat.usuario.apellido?.charAt(0) || '';
    return (nombre + apellido).toUpperCase() || 'D';
  }

  esMensajePropio(mensaje: Mensaje): boolean {
    return this.currentUser ? mensaje.id_remitente === this.currentUser.id_usuario : false;
  }

  trackByDocenteId(index: number, docente: Docente): number {
    return docente.id_docente;
  }

  trackByMensajeId(index: number, mensaje: Mensaje): number {
    return mensaje.id_mensaje;
  }
  manejarEnter(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    this.enviarMensaje();
  }
}
}