import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/** Customer-facing fantasy app with sidebar shell (matches admin console look). */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'matches' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/customer-shell.component').then((m) => m.CustomerShellComponent),
    children: [
      {
        path: 'matches',
        loadComponent: () =>
          import('./features/matches/match-list.component').then((m) => m.MatchListComponent),
      },
      {
        path: 'matches/:id',
        loadComponent: () =>
          import('./features/matches/match-detail.component').then((m) => m.MatchDetailComponent),
      },
      {
        path: 'matches/:id/team',
        loadComponent: () =>
          import('./features/team-builder/team-builder.component').then((m) => m.TeamBuilderComponent),
      },
      {
        path: 'matches/:id/leaderboard',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard.component').then((m) => m.LeaderboardComponent),
      },
      {
        path: 'bets',
        loadComponent: () =>
          import('./features/bets/bets.component').then((m) => m.BetsComponent),
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/wallet.component').then((m) => m.WalletComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'matches' },
];
