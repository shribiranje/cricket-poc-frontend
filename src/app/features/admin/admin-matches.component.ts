import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService, AdminMatch, AdminTeam } from '../../core/services/api.service';
import { AutoplayMode } from '../../core/models';
import { MatchFormComponent, MatchFormData } from './match-form.component';
import { formatInTz } from '../../core/timezone';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="bc-panel">
      <div class="bc-panel-header">
        <span>Matches ({{ matches().length }})</span>
        <button mat-raised-button color="primary" (click)="openCreate()" [disabled]="busy()">
          <mat-icon>add</mat-icon> New match
        </button>
      </div>
      <div style="overflow-x:auto; padding: 0 0 8px;">
        <table mat-table [dataSource]="matches()" class="admin-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let m">{{ m.id }}</td>
          </ng-container>
          <ng-container matColumnDef="fixture">
            <th mat-header-cell *matHeaderCellDef>Fixture</th>
            <td mat-cell *matCellDef="let m">
              <strong>{{ m.teamAShort }} vs {{ m.teamBShort }}</strong>
              <small class="muted"> · {{ m.format }}</small>
              @if (m.isExternal) {
                <small class="accent" title="RapidAPI fixture"> · RapidAPI</small>
              }
              <br /><small class="muted">
                {{ inTz(m) }} ({{ m.timezone }})
                @if (m.isExternal) {
                  · sync from feed
                } @else if (m.status === 'UPCOMING') {
                  · {{ m.autoStart ? 'auto-start' : 'manual start' }}
                }
              </small>
              @if (m.state; as st) {
                <br /><small [class]="st.finished ? 'ok' : 'warn'">
                  @if (st.finished && st.result) {
                    {{ st.result }}
                  } @else {
                    {{ st.battingShort }} {{ st.runs }}/{{ st.wickets }} ({{ st.overs }} ov)
                    · inns {{ st.innings }}@if (st.target) {, target {{ st.target }}}
                  }
                </small>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let m">
              <span class="status-chip status-{{ m.status }}">{{ m.status }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="entries">
            <th mat-header-cell *matHeaderCellDef>Entries</th>
            <td mat-cell *matCellDef="let m">{{ m.entries }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Status / actions</th>
            <td mat-cell *matCellDef="let m" style="white-space:nowrap;">
              <div class="match-actions">
                @if (m.isExternal) {
                  <button mat-stroked-button color="accent" [disabled]="busy()"
                          (click)="syncMatch(m)"
                          title="Pull latest balls from RapidAPI">
                    <mat-icon>sync</mat-icon> Sync live over
                  </button>
                  <span class="feed-note">
                    @if (m.status === 'COMPLETED') { Done · }
                    Follows RapidAPI
                  </span>
                } @else {
                  @if (m.status === 'UPCOMING') {
                    <button mat-stroked-button color="primary" [disabled]="busy()"
                            (click)="startMatch(m)" title="Set status to LIVE now">
                      <mat-icon>play_circle</mat-icon> Start LIVE
                    </button>
                    <button mat-icon-button [disabled]="busy()" (click)="openEdit(m)" title="Edit match">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" [disabled]="busy()"
                            (click)="deleteMatch(m)" title="Delete match">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                  @if (m.status === 'LIVE') {
                    <button mat-stroked-button color="accent" [disabled]="busy()"
                            (click)="completeMatch(m)" title="Set status to COMPLETED">
                      <mat-icon>flag</mat-icon> Complete
                    </button>
                    <button mat-button color="warn" [disabled]="busy()"
                            (click)="resetMatch(m)" title="Reset live scoring">
                      <mat-icon>restart_alt</mat-icon> Reset
                    </button>
                    <button mat-icon-button color="primary" [disabled]="busy()"
                            [matMenuTriggerFor]="playMenu" [matMenuTriggerData]="{ m: m }"
                            title="Auto-play…">
                      <mat-icon>fast_forward</mat-icon>
                    </button>
                  }
                  @if (m.status === 'COMPLETED') {
                    <span class="done-note">Done</span>
                  }
                }
              </div>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="matchCols"></tr>
          <tr mat-row *matRowDef="let r; columns: matchCols;"></tr>
        </table>

        <mat-menu #playMenu="matMenu">
          <ng-template matMenuContent let-m="m">
            <button mat-menu-item (click)="autoplay(m, 'BALL_1')"><mat-icon>sports_cricket</mat-icon> Play 1 ball</button>
            <button mat-menu-item (click)="autoplay(m, 'OVER_1')"><mat-icon>skip_next</mat-icon> Play 1 over</button>
            <button mat-menu-item (click)="autoplay(m, 'OVER_5')"><mat-icon>fast_forward</mat-icon> Play 5 overs</button>
            <button mat-menu-item (click)="autoplay(m, 'INNINGS')"><mat-icon>sports_score</mat-icon> Finish innings</button>
            <button mat-menu-item (click)="autoplay(m, 'END_MATCH')"><mat-icon>flag_circle</mat-icon> Play to end of match</button>
          </ng-template>
        </mat-menu>
      </div>
    </div>
  `,
  styles: [`
    .match-actions { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .match-actions button mat-icon {
      font-size: 18px; width: 18px; height: 18px; margin-right: 2px;
    }
    .done-note, .feed-note { font-size: 12px; color: var(--bc-muted); padding: 0 6px; }
    .feed-note { color: var(--bc-accent); }
    .muted { color: var(--bc-muted); }
    .accent { color: var(--bc-accent); }
    .ok { color: var(--bc-green); }
    .warn { color: var(--bc-gold); }
    .admin-table { width: 100%; background: transparent; }
    :host ::ng-deep .admin-table .mat-mdc-header-cell,
    :host ::ng-deep .admin-table .mat-mdc-cell {
      color: var(--bc-text);
      border-bottom-color: var(--bc-border);
    }
    :host ::ng-deep .admin-table .mat-mdc-header-cell { color: var(--bc-muted); }
  `],
})
export class AdminMatchesComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  matches = signal<AdminMatch[]>([]);
  teams = signal<AdminTeam[]>([]);
  busy = signal(false);
  matchCols = ['id', 'fixture', 'status', 'entries', 'actions'];

  ngOnInit(): void { this.refresh(); }

  inTz(m: AdminMatch): string { return formatInTz(m.startTime, m.timezone || 'UTC'); }

  refresh(): void {
    this.api.adminMatches().subscribe((m) => this.matches.set(m));
  }

  private wrap(label: string, obs: any): void {
    this.busy.set(true);
    obs.subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open(label, 'OK', { duration: 1800 });
        this.refresh();
      },
      error: (e: any) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || `${label} failed`, 'Dismiss', { duration: 3500 });
      },
    });
  }

  private openForm(match?: AdminMatch): void {
    const open = (teams: AdminTeam[]) => {
      const data: MatchFormData = { teams, match };
      this.dialog.open(MatchFormComponent, { data, width: '560px', maxWidth: '95vw' })
        .afterClosed().subscribe((payload) => {
          if (!payload) return;
          if (match) {
            this.wrap(`Updated match #${match.id}`, this.api.adminUpdateMatch(match.id, payload));
          } else {
            this.wrap('Match created', this.api.adminCreateMatch(payload));
          }
        });
    };
    const cached = this.teams();
    if (cached.length) open(cached);
    else this.api.adminTeams().subscribe((t) => { this.teams.set(t); open(t); });
  }

  openCreate(): void { this.openForm(); }
  openEdit(m: AdminMatch): void { this.openForm(m); }

  deleteMatch(m: AdminMatch): void {
    const warn = m.entries > 0 ? ` ${m.entries} user team(s) will be removed too.` : '';
    if (!confirm(`Delete ${m.teamAShort} vs ${m.teamBShort}?${warn} Cannot be undone.`)) return;
    this.wrap(`Deleted ${m.teamAShort} vs ${m.teamBShort}`, this.api.adminDeleteMatch(m.id));
  }

  autoplay(m: AdminMatch, mode: AutoplayMode): void {
    this.busy.set(true);
    this.api.autoplay(m.id, mode).subscribe({
      next: (s) => {
        this.busy.set(false);
        const label = s.finished
          ? `${s.result}`
          : `${s.scoreline} · +${s.ballsPlayed} ball${s.ballsPlayed === 1 ? '' : 's'}`;
        this.snack.open(label, 'OK', { duration: 4000 });
        this.refresh();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Autoplay failed', 'Dismiss', { duration: 3500 });
      },
    });
  }

  syncMatch(m: AdminMatch): void {
    this.busy.set(true);
    this.api.syncMatch(m.id).subscribe({
      next: (r) => {
        this.busy.set(false);
        const bits: string[] = [];
        if (r.started) bits.push('LIVE');
        if (r.scored) bits.push('scores updated');
        if (r.completed) bits.push('completed');
        this.snack.open(
          bits.length
            ? `Synced ${m.teamAShort} vs ${m.teamBShort} — ${bits.join(', ')}`
            : `Synced ${m.teamAShort} vs ${m.teamBShort}`,
          'OK',
          { duration: 3500 },
        );
        this.refresh();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Match sync failed', 'Dismiss', { duration: 4000 });
      },
    });
  }

  startMatch(m: AdminMatch): void {
    if (!confirm(`Set ${m.teamAShort} vs ${m.teamBShort} to LIVE now?\n\nEntries lock and over-bets open.`)) return;
    this.wrap(`Started ${m.teamAShort} vs ${m.teamBShort}`, this.api.startMatch(m.id));
  }

  completeMatch(m: AdminMatch): void {
    if (!confirm(`Set ${m.teamAShort} vs ${m.teamBShort} to COMPLETED?\n\nOpen bets are voided/refunded; fantasy points lock.`)) return;
    this.wrap(`Completed ${m.teamAShort} vs ${m.teamBShort}`, this.api.completeMatch(m.id));
  }

  resetMatch(m: AdminMatch): void {
    if (!confirm(`RESET all live scoring for ${m.teamAShort} vs ${m.teamBShort}? Player stats, innings state and user team points will drop to 0. Cannot be undone.`)) return;
    this.wrap(`Reset ${m.teamAShort} vs ${m.teamBShort}`, this.api.adminResetMatch(m.id));
  }
}
