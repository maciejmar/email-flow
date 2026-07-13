import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { User } from './api.types';

const API_BASE = 'api';
const TOKEN_KEY = 'email_flow_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private currentUser = signal<User | null>(null);
  private accessToken = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  user = computed(() => this.currentUser());
  token = computed(() => this.accessToken());

  hasToken(): boolean {
    return !!this.accessToken();
  }

  async register(payload: { email: string; full_name: string; password: string }): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE}/auth/register`, payload));
  }

  async login(email: string, password: string): Promise<void> {
    const body = new HttpParams().set('username', email).set('password', password);
    const response = await firstValueFrom(
      this.http.post<{ access_token: string }>(`${API_BASE}/auth/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    this.accessToken.set(response.access_token);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    await this.loadProfile();
  }

  async loadProfile(): Promise<User> {
    const user = await firstValueFrom(this.http.get<User>(`${API_BASE}/auth/me`));
    this.currentUser.set(user);
    return user;
  }

  logout(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }
}
