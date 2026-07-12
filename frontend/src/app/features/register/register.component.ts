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
    <section class="card login">
      <div>
        <p class="tag">Nowe konto</p>
        <h1>Rejestracja operatora</h1>
        <p>Konto jest wymagane, aby wejsc do dashboardu i obslugiwac zapytania klientow.</p>
      </div>

      <form class="grid" (ngSubmit)="submit()">
        <label class="field">
          <span>Imie i nazwisko</span>
          <input [(ngModel)]="fullName" name="fullName" required />
        </label>
        <label class="field">
          <span>Email</span>
          <input [(ngModel)]="email" name="email" type="email" required />
        </label>
        <label class="field">
          <span>Haslo</span>
          <input [(ngModel)]="password" name="password" type="password" required />
        </label>
        <p *ngIf="error()" style="color:#8f4311">{{ error() }}</p>
        <button class="btn" type="submit">Utworz konto</button>
      </form>

      <a routerLink="/login">Masz konto? Zaloguj sie</a>
    </section>
  `,
  styles: [`
    .login {
      max-width: 560px;
      margin: 48px auto;
      padding: 32px;
      display: grid;
      gap: 24px;
    }
    h1 { margin: 0 0 8px; font-size: 40px; }
    p { margin: 0; line-height: 1.6; }
  `],
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
