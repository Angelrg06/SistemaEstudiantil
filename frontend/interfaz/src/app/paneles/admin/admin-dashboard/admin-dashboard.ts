// src/app/paneles/admin/admin-dashboard/admin-dashboard.ts
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  standalone: true
})
export class AdminDashboard implements OnInit {

  stats: any = {};

  expandedCard: 'docentes' | 'estudiantes' | 'notificaciones' | 'actividades' | null = null;
  showNotificacionModal: boolean = false;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Error cargando estadísticas del dashboard:', err);
      }
    });
  }
}
