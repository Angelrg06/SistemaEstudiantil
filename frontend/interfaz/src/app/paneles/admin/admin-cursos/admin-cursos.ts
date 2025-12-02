// admin-cursos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';
import { ExportPdfService } from '../../../services/admin/export.service';
@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cursos.html',
  styleUrls: ['./admin-cursos.css']
})
export class AdminCursos implements OnInit {
  // Variables principales
  cursos: any[] = [];
  cursosFiltrados: any[] = [];
  selectedCurso: any = null;
  isEditing = false;
  showModal = false;
  errors: any = {};
  
  // Variables para filtros y paginación
  searchTerm: string = '';
  paginaActual: number = 1;
  registrosPorPagina: number = 10;
  totalPaginas: number = 1;

  // Variables UI
  loading: boolean = false;
  successMessage: string = '';
  highlightedCursoId: number | null = null;

  // Variables para secciones (para relacionar cursos con secciones)
  seccionesDisponibles: any[] = [];
  seccionesSeleccionadas: number[] = [];

  constructor(private adminService: AdminService,
        private exportPdfService: ExportPdfService // 👈 Agregar esto
  ) { }

  ngOnInit() {
    this.loadCursos();
    this.cargarSecciones();
  }

  // ==============================
  // MÉTODOS DE CARGA DE DATOS
  // ==============================
  
