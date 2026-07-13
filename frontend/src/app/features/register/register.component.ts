import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="glass-panel auth-card row g-0">
        <div class="auth-aside col-lg-5 p-4 p-lg-5 d-flex flex-column justify-content-between">
          <div>
            <span class="brand-badge mb-4">Nowy operator</span>
            <h1 class="section-title text-white mb-3">Zaloz konto do obslugi skrzynki i ofert.</h1>
            <p class="mb-0 opacity-75 fs-5">Rejestracja odblokowuje dashboard, wgrywanie cennika oraz podglad odpowiedzi generowanych przez agenta.</p>
          </div>

          <div class="feature-tile mt-5 text-dark">
            <div class="text-uppercase small fw-semibold text-muted mb-2">Co dostajesz</div>
            <ul class="mb-0 ps-3 d-grid gap-2">
              <li>Podglad zapytan klientow w jednym miejscu</li>
              <li>Kosztorysy tworzone z pliku Excel</li>
              <li>Szkice odpowiedzi gotowe do wysylki</li>
            </ul>
          </div>
        </div>

        <div class="col-lg-7 p-4 p-lg-5">
          <div class="mx-auto" style="max-width: 480px;">
            <span class="status-badge mb-3">Rejestracja</span>
            <h2 class="fw-bold mb-2">Utworz konto operatora</h2>
            <p class="section-copy mb-4">Konto jest wymagane, aby wejsc do aplikacji i obslugiwac zapytania w dashboardzie.</p>

            <form class="d-grid gap-3" (ngSubmit)="submit()">
              <div>
                <label class="form-label fw-semibold">Imie i nazwisko</label>
                <input class="form-control form-control-lg" [(ngModel)]="fullName" name="fullName" required />
              </div>

              <div>
                <label class="form-label fw-semibold">Email</label>
                <input class="form-control form-control-lg" [(ngModel)]="email" name="email" type="email" required />
              </div>

              <div>
                <label class="form-label fw-semibold">Haslo</label>
                <input class="form-control form-control-lg" [(ngModel)]="password" name="password" type="password" required />
              </div>

              <div *ngIf="error()" class="alert alert-danger mb-0">{{ error() }}</div>

              <button class="btn btn-primary btn-lg rounded-pill mt-2" type="submit">Utworz konto</button>
            </form>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4 pt-2">
              <span class="text-muted-soft">Masz juz konto?</span>
              <a class="btn btn-outline-dark rounded-pill px-4" routerLink="/login">Przejdz do logowania</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  error = signal('');

  async submit(): Promise<void> {
    this.error.set('');
    try {
      await this.auth.register({
        full_name: this.fullName,
        email: this.email,
        password: this.password,
      });
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.error.set('Nie udalo sie zalozyc konta.');
    }
  }
}
