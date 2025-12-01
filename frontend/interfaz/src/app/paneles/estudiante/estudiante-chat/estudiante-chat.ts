// estudiante-chat.ts - ARCHIVO COMPLETO
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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

// En docente-chat.ts - EXTENDER la interfaz Mensaje de la misma manera

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
    tamano?: number;
  } | null;
  // 🆕 AGREGAR propiedades para manejo de carga
  _estado?: 'pendiente' | 'cargando' | 'confirmado' | 'error';
  _idTemporal?: string;
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
// 🟢 MEJORAR: Logging en onFileSelected
onFileSelected(event: any): void {
  try {
    const file = event.target.files[0];
    console.log('📎 Archivo seleccionado:', file);
    
    if (!file) {
      console.warn('⚠️ No se seleccionó ningún archivo');
      return;
    }

    // Validaciones
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      this.mostrarError(`El archivo es demasiado grande. Máximo: ${MAX_SIZE / 1024 / 1024}MB`);
      this.removerArchivo();
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
      this.mostrarError('Tipo de archivo no permitido. Formatos: PDF, Word, Excel, PowerPoint, imágenes, ZIP');
      this.removerArchivo();
      return;
    }

    this.archivoSeleccionado = file;
    console.log('✅ Archivo validado correctamente:', file.name);
    
  } catch (error) {
    console.error('❌ Error procesando archivo:', error);
    this.mostrarError('Error al procesar el archivo');
    this.removerArchivo();
  }
}

// 🟢 AGREGAR: Método para verificar si un mensaje tiene archivo
tieneArchivo(msg: Mensaje): boolean {
  return !!(msg.archivo && 
    (msg.archivo.url || msg.archivo.nombre) && 
    msg.archivo.nombre !== 'uploading...'
  );
}




// 🟢 AGREGAR: Método para remover archivo seleccionado
removerArchivo(): void {
  console.log('🗑️ Removiendo archivo seleccionado');
  this.archivoSeleccionado = null;
  
  // Limpiar el input de archivo
  if (this.fileInput && this.fileInput.nativeElement) {
    this.fileInput.nativeElement.value = '';
  }
  
  this.cdRef.detectChanges();
}



  // Control de scroll
  private autoScrollEnabled: boolean = true;
  
  private connectionStateSubscription?: Subscription;

  // Subscripciones
  private subscriptions: Subscription = new Subscription();

  

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private cdRef: ChangeDetectorRef,
    private router: Router
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

// AGREGAR en el método ngOnInit() después de la suscripción existente
// En estudiante-chat.ts - MODIFICAR el ngOnInit

ngOnInit(): void {
  console.log('🎯 Inicializando chat de ESTUDIANTE');
  
  this.obtenerUsuarioActual();
  this.checkScreenSize();
  
  // 🆕 LLAMAR a los métodos que ahora existen
  this.setupSearchDebounce();
  this.setupGlobalListeners();
  this.startConnectionMonitoring();
  
  // 🆕 CONFIGURACIÓN SIMPLIFICADA DE WEBSOCKET
  setTimeout(() => {
    this.inicializarWebSocket();
  }, 1000);

  // Suscripción al progreso de upload
  this.subscriptions.add(
    this.chatService.uploadProgress$.subscribe(progress => {
      if (progress && progress.chatId === this.chatSeleccionado?.id_chat) {
        this.uploadProgreso = progress.progress;
        this.cdRef.detectChanges(); // 🆕 FORZAR actualización de UI
      } else if (!progress) {
        this.uploadProgreso = 0;
      }
    })
  );

  // 🆕 NUEVA SUSCRIPCIÓN para estado de archivos
  this.subscriptions.add(
    (this.chatService as any).fileUpload$.subscribe((estado: any) => {
      if (estado && estado.chatId === this.chatSeleccionado?.id_chat) {
        console.log('📊 Estado de archivo:', estado);
        
        if (estado.estado === 'completado') {
          this.uploadProgreso = 0;
        } else if (estado.estado === 'error') {
          this.uploadProgreso = 0;
          this.mostrarError('Error al subir el archivo');
        }
        
        this.cdRef.detectChanges();
      }
    })
  );
}

