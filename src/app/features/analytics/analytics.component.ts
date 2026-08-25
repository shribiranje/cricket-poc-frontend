import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, UserPredictionAnalytics } from '../../core/services/api.service';
import { PieChartComponent, BarChartComponent } from '../../components/charts/charts.component';

@Component({
  standalone: true,
  imports: [CommonModule, PieChartComponent, BarChartComponent],
  template: `
    @if (data(); as d) {
      <div class="grid stats">
        <div class="bc-panel stat">
          <div class="num">{{ d.summary.totalBets }}</div>
          <div class="lab">Total bets</div>
        </div>
        <div class="bc-panel stat">
          <div class="num accent">{{ d.summary.winRate }}%</div>
          <div class="lab">Win rate</div>
        </div>
        <div class="bc-panel stat">
          <div class="num" [class.ok]="d.summary.netPoints >= 0" [class.err]="d.summary.netPoints < 0">
            {{ d.summary.netPoints > 0 ? '+' : '' }}{{ d.summary.netPoints }}
          </div>
          <div class="lab">Net points</div>
        </div>
        <div class="bc-panel stat">
          <div class="num">{{ d.summary.totalStaked }}</div>
          <div class="lab">Total staked</div>
        </div>
        <div class="bc-panel stat">
          <div class="num ok">{{ d.summary.wins }}</div>
          <div class="lab">Wins</div>
        </div>
        <div class="bc-panel stat">
          <div class="num err">{{ d.summary.losses }}</div>
          <div class="lab">Losses</div>
        </div>
      </div>

      <div class="charts">
        <div class="bc-panel">
          <div class="bc-panel-header"><span>Results breakdown</span></div>
          <div class="pad">
            <app-pie-chart [slices]="d.pieByStatus" />
          </div>
        </div>
        <div class="bc-panel">
          <div class="bc-panel-header"><span>Ball vs over</span></div>
          <div class="pad">
            <app-pie-chart [slices]="d.pieByScope" />
          </div>
        </div>
        <div class="bc-panel">
          <div class="bc-panel-header"><span>What you call most</span></div>
          <div class="pad">
            <app-pie-chart [slices]="d.pieByPrediction" />
          </div>
        </div>
      </div>

      <div class="bc-panel" style="margin-top:16px;">
        <div class="bc-panel-header"><span>Last 14 days — bets & net shri</span></div>
        <div class="pad">
          <div class="dual">
            <div>
              <div class="sub">Bets placed</div>
              <app-bar-chart [points]="betBars()" />
            </div>
            <div>
              <div class="sub">Net points</div>
              <app-bar-chart [points]="netBars()" />
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="muted">Loading analytics…</div>
    }
  `,
  styles: [`
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px; margin-bottom: 16px;
    }
    .stat { padding: 14px 16px; }
    .num { font-size: 26px; font-weight: 500; color: var(--bc-text); }
    .num.accent { color: var(--bc-accent); }
    .ok { color: var(--bc-green) !important; }
    .err { color: var(--bc-red) !important; }
    .lab { font-size: 12px; color: var(--bc-muted); margin-top: 4px; }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .pad { padding: 14px 16px 18px; }
    .dual {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
    }
    .sub { font-size: 12px; color: var(--bc-muted); margin-bottom: 8px; }
    .muted { color: var(--bc-muted); padding: 16px; }
  `],
})
export class AnalyticsComponent implements OnInit {
  private api = inject(ApiService);
  data = signal<UserPredictionAnalytics | null>(null);

  ngOnInit(): void {
    this.api.getPredictionAnalytics().subscribe((d) => this.data.set(d));
  }

  betBars(): { label: string; value: number }[] {
    return (this.data()?.daily || []).map((d) => ({ label: d.day, value: d.bets }));
  }

  netBars(): { label: string; value: number }[] {
    return (this.data()?.daily || []).map((d) => ({ label: d.day, value: d.net }));
  }
}
