import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-docente',
  standalone: true,
  imports: [CommonModule, RouterLink, HttpClientModule],
  templateUrl: './docente.html',
  styleUrls: ['./docente.css'],
})
export class Docente implements OnInit {
  secciones: any[] = [];
  showUserMenu = false;
  currentUser: any = { email: 'docente@sistema.com' }; // <- agregado

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http
      .get<any[]>('http://localhost:4000/api/secciones')
      .subscribe((data) => (this.secciones = data));
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    console.log('Menú usuario:', this.showUserMenu); // debug
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}