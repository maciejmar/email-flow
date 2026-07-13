import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { Inquiry, EstimateLine } from '../../core/api.types';
import { InquiryService } from '../../core/inquiry.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="container-xxl px-0 d-grid gap-4">
      <div class="glass-panel p-4 p-lg-5">
        <div class="row g-4 align-items-end">
          <div class="col-lg-8">
            <span class="brand-badge text-dark border-0" style="background: rgba(13, 106, 136, 0.12);">Dashboard</span>
            <h1 class="section-title mt-3 mb-3">Zapytania klientow, kosztorysy i drafty odpowiedzi.</h1>
            <p class="section-copy fs-5 mb-0">Operator {{ auth.user()?.full_name }} moze importowac cennik, pobierac maile przez agenta i przegladac przygotowane odpowiedzi.</p>
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
            <div class="text-muted-soft">Konto aktywne i gotowe do pracy na skrzynce.</div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="metric-card h-100">
            <div class="text-uppercase small fw-semibold text-muted mb-2">Liczba zapytan</div>
            <div class="metric-value mb-2">{{ inquiries().length }}</div>
            <div class="text-muted-soft">Widok listy pyta klientow wykrytych przez agenta.</div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="metric-card h-100">
            <div class="text-uppercase small fw-semibold text-muted mb-2">Status obiegu</div>
            <div class="fw-semibold mb-2">{{ runMessage() || 'Oczekuje na uruchomienie' }}</div>
            <div class="text-muted-soft">Po pobraniu maili pojawi sie podsumowanie ostatniego przebiegu.</div>
          </div>
        </div>
      </div>

      <div class="row g-4 align-items-stretch">
        <div class="col-lg-5">
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
          </article>
        </div>

        <div class="col-lg-7">
          <article class="feature-tile h-100">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h2 class="h4 fw-bold mb-1">Stan ostatniego przebiegu</h2>
                <p class="section-copy mb-0">Tu widzisz wynik ostatniego pobrania skrzynki i tworzenia draftow.</p>
              </div>
              <span class="status-badge">Agent</span>
            </div>

            <div class="body-box">
              <p class="mb-0" *ngIf="runMessage(); else idle">{{ runMessage() }}</p>
              <ng-template #idle>
                <p class="mb-0">Agent jeszcze nie pobieral skrzynki w tej sesji.</p>
              </ng-template>
            </div>
          </article>
        </div>
      </div>

      <section class="inquiry-grid">
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

  constructor() {
    effect(() => {
      if (this.auth.user()) {
        void this.refresh();
      }
    });
  }

  async refresh(): Promise<void> {
    this.inquiries.set(await this.inquiryService.list());
  }

  async processInbox(): Promise<void> {
    const result = await this.inquiryService.processInbox();
    this.runMessage.set(
      `Przetworzono ${result.processed_messages} wiadomosci, utworzono ${result.inquiries_created} zapytan, ${result.estimates_created} kosztorysow i ${result.replies_prepared} draftow odpowiedzi.`,
    );
    await this.refresh();
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

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
