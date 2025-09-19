import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-estudiantes.html',
  styleUrls: ['./admin-estudiantes.css']
})
export class AdminEstudiantes implements OnInit {
  estudiantes: any[] = [];
  selectedEstudiante: any = null;
  isEditing = false;
  showModal = false;
  secciones: any[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadEstudiantes();
    this.loadSecciones();
  }

  loadEstudiantes() {
    this.adminService.getEstudiantes().subscribe({
      next: (data) => { // CORREGIDO: añadido =>
        this.estudiantes = data;
      },
      error: (error) => { // CORREGIDO: añadido =>
        console.error('Error loading estudiantes:', error);
      }
    });
  }

  loadSecciones() {
    // Simular secciones - deberías obtenerlas de tu API
    this.secciones = [
      { id_seccion: 1, nombre: 'Sección A' },
      { id_seccion: 2, nombre: 'Sección B' },
      { id_seccion: 3, nombre: 'Sección C' }
    ];
  }

  openModal(estudiante?: any) {
    this.isEditing = !!estudiante;
    this.selectedEstudiante = estudiante ? { ...estudiante } : {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      id_seccion: null,
      usuario: {
        correo: '',
        password: '',
        rol: 'estudiante'
      }
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedEstudiante = null;
  }

  saveEstudiante() {
    if (this.isEditing) {
      this.adminService.updateEstudiante(this.selectedEstudiante.id_estudiante, this.selectedEstudiante)
        .subscribe({
          next: () => { // CORREGIDO: añadido =>
            this.loadEstudiantes();
            this.closeModal();
          },
          error: (error) => { // CORREGIDO: añadido =>
            console.error('Error updating estudiante:', error);
          }
        });
    } else {
      this.adminService.createEstudiante(this.selectedEstudiante)
        .subscribe({
          next: () => { // CORREGIDO: añadido =>
            this.loadEstudiantes();
            this.closeModal();
          },
          error: (error) => { // CORREGIDO: añadido =>
            console.error('Error creating estudiante:', error);
          }
        });
    }
  }

  deleteEstudiante(id: number) {
    if (confirm('¿Está seguro de eliminar este estudiante?')) {
      this.adminService.deleteEstudiante(id).subscribe({
        next: () => { // CORREGIDO: añadido =>
          this.loadEstudiantes();
        },
        error: (error) => { // CORREGIDO: añadido =>
          console.error('Error deleting estudiante:', error);
        }
      });
    }
  }
}