import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink,
    MatToolbarModule, MatButtonModule,
  ],
  template: `
    @if (!isAdminApp) {
      @if (!auth.isAuthenticated()) {
        <mat-toolbar class="auth-bar">
          <span class="brand" routerLink="/login">Fantasy POC</span>
          <span class="spacer"></span>
          <a mat-button routerLink="/login">Login</a>
          <a mat-button routerLink="/register">Sign up</a>
        </mat-toolbar>
        <main class="container auth-main"><router-outlet /></main>
      } @else {
        <main class="app-host"><router-outlet /></main>
      }
    } @else {
      @if (!auth.isAuthenticated()) {
        <mat-toolbar class="auth-bar admin">
          <span class="brand">Fantasy Admin</span>
          <span class="spacer"></span>
          <a mat-button routerLink="/login">Login</a>
        </mat-toolbar>
        <main class="container auth-main"><router-outlet /></main>
      } @else {
        <main class="admin-host"><router-outlet /></main>
      }
    }

    @if (showSportScoreAttribution) {
      <footer class="attribution">
        <a href="https://sportscore.com/" rel="dofollow" target="_blank">Powered by SportScore</a>
      </footer>
    }
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    .auth-bar {
      background: var(--bc-panel); color: var(--bc-text);
      border-bottom: 1px solid var(--bc-border);
    }
    .auth-bar .brand {
      cursor: pointer; font-weight: 600; color: var(--bc-accent);
    }
    .auth-bar a { color: var(--bc-text) !important; }
    .auth-main { min-height: calc(100vh - 64px); }
    .app-host, .admin-host {
      min-height: 100vh; background: var(--bc-bg); color: var(--bc-text);
    }
    .attribution { text-align: center; padding: 12px; font-size: 12px; opacity: 0.7; }
    .attribution a { color: inherit; }
  `],
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  readonly isAdminApp = environment.appKind === 'admin';
  readonly showSportScoreAttribution = (environment as any).sportScoreAttribution === true;

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
