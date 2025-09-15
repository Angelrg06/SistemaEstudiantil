// src/app/login/login.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../service/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor ingresa un email válido';
      return;
    }

    this.isLoading = true;
    const credentials = { email: this.email, password: this.password };
    
    this.authService.login(credentials).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.successMessage = '¡Bienvenido! Redirigiendo...';
        this.isLoading = false;
        
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      },
      error: (err) => {
        console.error('Error en login:', err);
        this.errorMessage = err.error?.message || 'Credenciales incorrectas. Verifica tu email y contraseña.';
        this.isLoading = false;
      }
    });
  }
clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Controla si mostrar el botón de registro
  allowRegistration = false; // Cambia a true si permites solicitudes

  requestPasswordReset() {
    // Por ahora solo muestra un alert, después puedes implementar la funcionalidad
    alert('Contacta al administrador del sistema para recuperar tu contraseña.\n\nTel: (01) 234-5678\nEmail: soporte@colegio.edu.pe');
  }
}