export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface EstimateLine {
  id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit: string;
  unit_price: string;
  line_total: string;
}

export interface Estimate {
  id: number;
  total_net: string;
  currency: string;
  notes: string;
  lines: EstimateLine[];
}

export interface Inquiry {
  id: number;
  email_from: string;
  email_subject: string;
  email_body: string;
  classification_reason: string;
  draft_reply: string | null;
  status: string;
  created_at: string;
  estimate: Estimate | null;
}

