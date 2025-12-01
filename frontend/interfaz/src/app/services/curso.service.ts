// curso.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CursoService {
  private baseUrl = 'http://localhost:4000/api/actividades';

  constructor(private http: HttpClient) {}

  getCursosPorSeccion(idSeccion: number, token?: string): Observable<any[]> {
    let headers = {};
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    }

    return this.http.get<{ success: boolean, data: any[] }>(
      `${this.baseUrl}/${idSeccion}/cursos`,
      { headers }
    ).pipe(
      map(response => response.data || [])
    );
  }
}