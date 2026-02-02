
import { db } from '../lib/db';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { Organization } from '../lib/types';

const ASOROCK_ORG_ID = 'org_asorock_001';

async function migrate() {
    console.log('Starting Migration to Multi-Tenancy...');

    // 1. Ensure Default Organization Exists
    const { data: org } = await db.organizations.get(ASOROCK_ORG_ID);
    if (!org) {
        console.log('Creating Default Organization...');
        await db.organizations.create({
            id: ASOROCK_ORG_ID,
            name: 'AsoRock Security Services',
            owner_id: 'demo_admin_user',
            created_at: new Date().toISOString(),
            settings: { timezone: 'UTC', currency: 'USD' }
        });
    } else {
        console.log('Default Organization Exists.');
    }

    // 2. Collections to backfill
    const collections = [
        'users', 'clients', 'sites', 'officers', 'shifts',
        'time_entries', 'incidents', 'payroll_runs', 'invoices'
    ];

    for (const colName of collections) {
        console.log(`Migrating collection: ${colName}...`);
        const q = query(collection(firestore, colName)); // Get ALL (ignore organization_id filter for now)
        // Note: db.fetchCollection filters by orgId, so we use raw firebase call here

        const snapshot = await getDocs(q);
        let count = 0;

        for (const d of snapshot.docs) {
            const data = d.data();
            if (!data.organization_id) {
                await updateDoc(doc(firestore, colName, d.id), {
                    organization_id: ASOROCK_ORG_ID
                });
                count++;
            }
        }
        console.log(`Updated ${count} documents in ${colName}.`);
    }

    console.log('Migration Complete');
}

// Check if running directly
// @ts-ignore
if (typeof require !== 'undefined' && require.main === module) {
    migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

export { migrate };
