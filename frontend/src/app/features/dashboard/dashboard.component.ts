import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Inquiry, EstimateLine, MailboxSettings } from '../../core/api.types';
import { InquiryService } from '../../core/inquiry.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="container-xxl px-0 d-grid gap-4">
      <div class="glass-panel p-4 p-lg-5">
        <div class="row g-4 align-items-end">
          <div class="col-lg-8">
            <span class="brand-badge text-dark border-0" style="background: rgba(13, 106, 136, 0.12);">Dashboard</span>
            <h1 class="section-title mt-3 mb-3">Zapytania klientow, kosztorysy i drafty odpowiedzi.</h1>
            <p class="section-copy fs-5 mb-0">Operator {{ auth.user()?.full_name }} ma wlasna konfiguracje skrzynki, cennik i liste zapytan. To jest tenant-level setup, nie globalny backend.</p>
          </div>

          <div class="col-lg-4">
            <div class="d-flex flex-wrap justify-content-lg-end gap-3">
              <button class="btn btn-outline-dark rounded-pill px-4" (click)="logout()">Wyloguj</button>
              <button class="btn btn-primary rounded-pill px-4" (click)="processInbox()">Pobierz maile</button>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-4">
          <div class="metric-card h-100">
            <div class="text-uppercase small fw-semibold text-muted mb-2">Zalogowany operator</div>
            <div class="metric-value mb-2">{{ auth.user()?.full_name }}</div>
            <div class="text-muted-soft">Konto aktywne i gotowe do pracy na wlasnej skrzynce.</div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="metric-card h-100">
            <div class="text-uppercase small fw-semibold text-muted mb-2">Liczba zapytan</div>
            <div class="metric-value mb-2">{{ inquiries().length }}</div>
            <div class="text-muted-soft">Widok pokazuje tylko maile zakwalifikowane jako zapytania klientow.</div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="metric-card h-100">
            <div class="text-uppercase small fw-semibold text-muted mb-2">Skrzynka</div>
            <div class="fw-semibold mb-2">{{ mailboxStatusLabel() }}</div>
            <div class="text-muted-soft">Kazdy user zapisuje swoj IMAP i SMTP po zalogowaniu.</div>
          </div>
        </div>
      </div>

      <div class="row g-4 align-items-stretch">
        <div class="col-xl-7">
          <article class="feature-tile h-100">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
              <div>
                <h2 class="h4 fw-bold mb-1">Konfiguracja skrzynki usera</h2>
                <p class="section-copy mb-0">Sekcja jest zwijana, zeby nie kliknac przypadkowo. Puste pola hasel nie nadpisuja zapisanych sekretow.</p>
              </div>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="status-badge">{{ mailboxConfigured() ? 'Skonfigurowana' : 'Wymaga ustawienia' }}</span>
                <button class="btn btn-outline-dark rounded-pill px-3" type="button" (click)="toggleMailboxConfig()">
                  {{ showMailboxConfig() ? 'Ukryj konfiguracje' : 'Pokaz konfiguracje' }}
                </button>
              </div>
            </div>

            <form *ngIf="showMailboxConfig()" class="row g-3" (ngSubmit)="saveMailboxSettings()">
              <div class="col-md-4">
                <label class="form-label fw-semibold">Tryb integracji</label>
                <select class="form-select" [(ngModel)]="mailboxForm.integration_mode" name="integration_mode">
                  <option value="disabled">Wylaczony</option>
                  <option value="imap">IMAP</option>
                </select>
              </div>

              <div class="col-md-8">
                <label class="form-label fw-semibold">Host IMAP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_imap_host" name="email_imap_host" placeholder="imap.twojadomena.pl" />
              </div>

              <div class="col-md-4">
                <label class="form-label fw-semibold">Port IMAP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_imap_port" name="email_imap_port" type="number" />
              </div>

              <div class="col-md-8">
                <label class="form-label fw-semibold">Login IMAP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_imap_username" name="email_imap_username" placeholder="oferty@twojadomena.pl" />
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Haslo IMAP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_imap_password" name="email_imap_password" type="password" placeholder="Pozostaw puste, aby zachowac" />
                <div class="form-text" *ngIf="mailboxSettings()?.has_imap_password">Haslo IMAP jest juz zapisane.</div>
              </div>

              <div class="col-md-3">
                <label class="form-label fw-semibold">Folder</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_imap_mailbox" name="email_imap_mailbox" />
              </div>

              <div class="col-md-3">
                <label class="form-label fw-semibold">Filtr wyszukiwania</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_imap_search" name="email_imap_search" />
              </div>

              <div class="col-md-4 d-flex align-items-center">
                <div class="form-check mt-4 pt-2">
                  <input class="form-check-input" [(ngModel)]="mailboxForm.email_imap_use_ssl" name="email_imap_use_ssl" type="checkbox" id="imap_ssl" />
                  <label class="form-check-label" for="imap_ssl">IMAP przez SSL</label>
                </div>
              </div>

              <div class="col-md-8">
                <label class="form-label fw-semibold">Host SMTP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_smtp_host" name="email_smtp_host" placeholder="smtp.twojadomena.pl" />
              </div>

              <div class="col-md-4">
                <label class="form-label fw-semibold">Port SMTP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_smtp_port" name="email_smtp_port" type="number" />
              </div>

              <div class="col-md-8">
                <label class="form-label fw-semibold">Login SMTP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_smtp_username" name="email_smtp_username" placeholder="oferty@twojadomena.pl" />
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Haslo SMTP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_smtp_password" name="email_smtp_password" type="password" placeholder="Pozostaw puste, aby zachowac" />
                <div class="form-text" *ngIf="mailboxSettings()?.has_smtp_password">Haslo SMTP jest juz zapisane.</div>
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Adres nadawcy SMTP</label>
                <input class="form-control" [(ngModel)]="mailboxForm.email_smtp_from" name="email_smtp_from" placeholder="oferty@twojadomena.pl" />
              </div>

              <div class="col-md-4 d-flex align-items-center">
                <div class="form-check mt-4 pt-2">
                  <input class="form-check-input" [(ngModel)]="mailboxForm.email_smtp_use_ssl" name="email_smtp_use_ssl" type="checkbox" id="smtp_ssl" />
                  <label class="form-check-label" for="smtp_ssl">SMTP przez SSL</label>
                </div>
              </div>

              <div class="col-12 d-flex flex-wrap gap-3 align-items-center mt-2">
                <button class="btn btn-primary rounded-pill px-4" type="submit">Zapisz ustawienia skrzynki</button>
                <span class="text-muted-soft" *ngIf="mailboxMessage()">{{ mailboxMessage() }}</span>
              </div>
            </form>

            <div *ngIf="!showMailboxConfig()" class="body-box">
              <div class="fw-semibold mb-2">Konfiguracja ukryta</div>
              <p class="mb-0">Skrzynka jest juz ustawiona. Rozwin sekcje tylko wtedy, gdy chcesz swiadomie zmienic dane IMAP lub SMTP.</p>
            </div>
          </article>
        </div>

        <div class="col-xl-5">
          <article class="feature-tile h-100">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h2 class="h4 fw-bold mb-1">Import cennika</h2>
                <p class="section-copy mb-0">Plik Excel powinien miec kolumny: sku, name, unit, price.</p>
              </div>
              <span class="status-badge">Excel</span>
            </div>

            <label class="upload-field d-grid gap-3">
              <span class="fw-semibold">Wybierz plik .xlsx</span>
              <input class="form-control" type="file" accept=".xlsx" (change)="onFileSelected($event)" />
            </label>

            <div *ngIf="uploadMessage()" class="alert alert-success mt-3 mb-0">{{ uploadMessage() }}</div>

            <div class="body-box mt-4">
              <div class="fw-semibold mb-2">Stan ostatniego przebiegu</div>
              <p class="mb-0" *ngIf="runMessage(); else idle">{{ runMessage() }}</p>
              <ng-template #idle>
                <p class="mb-0">Agent jeszcze nie pobieral skrzynki w tej sesji.</p>
              </ng-template>
            </div>
          </article>
        </div>
      </div>

      <section class="inquiry-grid" *ngIf="inquiries().length; else noInquiries">
        <article class="inquiry-card" *ngFor="let inquiry of inquiries()">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h3 class="h5 fw-bold mb-1">{{ inquiry.email_subject }}</h3>
              <p class="text-muted-soft mb-0">{{ inquiry.email_from }} | {{ inquiry.created_at | date:'short' }}</p>
            </div>
            <span class="status-badge">{{ inquiry.status }}</span>
          </div>

          <div class="body-box mb-3">
            <div class="fw-semibold mb-2">Powod klasyfikacji</div>
            <p class="mb-0">{{ inquiry.classification_reason }}</p>
          </div>

          <div class="body-box mb-3">
            <div class="fw-semibold mb-2">Tresc wiadomosci</div>
            <p class="mb-0">{{ inquiry.email_body }}</p>
          </div>

          <div *ngIf="inquiry.estimate as estimate" class="body-box mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h4 class="h6 fw-bold mb-0">Kosztorys</h4>
              <span class="status-badge">{{ estimate.currency }}</span>
            </div>
            <div class="d-grid gap-2">
              <div *ngFor="let line of estimate.lines">{{ describeLine(line) }}</div>
            </div>
            <hr>
            <div class="fw-bold">Suma: {{ estimate.total_net }} {{ estimate.currency }}</div>
          </div>

          <div *ngIf="inquiry.draft_reply" class="body-box">
            <h4 class="h6 fw-bold mb-2">Szkic odpowiedzi</h4>
            <pre class="reply-box">{{ inquiry.draft_reply }}</pre>
          </div>
        </article>
      </section>

      <ng-template #noInquiries>
        <section class="feature-tile">
          <h2 class="h4 fw-bold mb-2">Brak zapytan klientow</h2>
          <p class="mb-0 section-copy">Lista pozostaje pusta, dopoki agent nie znajdzie maili spelniajacych warunki zapytania klienckiego.</p>
        </section>
      </ng-template>
    </section>
  `,
})
export class DashboardComponent {
  protected auth = inject(AuthService);
  private inquiryService = inject(InquiryService);
  private router = inject(Router);

  inquiries = signal<Inquiry[]>([]);
  runMessage = signal('');
  uploadMessage = signal('');
  mailboxMessage = signal('');
  mailboxSettings = signal<MailboxSettings | null>(null);
  showMailboxConfig = signal(true);
  mailboxForm = {
    integration_mode: 'disabled' as 'disabled' | 'imap',
    email_imap_host: '',
    email_imap_port: 993,
    email_imap_username: '',
    email_imap_password: '',
    email_imap_mailbox: 'INBOX',
    email_imap_use_ssl: true,
    email_imap_search: 'UNSEEN',
    email_smtp_host: '',
    email_smtp_port: 465,
    email_smtp_username: '',
    email_smtp_password: '',
    email_smtp_use_ssl: true,
    email_smtp_from: '',
  };

  constructor() {
    effect(() => {
      if (this.auth.user()) {
        void this.initializeDashboard();
      }
    });
  }

  async initializeDashboard(): Promise<void> {
    await Promise.all([this.refresh(), this.loadMailboxSettings()]);
  }

  async refresh(): Promise<void> {
    this.inquiries.set(await this.inquiryService.list());
  }

  async loadMailboxSettings(): Promise<void> {
    const settings = await this.inquiryService.getMailboxSettings();
    this.mailboxSettings.set(settings);
    this.showMailboxConfig.set(!this.mailboxConfigured(settings));
    this.mailboxForm.integration_mode = settings.integration_mode;
    this.mailboxForm.email_imap_host = settings.email_imap_host ?? '';
    this.mailboxForm.email_imap_port = settings.email_imap_port;
    this.mailboxForm.email_imap_username = settings.email_imap_username ?? '';
    this.mailboxForm.email_imap_password = '';
    this.mailboxForm.email_imap_mailbox = settings.email_imap_mailbox;
    this.mailboxForm.email_imap_use_ssl = settings.email_imap_use_ssl;
    this.mailboxForm.email_imap_search = settings.email_imap_search;
    this.mailboxForm.email_smtp_host = settings.email_smtp_host ?? '';
    this.mailboxForm.email_smtp_port = settings.email_smtp_port;
    this.mailboxForm.email_smtp_username = settings.email_smtp_username ?? '';
    this.mailboxForm.email_smtp_password = '';
    this.mailboxForm.email_smtp_use_ssl = settings.email_smtp_use_ssl;
    this.mailboxForm.email_smtp_from = settings.email_smtp_from ?? '';
  }

  async saveMailboxSettings(): Promise<void> {
    try {
      const settings = await this.inquiryService.updateMailboxSettings({
        integration_mode: this.mailboxForm.integration_mode,
        email_imap_host: this.emptyToNull(this.mailboxForm.email_imap_host),
        email_imap_port: this.mailboxForm.email_imap_port,
        email_imap_username: this.emptyToNull(this.mailboxForm.email_imap_username),
        email_imap_password: this.emptyToNull(this.mailboxForm.email_imap_password),
        email_imap_mailbox: this.mailboxForm.email_imap_mailbox,
        email_imap_use_ssl: this.mailboxForm.email_imap_use_ssl,
        email_imap_search: this.mailboxForm.email_imap_search,
        email_smtp_host: this.emptyToNull(this.mailboxForm.email_smtp_host),
        email_smtp_port: this.mailboxForm.email_smtp_port,
        email_smtp_username: this.emptyToNull(this.mailboxForm.email_smtp_username),
        email_smtp_password: this.emptyToNull(this.mailboxForm.email_smtp_password),
        email_smtp_use_ssl: this.mailboxForm.email_smtp_use_ssl,
        email_smtp_from: this.emptyToNull(this.mailboxForm.email_smtp_from),
      });
      this.mailboxSettings.set(settings);
      this.mailboxForm.email_imap_password = '';
      this.mailboxForm.email_smtp_password = '';
      this.mailboxMessage.set('Ustawienia skrzynki zapisane dla tego uzytkownika.');
      this.showMailboxConfig.set(false);
      await this.auth.loadProfile();
    } catch {
      this.mailboxMessage.set('Nie udalo sie zapisac ustawien skrzynki.');
    }
  }

  async processInbox(): Promise<void> {
    try {
      const result = await this.inquiryService.processInbox();
      this.runMessage.set(
        `Przetworzono ${result.processed_messages} wiadomosci, utworzono ${result.inquiries_created} zapytan, ${result.estimates_created} kosztorysow i ${result.replies_prepared} draftow odpowiedzi.`,
      );
      await this.refresh();
    } catch {
      this.runMessage.set('Nie udalo sie pobrac maili. Sprawdz konfiguracje skrzynki tego uzytkownika.');
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const result = await this.inquiryService.uploadPricing(file);
    this.uploadMessage.set(`Zaimportowano ${result.imported_products} pozycji z cennika.`);
  }

  describeLine(line: EstimateLine): string {
    return `${line.product_name} (${line.sku}) - ${line.quantity} x ${line.unit_price} = ${line.line_total} PLN`;
  }

  mailboxStatusLabel(): string {
    const settings = this.mailboxSettings();
    if (!settings) {
      return 'Ladowanie';
    }
    return settings.integration_mode === 'imap' ? 'IMAP aktywny' : 'Integracja wylaczona';
  }

  mailboxConfigured(settings: MailboxSettings | null = this.mailboxSettings()): boolean {
    if (!settings) {
      return false;
    }
    return settings.integration_mode === 'imap' && !!settings.email_imap_host && !!settings.email_imap_username && settings.has_imap_password;
  }

  toggleMailboxConfig(): void {
    this.showMailboxConfig.set(!this.showMailboxConfig());
  }

  emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
