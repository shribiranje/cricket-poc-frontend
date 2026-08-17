import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [
    CommonModule, DatePipe, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule,
  ],
  template: `
    <h2>Your profile</h2>

    @if (auth.user(); as u) {
      <mat-card style="max-width: 500px;">
        <mat-card-content>
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
            <img [src]="u.avatarUrl || defaultAvatar" alt="avatar"
                 style="width:64px; height:64px; border-radius:50%; object-fit:cover; background:#eee;" />
            <div>
              <div style="font-size:20px; font-weight:500;">{{ u.displayName }}</div>
              <div style="color:#666; font-size:13px;">&#64;{{ u.username }}</div>
              @if (u.joinDate) {
                <div style="color:#888; font-size:12px;">
                  Joined {{ u.joinDate | date: 'longDate' }}
                </div>
              }
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Display name</mat-label>
              <input matInput formControlName="displayName" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Avatar URL</mat-label>
              <input matInput formControlName="avatarUrl" placeholder="https://…" />
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit"
                    [disabled]="form.invalid || saving()">Save</button>
          </form>
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  saving = signal(false);
  defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="%23cfd8dc"/><text x="50%" y="55%" text-anchor="middle" font-size="28" fill="white" font-family="sans-serif">👤</text></svg>';

  form = this.fb.nonNullable.group({
    displayName: ['', [Validators.minLength(1), Validators.maxLength(100)]],
    avatarUrl: [''],
  });

  ngOnInit(): void {
    // Load latest from server (join date), then populate form
    this.auth.loadMe().subscribe((u) => {
      this.form.patchValue({
        displayName: u.displayName,
        avatarUrl: u.avatarUrl || '',
      });
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const { displayName, avatarUrl } = this.form.getRawValue();
    this.auth.updateProfile({
      displayName: displayName || undefined,
      avatarUrl: avatarUrl?.trim() || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.snack.open('Profile updated', 'OK', { duration: 2000 }); },
      error: (e) => {
        this.saving.set(false);
        this.snack.open(e?.error?.error?.message || 'Update failed', 'Dismiss', { duration: 3000 });
      },
    });
  }
}
