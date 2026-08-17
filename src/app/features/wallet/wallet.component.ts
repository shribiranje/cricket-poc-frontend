import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService, WalletTxPage, WalletTransaction } from '../../core/services/api.service';
import { WalletBalanceService } from '../../core/services/wallet-balance.service';

@Component({
  standalone: true,
  imports: [CommonModule, DatePipe, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="bc-panel bal-card">
      <div class="bc-panel-header"><span>Balance</span></div>
      <div class="body">
        <div class="balance">{{ page()?.balance ?? '—' }} <small>points</small></div>
        <p class="hint">Virtual points only — no real payment. Pick an amount to top up instantly.</p>
        <div class="row">
          @for (a of presets(); track a) {
            <button mat-raised-button color="primary"
                    [disabled]="busy()"
                    (click)="buy(a)">
              +{{ a }}
            </button>
          }
        </div>
      </div>
    </div>

    <div class="bc-panel" style="margin-top:16px;">
      <div class="bc-panel-header"><span>Transactions</span></div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance after</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            @for (t of txs(); track t.id) {
              <tr>
                <td>{{ t.createdAt | date:'short' }}</td>
                <td>{{ t.type }}</td>
                <td [class.ok]="t.amount > 0" [class.err]="t.amount < 0">
                  {{ t.amount > 0 ? '+' : '' }}{{ t.amount }}
                </td>
                <td>{{ t.balanceAfter }}</td>
                <td class="muted">{{ t.note || '' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="muted" style="padding:16px;">No transactions yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="row pager">
        <span class="muted">Page {{ pageNum() }} of {{ totalPages() }}</span>
        <span class="spacer"></span>
        <button mat-stroked-button (click)="prev()" [disabled]="pageNum() <= 1 || busy()">Prev</button>
        <button mat-stroked-button (click)="next()" [disabled]="pageNum() >= totalPages() || busy()">Next</button>
      </div>
    </div>
  `,
  styles: [`
    .body { padding: 16px 18px; }
    .balance { font-size: 36px; font-weight: 500; color: var(--bc-accent); }
    .balance small { font-size: 14px; color: var(--bc-muted); margin-left: 6px; }
    .hint { color: var(--bc-muted); font-size: 13px; margin: 8px 0 14px; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pager { padding: 12px 16px; }
    .spacer { flex: 1; }
    .muted { color: var(--bc-muted); font-size: 12px; }
    .ok { color: var(--bc-green); }
    .err { color: var(--bc-red); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th, .data-table td {
      text-align: left; padding: 8px 12px;
      border-bottom: 1px solid var(--bc-border); color: var(--bc-text);
    }
    .data-table th { color: var(--bc-muted); font-size: 11px; }
  `],
})
export class WalletComponent implements OnInit {
  private api = inject(ApiService);
  private walletBal = inject(WalletBalanceService);
  private snack = inject(MatSnackBar);

  page = signal<WalletTxPage | null>(null);
  txs = signal<WalletTransaction[]>([]);
  presets = signal<number[]>([100, 500, 1000, 2500, 5000]);
  pageNum = signal(1);
  busy = signal(false);
  private pageSize = 25;

  ngOnInit(): void { this.load(); }

  totalPages(): number {
    return Math.max(1, Math.ceil((this.page()?.total || 0) / this.pageSize));
  }

  load(): void {
    this.api.getWalletTransactions({
      limit: this.pageSize,
      offset: (this.pageNum() - 1) * this.pageSize,
    }).subscribe((p) => {
      this.page.set(p);
      this.txs.set(p.transactions);
      this.walletBal.setBalance(p.balance);
      if (p.buyPresets?.length) this.presets.set(p.buyPresets);
    });
  }

  buy(amount: number): void {
    if (!confirm(`Add ${amount} virtual points to your wallet? (No payment)`)) return;
    this.busy.set(true);
    this.api.buyPoints(amount).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.walletBal.setBalance(r.balance);
        this.snack.open(`+${r.purchased} points · balance ${r.balance}`, 'OK', { duration: 2500 });
        this.pageNum.set(1);
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || 'Purchase failed', 'Dismiss', { duration: 3500 });
      },
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
