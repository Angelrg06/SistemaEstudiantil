import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  correo = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) { }

  login() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.correo || !this.password) {
      this.errorMessage = 'Por favor completa todos los campos';
      return;
    }

    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoRegex.test(this.correo)) {
      this.errorMessage = 'Por favor ingresa un correo válido';
      return;
    }

    this.isLoading = true;

    const credentials = { correo: this.correo, password: this.password };

    this.authService.login(credentials).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (res.token && res.usuario) {
          this.successMessage = '¡Bienvenido! Redirigiendo...';

          // Guardar el usuario en AuthService ya lo hace el servicio, aquí solo redirigimos
          setTimeout(() => {
            switch (res.usuario.rol) {
              case 'admin':
                this.router.navigate(['/admin']);
                break;
              case 'docente':
                this.router.navigate(['/docente']);
                break;
              case 'estudiante':
                this.router.navigate(['/estudiante']);
                break;
              default:
                this.router.navigate(['/']);
            }
          }, 1000);
        } else {
          this.errorMessage = 'Respuesta inválida del servidor';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Credenciales incorrectas';
        console.error('Error en login:', err);
      }
    });

  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  requestPasswordReset() {
    alert(
      'Contacta al administrador del sistema para recuperar tu contraseña.\n\n' +
      'Tel: (01) 234-5678\nEmail: soporte@colegio.edu.pe'
    );
  }
}