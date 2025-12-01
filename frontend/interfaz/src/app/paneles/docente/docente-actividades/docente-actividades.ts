import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CursoService } from '../../../services/curso.service';
import { AuthService } from '../../../services/auth.service';

// Importar componentes necesarios
import { DocenteChat } from '../docente-chat/docente-chat';
import { DocenteNotificaciones } from '../docente-notificaciones/docente-notificaciones';
import { DocenteRetroalimentaciones } from '../docente-retroalimentaciones/docente-retroalimentaciones';

interface Actividad {
  id_actividad: number;
  curso: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  fecha_entrega: string;
  id_docente: number;
  id_seccion: number;
  archivo?: string;       // 🔹 nuevo
  archivo_ruta?: string;  // 🔹 nuevo
}

interface Seccion {
  id_seccion: number;
  nombre: string;
  curso?: string;
}

@Component({
  selector: 'app-actividades',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterLink,
    FormsModule,
    DocenteChat,
    DocenteNotificaciones,
    DocenteRetroalimentaciones,
  ],
  templateUrl: './docente-actividades.html',
})
export class Actividades implements OnInit, OnDestroy {
  // 🟢 Datos principales
  actividades: Actividad[] = [];
  actividadesFiltradas: Actividad[] = [];
  idSeccion!: number;
  actividadSeleccionada: number | null = null;
  id_actual: number | null = null;
  id_docente_logeado: number = 0;
  seccionInfo: Seccion | null = null;
  cursosDisponibles: any[] = [];

  // 🟢 Estados de UI
  isModalOpen = false;
  nuevaActividad = false;
  cargando = false;
  error: string = '';

  // 🟢 Estados de header (consistentes con docente.ts)
  showUserMenu = false;
  showNotificaciones = false;
  showChat = false;
  totalNotificaciones = 0;
  unreadMessages = 0;

  // 🟢 Filtros
  filtroEstado: string = 'todas';

  // 🟢 Datos para nueva actividad
  fecha_ini_nuevo: string = '';
  fecha_fini_nuevo: string = '';
  tipo_nuevo: string = '';
  titulo_nuevo: string = '';
  descripcion_nuevo: string = '';
  curso_nuevo: string = '';
  archivoSeleccionado: File | null = null;
  archivoNombre: string = '';
  archivo_nuevo: File | null = null;       // Archivo que sube el docente        // URL pública (lo recibes del backend)

  // 🟢 Datos temporales para edición
  fecha_temporal_inicio: string = '';
  fecha_temporal_final: string = '';
  tipo_actividad: string = '';
  titulo_temporal: string = '';
  descripcion_temporal: string = '';
  curso_temporal: string = '';
  intentos_nuevo: number = 1;
  archivo_ruta_nuevo: string = '';

  // 🟢 Estructura de usuario (consistente con docente.ts)
  currentUser: any = {
    id_docente: null,
    id_usuario: null,
    nombre: '',
    apellido: '',
    correo: '',
    rol: '',
  };

  //Lista de meses y filtro seleccionado
  meses: string[] = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  filtroMes: string = '';

