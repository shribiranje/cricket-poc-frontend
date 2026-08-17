import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-wrap">
      <mat-card class="auth-card">
        <h1 class="title">{{ isAdminApp ? 'Admin login' : 'Log in' }}</h1>
        <p class="sub" *ngIf="!isAdminApp">Sign in to play fantasy cricket</p>
        <p class="sub" *ngIf="isAdminApp">Sign in to the admin console</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
          </mat-form-field>

          @if (error()) {
            <p class="error-text">{{ error() }}</p>
          }

          <button mat-raised-button color="primary" type="submit" class="submit"
                  [disabled]="form.invalid || loading()">
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Log in
            }
          </button>
        </form>

        @if (!isAdminApp) {
          <p class="footer">
            No account? <a routerLink="/register">Sign up</a>
          </p>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-wrap {
      display: flex; justify-content: center; padding: 48px 16px 32px;
    }
    .auth-card {
      width: 100%; max-width: 400px;
      padding: 28px 28px 24px;
      background: var(--bc-panel) !important;
      color: var(--bc-text) !important;
      border: 1px solid var(--bc-border);
      border-radius: 12px;
      box-shadow: none;
    }
    .title {
      margin: 0 0 6px; font-size: 22px; font-weight: 500; color: var(--bc-text);
    }
    .sub {
      margin: 0 0 22px; font-size: 13px; color: var(--bc-muted);
    }
    form { display: flex; flex-direction: column; gap: 14px; }
    .full { width: 100%; }
    .error-text { margin: 0; color: var(--bc-red); font-size: 13px; }
    .submit { width: 100%; height: 44px; margin-top: 4px; }
    .footer {
      text-align: center; margin: 18px 0 0; font-size: 13px; color: var(--bc-muted);
    }
    .footer a {
      color: var(--bc-accent); font-weight: 500; text-decoration: none;
    }
    .footer a:hover { text-decoration: underline; }

    :host ::ng-deep .mat-mdc-form-field {
      --mdc-outlined-text-field-container-shape: 8px;
      --mdc-outlined-text-field-outline-color: var(--bc-border);
      --mdc-outlined-text-field-hover-outline-color: var(--bc-muted);
      --mdc-outlined-text-field-focus-outline-color: var(--bc-accent);
      --mdc-outlined-text-field-label-text-color: var(--bc-muted);
      --mdc-outlined-text-field-hover-label-text-color: var(--bc-text);
      --mdc-outlined-text-field-focus-label-text-color: var(--bc-accent);
      --mdc-outlined-text-field-input-text-color: var(--bc-text);
      --mdc-outlined-text-field-caret-color: var(--bc-accent);
    }
    :host ::ng-deep .mat-mdc-text-field-wrapper,
    :host ::ng-deep .mdc-text-field--outlined .mdc-text-field__input {
      background: var(--bc-panel-2) !important;
      color: var(--bc-text) !important;
    }
    :host ::ng-deep input.mat-mdc-input-element {
      color: var(--bc-text) !important;
      caret-color: var(--bc-accent);
    }
    :host ::ng-deep .mdc-floating-label {
      color: var(--bc-muted) !important;
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly isAdminApp = environment.appKind === 'admin';

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.isAdminApp ? '/console' : '/matches']);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.error?.message || 'Login failed');
      },
    });
  }
}
