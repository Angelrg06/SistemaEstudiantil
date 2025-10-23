// src/app/paneles/docente/docente.ts - VERSIÓN OPTIMIZADA
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { DocenteChat } from './docente-chat/docente-chat';
import { DocenteNotificaciones } from './docente-notificaciones/docente-notificaciones';

@Component({
  selector: 'app-docente',
  standalone: true,
  imports: [CommonModule, RouterLink, HttpClientModule, DocenteChat, DocenteNotificaciones],
  templateUrl: './docente.html',
  styleUrls: ['./docente.css'],
})
export class Docente implements OnInit {
  secciones: any[] = [];
  alumnos: any[] = [];
  showUserMenu = false;
  showChat = false;
  showAlumnosPanel = false;
  unreadMessages = 0;
  isLoading = true;
  isLoadingAlumnos = false;
  showNotificaciones = false;
  totalNotificaciones = 0;
  errorMessage: string = '';
  alumnosErrorMessage: string = '';
  
  // 🟢 ESTRUCTURA UNIFICADA - Usa campos consistentes
  currentUser: any = {
    id_docente: null,
    id_usuario: null,
    nombre: '',
    apellido: '',
    correo: '', // 🟢 Usar solo 'correo' para consistencia
    rol: ''
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    console.log('🎯 Inicializando panel docente...');
    this.loadCurrentUser();
  // 🆕 Cargar contador de notificaciones
    setTimeout(() => this.actualizarContadorNotificaciones(), 1000);
  }
  

  // 🟢 MÉTODO MEJORADO: Cargar usuario con datos consistentes
  loadCurrentUser(): void {
    console.log('🔍 Cargando información del usuario...');
    
    const userData = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      this.errorMessage = 'No estás autenticado. Por favor inicia sesión.';
      this.isLoading = false;
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
        correo: parsedUser.correo || parsedUser.email || '', // 🟢 Unificar en 'correo'
        rol: parsedUser.rol || 'docente'
      };
      
      console.log('✅ Usuario cargado y normalizado:', this.currentUser);
      
