// estudiante-notificaciones.ts - VERSIÓN MEJORADA
import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-estudiante-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estudiante-notificaciones.html',
  styleUrls: ['./estudiante-notificaciones.css']
})
export class EstudianteNotificaciones implements OnInit, OnChanges {
  @Input() estudianteId!: number;
  @Input() autoRefresh: boolean = true;
  
  notificaciones: any[] = [];
  cargando: boolean = false;
  error: string = '';
  total: number = 0;
  intervalId: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.estudianteId && this.autoRefresh) {
      this.cargarNotificaciones();
      // Recargar cada 60 segundos si hay notificaciones
      this.intervalId = setInterval(() => {
        if (this.total > 0) {
          this.cargarNotificaciones();
        }
      }, 60000);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estudianteId'] && this.estudianteId) {
      this.cargarNotificaciones();
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
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
      `http://localhost:4000/api/notificaciones/estudiante/${this.estudianteId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response) => {
        this.cargando = false;
        
        if (response.success) {
          this.notificaciones = response.data || [];
          this.total = response.count || 0;
          
          // 🔔 Emitir sonido si hay notificaciones nuevas (opcional)
          if (this.total > 0 && this.autoRefresh) {
            this.playNotificationSound();
          }
          
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
    const token = localStorage.getItem('token');
    
    this.http.delete(
      `http://localhost:4000/api/notificaciones/${idNotificacion}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Eliminar localmente sin recargar todo
          this.notificaciones = this.notificaciones.filter(
            n => n.id_notificacion !== idNotificacion
          );
          this.total = this.notificaciones.length;
        }
      },
      error: (error) => {
        console.error('❌ Error al marcar como leída:', error);
      }
    });
  }

  formatearFecha(fecha: string | Date): string {
    try {
      const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }
      
      const ahora = new Date();
      const diferencia = ahora.getTime() - fechaObj.getTime();
      const minutos = Math.floor(diferencia / 60000);
      const horas = Math.floor(minutos / 60);
      const dias = Math.floor(horas / 24);
      
      if (minutos < 1) return 'Ahora mismo';
      if (minutos < 60) return `Hace ${minutos} min`;
      if (horas < 24) return `Hace ${horas} h`;
      if (dias === 1) return 'Ayer';
      if (dias < 7) return `Hace ${dias} días`;
      
      return fechaObj.toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  }

  getIconoTipo(tipo: string): string {
    const iconos: {[key: string]: string} = {
      'calificacion': '⭐',
      'entrega_nueva': '📤',
      'entrega': '📤',
      'actividad': '📝',
      'sistema': '🔔',
      'mensaje': '💬',
      'recordatorio': '⏰'
    };
    return iconos[tipo] || '📩';
  }

  getTipoTexto(tipo: string): string {
    const textos: {[key: string]: string} = {
      'calificacion': 'Calificación',
      'entrega_nueva': 'Entrega',
      'entrega': 'Entrega',
      'actividad': 'Actividad',
      'sistema': 'Sistema',
      'mensaje': 'Mensaje',
      'recordatorio': 'Recordatorio'
    };
    return textos[tipo] || tipo;
  }

  obtenerMensajeError(error: any): string {
    if (error.status === 0) return 'No se puede conectar al servidor';
    if (error.status === 401) return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permiso para ver estas notificaciones';
    if (error.status === 404) return 'No se encontró el recurso solicitado';
    if (error.status === 500) return 'Error interno del servidor';
    return error.error?.message || 'Error desconocido';
  }

  actualizar(): void {
    this.cargarNotificaciones();
  }

  limpiarTodas(): void {
    if (this.total === 0) return;
    
    const token = localStorage.getItem('token');
    
    // Enviar todas las solicitudes de eliminación
    const requests = this.notificaciones.map(notif => 
      this.http.delete(
        `http://localhost:4000/api/notificaciones/${notif.id_notificacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    );

    // Usar forkJoin para esperar a que todas se completen
    Promise.all(requests.map(req => req.toPromise()))
      .then(() => {
        this.notificaciones = [];
        this.total = 0;
      })
      .catch((error) => {
        console.error('Error al limpiar notificaciones:', error);
      });
  }

  playNotificationSound(): void {
    // Solo reproducir si hay notificaciones nuevas
    const audio = new Audio();
    audio.src = 'assets/sounds/notification.mp3'; // Añade este archivo
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignorar errores de reproducción
    });
  }

  trackById(index: number, item: any): number {
    return item.id_notificacion;
  }

    // 🟢 NUEVO MÉTODO: Obtener clases para la notificación
  getNotificacionClasses(tipo: string): any {
    const tipoNormalizado = tipo || 'sistema';
    return {
      'notificacion-item': true,
      'unread': true,
      [`type-${tipoNormalizado}`]: true
    };
  }

  // 🟢 NUEVO MÉTODO: Obtener clases para el badge
  getBadgeClasses(tipo: string): any {
    const tipoNormalizado = tipo || 'sistema';
    return {
      'badge': true,
      'tipo': true,
      [`tipo-${tipoNormalizado}`]: true
    };
  }

}