import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

/**
 * Shared prediction-wallet balance for shell header + sidebar.
 * Call setBalance() after buy/place, or refresh() to re-fetch.
 */
@Injectable({ providedIn: 'root' })
export class WalletBalanceService {
  private api = inject(ApiService);

  readonly balance = signal<number | null>(null);
  private inflight = false;

  setBalance(n: number): void {
    this.balance.set(n);
  }

  refresh(): void {
    if (this.inflight) return;
    this.inflight = true;
    this.api.getPredictionWallet().subscribe({
      next: (w) => {
        this.inflight = false;
        this.balance.set(w.balance);
      },
      error: () => { this.inflight = false; },
    });
  }
}
