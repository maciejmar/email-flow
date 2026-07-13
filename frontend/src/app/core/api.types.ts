export interface MailboxSettings {
  integration_mode: 'disabled' | 'imap';
  email_imap_host: string | null;
  email_imap_port: number;
  email_imap_username: string | null;
  email_imap_mailbox: string;
  email_imap_use_ssl: boolean;
  email_imap_search: string;
  email_smtp_host: string | null;
  email_smtp_port: number;
  email_smtp_username: string | null;
  email_smtp_use_ssl: boolean;
  email_smtp_from: string | null;
  has_imap_password: boolean;
  has_smtp_password: boolean;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  mailbox_settings: MailboxSettings;
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