  // 🟢 Subscripciones
  private subscriptions: Subscription = new Subscription();

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router, private cursoService: CursoService, private authService: AuthService) { }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeComponent(): void {
    // 🟢 OBTENER ID de sección de manera robusta
    const idParam = this.route.snapshot.paramMap.get('id');
    this.idSeccion = Number(idParam);

    console.log('🎯 Inicializando actividades para sección ID:', this.idSeccion);

    // 🟢 Validar ID de sección
    if (!this.idSeccion || isNaN(this.idSeccion)) {
      this.error = 'ID de sección inválido';
      console.error('❌ ID de sección inválido:', idParam);
      return;
    }

    this.loadCurrentUser();
  }

  // 🟢 MÉTODO CONSISTENTE: Cargar usuario (igual que docente.ts)
  private loadCurrentUser(): void {
    console.log('🔍 Cargando información del usuario...');

    const userData = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      this.error = 'No estás autenticado. Por favor inicia sesión.';
      this.router.navigate(['/login']);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      // 🟢 MAPEO CONSISTENTE: Usar siempre los mismos campos
      this.currentUser = {
        id_docente: parsedUser.id_docente || null,
        id_usuario: parsedUser.id_usuario || parsedUser.id || null,
        nombre: parsedUser.nombre || parsedUser.nombres || '',
        apellido: parsedUser.apellido || parsedUser.apellidos || '',
        correo: parsedUser.correo || parsedUser.email || '',
        rol: parsedUser.rol || 'docente',
      };

      console.log('✅ Usuario cargado y normalizado:', this.currentUser);
      this.obtenerDatosDocenteCompletos();
    } catch (error) {
      console.error('❌ Error al procesar datos del usuario:', error);
      this.error = 'Error al cargar datos del usuario';
    }
  }

  // 🟢 MÉTODO CONSISTENTE: Obtener datos completos del docente
  private obtenerDatosDocenteCompletos(): void {
    console.log('🔄 Obteniendo datos actualizados del docente...');

    this.http
      .get<any>('http://localhost:4000/api/docentes/mi-docente', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .subscribe({
        next: (response) => {
          console.log('✅ Datos del docente obtenidos:', response);

          if (response.id_docente) {
            this.currentUser.id_docente = response.id_docente;
            this.id_docente_logeado = response.id_docente;

            if (response.docente) {
              this.currentUser = {
                ...this.currentUser,
                ...response.docente,
                correo: response.docente.correo || this.currentUser.correo,
              };
            }

            console.log('✅ Datos del docente actualizados:', this.currentUser);
            this.cargarDatosIniciales();
          } else {
            this.manejarError('No se pudo identificar tu perfil de docente');
          }
        },
        error: (error) => {
          console.error('❌ Error al obtener datos del docente:', error);

          if (error.status === 401) {
            this.manejarError('Sesión expirada. Por favor inicia sesión nuevamente.', true);
          } else {
            // 🟢 Usar datos locales si falla el servidor
            this.id_docente_logeado = this.currentUser.id_docente || 1;
            console.warn('⚠️ Usando datos locales del docente');
            this.cargarDatosIniciales();
          }
        },
      });
  }

  // Agrega esta propiedad
seccionesCompletas: any[] = []; // Para almacenar TODAS las secciones del docente

// Agrega este método para cargar todas las secciones
private cargarTodasLasSecciones(): void {
  const docenteId = this.currentUser?.id_docente;
  
  if (!docenteId) {
    console.warn('⚠️ No hay ID de docente para cargar secciones');
    return;
  }

  console.log('🔄 Cargando TODAS las secciones para docente ID:', docenteId);
  
  this.http.get<any>(`http://localhost:4000/api/secciones/docente/${docenteId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  }).subscribe({
    next: (response) => {
      console.log('📋 Respuesta de TODAS las secciones:', response);
      
      if (response.success && Array.isArray(response.data)) {
        this.seccionesCompletas = response.data;
        console.log(`✅ ${this.seccionesCompletas.length} secciones cargadas para el chat`);
      } else {
        console.warn('⚠️ Formato de respuesta inesperado:', response);
        this.seccionesCompletas = [];
      }
    },
    error: (error) => {
      console.error('❌ Error cargando secciones para chat:', error);
      this.seccionesCompletas = [];
    }
  });
}

  // Modifica cargarDatosIniciales() para llamar a cargarTodasLasSecciones
private cargarDatosIniciales(): void {
  console.log('🔄 Cargando datos iniciales...');
  this.cargarSeccionInfo();
  this.cargarActividades();
  this.cargarTodasLasSecciones(); // 🆕 AGREGAR esta línea
  setTimeout(() => this.actualizarContadorNotificaciones(), 1000);
}

// También actualiza el método onSeccionesActualizadas
onSeccionesActualizadas(secciones: any[]): void {
  console.log('Secciones actualizadas desde el chat:', secciones);
  this.seccionesCompletas = secciones; // Actualizar la lista completa
}

  private cargarSeccionInfo(): void {
    const token = this.getToken();
    if (!token) return;

    console.log('📚 Cargando información de la sección:', this.idSeccion);

    this.subscriptions.add(
      this.http
        .get<any>(`http://localhost:4000/api/secciones/${this.idSeccion}`, {
          headers: this.getAuthHeaders(),
        })
        .subscribe({
          next: (response) => {
            console.log('✅ Información de sección:', response);
            this.seccionInfo = response;
          },
          error: (error) => {
            console.error('❌ Error cargando información de la sección:', error);
            // 🟢 No bloquear la carga si falla la info de sección
            this.seccionInfo = {
              id_seccion: this.idSeccion,
              nombre: `Sección ${this.idSeccion}`,
            };
          },
        })
    );
  }

  // 🟢 MÉTODO CORREGIDO: Cargar actividades
  cargarActividades(): void {
    this.cargando = true;
    this.error = '';

    console.log('🔄 Cargando actividades para sección:', this.idSeccion);

    const token = this.getToken();
    if (!token) return;

    this.subscriptions.add(
      this.http
        .get<any>(`http://localhost:4000/api/actividades/seccion/${this.idSeccion}`, {
          headers: this.getAuthHeaders(),
        })
        .subscribe({
          next: (response) => {
            console.log('✅ Respuesta completa del servidor:', response);

            // 🟢 MANEJO MEJORADO de diferentes estructuras de respuesta
            if (response && response.success && Array.isArray(response.data)) {
              // Estructura: { success: true, data: [...] }
              this.actividades = response.data;
            } else if (Array.isArray(response)) {
              // Estructura: [...] (array directo)
              this.actividades = response;
            } else if (response && Array.isArray(response.actividades)) {
              // Estructura: { actividades: [...] }
              this.actividades = response.actividades;
            } else {
              console.warn('⚠️ Estructura de respuesta no reconocida:', response);
              this.actividades = [];
            }

            console.log('📚 Actividades cargadas:', this.actividades.length);
            this.aplicarFiltros();
            this.cargando = false;
          },
          error: (err) => {
            console.error('❌ Error cargando actividades:', err);
            console.error('🔍 Detalles del error:', err.status, err.message);

            this.error = this.obtenerMensajeError(err);
            this.cargando = false;

            if (err.status === 401) {
              this.handleUnauthorized();
            } else {
              // 🟢 Cargar datos de prueba si hay error de conexión
              this.cargarDatosDePrueba();
            }
          },
        })
    );
  }

  // 🟢 NUEVO MÉTODO: Aplicar filtros
  aplicarFiltros(): void {
    if (!this.actividades.length) {
      this.actividadesFiltradas = [];
      return;
    }

    switch (this.filtroEstado) {
      case 'activas':
        this.actividadesFiltradas = this.actividades.filter(
          (a) => a.estado === 'activo' || !a.estado
        );
        break;
      case 'completadas':
        this.actividadesFiltradas = this.actividades.filter((a) => a.estado === 'completada');
        break;
      case 'pendientes':
        this.actividadesFiltradas = this.actividades.filter((a) => a.estado === 'pendiente');
        break;
      default:
        this.actividadesFiltradas = [...this.actividades];
    }

    console.log(
      `🔍 Filtro aplicado: ${this.filtroEstado} - ${this.actividadesFiltradas.length} actividades`
    );
  }

  // 🟢 MÉTODO CONSISTENTE: Actualizar contador de notificaciones
  actualizarContadorNotificaciones(): void {
    if (!this.currentUser?.id_docente) {
      console.warn('⚠️ No hay ID de docente para cargar notificaciones');
      this.totalNotificaciones = 0;
      return;
    }

    const docenteId = this.currentUser.id_docente;

    console.log('🔄 Solicitando notificaciones para docente ID:', docenteId);

    this.http
      .get<any>(`http://localhost:4000/api/notificaciones/docente/${docenteId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .subscribe({
        next: (response) => {
          console.log('✅ Respuesta de notificaciones:', response);

          if (response.success && Array.isArray(response.data)) {
            this.totalNotificaciones = response.data.length;
            console.log(`📢 ${this.totalNotificaciones} notificaciones`);
          } else {
            console.warn('⚠️ Formato de respuesta inesperado:', response);
            this.totalNotificaciones = 0;
          }
        },
        error: (error) => {
          console.error('❌ Error al obtener notificaciones:', error);
          this.totalNotificaciones = 0;
        },
      });
  }

  // 🟢 MÉTODOS DE HEADER (consistentes con docente.ts)
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleNotificaciones(): void {
    this.showNotificaciones = !this.showNotificaciones;
  }

  cerrarNotificaciones(): void {
    this.showNotificaciones = false;
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.unreadMessages = 0;
    }
  }

  closeChat(): void {
    this.showChat = false;
  }

  refreshActividades(): void {
    this.cargarActividades();
  }

  // 🟢 MÉTODOS DE USUARIO (consistentes con docente.ts)
  getUserDisplayName(): string {
    const nombre = this.currentUser.nombre?.trim();
    const apellido = this.currentUser.apellido?.trim();

    if (nombre && apellido) {
      return `${nombre} ${apellido}`;
    } else if (nombre) {
      return nombre;
    } else if (apellido) {
      return apellido;
    }

    return 'Docente';
  }

  getUserEmail(): string {
    return this.currentUser.correo || 'correo@ejemplo.com';
  }

  logout(): void {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  // 🟢 MÉTODO DE DATOS DE PRUEBA
  private cargarDatosDePrueba(): void {
    console.log('🔄 Cargando datos de prueba...');

    this.actividades = [
      {
        id_actividad: 1,
        curso: 'Matemáticas',
        titulo: 'Ecuaciones Lineales - PRUEBA',
        descripcion: 'Resolver ecuaciones de primer grado con una incógnita - Datos de prueba',
        tipo: 'Tarea',
        fecha_inicio: '2024-01-15T08:00:00',
        fecha_fin: '2024-01-20T23:59:00',
        estado: 'activo',
        fecha_entrega: '2024-01-20T23:59:00',
        id_docente: this.id_docente_logeado || 1,
        id_seccion: this.idSeccion,
      },
      {
        id_actividad: 2,
        curso: 'Historia',
        titulo: 'Revolución Industrial - PRUEBA',
        descripcion:
          'Investigación sobre los efectos de la revolución industrial - Datos de prueba',
        tipo: 'Proyecto',
        fecha_inicio: '2024-01-16T10:00:00',
        fecha_fin: '2024-01-25T23:59:00',
        estado: 'completada',
        fecha_entrega: '2024-01-25T23:59:00',
        id_docente: this.id_docente_logeado || 1,
        id_seccion: this.idSeccion,
      },
      {
        id_actividad: 3,
        curso: 'Ciencias',
        titulo: 'Sistema Solar - PRUEBA',
        descripcion: 'Estudio del sistema solar y sus planetas - Datos de prueba',
        tipo: 'Examen',
        fecha_inicio: '2024-01-18T14:00:00',
        fecha_fin: '2024-01-22T23:59:00',
        estado: 'pendiente',
        fecha_entrega: '2024-01-22T23:59:00',
        id_docente: this.id_docente_logeado || 1,
        id_seccion: this.idSeccion,
      },
    ];

    this.seccionInfo = this.seccionInfo || {
      id_seccion: this.idSeccion,
      nombre: 'Sección ' + this.idSeccion,
    };

    this.aplicarFiltros();
    console.log('✅ Datos de prueba cargados:', this.actividades.length, 'actividades');
  }

  // 🟢 MÉTODO MEJORADO: Crear actividad
  crearActividad(): void {
    // 🟢 Validaciones completas antes de crear
    if (!this.validarNuevaActividad()) {
      alert(this.error);
      return;
    }

    const formData = new FormData();
    formData.append('curso', this.curso_nuevo.trim());
    formData.append('titulo', this.titulo_nuevo.trim());
    formData.append('descripcion', this.descripcion_nuevo.trim());
    formData.append('tipo', this.tipo_nuevo);
    formData.append('fecha_inicio', new Date(this.fecha_ini_nuevo).toISOString());
    formData.append('fecha_fin', new Date(this.fecha_fini_nuevo).toISOString());
    formData.append('estado', 'activo');
    formData.append('fecha_entrega', new Date(this.fecha_fini_nuevo).toISOString());
    formData.append('id_seccion', this.idSeccion.toString());

    // ✅ Cambiar aquí: usar archivoSeleccionado
    if (this.archivoSeleccionado) {
      formData.append('archivo', this.archivoSeleccionado, this.archivoSeleccionado.name);
    }

    /*const nuevaActividad = {
      curso: this.curso_nuevo.trim(),
      titulo: this.titulo_nuevo.trim(),
      descripcion: this.descripcion_nuevo.trim(),
      tipo: this.tipo_nuevo,
      fecha_inicio: this.fecha_ini_nuevo ? new Date(this.fecha_ini_nuevo).toISOString() : null,
      fecha_fin: this.fecha_fini_nuevo ? new Date(this.fecha_fini_nuevo).toISOString() : null,
      estado: 'activo',
      fecha_entrega: this.fecha_fini_nuevo ? new Date(this.fecha_fini_nuevo).toISOString() : null,
      id_docente: this.id_docente_logeado,
      id_seccion: this.idSeccion,
    };*/

    const token = this.getToken();
    if (!token) return;

    this.subscriptions.add(
      this.http
        .post('http://localhost:4000/api/actividades', formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .subscribe({
          next: (response) => {
            console.log('✅ Actividad creada correctamente:', response);
            alert('✅ Actividad creada correctamente');
            this.cargarActividades();
            this.cerrarFormActividad();
          },
          error: (err) => {
            console.error('❌ Error al crear la actividad', err);
            this.error = this.obtenerMensajeError(err);
            alert('❌ Error al crear la actividad: ' + this.error);
          },
        })
    );
  }

  // 🟢 MÉTODO MEJORADO: Validación de nueva actividad
  private validarNuevaActividad(): boolean {
    if (!this.curso_nuevo?.trim()) {
      this.error = 'El curso es requerido';
      return false;
    }

    if (!this.titulo_nuevo?.trim()) {
      this.error = 'El título es requerido';
      return false;
    }

    if (!this.descripcion_nuevo?.trim()) {
      this.error = 'La descripción es requerida';
      return false;
    }

    if (!this.tipo_nuevo) {
      this.error = 'El tipo de actividad es requerido';
      return false;
    }

    if (!this.fecha_ini_nuevo) {
      this.error = 'La fecha de inicio es requerida';
      return false;
    }

    if (!this.fecha_fini_nuevo) {
      this.error = 'La fecha de finalización es requerida';
      return false;
    }

    const fechaInicio = new Date(this.fecha_ini_nuevo);
    const fechaFin = new Date(this.fecha_fini_nuevo);
    const ahora = new Date();

    if (fechaInicio >= fechaFin) {
      this.error = 'La fecha de inicio debe ser anterior a la fecha de finalización';
      return false;
    }

    if (fechaInicio < new Date(ahora.getTime() - 5 * 60 * 1000)) {
      this.error = 'La fecha de inicio no puede ser en el pasado';
      return false;
    }

    if (!this.id_docente_logeado || this.id_docente_logeado <= 0) {
      this.error = 'ID de docente inválido. Recargue la página.';
      return false;
    }

    if (this.titulo_nuevo.trim().length > 100) {
      this.error = 'El título no puede tener más de 100 caracteres';
      return false;
    }

    if (this.descripcion_nuevo.trim().length > 500) {
      this.error = 'La descripción no puede tener más de 500 caracteres';
      return false;
    }

    this.error = '';
    return true;
  }

  // 🟢 RESTANTE DEL CÓDIGO (métodos auxiliares)
  private toDateTimeLocal(dateString: string | null): string {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }

  abrirModal(index: number): void {
    if (index < 0 || index >= this.actividades.length) {
      this.error = 'Índice de actividad inválido';
      return;
    }

    const actividad = this.actividades[index];

    if (!actividad || !actividad.id_actividad) {
      this.error = 'Actividad inválida';
      return;
    }

    this.actividadSeleccionada = index;
    this.curso_temporal = actividad.curso || '';
    this.titulo_temporal = actividad.titulo || '';
    this.descripcion_temporal = actividad.descripcion || '';
    this.tipo_actividad = actividad.tipo || 'Tarea';
    this.id_actual = actividad.id_actividad;

    this.fecha_temporal_inicio = this.toDateTimeLocal(actividad.fecha_inicio);
    this.fecha_temporal_final = this.toDateTimeLocal(actividad.fecha_fin);

    // 🔹 NUEVO: cargar intentos y archivo
    this.archivo_ruta_nuevo = actividad.archivo || '';

    this.archivoSeleccionado = null; // limpiar archivo local para reemplazo

    this.isModalOpen = true;
    this.error = '';

    this.cargarCursos()
  }

  cerrarModal(): void {
    this.actividadSeleccionada = null;
    this.isModalOpen = false;
    this.limpiarDatosTemporales();
    this.error = '';
  }

  mostrarFormActividad(): void {
    this.nuevaActividad = true;
    this.cargarCursos();
    this.limpiarDatosNuevaActividad();
    this.error = '';
  }

  cerrarFormActividad(): void {
    this.nuevaActividad = false;
    this.limpiarDatosNuevaActividad();
    this.error = '';
  }

  private limpiarDatosNuevaActividad(): void {
    this.curso_nuevo = '';
    this.titulo_nuevo = '';
    this.descripcion_nuevo = '';
    this.tipo_nuevo = '';
    this.fecha_ini_nuevo = '';
    this.fecha_fini_nuevo = '';
  }

  private limpiarDatosTemporales(): void {
    this.curso_temporal = '';
    this.titulo_temporal = '';
    this.descripcion_temporal = '';
    this.tipo_actividad = '';
    this.fecha_temporal_inicio = '';
    this.fecha_temporal_final = '';
    this.id_actual = null;
  }

  actualizarActividad(): void {
    if (!this.validarActividadActualizada()) {
      alert(this.error);
      return;
    }

    // Construir el FormData si hay archivo
    const formData = new FormData();
    formData.append('curso', this.curso_temporal?.trim() || '');
    formData.append('titulo', this.titulo_temporal?.trim() || '');
    formData.append('descripcion', this.descripcion_temporal?.trim() || '');
    formData.append('tipo', this.tipo_actividad || '');
    formData.append('fecha_inicio', this.fecha_temporal_inicio ? new Date(this.fecha_temporal_inicio).toISOString() : '');
    formData.append('fecha_fin', this.fecha_temporal_final ? new Date(this.fecha_temporal_final).toISOString() : '');
    formData.append('estado', 'activo');
    formData.append('fecha_entrega', this.fecha_temporal_final ? new Date(this.fecha_temporal_final).toISOString() : '');

    // ✅ Adjuntar archivo si existe
    if (this.archivoSeleccionado) {
      formData.append('archivo', this.archivoSeleccionado, this.archivoSeleccionado.name);
    }
    /*const actividadActualizada = {
      curso: this.curso_temporal?.trim() || null,
      titulo: this.titulo_temporal?.trim() || null,
      descripcion: this.descripcion_temporal?.trim() || null,
      tipo: this.tipo_actividad || null,
      fecha_inicio: this.fecha_temporal_inicio
        ? new Date(this.fecha_temporal_inicio).toISOString()
        : null,
      fecha_fin: this.fecha_temporal_final
        ? new Date(this.fecha_temporal_final).toISOString()
        : null,
      estado: 'activo',
      fecha_entrega: this.fecha_temporal_final
        ? new Date(this.fecha_temporal_final).toISOString()
        : null,
    };*/

    if (!this.id_actual) {
      this.error = '❌ No se encontró el ID de la actividad';
      alert(this.error);
      return;
    }

    const token = this.getToken();
    if (!token) return;

    this.subscriptions.add(
      this.http
        .put(`http://localhost:4000/api/actividades/${this.id_actual}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .subscribe({
          next: () => {
            console.log('✅ Actividad actualizada correctamente');
            alert('✅ Actividad actualizada correctamente');
            this.cargarActividades();
            this.cerrarModal();
          },
          error: (err) => {
            console.error('❌ Error al actualizar la actividad', err);
            this.error = this.obtenerMensajeError(err);
            alert('❌ Ocurrió un error al actualizar la actividad: ' + this.error);
          },
        })
    );
  }

  private validarActividadActualizada(): boolean {
    if (!this.curso_temporal?.trim()) {
      this.error = 'El curso es requerido';
      return false;
    }

    if (!this.titulo_temporal?.trim()) {
      this.error = 'El título es requerido';
      return false;
    }

    if (!this.descripcion_temporal?.trim()) {
      this.error = 'La descripción es requerida';
      return false;
    }

    if (!this.tipo_actividad) {
      this.error = 'El tipo de actividad es requerido';
      return false;
    }

    if (!this.fecha_temporal_inicio) {
      this.error = 'La fecha de inicio es requerida';
      return false;
    }

    if (!this.fecha_temporal_final) {
      this.error = 'La fecha de finalización es requerida';
      return false;
    }

    const fechaInicio = new Date(this.fecha_temporal_inicio);
    const fechaFin = new Date(this.fecha_temporal_final);

    if (fechaInicio >= fechaFin) {
      this.error = 'La fecha de inicio debe ser anterior a la fecha de finalización';
      return false;
    }

    if (this.titulo_temporal.trim().length > 100) {
      this.error = 'El título no puede tener más de 100 caracteres';
      return false;
    }

    if (this.descripcion_temporal.trim().length > 500) {
      this.error = 'La descripción no puede tener más de 500 caracteres';
      return false;
    }

    this.error = '';
    return true;
  }

  eliminarActividad(): void {
    if (
      !confirm(
        '¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    if (!this.id_actual) {
      this.error = '❌ No se encontró el ID de la actividad';
      alert(this.error);
      return;
    }

    const token = this.getToken();
    if (!token) return;

    this.subscriptions.add(
      this.http
        .delete(`http://localhost:4000/api/actividades/${this.id_actual}`, {
          headers: this.getAuthHeaders(),
        })
        .subscribe({
          next: () => {
            console.log('✅ Actividad eliminada correctamente');
            alert('✅ Actividad eliminada correctamente');
            this.cargarActividades();
            this.cerrarModal();
          },
          error: (err) => {
            console.error('❌ Error eliminando actividad:', err);
            this.error = this.obtenerMensajeError(err);
            alert('❌ Error al eliminar la actividad: ' + this.error);
          },
        })
    );
  }

  // 🟢 Utilidades
  trackByActividadId(index: number, actividad: Actividad): number {
    return actividad.id_actividad;
  }

  getActividadesActivas(): number {
    return this.actividades.filter((a) => a.estado === 'activo' || !a.estado).length;
  }

  getActividadesCompletadas(): number {
    return this.actividades.filter((a) => a.estado === 'completada').length;
  }

  getActividadesPendientes(): number {
    return this.actividades.filter((a) => a.estado === 'pendiente').length;
  }

  // 🟢 MÉTODOS AUXILIARES (consistentes con docente.ts)
  private getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) {
      this.error = 'No hay token de autenticación';
      this.handleUnauthorized();
      return null;
    }
    return token;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private handleUnauthorized(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    alert('Sesión expirada. Por favor, inicie sesión nuevamente.');
    window.location.href = '/login';
  }

  // En docente-actividades.ts, agrega estas propiedades:
