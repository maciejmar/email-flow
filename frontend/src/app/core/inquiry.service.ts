import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Inquiry, MailboxSettings } from './api.types';

const API_BASE = 'api';

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private http = inject(HttpClient);

  list(): Promise<Inquiry[]> {
    return firstValueFrom(this.http.get<Inquiry[]>(`${API_BASE}/inquiries`));
  }

  processInbox(): Promise<{
    processed_messages: number;
    inquiries_created: number;
    estimates_created: number;
    replies_prepared: number;
  }> {
    return firstValueFrom(this.http.post<any>(`${API_BASE}/agent/process-inbox`, {}));
  }

  async uploadPricing(file: File): Promise<{ imported_products: number }> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(
      this.http.post<{ imported_products: number }>(`${API_BASE}/pricing/upload`, formData),
    );
  }

  getMailboxSettings(): Promise<MailboxSettings> {
    return firstValueFrom(this.http.get<MailboxSettings>(`${API_BASE}/auth/mailbox`));
  }

  updateMailboxSettings(payload: {
    integration_mode: 'disabled' | 'imap';
    email_imap_host: string | null;
    email_imap_port: number;
    email_imap_username: string | null;
    email_imap_password: string | null;
    email_imap_mailbox: string;
    email_imap_use_ssl: boolean;
    email_imap_search: string;
    email_smtp_host: string | null;
    email_smtp_port: number;
    email_smtp_username: string | null;
    email_smtp_password: string | null;
    email_smtp_use_ssl: boolean;
    email_smtp_from: string | null;
  }): Promise<MailboxSettings> {
    return firstValueFrom(this.http.put<MailboxSettings>(`${API_BASE}/auth/mailbox`, payload));
  }
}