// En estudiante-chat.ts - AGREGAR estos métodos en la clase EstudianteChat
// 🆕 MÉTODO PARA VOLVER AL DASHBOARD DEL ESTUDIANTE
volverAEstudiante(): void {
  console.log('🏠 Volviendo al dashboard del estudiante');
  
  // Limpiar todo antes de salir
  if (this.chatSeleccionado) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
    this.chatSeleccionado = null;
  }
  
  this.mensajes = [];
  this.nuevoMensaje = '';
  this.archivoSeleccionado = null;
  this.uploadProgreso = 0;
  
  // Navegar al dashboard del estudiante
  this.router.navigate(['/estudiante']);
}
// 🆕 AGREGAR: Métodos faltantes
private setupSearchDebounce(): void {
  // No se necesita para estudiante, pero debe existir
  console.log('🔍 Setup search debounce (no necesario para estudiante)');
}

// 🟢 CORREGIR ngOnInit - AGREGAR método faltante
private setupGlobalListeners(): void {
  console.log('🔍 Configurando listeners globales para estudiante...');
  
  // Listener para cambios de conexión
  window.addEventListener('online', () => {
    console.log('🌐 Conexión recuperada - reconectando WebSocket...');
    this.chatService.reconectarWebSocket();
  });
  
  window.addEventListener('offline', () => {
    console.log('📵 Sin conexión - actualizando estado...');
    this.conexionEstado = 'desconectado';
    this.cdRef.detectChanges();
  });
}

private startConnectionMonitoring(): void {
  console.log('📡 Iniciando monitoreo de conexión para estudiante');
  
  // Monitorear estado de conexión periódicamente
  setInterval(() => {
    this.verificarEstadoConexion();
  }, 10000); // Cada 10 segundos
}

// 🆕 AGREGAR: Método para verificar estado de conexión
private verificarEstadoConexion(): void {
  const estado = this.chatService.getConnectionState();
  console.log('📡 Estado de conexión estudiante:', estado.status);
  
  // Actualizar estado local
  switch (estado.status) {
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
}

// 🆕 AGREGAR: Método para debug de mensajes
private debugMensajes(mensajes: Mensaje[], fuente: string): void {
  console.log(`🔍 DEBUG ${fuente}:`, {
    cantidad: mensajes.length,
    cargando: mensajes.filter(m => this.esMensajeCargando(m)).length,
    ids: mensajes.map(m => m.id_mensaje),
    estados: mensajes.map(m => (m as any)._estado || 'normal')
  });
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
      next: (mensajesSocket: any[]) => {
        console.log('📥 Mensajes recibidos en estudiante (RAW):', mensajesSocket.length);
        
        if (this.chatSeleccionado && mensajesSocket.length > 0) {
          // 🟢 FILTRAR SOLO mensajes del chat actual y que no sean duplicados
          const mensajesFiltrados = mensajesSocket.filter(m => 
            m && 
            m.id_chat === this.chatSeleccionado!.id_chat &&
            // 🟢 EVITAR mensajes que ya están en la lista local
            !this.mensajes.some(existing => 
              existing.id_mensaje === m.id_mensaje ||
              (existing.id_remitente === m.id_remitente && 
               existing.contenido === m.contenido &&
               Math.abs(new Date(existing.fecha).getTime() - new Date(m.fecha).getTime()) < 1000)
            )
          );
          
          if (mensajesFiltrados.length > 0) {
            console.log('💬 Mensajes filtrados (sin duplicados):', mensajesFiltrados.length);
            this.procesarMensajesTiempoReal(mensajesFiltrados);
          }
        }
      },
      error: (error) => console.error('❌ Error en mensajes$ estudiante:', error)
    })
  );
}


  // 🆕 PROCESAR MENSAJES EN TIEMPO REAL