      // 🟢 ESTRATEGIA MEJORADA: Obtener datos frescos del backend
      this.obtenerDatosDocenteCompletos();
      
    } catch (error) {
      console.error('❌ Error al procesar datos del usuario:', error);
      this.errorMessage = 'Error al cargar datos del usuario';
      this.isLoading = false;
    }
  }

  // 🟢 NUEVO MÉTODO: Obtener datos completos y actualizados del docente
  obtenerDatosDocenteCompletos(): void {
    console.log('🔄 Obteniendo datos actualizados del docente...');
    
    this.http.get<any>('http://localhost:4000/api/docentes/mi-docente', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: (response) => {
        console.log('✅ Datos del docente obtenidos:', response);
        
        // 🟢 ACTUALIZAR CON DATOS FRESCOS DEL BACKEND
        if (response.id_docente) {
          this.currentUser.id_docente = response.id_docente;
          
          // Si el backend devuelve más información del docente, actualizarla
          if (response.docente) {
            this.currentUser = {
              ...this.currentUser,
              ...response.docente,
              correo: response.docente.correo || this.currentUser.correo
            };
          }
          
          console.log('✅ Datos del docente actualizados:', this.currentUser);
          this.loadSecciones();
        } else {
          this.manejarError('No se pudo identificar tu perfil de docente');
        }
      },
      error: (error) => {
        console.error('❌ Error al obtener datos del docente:', error);
        
        if (error.status === 401) {
          this.manejarError('Sesión expirada. Por favor inicia sesión nuevamente.', true);
        } else if (error.status === 404) {
          console.warn('⚠️ Servicio docente no disponible, usando datos locales');
          this.loadSecciones(); // Intentar con datos locales
        } else {
          this.manejarError('Error al conectar con el servidor');
        }
      }
    });
  }

  // 🟢 MÉTODO MEJORADO: Cargar secciones con manejo robusto de errores
  loadSecciones(): void {
    const docenteId = this.currentUser?.id_docente;
    
    if (!docenteId) {
      this.manejarError('No se pudo identificar al docente para cargar las secciones');
      return;
    }

    console.log('🔄 Cargando secciones para docente ID:', docenteId);
    
    const url = `http://localhost:4000/api/secciones/docente/${docenteId}`;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<any>(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success && Array.isArray(response.data)) {
          this.secciones = this.procesarSecciones(response.data);
          console.log(`✅ ${this.secciones.length} secciones cargadas correctamente`);
          
          if (this.secciones.length === 0) {
            this.errorMessage = 'No tienes secciones asignadas. Contacta al administrador.';
          }
        } else {
          this.manejarError('Formato de respuesta inválido del servidor');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error cargando secciones:', error);
        this.manejarErrorCargaSecciones(error);
      }
    });
  }

  // 🟢 NUEVO MÉTODO: Procesar y normalizar datos de secciones
  private procesarSecciones(secciones: any[]): any[] {
    return secciones.map(seccion => ({
      ...seccion,
      // 🟢 Asegurar campos consistentes
      nombre: seccion.nombre || 'Sin nombre',
      curso: seccion.curso || seccion.nombre_curso || 'Sin curso asignado',
      estudiantes_count: seccion._count?.estudiantes || 0,
      actividades_count: seccion._count?.actividades || 0
    }));
  }

  // 🟢 MÉTODO MEJORADO: Cargar alumnos con datos consistentes
  loadAlumnos(id_seccion?: number): void {
    if (!this.currentUser?.id_docente) {
      this.alumnosErrorMessage = 'No se pudo identificar al docente.';
      return;
    }

    this.isLoadingAlumnos = true;
    this.alumnosErrorMessage = '';
    
    const url = id_seccion 
      ? `http://localhost:4000/api/secciones/docente/${this.currentUser.id_docente}/alumnos/seccion/${id_seccion}`
      : `http://localhost:4000/api/secciones/docente/${this.currentUser.id_docente}/alumnos`;

    console.log('👥 Cargando alumnos desde:', url);
    
    this.http.get<any>(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: (response) => {
        this.isLoadingAlumnos = false;
        
        if (response.success && Array.isArray(response.data)) {
          this.alumnos = this.procesarAlumnos(response.data);
          this.showAlumnosPanel = true;
          console.log(`✅ ${this.alumnos.length} alumnos cargados correctamente`);
        } else {
          this.alumnosErrorMessage = 'No se pudieron cargar los alumnos';
          this.alumnos = [];
        }
      },
      error: (error) => {
        this.isLoadingAlumnos = false;
        console.error('❌ Error cargando alumnos:', error);
        this.alumnosErrorMessage = 'Error al cargar los alumnos';
        this.alumnos = [];
      }
    });
  }

  // 🟢 NUEVO MÉTODO: Procesar y normalizar datos de alumnos
  private procesarAlumnos(alumnos: any[]): any[] {
    return alumnos.map(alumno => ({
      ...alumno,
      // 🟢 Campos consistentes para alumnos
      nombre_completo: `${alumno.nombre || ''} ${alumno.apellido || ''}`.trim(),
      correo: alumno.correo || alumno.email || '',
      tiene_chat: alumno.tieneChat || false
    }));
  }

  // 🟢 MÉTODO MEJORADO: Manejo centralizado de errores
  private manejarError(mensaje: string, redirigir: boolean = false): void {
    console.error('❌ Error:', mensaje);
    this.errorMessage = mensaje;
    this.isLoading = false;
    
    if (redirigir) {
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  // 🟢 MÉTODO MEJORADO: Manejo específico de errores de secciones
  private manejarErrorCargaSecciones(error: any): void {
    let mensaje = 'Error al cargar las secciones';
    
    switch (error.status) {
      case 401:
        mensaje = 'Sesión expirada. Por favor inicia sesión nuevamente.';
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 404:
        mensaje = 'No se encontraron secciones para este docente.';
        break;
      case 500:
        mensaje = 'Error interno del servidor. Intenta nuevamente.';
        break;
      case 0:
        mensaje = 'No se puede conectar al servidor. Verifica tu conexión.';
        break;
      default:
        mensaje = `Error: ${error.message}`;
    }
    
    this.manejarError(mensaje);
    this.secciones = [];
  }

  // ✅ MÉTODOS DE UI MEJORADOS
  verAlumnosSeccion(seccion: any): void {
    console.log('👥 Viendo alumnos de la sección:', seccion.nombre);
    this.loadAlumnos(seccion.id_seccion);
  }

  verTodosLosAlumnos(): void {
    console.log('👥 Viendo todos los alumnos del docente');
    this.loadAlumnos();
  }

  cerrarPanelAlumnos(): void {
    this.showAlumnosPanel = false;
    this.alumnos = [];
    this.alumnosErrorMessage = '';
  }

  refreshSecciones(): void {
    console.log('🔄 Actualizando secciones...');
    this.loadSecciones();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
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

    // 🆕 Método para toggle de notificaciones
  toggleNotificaciones(): void {
    this.showNotificaciones = !this.showNotificaciones;
  }

  cerrarNotificaciones(): void {
    this.showNotificaciones = false;
  }

  // 🆕 Actualizar el contador de notificaciones
  // 🆕 MÉTODO MEJORADO CON DIAGNÓSTICO
actualizarContadorNotificaciones(): void {
  if (!this.currentUser?.id_docente) {
    console.warn('⚠️ No hay ID de docente para cargar notificaciones');
    this.totalNotificaciones = 0;
    return;
  }

  const docenteId = this.currentUser.id_docente;
  
  console.log('🔄 Solicitando notificaciones para docente ID:', docenteId);
  console.log('👤 Docente actual:', this.getUserDisplayName());
  
  this.http.get<any>(`http://localhost:4000/api/notificaciones/docente/${docenteId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  }).subscribe({
    next: (response) => {
      console.log('✅ Respuesta completa de notificaciones:', response);
      
      if (response.success && Array.isArray(response.data)) {
        this.totalNotificaciones = response.data.length;
        console.log(`📢 Docente "${this.getUserDisplayName()}" tiene ${this.totalNotificaciones} notificaciones`);
        
        // Mostrar detalles de las notificaciones
        response.data.forEach((notif: any, index: number) => {
          console.log(`   ${index + 1}. ${notif.mensaje} (${notif.tipo})`);
        });
      } else {
        console.warn('⚠️ Formato de respuesta inesperado:', response);
        this.totalNotificaciones = 0;
      }
    },
    error: (error) => {
      console.error('❌ Error al obtener notificaciones:', error);
      
      if (error.status === 404) {
        console.error('🔴 ENDPOINT NO ENCONTRADO: Verifica que hayas agregado las rutas en app.js');
        console.log('💡 Solución: Agrega estas líneas en app.js:');
        console.log('   import notificacionesRoutes from "./routes/notificaciones.routes.js"');
        console.log('   app.use("/api/notificaciones", authMiddleware, notificacionesRoutes)');
      }
      
      this.totalNotificaciones = 0;
    }
  });
}

  onSeccionesActualizadas(secciones: any[]): void {
    console.log('Secciones actualizadas desde el chat:', secciones);
    this.secciones = this.procesarSecciones(secciones);
  }

  logout(): void {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  // ✅ MÉTODOS DE DATOS MEJORADOS
  getTotalEstudiantes(): number {
    return this.secciones.reduce((total, seccion) => 
      total + (seccion.estudiantes_count || 0), 0
    );
  }

  getTotalActividades(): number {
    return this.secciones.reduce((total, seccion) => 
      total + (seccion.actividades_count || 0), 0
    );
  }

  // 🟢 MÉTODOS DE USUARIO MEJORADOS - Campos consistentes
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

  // ✅ MÉTODOS DE RENDIMIENTO
  trackBySeccionId(index: number, seccion: any): number {
    return seccion.id_seccion;
  }

  trackByAlumnoId(index: number, alumno: any): number {
    return alumno.id_estudiante || index;
  }

  // 🔍 MÉTODOS DE DIAGNÓSTICO MEJORADOS
  testBackendCompleto(): void {
    console.group('🧪 TEST COMPLETO DEL SISTEMA');
    
    const tests = [
      { name: 'Health Check', url: 'http://localhost:4000/api/secciones/health' },
      { name: 'Servicio Docente', url: 'http://localhost:4000/api/docentes/mi-docente' },
      { name: 'Secciones', url: `http://localhost:4000/api/secciones/docente/${this.currentUser.id_docente || 1}` }
    ];
    
    tests.forEach(test => {
      this.http.get(test.url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).subscribe({
        next: (response) => console.log(`✅ ${test.name}: OK`),
        error: (error) => console.log(`❌ ${test.name}: FALLA (${error.status})`)
      });
    });
    
    console.groupEnd();
  }

  // 🟢 NUEVO MÉTODO: Verificar estado del sistema
  verificarEstadoSistema(): void {
    console.group('🔍 ESTADO DEL SISTEMA');
    console.log('👤 Usuario:', this.getUserDisplayName());
    console.log('📧 Correo:', this.getUserEmail());
    console.log('🎯 ID Docente:', this.currentUser.id_docente);
    console.log('📚 Secciones:', this.secciones.length);
    console.log('👥 Alumnos cargados:', this.alumnos.length);
    console.log('🔐 Autenticado:', !!localStorage.getItem('token'));
    console.groupEnd();
  }
}