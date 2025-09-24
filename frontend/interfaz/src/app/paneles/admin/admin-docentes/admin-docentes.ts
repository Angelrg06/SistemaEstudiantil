import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-docentes.html',
  styleUrls: ['./admin-docentes.css']
})
export class AdminDocentes implements OnInit {
  docentes: any[] = [];
  docentesFiltrados: any[] = [];
  selectedDocente: any = null;
  isEditing = false;
  showModal = false;

  // Variables para filtros y paginación
  searchTerm: string = '';
  selectedDepartamento: string = '';
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadDocentes();
  }

  loadDocentes() {
    this.adminService.getDocentes().subscribe({
      next: (data) => {
        this.docentes = data;
        this.aplicarFiltros();
      },
      error: (error) => {
        console.error('Error loading docentes:', error);
      }
    });
  }

  // Lógica de filtros
  aplicarFiltros() {
    let filtrados = [...this.docentes];

    // Buscar por código, DNI, nombre, apellido o correo
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(d => 
        d.codigo.toLowerCase().includes(termino) ||
        d.dni.toLowerCase().includes(termino) ||
        d.nombre.toLowerCase().includes(termino) ||
        d.apellido.toLowerCase().includes(termino) ||
        (d.usuario?.correo && d.usuario.correo.toLowerCase().includes(termino))
      );
    }

    // Filtrar por departamento
    if (this.selectedDepartamento.trim() !== '') {
      filtrados = filtrados.filter(d => 
        d.departamento === this.selectedDepartamento
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
    this.docentesFiltrados = filtrados.slice(inicio, fin);
  }

  // Métodos de filtro
  buscarDocentes() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  filtrarPorDepartamento() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // Navegación de páginas
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

  // Filas vacías para altura fija
  filasVacias(): number[] {
    const usuariosEnPagina = this.docentesFiltrados.length;
    const filasVaciasCount = Math.max(0, this.registrosPorPagina - usuariosEnPagina);
    return new Array(filasVaciasCount).fill(0);
  }

  // Métodos originales (sin cambios)
  openModal(docente?: any) {
    this.isEditing = !!docente;
    this.selectedDocente = docente ? { ...docente } : {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      usuario: {
        correo: '',
        password: '',
        rol: 'docente'
      }
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedDocente = null;
  }

  saveDocente() {
    if (this.isEditing) {
      this.adminService.updateDocente(this.selectedDocente.id_docente, this.selectedDocente)
        .subscribe({
          next: () => {
            this.loadDocentes();
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating docente:', error);
          }
        });
    } else {
      this.adminService.createDocente(this.selectedDocente)
        .subscribe({
          next: () => {
            this.loadDocentes();
            this.closeModal();
          },
          error: (error) => {
            console.error('Error creating docente:', error);
          }
        });
    }
  }

  deleteDocente(id: number) {
    if (confirm('¿Está seguro de eliminar este docente?')) {
      this.adminService.deleteDocente(id).subscribe({
        next: () => {
          this.loadDocentes();
        },
        error: (error) => {
          console.error('Error deleting docente:', error);
        }
      });
    }
  }
}