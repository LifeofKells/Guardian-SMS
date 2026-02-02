
export type Role = 'owner' | 'admin' | 'ops_manager' | 'officer' | 'client';

export interface Organization {
  id: string;
  name: string;
  owner_id: string; // User ID of the owner
  created_at: string;
  settings?: {
    timezone: string;
    currency: string;
  };
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  organization_id: string;
  avatar_url?: string;
  client_id?: string; // If role is client, links to Client entity
  is_temporary_password?: boolean; // Forces password change on next login
}

export interface Client {
  id: string;
  organization_id: string;
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
  organization_id: string;
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
  organization_id: string;
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
  organization_id: string;
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
  organization_id: string;
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
  organization_id: string;
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
  organization_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: 'draft' | 'processing' | 'paid';
  officer_count: number;
  processed_at?: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
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
  organization_id: string;
  client_id: string;
  shift_id: string;
  rating: number; // 1-5
  comments?: string;
  created_at: string;
  status: 'new' | 'reviewed';
}

export interface AuditLog {
  id: string;
  organization_id: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'process';
  description: string;
  performed_by: string; // User Name
  performed_by_id: string; // User ID
  target_resource: 'Shift' | 'Officer' | 'Client' | 'Site' | 'User' | 'TimeEntry' | 'Incident' | 'Payroll' | 'Invoice' | 'Expense' | 'Equipment' | 'Maintenance';
  target_id?: string;
  timestamp: string;
  metadata?: any;
}

// --- EXPENSE & EQUIPMENT TRACKING ---

export type ExpenseCategory =
  | 'mileage'
  | 'fuel'
  | 'parking'
  | 'supplies'
  | 'uniform'
  | 'training'
  | 'other';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Expense {
  id: string;
  organization_id: string;
  officer_id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string; // ISO string
  receipt_url?: string;
  status: ExpenseStatus;
  submitted_at: string;
  reviewed_by?: string; // User ID
  reviewed_at?: string;
  notes?: string; // Admin notes
  // For mileage tracking
  mileage?: {
    start_odometer: number;
    end_odometer: number;
    distance: number;
    rate_per_mile: number;
  };
}

export type EquipmentType =
  | 'radio'
  | 'vehicle'
  | 'uniform'
  | 'firearm'
  | 'baton'
  | 'flashlight'
  | 'body_camera'
  | 'other';

export type EquipmentStatus =
  | 'available'
  | 'assigned'
  | 'maintenance'
  | 'damaged'
  | 'lost'
  | 'retired';

export interface Equipment {
  id: string;
  organization_id: string;
  type: EquipmentType;
  name: string;
  identifier: string; // Serial number, asset tag, license plate
  purchase_date: string;
  purchase_price: number;
  current_value?: number;
  status: EquipmentStatus;
  assigned_to?: string; // Officer ID
  assigned_at?: string;
  location?: string;
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  organization_id: string;
  equipment_id: string;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  scheduled_date: string;
  completed_date?: string;
  cost?: number;
  performed_by?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface EquipmentLog {
  id: string;
  organization_id: string;
  equipment_id: string;
  action: 'check_out' | 'check_in' | 'transfer' | 'damage' | 'loss';
  officer_id: string;
  timestamp: string;
  notes?: string;
}

// --- PHASE 1: REAL-TIME OPERATIONS ---

export interface OfficerLocation {
  id: string;
  organization_id: string;
  officer_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  battery_level?: number;
  is_moving: boolean;
  shift_id?: string;
}

export interface PanicAlert {
  id: string;
  organization_id: string;
  officer_id: string;
  location: { lat: number; lng: number };
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  notes?: string;
}

export interface GeofenceEvent {
  id: string;
  organization_id: string;
  officer_id: string;
  site_id: string;
  event_type: 'enter' | 'exit';
  location: { lat: number; lng: number };
  distance_from_center: number;
  timestamp: string;
  acknowledged?: boolean;
}

// --- PHASE 1: ADVANCED SCHEDULING ---

export interface Availability {
  id: string;
  organization_id: string;
  officer_id: string;
  date: string; // YYYY-MM-DD
  available: boolean;
  start_time?: string; // HH:mm
  end_time?: string;   // HH:mm
  notes?: string;
}

export interface ShiftTemplate {
  id: string;
  organization_id: string;
  name: string;
  site_id: string;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  days_of_week: number[]; // 0=Sun, 6=Sat
  required_skills?: string[];
  bill_rate?: number;
  pay_rate?: number;
  is_active: boolean;
}

// --- REALTIME EVENT TYPES ---

export type RealtimeEventType =
  | 'officer_location'
  | 'clock_in'
  | 'clock_out'
  | 'panic_alert'
  | 'geofence_breach'
  | 'incident_reported'
  | 'shift_assigned';

export interface RealtimeEvent {
  id: string;
  organization_id: string;
  type: RealtimeEventType;
  payload: any;
  timestamp: string;
  officer_id?: string;
  site_id?: string;
}
