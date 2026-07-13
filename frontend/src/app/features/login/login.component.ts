import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="glass-panel auth-card row g-0">
        <div class="auth-aside col-lg-5 p-4 p-lg-5 d-flex flex-column justify-content-between">
          <div>
            <span class="brand-badge mb-4">Email Flow</span>
            <h1 class="section-title text-white mb-3">Panel do obslugi zapytan i kosztorysow.</h1>
            <p class="mb-0 opacity-75 fs-5">Zalogowany operator widzi maile klientow, drafty odpowiedzi i kosztorysy tworzone przez agenta.</p>
          </div>

          <div class="d-grid gap-3 mt-5">
            <div class="metric-card text-dark">
              <div class="text-uppercase small fw-semibold text-muted mb-2">Tryb pracy</div>
              <div class="metric-value">MCP + LangGraph</div>
            </div>
            <div class="metric-card text-dark">
              <div class="text-uppercase small fw-semibold text-muted mb-2">Dostep</div>
              <div class="metric-value">Bezpieczne konto</div>
            </div>
          </div>
        </div>

        <div class="col-lg-7 p-4 p-lg-5">
          <div class="mx-auto" style="max-width: 440px;">
            <span class="status-badge mb-3">Logowanie</span>
            <h2 class="fw-bold mb-2">Wejdz do dashboardu</h2>
            <p class="section-copy mb-4">Po zalogowaniu mozesz pobierac maile, importowac cennik i zarzadzac odpowiedziami.</p>

            <form class="d-grid gap-3" (ngSubmit)="submit()">
              <div>
                <label class="form-label fw-semibold">Email</label>
                <input class="form-control form-control-lg" [(ngModel)]="email" name="email" type="email" required />
              </div>

              <div>
                <label class="form-label fw-semibold">Haslo</label>
                <input class="form-control form-control-lg" [(ngModel)]="password" name="password" type="password" required />
              </div>

              <div *ngIf="error()" class="alert alert-danger mb-0">{{ error() }}</div>

              <button class="btn btn-primary btn-lg rounded-pill mt-2" type="submit">Zaloguj</button>
            </form>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-2">
              <span class="text-muted-soft">Dostep tylko dla zarejestrowanych uzytkownikow.</span>
              <a class="btn btn-outline-dark rounded-pill px-4" routerLink="/register">Utworz konto</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal('');

  async submit(): Promise<void> {
    this.error.set('');
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.error.set('Nie udalo sie zalogowac.');
    }
  }
}
