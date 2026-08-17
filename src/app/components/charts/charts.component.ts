import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartSlice {
  label: string;
  value: number;
  color?: string;
}

const COLORS = [
  '#4fc3f7', '#a5d6a7', '#ff8a8a', '#ffb74d', '#ce93d8',
  '#80cbc4', '#90caf9', '#ef9a9a', '#fff59d', '#b0bec5',
];

@Component({
  standalone: true,
  selector: 'app-pie-chart',
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="pie">
        @for (a of arcs; track a.label) {
          <path [attr.d]="a.d" [attr.fill]="a.color"
                [attr.stroke]="'var(--bc-panel)'" stroke-width="2">
            <title>{{ a.label }}: {{ a.value }}</title>
          </path>
        }
        @if (!arcs.length) {
          <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="size/2 - 4"
                  fill="var(--bc-panel-2)" />
          <text [attr.x]="size/2" [attr.y]="size/2" text-anchor="middle"
                dominant-baseline="middle" fill="var(--bc-muted)" font-size="12">No data</text>
        }
      </svg>
      <div class="legend">
        @for (a of arcs; track a.label) {
          <div class="leg-row">
            <span class="swatch" [style.background]="a.color"></span>
            <span class="lab">{{ a.label }}</span>
            <strong>{{ a.value }}</strong>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .wrap { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .pie { width: 160px; height: 160px; flex-shrink: 0; }
    .legend { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
    .leg-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--bc-text); }
    .swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
    .lab { flex: 1; color: var(--bc-muted); }
  `],
})
export class PieChartComponent {
  @Input() size = 160;
  @Input() set slices(v: ChartSlice[]) {
    this.arcs = this.build(v || []);
  }
  arcs: { label: string; value: number; color: string; d: string }[] = [];

  private build(slices: ChartSlice[]) {
    const total = slices.reduce((s, x) => s + Number(x.value || 0), 0);
    if (!total) return [];
    const cx = this.size / 2;
    const cy = this.size / 2;
    const r = this.size / 2 - 4;
    let angle = -Math.PI / 2;
    return slices.filter((s) => s.value > 0).map((s, i) => {
      const sweep = (s.value / total) * Math.PI * 2;
      const a0 = angle;
      const a1 = angle + sweep;
      angle = a1;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      return {
        label: s.label,
        value: s.value,
        color: s.color || COLORS[i % COLORS.length],
        d,
      };
    });
  }
}

@Component({
  standalone: true,
  selector: 'app-bar-chart',
  imports: [CommonModule],
  template: `
    <div class="bars">
      @for (b of bars; track b.label) {
        <div class="col" [title]="b.label + ': ' + b.value">
          <div class="bar-wrap">
            <div class="bar" [style.height.%]="b.pct" [style.background]="b.color"></div>
          </div>
          <div class="lbl">{{ b.short }}</div>
        </div>
      } @empty {
        <span class="empty">No data</span>
      }
    </div>
  `,
  styles: [`
    .bars {
      display: flex; align-items: flex-end; gap: 6px;
      height: 160px; padding-top: 8px;
    }
    .col { flex: 1; min-width: 18px; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-wrap {
      flex: 1; width: 100%; display: flex; align-items: flex-end;
      background: var(--bc-panel-2); border-radius: 4px 4px 0 0;
    }
    .bar { width: 100%; min-height: 2px; border-radius: 4px 4px 0 0; background: var(--bc-accent); }
    .lbl { font-size: 9px; color: var(--bc-muted); margin-top: 4px; }
    .empty { color: var(--bc-muted); font-size: 12px; }
  `],
})
export class BarChartComponent {
  bars: { label: string; short: string; value: number; pct: number; color: string }[] = [];

  @Input() set points(v: { label: string; value: number; color?: string }[]) {
    const arr = v || [];
    const max = Math.max(1, ...arr.map((x) => Math.abs(Number(x.value) || 0)));
    this.bars = arr.map((x, i) => ({
      label: x.label,
      short: x.label.length > 6 ? x.label.slice(5) : x.label, // show MM-DD if ISO
      value: x.value,
      pct: Math.max(4, (Math.abs(x.value) / max) * 100),
      color: x.color || (x.value >= 0 ? '#4fc3f7' : '#ff8a8a'),
    }));
  }
}
