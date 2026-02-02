# Implementation Plan: Expense & Equipment Tracking

## Overview

This module will provide comprehensive expense management and equipment tracking capabilities for Guardian SMS, enabling officer reimbursements, vehicle expense tracking, asset management, and maintenance scheduling.

---

## Proposed Changes

### Data Models

#### [NEW] `lib/types.ts` - Type Definitions

**Expense Interface:**
```typescript
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
  equipment_id: string;
  action: 'check_out' | 'check_in' | 'transfer' | 'damage' | 'loss';
  officer_id: string;
  timestamp: string;
  notes?: string;
}
```

---

### Database Layer

#### [MODIFY] `lib/db.ts`

Add CRUD operations for expenses:
```typescript
expenses: {
  select: async () => ({ data: await fetchCollection<Expense>('expenses') }),
  create: async (expense: Omit<Expense, 'id'>) => {
    try {
      const docRef = await addDoc(collection(firestore, 'expenses'), expense);
      return { data: { ...expense, id: docRef.id } as Expense, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },
  update: async (id: string, data: Partial<Expense>) => {
    try {
      await updateDoc(doc(firestore, 'expenses', id), data);
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  },
  getFullExpenses: async () => {
    try {
      const [expenses, officers] = await Promise.all([
        fetchCollection<Expense>('expenses'),
        fetchCollection<Officer>('officers')
      ]);
      const officerMap = createLookup(officers);
      const data = expenses.map(exp => ({
        ...exp,
        officer: officerMap[exp.officer_id]
      }));
      data.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }
},
equipment: {
  select: async () => ({ data: await fetchCollection<Equipment>('equipment') }),
  create: async (item: Omit<Equipment, 'id'>) => {
    try {
      const docRef = await addDoc(collection(firestore, 'equipment'), item);
      return { data: { ...item, id: docRef.id } as Equipment, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },
  update: async (id: string, data: Partial<Equipment>) => {
    try {
      await updateDoc(doc(firestore, 'equipment', id), data);
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  },
  getFullEquipment: async () => {
    try {
      const [equipment, officers] = await Promise.all([
        fetchCollection<Equipment>('equipment'),
        fetchCollection<Officer>('officers')
      ]);
      const officerMap = createLookup(officers);
      const data = equipment.map(eq => ({
        ...eq,
        assigned_officer: eq.assigned_to ? officerMap[eq.assigned_to] : null
      }));
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }
},
maintenance: {
  select: async () => ({ data: await fetchCollection<MaintenanceRecord>('maintenance_records') }),
  create: async (record: Omit<MaintenanceRecord, 'id'>) => {
    try {
      const docRef = await addDoc(collection(firestore, 'maintenance_records'), record);
      return { data: { ...record, id: docRef.id } as MaintenanceRecord, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },
  update: async (id: string, data: Partial<MaintenanceRecord>) => {
    try {
      await updateDoc(doc(firestore, 'maintenance_records', id), data);
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }
},
equipmentLogs: {
  select: async () => ({ data: await fetchCollection<EquipmentLog>('equipment_logs') }),
  create: async (log: Omit<EquipmentLog, 'id'>) => {
    try {
      const docRef = await addDoc(collection(firestore, 'equipment_logs'), log);
      return { data: { ...log, id: docRef.id } as EquipmentLog, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }
}
```

Add seed data generation functions.

---

### UI Component

#### [NEW] `pages/Resources.tsx`

**Layout:**
- Tab-based interface with three sections:
  1. **Expenses** - Submit, review, track reimbursements
  2. **Equipment** - Asset registry with assignment tracking
  3. **Maintenance** - Schedule and track equipment servicing

**Features:**

**Expenses Tab:**
- **Submit Expense Form:**
  - Category dropdown (mileage, fuel, parking, etc.)
  - Amount input
  - Date picker
  - Description textarea
  - File upload for receipts (image preview)
  - Mileage calculator widget (for mileage category)
  
- **Expense List/Table:**
  - Status filter (pending/approved/rejected/paid)
  - Category filter
  - Date range filter
  - Sort by date, amount, status
  - Cards or rows showing:
    - Officer name + avatar
    - Category badge
    - Amount (highlighted)
    - Date
    - Status badge with color coding
    - "View Receipt" button
  
- **Approval Workflow (Manager view):**
  - Approve/Reject buttons
  - Add notes
  - Batch approval for multiple expenses
  
- **Summary Stats:**
  - Total pending amount
  - Total approved (current month)
  - Average processing time

**Equipment Tab:**
- **Add Equipment Form:**
  - Type select
  - Name, identifier (serial #)
  - Purchase date, price
  - Initial location
  
- **Equipment Grid/Table:**
  - Visual cards with:
    - Equipment type icon
    - Name/identifier
    - Status badge (color coded)
    - Assigned officer (if any)
    - Quick actions: Assign, Maintenance, Report Issue
  
- **Assignment Modal:**
  - Officer selector
  - Check-out date
  - Expected return date
  - Notes
  
- **Equipment Detail View:**
  - Full specs
  - Assignment history
  - Maintenance history timeline
  - Action buttons

**Maintenance Tab:**
- **Schedule Maintenance Form:**
  - Equipment selector
  - Type (routine/repair/inspection)
  - Scheduled date
  - Estimated cost
  
- **Maintenance Calendar:**
  - Monthly view with scheduled items
  - Overdue warnings
  
- **Maintenance Log Table:**
  - Filterable by equipment, status
  - Sortable by date
  - Complete maintenance action

---

## UI Component Structure

```
Resources.tsx
├── ExpensesTab
│   ├── ExpenseStats (summary cards)
│   ├── SubmitExpenseDialog
│   ├── ExpenseFilters
│   └── ExpenseList
│       └── ExpenseCard (with approval actions)
├── EquipmentTab
│   ├── EquipmentStats
│   ├── AddEquipmentDialog
│   ├── EquipmentFilters
│   └── EquipmentGrid
│       └── EquipmentCard (with quick actions)
└── MaintenanceTab
    ├── ScheduleMaintenanceDialog
    ├── MaintenanceCalendar
    └── MaintenanceLog
```

---

## File Upload Implementation

For receipt uploads, use Firebase Storage:

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

async function uploadReceipt(file: File, expenseId: string) {
  const storageRef = ref(storage, `receipts/${expenseId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}
```

---

## Seed Data

Generate sample data:
- 20-30 expenses across different categories and statuses
- 15-20 equipment items (vehicles, radios, uniforms)
- 5-10 maintenance records

---

## Navigation Integration

#### [MODIFY] `App.tsx`

Add menu item:
```typescript
{
  name: 'Resources',
  icon: Package,
  href: '/resources',
  roles: ['owner', 'admin', 'ops_manager']
}
```

Add route:
```typescript
<Route path="/resources" element={<Resources />} />
```

---

## Verification Plan

### Automated Tests
- Run `npm run dev` to verify no build errors
- Test form submissions
- Test filtering and sorting
- Verify file upload functionality

### Manual Verification
1. **Expenses:**
   - Submit expense as officer role
   - Approve/reject as manager
   - Upload and view receipt
2. **Equipment:**
   - Add new equipment item
   - Assign to officer
   - Check assignment history
3. **Maintenance:**
   - Schedule maintenance
   - Mark as completed
   - View maintenance log

### Browser Testing
- Use browser subagent to capture screenshots of all tabs
- Verify responsive layout on mobile

---

## Future Enhancements (Out of Scope)

- Import equipment from CSV
- Export expense reports to Excel
- Email notifications for approvals
- Equipment QR code generation
- Mobile app integration for on-the-go expense submission
