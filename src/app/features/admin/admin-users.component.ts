import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService, AdminUser } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { UserFormComponent, UserFormData } from './user-form.component';

@Component({
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSlideToggleModule, MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="bc-panel">
      <div class="bc-panel-header">
        <span>Users ({{ users().length }})</span>
        <button mat-raised-button color="primary" (click)="openCreateUser()" [disabled]="busy()">
          <mat-icon>person_add</mat-icon> Add user
        </button>
      </div>
      <div style="overflow-x:auto; padding-bottom: 8px;">
        <table mat-table [dataSource]="users()" class="admin-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>#</th>
            <td mat-cell *matCellDef="let u">{{ u.id }}</td>
          </ng-container>
          <ng-container matColumnDef="username">
            <th mat-header-cell *matHeaderCellDef>Username</th>
            <td mat-cell *matCellDef="let u">
              <strong>{{ u.displayName }}</strong>
              <br /><small class="muted">&#64;{{ u.username }}</small>
            </td>
          </ng-container>
          <ng-container matColumnDef="joined">
            <th mat-header-cell *matHeaderCellDef>Joined</th>
            <td mat-cell *matCellDef="let u">{{ u.joinDate | date: 'shortDate' }}</td>
          </ng-container>
          <ng-container matColumnDef="teams">
            <th mat-header-cell *matHeaderCellDef>Teams</th>
            <td mat-cell *matCellDef="let u">{{ u.teamCount }}</td>
          </ng-container>
          <ng-container matColumnDef="admin">
            <th mat-header-cell *matHeaderCellDef>Admin</th>
            <td mat-cell *matCellDef="let u">
              <mat-slide-toggle [checked]="u.isAdmin"
                                [disabled]="u.id === selfId() || busy()"
                                (change)="toggleAdmin(u, $event.checked)">
              </mat-slide-toggle>
              @if (u.id === selfId()) {
                <small class="muted" style="margin-left:8px;">(you)</small>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="userActions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let u" style="white-space:nowrap;">
              <button mat-icon-button [disabled]="busy()" (click)="openEditUser(u)"
                      title="Edit user / reset password">
                <mat-icon>edit</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="userCols"></tr>
          <tr mat-row *matRowDef="let r; columns: userCols;"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .muted { color: var(--bc-muted); }
    .admin-table { width: 100%; background: transparent; }
    :host ::ng-deep .admin-table .mat-mdc-header-cell,
    :host ::ng-deep .admin-table .mat-mdc-cell {
      color: var(--bc-text);
      border-bottom-color: var(--bc-border);
    }
    :host ::ng-deep .admin-table .mat-mdc-header-cell { color: var(--bc-muted); }
  `],
})
export class AdminUsersComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  users = signal<AdminUser[]>([]);
  busy = signal(false);
  userCols = ['id', 'username', 'joined', 'teams', 'admin', 'userActions'];

  ngOnInit(): void { this.refresh(); }

  selfId(): number | undefined { return this.auth.user()?.id; }

  refresh(): void {
    this.api.adminUsers().subscribe((u) => this.users.set(u));
  }

  private wrap(label: string, obs: any): void {
    this.busy.set(true);
    obs.subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open(label, 'OK', { duration: 1800 });
        this.refresh();
      },
      error: (e: any) => {
        this.busy.set(false);
        this.snack.open(e?.error?.error?.message || `${label} failed`, 'Dismiss', { duration: 3500 });
      },
    });
  }

  private openUserForm(user?: AdminUser): void {
    const data: UserFormData = { user, selfId: this.selfId() };
    this.dialog.open(UserFormComponent, { data, width: '460px', maxWidth: '95vw' })
      .afterClosed().subscribe((payload) => {
        if (!payload) return;
        if (user) {
          this.wrap(`Updated ${payload.username}`, this.api.adminUpdateUser(user.id, payload));
        } else {
          this.wrap(`Created ${payload.username}`, this.api.adminCreateUser(payload));
        }
      });
  }

  openCreateUser(): void { this.openUserForm(); }
  openEditUser(u: AdminUser): void { this.openUserForm(u); }

  toggleAdmin(u: AdminUser, checked: boolean): void {
    const verb = checked ? 'Promoted' : 'Demoted';
    this.wrap(`${verb} ${u.username}`, this.api.adminSetAdmin(u.id, checked));
  }
}