  cargarSecciones() {
    this.adminService.getSecciones().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.seccionesDisponibles = response.data;
        } else if (Array.isArray(response)) {
          this.seccionesDisponibles = response;
        }
        console.log(`📋 ${this.seccionesDisponibles.length} secciones cargadas`);
      },
      error: (error) => {
        console.error('Error cargando secciones:', error);
        this.seccionesDisponibles = [];
      }
    });
  }

  
  loadCursos() {
    this.adminService.getCursos().subscribe({
      next: (data) => {
        this.cursos = data;
        this.aplicarFiltros();
      },
      error: (error) => {
        console.error('Error loading cursos:', error);
      }
    });
  }

  // ==============================
  // MÉTODOS DE FILTRADO
  // ==============================
  
  aplicarFiltros() {
    let filtrados = [...this.cursos];

    // Buscar por nombre o código
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(c =>
        c.nombre.toLowerCase().includes(termino) ||
        (c.codigo && c.codigo.toLowerCase().includes(termino))
      );
    }

    // Calcular paginación
    this.totalPaginas = Math.ceil(filtrados.length / this.registrosPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }

    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    this.cursosFiltrados = filtrados.slice(inicio, fin);
  }

  buscarCursos() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // ==============================
  // MÉTODOS DE PAGINACIÓN
  // ==============================
  
  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.aplicarFiltros();
    }
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
      this.aplicarFiltros();
    }
  }

  filasVacias(): number[] {
    const cursosEnPagina = this.cursosFiltrados.length;
    const filasVaciasCount = Math.max(0, this.registrosPorPagina - cursosEnPagina);
    return new Array(filasVaciasCount).fill(0);
  }

  // ==============================
  // MÉTODOS DE GESTIÓN DE SECCIONES
  // ==============================
  
  toggleSeccion(id: number) {
    const index = this.seccionesSeleccionadas.indexOf(id);
    if (index > -1) {
      this.seccionesSeleccionadas.splice(index, 1);
    } else {
      this.seccionesSeleccionadas.push(id);
    }
    console.log('Secciones seleccionadas para el curso:', this.seccionesSeleccionadas);
  }

  isSeccionSelected(id: number): boolean {
    return this.seccionesSeleccionadas.includes(id);
  }

  // ==============================
  // MÉTODOS DEL MODAL
  // ==============================
  
  openModal(curso?: any) {
    this.isEditing = !!curso;
    this.seccionesSeleccionadas = [];
    this.errors = {};
    this.successMessage = '';

    if (curso) {
      // Copia profunda
      this.selectedCurso = JSON.parse(JSON.stringify(curso));
      
      // Cargar secciones asignadas (si el curso tiene secciones)
      if (curso.secciones && Array.isArray(curso.secciones)) {
        this.seccionesSeleccionadas = curso.secciones.map((s: any) => s.id_seccion);
      } else if (curso.seccionesCurso && Array.isArray(curso.seccionesCurso)) {
        this.seccionesSeleccionadas = curso.seccionesCurso.map((sc: any) => sc.id_seccion);
      }
      
      console.log('Curso a editar:', this.selectedCurso);
      console.log('Secciones asignadas:', this.seccionesSeleccionadas);
    } else {
      // Nuevo curso
      this.selectedCurso = {
        nombre: '',
        descripcion: ''
      };
      console.log('Nuevo curso inicializado');
    }

    this.showModal = true;
    this.loading = false;
  }

  closeModal() {
    this.showModal = false;
    this.selectedCurso = null;
    this.seccionesSeleccionadas = [];
    this.errors = {};
    this.loading = false;
    this.successMessage = '';
  }

  // ==============================
  // MÉTODOS DE VALIDACIÓN
  // ==============================
  
  validateFields(): boolean {
    this.errors = {};
    const { nombre } = this.selectedCurso;

    if (!nombre || nombre.trim() === '') {
      this.errors.nombre = '* Nombre del curso es requerido';
    } else if (nombre.length < 3) {
      this.errors.nombre = '* El nombre debe tener al menos 3 caracteres';
    }

    const isValid = Object.keys(this.errors).length === 0;

    if (!isValid) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.text-red-600');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }

    return isValid;
  }

  // ==============================
  // MÉTODOS CRUD
  // ==============================
  
 saveCurso() {
  console.log('💾 Guardando curso...');
  
  if (!this.validateFields()) {
    console.log('❌ Validación fallida');
    return;
  }

  if (this.loading) {
    console.log('⏳ Ya está procesando, espera...');
    return;
  }

  this.loading = true;

  // Preparar datos para enviar SIN descripcion
  const requestData = {
    nombre: this.selectedCurso.nombre,
    seccionesIds: this.seccionesSeleccionadas
    // NO incluir descripcion
  };

  console.log('📤 Enviando datos al servidor:', requestData);

  let requestObservable;
  
  if (this.isEditing) {
    if (!this.selectedCurso.id_curso) {
      console.error('❌ No hay ID de curso para editar');
      this.successMessage = 'Error: No se encontró el ID del curso';
      this.loading = false;
      return;
    }
    
    console.log(`✏️ Editando curso ID: ${this.selectedCurso.id_curso}`);
    requestObservable = this.adminService.updateCurso(this.selectedCurso.id_curso, requestData);
  } else {
    console.log('🆕 Creando nuevo curso');
    requestObservable = this.adminService.createCurso(requestData);
  }

  requestObservable.subscribe({
    next: (response) => {
      console.log('✅ Respuesta del servidor:', response);
      
      this.successMessage = this.isEditing
        ? `✅ Curso "${requestData.nombre}" actualizado correctamente`
        : `✅ Curso "${requestData.nombre}" creado correctamente`;
      
      // Refrescar lista
      this.loadCursos();
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        this.closeModal();
      }, 2000);
    },
    error: (error) => {
      console.error('❌ Error en la petición:', error);
      this.loading = false;
      
      if (error.status === 400) {
        this.successMessage = `❌ ${error.error?.error || 'Error en los datos enviados'}`;
      } else if (error.status === 404) {
        this.successMessage = '❌ Recurso no encontrado';
      } else if (error.status === 500) {
        this.successMessage = '❌ Error interno del servidor';
      } else if (error.status === 0) {
        this.successMessage = '❌ No se pudo conectar al servidor';
      } else {
        this.successMessage = `❌ Error ${error.status}: ${error.statusText || 'Error desconocido'}`;
      }
    }
  });
}

  exportarPDF() {
    console.log('📄 Generando PDF de cursos...');
    
    const cursosAExportar = this.searchTerm.trim() !== '' 
      ? this.cursosFiltrados 
      : this.cursos;
    
    const filtros = {
      searchTerm: this.searchTerm,
      fecha: new Date().toLocaleDateString()
    };
    
    this.exportPdfService.exportCursosPDF(cursosAExportar, filtros);
    
    this.successMessage = `✅ PDF generado con ${cursosAExportar.length} cursos`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  deleteCurso(id: number) {
    if (!confirm('¿Está seguro de eliminar este curso?')) return;

    this.adminService.deleteCurso(id).subscribe({
      next: () => {
        this.loadCursos();
        this.successMessage = '✅ Curso eliminado correctamente';
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error deleting curso:', error);
        this.successMessage = '❌ Error al eliminar curso';
      }
    });
  }
}