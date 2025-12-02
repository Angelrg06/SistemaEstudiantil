// admin.service.ts - Actualizado con debugging
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:4000/api/admin';

  constructor(private http: HttpClient) {}

  // =========================
  // DASHBOARD
  // =========================
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  // =========================
  // DOCENTES
  // =========================
  getDocentes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/docentes`);
  }

  createDocente(docenteData: any): Observable<any> {
    console.log('📤 Creando docente:', docenteData);
    return this.http.post(`${this.apiUrl}/docentes`, docenteData)
      .pipe(catchError(this.handleError));
  }

  updateDocente(id: number, docenteData: any): Observable<any> {
    console.log('📤 Actualizando docente:', id, docenteData);
    return this.http.put(`${this.apiUrl}/docentes/${id}`, docenteData)
      .pipe(catchError(this.handleError));
  }

  deleteDocente(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/docentes/${id}`);
  }

  // =========================
  // ESTUDIANTES
  // =========================
  getEstudiantes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/estudiantes`);
  }

  createEstudiante(estudianteData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/estudiantes`, estudianteData);
  }

  updateEstudiante(id: number, estudianteData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/estudiantes/${id}`, estudianteData);
  }

  deleteEstudiante(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/estudiantes/${id}`);
  }

  // =========================
  // SECCIONES - CON DEBUGGING MEJORADO
  // =========================
  getSecciones(): Observable<any> {
    console.log('🔍 Solicitando secciones desde:', `${this.apiUrl}/secciones`);
    
    return this.http.get(`${this.apiUrl}/secciones`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error en getSecciones:', error);
        console.error('📄 Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        
        // Si el error es 404, puede que la ruta no exista
        if (error.status === 404) {
          console.error('⚠️ Ruta /secciones no encontrada. Verifica las rutas en el backend.');
        }
        
        return throwError(() => error);
      })
    );
  }

  // =========================
  // USUARIOS
  // =========================
  getUsuarios(): Observable<any> {
    return this.http.get(`http://localhost:4000/api/usuarios`);
  }

  updateRol(id: number, rol: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${id}/rol`, { rol });
  }

  deleteUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`);
  }

  // =========================
  // ÚLTIMOS REGISTROS
  // =========================
  getLastEstudiantes(limit: number = 5): Observable<any> {
    return this.http.get(`${this.apiUrl}/estudiantes?limit=${limit}&sort=desc`);
  }

  getLastDocentes(limit: number = 5): Observable<any> {
    return this.http.get(`${this.apiUrl}/docentes?limit=${limit}&sort=desc`);
  }

  getLastNotificaciones(limit: number = 5): Observable<any> {
    return this.http.get(`${this.apiUrl}/notificaciones?limit=${limit}&sort=desc`);
  }

  dniExiste(dni: string): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      this.getDocentes().subscribe({
        next: (docentes) => {
          if (docentes.some((d: any) => d.dni === dni)) {
            observer.next(true);
            observer.complete();
          } else {
            this.getEstudiantes().subscribe({
              next: (estudiantes) => {
                observer.next(estudiantes.some((e: any) => e.dni === dni));
                observer.complete();
              },
              error: (err) => observer.error(err)
            });
          }
        },
        error: (err) => observer.error(err)
      });
    });
  }

  correoExiste(correo: string): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      this.getDocentes().subscribe({
        next: (docentes) => {
          if (docentes.some((d: any) => d.usuario?.correo === correo)) {
            observer.next(true);
            observer.complete();
          } else {
            this.getEstudiantes().subscribe({
              next: (estudiantes) => {
                observer.next(estudiantes.some((e: any) => e.usuario?.correo === correo));
                observer.complete();
              },
              error: (err) => observer.error(err)
            });
          }
        },
        error: (err) => observer.error(err)
      });
    });
  }

  // =========================
  // MANEJO DE ERRORES
  // =========================
  private handleError(error: HttpErrorResponse) {
    console.error('💥 Error en AdminService:', error);
    
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Error ${error.status}: ${error.statusText || ''} - ${error.error?.message || error.message}`;
    }
    
    console.error('📄 Detalles completos:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error,
      message: error.message
    });
    
    return throwError(() => new Error(errorMessage));
  }


    getCursos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cursos`);
  }

  createCurso(cursoData: any): Observable<any> {
    console.log('📤 Creando curso:', cursoData);
    return this.http.post(`${this.apiUrl}/cursos`, cursoData);
  }

  updateCurso(id: number, cursoData: any): Observable<any> {
    console.log('📤 Actualizando curso:', id, cursoData);
    return this.http.put(`${this.apiUrl}/cursos/${id}`, cursoData);
  }

  deleteCurso(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/cursos/${id}`);
  }

  // =========================
  // RELACIÓN CURSO-SECCIÓN
  // =========================
  asignarSeccionesACurso(idCurso: number, seccionesIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/cursos/${idCurso}/secciones`, { seccionesIds });
  }
}