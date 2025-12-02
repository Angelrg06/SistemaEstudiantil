// services/notificaciones.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private apiUrl = 'http://localhost:4000/api/notificaciones';

  constructor(private http: HttpClient) { }

  // 🟢 Obtener notificaciones del estudiante
  getNotificacionesEstudiante(id_estudiante: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estudiante/${id_estudiante}`);
  }

  // 🟢 Obtener notificaciones del docente
  getNotificacionesDocente(id_docente: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/docente/${id_docente}`);
  }

  // 🟢 Eliminar notificación
  eliminarNotificacion(id_notificacion: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id_notificacion}`);
  }

  // 🟢 Obtener estadísticas (docente)
  getEstadisticasDocente(id_docente: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/docente/${id_docente}/estadisticas`);
  }

  // 🟢 Health check
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}