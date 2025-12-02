// src/app/paneles/admin/admin.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin/admin.service';

// Subcomponentes del panel admin
import { AdminDocentes } from './admin-docentes/admin-docentes';
import { AdminEstudiantes } from './admin-estudiantes/admin-estudiantes';
import { AdminUsuarios } from './admin-usuarios/admin-usuarios';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { AdminCursos } from "./admin-cursos/admin-cursos";

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    AdminDashboard,
    AdminDocentes,
    AdminEstudiantes,
    AdminUsuarios,
    AdminCursos
],
  templateUrl: './admin.html'
})
export class Admin implements OnInit {
  currentUser: any;
  currentSection = 'dashboard';
  stats: any = {};

  // VARIABLES HEADER RESPONSIVE
  showMobileMenu = false; // menú hamburguesa en móvil
  showUserMenu = false;   // dropdown usuario

  constructor(
    private authService: AuthService,
    private router: Router,
    private adminService: AdminService
  ) { }

  ngOnInit() {
    // Validar usuario admin
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.rol !== 'admin') {
      this.router.navigate(['/login']);
    }

    // Cargar estadísticas
    this.loadStats();
  }

  // Cargar datos del dashboard
  loadStats() {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => { this.stats = data; },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.stats = { docentes: 0, estudiantes: 0, notificaciones: 0, actividades: 0 };
      }
    });
  }

  // Cambiar sección del panel
  loadSection(section: string) {
    this.currentSection = section;
    // Cierra menú móvil al seleccionar sección
    this.showMobileMenu = false;
  }

  // Cerrar sesión
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // TOGGLE MENÚ MÓVIL
  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
    // Bloquear scroll del body mientras esté abierto
    document.body.style.overflow = this.showMobileMenu ? 'hidden' : 'auto';
  }

  // TOGGLE DROPDOWN USUARIO
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    // Bloquear scroll del body mientras el menú esté abierto
    document.body.style.overflow = this.showUserMenu ? 'hidden' : 'auto';
  }

  // Cerrar menú de usuario
  closeUserMenu() {
    this.showUserMenu = false;
    document.body.style.overflow = 'auto';
 }

 closeMobileMenu() {
  this.showMobileMenu = false;
  document.body.style.overflow = 'auto';
}

}
