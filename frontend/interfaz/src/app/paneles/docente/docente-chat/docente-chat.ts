import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';

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

interface PaginacionMensajes {
  paginaActual: number;
  porPagina: number;
  totalMensajes: number;
  totalPaginas: number;
  tieneMas: boolean;
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

  // Usuario actual
  currentUser: any = null;

  // Búsqueda y filtros
  terminoBusqueda: string = '';
  alumnosFiltrados: Alumno[] = [];
  pestanaActiva: 'misAlumnos' | 'alumnosChat' = 'misAlumnos';
  private searchSubject = new Subject<string>();

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
  }

  ngOnDestroy(): void {
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

  seleccionarAlumno(alumno: Alumno): void {
    console.log('🎯 INICIANDO seleccionarAlumno para:', alumno.nombre);
    
    if (!this.validarAlumnoSeleccionable(alumno)) {
      console.error('❌ Validación falló para alumno:', alumno.nombre);
      return;
    }

    console.log('👤 Alumno seleccionado:', {
      nombre: alumno.nombre,
      id_estudiante: alumno.id_estudiante,
      id_usuario: alumno.id_usuario,
      tieneChat: alumno.tieneChat,
      chatExistente: alumno.chatExistente
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

  private inicializarChatExistente(alumno: Alumno): void {
    if (!alumno.chatExistente) {
      console.error('❌ No hay chat existente para inicializar');
      return;
    }

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
    
    console.log('💬 Chat seleccionado INICIALIZADO:', {
      id: this.chatSeleccionado.id_chat,
      alumno: `${alumno.nombre} ${alumno.apellido}`,
      curso: this.chatSeleccionado.curso,
      seccion: this.chatSeleccionado.seccion
    });
    
    this.cdRef.detectChanges();
    
    this.cargarMensajes(alumno.chatExistente.id_chat);
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

  private procesarMensajesBackend(mensajesData: any[]): Mensaje[] {
    if (!Array.isArray(mensajesData)) {
      console.error('❌ mensajesData no es array:', mensajesData);
      return [];
    }

    return mensajesData
      .filter(msg => {
        const esValido = msg && 
          msg.id_mensaje && 
          msg.contenido && 
          msg.fecha && 
          msg.id_remitente;
        
        if (!esValido) {
          console.warn('⚠️ Mensaje inválido filtrado:', msg);
        }
        
        return esValido;
      })
      .map(msg => ({
        id_mensaje: msg.id_mensaje,
        contenido: msg.contenido,
        fecha: msg.fecha,
        id_chat: msg.id_chat,
        id_remitente: msg.id_remitente,
        remitente: msg.remitente || {
          id_usuario: msg.id_remitente,
          correo: msg.remitente?.correo || 'sin-correo',
          rol: msg.remitente?.rol || 'estudiante'
        }
      }));
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

  enviarMensaje(): void {
    if (!this.validarMensajeAntesDeEnviar()) {
      return;
    }

    this.enviandoMensaje = true;
    const contenido = this.nuevoMensaje.trim();

    console.log('📤 Enviando mensaje:', contenido);

    const mensajeOptimista: Mensaje = {
      id_mensaje: Date.now(),
      contenido,
      fecha: new Date().toISOString(),
      id_chat: this.chatSeleccionado!.id_chat,
      id_remitente: this.currentUser!.id_usuario,
      remitente: {
        id_usuario: this.currentUser!.id_usuario,
        correo: this.currentUser!.correo,
        rol: this.currentUser!.rol
      }
    };

    this.mensajes.push(mensajeOptimista);
    this.nuevoMensaje = '';
    this.autoScrollEnabled = true;
    
    setTimeout(() => this.scrollToBottom(), 50);

    this.subscriptions.add(
      this.chatService.enviarMensaje({
        contenido,
        id_chat: this.chatSeleccionado!.id_chat,
        id_remitente: this.currentUser!.id_usuario
      }).subscribe({
        next: (response: any) => {
          console.log('✅ Respuesta de enviar mensaje:', response);
          
          const nuevoMensaje = response.data || response;
          console.log('✅ Mensaje enviado exitosamente');
          
          const index = this.mensajes.findIndex(m => m.id_mensaje === mensajeOptimista.id_mensaje);
          if (index !== -1) {
            this.mensajes[index] = nuevoMensaje;
          }
          
          // 🟢 CORRECCIÓN: Solo marcar como activo cuando se envía el primer mensaje
          this.actualizarUltimoMensajeEnLista(nuevoMensaje);
          this.enviandoMensaje = false;
          this.cdRef.detectChanges();
        },
        error: (error: any) => {
          console.error('❌ Error al enviar mensaje:', error);
          this.mensajes = this.mensajes.filter(m => m.id_mensaje !== mensajeOptimista.id_mensaje);
          this.enviandoMensaje = false;
          this.mostrarError('Error al enviar mensaje: ' + this.obtenerMensajeError(error));
          this.cdRef.detectChanges();
        }
      })
    );
  }

  private validarMensajeAntesDeEnviar(): boolean {
    if (!this.nuevoMensaje?.trim()) {
      this.mostrarError('El mensaje no puede estar vacío');
      return false;
    }

    if (!this.chatSeleccionado) {
      this.mostrarError('No hay chat seleccionado');
      return false;
    }

    if (this.enviandoMensaje) {
      console.warn('⚠️ Ya se está enviando un mensaje');
      return false;
    }

    if (!this.currentUser) {
      this.mostrarError('Usuario no identificado');
      return false;
    }

    if (this.nuevoMensaje.trim().length > 1000) {
      this.mostrarError('El mensaje es demasiado largo (máximo 1000 caracteres)');
      return false;
    }

    return true;
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

  volverALista(): void {
    console.log('🔙 Volviendo a la lista de alumnos');
    this.chatSeleccionado = null;
    this.mensajes = [];
    this.nuevoMensaje = '';
    this.autoScrollEnabled = true;
    this.paginacionMensajes = null;
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