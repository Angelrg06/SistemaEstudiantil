import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-estudiantes.html',
  styleUrls: ['./admin-estudiantes.css']
})
export class AdminEstudiantes implements OnInit {
  estudiantes: any[] = [];
  estudiantesFiltrados: any[] = [];
  selectedEstudiante: any = null;
  isEditing = false;
  showModal = false;
  secciones: any[] = [];

  // AGREGADO: Variables para filtros y paginación
  searchTerm: string = '';
  selectedSeccion: string = '';
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;
  errors: any = {};
  mostrarPassword: boolean = false;
  loading: boolean = false;

  successMessage: string = '';
 highlightedEstudianteId: number | null = null;


  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadEstudiantes();
    this.loadSecciones();
  }

  loadEstudiantes() {
    this.adminService.getEstudiantes().subscribe({
      next: (data) => {
        this.estudiantes = data;
        this.aplicarFiltros(); // AGREGADO: Aplicar filtros después de cargar
      },
      error: (error) => {
        console.error('Error loading estudiantes:', error);
      }
    });
  }

  loadSecciones() {
    this.adminService.getSecciones().subscribe({
      next: (data) => {
        this.secciones = data; // [{id_seccion: 1, nombre: 'A'}, ...]
      },
      error: (error) => {
        console.error('Error cargando secciones:', error);
      }
    });
  }
  // AGREGADO: Lógica de filtros
  aplicarFiltros() {
    let filtrados = [...this.estudiantes];

    // Buscar por código, DNI, nombre, apellido o correo
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(e =>
        e.codigo.toLowerCase().includes(termino) ||
        e.dni.toLowerCase().includes(termino) ||
        e.nombre.toLowerCase().includes(termino) ||
        e.apellido.toLowerCase().includes(termino) ||
        (e.usuario?.correo && e.usuario.correo.toLowerCase().includes(termino))
      );
    }

    // Filtrar por sección
    if (this.selectedSeccion.trim() !== '') {
      filtrados = filtrados.filter(e =>
        e.seccion?.nombre === this.selectedSeccion
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
    this.estudiantesFiltrados = filtrados.slice(inicio, fin);
  }

  // AGREGADO: Métodos de filtro
  buscarEstudiantes() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  filtrarPorSeccion() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // AGREGADO: Navegación de páginas
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

  // AGREGADO: Filas vacías para altura fija
  filasVacias(): number[] {
    const usuariosEnPagina = this.estudiantesFiltrados.length;
    const filasVaciasCount = Math.max(0, this.registrosPorPagina - usuariosEnPagina);
    return new Array(filasVaciasCount).fill(0);
  }

  // TUS MÉTODOS ORIGINALES (sin cambios)
  openModal(estudiante?: any) {
    this.isEditing = !!estudiante;
    this.selectedEstudiante = estudiante ? { ...estudiante } : {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      id_seccion: null,
      usuario: {
        correo: '',
        password: '',
        rol: 'estudiante'
      }
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedEstudiante = null;
  }
  resetModal() {
    this.selectedEstudiante = {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      id_seccion: null,
      usuario: { correo: '', password: '', rol: 'estudiante' }
    };
    this.isEditing = false;
    this.errors = {};
    this.successMessage = '';
  }
  validateEstudiante(): boolean {
    this.errors = {};
    const { dni, nombre, apellido, usuario, id_seccion } = this.selectedEstudiante;

    if (!/^\d{8}$/.test(dni)) this.errors.dni = '* DNI inválido';

    const nameRegex = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
    const maxWords = 3;

    const nombreWords = nombre?.trim().split(/\s+/) || [];
    if (nombreWords.length > maxWords || !nombreWords.every((w: string) => nameRegex.test(w))) {
      this.errors.nombre = '* Nombre inválido';
    }

    const apellidoWords = apellido?.trim().split(/\s+/) || [];
    if (apellidoWords.length > maxWords || !apellidoWords.every((w: string) => nameRegex.test(w))) {
      this.errors.apellido = '* Apellido inválido';
    }
    // Corregido: convertir id_seccion a número antes de comparar
    const selectedId = Number(id_seccion);
    if (!selectedId || !this.secciones.find(s => s.id_seccion === selectedId)) {
      this.errors.id_seccion = '* Sección inválida';
    } else {
      this.selectedEstudiante.id_seccion = selectedId;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!usuario?.correo || !emailRegex.test(usuario.correo)) {
      this.errors.correo = '* Correo inválido';
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!this.isEditing && (!usuario?.password || !passRegex.test(usuario.password))) {
      this.errors.password = '* Contraseña inválida';
    }

    const isValid = Object.keys(this.errors).length === 0;

    if (!isValid) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.text-red-600');
        if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }

    return isValid;
  }
  validateName(str: string): boolean {
    if (!str) return false;
    const spaceCount = (str.match(/\s/g) || []).length;
    if (spaceCount > 2) return false; // máximo 2 espacios
    const words = str.trim().split(/\s+/);
    const nameRegex = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/;
    return words.every(w => nameRegex.test(w));
  }
saveEstudiante() {
  if (!this.selectedEstudiante || this.loading) return;
  if (!this.validateEstudiante()) return;

  this.loading = true;
  const { usuario, ...estudianteData } = this.selectedEstudiante;

  const dataToSend: any = {
    ...estudianteData,
    id_seccion: estudianteData.id_seccion
  };

  // Solo enviar usuario si hay datos reales
  if (usuario) {
    dataToSend.usuario = {};
    if (usuario.correo?.trim() !== '') dataToSend.usuario.correo = usuario.correo.trim();
    if (!this.isEditing && usuario.password?.trim() !== '') dataToSend.usuario.password = usuario.password;
  }

  if (this.isEditing) {
    this.adminService.updateEstudiante(this.selectedEstudiante.id_estudiante, dataToSend)
      .subscribe({
        next: () => {
          this.loadEstudiantes();
          this.successMessage = 'Estudiante actualizado correctamente ✅';
          setTimeout(() => { this.successMessage = ''; this.loading = false; }, 1500);
        },
        error: (error) => {
          console.error('Error updating estudiante:', error);
          this.successMessage = error.error?.error || 'Ocurrió un error al actualizar';
          this.loading = false;
        }
      });
  } else {
    this.adminService.createEstudiante(dataToSend)
      .subscribe({
        next: () => {
          this.loadEstudiantes();
          this.successMessage = 'Estudiante registrado correctamente ✅';
          setTimeout(() => { this.resetModal(); this.successMessage = ''; this.loading = false; }, 1500);
        },
        error: (error) => {
          console.error('Error creating estudiante:', error);
          this.successMessage = error.error?.error || 'Ocurrió un error al registrar';
          this.loading = false;
        }
      });
  }
}


  deleteEstudiante(id: number) {
    if (confirm('¿Está seguro de eliminar este estudiante?')) {
      this.adminService.deleteEstudiante(id).subscribe({
        next: () => {
          this.loadEstudiantes(); // Esto llamará aplicarFiltros()
        },
        error: (error) => {
          console.error('Error deleting estudiante:', error);
        }
      });
    }
  }
}