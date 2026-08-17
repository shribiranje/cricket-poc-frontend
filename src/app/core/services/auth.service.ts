import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, User } from '../models';

const TOKEN_KEY = 'fantasy_token';
const USER_KEY = 'fantasy_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/auth`;

  private _user = signal<User | null>(this.readStoredUser());
  user = computed(() => this._user());
  isAuthenticated = computed(() => !!this._user() && !!this.getToken());

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<ApiResponse<{ token: string; user: User }>>(`${this.base}/login`, { username, password })
      .pipe(
        map((r) => r.data!),
        tap((d) => this.persist(d.token, d.user)),
        map((d) => d.user)
      );
  }

  register(username: string, password: string, displayName?: string): Observable<User> {
    return this.http
      .post<ApiResponse<{ token: string; user: User }>>(`${this.base}/register`, {
        username, password, displayName,
      })
      .pipe(
        map((r) => r.data!),
        tap((d) => this.persist(d.token, d.user)),
        map((d) => d.user)
      );
  }

  loadMe(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.base}/me`).pipe(
      map((r) => r.data!),
      tap((u) => {
        this._user.set(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
    );
  }

  updateProfile(payload: { displayName?: string; avatarUrl?: string | null }): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${this.base}/me`, payload).pipe(
      map((r) => r.data!),
      tap((u) => {
        this._user.set(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  private persist(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }
}
