import { Component, inject, signal, computed, OnInit, OnDestroy, AfterViewChecked, Input, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { Match, MatchState, UserTeam, UserTeamPlayer } from '../../core/models';
import { playerAvatar, teamColor } from '../../core/avatar';
import { environment } from '../../../environments/environment';
import { PredictionPanelComponent } from '../../components/prediction-panel/prediction-panel.component';

@Component({
  standalone: true,
  imports: [
    CommonModule, DatePipe, DecimalPipe, RouterLink,
    MatButtonModule, MatIconModule,
    PredictionPanelComponent,
  ],
  template: `
    @if (match(); as m) {
      <div class="bc-panel" style="margin-bottom: 16px;">

        <!-- Header -->
        <div class="bc-panel-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="team-badge" [style.background]="tc(m.teamA.short)">{{ m.teamA.short }}</span>
              <span style="color:var(--bc-muted); font-size:12px; font-weight:500;">vs</span>
              <span class="team-badge" [style.background]="tc(m.teamB.short)">{{ m.teamB.short }}</span>
            </div>
            <div>
              <div style="color:var(--bc-text); font-size:15px; font-weight:500;">
                {{ m.teamA.name }} vs {{ m.teamB.name }}
              </div>
              <div style="color:var(--bc-muted); font-size:11px;">
                {{ m.format }} · {{ m.venue }} · {{ m.startTime | date: 'MMM d, h:mm a' }}
              </div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            <span class="status-chip status-{{ m.status }}">{{ m.status }}</span>
            @if (clock(); as c) {
              <span class="timer-chip" [style.color]="c.color">
                <mat-icon style="font-size:13px; width:13px; height:13px; vertical-align:-2px;">{{ c.icon }}</mat-icon>
                {{ c.label }}
              </span>
            }
          </div>
        </div>

        <!-- Live scoreboard (ball-aware engine) -->
        @if (state(); as s) {
          <div class="scoreboard">
            <div style="display:flex; align-items:baseline; gap:14px; flex-wrap:wrap;">
              <span style="font-size:26px; font-weight:600; color:var(--bc-text);">
                {{ s.battingTeam.short }}
                <span style="color:var(--bc-gold);">{{ s.runs }}/{{ s.wickets }}</span>
              </span>
              <span style="color:var(--bc-muted); font-size:14px;">({{ s.overs }} / {{ s.totalOvers }} ov)</span>
              <span class="inns-chip">{{ s.finished ? 'Match over' : (s.innings === 1 ? '1st innings' : '2nd innings') }}</span>
            </div>
            <div style="color:var(--bc-muted); font-size:12px; margin-top:6px; display:flex; gap:16px; flex-wrap:wrap;">
              @if (s.innings === 2 && s.innings1) {
                <span>{{ s.bowlingTeamShort }} scored {{ s.innings1.runs }}/{{ s.innings1.wickets }} ({{ s.innings1.overs }})</span>
                @if (!s.finished && s.target != null) {
                  <span style="color:var(--bc-accent);">
                    Needs {{ s.target - s.runs }} to win
                  </span>
                }
              }
              @if (!s.finished) {
                @if (s.striker) { <span>🏏 {{ s.striker }}* · {{ s.nonStriker }}</span> }
                @if (s.bowler) { <span>⚾ {{ s.bowler }}</span> }
              }
              @if (s.finished && s.result) {
                <span style="color:var(--bc-green); font-weight:500;">🏆 {{ s.result }}</span>
              }
            </div>
          </div>
        }

        <!-- Stats strip -->
        @if (myTeam(); as t) {
          <div style="display:flex; flex-wrap:wrap; border-bottom:1px solid var(--bc-border);">
            <div class="stat-cell">
              <div class="stat-label">Your points</div>
              <div class="stat-value" style="color:var(--bc-accent);">{{ t.totalPoints | number:'1.0-1' }}</div>
            </div>
            <div class="stat-cell">
              <div class="stat-label">Captain</div>
              <div class="stat-value" style="font-size:14px; padding-top:6px;">{{ captainName() }}</div>
            </div>
            <div class="stat-cell">
              <div class="stat-label">Credits used</div>
              <div class="stat-value">{{ t.totalCreditsUsed }}<span style="font-size:13px; color:var(--bc-muted);">/100</span></div>
            </div>
            <div class="stat-cell" style="border-right:none;">
              <div class="stat-label">Team status</div>
              <div class="stat-value" style="font-size:14px; padding-top:6px;"
                   [style.color]="t.isLocked ? 'var(--bc-red)' : 'var(--bc-accent)'">
                <mat-icon style="font-size:15px; width:15px; height:15px; vertical-align:-2px;">
                  {{ t.isLocked ? 'lock' : 'lock_open' }}</mat-icon>
                {{ t.isLocked ? 'Locked' : 'Editable' }}
              </div>
            </div>
          </div>

          <!-- Player table sorted by points -->
          <table class="bc-table">
            <thead>
              <tr>
                <th style="width:36px;">#</th><th>Player</th>
                <th style="width:70px;">Role</th>
                <th class="num-col" style="width:70px;">Credit</th>
                <th class="num-col" style="width:70px;">Points</th>
              </tr>
            </thead>
            <tbody>
              @for (p of sortedPlayers(); track p.id; let i = $index) {
                <tr [style.borderLeft]="p.isCaptain ? '3px solid #EF9F27' : p.isViceCaptain ? '3px solid #8b98b8' : 'none'"
                    [style.background]="p.isCaptain ? 'rgba(239,159,39,.05)' : p.isViceCaptain ? 'rgba(139,152,184,.05)' : (p.points > 0 ? 'rgba(79,195,247,.05)' : 'transparent')">
                  <td style="color:var(--bc-muted);">{{ i + 1 }}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img class="avatar" [src]="avatar(p)" alt="" width="30" height="30"
                           [style.border]="p.isCaptain ? '2px solid #EF9F27' : p.isViceCaptain ? '2px solid #8b98b8' : 'none'" />
                      <div>
                        <div style="font-weight:500;">
                          {{ p.name }}
                          @if (p.isCaptain) { <span class="cap-tag c">C · 2x</span> }
                          @if (p.isViceCaptain) { <span class="cap-tag vc">VC · 1.5x</span> }
                        </div>
                        <div style="color:var(--bc-muted); font-size:10px;">{{ p.teamShort }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="role-chip role-{{ p.role }}">{{ shortRole(p.role) }}</span></td>
                  <td class="num-col" style="color:var(--bc-muted);">{{ p.credit }}</td>
                  <td class="num-col">
                    <span [class]="p.points > 0 ? 'bc-pts' : 'bc-pts-zero'">{{ p.points | number:'1.0-1' }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div style="padding: 20px 18px; color: var(--bc-muted);">
            You haven't built a team for this match yet.
            @if (m.status === 'UPCOMING') {
              <a [routerLink]="['/matches', m.id, 'team']" style="color: var(--bc-accent);">Build one →</a>
            }
          </div>
        }

        <!-- Footer actions -->
        <div style="padding: 12px 18px; border-top: 1px solid var(--bc-border); display:flex; gap:8px; flex-wrap:wrap;">
          @if (m.status === 'UPCOMING') {
            <a mat-raised-button color="primary" [routerLink]="['/matches', m.id, 'team']">
              {{ myTeam() ? 'Edit team' : 'Build team' }}
            </a>
          }
          @if (m.status === 'LIVE') {
            <button mat-raised-button color="primary" type="button" (click)="scrollToBets()">
              Bet next over
            </button>
          }
          <a mat-stroked-button [routerLink]="['/matches', m.id, 'leaderboard']">Leaderboard</a>
        </div>
      </div>

      @if (m.status === 'LIVE') {
        <div style="margin-top: 16px;">
          <app-prediction-panel #betPanel [matchId]="m.id" [live]="true" />
        </div>
      }
    }
  `,
  styles: [`
    .stat-cell { flex: 1 1 120px; padding: 12px 18px; border-right: 1px solid var(--bc-border); }
    .stat-label { color: var(--bc-muted); font-size: 11px; margin-bottom: 2px; }
    .stat-value { color: var(--bc-text); font-size: 22px; font-weight: 500; }
    .cap-tag { font-size: 9px; font-weight: 500; padding: 1px 6px; border-radius: 8px; margin-left: 4px; }
    .cap-tag.c  { background: #EF9F27; color: #412402; }
    .cap-tag.vc { background: #8b98b8; color: #10182b; }
    .scoreboard {
      padding: 14px 18px;
      border-bottom: 1px solid var(--bc-border);
      background: linear-gradient(90deg, rgba(255,183,77,.06), transparent 60%);
    }
    .inns-chip {
      display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 500;
      background: rgba(79,195,247,.15); color: var(--bc-accent);
    }
    .timer-chip {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  `],
})
export class MatchDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  @Input() id!: string;
  @ViewChild('betPanel') betPanel?: PredictionPanelComponent;
  match = signal<Match | null>(null);
  myTeam = signal<UserTeam | null>(null);
  state = signal<MatchState | null>(null);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pendingFragmentScroll = false;

  sortedPlayers = computed(() => {
    const t = this.myTeam();
    if (!t) return [];
    return [...t.players].sort((a, b) => b.points - a.points);
  });

  captainName = computed(() => {
    const t = this.myTeam();
    if (!t) return '—';
    return t.players.find((p) => p.isCaptain)?.name || '—';
  });

  // Ticking wall clock (updates every second) drives the countdown / elapsed chip.
  private now = signal(Date.now());
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  /** Countdown until start (UPCOMING) or elapsed since start (LIVE). Pure UI, no API. */
  clock = computed(() => {
    const m = this.match();
    if (!m) return null;
    const start = new Date(m.startTime).getTime();
    const diff = start - this.now(); // ms until start (negative once started)

    if (m.status === 'UPCOMING') {
      return diff > 0
        ? { icon: 'schedule', color: 'var(--bc-accent)', label: `Starts in ${this.fmtDur(diff)}` }
        : { icon: 'timer', color: 'var(--bc-gold)', label: 'Starting any moment…' };
    }
    if (m.status === 'LIVE') {
      return { icon: 'timer', color: 'var(--bc-red)', label: `Live · ${this.fmtDur(-diff)} elapsed` };
    }
    return null; // COMPLETED — no timer
  });

  /** ms → "2h 15m 30s" / "15m 30s" / "45s" (days roll up when large). */
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

  ngOnInit(): void {
    this.pendingFragmentScroll = this.route.snapshot.fragment === 'bet-next-over';
    this.refresh();
    this.clockTimer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngAfterViewChecked(): void {
    if (this.pendingFragmentScroll && this.betPanel) {
      this.pendingFragmentScroll = false;
      setTimeout(() => this.scrollToBets(), 50);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  private refresh(): void {
    const matchId = Number(this.id);
    this.api.getMatch(matchId).subscribe((m) => {
      this.match.set(m);
      if (m.status === 'LIVE') this.startPolling();
      else this.stopPolling();
    });
    this.api.getMyTeam(matchId).subscribe((t) => this.myTeam.set(t));
    this.api.getMatchState(matchId).subscribe((s) => this.state.set(s));
  }

  private startPolling(): void {
    if (this.pollTimer || !environment.livePollMs) return;
    this.pollTimer = setInterval(() => this.refresh(), environment.livePollMs);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  scrollToBets(): void {
    this.betPanel?.focusPanel();
    document.getElementById('bet-next-over')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  avatar(p: UserTeamPlayer): string { return playerAvatar(p.name, p.teamShort); }
  tc(short: string): string { return teamColor(short); }

  shortRole(r: string): string {
    return r === 'WICKET_KEEPER' ? 'WK' : r === 'ALL_ROUNDER' ? 'AR' : r === 'BATSMAN' ? 'BAT' : 'BOWL';
  }
}
