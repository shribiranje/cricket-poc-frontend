import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="bc-panel">
      <div class="bc-panel-header"><span>Settings</span></div>
      <div class="body">
        <p class="note">
          API keys and data source (<code>DATA_SOURCE</code>, <code>RAPIDAPI_KEY</code>) stay on
          the server via environment variables. Poll/sync knobs are editable from the RapidAPI page.
        </p>
        <ul class="list">
          <li>
            <strong>Live RapidAPI controls</strong> — fixture sync, timed auto-poll, sync settings
            (poll interval, min gap, scorecard cadence, import limit), and API call history:
            <a routerLink="/console/rapidapi">RapidAPI</a>.
          </li>
          <li>
            Env values like <code>RAPIDAPI_POLL_LIVE_MS</code> / <code>RAPIDAPI_MIN_GAP_MS</code>
            are fallbacks only until an admin saves overrides.
          </li>
        </ul>
        <a mat-stroked-button color="primary" routerLink="/console/rapidapi">
          <mat-icon>cloud_sync</mat-icon> Open RapidAPI
        </a>
      </div>
    </div>
  `,
  styles: [`
    .body { padding: 14px 18px 18px; }
    .note { color: var(--bc-muted); font-size: 14px; line-height: 1.5; }
    .list { color: var(--bc-text); font-size: 14px; line-height: 1.7; padding-left: 20px; }
    code {
      background: var(--bc-panel-2); padding: 1px 6px; border-radius: 3px;
      font-size: 12px; color: var(--bc-accent);
    }
    a[routerLink] { color: var(--bc-accent); }
  `],
})
export class AdminSettingsComponent {}
