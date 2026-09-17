import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function factoryResetDatabase() {
  const collectionsToClear = [
    'tenants', 'teachers', 'platform_users', 'users', 'halaqahs', 'students', 'educational_stages',
    'archived_halaqahs', 'archived_teachers', 'archived_supervisors', 'archived_users',
    'badges', 'remedial_plans', 'educational_plan', 'daily_records',
    'quran_plans', 'quran_stage_configs', 'spelling_lessons', 'audit_logs', 'report_logs',
    'registration_requests', 'financial_records', 'association_nominations',
    'track_definitions', 'track_nominations', 'support_sessions', 'academic_archives',
    'organizations', 'staff_attendance', 'meetings'
  ];
  try {
    await Promise.all(collectionsToClear.map(async (colName) => {
      const snapshot = await getDocs(collection(db, colName));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, colName, d.id)));
      await Promise.all(deletePromises);
      console.log(`Cleared collection ${colName}`);
    }));
    
    // Clear localStorage to remove any locally cached tenant state
    localStorage.clear();
    
    return { success: true, message: 'تم تصفير قاعدة البيانات بنجاح.' };
  } catch (error: any) {
    console.error('Error wiping db:', error);
    return { success: false, message: error.message };
  }
}
