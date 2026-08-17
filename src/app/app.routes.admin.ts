import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

/** Admin console SPA (login + menu-based console). */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'console' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'console',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'matches',
        loadComponent: () =>
          import('./features/admin/admin-matches.component').then((m) => m.AdminMatchesComponent),
      },
      {
        path: 'rapidapi',
        loadComponent: () =>
          import('./features/admin/admin-rapidapi.component').then((m) => m.AdminRapidApiComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/admin-settings.component').then((m) => m.AdminSettingsComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'console' },
];