showCalificaciones = false;
actividadSeleccionadaParaCalificar: any = null;

// Agrega estos métodos:

// 🟢 Abrir panel de calificaciones
abrirPanelCalificaciones(actividad: any): void {
  this.actividadSeleccionadaParaCalificar = actividad;
  this.showCalificaciones = true;
}

// 🟢 Cerrar panel de calificaciones
cerrarPanelCalificaciones(): void {
  this.showCalificaciones = false;
  this.actividadSeleccionadaParaCalificar = null;
}

// Modifica el HTML de la actividad para agregar el botón:

  private obtenerMensajeError(error: any): string {
    if (error.status === 0) return 'No se puede conectar al servidor. Verifique su conexión.';
    if (error.status === 400) return error.error?.message || 'Solicitud incorrecta';
    if (error.status === 401) return 'No autorizado. Por favor, inicie sesión nuevamente.';
    if (error.status === 403) return 'No tiene permisos para realizar esta acción';
    if (error.status === 404) return error.error?.message || 'Recurso no encontrado';
    if (error.status === 500) return error.error?.message || 'Error interno del servidor';
    if (error.error?.message) return error.error.message;
    if (error.message) return error.message;
    return 'Ha ocurrido un error inesperado';
  }

  private manejarError(mensaje: string, redirigir: boolean = false): void {
    console.error('❌ Error:', mensaje);
    this.error = mensaje;
    this.cargando = false;

    if (redirigir) {
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  // 🟢 Métodos auxiliares para la template
  getSeccionNombre(): string {
    return this.seccionInfo?.nombre || `Sección ${this.idSeccion}`;
  }

  tieneActividades(): boolean {
    return this.actividades.length > 0;
  }

  estaCargando(): boolean {
    return this.cargando;
  }

  hayError(): boolean {
    return this.error !== '';
  }

  filtrarPorMes(): void {
    if (!this.filtroMes) {
      // Si no se selecciona mes, mostrar todas
      this.actividadesFiltradas = this.actividades;
      return;
    }

    const token = this.getToken();
    if (!token) return;

    this.cargando = true;
    this.error = ''; // 🔹 limpia errores previos

    this.subscriptions.add(
      this.http
        .get<any[]>(`http://localhost:4000/api/actividades/mes/${this.filtroMes}`, {
          headers: this.getAuthHeaders(),
        })
        .subscribe({
          next: (data) => {
            console.log('✅ Actividades filtradas por mes:', data);

            if (data && data.length > 0) {
              this.actividadesFiltradas = data;
            } else {
              // 🔹 Si el backend devuelve vacío
              this.actividadesFiltradas = [];
              this.error = 'No se encontraron actividades del docente para el mes seleccionado';
            }

            this.cargando = false;
          },
          error: (err) => {
            // 🔹 Limpia las actividades si hubo error
            this.actividadesFiltradas = [];
            this.error = this.obtenerMensajeError(err);
            this.cargando = false;
          },
        })
    );
  }

  // Detectar archivo
  onArchivoSeleccionado(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.archivoSeleccionado = event.target.files[0];
      this.archivoNombre = this.archivoSeleccionado?.name || '';
    } else {
      this.archivoSeleccionado = null;
      this.archivoNombre = '';
    }
  }

  cargarCursos(): void {
    const token = this.authService.getToken(); // tu método para obtener token
    if (!this.idSeccion) {
      this.cursosDisponibles = [];
      return;
    }

    this.cursoService.getCursosPorSeccion(this.idSeccion!, token!).subscribe({
      next: (data) => {
        this.cursosDisponibles = data;
      },
      error: (err) => {
        console.error('Error al cargar cursos:', err);
        this.error = 'No se pudieron cargar los cursos';
      }
    });
  }
}