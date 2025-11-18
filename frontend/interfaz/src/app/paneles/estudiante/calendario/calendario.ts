import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarioService } from '../../../services/calendario.service';
import { RouterLink, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthService } from '../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import esLocale from '@fullcalendar/core/locales/es';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [FullCalendarModule, RouterLink, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './calendario.html',
  styleUrl: './calendario.css'
})
export class Calendario implements OnInit {

  showModal: boolean = false;
  actividadSeleccionada: any = null;
  showUserMenu = false;
  id_estudiante_logueado: number = 0;
  datos: any[] = [];

  calendarOptions: CalendarOptions = {
    locale: esLocale,
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    events: [],
    eventClick: this.onEventClick.bind(this),

    // MEJORA: Personalizar apariencia de eventos
    eventDisplay: 'block',
    eventColor: '#3b82f6',
    eventTextColor: '#ffffff',
    eventBorderColor: '#1d4ed8',

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: ""
    },

    height: "80vh",

    // MEJORA: Textos en español
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Lista'
    },
  };

  constructor(private router: Router, private authService: AuthService, private http: HttpClient, private calendarioService: CalendarioService) { }

  ngOnInit(): void {
    this.getIdEstudiante();
    this.cargarActividades();
  }

  cargarActividades(): void {
    this.calendarioService.getActividadesEstudiante().subscribe(events => {
      const eventosProcesados = events.map((event: any) => ({
        ...event,
        start: event.fecha_inicio || event.start,
        end: event.fecha_fin || event.end,
        backgroundColor: this.getColorPorEstado(event.estado),
        borderColor: this.getBordePorEstado(event.estado)
      }));

      this.calendarOptions = {
        ...this.calendarOptions,
        events: eventosProcesados
      };
    });
  }

  // MEJORA: Colores diferentes por estado
  private getColorPorEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'activo': return '#10b981'; // verde
      case 'pendiente': return '#f59e0b'; // amarillo
      case 'vencido': return '#ef4444'; // rojo
      default: return '#3b82f6'; // azul por defecto
    }
  }

  private getBordePorEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'activo': return '#047857';
      case 'pendiente': return '#d97706';
      case 'vencido': return '#dc2626';
      default: return '#1d4ed8';
    }
  }

  onEventClick(info: any) {
    const event = info.event;

    this.actividadSeleccionada = {
      titulo: info.event.title,
      estado: info.event.extendedProps.estado,
      curso: info.event.extendedProps.curso,
      docente: info.event.extendedProps.docente,
      descripcion: info.event.extendedProps.descripcion,
      // MEJORA: Usar las propiedades correctas de fecha
      fecha_inicio: event.start ? new Date(event.start) : null,
      fecha_fin: event.end ? new Date(event.end) : null,
      // Mantener compatibilidad
      fecha: event.start ? new Date(event.start) : null
    };

    this.showModal = true;
    info.jsEvent.preventDefault();
  }

  cerrarModal() {
    this.showModal = false;
    this.actividadSeleccionada = null;
  }

  getIdEstudiante(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>('http://localhost:4000/api/estudiante/mi-estudiante', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log("📌 Respuesta de /mi-estudiante:", data);
        this.id_estudiante_logueado = data.id_estudiante;

        this.getDatos();
      },
      error: (err) => {
        console.error("❌ Error obteniendo id_estudiante", err);
      }
    })
  }

  getDatos(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/datos/${this.id_estudiante_logueado}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.datos = data;
        console.log("Datos del estudiante:", data);
      },
      error: (err) => console.error("Error obteniendo datos:", err)
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  // MEJORA: Método para formatear fecha
  formatearFecha(fecha: Date): string {
    if (!fecha) return 'No especificada';

    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
