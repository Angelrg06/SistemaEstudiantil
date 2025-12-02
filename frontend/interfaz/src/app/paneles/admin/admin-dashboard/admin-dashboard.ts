// src/app/paneles/admin/admin-dashboard/admin-dashboard.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  standalone: true
})
export class AdminDashboard implements OnInit {

  stats: any = {};

  expandedCard: 'docentes' | 'estudiantes' | 'administradores' | 'secciones' | 'bimestres' | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = {
          docentes: data.docentes || 0,
          estudiantes: data.estudiantes || 0,
          administradores: data.administradores || 0,
          secciones: data.secciones || 0,
          bimestres: data.bimestres || 0
        };
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
      }
    });
  }
}
