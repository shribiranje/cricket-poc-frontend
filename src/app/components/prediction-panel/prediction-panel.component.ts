import { Component, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  MatchProgress,
  MyPrediction,
  PredictionWallet,
} from '../../core/services/api.service';
import { WalletBalanceService } from '../../core/services/wallet-balance.service';

/**
 * Live-match over bets (free-to-play points).
 * Mount when match.status === 'LIVE':
 *   <app-prediction-panel [matchId]="m.id" [live]="true" />
 */
const OVER_OUTCOMES = [
  { key: 'RUNS_0_3', label: '0–3 runs' },
  { key: 'RUNS_4_7', label: '4–7 runs' },
  { key: 'RUNS_8_11', label: '8–11 runs' },
  { key: 'RUNS_12_PLUS', label: '12+ runs' },
  { key: 'WICKET_IN_OVER', label: 'Wicket falls' },
];

@Component({
  selector: 'app-prediction-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <section class="pp" id="bet-next-over" *ngIf="live; else notLive">
    <header class="pp__head">
      <div>
        <span class="pp__eyebrow">Bet the next over</span>
        <h3 class="pp__title" *ngIf="progress && !progress.finished">
          Over {{ targetOver + 1 }} · {{ progress.innings === 1 ? '1st' : '2nd' }} innings
        </h3>
        <h3 class="pp__title" *ngIf="progress?.finished">Match finished — no open overs</h3>
      </div>
      <div class="pp__wallet" title="Prediction points — free to play">
        {{ balance ?? '—' }} <small>pts</small>
      </div>
    </header>

    <p class="pp__hint">
      Lock a call before the over starts. Settlements update automatically as the over completes.
    </p>

    <div class="pp__grid" *ngIf="progress && !progress.finished">
      <button *ngFor="let o of outcomes"
              type="button"
              class="pp__pick" [class.on]="picked === o.key"
              (click)="picked = o.key">
        {{ o.label }}
        <small>×{{ multipliers?.[o.key] || '–' }}</small>
      </button>
    </div>

    <div class="pp__stake" *ngIf="progress && !progress.finished">
      <label>Stake
        <input type="number" [(ngModel)]="stake"
               [min]="minStake" [max]="maxStake" step="10">
      </label>
      <button type="button" class="pp__go" [disabled]="!picked || busy" (click)="place()">
        {{ busy ? 'Placing…' : 'Lock it in' }}
      </button>
    </div>
    <p class="pp__msg" *ngIf="message" [class.err]="isError">{{ message }}</p>

    <div class="pp__mine" *ngIf="mine.length">
      <h4>Your calls</h4>
      <div class="pp__row" *ngFor="let p of mine">
        <span class="pp__tgt">
          {{ p.innings }}inn · over {{ p.over_number + 1 }}
        </span>
        <span>{{ label(p.predicted) }}</span>
        <span class="pp__st pp__st--{{ p.status | lowercase }}">
          {{ p.status === 'WON' ? '+' + p.payout : p.status === 'OPEN' ? p.stake + ' at risk' : p.status }}
        </span>
      </div>
    </div>
  </section>
  <ng-template #notLive>
    <section class="pp pp--idle">Over bets open when the match goes live.</section>
  </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .pp {
      background: var(--bc-panel, #14181f);
      border: 1px solid var(--bc-border, #232a34);
      border-radius: 12px;
      padding: 16px 18px;
      color: var(--bc-text, #e8edf4);
      font-family: inherit;
    }
    .pp--idle { text-align: center; color: var(--bc-muted, #8b96a5); }
    .pp__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .pp__eyebrow {
      font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
      color: var(--bc-accent, #4fc3f7);
    }
    .pp__title { margin: 4px 0 0; font-size: 17px; font-weight: 600; color: var(--bc-text, #e8edf4); }
    .pp__wallet {
      font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 700;
      color: var(--bc-accent, #4fc3f7); white-space: nowrap;
    }
    .pp__wallet small { font-size: 11px; color: var(--bc-muted, #8b96a5); font-weight: 500; }
    .pp__hint {
      margin: 10px 0 12px; font-size: 12px; color: var(--bc-muted, #8b96a5); line-height: 1.4;
    }
    .pp__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
    .pp__pick {
      display: flex; flex-direction: column; gap: 2px; align-items: center;
      padding: 10px 6px; border-radius: 8px; cursor: pointer;
      background: var(--bc-panel-2, #1b212b); border: 1px solid var(--bc-border, #232a34);
      color: var(--bc-text, #e8edf4); font-weight: 600; font-size: 13px; font-family: inherit;
    }
    .pp__pick small { color: var(--bc-muted, #8b96a5); font-weight: 500; }
    .pp__pick.on {
      border-color: var(--bc-accent, #4fc3f7);
      box-shadow: 0 0 0 1px var(--bc-accent, #4fc3f7) inset;
    }
    .pp__pick:focus-visible, .pp__go:focus-visible {
      outline: 2px solid var(--bc-accent, #4fc3f7); outline-offset: 2px;
    }
    .pp__stake { display: flex; gap: 10px; align-items: end; margin-top: 12px; }
    .pp__stake label { font-size: 12px; color: var(--bc-muted, #8b96a5); display: grid; gap: 4px; }
    .pp__stake input {
      width: 90px; padding: 8px; border-radius: 8px;
      background: var(--bc-panel-2, #1b212b); border: 1px solid var(--bc-border, #232a34);
      color: var(--bc-text, #e8edf4); font-variant-numeric: tabular-nums; font-family: inherit;
    }
    .pp__go {
      flex: 1; padding: 10px 0; border: 0; border-radius: 8px; cursor: pointer;
      background: var(--bc-accent, #4fc3f7); color: #06263a; font-weight: 700; font-family: inherit;
    }
    .pp__go:disabled { opacity: .45; cursor: not-allowed; }
    .pp__msg { margin: 8px 0 0; font-size: 13px; color: var(--bc-green, #35d07f); }
    .pp__msg.err { color: var(--bc-red, #ff6b6b); }
    .pp__mine { margin-top: 14px; border-top: 1px solid var(--bc-border, #232a34); padding-top: 10px; }
    .pp__mine h4 {
      margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .1em;
      color: var(--bc-muted, #8b96a5);
    }
    .pp__row {
      display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 3px 0;
    }
    .pp__tgt { color: var(--bc-muted, #8b96a5); font-variant-numeric: tabular-nums; }
    .pp__st--won { color: var(--bc-green, #35d07f); font-weight: 700; }
    .pp__st--lost { color: var(--bc-red, #ff6b6b); }
    .pp__st--open { color: var(--bc-gold, #ffc75f); }
    .pp__st--void { color: var(--bc-muted, #8b96a5); }
  `],
})
export class PredictionPanelComponent implements OnInit, OnDestroy {
  @Input({ required: true }) matchId!: number;
  @Input() live = false;

  private api = inject(ApiService);
  private walletBal = inject(WalletBalanceService);
  private host = inject(ElementRef<HTMLElement>);
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  readonly outcomes = OVER_OUTCOMES;
  picked: string | null = null;
  stake = 10;
  balance: number | null = null;
  minStake = 10;
  maxStake = 100;
  multipliers: Record<string, number> | null = null;
  progress: MatchProgress | null = null;
  mine: MyPrediction[] = [];
  busy = false;
  message = '';
  isError = false;

  /** Next over that has not started yet (0-indexed, matches backend). */
  get targetOver(): number {
    if (!this.progress) return 0;
    return Math.ceil(this.progress.ballsBowled / 6);
  }

  ngOnInit() {
    this.refresh();
    this.pollHandle = setInterval(() => this.refresh(), 10_000);
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  /** Scroll this panel into view (used by match-detail CTA). */
  focusPanel() {
    this.host.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  label(key: string) {
    return OVER_OUTCOMES.find((o) => o.key === key)?.label ?? key;
  }

  refresh() {
    this.api.getPredictionWallet().subscribe({
      next: (w: PredictionWallet) => {
        this.balance = w.balance;
        this.walletBal.setBalance(w.balance);
        this.minStake = w.limits?.minStake ?? 10;
        this.maxStake = w.limits?.maxStake ?? 100;
        this.multipliers = w.multipliers?.OVER ?? null;
        if (this.stake < this.minStake) this.stake = this.minStake;
      },
      error: () => { /* keep last known balance */ },
    });
    if (!this.live) return;
    this.api.getMatchProgress(this.matchId).subscribe({
      next: (p) => { this.progress = p; },
      error: () => { this.progress = { innings: 1, ballsBowled: 0, finished: false }; },
    });
    this.api.getMyPredictions(this.matchId).subscribe({
      next: (m) => { this.mine = m; },
      error: () => { this.mine = []; },
    });
  }

  place() {
    if (!this.picked || !this.progress || this.progress.finished) return;
    this.busy = true;
    this.message = '';
    this.api.placePrediction(this.matchId, {
      scope: 'OVER',
      innings: this.progress.innings,
      over_number: this.targetOver,
      ball_number: null,
      predicted: this.picked,
      stake: this.stake,
    }).subscribe({
      next: (r) => {
        this.balance = r.balance;
        this.walletBal.setBalance(r.balance);
        this.busy = false;
        this.isError = false;
        this.message = 'Locked in. Good luck!';
        this.picked = null;
        this.refresh();
      },
      error: (e) => {
        this.busy = false;
        this.isError = true;
        this.message = e?.error?.error?.message || e?.error?.message || 'Could not place prediction';
      },
    });
  }
}
