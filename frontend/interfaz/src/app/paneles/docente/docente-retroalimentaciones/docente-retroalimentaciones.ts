// docente-retroalimentaciones.ts - CORRECCIONES
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface Entrega {
  id_entrega: number;
  id_estudiante: number;
  estudiante: {
    id_estudiante: number;
    codigo: string;
    nombre: string;
    apellido: string;
  };
  intento: number;
  fecha_entrega: string;
  archivo: string;
  archivo_ruta?: string; // ✅ AGREGAR
  comentario_estudiante: string;
  estado_entrega: string;
  retroalimentacion?: {
    id_retroalimentacion: number;
    calificacion: number;
    comentario: string;
    fecha: string;
  };
}

@Component({
  selector: 'app-docente-retroalimentaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './docente-retroalimentaciones.html',
  styleUrls: ['./docente-retroalimentaciones.css']
})
export class DocenteRetroalimentaciones implements OnInit {
  @Input() actividadId!: number;
  @Input() actividadTitulo: string = '';
  @Input() seccionId?: number;
  @Output() cerrar = new EventEmitter<void>();

  cargando: boolean = false;
  error: string = '';

  entregas: Entrega[] = [];
  estadisticas: any = {};

  calificacionTemp: { [key: number]: number } = {};
  comentarioTemp: { [key: number]: string } = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.actividadId) {
      this.cargarEntregasParaCalificar();
    }
  }

  // ✅ CORREGIDO: Cargar entregas
  cargarEntregasParaCalificar(): void {
    this.cargando = true;
    this.error = '';

    const token = this.getToken();
    if (!token) {
      this.error = 'No hay token de autenticación';
      this.cargando = false;
      return;
    }

    this.http.get<any>(
      `http://localhost:4000/api/retroalimentaciones/actividad/${this.actividadId}/entregas`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response) => {
        this.cargando = false;
        
        if (response.success) {
          this.entregas = this.procesarEntregas(response.data?.estudiantes || []);
          this.estadisticas = response.data?.estadisticas || {};
          console.log('✅ Entregas cargadas:', this.entregas.length);
          
          // Inicializar formularios temporales
          this.entregas.forEach(entrega => {
            if (entrega.retroalimentacion) {
              this.calificacionTemp[entrega.id_entrega] = entrega.retroalimentacion.calificacion;
              this.comentarioTemp[entrega.id_entrega] = entrega.retroalimentacion.comentario || '';
            }
          });
        } else {
          this.error = response.message || 'Error al cargar entregas';
        }
      },
      error: (error) => {
        this.cargando = false;
        this.error = this.obtenerMensajeError(error);
        console.error('❌ Error cargando entregas:', error);
      }
    });
  }

  // ✅ MEJORADO: Procesar entregas
  private procesarEntregas(estudiantesData: any[]): Entrega[] {
    const entregas: Entrega[] = [];

    estudiantesData.forEach(estudianteData => {
      estudianteData.entregas?.forEach((entrega: any) => {
        entregas.push({
          id_entrega: entrega.id_entrega,
          id_estudiante: estudianteData.estudiante.id_estudiante,
          estudiante: estudianteData.estudiante,
          intento: entrega.intento,
          fecha_entrega: entrega.fecha_entrega,
          archivo: entrega.archivo,
          archivo_ruta: entrega.archivo_ruta,
          comentario_estudiante: entrega.comentario_estudiante,
          estado_entrega: entrega.estado_entrega,
          retroalimentacion: entrega.retroalimentacion
        });
      });
    });

    // Ordenar por estudiante y luego por intento
    return entregas.sort((a, b) => {
      if (a.estudiante.apellido === b.estudiante.apellido) {
        if (a.estudiante.nombre === b.estudiante.nombre) {
          return a.intento - b.intento;
        }
        return a.estudiante.nombre.localeCompare(b.estudiante.nombre);
      }
      return a.estudiante.apellido.localeCompare(b.estudiante.apellido);
    });
  }

  // ✅ MEJORADO: Calificar entrega con validación
  calificarEntrega(idEntrega: number): void {
    const calificacion = this.calificacionTemp[idEntrega];
    const comentario = this.comentarioTemp[idEntrega];

    if (calificacion === undefined || isNaN(calificacion)) {
      alert('Por favor ingresa una calificación');
      return;
    }

    if (calificacion < 0 || calificacion > 20) {
      alert('La calificación debe estar entre 0 y 20');
      return;
    }

    if (!confirm('¿Estás seguro de calificar esta entrega?')) {
      return;
    }

    const token = this.getToken();
    if (!token) return;

    this.http.post(
      `http://localhost:4000/api/retroalimentaciones/entregas/${idEntrega}/calificar`,
      {
        calificacion: Number(calificacion),
        comentario: comentario || '',
        id_actividad: this.actividadId
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('✅ Entrega calificada exitosamente');
          alert('✅ Calificación guardada correctamente');
          
          // Recargar datos
          this.cargarEntregasParaCalificar();
        } else {
          alert('❌ Error: ' + (response.message || 'Error al calificar'));
        }
      },
      error: (error) => {
        alert('❌ Error al calificar: ' + this.obtenerMensajeError(error));
        console.error('❌ Error calificando:', error);
      }
    });
  }

  // ✅ NUEVO: Descargar archivo de entrega
  descargarArchivo(entrega: Entrega): void {
    if (!entrega.archivo && !entrega.archivo_ruta) {
      alert('❌ No hay archivo disponible para descargar');
      return;
    }

    // Si tiene URL directa
    if (entrega.archivo && entrega.archivo.includes('http')) {
      window.open(entrega.archivo, '_blank');
      return;
    }

    // Si tiene ruta de Supabase
    if (entrega.archivo_ruta) {
      const token = this.getToken();
      this.http.get(
        `http://localhost:4000/api/entregas/descargar/${encodeURIComponent(entrega.archivo_ruta)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      ).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = entrega.archivo || `entrega_${entrega.estudiante.codigo}_intento_${entrega.intento}`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('❌ Error descargando:', error);
          alert('Error al descargar el archivo');
        }
      });
    }
  }

  // ✅ RESTANTE DEL CÓDIGO (igual que antes)
  generarReporteNotas(): void {
    if (!this.seccionId) {
      alert('No se puede generar reporte sin ID de sección');
      return;
    }

    const token = this.getToken();
    if (!token) return;

    this.http.get<any>(
      `http://localhost:4000/api/retroalimentaciones/seccion/${this.seccionId}/reporte`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.descargarReporte(response.data);
        } else {
          alert('Error al generar reporte');
        }
      },
      error: (error) => {
        alert('Error: ' + this.obtenerMensajeError(error));
      }
    });
  }

  private descargarReporte(data: any): void {
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte-notas-${fecha}.json`;
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('✅ Reporte descargado exitosamente');
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private obtenerMensajeError(error: any): string {
    if (error.status === 0) return 'No se puede conectar al servidor';
    if (error.status === 401) return 'No autorizado. Por favor, inicie sesión nuevamente';
    if (error.status === 403) return 'No tiene permisos para esta acción';
    if (error.status === 404) return 'Recurso no encontrado';
    if (error.status === 500) return 'Error interno del servidor';
    if (error.error?.message) return error.error.message;
    return 'Ha ocurrido un error inesperado';
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  getEstadisticasRapidas(): any {
    const calificadas = this.entregas.filter(e => e.retroalimentacion?.calificacion);
    const promedio = calificadas.length > 0 
      ? calificadas.reduce((sum, e) => sum + (e.retroalimentacion!.calificacion), 0) / calificadas.length
      : 0;

    return {
      total: this.entregas.length,
      calificadas: calificadas.length,
      pendientes: this.entregas.length - calificadas.length,
      promedio: promedio.toFixed(2)
    };
  }
}