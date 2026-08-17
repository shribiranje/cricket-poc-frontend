import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService, AdminStats } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="grid stats">
      @if (stats(); as s) {
        <div class="bc-panel stat">
          <div class="stat-num">{{ s.users }}</div>
          <div class="stat-label">Users <small>({{ s.admins }} admin)</small></div>
        </div>

        <div class="bc-panel stat">
          <div class="stat-num">{{ s.teamsEntered }}</div>
          <div class="stat-label">Teams entered</div>
        </div>

        <div class="bc-panel stat">
          <div class="stat-num live">{{ s.matches.live }}</div>
          <div class="stat-label">Live matches</div>
        </div>

        <div class="bc-panel stat">
          <div class="stat-num upcoming">{{ s.matches.upcoming }}</div>
          <div class="stat-label">Upcoming</div>
        </div>

        <div class="bc-panel stat">
          <div class="stat-num done">{{ s.matches.completed }}</div>
          <div class="stat-label">Completed</div>
        </div>

        <div class="bc-panel stat">
          <div class="stat-num">{{ s.players }}</div>
          <div class="stat-label">Players / {{ s.teams }} teams</div>
        </div>
      }
    </div>

    <div class="bc-panel quick" STYLE="display: none;">
      <div class="bc-panel-header">
        <span>Quick actions</span>
      </div>
      <div class="row">
        <button mat-raised-button color="primary" (click)="tickAll()" [disabled]="busy()">
          <mat-icon>play_arrow</mat-icon> Tick simulator now
        </button>
        <span class="hint">
          Plays one ball on every live match (or one Sportmonks poll if that's the active source).
        </span>
      </div>
    </div>
  `,
  styles: [`
    .stats {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      margin-bottom: 20px;
    }
    .stat { padding: 16px 18px; }
    .stat-num {
      font-size: 30px; font-weight: 500; line-height: 1.1;
      color: var(--bc-text);
    }
    .stat-num.live { color: var(--bc-red); }
    .stat-num.upcoming { color: var(--bc-accent); }
    .stat-num.done { color: var(--bc-muted); }
    .stat-label { font-size: 12px; color: var(--bc-muted); margin-top: 4px; }
    .quick .row {
      display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
      padding: 14px 18px;
    }
    .hint { font-size: 12px; color: var(--bc-muted); }
  `],
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  stats = signal<AdminStats | null>(null);
  busy = signal(false);

  ngOnInit(): void {
    this.api.adminStats().subscribe((s) => this.stats.set(s));
  }

  tickAll(): void {
    this.busy.set(true);
    this.api.tickSimulator().subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open('Simulator ticked', 'OK', { duration: 1800 });
        this.api.adminStats().subscribe((s) => this.stats.set(s));
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Tick failed', 'Dismiss', { duration: 3500 });
      },
    });
  }
}
