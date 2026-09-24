import { apiClient } from './api/apiClient';
import { safeStorage } from './safeStorage';

export async function factoryResetDatabase() {
  const collectionsToClear = [
    'tenants', 'users', 'halaqahs', 'students', 'stages',
    'badges', 'remedial_plans', 'educational_plan_weeks', 'daily_records',
    'quran_plans', 'quran_stage_configs', 'spelling_lessons', 'audit_logs', 'report_logs',
    'registration_requests', 'student_financial_records', 'association_nominations',
    'track_definitions', 'track_nominations', 'support_sessions', 'academic_term_archives',
    'organizations', 'staff_attendance', 'meetings'
  ];
  try {
    for (const colName of collectionsToClear) {
      try {
        const items = await apiClient.get<any[]>(`/${colName}`);
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.id) {
              await apiClient.delete(`/${colName}/${item.id}`);
            }
          }
        }
      } catch {
        // Continue
      }
    }
    
    // Clear localStorage to remove any locally cached tenant state
    safeStorage.clear();
    
    return { success: true, message: 'تم تصفير قاعدة البيانات بنجاح.' };
  } catch (error: any) {
    console.error('Error wiping db:', error);
    return { success: false, message: error.message };
  }
}
