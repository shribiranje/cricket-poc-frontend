import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';
import { HistoryEntry } from '../../core/models';

@Component({
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, MatCardModule, MatTableModule, MatButtonModule],
  template: `
    <h2>Contest history</h2>
    @if (rows().length === 0) {
      <p>You haven't entered any contests yet.</p>
    } @else {
      <mat-card>
        <table mat-table [dataSource]="rows()" style="width:100%;">
          <ng-container matColumnDef="match">
            <th mat-header-cell *matHeaderCellDef>Match</th>
            <td mat-cell *matCellDef="let r">
              {{ r.match.teamAShort }} vs {{ r.match.teamBShort }}
              <br />
              <small style="color:#888;">{{ r.match.startTime | date: 'short' }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let r">
              <span class="status-chip status-{{ r.match.status }}">{{ r.match.status }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="points">
            <th mat-header-cell *matHeaderCellDef>Points</th>
            <td mat-cell *matCellDef="let r"><strong>{{ r.totalPoints }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="rank">
            <th mat-header-cell *matHeaderCellDef>Rank</th>
            <td mat-cell *matCellDef="let r">{{ r.rank }} / {{ r.totalEntries }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              <a mat-button [routerLink]="['/matches', r.match.id]">View</a>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </mat-card>
    }
  `,
})
export class HistoryComponent implements OnInit {
  private api = inject(ApiService);
  rows = signal<HistoryEntry[]>([]);
  cols = ['match', 'status', 'points', 'rank', 'actions'];

  ngOnInit(): void {
    this.api.getHistory().subscribe((r) => this.rows.set(r));
  }
}
