import { Component, ViewChild, inject, signal, OnInit } from '@angular/core';
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
import { WalletBalanceService } from '../../core/services/wallet-balance.service';

const TITLES: Record<string, string> = {
  matches: 'Matches',
  bets: 'My bets',
  wallet: 'Wallet',
  analytics: 'Analytics',
  history: 'Contests',
  profile: 'Profile',
};

@Component({
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #drawer [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile()" class="nav">
        <div class="brand">
          <mat-icon>sports_cricket</mat-icon>
          <span>Fantasy POC</span>
        </div>
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a mat-list-item class="nav-item"
               [routerLink]="item.path"
               routerLinkActive="active"
               [routerLinkActiveOptions]="item.exact ? { exact: true } : { exact: false }"
               (click)="onNavClick()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
        <div class="nav-foot">
          <div class="balance">
            <span class="bal-label">Points</span>
            <strong>{{ wallet.balance() ?? '—' }}</strong>
          </div>
          <div class="user">{{ auth.user()?.displayName || auth.user()?.username }}</div>
          <button mat-button class="logout-btn" (click)="logout()">
            <mat-icon>logout</mat-icon> Logout
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="top">
          @if (isMobile()) {
            <button mat-icon-button (click)="drawer.toggle()"><mat-icon>menu</mat-icon></button>
          }
          <span class="page-title">{{ title() }}</span>
          <span class="spacer"></span>
          <a mat-stroked-button class="bal-chip" routerLink="/wallet" title="Wallet">
            <mat-icon>account_balance_wallet</mat-icon>
            {{ wallet.balance() ?? '—' }}
          </a>
        </mat-toolbar>
        <div class="content"><router-outlet /></div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; color: var(--bc-text); }
    .shell { height: 100vh; background: var(--bc-bg); }
    :host ::ng-deep .mat-drawer-side, :host ::ng-deep .mat-sidenav {
      background: var(--bc-panel); color: var(--bc-text);
    }
    :host ::ng-deep .mat-sidenav-content { background: var(--bc-bg); }
    .nav {
      width: 248px; height: 100%;
      background: var(--bc-panel);
      border-right: 1px solid var(--bc-border);
      display: flex; flex-direction: column;
    }
    mat-nav-list { flex: 1; overflow: auto; padding-top: 4px; }
    .brand {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px 14px; font-size: 17px; font-weight: 600;
      color: var(--bc-accent); border-bottom: 1px solid var(--bc-border);
    }
    .brand mat-icon { color: var(--bc-accent); }
    .nav-item {
      color: var(--bc-muted) !important;
      margin: 2px 8px; border-radius: 8px; border-left: 3px solid transparent;
    }
    :host ::ng-deep .nav-item .mdc-list-item__primary-text,
    :host ::ng-deep .nav-item .mat-mdc-list-item-title { color: var(--bc-muted) !important; }
    :host ::ng-deep .nav-item mat-icon { color: var(--bc-faint) !important; }
    .nav-item:hover { background: var(--bc-panel-2) !important; }
    .nav-item.active {
      background: rgba(79,195,247,.12) !important;
      border-left-color: var(--bc-accent);
    }
    :host ::ng-deep .nav-item.active .mdc-list-item__primary-text,
    :host ::ng-deep .nav-item.active .mat-mdc-list-item-title,
    :host ::ng-deep .nav-item.active mat-icon { color: var(--bc-accent) !important; }
    .nav-foot {
      margin-top: auto; padding: 12px 8px 16px;
      border-top: 1px solid var(--bc-border);
    }
    .balance {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 4px 8px 10px; color: var(--bc-accent); font-size: 18px;
    }
    .bal-label { font-size: 11px; color: var(--bc-muted); text-transform: uppercase; letter-spacing: .4px; }
    .user {
      font-size: 13px; color: var(--bc-muted); padding: 0 8px 8px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .logout-btn { color: var(--bc-red) !important; }
    .top {
      background: var(--bc-panel); color: var(--bc-text);
      border-bottom: 1px solid var(--bc-border);
      position: sticky; top: 0; z-index: 2;
    }
    .page-title { font-size: 18px; font-weight: 500; }
    .spacer { flex: 1 1 auto; }
    .bal-chip {
      color: var(--bc-accent) !important;
      border-color: var(--bc-border) !important;
      font-weight: 500;
    }
    .bal-chip mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }
    .content { padding: 16px; max-width: 1100px; }
  `],
})
export class CustomerShellComponent implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav;

  auth = inject(AuthService);
  wallet = inject(WalletBalanceService);
  private router = inject(Router);
  private bp = inject(BreakpointObserver);

  isMobile = signal(false);
  title = signal('Matches');

  readonly nav = [
    { path: '/matches', label: 'Matches', icon: 'sports_cricket', exact: false },
    { path: '/bets', label: 'My bets', icon: 'casino', exact: false },
    { path: '/wallet', label: 'Wallet', icon: 'account_balance_wallet', exact: false },
    { path: '/analytics', label: 'Analytics', icon: 'insights', exact: false },
    { path: '/history', label: 'Contests', icon: 'emoji_events', exact: false },
    { path: '/profile', label: 'Profile', icon: 'person', exact: false },
  ];

  ngOnInit(): void {
    this.bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe((r) => {
      this.isMobile.set(r.matches);
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.syncTitle();
      this.wallet.refresh();
    });
    this.syncTitle();
    this.wallet.refresh();
  }

  private syncTitle(): void {
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    const seg = parts[0] || 'matches';
    this.title.set(TITLES[seg] || 'Fantasy');
  }

  onNavClick(): void {
    if (this.isMobile() && this.drawer?.opened) this.drawer.close();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
