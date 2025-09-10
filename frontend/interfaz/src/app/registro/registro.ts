import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../service/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css']
})
export class Registro {
  email: string = '';
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  register() {
    console.log('🔴 BOTÓN PRESIONADO - Iniciando registro...');

    // Limpiar mensajes anteriores
    this.errorMessage = '';
    this.successMessage = '';

    console.log('📝 Datos del formulario:', {
      email: this.email,
      username: this.username,
      password: this.password
    });

    // Validación básica
    if (!this.email || !this.username || !this.password) {
      this.errorMessage = 'Todos los campos son obligatorios';
      console.log('❌ Validación fallida: Campos vacíos');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      console.log('❌ Validación fallida: Contraseña muy corta');
      return;
    }

    const userData = {
      email: this.email,
      username: this.username,
      password: this.password
    };

    console.log('📤 Enviando al servicio AuthService...');

    this.authService.register(userData).subscribe({
      next: (res) => {
        console.log('✅ Registro exitoso:', res);
        localStorage.setItem('token', res.token);
        this.successMessage = 'Registro exitoso! Redirigiendo...';

        // Esperar un poco antes de redirigir para mostrar el mensaje
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Error en registro:', err);
        this.errorMessage = err.error?.error || 'Error al registrar usuario';
      }
    });
  }
}