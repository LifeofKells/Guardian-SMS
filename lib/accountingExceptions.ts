import type { Client, TimeEntry } from './types';

export type EnrichedTimeEntry = TimeEntry & {
  officer?: any;
  shift?: any;
};

export type AccountingExceptionType =
  | 'missing_approval'
  | 'overtime'
  | 'rate_mismatch'
  | 'duplicate_entry'
  | 'unbilled_entry';

export type AccountingExceptionSeverity = 'low' | 'medium' | 'high';

export interface AccountingException {
  id: string;
  type: AccountingExceptionType;
  severity: AccountingExceptionSeverity;
  title: string;
  description: string;
  action: 'approve_entry' | 'open_invoice' | 'review';
  entry_ids: string[];
  entry_count: number;
  hours?: number;
  amount?: number;
  officer_id?: string;
  officer_name?: string;
  client_id?: string;
  client_name?: string;
  site_name?: string;
  oldest_at?: string;
}

export interface AccountingExceptionSummary {
  total: number;
  high_severity: number;
  payroll_blockers: number;
  revenue_at_risk: number;
}

export interface AccountingExceptionData {
  exceptions: AccountingException[];
  summary: AccountingExceptionSummary;
  type_counts: Record<AccountingExceptionType, number>;
  unbilled_entries: EnrichedTimeEntry[];
  payroll_ready_entries: EnrichedTimeEntry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isInvoiced(entry: EnrichedTimeEntry) {
  return entry.billing_status === 'invoiced' || !!entry.invoice_id;
}

function isPayrollProcessed(entry: EnrichedTimeEntry) {
  return entry.payroll_status === 'processed' || !!entry.payroll_run_id;
}

function getClient(entry: EnrichedTimeEntry, clientsById: Map<string, Client>) {
  const embeddedClient = entry.shift?.site?.client;
  if (embeddedClient?.id) return embeddedClient;
  const clientId = entry.shift?.site?.client_id;
  if (!clientId) return null;
  return clientsById.get(clientId) || null;
}

export function getEntryPayRate(entry: EnrichedTimeEntry) {
  return entry.financial_snapshot?.pay_rate
    ?? entry.shift?.pay_rate
    ?? entry.officer?.financials?.base_rate
    ?? null;
}

export function getEntryBillRate(entry: EnrichedTimeEntry, clientsById: Map<string, Client>) {
  const client = getClient(entry, clientsById);
  return entry.financial_snapshot?.bill_rate
    ?? entry.shift?.bill_rate
    ?? client?.billing_settings?.standard_rate
    ?? null;
}

function getSeverityRank(severity: AccountingExceptionSeverity) {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

function overlaps(a: EnrichedTimeEntry, b: EnrichedTimeEntry) {
  const aStart = new Date(a.clock_in).getTime();
  const aEnd = new Date(a.clock_out || a.clock_in).getTime();
  const bStart = new Date(b.clock_in).getTime();
  const bEnd = new Date(b.clock_out || b.clock_in).getTime();

  if (!Number.isFinite(aStart) || !Number.isFinite(aEnd) || !Number.isFinite(bStart) || !Number.isFinite(bEnd)) {
    return false;
  }

  return aStart < bEnd && bStart < aEnd;
}

export function buildAccountingExceptionData({
  entries,
  clients,
  payPeriodStart,
  payPeriodEnd
}: {
  entries: EnrichedTimeEntry[];
  clients: Client[];
  payPeriodStart: string;
  payPeriodEnd: string;
}): AccountingExceptionData {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const normalizedEntries = entries.filter(Boolean);
  const now = Date.now();
  const recentWindow = now - (30 * DAY_MS);
  const startDate = new Date(payPeriodStart);
  const endDate = new Date(payPeriodEnd);
  endDate.setHours(23, 59, 59, 999);

  const unbilledEntries = normalizedEntries.filter((entry) =>
    entry.status === 'approved' &&
    !isInvoiced(entry) &&
    new Date(entry.clock_in).getTime() >= recentWindow
  );

  const payrollReadyEntries = normalizedEntries.filter((entry) => {
    const entryDate = new Date(entry.clock_in);
    return entry.status === 'approved' &&
      !isPayrollProcessed(entry) &&
      entryDate >= startDate &&
      entryDate <= endDate;
  });

  const exceptions: AccountingException[] = [];

  normalizedEntries
    .filter((entry) => entry.status === 'pending')
    .forEach((entry) => {
      const ageDays = Math.floor((now - new Date(entry.clock_in).getTime()) / DAY_MS);
      if (ageDays < 1) return;

      exceptions.push({
        id: `pending-${entry.id}`,
        type: 'missing_approval',
        severity: ageDays >= 3 ? 'high' : 'medium',
        title: 'Pending approval is blocking payroll',
        description: `${entry.officer?.full_name || 'Officer'} still has ${Number(entry.total_hours || 0).toFixed(1)} hours pending from ${entry.shift?.site?.name || 'an unknown site'}.`,
        action: 'approve_entry',
        entry_ids: [entry.id],
        entry_count: 1,
        hours: entry.total_hours || 0,
        officer_id: entry.officer_id,
        officer_name: entry.officer?.full_name,
        client_id: entry.shift?.site?.client_id,
        client_name: getClient(entry, clientsById)?.name,
        site_name: entry.shift?.site?.name,
        oldest_at: entry.clock_in
      });
    });

  const overtimeByOfficer = new Map<string, {
    officer_id?: string;
    officer_name?: string;
    hours: number;
    amount: number;
    entry_ids: string[];
    oldest_at?: string;
  }>();

  payrollReadyEntries.forEach((entry) => {
    const overtimeHours = Math.max(0, (entry.total_hours || 0) - 8);
    if (overtimeHours <= 0) return;

    const payRate = getEntryPayRate(entry) || 20;
    const overtimeRate = entry.officer?.financials?.overtime_rate || (payRate * 1.5);
    const key = entry.officer_id || entry.id;
    const current = overtimeByOfficer.get(key) || {
      officer_id: entry.officer_id,
      officer_name: entry.officer?.full_name,
      hours: 0,
      amount: 0,
      entry_ids: [],
      oldest_at: entry.clock_in
    };

    current.hours += overtimeHours;
    current.amount += overtimeHours * overtimeRate;
    current.entry_ids.push(entry.id);
    if (!current.oldest_at || new Date(entry.clock_in).getTime() < new Date(current.oldest_at).getTime()) {
      current.oldest_at = entry.clock_in;
    }

    overtimeByOfficer.set(key, current);
  });

  overtimeByOfficer.forEach((item, key) => {
    exceptions.push({
      id: `overtime-${key}`,
      type: 'overtime',
      severity: item.hours >= 8 ? 'high' : 'medium',
      title: 'Overtime requires payroll review',
      description: `${item.officer_name || 'Officer'} has ${item.hours.toFixed(1)} overtime hours in the selected pay period.`,
      action: 'review',
      entry_ids: item.entry_ids,
      entry_count: item.entry_ids.length,
      hours: item.hours,
      amount: item.amount,
      officer_id: item.officer_id,
      officer_name: item.officer_name,
      oldest_at: item.oldest_at
    });
  });

  normalizedEntries.forEach((entry) => {
    const client = getClient(entry, clientsById);
    const appliedPayRate = getEntryPayRate(entry);
    const appliedBillRate = getEntryBillRate(entry, clientsById);
    const basePayRate = entry.officer?.financials?.base_rate ?? null;
    const standardBillRate = client?.billing_settings?.standard_rate ?? null;

    const isMissingRateData = appliedPayRate == null || appliedBillRate == null;
    const payMismatch = appliedPayRate != null && basePayRate != null && Math.abs(appliedPayRate - basePayRate) > 0.01;
    const billMismatch = appliedBillRate != null && standardBillRate != null && Math.abs(appliedBillRate - standardBillRate) > 0.01;

    if (!isMissingRateData && !payMismatch && !billMismatch) return;

    exceptions.push({
      id: `rate-${entry.id}`,
      type: 'rate_mismatch',
      severity: isMissingRateData ? 'high' : 'medium',
      title: isMissingRateData ? 'Missing rate data' : 'Rate override requires review',
      description: isMissingRateData
        ? `${entry.officer?.full_name || 'Officer'} has an entry without a complete pay or bill rate for ${entry.shift?.site?.name || 'this site'}.`
        : `${entry.officer?.full_name || 'Officer'} worked a shift with pay/bill rates that differ from the default setup.`,
      action: 'review',
      entry_ids: [entry.id],
      entry_count: 1,
      hours: entry.total_hours || 0,
      officer_id: entry.officer_id,
      officer_name: entry.officer?.full_name,
      client_id: client?.id,
      client_name: client?.name,
      site_name: entry.shift?.site?.name,
      oldest_at: entry.clock_in
    });
  });

  const seenDuplicates = new Set<string>();
  const entriesByOfficer = new Map<string, EnrichedTimeEntry[]>();

  normalizedEntries.forEach((entry) => {
    const key = entry.officer_id || 'unassigned';
    const current = entriesByOfficer.get(key) || [];
    current.push(entry);
    entriesByOfficer.set(key, current);
  });

  entriesByOfficer.forEach((officerEntries) => {
    officerEntries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

    for (let i = 0; i < officerEntries.length; i++) {
      for (let j = i + 1; j < officerEntries.length; j++) {
        const a = officerEntries[i];
        const b = officerEntries[j];
        const sameShift = !!a.shift_id && a.shift_id === b.shift_id;
        const sameDay = new Date(a.clock_in).toDateString() === new Date(b.clock_in).toDateString();
        if (!sameShift && !(sameDay && overlaps(a, b))) continue;

        const pairId = [a.id, b.id].sort().join(':');
        if (seenDuplicates.has(pairId)) continue;
        seenDuplicates.add(pairId);

        exceptions.push({
          id: `duplicate-${pairId}`,
          type: 'duplicate_entry',
          severity: 'high',
          title: 'Potential duplicate time entry',
          description: `${a.officer?.full_name || 'Officer'} has overlapping or duplicate entries that should be reconciled before billing or payroll.`,
          action: 'review',
          entry_ids: [a.id, b.id],
          entry_count: 2,
          hours: (a.total_hours || 0) + (b.total_hours || 0),
          officer_id: a.officer_id,
          officer_name: a.officer?.full_name,
          client_id: a.shift?.site?.client_id || b.shift?.site?.client_id,
          client_name: getClient(a, clientsById)?.name || getClient(b, clientsById)?.name,
          site_name: a.shift?.site?.name || b.shift?.site?.name,
          oldest_at: a.clock_in
        });
      }
    }
  });

  const agedUnbilledByClient = new Map<string, {
    client_id?: string;
    client_name?: string;
    hours: number;
    amount: number;
    entry_ids: string[];
    oldest_at?: string;
  }>();

  unbilledEntries.forEach((entry) => {
    const ageDays = Math.floor((now - new Date(entry.clock_in).getTime()) / DAY_MS);
    if (ageDays < 7) return;

    const client = getClient(entry, clientsById);
    const key = client?.id || 'unknown-client';
    const current = agedUnbilledByClient.get(key) || {
      client_id: client?.id,
      client_name: client?.name || 'Unknown Client',
      hours: 0,
      amount: 0,
      entry_ids: [],
      oldest_at: entry.clock_in
    };

    current.hours += entry.total_hours || 0;
    current.amount += (entry.total_hours || 0) * (getEntryBillRate(entry, clientsById) || 45);
    current.entry_ids.push(entry.id);
    if (!current.oldest_at || new Date(entry.clock_in).getTime() < new Date(current.oldest_at).getTime()) {
      current.oldest_at = entry.clock_in;
    }

    agedUnbilledByClient.set(key, current);
  });

  agedUnbilledByClient.forEach((item, key) => {
    const oldestDays = item.oldest_at ? Math.floor((now - new Date(item.oldest_at).getTime()) / DAY_MS) : 0;
    exceptions.push({
      id: `unbilled-${key}`,
      type: 'unbilled_entry',
      severity: oldestDays >= 14 || item.amount >= 2500 ? 'high' : 'medium',
      title: 'Approved work has not been invoiced',
      description: `${item.client_name} has ${item.hours.toFixed(1)} approved hours still waiting to be billed.`,
      action: 'open_invoice',
      entry_ids: item.entry_ids,
      entry_count: item.entry_ids.length,
      hours: item.hours,
      amount: item.amount,
      client_id: item.client_id,
      client_name: item.client_name,
      oldest_at: item.oldest_at
    });
  });

  exceptions.sort((a, b) => {
    const severityDelta = getSeverityRank(b.severity) - getSeverityRank(a.severity);
    if (severityDelta !== 0) return severityDelta;
    return new Date(b.oldest_at || 0).getTime() - new Date(a.oldest_at || 0).getTime();
  });

  const typeCounts: Record<AccountingExceptionType, number> = {
    missing_approval: 0,
    overtime: 0,
    rate_mismatch: 0,
    duplicate_entry: 0,
    unbilled_entry: 0
  };

  exceptions.forEach((exception) => {
    typeCounts[exception.type] += 1;
  });

  const summary: AccountingExceptionSummary = {
    total: exceptions.length,
    high_severity: exceptions.filter((exception) => exception.severity === 'high').length,
    payroll_blockers: exceptions.filter((exception) =>
      exception.type === 'missing_approval' ||
      exception.type === 'duplicate_entry' ||
      exception.type === 'rate_mismatch'
    ).length,
    revenue_at_risk: exceptions
      .filter((exception) => exception.type === 'unbilled_entry')
      .reduce((sum, exception) => sum + (exception.amount || 0), 0)
  };

  return {
    exceptions,
    summary,
    type_counts: typeCounts,
    unbilled_entries: unbilledEntries,
    payroll_ready_entries: payrollReadyEntries
  };
}
