import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatetimeLocalPipe } from '../../../pipes/datetime-local-pipe';

@Component({
  selector: 'app-actividades',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink, FormsModule, DatetimeLocalPipe],
  templateUrl: './docente-actividades.html',
})
export class Actividades implements OnInit {
  actividades: any[] = [];
  idSeccion!: number;
  actividadSeleccionada: number | null = null;
  id_actual: number | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    this.idSeccion = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarActividades();
  }

  cargarActividades() {
    this.http
      .get<any[]>(`http://localhost:4000/api/actividades/seccion/${this.idSeccion}`)
      .subscribe({
        next: (data) => {
          this.actividades = data;
          console.log('✅ Actividades cargadas:', this.actividades);
        },
        error: (err) => {
          console.error('❌ Error cargando actividades:', err);
        },
      });
  }

  private toDateTimeLocal(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Recorta segundos y zona horaria
    return date.toISOString().slice(0, 16);
  }

  fecha_nuevo: string = '';
  fecha_ini_nuevo: string = '';
  fecha_fini_nuevo: string = '';
  tipo_nuevo: string = '';
  titulo_nuevo: string = '';
  descripcion_nuevo: string = '';

  fecha_temporal_inicio: string = '';
  fecha_temporal_final: string = '';
  tipo_actividad: string = '';
  titulo_temporal: string = '';
  descripcion_temporal: string = '';
  isModalOpen = false;

  abrirModal(index: number) {
    this.actividadSeleccionada = index;
    this.titulo_temporal = this.actividades[index].titulo;
    this.descripcion_temporal = this.actividades[index].descripcion; 
    this.tipo_actividad = this.actividades[index].tipo;
    this.id_actual = this.actividades[index].id_actividad;
    this.isModalOpen = true;
    this.fecha_temporal_inicio = this.toDateTimeLocal(this.actividades[index].fecha_inicio);
    this.fecha_temporal_final = this.toDateTimeLocal(this.actividades[index].fecha_fin);
  }

  cerrarModal() {
    this.actividadSeleccionada = null;
    this.isModalOpen = false;
  }

  nuevaActividad = false;

  mostrarFormActividad() {
    this.nuevaActividad = true;
  }

  cerrarFormActividad() {
    this.nuevaActividad = false;
  }

  crearActividad() {
    const nuevaActividad = {
      titulo: this.titulo_nuevo,
      descripcion: this.descripcion_nuevo,
      tipo: this.tipo_nuevo,
      fecha_inicio: this.fecha_ini_nuevo
        ? new Date(this.fecha_ini_nuevo).toISOString()
        : null,
      fecha_fin: this.fecha_fini_nuevo
        ? new Date(this.fecha_fini_nuevo).toISOString()
        : null,
      estado: 'pendiente',
      fecha_entrega: this.fecha_fini_nuevo
        ? new Date(this.fecha_fini_nuevo).toISOString()
        : null,
      id_docente: 1,
      id_seccion: 1
    }

    this.http.post('http://localhost:4000/api/actividades', nuevaActividad).subscribe({
      next: (data) => {
        alert("✅ Actividad creada correctamente");
        this.cargarActividades();
        this.cerrarFormActividad();
      },
      error: (err) => console.log("❌ Ocurrió un error al crear la actividad", err)
    })
  }

  actualizarActividad() {
    const actividadActualizada = {
      titulo: this.titulo_temporal || null,
      descripcion: this.descripcion_temporal || null,
      tipo: this.tipo_actividad || null,
      fecha_inicio: this.fecha_temporal_inicio
        ? new Date(this.fecha_temporal_inicio).toISOString()
        : null,
      fecha_fin: this.fecha_temporal_final
        ? new Date(this.fecha_temporal_final).toISOString()
        : null,
      estado: 'pendiente',
      fecha_entrega: this.fecha_temporal_final
        ? new Date(this.fecha_temporal_final).toISOString()
        : null,
    };

    if (!this.id_actual) {
      alert("❌ No se encontró el ID de la actividad");
      return;
    }

    this.http.put(`http://localhost:4000/api/actividades/${this.id_actual}`, actividadActualizada).subscribe({
      next: () => {
        alert("✅ Actividad actualizada correctamente");
        this.cargarActividades();
        this.cerrarModal();
      },
      error: (err) => alert("❌ Ocurrió un error al axtualizar la actividad")
    });
  }

  eliminarActividad() {
    if (!this.id_actual) {
      alert("❌ No se encontró el ID de la actividad");
      return;
    }

    this.http.delete(`http://localhost:4000/api/actividades/${this.id_actual}`).subscribe({
      next: () => {
        console.log("✅ Actividad eliminada");
        this.cargarActividades();
        this.cerrarModal();
      },
      error: (err) => console.error("❌ Error eliminando:", err)
    });
  }
}
