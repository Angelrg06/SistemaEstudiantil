  //admin.service.ts
  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';

  @Injectable({
    providedIn: 'root'
  })
  export class AdminService {
    private apiUrl = 'http://localhost:4000/api/admin';

    constructor(private http: HttpClient) { }

    getDashboardStats(): Observable<any> {
      return this.http.get(`${this.apiUrl}/stats`);
    }

    getDocentes(): Observable<any> {
      return this.http.get(`${this.apiUrl}/docentes`);
    }

    createDocente(docenteData: any): Observable<any> {
      return this.http.post(`${this.apiUrl}/docentes`, docenteData);
    }

    updateDocente(id: number, docenteData: any): Observable<any> {
      return this.http.put(`${this.apiUrl}/docentes/${id}`, docenteData);
    }

    deleteDocente(id: number): Observable<any> {
      return this.http.delete(`${this.apiUrl}/docentes/${id}`);
    }

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


    getUsuarios(): Observable<any> {
    return this.http.get(`http://localhost:4000/api/usuarios`);
  }
    updateRol(id: number, rol: string): Observable<any> {
      return this.http.put(`${this.apiUrl}/usuarios/${id}/rol`, { rol });
    }

    deleteUsuario(id: number): Observable<any> {
      return this.http.delete(`${this.apiUrl}/usuarios/${id}`);
    }

    getNotificaciones(): Observable<any> {
      return this.http.get(`${this.apiUrl}/notificaciones`);
    }

    sendNotificacion(notificacionData: any): Observable<any> {
      return this.http.post(`${this.apiUrl}/notificaciones`, notificacionData);
    }


    // Métodos que necesitaremos agregar a admin.service.ts

    getLastEstudiantes(limit: number = 5): Observable<any> {
      return this.http.get(`${this.apiUrl}/estudiantes?limit=${limit}&sort=desc`);
    }

    getLastDocentes(limit: number = 5): Observable<any> {
      return this.http.get(`${this.apiUrl}/docentes?limit=${limit}&sort=desc`);
    }

    getLastNotificaciones(limit: number = 5): Observable<any> {
      return this.http.get(`${this.apiUrl}/notificaciones?limit=${limit}&sort=desc`);
    }

  }