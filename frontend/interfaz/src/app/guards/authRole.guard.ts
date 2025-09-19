import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthRoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles = route.data['role'] as string[] | string;

    const token = this.auth.getToken();
    const user = this.auth.getCurrentUser();

    // 1️⃣ Si no hay token o usuario → redirigir al login
    if (!token || !user) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return false;
    }

    // 2️⃣ Validar expiración del token
    if (!this.auth.isTokenValid()) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return false;
    }

    const userRole = user.rol;
    const rolesArray = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];

    // 3️⃣ Rol incorrecto → acceso denegado (redirige al login o página de error)
    if (!rolesArray.includes(userRole)) {
      this.router.navigate(['/login']); // 👈 también podrías crear un /forbidden
      return false;
    }

    // 4️⃣ Todo correcto → acceso permitido
    return true;
  }
}
