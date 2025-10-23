import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Notificacion {
  id_notificacion: number;
  mensaje: string;
  tipo: string;
  fecha_envio: string;
  actividad?: {
    id_actividad: number;
    titulo: string;
    tipo: string;
  };
  entrega?: {
    id_entrega: number;
    estudiante?: {
      nombre: string;
      apellido: string;
      codigo: string;
    };
  };
  metadata?: {
    es_reciente: boolean;
    tiene_actividad: boolean;
    tiene_entrega: boolean;
  };
}

@Component({
  selector: 'app-docente-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docente-notificaciones.html',
  styles: [`
    .animate-scale-in {
      animation: scaleIn 0.2s ease-out;
    }
    
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .loading-spinner .spinner-dot {
      animation: bounce 1.4s infinite ease-in-out both;
    }
    
    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }
  `]
})
export class DocenteNotificaciones implements OnInit {
  @Input() idDocente!: number;
  @Output() cerrar = new EventEmitter<void>();

  notificaciones: Notificacion[] = [];
  cargando: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    if (!this.idDocente) {
      this.error = 'No se pudo identificar al docente';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.http.get<any>(`http://localhost:4000/api/notificaciones/docente/${this.idDocente}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: (response) => {
        this.cargando = false;
        
        if (response.success && Array.isArray(response.data)) {
          this.notificaciones = response.data;
          console.log(`✅ ${this.notificaciones.length} notificaciones cargadas`);
        } else {
          this.error = 'Error al cargar notificaciones';
          this.notificaciones = [];
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('❌ Error cargando notificaciones:', error);
        this.error = 'No se pudieron cargar las notificaciones';
        this.notificaciones = [];
      }
    });
  }

  marcarComoLeida(notificacion: Notificacion): void {
    this.http.delete(`http://localhost:4000/api/notificaciones/${notificacion.id_notificacion}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: () => {
        // Remover la notificación de la lista localmente
        this.notificaciones = this.notificaciones.filter(n => n.id_notificacion !== notificacion.id_notificacion);
        console.log('✅ Notificación marcada como leída');
      },
      error: (error) => {
        console.error('❌ Error al marcar notificación como leída:', error);
      }
    });
  }

  limpiarTodas(): void {
    // Eliminar todas las notificaciones una por una
    const deletePromises = this.notificaciones.map(notif => 
      this.http.delete(`http://localhost:4000/api/notificaciones/${notif.id_notificacion}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).toPromise()
    );

    Promise.all(deletePromises)
      .then(() => {
        this.notificaciones = [];
        console.log('✅ Todas las notificaciones eliminadas');
      })
      .catch(error => {
        console.error('❌ Error al eliminar notificaciones:', error);
      });
  }

  getIcono(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'entrega': 'fas fa-file-upload',
      'actividad': 'fas fa-tasks',
      'sistema': 'fas fa-cog',
      'mensaje': 'fas fa-comment',
      'alerta': 'fas fa-exclamation-triangle'
    };
    return iconos[tipo] || 'fas fa-bell';
  }

  getIconoClase(tipo: string): string {
    const clases: { [key: string]: string } = {
      'entrega': 'bg-green-100 text-green-600',
      'actividad': 'bg-blue-100 text-blue-600',
      'sistema': 'bg-gray-100 text-gray-600',
      'mensaje': 'bg-purple-100 text-purple-600',
      'alerta': 'bg-yellow-100 text-yellow-600'
    };
    return clases[tipo] || 'bg-gray-100 text-gray-600';
  }

  cerrarNotificaciones(): void {
    this.cerrar.emit();
  }

  trackByNotificacionId(index: number, notificacion: Notificacion): number {
    return notificacion.id_notificacion;
  }
}