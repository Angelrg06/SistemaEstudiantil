// src/app/paneles/admin/admin-dashboard/subcomponentes/dashboard-last-estudiantes/dashboard-last-estudiantes.ts
import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../../../services/admin.service';

interface Estudiante {
  id: number;
  nombre: string;
  email: string;
  seccion?: string;
  fechaIngreso?: string;
  usuario?: {
    nombre: string;
    email: string;
  };
}

@Component({
  selector: 'app-dashboard-last-estudiantes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-last-estudiantes.html',
  styleUrls: ['./dashboard-last-estudiantes.css']
})
export class DashboardLastEstudiantes implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  
  estudiantes: Estudiante[] = [];
  loading: boolean = false;
  error: string = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    // Solo cargar si el componente es visible al inicializar
    if (this.isVisible) {
      this.loadEstudiantes();
    }
  }

  ngOnChanges() {
    // Cargar datos cuando el componente se hace visible
    if (this.isVisible && this.estudiantes.length === 0) {
      this.loadEstudiantes();
    }
  }

  loadEstudiantes() {
    this.loading = true;
    this.error = '';

    // Intentamos primero con el método específico
    this.adminService.getLastEstudiantes(5).subscribe({
      next: (response) => {
        // Si el backend devuelve un array directamente
        if (Array.isArray(response)) {
          this.estudiantes = response.slice(0, 5);
        } 
        // Si el backend devuelve un objeto con datos
        else if (response.data && Array.isArray(response.data)) {
          this.estudiantes = response.data.slice(0, 5);
        }
        // Si el backend devuelve un objeto con estudiantes
        else if (response.estudiantes && Array.isArray(response.estudiantes)) {
          this.estudiantes = response.estudiantes.slice(0, 5);
        }
        else {
          this.estudiantes = [];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando últimos estudiantes:', err);
        // Fallback: usar el método general de estudiantes
        this.loadEstudiantesFallback();
      }
    });
  }

  private loadEstudiantesFallback() {
    this.adminService.getEstudiantes().subscribe({
      next: (response) => {
        let allEstudiantes = [];
        
        // Manejar diferentes formatos de respuesta
        if (Array.isArray(response)) {
          allEstudiantes = response;
        } else if (response.data) {
          allEstudiantes = response.data;
        } else if (response.estudiantes) {
          allEstudiantes = response.estudiantes;
        }

        // Tomar solo los últimos 5 (asumir que vienen ordenados)
        this.estudiantes = allEstudiantes.slice(0, 5);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error en fallback de estudiantes:', err);
        this.error = 'Error cargando datos de estudiantes';
        this.loading = false;
      }
    });
  }

  // Método para formatear fecha si existe
  formatFecha(fecha: string | undefined): string {
    if (!fecha) return 'No especificada';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  }

  // Método para obtener iniciales del nombre
  getInitials(nombre: string): string {
    return nombre
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  // Método para ir a la sección completa de estudiantes
  verTodos() {
    // Este método será implementado para comunicarse con el componente padre
    // Por ahora, emitimos un evento o usamos un servicio de navegación
    console.log('Navegar a sección completa de estudiantes');
    // TODO: Implementar navegación a admin-estudiantes
  }

  // TrackBy function para optimizar el renderizado
  trackByEstudiante(index: number, estudiante: Estudiante): number {
    return estudiante.id;
  }
}