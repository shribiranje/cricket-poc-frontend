import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
  ],
  template: `
    <div class="auth-wrap">
      <mat-card class="auth-card">
        <h1 class="title">Create account</h1>
        <p class="sub">Join Fantasy POC with a free virtual wallet</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
            <mat-hint>3–50 chars, letters / digits / underscore</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Display name</mat-label>
            <input matInput formControlName="displayName" autocomplete="nickname" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full" subscriptSizing="dynamic">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password" />
            <mat-hint>Min 6 characters</mat-hint>
          </mat-form-field>

          @if (error()) {
            <p class="error-text">{{ error() }}</p>
          }

          <button mat-raised-button color="primary" type="submit" class="submit"
                  [disabled]="form.invalid || loading()">
            Sign up
          </button>
        </form>

        <p class="footer">
          Have an account? <a routerLink="/login">Log in</a>
        </p>
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
    :host ::ng-deep .mat-mdc-form-field-hint {
      color: var(--bc-faint);
    }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50),
                    Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
    displayName: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, password, displayName } = this.form.getRawValue();
    this.auth.register(username, password, displayName || undefined).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/matches']); },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.error?.message || 'Registration failed');
      },
    });
  }
}
