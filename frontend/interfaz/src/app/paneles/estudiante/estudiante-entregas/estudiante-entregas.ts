import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { EntregasService } from '../../../services/entrega.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-estudiante-entregas',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule ,RouterLink],
  templateUrl: './estudiante-entregas.html',
  styleUrl: './estudiante-entregas.css'
})
export class EstudianteEntregas implements OnInit {
  showUserMenu = false;
  id_estudiante_logueado: number = 0;
  datos: any[] = [];
  actividades: any[] = [];
  actividad: any[] = [];
  id_curso!: number;
  modalAbierto = false;
  actividadSeleccionada: number | null = null;

  //Temporal
  entregasRealizadas: any[] = [];

  // Propiedades del componente
  archivoSeleccionado: File | null = null;
  comentario: string = '';
  subiendo: boolean = false;

  constructor(private router: Router, private authService: AuthService, private route: ActivatedRoute, private http: HttpClient, private entregaService: EntregasService) { }

  ngOnInit(): void {
    this.id_curso = Number(this.route.snapshot.paramMap.get('id'));
    console.log('ID Curso:', this.id_curso);
    this.getIdEstudiante();
    this.getActividades();
    this.getMisEntregas();
  }

  //Temporal
  // Método para obtener tus entregas
  getMisEntregas(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/mis-entregas/${this.id_curso}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.entregasRealizadas = response.data || [];
        console.log("📦 Mis entregas:", this.entregasRealizadas);
      },
      error: (err) => console.error("❌ Error obteniendo mis entregas:", err)
    });
  }

  // Método para descargar MIS entregas
  descargarMiEntrega(entrega: any): void {
    if (!entrega.archivo) {
      alert('❌ No hay archivo disponible para descargar');
      return;
    }

    console.log('📥 Descargando mi entrega:', entrega.archivo);

    // Crear nombre de archivo
    const nombreArchivo = `mi_entrega_${entrega.actividad?.titulo || 'actividad'}.pdf`;

    // Crear enlace temporal
    const link = document.createElement('a');
    link.href = entrega.archivo;
    link.download = nombreArchivo;
    link.target = '_blank';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Descarga de mi entrega iniciada');
  }

  //HASTA AQUI ES TEMPORAL

  abrirModal(idActividad: number) {
    this.actividadSeleccionada = idActividad;
    this.modalAbierto = true;

    //Buscar la actividad en el array de actividades
    const actividadEncontrada = this.actividades.find(a => a.id_actividad === idActividad);
    if (actividadEncontrada) {
      this.actividad = [actividadEncontrada]; //Temporal - deberías usar un objeto
      console.log('📋 Actividad seleccionada:', actividadEncontrada);
    }

    this.getDatosActividadIDCurso(idActividad);
  }

  cerrarModal() {
    this.actividadSeleccionada = null;
    this.modalAbierto = false;
    this.limpiarFormulario(); //Limpiar también el archivo seleccionado
  }

  //MÉTODO: Cuando se selecciona un archivo
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      // Validar tamaño (5MB máximo)
      const maxSize = 5 * 1024 * 1024;

      if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      this.archivoSeleccionado = file;
      console.log('Archivo seleccionado:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }

  //MÉTODO: Remover archivo seleccionado
  removerArchivo(): void {
    this.archivoSeleccionado = null;
    console.log('Archivo removido');
  }

  //MÉTODO: Enviar entrega
  enviarEntrega(): void {
    if (!this.archivoSeleccionado) {
      alert('Por favor selecciona un archivo');
      return;
    }

    if (!this.actividadSeleccionada) {
      alert('Error: No hay actividad seleccionada');
      return;
    }

    this.subiendo = true;
    console.log('Iniciando subida...');

    this.entregaService.subirEntrega(
      this.archivoSeleccionado,
      this.actividadSeleccionada, //Usamos el ID de la actividad seleccionada
      this.comentario
    ).subscribe({
      next: (response: any) => {
        console.log('Respuesta del servidor:', response);

        if (response.success) {
          alert('¡Entrega enviada correctamente!');
          this.limpiarFormulario();
          this.cerrarModal();
          //Recargar actividades para ver la entrega
          this.getActividades();
          this.getMisEntregas();
        } else {
          alert('Error: ' + response.error);
        }

        this.subiendo = false;
      },
      error: (error) => {
        console.error('Error en la petición:', error);
        // Si el backend devolvió un 400 por intentos -> mostrar mensaje específico
        const msg = error?.error?.error || 'Error al enviar la entrega. Intenta nuevamente.';
        alert(msg);
        this.subiendo = false;
      }
    });
  }

  //MÉTODO: Limpiar formulario
  private limpiarFormulario(): void {
    this.archivoSeleccionado = null;
    this.comentario = '';
    // Limpiar input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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

  getActividades(): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/entregas/${this.id_curso}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response) => {
        this.actividades = response.data;
        console.log("Datos de las actividades:", this.actividades);
      },
      error: (err) => console.error("Error obteniendo actividad:", err)
    });
  }

  getDatosActividadIDCurso(id: number): void {
    const token = localStorage.getItem('token');
    this.http.get<any>(`http://localhost:4000/api/estudiante/actividades/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.actividad = data;
        console.log("Datos de la actividad seleccionada:", data);
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
}
