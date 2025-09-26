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
  imports: [CommonModule, HttpClientModule, RouterLink,FormsModule, DatetimeLocalPipe],
  templateUrl: './docente-actividades.html',
})
export class Actividades implements OnInit {
  actividades: any[] = [];
  idSeccion!: number;
  actividadSeleccionada: number | null = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

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

  fecha_temporal_inicio: string = '';
  fecha_temporal_final: string = '';
  tipo_actividad: string = '';

  abrirModal(index : number){
    this.actividadSeleccionada = index;
    this.tipo_actividad = this.actividades[index].tipo;
  }

  cerrarModal(){
    this.actividadSeleccionada = null;
  }

  nuevaActividad = false;

  mostrarFormActividad(){
    this.nuevaActividad = true;
  }

  cerrarFormActividad(){
    this.nuevaActividad = false;
  }
}
