import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CalendarioService {

  private URL = 'http://localhost:4000/api/actividades';

  constructor(private http: HttpClient) { }

  getActividadesEstudiante(): Observable<any[]> {
    return this.http.get<any[]>(`${this.URL}/estudiante/mis-actividades`);
  }
}
