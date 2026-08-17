import { Component, inject, signal, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardEntry, Match } from '../../core/models';
import { userAvatar, teamColor } from '../../core/avatar';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatButtonModule, MatIconModule],
  template: `
    @if (match(); as m) {
      <div class="bc-panel">
        <div class="bc-panel-header">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="team-badge" [style.background]="tc(m.teamA.short)">{{ m.teamA.short }}</span>
              <span style="color:var(--bc-muted); font-size:12px; font-weight:500;">vs</span>
              <span class="team-badge" [style.background]="tc(m.teamB.short)">{{ m.teamB.short }}</span>
            </div>
            <div>
              <div style="color:var(--bc-text); font-size:15px; font-weight:500;">Leaderboard</div>
              <div style="color:var(--bc-muted); font-size:11px;">
                {{ m.teamA.name }} vs {{ m.teamB.name }}
                @if (m.status === 'LIVE') { · auto-refreshing every {{ pollMs / 1000 }}s }
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="status-chip status-{{ m.status }}">{{ m.status }}</span>
            <button mat-icon-button (click)="refresh()" title="Refresh" style="color: var(--bc-muted);">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </div>

        @if (rows().length === 0) {
          <div style="padding: 24px 18px; color: var(--bc-muted); text-align:center;">No entries yet.</div>
        } @else {
          <table class="bc-table">
            <thead>
              <tr>
                <th style="width:56px;">Rank</th>
                <th>User</th>
                <th class="num-col" style="width:100px;">Credits</th>
                <th class="num-col" style="width:90px;">Points</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.userTeamId) {
                <tr [style.background]="isSelf(r.userId) ? 'rgba(79,195,247,.08)' : (r.rank === 1 ? 'rgba(255,183,77,.06)' : 'transparent')"
                    [style.borderLeft]="isSelf(r.userId) ? '3px solid var(--bc-accent)' : 'none'">
                  <td>
                    <span class="rank-pill" [class.gold]="r.rank === 1" [class.self]="isSelf(r.userId)">{{ r.rank }}</span>
                  </td>
                  <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <img class="avatar" [src]="avatar(r)" alt="" width="30" height="30" />
                      <div>
                        <div style="font-weight:500;">
                          {{ r.displayName }}
                          @if (isSelf(r.userId)) { <span style="font-size:10px; color:var(--bc-accent);">you</span> }
                        </div>
                        <div style="color:var(--bc-muted); font-size:10px;">&#64;{{ r.username }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="num-col" style="color:var(--bc-muted);">{{ r.totalCreditsUsed }}</td>
                  <td class="num-col">
                    <span [class]="r.totalPoints > 0 ? 'bc-pts' : 'bc-pts-zero'">{{ r.totalPoints | number:'1.0-1' }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
  `,
  styles: [`
    .rank-pill {
      width: 24px; height: 24px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--bc-panel-2); color: var(--bc-muted);
      font-size: 11px; font-weight: 500;
    }
    .rank-pill.gold { background: rgba(255,183,77,.2); color: var(--bc-gold); }
    .rank-pill.self { background: var(--bc-accent); color: #10182b; }
  `],
})
export class LeaderboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  @Input() id!: string;

  match = signal<Match | null>(null);
  rows = signal<LeaderboardEntry[]>([]);
  pollMs = environment.livePollMs;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.api.getMatch(Number(this.id)).subscribe((m) => {
      this.match.set(m);
      this.refresh();
      if (m.status === 'LIVE' && this.pollMs > 0) {
        this.timer = setInterval(() => this.refresh(), this.pollMs);
      }
    });
  }

  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }

  refresh(): void {
    this.api.getLeaderboard(Number(this.id)).subscribe((r) => this.rows.set(r));
    this.api.getMatch(Number(this.id)).subscribe((m) => {
      const prev = this.match();
      this.match.set(m);
      if (prev && prev.status === 'LIVE' && m.status !== 'LIVE' && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    });
  }

  avatar(r: LeaderboardEntry): string { return userAvatar(r.displayName, r.avatarUrl); }
  tc(short: string): string { return teamColor(short); }
  isSelf(userId: number): boolean { return this.auth.user()?.id === userId; }
}
