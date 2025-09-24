import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-usuarios.html'
})
export class AdminUsuarios implements OnInit {
  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];

  // Filtros
  searchTerm: string = '';
  selectedRol: string = '';

  // Paginación
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.adminService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.aplicarFiltros();
      },
      error: (error) => console.error('Error loading usuarios:', error)
    });
  }

  aplicarFiltros() {
    let filtrados = [...this.usuarios];

    // Buscar por correo e ID (ignorar mayúsculas/minúsculas)
    if (this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase().trim();
      filtrados = filtrados.filter(u => 
        u.correo.toLowerCase().includes(termino) ||
        u.id_usuario.toString().includes(termino)
      );
    }

    // Filtrar por rol (comparación exacta pero insensible a mayúsculas)
    if (this.selectedRol.trim() !== '') {
      filtrados = filtrados.filter(u => 
        u.rol.toLowerCase() === this.selectedRol.toLowerCase()
      );
    }

    // Paginación
    this.totalPaginas = Math.ceil(filtrados.length / this.registrosPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;
    
    // Ajustar página actual si excede el total
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }

    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    this.usuariosFiltrados = filtrados.slice(inicio, fin);
  }

  buscarUsuarios() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  filtrarPorRol() {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

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

  // CORREGIDO: Filas vacías para mantener altura fija
 filasVacias(): number[] {
  const usuariosEnPagina = this.usuariosFiltrados.length;
  const filasVaciasCount = Math.max(0, this.registrosPorPagina - usuariosEnPagina);
  return new Array(filasVaciasCount).fill(0);
}
}