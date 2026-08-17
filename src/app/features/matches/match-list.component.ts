import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { Match, MatchStatus } from '../../core/models';
import { teamColor } from '../../core/avatar';

type StatusFilter = 'ALL' | MatchStatus;
interface DateGroup { key: string; label: string; matches: Match[]; }

@Component({
  standalone: true,
  imports: [
    CommonModule, DatePipe, RouterLink,
    MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 style="color: var(--bc-text);">Matches</h2>

    <!-- ============ Filter chips + result summary ============ -->
    <div class="filter-bar">
      <div class="chip-row">
        @for (f of statusFilters; track f.value) {
          <button class="chip" [class.chip-on]="statusFilter() === f.value"
                  (click)="statusFilter.set(f.value)">
            @if (f.value === 'LIVE') { <span class="live-dot"></span> }
            {{ f.label }}
            <span class="chip-count">{{ countFor(f.value) }}</span>
          </button>
        }

        <span class="chip-divider"></span>

        <!-- Team facet -->
        <button class="chip chip-add" [class.chip-on]="!!teamFilter()" [matMenuTriggerFor]="teamMenu">
          @if (teamFilter()) {
            <span class="team-dot" [style.background]="tc(teamFilter()!)"></span>{{ teamFilter() }}
            <mat-icon class="chip-x" (click)="clearTeam($event)">close</mat-icon>
          } @else {
            <mat-icon class="chip-plus">add</mat-icon> Team
          }
        </button>
        <mat-menu #teamMenu="matMenu">
          @for (t of allTeams(); track t) {
            <button mat-menu-item (click)="teamFilter.set(t)">
              <span class="team-dot" [style.background]="tc(t)"></span> {{ t }}
            </button>
          }
        </mat-menu>
      </div>

      <div class="summary-row">
        <span>
          Showing <strong style="color:var(--bc-text);">{{ filtered().length }}</strong>
          of {{ allMatches().length }} matches
        </span>
        @if (hasFilters()) {
          <button class="link-btn" (click)="clearAll()">Clear all</button>
        }
      </div>
    </div>

    <!-- ============ Results ============ -->
    @if (loading()) {
      <div style="text-align:center; padding: 24px;"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (filtered().length === 0) {
      <div class="empty">
        <mat-icon style="font-size:32px; width:32px; height:32px; color:var(--bc-faint);">search_off</mat-icon>
        <p style="color: var(--bc-muted); margin:8px 0 12px;">No matches match these filters.</p>
        @if (hasFilters()) {
          <button mat-stroked-button (click)="clearAll()">Clear all filters</button>
        }
      </div>
    } @else {
      @for (g of groups(); track g.key) {
        <div class="date-header">{{ g.label }} <span class="date-count">{{ g.matches.length }}</span></div>
        <div class="grid" style="margin-bottom:20px;">
          @for (m of g.matches; track m.id) {
            <div class="bc-panel match-card" [class.card-live]="m.status === 'LIVE'"
                 [class.card-done]="m.status === 'COMPLETED'">
              <div style="padding: 14px 16px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="team-badge" [style.background]="tc(m.teamA.short)">{{ m.teamA.short }}</span>
                    <span style="color:var(--bc-muted); font-size:11px; font-weight:500;">vs</span>
                    <span class="team-badge" [style.background]="tc(m.teamB.short)">{{ m.teamB.short }}</span>
                  </div>
                  @if (m.status === 'LIVE') {
                    <span class="status-chip status-LIVE"><span class="live-dot"></span>LIVE</span>
                  } @else {
                    <span class="status-chip status-{{ m.status }}">{{ m.status }}</span>
                  }
                </div>

                <div style="color:var(--bc-text); font-size:14px; font-weight:500;">
                  {{ m.teamA.name }} vs {{ m.teamB.name }}
                </div>
                <div style="color:var(--bc-muted); font-size:11px; margin-top:2px;">
                  {{ m.format }}{{ m.venue ? ' · ' + m.venue : '' }} · {{ m.startTime | date: 'h:mm a' }}
                </div>

                <!-- Status-specific line: live score / result / countdown -->
                @if (m.status === 'LIVE' && m.state) {
                  <div class="live-score">
                    <span class="live-score-main">
                      {{ m.state.battingShort }} {{ m.state.runs }}/{{ m.state.wickets }}
                    </span>
                    <span class="live-score-sub">({{ m.state.overs }} ov)</span>
                    @if (m.state.target) {
                      <span class="live-score-sub">· needs {{ m.state.target - m.state.runs }}</span>
                    }
                  </div>
                } @else if (m.status === 'COMPLETED') {
                  <div class="result-line">
                    <mat-icon class="result-icon">emoji_events</mat-icon>
                    {{ m.state?.result || 'Match completed' }}
                  </div>
                } @else {
                  @if (clock(m); as c) {
                    <div class="timer-chip" [style.color]="c.color">{{ c.label }}</div>
                  }
                }
              </div>

              <div style="padding: 10px 16px; border-top: 1px solid var(--bc-border); display:flex; gap:8px; flex-wrap:wrap;">
                @if (m.status === 'UPCOMING') {
                  <a mat-raised-button color="primary" [routerLink]="['/matches', m.id, 'team']">Build team</a>
                } @else if (m.status === 'LIVE') {
                  <a mat-raised-button color="primary" [routerLink]="['/matches', m.id]" fragment="bet-next-over">Bet over</a>
                  <a mat-stroked-button [routerLink]="['/matches', m.id, 'leaderboard']">Leaderboard</a>
                } @else {
                  <a mat-raised-button color="primary" [routerLink]="['/matches', m.id, 'leaderboard']">Leaderboard</a>
                }
                <a mat-button [routerLink]="['/matches', m.id]" style="color: var(--bc-muted);">Details</a>
              </div>
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .filter-bar { margin-bottom: 18px; }
    .chip-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

    .chip {
      display:inline-flex; align-items:center; gap:6px;
      font-size:12px; font-weight:500; font-family:inherit;
      padding:6px 13px; border-radius:14px; cursor:pointer;
      background: var(--bc-panel); color: var(--bc-muted);
      border: 1px solid var(--bc-border);
      transition: background .15s, color .15s, border-color .15s;
    }
    .chip:hover { border-color: var(--bc-accent); color: var(--bc-text); }
    .chip-on {
      background: var(--bc-accent); color: #06263a; border-color: var(--bc-accent);
    }
    .chip-on .chip-count { background: rgba(0,0,0,.18); color: #06263a; }
    .chip-count {
      font-size:11px; padding:0 6px; border-radius:8px; min-width:16px; text-align:center;
      background: var(--bc-panel-2); color: var(--bc-faint);
    }
    .chip-divider { width:1px; height:18px; background: var(--bc-border); }
    .chip-add { border-style: dashed; }
    .chip-plus { font-size:14px; width:14px; height:14px; }
    .chip-x { font-size:13px; width:13px; height:13px; opacity:.8; }
    .chip-x:hover { opacity:1; }
    .team-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }

    .summary-row {
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      margin-top:10px; padding-top:10px; border-top:1px solid var(--bc-border);
      font-size:12px; color: var(--bc-muted);
    }
    .link-btn {
      background:none; border:none; padding:0; cursor:pointer; font-family:inherit;
      font-size:12px; color: var(--bc-accent);
    }
    .link-btn:hover { text-decoration: underline; }

    .date-header {
      position: sticky; top: 0; z-index: 2;
      display:flex; align-items:center; gap:8px;
      padding: 8px 0; margin-bottom: 8px;
      background: var(--bc-bg);
      font-size: 12px; font-weight: 500; color: var(--bc-muted);
      text-transform: uppercase; letter-spacing: .5px;
    }
    .date-count {
      background: var(--bc-panel-2); color: var(--bc-faint);
      border-radius:8px; padding:0 6px; font-size:11px; letter-spacing:0;
    }

    .match-card { transition: border-color .15s; }
    .card-live { border-color: rgba(255,138,138,.5); }
    .card-done { opacity: .82; }
    .card-done:hover { opacity: 1; }

    .live-dot {
      width:6px; height:6px; border-radius:50%; background: var(--bc-red);
      display:inline-block; animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }

    .live-score { margin-top:8px; display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; }
    .live-score-main { font-size:17px; font-weight:600; color: var(--bc-gold); }
    .live-score-sub { font-size:11px; color: var(--bc-muted); }

    .result-line {
      margin-top:8px; display:flex; align-items:center; gap:5px;
      font-size:12px; font-weight:500; color: var(--bc-green);
    }
    .result-icon { font-size:14px; width:14px; height:14px; }

    .timer-chip { font-size:11px; font-weight:500; font-variant-numeric:tabular-nums; margin-top:8px; }

    .empty { text-align:center; padding:36px 16px; }
  `],
})
export class MatchListComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);

  allMatches = signal<Match[]>([]);
  loading = signal(false);
  statusFilter = signal<StatusFilter>('ALL');
  teamFilter = signal<string | null>(null);

  statusFilters: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'LIVE', label: 'Live' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  private now = signal(Date.now());
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  /** Everything is filtered client-side so counts and "showing X of Y" stay honest. */
  filtered = computed(() => {
    const st = this.statusFilter();
    const team = this.teamFilter();
    return this.allMatches().filter((m) => {
      if (st !== 'ALL' && m.status !== st) return false;
      if (team && m.teamA.short !== team && m.teamB.short !== team) return false;
      return true;
    });
  });

  /** Distinct team shorts present in the fixture list, for the team facet. */
  allTeams = computed(() => {
    const set = new Set<string>();
    for (const m of this.allMatches()) { set.add(m.teamA.short); set.add(m.teamB.short); }
    return [...set].sort();
  });

  /** Group by calendar day (viewer's local time), labelled Today / Tomorrow / date. */
  groups = computed<DateGroup[]>(() => {
    const map = new Map<string, Match[]>();
    for (const m of this.filtered()) {
      const key = this.dayKey(new Date(m.startTime));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, matches]) => ({ key, label: this.dayLabel(key), matches }));
  });

  hasFilters = computed(() => this.statusFilter() !== 'ALL' || !!this.teamFilter());

  ngOnInit(): void {
    this.load();
    this.clockTimer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  countFor(f: StatusFilter): number {
    const team = this.teamFilter();
    return this.allMatches().filter((m) => {
      if (f !== 'ALL' && m.status !== f) return false;
      if (team && m.teamA.short !== team && m.teamB.short !== team) return false;
      return true;
    }).length;
  }

  clearTeam(e: Event): void { e.stopPropagation(); this.teamFilter.set(null); }
  clearAll(): void { this.statusFilter.set('ALL'); this.teamFilter.set(null); }

  /** Local-day key 'YYYY-MM-DD' — sorts chronologically as a string. */
  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private dayLabel(key: string): string {
    const today = this.dayKey(new Date());
    const tomorrow = this.dayKey(new Date(Date.now() + 86400000));
    const yesterday = this.dayKey(new Date(Date.now() - 86400000));
    if (key === today) return 'Today';
    if (key === tomorrow) return 'Tomorrow';
    if (key === yesterday) return 'Yesterday';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  }

  /** Countdown for UPCOMING cards. Live/completed cards show score/result instead. */
  clock(m: Match): { color: string; label: string } | null {
    if (m.status !== 'UPCOMING') return null;
    const diff = new Date(m.startTime).getTime() - this.now();
    return diff > 0
      ? { color: 'var(--bc-accent)', label: `⏳ Starts in ${this.fmtDur(diff)}` }
      : { color: 'var(--bc-gold)', label: '⏳ Starting any moment…' };
  }

  private fmtDur(ms: number): string {
    let s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600);  s -= h * 3600;
    const mn = Math.floor(s / 60);   s -= mn * 60;
    if (d > 0) return `${d}d ${h}h ${mn}m`;
    if (h > 0) return `${h}h ${mn}m ${s}s`;
    if (mn > 0) return `${mn}m ${s}s`;
    return `${s}s`;
  }

  tc(short: string): string { return teamColor(short); }

  /** One fetch, no status param — filtering happens client-side. */
  private load(): void {
    this.loading.set(true);
    this.api.listMatches().subscribe({
      next: (data) => { this.allMatches.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
