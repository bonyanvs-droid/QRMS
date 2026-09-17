import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const collectionsToClear = [
  'tenants', 'teachers', 'platform_users', 'users', 'halaqahs', 'students', 'educational_stages',
  'archived_halaqahs', 'archived_teachers', 'archived_supervisors', 'archived_users',
  'badges', 'remedial_plans', 'educational_plan', 'daily_records',
  'quran_plans', 'quran_stage_configs', 'spelling_lessons', 'audit_logs', 'report_logs',
  'registration_requests', 'financial_records', 'association_nominations',
  'track_definitions', 'track_nominations', 'support_sessions', 'academic_archives',
  'organizations', 'staff_attendance', 'meetings'
];

async function run() {
  console.log('Wiping database entirely (0 tenants)...');
  for (const col of collectionsToClear) {
    const snap = await getDocs(collection(db, col));
    let count = 0;
    for (const d of snap.docs) {
      await deleteDoc(doc(db, col, d.id));
      count++;
    }
    console.log(`Cleared ${count} docs from ${col}`);
  }
  
  // Re-seed ONLY system admin (NO TENANTS)
  console.log('Seeding system admin only...');
  await setDoc(doc(db, 'platform_users', 'usr_sys_admin_2396012458'), {
    id: 'usr_sys_admin_2396012458',
    name: 'مدير النظام العام',
    loginIdentifier: '2396012458',
    nationalId: '2396012458',
    phone: '0569990593',
    password: '123456',
    role: 'system_admin',
    isActive: true,
    mustChangePassword: false,
  });
  
  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
