//app.routes.ts
import { Routes } from '@angular/router';
import { Login } from './login/login';

import { Admin } from './paneles/admin/admin';
import { Docente } from './paneles/docente/docente';
import { Estudiante } from './paneles/estudiante/estudiante';
import { EstudianteEntregas } from './paneles/estudiante/estudiante-entregas/estudiante-entregas';
import { Actividades } from './paneles/docente/docente-actividades/docente-actividades';
import { AuthRoleGuard } from './guards/authRole.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  {
    path: 'admin',
    component: Admin,
    canActivate: [AuthRoleGuard],
    data: { role: 'admin' },
  },
  {
    path: 'docente',
    component: Docente,
    canActivate: [AuthRoleGuard],
    data: { role: 'docente' },
  },
  {
    path: 'estudiante',
    component: Estudiante,
    canActivate: [AuthRoleGuard],
    data: { role: 'estudiante' },
  },
  {
    path: 'entregas/:id',
    component: EstudianteEntregas
  },
  { path: 'actividades/:id',
    component: Actividades
  },

  // Ruta fallback
  { path: '**', redirectTo: 'login' },
];
