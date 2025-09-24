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

  constructor(private adminService: AdminService) {}

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
    // Simular secciones - deberías obtenerlas de tu API
    this.secciones = [
      { id_seccion: 1, nombre: 'Sección A' },
      { id_seccion: 2, nombre: 'Sección B' },
      { id_seccion: 3, nombre: 'Sección C' }
    ];
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

  saveEstudiante() {
    if (this.isEditing) {
      this.adminService.updateEstudiante(this.selectedEstudiante.id_estudiante, this.selectedEstudiante)
        .subscribe({
          next: () => {
            this.loadEstudiantes(); // Esto llamará aplicarFiltros()
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating estudiante:', error);
          }
        });
    } else {
      this.adminService.createEstudiante(this.selectedEstudiante)
        .subscribe({
          next: () => {
            this.loadEstudiantes(); // Esto llamará aplicarFiltros()
            this.closeModal();
          },
          error: (error) => {
            console.error('Error creating estudiante:', error);
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