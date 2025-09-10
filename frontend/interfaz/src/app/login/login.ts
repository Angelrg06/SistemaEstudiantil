import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../service/auth.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="login-container">
      <h1>Iniciar Sesión</h1>
      <form (ngSubmit)="login()">
        <div class="input-group">
          <label for="email">Email</label>
          <input 
            id="email" 
            type="email" 
            [(ngModel)]="email" 
            name="email" 
            required
            placeholder="tu@email.com">
        </div>

        <div class="input-group">
          <label for="password">Contraseña</label>
          <input 
            id="password" 
            type="password" 
            [(ngModel)]="password" 
            name="password" 
            required
            placeholder="Tu contraseña">
        </div>

        <button type="submit" [disabled]="!email || !password">
          Entrar
        </button>
      </form>

      <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
      <p *ngIf="successMessage" class="success">{{ successMessage }}</p>

      <div class="register-section">
        <p>¿No tienes cuenta?</p>
        <a routerLink="/registro" class="register-btn">Regístrate aquí</a>
      </div>
    </main>
  `,
  styles: [`
    .login-container {
      width: 350px;
      margin: 50px auto;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 10px;
      text-align: center;
      background-color: #f9f9f9;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    h1 { 
      margin-bottom: 1.5rem; 
      color: #333;
      font-size: 1.8rem;
    }
    
    .input-group { 
      margin-bottom: 1rem; 
      text-align: left; 
    }
    
    label { 
      display: block; 
      margin-bottom: 0.3rem; 
      font-weight: bold;
      color: #555;
    }
    
    input { 
      width: 100%; 
      padding: 0.75rem; 
      border-radius: 5px; 
      border: 1px solid #ccc;
      font-size: 1rem;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 5px rgba(0,123,255,0.3);
    }
    
    button {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 5px;
      background-color: #007bff;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 1rem;
      transition: background-color 0.3s;
    }

    button:hover:not(:disabled) {
      background-color: #0056b3;
    }

    button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    
    .error { 
      color: #dc3545; 
      margin-top: 1rem; 
      font-weight: bold;
    }

    .success { 
      color: #28a745; 
      margin-top: 1rem; 
      font-weight: bold;
    }

    .register-section {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .register-section p {
      margin-bottom: 0.5rem;
      color: #666;
    }
    
    .register-btn { 
      color: #007bff; 
      text-decoration: none;
      font-weight: bold;
      padding: 0.5rem 1rem;
      border: 2px solid #007bff;
      border-radius: 5px;
      display: inline-block;
      transition: all 0.3s;
    }
    
    .register-btn:hover { 
      background-color: #007bff;
      color: white;
    }
  `]
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    // Limpiar mensajes anteriores
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Email y contraseña son obligatorios';
      return;
    }

    const credentials = { email: this.email, password: this.password };
    this.authService.login(credentials).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.successMessage = 'Login exitoso! Redirigiendo...';
        
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error('Error en login:', err);
        this.errorMessage = err.error?.error || 'Error en el login';
      }
    });
  }
}