// 🟢 SOLUCIÓN: Método mejorado para procesar mensajes en tiempo real
private procesarMensajesTiempoReal(mensajesSocket: any[]): void {
  if (!mensajesSocket || mensajesSocket.length === 0 || !this.chatSeleccionado) return;

  console.log('🔄 Procesando mensajes tiempo real:', mensajesSocket.length);
  
  const idsExistentes = new Set(this.mensajes.map(m => m.id_mensaje));
  let mensajesAgregados = 0;

  mensajesSocket.forEach(mensaje => {
    // 🟢 SOLUCIÓN: Solo procesar mensajes del chat actual
    if (mensaje.id_chat !== this.chatSeleccionado!.id_chat) {
      return;
    }

    // 🟢 SOLUCIÓN: Evitar mensajes propios que ya fueron procesados optimistamente
    const esMensajePropio = mensaje.id_remitente === this.currentUser?.id_usuario;
    if (esMensajePropio) {
      // Buscar si ya existe un mensaje optimista con contenido similar
      const mensajeOptimistaExistente = this.mensajes.find(m => 
        m.id_remitente === this.currentUser?.id_usuario &&
        m.contenido === mensaje.contenido &&
        Math.abs(new Date(m.fecha).getTime() - new Date(mensaje.fecha).getTime()) < 5000
      );
      
      if (mensajeOptimistaExistente) {
        console.log('🔄 Reemplazando mensaje optimista con mensaje real:', mensaje.id_mensaje);
        // Reemplazar el mensaje optimista con el real
        const index = this.mensajes.findIndex(m => m.id_mensaje === mensajeOptimistaExistente.id_mensaje);
        if (index !== -1) {
          this.mensajes[index] = this.procesarMensajeIndividual(mensaje);
          mensajesAgregados++;
        }
        return;
      }
    }

    // 🟢 Verificar duplicados
    const esDuplicado = idsExistentes.has(mensaje.id_mensaje);
    if (!esDuplicado) {
      const mensajeProcesado = this.procesarMensajeIndividual(mensaje);
      this.mensajes.push(mensajeProcesado);
      mensajesAgregados++;
      idsExistentes.add(mensaje.id_mensaje);
      
      console.log('✅ Mensaje agregado:', {
        id: mensaje.id_mensaje,
        remitente: mensaje.id_remitente,
        contenido: mensaje.contenido?.substring(0, 30)
      });
    }
  });

  if (mensajesAgregados > 0) {
    console.log(`🆕 Agregados ${mensajesAgregados} mensajes`);
    this.mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    if (this.autoScrollEnabled) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
    
    this.cdRef.detectChanges();
  }
}

// 🟢 AGREGAR: Método auxiliar para procesar mensajes individuales
private procesarMensajeIndividual(mensaje: any): Mensaje {
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

  // 🟢 NORMALIZAR ESTRUCTURA DEL ARCHIVO
  let archivoProcesado = null;
  if (mensaje.archivo) {
    archivoProcesado = {
      url: mensaje.archivo.url || '',
      ruta: mensaje.archivo.ruta || '',
      nombre: mensaje.archivo.nombre || 'Archivo sin nombre',
      tipo: mensaje.archivo.tipo || 'application/octet-stream',
      tamano: mensaje.archivo.tamano || mensaje.archivo.tamano || 0
    };
  }
  
  return {
    id_mensaje: mensaje.id_mensaje,
    contenido: mensaje.contenido || '📎 Archivo compartido',
    fecha: mensaje.fecha,
    id_chat: mensaje.id_chat,
    id_remitente: mensaje.id_remitente,
    remitente: remitenteProcesado,
    archivo: archivoProcesado
  };
}

// Método auxiliar para template
tieneTamanoArchivo(msg: Mensaje): boolean {
  return !!(msg.archivo && typeof msg.archivo.tamano === 'number');
}

// Método auxiliar para obtener tamaño seguro
obtenerTamanoArchivo(msg: Mensaje): number {
  return msg.archivo?.tamano || 0;
}

