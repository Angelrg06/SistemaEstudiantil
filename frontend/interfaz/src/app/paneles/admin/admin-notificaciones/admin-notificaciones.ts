import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notificaciones.html',
  styleUrls: ['./admin-notificaciones.css']
})
export class AdminNotificaciones implements OnInit {
  notificaciones: any[] = [];
  nuevaNotificacion: any = {
    mensaje: '',
    tipo: 'general',
    destinatario: 'todos'
  };

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadNotificaciones();
  }

  loadNotificaciones() {
    this.adminService.getNotificaciones().subscribe({
      next: (data) => {
        this.notificaciones = data;
      },
      error: (error) => {
        console.error('Error loading notificaciones:', error);
      }
    });
  }

  enviarNotificacion() {
    this.adminService.sendNotificacion(this.nuevaNotificacion).subscribe({
      next: () => {
        this.loadNotificaciones();
        this.nuevaNotificacion = { mensaje: '', tipo: 'general', destinatario: 'todos' };
        alert('Notificación enviada correctamente');
      },
      error: (error) => {
        console.error('Error sending notificacion:', error);
      }
    });
  }
}