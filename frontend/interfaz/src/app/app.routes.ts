// app.routes.ts - ACTUALIZADO
import { Routes } from '@angular/router';
import { Login } from './login/login';

import { Admin } from './paneles/admin/admin';
import { Docente } from './paneles/docente/docente';
import { Estudiante } from './paneles/estudiante/estudiante';
import { EstudianteEntregas } from './paneles/estudiante/estudiante-entregas/estudiante-entregas';
import { Actividades } from './paneles/docente/docente-actividades/docente-actividades';
import { AuthRoleGuard } from './guards/authRole.guard';

// 🆕 IMPORTAR COMPONENTES DE CHAT
import { DocenteChat } from './paneles/docente/docente-chat/docente-chat';
import { EstudianteChat } from './paneles/estudiante/estudiante-chat/estudiante-chat';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  {
    path: 'admin',
    component: Admin,
    canActivate: [AuthRoleGuard],
    data: { role: 'admin' },
  },
  
  // 🆕 RUTAS PARA DOCENTE
  {
    path: 'docente',
    component: Docente,
    canActivate: [AuthRoleGuard],
    data: { role: 'docente' },
  },
  {
    path: 'docente/chat',
    component: DocenteChat,
    canActivate: [AuthRoleGuard],
    data: { role: 'docente' },
  },
  {
    path: 'actividades/:id',
    component: Actividades,
    canActivate: [AuthRoleGuard],
    data: { role: 'docente' },
  },

  // 🆕 RUTAS PARA ESTUDIANTE
  {
    path: 'estudiante',
    component: Estudiante,
    canActivate: [AuthRoleGuard],
    data: { role: 'estudiante' },
  },
  {
    path: 'estudiante/chat',
    component: EstudianteChat,
    canActivate: [AuthRoleGuard],
    data: { role: 'estudiante' },
  },
  {
    path: 'entregas/:id',
    component: EstudianteEntregas,
    canActivate: [AuthRoleGuard],
    data: { role: 'estudiante' },
  },

  // Ruta fallback
  { path: '**', redirectTo: 'login' },
];