import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

async function run() {
  console.log('--- Inspecting Firestore for al-furqan documents ---');
  const collectionsToCheck = [
    'tenants',
    'students',
    'teachers',
    'halaqahs',
    'users',
    'attendance',
    'sessionRecords',
    'admissions',
    'nominations',
    'meetings',
    'finances',
    'badges',
    'reports',
    'complex_tenants',
    'platform_users'
  ];

  let totalFound = 0;

  for (const colName of collectionsToCheck) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      let colFurqanCount = 0;
      
      for (const d of snapshot.docs) {
        const data = d.data();
        const isFurqan = 
          d.id === 'al-furqan' || 
          data.tenantId === 'al-furqan' || 
          data.tenant_id === 'al-furqan' ||
          (data.email && data.email.includes('furqan')) ||
          (data.name && data.name.includes('الفرقان'));

        if (isFurqan) {
          // Double check NOT ghazzawi
          if (d.id === 'ghazzawi' || data.tenantId === 'ghazzawi') {
            console.warn(`Skipping Ghazzawi item ${d.id}`);
            continue;
          }
          colFurqanCount++;
          totalFound++;
          console.log(`[FOUND] Collection: ${colName}, Doc ID: ${d.id}, Name: ${data.name || data.fullName || 'N/A'}`);
          
          // Delete al-furqan doc
          await deleteDoc(doc(db, colName, d.id));
          console.log(`[DELETED] ${colName}/${d.id}`);
        }
      }
      if (colFurqanCount > 0) {
        console.log(`-> Cleaned ${colFurqanCount} doc(s) from ${colName}`);
      }
    } catch (err: any) {
      // Collection might not exist
    }
  }

  console.log(`--- Total al-furqan operational documents found and cleaned: ${totalFound} ---`);
}

run().catch(console.error);
