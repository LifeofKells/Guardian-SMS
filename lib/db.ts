
import { firestore } from './firebase';
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    doc,
    writeBatch,
    updateDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    type QueryConstraint
} from 'firebase/firestore';
import { Client, Officer, Shift, Site, TimeEntry, User, Incident, PayrollRun, Invoice, Certification, Feedback, AuditLog, Expense, Equipment, MaintenanceRecord, EquipmentLog, Availability, ShiftTemplate, OfficerLocation, PanicAlert, GeofenceEvent, Organization } from './types';

// --- HELPERS ---
const generateId = () => Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// --- DATA GENERATORS ---

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Lisa', 'Nancy', 'Daniel', 'Paul', 'Mark', 'Donald', 'George', 'Kenneth', 'Steven', 'Edward'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris'];

const COMPANY_PREFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Apex', 'Summit', 'Global', 'Prime', 'Elite', 'Titan', 'Omega', 'Vanguard', 'Sentinel', 'Shield', 'Iron', 'Steel', 'Core', 'Nexus', 'Vertex', 'Horizon'];
const COMPANY_SUFFIXES = ['Corp', 'Inc', 'Ltd', 'Solutions', 'Systems', 'Security', 'Group', 'Holdings', 'Industries', 'Logistics', 'Properties', 'Management'];
const STREET_NAMES = ['Main', 'Broadway', 'Market', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Washington', 'Adams', 'Jefferson', 'Highland', 'Sunset', 'Park', 'Lake'];

const STATIC_CLIENT_DATA = [
    { name: 'TechGlobal HQ', address: '101 Cyberdyne Way', contact: 'Sarah Connor', email: 'sarah@techglobal.com' },
    { name: 'Metro Mall', address: '400 Retail Row', contact: 'Paul Blart', email: 'pblart@metromall.com' },
    { name: 'Harbor Logistics', address: 'Pier 14', contact: 'Frank Sobotka', email: 'frank@harbor.com' },
    { name: 'City General Hospital', address: '500 Medical Center Dr', contact: 'Dr. House', email: 'admin@citygen.org' },
    { name: 'Skyline Apartments', address: '8800 Sunset Blvd', contact: 'Mr. Roper', email: 'manager@skyline.com' },
    { name: 'Apex Manufacturing', address: '22 Industrial Pkwy', contact: 'Tony Stark', email: 'tony@apex.com' },
    { name: 'Westside High', address: '1200 Education Ln', contact: 'Principal Skinner', email: 'admin@westside.edu' },
    { name: 'Silver Creek Estate', address: '1 Country Club Rd', contact: 'Bruce Wayne', email: 'bruce@wayne.com' }
];

const SITE_NAMES = ['Main Entrance', 'North Gate', 'Loading Dock', 'Parking Structure', 'Lobby', 'Server Room', 'Perimeter Patrol', 'VIP Wing', 'South Gate', 'Warehouse A', 'Executive Suite'];
const OFFICER_SKILLS = ['armed', 'k9', 'cpr', 'first_aid', 'hazmat', 'investigation', 'manager', 'driver', 'fire_safety', 'access_control'];

function generateRandomClientName() {
    return `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
}

function generateCertifications(): Certification[] {
    const certs: Certification[] = [];

    // Guard Card (Almost everyone has one)
    if (Math.random() > 0.1) {
        const issueDate = new Date();
        issueDate.setFullYear(issueDate.getFullYear() - randomInt(0, 3));
        const expiryDate = new Date(issueDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);

        certs.push({
            id: generateId(),
            name: 'State Guard Card',
            number: `GC-${randomInt(100000, 999999)}`,
            issue_date: issueDate.toISOString(),
            expiry_date: expiryDate.toISOString(),
            type: 'guard_card',
            status: new Date() > expiryDate ? 'expired' : 'active'
        });
    }

    // Firearm Permit
    if (Math.random() > 0.7) {
        const issueDate = new Date();
        issueDate.setFullYear(issueDate.getFullYear() - randomInt(0, 1));
        const expiryDate = new Date(issueDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year renewal for firearms often

        certs.push({
            id: generateId(),
            name: 'Firearm Permit (Exposed)',
            number: `FQ-${randomInt(10000, 99999)}`,
            issue_date: issueDate.toISOString(),
            expiry_date: expiryDate.toISOString(),
            type: 'firearm',
            status: new Date() > expiryDate ? 'expired' : 'active'
        });
    }

    return certs;
}

function generateOfficers(count: number, orgId: string): Officer[] {
    const officers: Officer[] = [];
    for (let i = 0; i < count; i++) {
        const first = pick(FIRST_NAMES);
        const last = pick(LAST_NAMES);
        const baseRate = randomInt(18, 32);

        officers.push({
            id: generateId(),
            organization_id: orgId,
            full_name: `${first} ${last}`,
            email: `${first.toLowerCase()}.${last.toLowerCase()}${randomInt(1, 99)}@guardian.com`,
            badge_number: `${pick(['A', 'B', 'C', 'K9', 'S'])}-${randomInt(100, 9999)}`,
            employment_status: Math.random() > 0.9 ? 'terminated' : (Math.random() > 0.8 ? 'onboarding' : 'active'),
            phone: `555-01${randomInt(10, 99)}`,
            skills: [pick(OFFICER_SKILLS), pick(OFFICER_SKILLS), pick(OFFICER_SKILLS)].filter((v, i, a) => a.indexOf(v) === i),
            certifications: generateCertifications(),
            financials: {
                base_rate: baseRate,
                overtime_rate: Math.ceil(baseRate * 1.5),
                deductions: Math.random() > 0.7 ? [{ name: 'Uniform Rental', amount: 5.00 }] : []
            }
        });
    }
    return officers;
}

function generateClientsAndSites(count: number, orgId: string): { clients: Client[], sites: Site[] } {
    const clients: Client[] = [];
    const sites: Site[] = [];

    // Base coordinates (e.g., Downtown Los Angeles)
    const BASE_LAT = 34.0522;
    const BASE_LNG = -118.2437;

    for (let i = 0; i < count; i++) {
        // Use static data if available, else generate
        const staticData = i < STATIC_CLIENT_DATA.length ? STATIC_CLIENT_DATA[i] : null;
        const name = staticData ? staticData.name : generateRandomClientName();
        const address = staticData ? staticData.address : `${randomInt(100, 9999)} ${pick(STREET_NAMES)} St`;
        const contact = staticData ? staticData.contact : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        const email = staticData ? staticData.email : `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`;

        const clientId = generateId();
        clients.push({
            id: clientId,
            organization_id: orgId,
            name: name,
            status: Math.random() > 0.85 ? 'prospect' : 'active',
            contact_name: contact,
            email: email,
            address: address,
            billing_settings: {
                standard_rate: randomInt(45, 65),
                holiday_rate: randomInt(70, 95),
                emergency_rate: randomInt(80, 100)
            }
        });

        // Generate 1-4 sites per client
        const numSites = randomInt(1, 4);
        for (let j = 0; j < numSites; j++) {
            sites.push({
                id: generateId(),
                organization_id: orgId,
                client_id: clientId,
                name: `${pick(SITE_NAMES)} ${j + 1}`,
                address: `${address}, Unit ${j + 100}`,
                risk_level: pick(['low', 'medium', 'high'] as const),
                // Spread sites around base location by ~10-20km
                lat: BASE_LAT + randomFloat(-0.15, 0.15),
                lng: BASE_LNG + randomFloat(-0.15, 0.15),
                radius: randomInt(100, 500)
            });
        }
    }
    return { clients, sites };
}

function generateShifts(sites: Site[], officers: Officer[], daysBack: number, daysForward: number, orgId: string): { shifts: Shift[], timeEntries: TimeEntry[] } {
    const shifts: Shift[] = [];
    const entries: TimeEntry[] = [];
    const activeOfficers = officers.filter(o => o.employment_status === 'active');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Iterate through days
    for (let d = -daysBack; d <= daysForward; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);

        // For each site, decide if it has shifts today (70% chance)
        sites.forEach(site => {
            if (Math.random() > 0.3) {
                const numShifts = randomInt(1, 2);
                for (let s = 0; s < numShifts; s++) {
                    const startHour = pick([6, 7, 8, 14, 15, 16, 22, 23]);
                    const duration = 8;
                    const startTime = new Date(date);
                    startTime.setHours(startHour, 0, 0, 0);
                    const endTime = new Date(startTime);
                    endTime.setHours(startHour + duration, 0, 0, 0);

                    // Assign officer?
                    // Past shifts usually assigned (95%). Future shifts assigned (80%).
                    const isPast = d < 0;
                    const assignChance = isPast ? 0.95 : 0.8;
                    const officer = Math.random() < assignChance ? pick(activeOfficers) : null;

                    let status: Shift['status'] = 'draft';
                    if (officer) {
                        if (isPast) status = 'completed';
                        else status = 'assigned';
                    } else {
                        status = 'published';
                    }

                    const shiftId = generateId();
                    shifts.push({
                        id: shiftId,
                        organization_id: orgId,
                        site_id: site.id,
                        officer_id: officer ? officer.id : null,
                        start_time: startTime.toISOString(),
                        end_time: endTime.toISOString(),
                        status: status
                    });

                    // If past and assigned, create time entry (completed shift)
                    if (isPast && officer && status === 'completed') {
                        // 90% attendance rate
                        if (Math.random() < 0.9) {
                            const clockIn = new Date(startTime);
                            clockIn.setMinutes(randomInt(-10, 20)); // Arrive early or late

                            const clockOut = new Date(endTime);
                            clockOut.setMinutes(randomInt(0, 15)); // Leave slightly late

                            const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
                            const hasNotes = Math.random() > 0.9;

                            entries.push({
                                id: generateId(),
                                organization_id: orgId,
                                shift_id: shiftId,
                                officer_id: officer.id,
                                clock_in: clockIn.toISOString(),
                                clock_out: clockOut.toISOString(),
                                total_hours: totalHours,
                                status: Math.random() > 0.1 ? 'approved' : 'pending',
                                ...(hasNotes ? { notes: 'Automated entry log' } : {}),
                                financial_snapshot: {
                                    pay_rate: officer.financials?.base_rate || 20,
                                    bill_rate: 45 // simplified mock
                                }
                            });
                        }
                    }
                }
            }
        });
    }
    return { shifts, timeEntries: entries };
}

function generateIncidents(sites: Site[], officers: Officer[], count: number, orgId: string): Incident[] {
    const incidents: Incident[] = [];
    const activeOfficers = officers.filter(o => o.employment_status === 'active');

    for (let i = 0; i < count; i++) {
        const site = pick(sites);
        const officer = pick(activeOfficers);
        const date = new Date();
        date.setDate(date.getDate() - randomInt(0, 60)); // Incidents in last 60 days

        incidents.push({
            id: generateId(),
            organization_id: orgId,
            site_id: site.id,
            officer_id: officer.id,
            type: pick(['theft', 'vandalism', 'injury', 'trespassing', 'other'] as const),
            severity: pick(['low', 'medium', 'high', 'critical'] as const),
            description: `Incident reported at ${site.name}. Routine patrol discovered anomaly.`,
            reported_at: date.toISOString(),
            status: pick(['open', 'investigating', 'closed'] as const)
        });
    }
    return incidents;
}

function generateAccountingData(clients: Client[], orgId: string): { payrolls: PayrollRun[], invoices: Invoice[] } {
    const payrolls: PayrollRun[] = [];
    const invoices: Invoice[] = [];

    // Mock 4 past payroll runs
    for (let i = 1; i <= 4; i++) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - (i * 14));
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 13);

        payrolls.push({
            id: generateId(),
            organization_id: orgId,
            period_start: startDate.toISOString(),
            period_end: endDate.toISOString(),
            total_amount: randomInt(25000, 45000),
            status: 'paid',
            officer_count: randomInt(20, 40),
            processed_at: new Date(endDate.getTime() + 86400000).toISOString()
        });
    }

    // Mock Invoices (More density)
    clients.forEach(c => {
        // Create 2-5 past invoices per client
        const count = randomInt(2, 5);
        for (let j = 0; j < count; j++) {
            const issueDate = new Date();
            issueDate.setDate(issueDate.getDate() - randomInt(5, 90));
            const dueDate = new Date(issueDate);
            dueDate.setDate(dueDate.getDate() + 30);

            // Dynamic rate from client
            const rate = c.billing_settings?.standard_rate || 45;

            invoices.push({
                id: generateId(),
                organization_id: orgId,
                client_id: c.id,
                invoice_number: `INV-${randomInt(10000, 99999)}`,
                issue_date: issueDate.toISOString(),
                due_date: dueDate.toISOString(),
                amount: randomInt(2000, 12000),
                status: pick(['paid', 'paid', 'paid', 'sent', 'overdue']),
                items: [
                    { description: 'Security Services - Regular Hours', quantity: randomInt(100, 200), rate: rate, amount: 0 }
                ]
            });
            // Fix amount in items and total
            invoices[invoices.length - 1].items![0].amount = invoices[invoices.length - 1].items![0].quantity * rate;
            invoices[invoices.length - 1].amount = invoices[invoices.length - 1].items![0].amount;
        }
    });

    return { payrolls, invoices };
}


// --- HELPER: Fetch all docs from collection (Org Filtered) ---
async function fetchCollection<T>(collectionName: string, organizationId: string): Promise<T[]> {
    const q = query(collection(firestore, collectionName), where('organization_id', '==', organizationId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as T;
    });
}

// --- HELPER: Create Lookup Map ---
function createLookup<T>(items: T[], key: keyof T = 'id' as keyof T): Record<string, T> {
    return items.reduce((acc, item) => {
        acc[String(item[key])] = item;
        return acc;
    }, {} as Record<string, T>);
}

// --- REAL FIREBASE ADAPTER ---

export const db = {
    users: {
        get: async (id: string) => {
            try {
                const docRef = await getDoc(doc(firestore, 'users', id));
                if (docRef.exists()) return { data: { ...docRef.data(), id: docRef.id } as User, error: null };
                return { data: null, error: 'User not found' };
            } catch (e: any) { return { data: null, error: e }; }
        },
        create: async (user: User) => {
            try {
                await setDoc(doc(firestore, 'users', user.id), user);
                return { data: user, error: null };
            } catch (e: any) { return { data: null, error: e }; }
        },
        update: async (id: string, data: Partial<User>) => {
            try {
                await updateDoc(doc(firestore, 'users', id), data);
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        getByClient: async (clientId: string) => {
            try {
                const q = query(collection(firestore, 'users'), where("client_id", "==", clientId));
                const querySnapshot = await getDocs(q);
                const users = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
                return { data: users, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        getByEmail: async (email: string) => {
            try {
                const q = query(collection(firestore, 'users'), where("email", "==", email), limit(1));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) return { data: null, error: 'User not found' };
                const user = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id } as User;
                return { data: user, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    organizations: {
        get: async (id: string) => {
            try {
                const docRef = await getDoc(doc(firestore, 'organizations', id));
                if (docRef.exists()) return { data: { ...docRef.data(), id: docRef.id } as Organization, error: null };
                return { data: null, error: 'Organization not found' };
            } catch (e: any) { return { data: null, error: e }; }
        },
        create: async (org: Organization) => {
            try {
                await setDoc(doc(firestore, 'organizations', org.id), org);
                return { data: org, error: null };
            } catch (e: any) { return { data: null, error: e }; }
        }
    },
    clients: {
        select: async (orgId: string) => ({ data: await fetchCollection<Client>('clients', orgId) }),
        create: async (client: Omit<Client, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'clients'), client);
                return { data: { ...client, id: docRef.id } as Client, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        update: async (id: string, data: Partial<Client>) => {
            try {
                await updateDoc(doc(firestore, 'clients', id), data);
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'clients', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        }
    },
    sites: {
        select: async (orgId: string) => ({ data: await fetchCollection<Site>('sites', orgId) }),
        create: async (site: Omit<Site, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'sites'), site);
                return { data: { ...site, id: docRef.id } as Site, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    officers: {
        select: async (orgId: string) => ({ data: await fetchCollection<Officer>('officers', orgId) }),
        create: async (officer: Omit<Officer, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'officers'), officer);
                return { data: { ...officer, id: docRef.id } as Officer, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        update: async (id: string, data: Partial<Officer>) => {
            try {
                await updateDoc(doc(firestore, 'officers', id), data);
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        }
    },
    shifts: {
        select: async (orgId: string) => ({ data: await fetchCollection<Shift>('shifts', orgId) }),
        create: async (shift: Omit<Shift, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'shifts'), shift);
                return { data: { ...shift, id: docRef.id } as Shift, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        update: async (id: string, data: Partial<Shift>) => {
            try {
                await updateDoc(doc(firestore, 'shifts', id), data);
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'shifts', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        }
    },
    time_entries: {
        select: async (orgId: string) => ({ data: await fetchCollection<TimeEntry>('time_entries', orgId) }),
        create: async (entry: Omit<TimeEntry, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'time_entries'), entry);
                return { data: { ...entry, id: docRef.id } as TimeEntry, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        update: async (id: string, data: Partial<TimeEntry>) => {
            try {
                await updateDoc(doc(firestore, 'time_entries', id), data);
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        }
    },
    incidents: {
        select: async (orgId: string) => ({ data: await fetchCollection<Incident>('incidents', orgId) }),
        create: async (incident: Omit<Incident, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'incidents'), incident);
                return { data: { ...incident, id: docRef.id } as Incident, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    payrolls: {
        select: async (orgId: string) => ({ data: await fetchCollection<PayrollRun>('payrolls', orgId) }),
        create: async (run: Omit<PayrollRun, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'payrolls'), run);
                return { data: { ...run, id: docRef.id } as PayrollRun, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    invoices: {
        select: async (orgId: string) => ({ data: await fetchCollection<Invoice>('invoices', orgId) }),
        create: async (inv: Omit<Invoice, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'invoices'), inv);
                return { data: { ...inv, id: docRef.id } as Invoice, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    feedback: {
        select: async (orgId: string) => ({ data: await fetchCollection<Feedback>('feedback', orgId) }),
        create: async (fb: Omit<Feedback, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'feedback'), fb);
                return { data: { ...fb, id: docRef.id } as Feedback, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    audit_logs: {
        select: async (orgId: string) => {
            try {
                const logs = await fetchCollection<AuditLog>('audit_logs', orgId);
                logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                return { data: logs, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        create: async (log: Omit<AuditLog, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'audit_logs'), log);
                return { data: { ...log, id: docRef.id } as AuditLog, error: null };
            } catch (e: any) {
                console.error("Audit log failed:", e);
                return { data: null, error: e };
            }
        },
        subscribe: (orgId: string, callback: (data: AuditLog[]) => void) => {
            try {
                const q = query(collection(firestore, 'audit_logs'), where('organization_id', '==', orgId));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const logs = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return { ...data, id: doc.id } as AuditLog;
                    });
                    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    callback(logs);
                });
                return unsubscribe;
            } catch (e) {
                console.error("Subscription error", e);
                return () => { };
            }
        }
    },
    expenses: {
        select: async (orgId: string) => ({ data: await fetchCollection<Expense>('expenses', orgId) }),
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
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'expenses', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        query: async (constraints: QueryConstraint[]) => {
            try {
                const q = query(collection(firestore, 'expenses'), ...constraints);
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense));
                return { data, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    equipment: {
        select: async (orgId: string) => ({ data: await fetchCollection<Equipment>('equipment', orgId) }),
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
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'equipment', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        query: async (constraints: QueryConstraint[]) => {
            try {
                const q = query(collection(firestore, 'equipment'), ...constraints);
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Equipment));
                return { data, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    maintenance: {
        select: async (orgId: string) => ({ data: await fetchCollection<MaintenanceRecord>('maintenance_records', orgId) }),
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
        },
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'maintenance_records', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        }
    },
    equipmentLogs: {
        select: async (orgId: string) => ({ data: await fetchCollection<EquipmentLog>('equipment_logs', orgId) }),
        create: async (log: Omit<EquipmentLog, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'equipment_logs'), log);
                return { data: { ...log, id: docRef.id } as EquipmentLog, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },
    availability: {
        select: async (orgId: string) => ({ data: await fetchCollection<Availability>('availability', orgId) }),
        getByOfficer: async (officerId: string) => {
            try {
                const q = query(collection(firestore, 'availability'), where('officer_id', '==', officerId));
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Availability));
                return { data, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        getByDateRange: async (startDate: string, endDate: string) => {
            try {
                const q = query(
                    collection(firestore, 'availability'),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Availability));
                return { data, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        upsert: async (availability: Availability) => {
            try {
                const docId = availability.id || `${availability.officer_id}_${availability.date}`;
                await setDoc(doc(firestore, 'availability', docId), { ...availability, id: docId });
                return { data: { ...availability, id: docId }, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        bulkUpsert: async (items: Availability[]) => {
            try {
                const batch = writeBatch(firestore);
                items.forEach(item => {
                    const docId = item.id || `${item.officer_id}_${item.date}`;
                    batch.set(doc(firestore, 'availability', docId), { ...item, id: docId });
                });
                await batch.commit();
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'availability', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        }
    },
    shiftTemplates: {
        select: async (orgId: string) => ({ data: await fetchCollection<ShiftTemplate>('shift_templates', orgId) }),
        create: async (template: Omit<ShiftTemplate, 'id'>) => {
            try {
                const docRef = await addDoc(collection(firestore, 'shift_templates'), template);
                return { data: { ...template, id: docRef.id } as ShiftTemplate, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        },
        update: async (id: string, data: Partial<ShiftTemplate>) => {
            try {
                await updateDoc(doc(firestore, 'shift_templates', id), data);
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        delete: async (id: string) => {
            try {
                await deleteDoc(doc(firestore, 'shift_templates', id));
                return { error: null };
            } catch (e: any) {
                return { error: e };
            }
        },
        applyTemplate: async (templateId: string, startDate: string, endDate: string, orgId: string) => {
            try {
                const templateDoc = await getDoc(doc(firestore, 'shift_templates', templateId));
                if (!templateDoc.exists()) {
                    return { data: null, error: 'Template not found' };
                }
                const template = { ...templateDoc.data(), id: templateDoc.id } as ShiftTemplate;

                const shifts: Omit<Shift, 'id'>[] = [];
                const start = new Date(startDate);
                const end = new Date(endDate);

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    if (template.days_of_week.includes(d.getDay())) {
                        const shiftDate = d.toISOString().split('T')[0];
                        const startDateTime = new Date(`${shiftDate}T${template.start_time}:00`);
                        const endDateTime = new Date(`${shiftDate}T${template.end_time}:00`);

                        if (endDateTime <= startDateTime) {
                            endDateTime.setDate(endDateTime.getDate() + 1);
                        }

                        shifts.push({
                            organization_id: orgId,
                            site_id: template.site_id,
                            officer_id: null,
                            start_time: startDateTime.toISOString(),
                            end_time: endDateTime.toISOString(),
                            status: 'draft',
                            pay_rate: template.pay_rate || null,
                            bill_rate: template.bill_rate || null
                        });
                    }
                }

                const batch = writeBatch(firestore);
                const createdShifts: Shift[] = [];

                shifts.forEach(shift => {
                    const docRef = doc(collection(firestore, 'shifts'));
                    batch.set(docRef, shift);
                    createdShifts.push({ ...shift, id: docRef.id } as Shift);
                });

                await batch.commit();
                return { data: createdShifts, error: null };
            } catch (e: any) {
                return { data: null, error: e };
            }
        }
    },

    // Relational Queries (Manual Joins)
    getFullSchedule: async (orgId: string) => {
        try {
            const [shifts, sites, clients, officers] = await Promise.all([
                fetchCollection<Shift>('shifts', orgId),
                fetchCollection<Site>('sites', orgId),
                fetchCollection<Client>('clients', orgId),
                fetchCollection<Officer>('officers', orgId)
            ]);
            const clientMap = createLookup(clients);
            const siteMap = createLookup(sites);
            const officerMap = createLookup(officers);
            const data = shifts.map(shift => {
                const site = siteMap[shift.site_id];
                const siteWithClient = site ? { ...site, client: clientMap[site.client_id] } : null;
                return {
                    ...shift,
                    site: siteWithClient,
                    officer: officerMap[shift.officer_id || ''] || null
                };
            });
            data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getFullTimeEntries: async (orgId: string) => {
        try {
            const [entries, shifts, sites, clients, officers] = await Promise.all([
                fetchCollection<TimeEntry>('time_entries', orgId),
                fetchCollection<Shift>('shifts', orgId),
                fetchCollection<Site>('sites', orgId),
                fetchCollection<Client>('clients', orgId),
                fetchCollection<Officer>('officers', orgId)
            ]);
            const clientMap = createLookup(clients);
            const siteMap = createLookup(sites);
            const officerMap = createLookup(officers);
            const shiftMap = createLookup(shifts);
            const data = entries.map(entry => {
                const shift = shiftMap[entry.shift_id];
                let shiftWithContext = null;
                if (shift) {
                    const site = siteMap[shift.site_id];
                    const siteWithClient = site ? { ...site, client: clientMap[site.client_id] } : null;
                    shiftWithContext = { ...shift, site: siteWithClient };
                }
                return {
                    ...entry,
                    officer: officerMap[entry.officer_id],
                    shift: shiftWithContext
                };
            });
            data.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getFullIncidents: async (orgId: string) => {
        try {
            const [incidents, sites, clients, officers] = await Promise.all([
                fetchCollection<Incident>('incidents', orgId),
                fetchCollection<Site>('sites', orgId),
                fetchCollection<Client>('clients', orgId),
                fetchCollection<Officer>('officers', orgId)
            ]);
            const clientMap = createLookup(clients);
            const siteMap = createLookup(sites);
            const officerMap = createLookup(officers);
            const data = incidents.map(inc => {
                const site = siteMap[inc.site_id];
                const siteWithClient = site ? { ...site, client: clientMap[site.client_id] } : null;
                return {
                    ...inc,
                    site: siteWithClient,
                    officer: officerMap[inc.officer_id]
                };
            });
            data.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getDARData: async (shiftId: string) => {
        try {
            const shiftDoc = await getDoc(doc(firestore, 'shifts', shiftId));
            if (!shiftDoc.exists()) return { data: null, error: 'Shift not found' };
            const shift = { ...shiftDoc.data(), id: shiftDoc.id } as Shift;

            const [siteDoc, officerDoc, incidentsRaw, timeEntriesRaw] = await Promise.all([
                getDoc(doc(firestore, 'sites', shift.site_id)),
                shift.officer_id ? getDoc(doc(firestore, 'officers', shift.officer_id)) : Promise.resolve(null),
                getDocs(query(collection(firestore, 'incidents'), where('shift_id', '==', shiftId))),
                getDocs(query(collection(firestore, 'time_entries'), where('shift_id', '==', shiftId)))
            ]);

            const site = siteDoc.exists() ? { ...siteDoc.data(), id: siteDoc.id } as Site : null;
            const clientDoc = site ? await getDoc(doc(firestore, 'clients', site.client_id)) : null;

            return {
                data: {
                    shift,
                    site,
                    client: clientDoc?.exists() ? { ...clientDoc.data(), id: clientDoc.id } as Client : null,
                    officer: (officerDoc && officerDoc.exists()) ? { ...officerDoc.data(), id: officerDoc.id } as Officer : null,
                    incidents: incidentsRaw.docs.map(d => ({ ...d.data(), id: d.id } as Incident)),
                    time_entries: timeEntriesRaw.docs.map(d => ({ ...d.data(), id: d.id } as TimeEntry))
                },
                error: null
            };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getOfficerBreadcrumbs: async (officerId: string, limitCount: number = 50) => {
        try {
            const q = query(
                collection(firestore, 'officer_locations'),
                where('officer_id', '==', officerId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as OfficerLocation));
            return { data: data.reverse(), error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getFullInvoices: async (orgId: string) => {
        try {
            const [invoices, clients] = await Promise.all([
                fetchCollection<Invoice>('invoices', orgId),
                fetchCollection<Client>('clients', orgId)
            ]);
            const clientMap = createLookup(clients);
            const data = invoices.map(inv => ({
                ...inv,
                client: clientMap[inv.client_id]
            }));
            data.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getFullExpenses: async (orgId: string, constraints: QueryConstraint[] = []) => {
        try {
            // Combine org filter with other constraints
            const q = query(collection(firestore, 'expenses'), where('organization_id', '==', orgId), ...constraints);
            const [expensesSnapshot, officers] = await Promise.all([
                getDocs(q),
                fetchCollection<Officer>('officers', orgId)
            ]);

            const expenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense));
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
    },

    getFullEquipment: async (orgId: string, constraints: QueryConstraint[] = []) => {
        try {
            const q = query(collection(firestore, 'equipment'), where('organization_id', '==', orgId), ...constraints);
            const [equipmentSnapshot, officers] = await Promise.all([
                getDocs(q),
                fetchCollection<Officer>('officers', orgId)
            ]);

            const equipment = equipmentSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Equipment));
            const officerMap = createLookup(officers);
            const data = equipment.map(eq => ({
                ...eq,
                assigned_officer: eq.assigned_to ? officerMap[eq.assigned_to] : null
            }));
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getFullMaintenance: async (orgId: string) => {
        try {
            const [maintenance, equipment] = await Promise.all([
                fetchCollection<MaintenanceRecord>('maintenance_records', orgId),
                fetchCollection<Equipment>('equipment', orgId)
            ]);
            const equipmentMap = createLookup(equipment);
            const data = maintenance.map(m => ({
                ...m,
                equipment: equipmentMap[m.equipment_id]
            }));
            data.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    getFullEquipmentLogs: async (orgId: string) => {
        try {
            const [logs, equipment, officers] = await Promise.all([
                fetchCollection<EquipmentLog>('equipment_logs', orgId),
                fetchCollection<Equipment>('equipment', orgId),
                fetchCollection<Officer>('officers', orgId)
            ]);
            const equipmentMap = createLookup(equipment);
            const officerMap = createLookup(officers);
            const data = logs.map(log => ({
                ...log,
                equipment: equipmentMap[log.equipment_id],
                officer: officerMap[log.officer_id]
            }));
            data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return { data, error: null };
        } catch (e) {
            return { data: null, error: e };
        }
    },

    checkConnection: async () => {
        try {
            await getDocs(collection(firestore, 'clients')); // Just a ping
            return { success: true };
        } catch (error: any) {
            return { success: false, error };
        }
    },

    seed: async (onLog?: (msg: string) => void, massive: boolean = false) => {
        const log = (msg: string) => {
            console.log(msg);
            if (onLog) onLog(msg);
        };
        log(massive ? 'Starting MASSIVE seed operation...' : 'Starting standard seed...');

        // 1. Create Default Organization
        const orgId = 'org_asorock_001';
        const organization: Organization = {
            id: orgId,
            name: 'AsoRock Security Services',
            owner_id: 'demo_admin_user',
            created_at: new Date().toISOString(),
            settings: {
                timezone: 'UTC-8',
                currency: 'USD'
            }
        };

        try {
            log('Creating Default Organization: AsoRock Security Services');
            await setDoc(doc(firestore, 'organizations', orgId), organization);
        } catch (e) {
            log('Error creating org: ' + e);
        }

        // Config based on mode
        const config = massive ? {
            clientCount: 30,
            officerCount: 60,
            daysBack: 90,
            daysForward: 30,
            incidentCount: 300
        } : {
            clientCount: 8,
            officerCount: 25,
            daysBack: 14,
            daysForward: 7,
            incidentCount: 15
        };

        // Generate Data
        log('Generating clients and sites...');
        const { clients, sites } = generateClientsAndSites(config.clientCount, orgId);

        log('Generating officers with certifications...');
        const officers = generateOfficers(config.officerCount, orgId);

        log('Generating shift schedule...');
        const { shifts, timeEntries } = generateShifts(sites, officers, config.daysBack, config.daysForward, orgId);

        log('Generating incidents...');
        const incidents = generateIncidents(sites, officers, config.incidentCount, orgId);

        log('Generating accounting data...');
        const { payrolls, invoices } = generateAccountingData(clients, orgId);

        // Create Default Users (Profiles)
        // 1. Admin
        const adminUser: User = {
            id: 'demo_admin_user',
            organization_id: orgId,
            full_name: 'Alex Mercer (Admin)',
            email: 'admin@guardian.com',
            role: 'ops_manager',
            avatar_url: 'https://i.pravatar.cc/150?u=admin'
        };

        // 2. Demo Officer (Link to one of the generated officers for realism, or create new)
        const demoOfficer: User = {
            id: 'demo_officer_user',
            organization_id: orgId,
            full_name: 'John Spartan (Officer)',
            email: 'officer@guardian.com',
            role: 'officer',
            avatar_url: 'https://i.pravatar.cc/150?u=officer'
        };

        // 3. Demo Client
        const demoClientId = clients[0].id; // Assign first generated client
        const demoClientUser: User = {
            id: 'demo_client_user',
            organization_id: orgId,
            full_name: 'Sarah Connor (Client)',
            email: 'client@guardian.com',
            role: 'client',
            client_id: demoClientId,
            avatar_url: 'https://i.pravatar.cc/150?u=client',
            is_temporary_password: false
        };

        // Ensure the generated officer list includes this demo officer so linking works
        officers.push({
            id: 'demo_officer_user',
            organization_id: orgId,
            full_name: 'John Spartan',
            email: 'officer@guardian.com',
            badge_number: 'DEMO-001',
            employment_status: 'active',
            phone: '555-0199',
            skills: ['armed', 'manager'],
            certifications: [
                {
                    id: generateId(),
                    name: 'State Guard Card',
                    number: 'GC-998877',
                    issue_date: new Date('2023-01-15').toISOString(),
                    expiry_date: new Date('2025-01-15').toISOString(),
                    type: 'guard_card',
                    status: 'active'
                },
                {
                    id: generateId(),
                    name: 'Exposed Firearm Permit',
                    number: 'FQ-554433',
                    issue_date: new Date('2023-05-10').toISOString(),
                    expiry_date: new Date('2024-05-10').toISOString(), // Almost expired or expired depending on today
                    type: 'firearm',
                    status: 'active'
                }
            ],
            financials: {
                base_rate: 25,
                overtime_rate: 37.5,
                deductions: [{ name: 'Union Dues', amount: 10 }]
            }
        });

        // Mock Feedback
        const feedback: Feedback[] = [];
        const pastShifts = shifts.filter(s => s.status === 'completed' && s.site_id === sites.find(site => site.client_id === demoClientId)?.id).slice(0, 3);
        pastShifts.forEach(s => {
            feedback.push({
                id: generateId(),
                organization_id: orgId,
                client_id: demoClientId,
                shift_id: s.id,
                rating: randomInt(3, 5),
                comments: Math.random() > 0.5 ? 'Officer was punctual and professional.' : 'No issues to report.',
                created_at: new Date().toISOString(),
                status: 'new'
            });
        });

        const allData = [
            { col: 'users', items: [adminUser, demoOfficer, demoClientUser] },
            { col: 'clients', items: clients },
            { col: 'sites', items: sites },
            { col: 'officers', items: officers },
            { col: 'shifts', items: shifts },
            { col: 'time_entries', items: timeEntries },
            { col: 'incidents', items: incidents },
            { col: 'payrolls', items: payrolls },
            { col: 'invoices', items: invoices },
            { col: 'feedback', items: feedback }
        ];

        try {
            // Process in chunks of 400 to be safe (limit is 500)
            let batch = writeBatch(firestore);
            let count = 0;
            let totalDocs = 0;

            for (const group of allData) {
                log(`Processing ${group.col} (${group.items.length} items)...`);
                for (const item of group.items) {
                    const ref = doc(firestore, group.col, item.id);
                    batch.set(ref, item);
                    count++;
                    totalDocs++;

                    if (count >= 400) {
                        log(`Committing batch of 400 writes...`);
                        await batch.commit();
                        batch = writeBatch(firestore);
                        count = 0;
                    }
                }
            }

            if (count > 0) {
                log(`Committing final batch...`);
                await batch.commit();
            }

            log(`Seed complete. Total documents created: ${totalDocs}`);
            return { success: true };
        } catch (e: any) {
            log(`Seed errors: ${e.message}`);
            console.error('Seed errors:', e);
            return { success: false, errors: [{ table: 'ALL', error: e }] };
        }
    }
};
