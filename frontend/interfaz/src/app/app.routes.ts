import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Registro } from './registro/registro';
import { Dashboard } from './dashboard/dashboard';
import { Calendario } from './calendario/calendario'; // si quieres agregarlo

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'dashboard', component: Dashboard },
  { path: 'calendario', component: Calendario } // opcional
];
