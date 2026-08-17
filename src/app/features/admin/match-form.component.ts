import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AdminMatch, AdminTeam, MatchPayload } from '../../core/services/api.service';
import {
  browserTimeZone, listTimeZones, wallTimeToUtcIso, utcIsoToWallTime, isValidTimeZone,
} from '../../core/timezone';

export interface MatchFormData {
  teams: AdminTeam[];
  match?: AdminMatch; // present = edit mode
}

interface TimeOption { value: string; label: string; }

@Component({
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatSlideToggleModule, MatIconModule,
    MatDatepickerModule, MatAutocompleteModule,
  ],
  template: `
    <h2 mat-dialog-title style="display:flex; align-items:center; gap:8px;">
      <mat-icon>{{ isEdit ? 'edit_calendar' : 'add_circle' }}</mat-icon>
      {{ isEdit ? 'Edit match #' + data.match!.id : 'New match' }}
    </h2>

    <mat-dialog-content style="padding-top:12px;">
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:1 1 180px;">
          <mat-label>Team A</mat-label>
          <mat-select [(ngModel)]="teamAId" [disabled]="teamsLocked">
            @for (t of data.teams; track t.id) {
              <mat-option [value]="t.id" [disabled]="t.id === teamBId">
                {{ t.name }} ({{ t.playerCount }} players)
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:1 1 180px;">
          <mat-label>Team B</mat-label>
          <mat-select [(ngModel)]="teamBId" [disabled]="teamsLocked">
            @for (t of data.teams; track t.id) {
              <mat-option [value]="t.id" [disabled]="t.id === teamAId">
                {{ t.name }} ({{ t.playerCount }} players)
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (teamsLocked) {
        <p style="margin:-6px 0 12px; font-size:12px; color:var(--bc-gold);">
          {{ data.match!.entries }} user team(s) already entered — teams can't be changed.
        </p>
      }

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:0 1 140px;">
          <mat-label>Format</mat-label>
          <mat-select [(ngModel)]="format">
            <mat-option value="T10">T10 (10 overs)</mat-option>
            <mat-option value="T20">T20 (20 overs)</mat-option>
            <mat-option value="ODI">ODI (50 overs)</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:1 1 240px;">
          <mat-label>Venue</mat-label>
          <input matInput [(ngModel)]="venue" maxlength="200" placeholder="Wankhede Stadium, Mumbai" />
        </mat-form-field>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:1 1 160px;">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="dp" [(ngModel)]="startDate" placeholder="Pick a date" />
          <mat-datepicker-toggle matIconSuffix [for]="dp"></mat-datepicker-toggle>
          <mat-datepicker #dp></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:0 1 140px;">
          <mat-label>Time</mat-label>
          <mat-select [(ngModel)]="time">
            @for (t of timeOptions; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:1 1 200px;">
          <mat-label>Timezone</mat-label>
          <input matInput [(ngModel)]="timezone" [matAutocomplete]="tzAuto"
                 placeholder="Type to search… e.g. Kolkata" autocomplete="off" />
          <mat-autocomplete #tzAuto="matAutocomplete">
            @for (z of filteredZones(); track z) {
              <mat-option [value]="z">{{ z }}</mat-option>
            }
          </mat-autocomplete>
          @if (timezone && !tzValid) {
            <mat-hint><span class="error-text">Unknown timezone — pick one from the list</span></mat-hint>
          }
        </mat-form-field>
      </div>

      @if (localPreview) {
        <p style="margin:2px 0 12px; font-size:12px; color:var(--bc-muted);">
          <mat-icon style="font-size:14px; width:14px; height:14px; vertical-align:-2px;">schedule</mat-icon>
          That's <strong style="color:var(--bc-accent);">{{ localPreview }}</strong> in your local time.
        </p>
      }

      <mat-slide-toggle [(ngModel)]="autoStart">
        Auto-start at scheduled time
      </mat-slide-toggle>
      <p style="margin:4px 0 0; font-size:11px; color:var(--bc-muted);">
        When on, the scheduler flips the match LIVE (and locks entries) as soon as the start time passes.
      </p>

      @if (error) { <p class="error-text" style="margin-top:12px;">{{ error }}</p> }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!valid" (click)="save()">
        {{ isEdit ? 'Save changes' : 'Create match' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class MatchFormComponent {
  zones = listTimeZones();

  teamAId: number | null = null;
  teamBId: number | null = null;
  format = 'T20';
  venue = '';
  timezone = browserTimeZone();
  startDate: Date | null = null;
  time = '19:30';           // 'HH:mm' wall time in `timezone`
  timeOptions: TimeOption[] = [];
  autoStart = true;
  error = '';

  constructor(
    private ref: MatDialogRef<MatchFormComponent, MatchPayload>,
    @Inject(MAT_DIALOG_DATA) public data: MatchFormData,
  ) {
    const m = data.match;
    if (m) {
      this.teamAId = m.teamAId;
      this.teamBId = m.teamBId;
      this.format = m.format;
      this.venue = m.venue || '';
      this.timezone = m.timezone || browserTimeZone();
      const wall = utcIsoToWallTime(m.startTime, this.timezone); // YYYY-MM-DDTHH:mm
      const [d, t] = wall.split('T');
      const [y, mo, day] = d.split('-').map(Number);
      this.startDate = new Date(y, mo - 1, day);
      this.time = t;
      this.autoStart = m.autoStart;
    } else {
      // Default: tomorrow 19:30 in the admin's browser zone
      const wall = utcIsoToWallTime(new Date(Date.now() + 24 * 3600 * 1000).toISOString(), this.timezone);
      const [y, mo, day] = wall.split('T')[0].split('-').map(Number);
      this.startDate = new Date(y, mo - 1, day);
    }
    this.timeOptions = this.buildTimeOptions(this.time);
  }

  get isEdit(): boolean { return !!this.data.match; }
  get teamsLocked(): boolean { return this.isEdit && this.data.match!.entries > 0; }
  get tzValid(): boolean { return isValidTimeZone(this.timezone); }

  get valid(): boolean {
    return !!this.teamAId && !!this.teamBId && this.teamAId !== this.teamBId
      && this.startDate instanceof Date && !isNaN(this.startDate.getTime())
      && !!this.time && this.tzValid;
  }

  /** 'YYYY-MM-DDTHH:mm' from the two pickers, or null. */
  private get startLocal(): string | null {
    if (!(this.startDate instanceof Date) || isNaN(this.startDate.getTime()) || !this.time) return null;
    const y = this.startDate.getFullYear();
    const mo = String(this.startDate.getMonth() + 1).padStart(2, '0');
    const d = String(this.startDate.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}T${this.time}`;
  }

  /** Zones matching the typed filter (spaces match underscores), capped for speed. */
  filteredZones(): string[] {
    const q = (this.timezone || '').trim().toLowerCase().replace(/ /g, '_');
    const list = q ? this.zones.filter((z) => z.toLowerCase().includes(q)) : this.zones;
    return list.slice(0, 50);
  }

  /** What the chosen wall time means in the viewer's own browser zone. */
  get localPreview(): string {
    const local = this.startLocal;
    if (!local || !this.tzValid) return '';
    try {
      const iso = wallTimeToUtcIso(local, this.timezone);
      return new Date(iso).toLocaleString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  private timeLabel(v: string): string {
    const [h, m] = v.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  }

  /** Every 15 minutes, plus the current value if it's off-grid (edited matches). */
  private buildTimeOptions(current?: string): TimeOption[] {
    const opts: TimeOption[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        opts.push({ value: v, label: this.timeLabel(v) });
      }
    }
    if (current && !opts.some((o) => o.value === current)) {
      opts.push({ value: current, label: this.timeLabel(current) });
      opts.sort((a, b) => a.value.localeCompare(b.value));
    }
    return opts;
  }

  save(): void {
    const local = this.startLocal;
    if (!this.valid || !local) return;
    try {
      this.ref.close({
        teamAId: this.teamAId!,
        teamBId: this.teamBId!,
        format: this.format,
        venue: this.venue?.trim() || null,
        startTimeUtc: wallTimeToUtcIso(local, this.timezone),
        timezone: this.timezone,
        autoStart: this.autoStart,
      });
    } catch {
      this.error = 'Could not parse that date/time — please re-enter it.';
    }
  }
}
