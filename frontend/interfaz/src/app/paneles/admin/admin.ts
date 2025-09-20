//src/app/paneles/admin/admin.ts
// Este es el componente principal del panel de admin.
// Se encarga de:
// 1. Validar que el usuario sea admin.
// 2. Cargar las estadísticas desde el backend.
// 3. Cambiar entre secciones: dashboard, docentes, estudiantes, notificaciones, usuarios.
// 4. Renderizar los subcomponentes correspondientes.

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';

// Subcomponentes del panel admin
import { AdminDocentes } from './admin-docentes/admin-docentes';
import { AdminEstudiantes } from './admin-estudiantes/admin-estudiantes';
import { AdminNotificaciones } from './admin-notificaciones/admin-notificaciones';
import { AdminUsuarios } from './admin-usuarios/admin-usuarios';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    AdminDashboard,       // Dashboard separado
    AdminDocentes,
    AdminEstudiantes,
    AdminNotificaciones,
    AdminUsuarios
  ],
  templateUrl: './admin.html'
})
export class Admin implements OnInit {
  currentUser: any;
  currentSection = 'dashboard';
  stats: any = {};

  // VARIABLES NUEVAS PARA HEADER
  showMobileMenu = false; // para el menú hamburguesa
  showUserMenu = false;   // para el dropdown de usuario

  constructor(
    private authService: AuthService, 
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.rol !== 'admin') {
      this.router.navigate(['/login']);
    }

    this.loadStats();
  }

  loadStats() {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => { this.stats = data; },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.stats = { docentes: 0, estudiantes: 0, notificaciones: 0, actividades: 0 };
      }
    });
  }

  loadSection(section: string) {
    this.currentSection = section;
    // Cerrar menú móvil al cambiar sección
    this.showMobileMenu = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // NUEVOS MÉTODOS PARA HEADER
  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }
}
