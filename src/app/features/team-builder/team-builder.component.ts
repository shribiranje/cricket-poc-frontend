import { Component, inject, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../core/services/api.service';
import { Match, MatchPlayer, Role } from '../../core/models';
import { playerAvatar, teamColor } from '../../core/avatar';

const RULES = {
  teamSize: 11,
  creditBudget: 100,
  minBatsmen: 3,
  minBowlers: 3,
  minAllRounders: 1,
  minWicketKeepers: 1,
  maxPerRole: 8,
};

const ROLE_LABELS: Record<Role, string> = {
  WICKET_KEEPER: 'Wicket-keeper',
  BATSMAN: 'Batsmen',
  ALL_ROUNDER: 'All-rounders',
  BOWLER: 'Bowlers',
};

@Component({
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatTabsModule, MatProgressBarModule,
  ],
  template: `
    @if (match(); as m) {
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <div>
          <h2 style="margin:0; color:var(--bc-text); font-size:18px;">
            Build team — {{ m.teamA.short }} vs {{ m.teamB.short }}
          </h2>
          <div style="color:var(--bc-muted); font-size:12px;">{{ m.format }} · {{ m.venue }}</div>
        </div>
        <span class="status-chip status-{{ m.status }}">{{ m.status }}</span>
      </div>

      @if (m.status !== 'UPCOMING') {
        <div class="bc-panel" style="padding:16px 18px; margin-bottom:12px; border-color: rgba(255,138,138,.4);">
          <span style="color:var(--bc-red);">Match is {{ m.status }} — teams are locked.</span>
          <a href="javascript:void(0)" (click)="goLeaderboard()" style="color:var(--bc-accent); margin-left:8px;">View leaderboard →</a>
        </div>
      }

      <!-- ============ Pitch preview ============ -->
      <div class="pitch" style="margin-bottom: 12px;">
        @for (role of pitchOrder; track role) {
          <div class="pitch-row-label">{{ roleLabel(role).toUpperCase() }}</div>
          <div class="pitch-row">
            @for (p of selectedByRole()[role] || []; track p.id) {
              <div class="pitch-player"
                   [class.is-captain]="captainId() === p.id"
                   [class.is-vice-captain]="viceCaptainId() === p.id"
                   (click)="cycleCapVc(p.id)" style="cursor:pointer;"
                   [title]="'Tap to set captain / vice-captain'">
                @if (captainId() === p.id) { <span class="pp-tag c">C</span> }
                @if (viceCaptainId() === p.id) { <span class="pp-tag vc">VC</span> }
                <img [src]="avatar(p)" alt="" />
                <div class="pp-name">{{ shortName(p.name) }}</div>
                <div class="pp-sub">{{ p.credit }} cr</div>
              </div>
            }
            @for (s of emptySlots(role); track $index) {
              <div class="pitch-player"><div class="pitch-slot-empty">+</div></div>
            }
          </div>
        }
      </div>
      <div style="color: var(--bc-muted); font-size: 11px; margin: -6px 0 12px; text-align: center;">
        Tap a player on the pitch to cycle: Captain (2x) → Vice-captain (1.5x) → none
      </div>

      <!-- ============ Budget / validation bar ============ -->
      <div class="bc-panel" style="padding: 12px 16px; margin-bottom: 12px; position: sticky; top: 8px; z-index: 5;">
        <div style="display:flex; flex-wrap:wrap; gap:20px; align-items:center;">
          <div>
            <div style="color:var(--bc-muted); font-size:11px;">Players</div>
            <div style="color:var(--bc-text); font-size:18px; font-weight:500;">
              {{ selected().length }}<span style="font-size:12px; color:var(--bc-muted);">/{{ rules.teamSize }}</span>
            </div>
          </div>
          <div style="flex:1; min-width: 140px;">
            <div style="display:flex; justify-content:space-between; color:var(--bc-muted); font-size:11px; margin-bottom:4px;">
              <span>Credits</span>
              <span [style.color]="creditsUsed() > rules.creditBudget ? 'var(--bc-red)' : 'var(--bc-text)'">
                {{ creditsUsed() | number:'1.1-1' }}/{{ rules.creditBudget }}
              </span>
            </div>
            <div style="height:6px; background: var(--bc-panel-2); border-radius:3px; overflow:hidden;">
              <div [style.width.%]="(creditsUsed() / rules.creditBudget) * 100"
                   [style.background]="creditsUsed() > rules.creditBudget ? '#ff5252' : '#4fc3f7'"
                   style="height:100%; transition: width .2s;"></div>
            </div>
          </div>
          <button mat-raised-button color="primary" (click)="submit()"
                  [disabled]="!canSubmit() || submitting() || m.status !== 'UPCOMING'">
            {{ submitting() ? 'Saving…' : 'Save team' }}
          </button>
        </div>
        @if (issues().length) {
          <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">
            @for (msg of issues(); track msg) {
              <span style="background: rgba(255,138,138,.12); color: var(--bc-red); font-size:11px; padding:2px 10px; border-radius:10px;">{{ msg }}</span>
            }
          </div>
        }
      </div>

      <!-- ============ Player pool ============ -->
      <div class="bc-panel">
        <mat-tab-group>
          @for (role of pitchOrder; track role) {
            <mat-tab [label]="roleLabel(role) + ' (' + (roleCounts()[role] || 0) + ')'">
              <div style="padding: 12px;">
                <div class="pool-grid">
                  @for (p of playersByRole()[role] || []; track p.id) {
                    <div class="pool-card"
                         [class.selected]="isSelected(p.id)"
                         [class.disabled]="isDisabled(p)"
                         (click)="!isDisabled(p) && toggle(p)">
                      <img class="avatar" [src]="avatar(p)" alt="" width="38" height="38" />
                      <div style="flex:1; min-width:0;">
                        <div style="color:var(--bc-text); font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          {{ p.name }}
                        </div>
                        <div style="color:var(--bc-muted); font-size:11px;">
                          <span class="team-dot" [style.background]="tc(p.teamShort)"></span>
                          {{ p.teamShort }} · {{ p.credit }} cr
                        </div>
                      </div>
                      <mat-icon [style.color]="isSelected(p.id) ? 'var(--bc-accent)' : 'var(--bc-faint)'">
                        {{ isSelected(p.id) ? 'check_circle' : 'add_circle_outline' }}
                      </mat-icon>
                    </div>
                  }
                </div>
              </div>
            </mat-tab>
          }
        </mat-tab-group>
      </div>
    }
  `,
  styles: [`
    .pool-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
    .pool-card {
      display: flex; align-items: center; gap: 10px;
      background: var(--bc-panel-2);
      border: 1px solid var(--bc-border);
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .pool-card:hover { border-color: var(--bc-accent); }
    .pool-card.selected { border-color: var(--bc-accent); background: rgba(79,195,247,.08); }
    .pool-card.disabled { opacity: .4; cursor: not-allowed; }
    .team-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      vertical-align: baseline; margin-right: 2px;
    }
  `],
})
export class TeamBuilderComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  @Input() id!: string;

  match = signal<Match | null>(null);
  players = signal<MatchPlayer[]>([]);
  selected = signal<number[]>([]);
  captainId = signal<number | null>(null);
  viceCaptainId = signal<number | null>(null);
  submitting = signal(false);

  rules = RULES;
  pitchOrder: Role[] = ['WICKET_KEEPER', 'BATSMAN', 'ALL_ROUNDER', 'BOWLER'];

  playersByRole = computed(() => {
    const g: Record<string, MatchPlayer[]> = {};
    for (const p of this.players()) (g[p.role] ||= []).push(p);
    return g;
  });

  selectedPlayers = computed(() =>
    this.players().filter((p) => this.selected().includes(p.id))
  );

  selectedByRole = computed(() => {
    const g: Record<string, MatchPlayer[]> = {};
    for (const p of this.selectedPlayers()) (g[p.role] ||= []).push(p);
    return g;
  });

  creditsUsed = computed(() =>
    this.selectedPlayers().reduce((s, p) => s + Number(p.credit), 0)
  );

  roleCounts = computed(() => {
    const c: Record<Role, number> = { BATSMAN: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKET_KEEPER: 0 };
    for (const p of this.selectedPlayers()) c[p.role]++;
    return c;
  });

  issues = computed<string[]>(() => {
    const out: string[] = [];
    const sel = this.selected();
    if (sel.length !== RULES.teamSize) out.push(`${sel.length}/${RULES.teamSize} players`);
    if (this.creditsUsed() > RULES.creditBudget)
      out.push(`Over budget by ${(this.creditsUsed() - RULES.creditBudget).toFixed(1)}`);

    const c = this.roleCounts();
    if (c.BATSMAN < RULES.minBatsmen) out.push(`Need ≥ ${RULES.minBatsmen} BAT`);
    if (c.BOWLER < RULES.minBowlers) out.push(`Need ≥ ${RULES.minBowlers} BOWL`);
    if (c.ALL_ROUNDER < RULES.minAllRounders) out.push(`Need ≥ ${RULES.minAllRounders} AR`);
    if (c.WICKET_KEEPER < RULES.minWicketKeepers) out.push(`Need ≥ ${RULES.minWicketKeepers} WK`);

    if (sel.length === RULES.teamSize) {
      if (!this.captainId()) out.push('Tap a pitch player to set Captain');
      if (!this.viceCaptainId()) out.push('Set a Vice-captain');
      if (this.captainId() && this.captainId() === this.viceCaptainId())
        out.push('C and VC must differ');
    }
    return out;
  });

  canSubmit = computed(() => this.issues().length === 0);

  ngOnInit(): void {
    const matchId = Number(this.id);
    this.api.getMatch(matchId).subscribe((m) => this.match.set(m));
    this.api.getMatchPlayers(matchId).subscribe((ps) => this.players.set(ps));
    this.api.getMyTeam(matchId).subscribe((t) => {
      if (!t) return;
      this.selected.set(t.players.map((p) => p.id));
      this.captainId.set(t.captainId);
      this.viceCaptainId.set(t.viceCaptainId);
    });
  }

  isSelected(pid: number): boolean { return this.selected().includes(pid); }

  isDisabled(p: MatchPlayer): boolean {
    if (this.isSelected(p.id)) return false;
    if (this.selected().length >= RULES.teamSize) return true;
    if ((this.roleCounts()[p.role] || 0) >= RULES.maxPerRole) return true;
    return false;
  }

  toggle(p: MatchPlayer): void {
    const cur = new Set(this.selected());
    if (cur.has(p.id)) {
      cur.delete(p.id);
      if (this.captainId() === p.id) this.captainId.set(null);
      if (this.viceCaptainId() === p.id) this.viceCaptainId.set(null);
    } else {
      cur.add(p.id);
    }
    this.selected.set(Array.from(cur));
  }

  /** Tap a pitch player: none → C → VC → none */
  cycleCapVc(pid: number): void {
    if (this.captainId() === pid) {
      this.captainId.set(null);
      if (this.viceCaptainId() !== pid) this.viceCaptainId.set(pid);
    } else if (this.viceCaptainId() === pid) {
      this.viceCaptainId.set(null);
    } else {
      if (this.captainId() === null) this.captainId.set(pid);
      else if (this.viceCaptainId() === null) this.viceCaptainId.set(pid);
      else this.captainId.set(pid); // both taken: replace captain
    }
  }

  /** Empty pitch slots per role, based on remaining minimums */
  emptySlots(role: Role): number[] {
    const mins: Record<Role, number> = {
      BATSMAN: RULES.minBatsmen,
      BOWLER: RULES.minBowlers,
      ALL_ROUNDER: RULES.minAllRounders,
      WICKET_KEEPER: RULES.minWicketKeepers,
    };
    const have = (this.selectedByRole()[role] || []).length;
    const want = Math.max(mins[role] - have, 0);
    return Array(want).fill(0);
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.api.submitTeam(Number(this.id), {
      playerIds: this.selected(),
      captainId: this.captainId()!,
      viceCaptainId: this.viceCaptainId()!,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snack.open('Team saved', 'OK', { duration: 2500 });
        this.router.navigate(['/matches', this.id]);
      },
      error: (e) => {
        this.submitting.set(false);
        this.snack.open(e?.error?.error?.message || 'Could not save team', 'Dismiss', { duration: 4000 });
      },
    });
  }

  avatar(p: MatchPlayer): string { return playerAvatar(p.name, p.teamShort); }
  tc(short: string): string { return teamColor(short); }
  roleLabel(r: Role): string { return ROLE_LABELS[r]; }

  shortName(full: string): string {
    const parts = full.split(' ');
    if (parts.length === 1) return full;
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
  }

  goLeaderboard(): void { this.router.navigate(['/matches', this.id, 'leaderboard']); }
}
