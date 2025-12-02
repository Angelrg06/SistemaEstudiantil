// entrega.service.ts - VERSIÓN CORREGIDA
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EntregasService {
  private apiUrl = 'http://localhost:4000/api/entregas';

  constructor(private http: HttpClient) { }

  // 🟢 MÉTODO CORREGIDO: Subir entrega
  subirEntrega(archivo: File, idActividad: number, comentario?: string): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('id_actividad', idActividad.toString());
    
    if (comentario) {
      formData.append('comentario_estudiante', comentario); // ✅ CORREGIDO: usar 'comentario_estudiante'
    }

    console.log('📤 Subiendo entrega para actividad:', idActividad);
    console.log('📁 Archivo:', archivo.name, `(${(archivo.size / 1024 / 1024).toFixed(2)} MB)`);

    const token = localStorage.getItem('token');
    
    return this.http.post(`${this.apiUrl}/subir`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`
        // NO agregar 'Content-Type' - FormData lo maneja automáticamente
      }
    });
  }

  // 🟢 MÉTODO MEJORADO: Descargar archivo
  descargarArchivo(rutaArchivo: string): Observable<any> {
    const token = localStorage.getItem('token');
    
    return this.http.get(`${this.apiUrl}/descargar/${encodeURIComponent(rutaArchivo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob' // ✅ IMPORTANTE: Para descargar archivos
    });
  }

  // 🟢 NUEVO: Obtener entregas del estudiante
  getMisEntregas(id_curso: number): Observable<any> {
    const token = localStorage.getItem('token');
    
    return this.http.get(`${this.apiUrl}/mis-entregas/${id_curso}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // 🟢 NUEVO: Verificar intentos disponibles
  verificarIntentos(id_actividad: number): Observable<any> {
    const token = localStorage.getItem('token');
    
    return this.http.get(`${this.apiUrl}/verificar-intentos/${id_actividad}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
}