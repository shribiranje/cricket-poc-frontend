import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { AdminUser, UserPayload } from '../../core/services/api.service';

export interface UserFormData {
  user?: AdminUser;   // present = edit mode
  selfId?: number;    // logged-in admin: can't demote themselves
}

@Component({
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSlideToggleModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title style="display:flex; align-items:center; gap:8px;">
      <mat-icon>{{ isEdit ? 'manage_accounts' : 'person_add' }}</mat-icon>
      {{ isEdit ? 'Edit ' + data.user!.username : 'New user' }}
    </h2>

    <mat-dialog-content style="padding-top:12px;">
      <mat-form-field appearance="outline" style="width:100%;">
        <mat-label>Username</mat-label>
        <input matInput [(ngModel)]="username" maxlength="50" autocomplete="off"
               placeholder="letters, numbers, underscore" />
        @if (username && !usernameValid) {
          <mat-hint><span class="error-text">3-50 chars — letters, numbers and underscore only</span></mat-hint>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%;">
        <mat-label>Display name</mat-label>
        <input matInput [(ngModel)]="displayName" maxlength="100" placeholder="Shown on leaderboards" />
      </mat-form-field>

      <mat-form-field appearance="outline" style="width:100%;">
        <mat-label>{{ isEdit ? 'New password (leave blank to keep current)' : 'Password' }}</mat-label>
        <input matInput type="password" [(ngModel)]="password" maxlength="100" autocomplete="new-password" />
        @if (password && password.length < 6) {
          <mat-hint><span class="error-text">At least 6 characters</span></mat-hint>
        }
      </mat-form-field>

      <mat-slide-toggle [(ngModel)]="isAdmin" [disabled]="isSelf">
        Admin — full access to this console
      </mat-slide-toggle>
      @if (isSelf) {
        <p style="margin:4px 0 0; font-size:11px; color:var(--bc-gold);">
          You can't change your own admin rights — use another admin account.
        </p>
      }

      @if (error) { <p class="error-text" style="margin-top:12px;">{{ error }}</p> }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!valid" (click)="save()">
        {{ isEdit ? 'Save changes' : 'Create user' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class UserFormComponent {
  username = '';
  displayName = '';
  password = '';
  isAdmin = false;
  error = '';

  constructor(
    private ref: MatDialogRef<UserFormComponent, UserPayload>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormData,
  ) {
    const u = data.user;
    if (u) {
      this.username = u.username;
      this.displayName = u.displayName;
      this.isAdmin = u.isAdmin;
    }
  }

  get isEdit(): boolean { return !!this.data.user; }
  get isSelf(): boolean { return this.isEdit && this.data.user!.id === this.data.selfId; }
  get usernameValid(): boolean { return /^[a-zA-Z0-9_]{3,50}$/.test(this.username.trim()); }

  get valid(): boolean {
    if (!this.usernameValid) return false;
    // Password required on create; on edit it's optional but must be valid if typed
    if (!this.isEdit && this.password.length < 6) return false;
    if (this.isEdit && this.password && this.password.length < 6) return false;
    return true;
  }

  save(): void {
    if (!this.valid) return;
    const payload: UserPayload = {
      username: this.username.trim(),
      displayName: this.displayName.trim() || this.username.trim(),
      isAdmin: this.isAdmin,
    };
    if (this.password) payload.password = this.password;
    this.ref.close(payload);
  }
}
