import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Inquiry } from './api.types';

const API_BASE = '/api';

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
}
