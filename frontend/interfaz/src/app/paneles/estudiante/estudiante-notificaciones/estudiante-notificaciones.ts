// estudiante-notificaciones.ts - COMPONENTE COMPLETO
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-estudiante-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estudiante-notificaciones.html',
  styleUrls: ['./estudiante-notificaciones.css']
})
export class EstudianteNotificaciones implements OnInit {
  @Input() estudianteId!: number;
  
  notificaciones: any[] = [];
  cargando: boolean = false;
  error: string = '';
  total: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.estudianteId) {
      this.cargarNotificaciones();
    }
  }

  cargarNotificaciones(): void {
    this.cargando = true;
    this.error = '';

    const token = localStorage.getItem('token');
    if (!token) {
      this.error = 'No hay token de autenticación';
      this.cargando = false;
      return;
    }

    this.http.get<any>(
      `http://localhost:4000/api/estudiante/notificaciones/${this.estudianteId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response) => {
        this.cargando = false;
        
        if (response.success) {
          this.notificaciones = response.data || [];
          this.total = response.count || 0;
          console.log(`✅ Cargadas ${this.total} notificaciones`);
        } else {
          this.error = response.message || 'Error al cargar notificaciones';
          this.notificaciones = [];
        }
      },
      error: (error) => {
        this.cargando = false;
        this.error = this.obtenerMensajeError(error);
        console.error('❌ Error cargando notificaciones:', error);
        this.notificaciones = [];
      }
    });
  }

  marcarComoLeida(idNotificacion: number): void {
    if (!confirm('¿Marcar esta notificación como leída?')) return;

    const token = localStorage.getItem('token');
    this.http.delete(
      `http://localhost:4000/api/notificaciones/${idNotificacion}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('✅ Notificación marcada como leída');
          this.cargarNotificaciones(); // Recargar
        }
      },
      error: (error) => {
        alert('❌ Error al marcar como leída');
      }
    });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'calificacion': return '⭐';
      case 'entrega': return '📤';
      case 'actividad': return '📝';
      case 'sistema': return '🔔';
      default: return '📩';
    }
  }

  obtenerMensajeError(error: any): string {
    if (error.status === 0) return 'No se puede conectar al servidor';
    if (error.status === 401) return 'No autorizado';
    if (error.status === 404) return 'Endpoint no encontrado';
    if (error.status === 500) return 'Error interno del servidor';
    return 'Error desconocido';
  }

  actualizar(): void {
    this.cargarNotificaciones();
  }

  limpiarTodas(): void {
    if (!confirm('¿Marcar todas las notificaciones como leídas?')) return;

    const token = localStorage.getItem('token');
    this.notificaciones.forEach(notif => {
      this.http.delete(
        `http://localhost:4000/api/notificaciones/${notif.id_notificacion}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ).subscribe({
        error: () => console.warn(`No se pudo eliminar notificación ${notif.id_notificacion}`)
      });
    });

    setTimeout(() => this.cargarNotificaciones(), 1000);
  }
}