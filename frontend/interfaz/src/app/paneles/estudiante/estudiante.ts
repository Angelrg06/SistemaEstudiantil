import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ IMPORTAR FormsModule
import { AuthService } from '../../services/auth.service';
import { EstudianteNotificaciones } from './estudiante-notificaciones/estudiante-notificaciones'; // ✅ IMPORTAR EL COMPONENTE

@Component({
  selector: 'app-estudiante',
  standalone: true,
  imports: [
    HttpClientModule, 
    CommonModule, 
    RouterLink, 
    RouterModule,
    FormsModule, // ✅ AGREGAR FormsModule
    EstudianteNotificaciones // ✅ AGREGAR AL IMPORTS
  ],
  templateUrl: './estudiante.html',
  styleUrl: './estudiante.css'
})
export class Estudiante {
  cursos: any[] = [];
  cursosFiltrados: any[] = []; // ✅ NUEVO: Para almacenar cursos filtrados
  bimestres: any[] = []; // ✅ NUEVO: Lista de bimestres disponibles
  bimestreSeleccionado: string = ''; // ✅ NUEVO: Bimestre seleccionado
  notificaciones: any[] = [];
  datos: any[] = [];
  id_estudiante_logueado: number = 0;
  showUserMenu = false;
  contadorNotificaciones: number = 0;

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
        this.cursosFiltrados = data; // ✅ Inicializar con todos los cursos
        
        // ✅ Extraer bimestres únicos
        const bimestresUnicos = new Set<string>();
        data.forEach((curso: any) => {
          if (curso.bimestre_nombre && curso.bimestre_nombre !== 'Sin bimestre') {
            bimestresUnicos.add(curso.bimestre_nombre);
          }
        });
        this.bimestres = Array.from(bimestresUnicos).map(nombre => ({ nombre }));
        
        console.log("Cursos del estudiante:", data);
        console.log("Bimestres disponibles:", this.bimestres);
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
    // ✅ CORRECCIÓN: Usar la ruta correcta
    this.http.get<any>(`http://localhost:4000/api/notificaciones/estudiante/${this.id_estudiante_logueado}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificaciones = response.data || [];
          this.contadorNotificaciones = response.count || 0;
          console.log("✅ Notificaciones del estudiante:", response);
        } else {
          console.error("❌ Error en respuesta:", response.message);
        }
      },
      error: (err) => console.error("❌ Error obteniendo notificaciones:", err)
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
    console.log("Curso seleccionado: ", id_curso);
    // Navegar a actividades del curso
    this.router.navigate([`/estudiante/cursos/${id_curso}/actividades`]);
  }

  // ✅ NUEVO: Eliminar notificación
  eliminarNotificacion(id_notificacion: number): void {
    const token = localStorage.getItem('token');
    this.http.delete(`http://localhost:4000/api/notificaciones/${id_notificacion}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('✅ Notificación eliminada');
          this.getNotificaciones(); // Recargar
        }
      },
      error: (err) => {
        console.error('❌ Error eliminando notificación:', err);
        alert('Error al eliminar notificación');
      }
    });
  }

  // ✅ NUEVO: Filtrar cursos por bimestre
  filtrarPorBimestre(): void {
    if (!this.bimestreSeleccionado || this.bimestreSeleccionado === '') {
      // Si no hay bimestre seleccionado, mostrar todos
      this.cursosFiltrados = this.cursos;
    } else {
      // Filtrar por bimestre seleccionado
      this.cursosFiltrados = this.cursos.filter(
        curso => curso.bimestre_nombre === this.bimestreSeleccionado
      );
    }
    console.log("Cursos filtrados:", this.cursosFiltrados);
  }
}