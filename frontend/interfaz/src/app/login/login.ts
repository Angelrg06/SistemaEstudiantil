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
  rememberMe = false; // ← nuevo
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {
    this.loadRememberedUser(); // Cargar usuario guardado al iniciar
  }

  // Función para cargar el usuario guardado
  loadRememberedUser() {
    const savedCorreo = localStorage.getItem('rememberedCorreo');
    if (savedCorreo) {
      this.correo = savedCorreo;
      this.rememberMe = true;
    }
  }

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

          // Guardar o borrar correo según el checkbox
          if (this.rememberMe) {
            localStorage.setItem('rememberedCorreo', this.correo);
          } else {
            localStorage.removeItem('rememberedCorreo');
          }

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