// 🟢 CORREGIR: Configuración mejorada de WebSocket
private setupWebSocketListeners(): void {
  console.log('🔧 Configurando listeners WebSocket para estudiante...');

  // ... (código de connectionState sin cambios)

  // 🟢 SOLUCIÓN: Suscripción simple y directa
  this.subscriptions.add(
    this.chatService.mensajes$.subscribe({
      next: (mensajesSocket: any[]) => {
        console.log('📥 Mensajes recibidos en componente:', mensajesSocket.length);
        
        if (this.chatSeleccionado && mensajesSocket.length > 0) {
          // 🟢 SOLUCIÓN: Procesar todos los mensajes del chat actual
          const mensajesDelChat = mensajesSocket.filter(m => 
            m && m.id_chat === this.chatSeleccionado!.id_chat
          );
          
          if (mensajesDelChat.length > 0) {
            console.log('💬 Mensajes del chat actual:', mensajesDelChat.length);
            this.procesarMensajesTiempoReal(mensajesDelChat);
          }
        }
      },
      error: (error) => console.error('❌ Error en mensajes$:', error)
    })
  );

  // 🟢 CORRECCIÓN CRÍTICA: Escuchar mensajes en tiempo real con filtro mejorado
  this.subscriptions.add(
    this.chatService.mensajes$.subscribe({
      next: (mensajesSocket: any[]) => {
         console.log('📥 Mensajes recibidos en componente estudiante:', mensajesSocket.length);
        
        if (this.chatSeleccionado && mensajesSocket.length > 0) {
          // 🟢 FILTRAR SOLO mensajes del chat actual
          const mensajesDelChatActual = mensajesSocket.filter(m => 
            m && m.id_chat === this.chatSeleccionado!.id_chat
          );
          
          if (mensajesDelChatActual.length > 0) {
            console.log('💬 Mensajes del chat actual:', mensajesDelChatActual.length);
            
            // 🟢 CORRECCIÓN: Procesar solo mensajes que no sean del usuario actual
            const mensajesDeOtros = mensajesDelChatActual.filter(m => 
              m.id_remitente !== this.currentUser?.id_usuario
            );
            
            if (mensajesDeOtros.length > 0) {
              console.log('👤 Mensajes de otros usuarios:', mensajesDeOtros.length);
              this.procesarMensajesTiempoReal(mensajesDeOtros);
            } else {
              console.log('ℹ️ Todos los mensajes son propios, ignorando...');
            }
          }
        }
      },
      error: (error) => console.error('❌ Error en mensajes$:', error)
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


// 🟢 AGREGAR: Método faltante
private configurarChatParaEstudiante(id_chat: number): void {
  console.log('💬 Configurando chat para estudiante, ID:', id_chat);

  // Limpiar mensajes anteriores
  this.limpiarChatAnterior();

  // Unirse al chat a través del servicio
  this.chatService.unirseAlChat(id_chat);
  
  // Cargar mensajes iniciales
  this.cargarMensajes(id_chat);
  
  console.log('✅ Chat configurado para estudiante:', id_chat);
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

  // estudiante-chat.ts - MEJORAR el procesamiento de docentes en cargarDocentes()
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
          // 🟢 CORRECCIÓN: Asegurar que cada docente tenga cursos como array
          this.docentes = docentesData.map((docente: any) => ({
            ...docente,
            cursos: docente.cursos || [], // 🟡 Asegurar que siempre sea array
            tieneChat: docente.tieneChat || false,
            chatExistente: docente.chatExistente || null
          }));
          
          console.log(`✅ ${this.docentes.length} docentes cargados y procesados`);
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
// estudiante-chat.ts - AGREGAR método para debug
private validarDocenteCompleto(docente: Docente): boolean {
  if (!docente) {
    console.error('❌ Docente es null o undefined');
    return false;
  }

  const camposRequeridos = ['id_docente', 'id_usuario', 'nombre', 'cursos'];
  const camposFaltantes = camposRequeridos.filter(campo => !docente[campo as keyof Docente]);

  if (camposFaltantes.length > 0) {
    console.error('❌ Docente incompleto. Campos faltantes:', camposFaltantes);
    console.error('📋 Docente actual:', docente);
    return false;
  }

  // 🟢 Verificar que cursos es un array
  if (!Array.isArray(docente.cursos)) {
    console.error('❌ Docente.cursos no es un array:', docente.cursos);
    docente.cursos = []; // 🟡 Corregir en tiempo real
  }

  return true;
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

// Agregar estos métodos en la clase EstudianteChat

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


// 🟢 AGREGAR: Método para obtener nombre del archivo
obtenerNombreArchivo(msg: Mensaje): string {
  return msg.archivo?.nombre || 'Archivo adjunto';
}

// 🟢 AGREGAR: Método para obtener tipo de archivo
obtenerTipoArchivo(msg: Mensaje): string {
  if (!msg.archivo?.tipo) return 'Archivo';
  const tipo = msg.archivo.tipo.split('/')[1]?.toUpperCase() || 'Archivo';
  return tipo;
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

  // estudiante-chat.ts - MEJORAR seleccionarDocente con validación
// 🟢 CORREGIDO: No eliminar todas las suscripciones
seleccionarDocente(docente: Docente): void {
  console.log('🎯 Seleccionando docente:', docente);

  if (!this.validarDocenteSeleccionable(docente)) {
    return;
  }

  if (!this.validarDocenteCompleto(docente)) {
    this.mostrarError('Datos del docente incompletos o inválidos');
    return;
  }

  try {
    // 🟢 LIMPIAR solo datos del chat anterior, NO suscripciones
    this.limpiarChatAnterior();
    
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

// 🟢 AGREGAR: Método para limpiar chat anterior
private limpiarChatAnterior(): void {
  this.mensajes = [];
  this.nuevoMensaje = '';
  this.archivoSeleccionado = null;
  this.uploadProgreso = 0;
  
  if (this.chatSeleccionado) {
    this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
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

  // estudiante-chat.ts - CORREGIR método crearNuevoChat
private crearNuevoChat(docente: Docente): void {
  console.log('🔍 DEBUG - Datos del docente en crearNuevoChat:', {
    docente: docente,
    cursos: docente.cursos,
    tipoCursos: typeof docente.cursos,
    esArray: Array.isArray(docente.cursos),
    tieneLength: docente.cursos ? docente.cursos.length : 'NO TIENE'
  });
  try {
    console.log('🆕 Creando nuevo chat para docente:', docente);

    // 🟢 VALIDACIÓN MEJORADA - Verificar que docente.cursos existe
    if (!docente || !docente.id_docente) {
      console.error('❌ Docente inválido:', docente);
      this.mostrarError('Datos del docente incompletos');
      return;
    }

    if (!this.currentUser?.id_estudiante) {
      console.error('❌ No hay estudiante actual');
      this.mostrarError('No se pudo identificar al estudiante');
      return;
    }

    // 🟢 CORRECCIÓN CRÍTICA: Verificar que cursos existe y tiene elementos
    const cursosDocente = docente.cursos || [];
    console.log('📚 Cursos del docente:', cursosDocente);

    const chatData = {
      id_docente: docente.id_docente,
      id_estudiante: this.currentUser.id_estudiante,
      id_curso: cursosDocente.length > 0 ? null : null, // 🟡 CORREGIDO: No usar .length directamente
      id_seccion: null
    };

    console.log('📤 Datos para crear chat:', chatData);

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
  } catch (error) {
    console.error('❌ Error inesperado en crearNuevoChat:', error);
    this.mostrarError('Error inesperado al crear chat');
  }
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

  // 🟢 CORREGIR: Método procesarMensajesBackend con manejo seguro del remitente
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

// 🟢 MEJORAR el método de conexión WebSocket
// 🟢 CORREGIR TYPO y AGREGAR MÉTODOS FALTANTES
private conectarWebSocket(): void {
  if (this.chatSeleccionado) {
    console.log('💬 Conectando WebSocket al chat:', this.chatSeleccionado.id_chat);
    this.chatService.unirseAlChat(this.chatSeleccionado.id_chat);
    
    // 🟢 LIMPIAR MENSAJES ANTERIORES al cambiar de chat
    this.chatService.limpiarMensajes();
  }
}

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
// 🟢 MEJORAR: Verificación más robusta en enviarMensaje
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
    archivoSeleccionado: this.archivoSeleccionado,
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

  // 🟢 VERIFICACIÓN ESPECÍFICA MEJORADA PARA ARCHIVOS
  if (tieneArchivo) {
    console.log('📎 Verificando archivo seleccionado:', {
      nombre: this.archivoSeleccionado?.name,
      tamano: this.archivoSeleccionado?.size,
      tipo: this.archivoSeleccionado?.type,
      esFile: this.archivoSeleccionado instanceof File
    });

    if (!this.archivoSeleccionado || !(this.archivoSeleccionado instanceof File)) {
      console.error('❌ Archivo seleccionado no es válido:', this.archivoSeleccionado);
      this.mostrarError('Error: El archivo seleccionado no es válido');
      return;
    }
  }

  this.enviandoMensaje = true;

  try {
    // 🟢 ESTRATEGIA UNIFICADA: HTTP para archivos, WebSocket para texto
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
      console.log('✅ Estado de envío reseteado');
    }, 1000);
  }
}

  // 🟢 MÉTODO PARA ENVIAR MENSAJE CON ARCHIVO
// estudiante-chat.ts - MODIFICAR el método enviarMensajeConArchivo

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
  const mensajeCargando = this.chatService.crearMensajeCargando(
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

// 🆕 AGREGAR: Método para agregar mensaje de carga
private agregarMensajeCargando(mensaje: Mensaje): void {
  this.mensajes.push(mensaje);
  
  // Limpiar campos
  this.nuevoMensaje = '';
  
  this.autoScrollEnabled = true;
  setTimeout(() => this.scrollToBottom(), 50);
  this.cdRef.detectChanges();
  
  console.log('⏳ Mensaje de carga agregado:', mensaje._idTemporal);
}

// 🆕 CORREGIDO: Método para procesar respuesta de archivo
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
  const index = this.mensajes.findIndex(m => m._idTemporal === mensajeCargando._idTemporal);
  
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

// 🆕 CORREGIDO: Método para manejar error de archivo
private manejarErrorArchivo(mensajeCargando: Mensaje, error: any): void {
  console.error('❌ Error subiendo archivo, removiendo mensaje de carga:', mensajeCargando._idTemporal);
  
  // Remover mensaje de carga
  const index = this.mensajes.findIndex(m => m._idTemporal === mensajeCargando._idTemporal);
  if (index !== -1) {
    this.mensajes.splice(index, 1);
    this.cdRef.detectChanges();
    console.log('🗑️ Mensaje de carga removido por error');
  }
  
  this.mostrarError('Error al subir archivo: ' + this.obtenerMensajeError(error));
}

// 🆕 AGREGAR: Método para verificar si es mensaje de carga
esMensajeCargando(msg: Mensaje): boolean {
  return msg._estado === 'cargando';
}

// 🆕 AGREGAR: Método para obtener progreso (si lo necesitas)
obtenerProgresoArchivo(): number {
  return this.uploadProgreso;
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
// 🟢 CORREGIR: Enviar mensaje normal con tipo de retorno consistente
private async enviarMensajeNormal(contenido: string): Promise<void> {
  const mensajeData = {
    contenido,
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

// 🟢 AGREGAR: Método para limpiar el input de archivo
private removerArchivoDelInput(): void {
  this.archivoSeleccionado = null;
  if (this.fileInput && this.fileInput.nativeElement) {
    this.fileInput.nativeElement.value = '';
  }
  console.log('🗑️ Input de archivo limpiado');
}
// 🟢 MEJORADO: Agregar mensaje optimista con verificación
// 🟢 CORREGIR: Agregar mensaje optimista
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
// 🟢 AGREGAR EN estudiante-chat.ts
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

// 🟢 AGREGAR propiedad para progreso de upload
uploadProgreso: number = 0;

  // 🆕 MÉTODO PARA ENVÍO HTTP
private async enviarMensajePorHTTP(contenido: string, mensajeOptimista: Mensaje): Promise<void> {
  return new Promise((resolve, reject) => {
    const resultado = this.chatService.enviarMensaje({
      contenido,
      id_chat: this.chatSeleccionado!.id_chat,
      id_remitente: this.currentUser.id_usuario
    }); // 🟢 false para usar HTTP

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
// 🟢 CORREGIR: Procesar respuesta de mensajes con archivo
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
  this.enviandoMensaje = false;
  
  // 🟢 ACTUALIZAR UI
  setTimeout(() => this.scrollToBottom(), 100);
  this.cdRef.detectChanges();
}

// 🟢 AGREGAR: Limpiar mensajes al cambiar de chat
private limpiarMensajesAlCambiarChat(): void {
  console.log('🧹 Limpiando mensajes al cambiar de chat...');
  this.mensajes = [];
  this.chatService.limpiarMensajes();
  this.cdRef.detectChanges();
}

// 🟢 ACTUALIZAR: Método para verificar si un mensaje tiene archivo válido
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
// 🟢 AGREGAR: Método auxiliar para obtener tamaño seguro
obtenerTamanoArchivoSeguro(msg: Mensaje): number {
  return msg.archivo?.tamano || 0;
}
// 🟢 MEJORAR: Método para descargar archivo
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

// 🟢 AGREGAR: Método para visualizar archivo (abrir en nueva pestaña)
verArchivo(mensaje: Mensaje): void {
  if (!this.tieneArchivoValido(mensaje)) {
    return;
  }

  const url = this.obtenerUrlDescarga(mensaje);
  if (url) {
    window.open(url, '_blank');
  }
}

// 🟢 AGREGAR: Método para formatear el tamaño del archivo
formatearTamanoArchivo(bytes: number = 0): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  if (this.isMobile) {
    // En móvil: volver a la lista de chats
    if (this.chatSeleccionado) {
      this.chatService.salirDelChat(this.chatSeleccionado.id_chat);
      this.chatService.limpiarCacheChat(this.chatSeleccionado.id_chat);
    }
    
    this.chatSeleccionado = null;
    this.mensajes = [];
    this.nuevoMensaje = '';
    this.autoScrollEnabled = true;
    this.chatService.limpiarMensajes();
  } else {
    // En desktop: volver al dashboard del estudiante
    this.volverAEstudiante();
  }
  
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