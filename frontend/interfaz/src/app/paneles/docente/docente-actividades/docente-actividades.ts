import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-actividades',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink],
  templateUrl: './docente-actividades.html',
})
export class Actividades implements OnInit {
  actividades: any[] = [];
  idSeccion!: number;

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
}
