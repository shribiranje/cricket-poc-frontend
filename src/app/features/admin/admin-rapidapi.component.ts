import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  ApiService, RapidApiPollStatus, RapidApiAnalytics, RapidApiCallLog, RapidApiSettings,
} from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule,
    MatButtonModule, MatIconModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
  ],
  template: `
    <div class="danger-banner" role="alert">
      <mat-icon>warning</mat-icon>
      <div>
        <strong>Developer only — update with caution</strong>
        <p>
          Sync settings, fixture import, and auto-poll hit RapidAPI and can wipe match data
          or burn through your API quota. Change these only if you know what you’re doing.
        </p>
      </div>
    </div>

    <div class="bc-panel">
      <div class="bc-panel-header"><span>RapidAPI</span></div>
      <div class="body">
        <div class="row" style="margin-bottom:14px;">
          <button mat-raised-button color="accent" (click)="syncFixtures()" [disabled]="busy()"
                  [title]="'Clean import · limit ' + syncLimit()">
            <mat-icon>cloud_download</mat-icon>
            Sync matches (clean · limit {{ syncLimit() }})
          </button>
          <button mat-stroked-button color="accent" (click)="syncLiveStatus()" [disabled]="busy()"
                  title="Update LIVE/COMPLETED, scores, settle over-bets">
            <mat-icon>sync</mat-icon> Sync live status
          </button>
          <span class="hint inline">
            Fixture import wipes match data then pulls live + upcoming (top {{ syncLimit() }}).
          </span>
        </div>

        <mat-divider></mat-divider>

        <div class="row" style="margin:14px 0 10px;">
          <strong class="label">Auto-poll</strong>
          <button mat-stroked-button [disabled]="busy() || pollActive()" (click)="startPoll(15)">15 min</button>
          <button mat-stroked-button [disabled]="busy() || pollActive()" (click)="startPoll(60)">1 hour</button>
          <button mat-stroked-button [disabled]="busy() || pollActive()" (click)="startPoll(120)">2 hours</button>
          <button mat-button color="warn" [disabled]="busy() || !pollActive()" (click)="stopPoll()">
            <mat-icon>stop</mat-icon> Stop
          </button>
          @if (pollStatus(); as ps) {
            @if (ps.active && ps.session) {
              <span class="poll-live">
                <mat-icon class="timer-icon">timer</mat-icon>
                {{ formatRemaining(remainingDisplay()) }} left
                · {{ ps.session.apiCalls }} API call{{ ps.session.apiCalls === 1 ? '' : 's' }}
                · every {{ formatPollMs(ps.pollLiveMs) }}
              </span>
            } @else {
              <span class="hint inline">Off — enable only while matches are LIVE</span>
            }
          }
        </div>

        @if (pollStatus()?.recent?.length) {
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>API calls</th>
                  <th>Started</th>
                  <th>Ended</th>
                </tr>
              </thead>
              <tbody>
                @for (s of pollStatus()!.recent; track s.id) {
                  <tr [class.active-row]="s.status === 'ACTIVE'">
                    <td>{{ s.id }}</td>
                    <td>{{ s.durationMinutes }}m</td>
                    <td>{{ s.status }}</td>
                    <td><strong>{{ s.apiCalls }}</strong></td>
                    <td>{{ s.startedAt | date:'short' }}</td>
                    <td>{{ (s.stoppedAt || s.endsAt) | date:'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <div class="bc-panel" style="margin-top:16px;">
      <div class="bc-panel-header"><span>Sync settings</span></div>
      <div class="body">
        @if (settings(); as s) {
          <div class="settings-grid">
            <div class="setting-block">
              <strong class="label">Poll interval</strong>
              <div class="row" style="margin-top:8px;">
                @for (ms of s.allowedPollLiveMs; track ms) {
                  <button mat-stroked-button
                          [class.active-opt]="draftPollMs() === ms"
                          [disabled]="busy()"
                          (click)="draftPollMs.set(ms)">
                    {{ formatPollMs(ms) }}
                  </button>
                }
              </div>
              <span class="hint">How often LIVE matches are polled while auto-poll is on.</span>
            </div>

            <div class="setting-block">
              <strong class="label">Min gap between API calls</strong>
              <mat-form-field appearance="outline" class="num-field" subscriptSizing="dynamic">
                <input matInput type="number" min="0" max="30000" step="100"
                       [ngModel]="draftMinGap()" (ngModelChange)="draftMinGap.set(+$event || 0)" />
                <span matTextSuffix>ms</span>
              </mat-form-field>
              <span class="hint">Pacing between RapidAPI HTTP hits (0–30000). Helps avoid 429s.</span>
            </div>

            <div class="setting-block">
              <strong class="label">Scorecard every N ticks</strong>
              <mat-form-field appearance="outline" class="num-field" subscriptSizing="dynamic">
                <input matInput type="number" min="1" max="20"
                       [ngModel]="draftScorecardN()" (ngModelChange)="draftScorecardN.set(+$event || 1)" />
              </mat-form-field>
              <span class="hint">1 = every tick (more calls). 4 = default (lighter).</span>
            </div>

            <div class="setting-block">
              <strong class="label">Fixture sync limit</strong>
              <mat-form-field appearance="outline" class="num-field" subscriptSizing="dynamic">
                <input matInput type="number" min="1" max="50"
                       [ngModel]="draftSyncLimit()" (ngModelChange)="draftSyncLimit.set(+$event || 1)" />
              </mat-form-field>
              <span class="hint">Max fixtures imported by “Sync matches”.</span>
            </div>
          </div>

          <div class="row" style="margin-top:14px;">
            <button mat-raised-button color="primary" (click)="saveSettings()"
                    [disabled]="busy() || !settingsDirty()">
              <mat-icon>save</mat-icon> Save settings
            </button>
            @if (settingsDirty()) {
              <span class="hint inline">Unsaved changes</span>
            } @else {
              <span class="hint inline">Saved · applies immediately (restarts active poller if running)</span>
            }
          </div>
        } @else {
          <span class="hint">Loading settings…</span>
        }
      </div>
    </div>

    <div class="bc-panel" style="margin-top:16px;">
      <div class="bc-panel-header">
        <span>API call analytics</span>
        <button mat-icon-button (click)="refreshAnalytics()" title="Refresh log" [disabled]="busy()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
      <div class="body">
        @if (analytics(); as a) {
          <div class="grid stats">
            <div class="stat">
              <div class="stat-num">{{ a.summary.totalCalls }}</div>
              <div class="stat-label">Total calls</div>
            </div>
            <div class="stat">
              <div class="stat-num accent">{{ a.summary.callsToday }}</div>
              <div class="stat-label">Today</div>
            </div>
            <div class="stat">
              <div class="stat-num">{{ a.summary.calls24h }}</div>
              <div class="stat-label">Last 24h</div>
            </div>
            <div class="stat">
              <div class="stat-num ok">{{ a.summary.okCalls }}</div>
              <div class="stat-label">OK</div>
            </div>
            <div class="stat">
              <div class="stat-num err">{{ a.summary.errorCalls }}</div>
              <div class="stat-label">Errors</div>
            </div>
            <div class="stat">
              <div class="stat-num">{{ a.summary.avgDurationMs }}ms</div>
              <div class="stat-label">Avg duration</div>
            </div>
          </div>

          @if (a.summary.byKind.length) {
            <div class="kind-row">
              @for (k of a.summary.byKind; track k.kind) {
                <span class="kind-chip">{{ k.kind }} · {{ k.count }}</span>
              }
            </div>
          }

          <div style="overflow-x:auto; margin-top:12px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>ms</th>
                  <th>Session</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                @for (c of calls(); track c.id) {
                  <tr [class.err-row]="!c.ok">
                    <td>{{ c.id }}</td>
                    <td>{{ c.createdAt | date:'short' }}</td>
                    <td>{{ c.endpointKind }}</td>
                    <td class="path">{{ c.path }}</td>
                    <td>
                      <span [class.ok]="c.ok" [class.err]="!c.ok">
                        {{ c.httpStatus ?? '—' }}
                      </span>
                    </td>
                    <td>{{ c.durationMs }}</td>
                    <td>{{ c.sessionId ?? '—' }}</td>
                    <td class="err-msg">{{ c.errorMessage || '' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="hint" style="padding:16px;">
                      No RapidAPI calls logged yet. Sync or start auto-poll to generate traffic.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="row pager" style="margin-top:12px;">
            <span class="hint inline">
              {{ a.total === 0 ? 'No rows' : ('Page ' + page() + ' of ' + totalPages() + ' · ' + a.total + ' calls') }}
            </span>
            <span class="spacer"></span>
            <button mat-stroked-button (click)="prevPage()" [disabled]="busy() || page() <= 1">
              <mat-icon>chevron_left</mat-icon> Prev
            </button>
            <button mat-stroked-button (click)="nextPage()" [disabled]="busy() || page() >= totalPages()">
              Next <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        } @else {
          <span class="hint">Loading analytics…</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .danger-banner {
      display: flex; gap: 12px; align-items: flex-start;
      margin-bottom: 16px; padding: 12px 14px;
      border: 1px solid var(--bc-red);
      border-radius: 8px;
      background: rgba(255, 82, 82, 0.12);
      color: var(--bc-text);
    }
    .danger-banner mat-icon {
      color: var(--bc-red); flex-shrink: 0; margin-top: 1px;
    }
    .danger-banner strong {
      display: block; color: var(--bc-red); font-size: 13px; margin-bottom: 2px;
    }
    .danger-banner p {
      margin: 0; font-size: 12px; line-height: 1.45; color: var(--bc-muted);
    }
    .body { padding: 14px 18px 18px; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .pager .spacer { flex: 1 1 auto; }
    .label { color: var(--bc-text); margin-right: 4px; }
    .hint { font-size: 12px; color: var(--bc-muted); display: block; margin-top: 6px; }
    .hint.inline { display: inline; margin-top: 0; }
    .poll-live {
      font-size: 13px; font-weight: 500; color: #06263a;
      background: var(--bc-accent); padding: 4px 10px; border-radius: 4px;
    }
    .timer-icon { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .setting-block .hint { margin-top: 8px; }
    .num-field { width: 140px; margin-top: 8px; }
    .active-opt {
      background: rgba(79,195,247,.18) !important;
      border-color: var(--bc-accent) !important;
      color: var(--bc-accent) !important;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 10px;
      margin-bottom: 10px;
    }
    .stat {
      background: var(--bc-panel-2);
      border: 1px solid var(--bc-border);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .stat-num { font-size: 22px; font-weight: 500; color: var(--bc-text); line-height: 1.1; }
    .stat-num.accent { color: var(--bc-accent); }
    .stat-num.ok { color: var(--bc-green); }
    .stat-num.err { color: var(--bc-red); }
    .stat-label { font-size: 11px; color: var(--bc-muted); margin-top: 4px; }
    .kind-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
    .kind-chip {
      font-size: 11px; color: var(--bc-accent);
      background: rgba(79,195,247,.12);
      border: 1px solid var(--bc-border);
      border-radius: 999px; padding: 2px 10px;
    }
    .data-table {
      width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px;
    }
    .data-table th, .data-table td {
      text-align: left; padding: 6px 8px;
      border-bottom: 1px solid var(--bc-border);
      color: var(--bc-text);
      vertical-align: top;
    }
    .data-table th { color: var(--bc-muted); font-weight: 500; }
    .data-table .active-row { background: rgba(79,195,247,.08); }
    .data-table .err-row { background: rgba(255,138,138,.06); }
    .path { font-family: ui-monospace, monospace; font-size: 11px; max-width: 280px; word-break: break-all; }
    .err-msg { color: var(--bc-red); max-width: 200px; word-break: break-word; }
    .ok { color: var(--bc-green); }
    .err { color: var(--bc-red); }
    :host ::ng-deep mat-divider { border-top-color: var(--bc-border); }
  `],
})
export class AdminRapidApiComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  busy = signal(false);
  pollStatus = signal<RapidApiPollStatus | null>(null);
  remainingDisplay = signal(0);
  analytics = signal<RapidApiAnalytics | null>(null);
  calls = signal<RapidApiCallLog[]>([]);
  page = signal(1);
  settings = signal<RapidApiSettings | null>(null);
  draftPollMs = signal(120000);
  draftMinGap = signal(2500);
  draftScorecardN = signal(4);
  draftSyncLimit = signal(10);

  private readonly pageSize = 50;
  private pollUiTimer: ReturnType<typeof setInterval> | null = null;
  private pollFetchTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refreshPollStatus();
    this.refreshSettings();
    this.refreshAnalytics();
    this.pollUiTimer = setInterval(() => this.tickCountdown(), 1000);
    this.pollFetchTimer = setInterval(() => {
      this.refreshPollStatus();
      this.refreshAnalytics();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.pollUiTimer) clearInterval(this.pollUiTimer);
    if (this.pollFetchTimer) clearInterval(this.pollFetchTimer);
  }

  pollActive(): boolean { return !!this.pollStatus()?.active; }

  syncLimit(): number {
    return this.settings()?.syncFixtureLimit ?? this.draftSyncLimit() ?? 20;
  }

  settingsDirty(): boolean {
    const s = this.settings();
    if (!s) return false;
    return this.draftPollMs() !== s.pollLiveMs
      || this.draftMinGap() !== s.minGapMs
      || this.draftScorecardN() !== s.scorecardEveryN
      || this.draftSyncLimit() !== s.syncFixtureLimit;
  }

  formatPollMs(ms: number): string {
    const m = Math.round(ms / 60000);
    if (m >= 1 && ms % 60000 === 0) return `${m} min`;
    return `${ms} ms`;
  }

  totalPages(): number {
    const total = this.analytics()?.total || 0;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  private tickCountdown(): void {
    const s = this.pollStatus()?.session;
    if (!s || s.status !== 'ACTIVE') {
      this.remainingDisplay.set(0);
      return;
    }
    const rem = Math.max(0, Math.floor((new Date(s.endsAt).getTime() - Date.now()) / 1000));
    this.remainingDisplay.set(rem);
    if (rem <= 0 && this.pollStatus()?.active) this.refreshPollStatus();
  }

  formatRemaining(totalSec: number): string {
    const s = Math.max(0, totalSec | 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  }

  refreshSettings(): void {
    this.api.getRapidApiSettings().subscribe({
      next: (s) => this.applySettings(s),
      error: () => { /* migration may not be applied yet */ },
    });
  }

  private applySettings(s: RapidApiSettings): void {
    this.settings.set(s);
    this.draftPollMs.set(s.pollLiveMs);
    this.draftMinGap.set(s.minGapMs);
    this.draftScorecardN.set(s.scorecardEveryN);
    this.draftSyncLimit.set(s.syncFixtureLimit);
  }

  saveSettings(): void {
    this.busy.set(true);
    this.api.updateRapidApiSettings({
      pollLiveMs: this.draftPollMs(),
      minGapMs: this.draftMinGap(),
      scorecardEveryN: this.draftScorecardN(),
      syncFixtureLimit: this.draftSyncLimit(),
    }).subscribe({
      next: (s) => {
        this.busy.set(false);
        this.applySettings(s);
        this.refreshPollStatus();
        this.snack.open('Sync settings saved', 'OK', { duration: 2200 });
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Save failed', 'Dismiss', { duration: 4000 });
      },
    });
  }

  refreshPollStatus(): void {
    this.api.getRapidApiPollStatus().subscribe({
      next: (s) => {
        this.pollStatus.set(s);
        if (s.session?.status === 'ACTIVE') {
          this.remainingDisplay.set(
            Math.max(0, Math.floor((new Date(s.session.endsAt).getTime() - Date.now()) / 1000)),
          );
        } else {
          this.remainingDisplay.set(0);
        }
      },
      error: () => { /* DATA_SOURCE may not be RAPIDAPI */ },
    });
  }

  refreshAnalytics(): void {
    const page = this.page();
    const offset = (page - 1) * this.pageSize;
    this.api.getRapidApiAnalytics({ limit: this.pageSize, offset }).subscribe({
      next: (a) => {
        this.analytics.set(a);
        this.calls.set(a.calls);
        const maxPage = Math.max(1, Math.ceil((a.total || 0) / this.pageSize));
        if (this.page() > maxPage) {
          this.page.set(maxPage);
          if (maxPage !== page) this.refreshAnalytics();
        }
      },
      error: () => { /* table may not exist yet */ },
    });
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.refreshAnalytics();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.refreshAnalytics();
  }

  private afterMutation(): void {
    this.page.set(1);
    this.refreshPollStatus();
    this.refreshAnalytics();
  }

  syncFixtures(): void {
    const limit = this.syncLimit();
    if (!confirm(
      'Import RapidAPI fixtures?\n\n'
      + `This CLEARS all matches / entries / predictions, then imports up to ${limit} fixtures `
      + `(same as: npm run rapidapi:sync -- --clean --limit ${limit}).`
    )) return;
    this.busy.set(true);
    this.api.syncRapidApiFixtures({ clean: true, limit }).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.snack.open(
          `Imported ${r.imported} fixtures`
          + (r.cleaned ? ' (cleaned)' : '')
          + ` · live feed ${r.liveFeed}`,
          'OK',
          { duration: 5000 },
        );
        this.afterMutation();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Fixture sync failed', 'Dismiss', { duration: 4000 });
        this.refreshAnalytics();
      },
    });
  }

  syncLiveStatus(): void {
    this.busy.set(true);
    this.api.syncRapidApiStatuses().subscribe({
      next: (s) => {
        this.busy.set(false);
        const parts = [
          `Checked ${s.checked}`,
          `${s.started.length} → LIVE`,
          `${s.scored?.length || 0} scored`,
          `${s.completed.length} → COMPLETED`,
          `live feed ${s.liveFeed}`,
        ];
        if (s.errors?.length) parts.push(`${s.errors.length} error(s)`);
        this.snack.open(parts.join(' · '), 'OK', { duration: 5500 });
        this.afterMutation();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Sync failed', 'Dismiss', { duration: 4000 });
        this.refreshAnalytics();
      },
    });
  }

  startPoll(mins: 15 | 60 | 120): void {
    const label = mins === 15 ? '15 minutes' : mins === 60 ? '1 hour' : '2 hours';
    const interval = this.formatPollMs(this.settings()?.pollLiveMs ?? this.pollStatus()?.pollLiveMs ?? 120000);
    if (!confirm(`Enable RapidAPI auto-poll for ${label}?\n\nPolls LIVE matches every ${interval}.`)) return;
    this.busy.set(true);
    this.api.startRapidApiPoll(mins).subscribe({
      next: (s) => {
        this.busy.set(false);
        this.pollStatus.set(s);
        this.snack.open(`Auto-poll on for ${label}`, 'OK', { duration: 2500 });
        this.refreshAnalytics();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Failed to start poll', 'Dismiss', { duration: 4000 });
      },
    });
  }

  stopPoll(): void {
    this.busy.set(true);
    this.api.stopRapidApiPoll().subscribe({
      next: (s) => {
        this.busy.set(false);
        this.pollStatus.set(s);
        const calls = s.recent?.[0]?.apiCalls ?? 0;
        this.snack.open(`Auto-poll stopped · ${calls} API call(s) this session`, 'OK', { duration: 3500 });
        this.refreshAnalytics();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Failed to stop poll', 'Dismiss', { duration: 4000 });
      },
    });
  }
}
