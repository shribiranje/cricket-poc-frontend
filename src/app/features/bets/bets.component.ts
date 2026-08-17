import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, MyBetsPage, UserBet } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="filters row">
      @for (f of filters; track f) {
        <button mat-stroked-button
                [class.active]="status() === f"
                (click)="setStatus(f)">{{ f || 'ALL' }}</button>
      }
    </div>

    <div class="bc-panel">
      <div class="bc-panel-header">
        <span>Past bets ({{ page()?.total || 0 }})</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Match</th>
              <th>Call</th>
              <th>Stake</th>
              <th>Result</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            @for (b of bets(); track b.id) {
              <tr>
                <td>{{ b.createdAt | date:'short' }}</td>
                <td>
                  <a [routerLink]="['/matches', b.matchId]">{{ b.fixture }}</a>
                  <br /><small class="muted">{{ b.matchStatus }}</small>
                </td>
                <td>
                  <strong>{{ b.predicted }}</strong>
                  <br /><small class="muted">
                    {{ b.scope }} · inns {{ b.innings }} ov {{ b.overNumber }}
                    @if (b.scope === 'BALL') { · ball {{ b.ballNumber }} }
                  </small>
                </td>
                <td>{{ b.stake }}</td>
                <td>
                  <span class="status-chip status-{{ chip(b) }}">{{ b.status }}</span>
                  @if (b.actual) {
                    <br /><small class="muted">actual {{ b.actual }}</small>
                  }
                </td>
                <td [class.ok]="(b.net || 0) > 0" [class.err]="(b.net || 0) < 0">
                  {{ b.net == null ? '—' : (b.net > 0 ? '+' : '') + b.net }}
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="muted" style="padding:16px;">No bets yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="row pager">
        <span class="muted">Page {{ pageNum() }} of {{ totalPages() }}</span>
        <span class="spacer"></span>
        <button mat-stroked-button (click)="prev()" [disabled]="pageNum() <= 1">Prev</button>
        <button mat-stroked-button (click)="next()" [disabled]="pageNum() >= totalPages()">Next</button>
      </div>
    </div>
  `,
  styles: [`
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .filters { margin-bottom: 12px; }
    .filters button.active {
      background: rgba(79,195,247,.15); border-color: var(--bc-accent); color: var(--bc-accent);
    }
    .pager { padding: 12px 16px; }
    .spacer { flex: 1; }
    .muted { color: var(--bc-muted); font-size: 12px; }
    .ok { color: var(--bc-green); }
    .err { color: var(--bc-red); }
    a { color: var(--bc-accent); text-decoration: none; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th, .data-table td {
      text-align: left; padding: 8px 12px;
      border-bottom: 1px solid var(--bc-border); color: var(--bc-text);
    }
    .data-table th { color: var(--bc-muted); font-size: 11px; }
  `],
})
export class BetsComponent implements OnInit {
  private api = inject(ApiService);
  filters = ['', 'OPEN', 'WON', 'LOST', 'VOID'];
  status = signal('');
  page = signal<MyBetsPage | null>(null);
  bets = signal<UserBet[]>([]);
  pageNum = signal(1);
  private pageSize = 25;

  ngOnInit(): void { this.load(); }

  totalPages(): number {
    return Math.max(1, Math.ceil((this.page()?.total || 0) / this.pageSize));
  }

  chip(b: UserBet): string {
    if (b.status === 'OPEN') return 'UPCOMING';
    if (b.status === 'WON') return 'LIVE';
    return 'COMPLETED';
  }

  setStatus(s: string): void {
    this.status.set(s);
    this.pageNum.set(1);
    this.load();
  }

  load(): void {
    this.api.getMyBets({
      limit: this.pageSize,
      offset: (this.pageNum() - 1) * this.pageSize,
      status: this.status() || undefined,
    }).subscribe((p) => {
      this.page.set(p);
      this.bets.set(p.bets);
    });
  }

  prev(): void {
    if (this.pageNum() <= 1) return;
    this.pageNum.update((n) => n - 1);
    this.load();
  }

  next(): void {
    if (this.pageNum() >= this.totalPages()) return;
    this.pageNum.update((n) => n + 1);
    this.load();
  }
}
