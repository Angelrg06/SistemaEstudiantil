import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-usuarios.html'
})
export class AdminUsuarios implements OnInit {
  usuarios: any[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.adminService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
      },
      error: (error) => {
        console.error('Error loading usuarios:', error);
      }
    });
  }

  // CORRECCIÓN: Cambiar el método para recibir el valor directamente
  onRolChange(usuario: any, nuevoRol: string) {
    this.adminService.updateRol(usuario.id_usuario, nuevoRol).subscribe({
      next: () => {
        this.loadUsuarios();
      },
      error: (error) => {
        console.error('Error updating rol:', error);
      }
    });
  }

  eliminarUsuario(id: number) {
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      this.adminService.deleteUsuario(id).subscribe({
        next: () => {
          this.loadUsuarios();
        },
        error: (error) => {
          console.error('Error deleting usuario:', error);
        }
      });
    }
  }
}