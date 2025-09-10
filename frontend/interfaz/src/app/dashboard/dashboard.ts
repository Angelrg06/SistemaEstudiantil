import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard {
  users: any[] = [];

  constructor(private http: HttpClient) {
    this.loadUsers();
  }

  loadUsers() {
    const token = localStorage.getItem('token');
    if (!token) return alert('Token no encontrado. Por favor, logueate.');

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get('http://localhost:4000/api/users', { headers }).subscribe({
      next: (res: any) => this.users = res,
      error: (err) => alert('Error cargando usuarios: ' + JSON.stringify(err.error))
    });
  }
}
