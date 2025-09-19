import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-docentes.html',
  styleUrls: ['./admin-docentes.css']
})
export class AdminDocentes implements OnInit {
  docentes: any[] = [];
  selectedDocente: any = null;
  isEditing = false;
  showModal = false;

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadDocentes();
  }

  loadDocentes() {
    this.adminService.getDocentes().subscribe({
      next: (data) => {
        this.docentes = data;
      },
      error: (error) => {
        console.error('Error loading docentes:', error);
      }
    });
  }

  openModal(docente?: any) {
    this.isEditing = !!docente;
    this.selectedDocente = docente ? { ...docente } : {
      codigo: '',
      dni: '',
      nombre: '',
      apellido: '',
      usuario: {
        correo: '',
        password: '',
        rol: 'docente'
      }
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedDocente = null;
  }

  saveDocente() {
    if (this.isEditing) {
      this.adminService.updateDocente(this.selectedDocente.id_docente, this.selectedDocente)
        .subscribe({
          next: () => {
            this.loadDocentes();
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating docente:', error);
          }
        });
    } else {
      this.adminService.createDocente(this.selectedDocente)
        .subscribe({
          next: () => {
            this.loadDocentes();
            this.closeModal();
          },
          error: (error) => {
            console.error('Error creating docente:', error);
          }
        });
    }
  }

  deleteDocente(id: number) {
    if (confirm('¿Está seguro de eliminar este docente?')) {
      this.adminService.deleteDocente(id).subscribe({
        next: () => {
          this.loadDocentes();
        },
        error: (error) => {
          console.error('Error deleting docente:', error);
        }
      });
    }
  }
}