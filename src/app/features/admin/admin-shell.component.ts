import { Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/services/auth.service';

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  matches: 'Matches',
  rapidapi: 'RapidAPI',
  users: 'Users',
  settings: 'Settings',
};

@Component({
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav
        #drawer
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="nav"
      >
        <div class="brand">
          <mat-icon>shield</mat-icon>
          <span>Fantasy Admin</span>
        </div>
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a mat-list-item
               class="nav-item"
               [routerLink]="item.path"
               routerLinkActive="active"
               (click)="onNavClick()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
        <div class="nav-foot">
          <div class="user">{{ auth.user()?.displayName || auth.user()?.username }}</div>
          <button mat-button class="logout-btn" (click)="logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="top">
          @if (isMobile()) {
            <button mat-icon-button (click)="drawer.toggle()" aria-label="Menu">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="page-title">{{ title() }}</span>
          <span class="spacer"></span>
          <button mat-icon-button (click)="reloadPage()" title="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </mat-toolbar>
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; color: var(--bc-text); }

    .shell {
      height: 100vh;
      background: var(--bc-bg);
    }
    :host ::ng-deep .mat-drawer-side,
    :host ::ng-deep .mat-sidenav {
      background: var(--bc-panel);
      color: var(--bc-text);
    }
    :host ::ng-deep .mat-drawer-backdrop { background: rgba(0,0,0,.55); }
    :host ::ng-deep .mat-sidenav-content { background: var(--bc-bg); }

    .nav {
      width: 248px;
      height: 100%;
      background: var(--bc-panel);
      border-right: 1px solid var(--bc-border);
      display: flex;
      flex-direction: column;
    }
    mat-nav-list { flex: 1; overflow: auto; padding-top: 4px; }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px 14px;
      font-size: 17px;
      font-weight: 600;
      color: var(--bc-accent);
      border-bottom: 1px solid var(--bc-border);
    }
    .brand mat-icon { color: var(--bc-accent); }

    .nav-item {
      color: var(--bc-muted) !important;
      margin: 2px 8px;
      border-radius: 8px;
      border-left: 3px solid transparent;
    }
    :host ::ng-deep .nav-item .mdc-list-item__primary-text,
    :host ::ng-deep .nav-item .mat-mdc-list-item-title {
      color: var(--bc-muted) !important;
    }
    :host ::ng-deep .nav-item mat-icon {
      color: var(--bc-faint) !important;
    }
    .nav-item:hover {
      background: var(--bc-panel-2) !important;
    }
    .nav-item.active {
      background: rgba(79,195,247,.12) !important;
      border-left-color: var(--bc-accent);
    }
    :host ::ng-deep .nav-item.active .mdc-list-item__primary-text,
    :host ::ng-deep .nav-item.active .mat-mdc-list-item-title,
    :host ::ng-deep .nav-item.active mat-icon {
      color: var(--bc-accent) !important;
    }

    .nav-foot {
      margin-top: auto;
      padding: 12px 8px 16px;
      border-top: 1px solid var(--bc-border);
    }
    .user {
      font-size: 13px;
      color: var(--bc-muted);
      padding: 0 8px 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .logout-btn { color: var(--bc-red) !important; }

    .top {
      background: var(--bc-panel);
      color: var(--bc-text);
      border-bottom: 1px solid var(--bc-border);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .page-title { font-size: 18px; font-weight: 500; color: var(--bc-text); }
    .spacer { flex: 1 1 auto; }
    .content { padding: 16px; max-width: 1200px; }
  `],
})
export class AdminShellComponent {
  @ViewChild('drawer') drawer!: MatSidenav;

  auth = inject(AuthService);
  private router = inject(Router);
  private bp = inject(BreakpointObserver);

  isMobile = signal(false);
  title = signal('Dashboard');

  readonly nav = [
    { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: 'matches', label: 'Matches', icon: 'sports_cricket' },
    { path: 'rapidapi', label: 'RapidAPI', icon: 'cloud_sync' },
    { path: 'users', label: 'Users', icon: 'group' },
    { path: 'settings', label: 'Settings', icon: 'settings' },
  ];

  constructor() {
    this.bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe((r) => {
      this.isMobile.set(r.matches);
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.syncTitle();
    });
    this.syncTitle();
  }

  private syncTitle(): void {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    const seg = parts[parts.length - 1] || 'dashboard';
    this.title.set(TITLES[seg] || 'Admin');
  }

  onNavClick(): void {
    if (this.isMobile() && this.drawer?.opened) this.drawer.close();
  }

  reloadPage(): void {
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(url);
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
