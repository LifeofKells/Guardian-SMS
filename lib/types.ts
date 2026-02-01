
export type Role = 'owner' | 'admin' | 'ops_manager' | 'officer' | 'client';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url?: string;
  client_id?: string; // If role is client, links to Client entity
  is_temporary_password?: boolean; // Forces password change on next login
}

export interface Client {
  id: string;
  name: string;
  status: 'active' | 'prospect' | 'terminated';
  contact_name: string;
  email: string;
  address: string;
  billing_settings?: {
    standard_rate: number;
    holiday_rate: number;
    emergency_rate: number;
  };
}

export interface Site {
  id: string;
  client_id: string;
  name: string;
  address: string;
  risk_level: 'low' | 'medium' | 'high';
  lat: number;
  lng: number;
  radius: number; // in meters, for geofencing
}

export interface Certification {
  id: string;
  name: string; // e.g. "BSIS Guard Card"
  number: string; // e.g. "G-123456"
  issue_date: string;
  expiry_date: string;
  type: 'guard_card' | 'firearm' | 'first_aid' | 'cpr' | 'other';
  status: 'active' | 'expired' | 'revoked';
  file_url?: string;
}

export interface Officer {
  id: string;
  full_name: string;
  email: string;
  badge_number: string;
  employment_status: 'active' | 'onboarding' | 'terminated';
  phone: string;
  skills: string[];
  certifications?: Certification[];
  financials?: {
    base_rate: number;
    overtime_rate?: number;
    deductions: Array<{ name: string; amount: number }>;
  };
}

export interface Shift {
  id: string;
  site_id: string;
  officer_id: string | null;
  start_time: string; // ISO string
  end_time: string; // ISO string
  status: 'draft' | 'published' | 'assigned' | 'completed';
  notes?: string;
  pay_rate?: number | null;
  bill_rate?: number | null;
  break_duration?: number; // in minutes
}

export interface TimeEntry {
  id: string;
  shift_id: string;
  officer_id: string;
  clock_in: string;
  clock_out?: string;
  total_hours: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  financial_snapshot?: {
      pay_rate: number;
      bill_rate: number;
  };
}

export interface Incident {
  id: string;
  site_id: string;
  officer_id: string;
  type: 'theft' | 'vandalism' | 'injury' | 'trespassing' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reported_at: string;
  status: 'open' | 'investigating' | 'closed';
}

export interface PayrollRun {
  id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: 'draft' | 'processing' | 'paid';
  officer_count: number;
  processed_at?: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  items?: Array<{ description: string; quantity: number; rate: number; amount: number }>;
}

export interface Feedback {
  id: string;
  client_id: string;
  shift_id: string;
  rating: number; // 1-5
  comments?: string;
  created_at: string;
  status: 'new' | 'reviewed';
}

export interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'process';
  description: string;
  performed_by: string; // User Name
  performed_by_id: string; // User ID
  target_resource: 'Shift' | 'Officer' | 'Client' | 'Site' | 'User' | 'TimeEntry' | 'Incident' | 'Payroll' | 'Invoice';
  target_id?: string;
  timestamp: string;
  metadata?: any;
}
