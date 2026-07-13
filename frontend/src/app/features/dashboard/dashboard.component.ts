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
    <section class="hero">
      <div>
        <p class="tag">Dashboard</p>
        <h1>Zapytania klientow i kosztorysy</h1>
        <p>Operator zalogowany jako {{ auth.user()?.full_name }} moze importowac cennik, pobierac maile i przegladac drafty odpowiedzi.</p>
      </div>
      <div class="hero-actions">
        <button class="btn secondary" (click)="logout()">Wyloguj</button>
        <button class="btn" (click)="processInbox()">Pobierz maile</button>
      </div>
    </section>

    <section class="grid layout">
      <article class="card panel">
        <h2>Cennik</h2>
        <p>Plik Excel powinien miec kolumny: sku, name, unit, price.</p>
        <input type="file" accept=".xlsx" (change)="onFileSelected($event)" />
        <p *ngIf="uploadMessage()">{{ uploadMessage() }}</p>
      </article>

      <article class="card panel">
        <h2>Stan ostatniego przebiegu</h2>
        <p *ngIf="runMessage(); else idle">{{ runMessage() }}</p>
        <ng-template #idle>
          <p>Agent jeszcze nie pobieral skrzynki w tej sesji.</p>
        </ng-template>
      </article>
    </section>

    <section class="grid inquiries">
      <article class="card inquiry" *ngFor="let inquiry of inquiries()">
        <div class="inquiry-head">
          <div>
            <h3>{{ inquiry.email_subject }}</h3>
            <p>{{ inquiry.email_from }} - {{ inquiry.created_at | date:'short' }}</p>
          </div>
          <span class="tag">{{ inquiry.status }}</span>
        </div>

        <p><strong>Powod klasyfikacji:</strong> {{ inquiry.classification_reason }}</p>
        <p>{{ inquiry.email_body }}</p>

        <div *ngIf="inquiry.estimate as estimate" class="estimate">
          <h4>Kosztorys</h4>
          <div *ngFor="let line of estimate.lines">
            {{ describeLine(line) }}
          </div>
          <p><strong>Suma:</strong> {{ estimate.total_net }} {{ estimate.currency }}</p>
        </div>

        <div *ngIf="inquiry.draft_reply" class="reply">
          <h4>Szkic odpowiedzi</h4>
          <pre>{{ inquiry.draft_reply }}</pre>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .hero {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: end;
      margin-bottom: 24px;
    }
    .hero h1 {
      font-size: 46px;
      margin: 8px 0;
    }
    .hero p {
      max-width: 720px;
      line-height: 1.6;
      margin: 0;
    }
    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .layout {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      margin-bottom: 24px;
    }
    .panel, .inquiry {
      padding: 24px;
    }
    .inquiries {
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    }
    .inquiry-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
    }
    h2, h3, h4 {
      margin-top: 0;
    }
    pre {
      white-space: pre-wrap;
      background: rgba(255,255,255,0.7);
      padding: 16px;
      border-radius: 14px;
      border: 1px solid var(--line);
    }
  `],
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
