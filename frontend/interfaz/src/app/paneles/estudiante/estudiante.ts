import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-estudiante',
  standalone: true,
  imports: [HttpClientModule, CommonModule, RouterLink],
  templateUrl: './estudiante.html',
  styleUrl: './estudiante.css'
})
export class Estudiante {
  cursos: any[] = [];
  notificaciones: any[] = [];
  datos: any[] = [];
  id_estudiante_logueado: number = 0;
  showUserMenu = false;

  constructor(private router: Router, private authService: AuthService, private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    this.getIdEstudiante();
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
        this.getCargarCursos();
        this.getNotificaciones();
      },
      error: (err) => {
        console.error("❌ Error obteniendo id_estudiante", err);
      }
    })
  }

  getCargarCursos(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/cursos/${this.id_estudiante_logueado}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.cursos = data;
        console.log("Cursos del estudiante:", data);
      },
      error: (err) => console.error("Error obteniendo cursos:", err)
    });

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

  getNotificaciones(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/notificaciones/${this.id_estudiante_logueado}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.notificaciones = data;
        console.log("Notificaciones del estudiante:", data);
      },
      error: (err) => console.error("Error obteniendo notificaciones:", err)
    });
  }

    logout() {
      this.authService.logout();
      this.router.navigate(['/login']);
    }

    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu;
    }

    actividades(id_curso: number) {
      console.log("Curso seleccionado: ", id_curso)
    }
}
