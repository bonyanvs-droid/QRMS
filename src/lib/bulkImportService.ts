import { hashPasswordWithSalt } from './authService';
import { recordAuditLog } from './auditService';
import {
  BulkImportDataset,
} from '../utils/bulkImportParser';
import { Halaqah, Student, Teacher, User, MosqueComplexTenant } from '../types';
import { apiClient } from './api/apiClient';

export interface BulkImportProgress {
  phase: 'idle' | 'validating' | 'stages' | 'halaqahs' | 'staff' | 'parents' | 'students' | 'auth_sync' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  message: string;
  percent: number;
  stats: {
    halaqahsCreated: number;
    teachersCreated: number;
    supervisorsCreated: number;
    parentsCreated: number;
    studentsCreated: number;
    usersCreated: number;
  };
  errors: string[];
}

export interface BulkImportResult {
  success: boolean;
  tenantId: string;
  tenantName: string;
  stats: {
    halaqahsCreated: number;
    teachersCreated: number;
    supervisorsCreated: number;
    parentsCreated: number;
    studentsCreated: number;
    usersCreated: number;
  };
  credentials: {
    name: string;
    role: string;
    phone: string;
    plainPassword: string;
    halaqahOrDetails?: string;
  }[];
  errors: string[];
}

/**
 * Execute batched import of entire dataset into PostgreSQL
 */
export async function executeBulkImport(
  targetTenant: MosqueComplexTenant,
  dataset: BulkImportDataset,
  actor: { id: string; name: string; role: any },
  onProgress: (progress: BulkImportProgress) => void,
  defaultPassword = 'Admin@123456'
): Promise<BulkImportResult> {
  const tenantId = targetTenant.id;
  const tenantName = targetTenant.name;

  const stats = {
    halaqahsCreated: 0,
    teachersCreated: 0,
    supervisorsCreated: 0,
    parentsCreated: 0,
    studentsCreated: 0,
    usersCreated: 0,
  };

  const credentials: BulkImportResult['credentials'] = [];
  const errors: string[] = [];

  const defaultHash = await hashPasswordWithSalt(defaultPassword);

  const totalSteps = 6;
  const updateProgress = (phase: BulkImportProgress['phase'], step: number, msg: string, percent: number) => {
    onProgress({
      phase,
      currentStep: step,
      totalSteps,
      message: msg,
      percent,
      stats,
      errors,
    });
  };

  try {
    updateProgress('validating', 1, 'جاري تهيئة الاتصال بقاعدة بيانات PostgreSQL والتحقق من الهيكل...', 10);

    // 1. Process & Save Staff (Teachers & Supervisors)
    updateProgress('staff', 2, 'جاري تأسيس حسابات المعلمين والمشرفين...', 25);

    const teacherNameToIdMap = new Map<string, string>();
    const teacherPhoneToIdMap = new Map<string, string>();

    const usersToInsert: any[] = [];

    for (const s of dataset.staff) {
      const isSupervisor = s.role === 'supervisor';
      const staffId = isSupervisor
        ? `sup_${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        : `tch_${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const userId = `usr_${staffId}`;

      if (s.name) teacherNameToIdMap.set(s.name.trim(), staffId);
      if (s.phone) teacherPhoneToIdMap.set(s.phone.trim(), staffId);

      // Platform User doc for PostgreSQL users table
      const userDoc: Partial<User> = {
        id: userId,
        name: s.name,
        fullName: s.name,
        phone: s.phone,
        nationalId: s.nationalId || '',
        loginIdentifier: s.phone || s.nationalId || userId,
        email: s.email || undefined,
        role: s.role,
        staffRole: isSupervisor ? 'supervisor' : 'teacher',
        tenantId,
        organizationId: targetTenant.organizationId || undefined,
        passwordHash: defaultHash,
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      usersToInsert.push(userDoc);

      if (isSupervisor) {
        stats.supervisorsCreated++;
      } else {
        stats.teachersCreated++;
      }
      stats.usersCreated++;

      credentials.push({
        name: s.name,
        role: isSupervisor ? 'مشرف تربوي' : 'معلم حلقات',
        phone: s.phone || 'غير مسجل',
        plainPassword: defaultPassword,
        halaqahOrDetails: s.assignedHalaqahs?.join(', ') || 'كافة الحلقات',
      });
    }

    if (usersToInsert.length > 0) {
      await apiClient.post('/users/bulk', { items: usersToInsert });
    }

    // 2. Process & Save Halaqahs
    updateProgress('halaqahs', 3, 'جاري تأسيس الحلقات والفصول وتوزيع المناهج...', 45);

    const halaqahNameToIdMap = new Map<string, string>();
    const halaqahsToInsert: any[] = [];

    for (const h of dataset.halaqahs) {
      const halaqahId = `hal_${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      halaqahNameToIdMap.set(h.name.trim(), halaqahId);

      let teacherId = '';
      let teacherName = h.teacherName || '';

      if (h.teacherPhone && teacherPhoneToIdMap.has(h.teacherPhone)) {
        teacherId = teacherPhoneToIdMap.get(h.teacherPhone)!;
      } else if (h.teacherName && teacherNameToIdMap.has(h.teacherName.trim())) {
        teacherId = teacherNameToIdMap.get(h.teacherName.trim())!;
      }

      const halDoc: Partial<Halaqah> = {
        id: halaqahId,
        name: h.name,
        grade: h.grade || 'صف أول',
        targetSurah: h.targetSurah || 'الغاشية',
        stageId: h.stageId || 'baraem',
        tenantId,
        teacherId: teacherId || '',
        teacherName: teacherName || '',
        location: 'المسجد الرئيسي',
        daysPerWeek: 4,
        isActive: true,
        activeTrackIds: ['track_quran', 'track_spelling', 'track_virtues'],
      };

      halaqahsToInsert.push(halDoc);
      stats.halaqahsCreated++;
    }

    if (halaqahsToInsert.length > 0) {
      await apiClient.post('/halaqahs/bulk', { items: halaqahsToInsert });
    }

    // 3. Process & Save Parents
    updateProgress('parents', 4, 'جاري تسجيل أولياء الأمور وتجهيز بوابات المتابعة...', 65);

    const parentPhoneToIdMap = new Map<string, string>();
    const parentsToInsert: any[] = [];

    for (const p of dataset.parents) {
      const parentId = `prt_${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const userId = `usr_${parentId}`;
      parentPhoneToIdMap.set(p.phone, parentId);

      const userDoc: Partial<User> = {
        id: userId,
        name: p.name,
        fullName: p.name,
        phone: p.phone,
        nationalId: p.nationalId || '',
        loginIdentifier: p.phone || p.nationalId || userId,
        role: 'parent',
        tenantId,
        organizationId: targetTenant.organizationId || undefined,
        passwordHash: defaultHash,
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      parentsToInsert.push(userDoc);

      stats.parentsCreated++;
      stats.usersCreated++;

      credentials.push({
        name: p.name,
        role: 'ولي أمر',
        phone: p.phone,
        plainPassword: defaultPassword,
        halaqahOrDetails: `الأبناء: ${p.studentNames.join(', ') || 'طالب'}`,
      });
    }

    if (parentsToInsert.length > 0) {
      await apiClient.post('/users/bulk', { items: parentsToInsert });
    }

    // 4. Process & Save Students
    updateProgress('students', 5, 'جاري تسكين الطلاب وتوزيعهم على الحلقات والمسارات...', 85);

    const studentsToInsert: any[] = [];
    const studentUsersToInsert: any[] = [];

    for (const st of dataset.students) {
      const studentId = `std_${tenantId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const userId = `usr_${studentId}`;
      const isActivitiesOnly = st.registrationType === 'activities_only';

      let halaqahId = '';
      if (!isActivitiesOnly) {
        if (st.halaqahName && halaqahNameToIdMap.has(st.halaqahName.trim())) {
          halaqahId = halaqahNameToIdMap.get(st.halaqahName.trim())!;
        } else if (dataset.halaqahs.length > 0) {
          halaqahId = halaqahNameToIdMap.values().next().value || '';
        }
      }

      const studentDoc: Partial<Student> = {
        id: studentId,
        fullName: st.name,
        name: st.name,
        nationalId: st.nationalId || '',
        grade: (st.grade as any) || 'صف أول',
        halaqahId: halaqahId || '',
        halaqahName: isActivitiesOnly ? '' : (st.halaqahName || ''),
        teacherId: '',
        teacherName: '',
        stageId: st.stageId || 'baraem',
        registrationType: st.registrationType || 'full_package',
        registrationTypeLabel: st.registrationTypeLabel || 'باقة الاشتراك الكامل',
        parentName: st.parentName || undefined,
        parentPhone: st.parentPhone || '',
        guardianRelationship: (st.parentRelationship as any) || 'أب',
        tenantId,
        currentSurah: isActivitiesOnly ? '' : (st.currentSurah || 'الفاتحة'),
        currentAyah: isActivitiesOnly ? 0 : (st.currentAyah || 1),
        minimumTargetSurah: isActivitiesOnly ? '' : 'الغاشية',
        currentSpellingLessonId: 'lesson_1',
        currentSpellingScore: 100,
        status: 'on_track',
        attendanceStreak: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      studentsToInsert.push(studentDoc);

      const userDoc: Partial<User> = {
        id: userId,
        name: st.name,
        fullName: st.name,
        phone: st.parentPhone || '',
        nationalId: st.nationalId || '',
        loginIdentifier: st.nationalId || `std_${studentId}`,
        studentId,
        halaqahId: halaqahId || undefined,
        role: 'student',
        tenantId,
        organizationId: targetTenant.organizationId || undefined,
        passwordHash: defaultHash,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      studentUsersToInsert.push(userDoc);

      stats.studentsCreated++;
      stats.usersCreated++;
    }

    if (studentsToInsert.length > 0) {
      await apiClient.post('/students/bulk', { items: studentsToInsert });
    }
    if (studentUsersToInsert.length > 0) {
      await apiClient.post('/users/bulk', { items: studentUsersToInsert });
    }

    // 5. Audit Log Entry
    updateProgress('auth_sync', 6, 'جاري توثيق عملية الترحيل في سجل الرقابة والأمان...', 95);

    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'create',
      entityType: 'tenant',
      entityId: tenantId,
      entityName: `استيراد شامل لبيانات مجمع (${tenantName}) في PostgreSQL`,
      newValue: {
        stats,
        totalItems: dataset.summary.totalStudents + dataset.summary.totalTeachers + dataset.summary.totalHalaqahs,
        timestamp: new Date().toISOString(),
      },
    });

    updateProgress('completed', 6, 'اكتمل استيراد بيانات المجمع بنجاح تام وبدقة 100%!', 100);

    return {
      success: true,
      tenantId,
      tenantName,
      stats,
      credentials,
      errors,
    };
  } catch (error: any) {
    console.error('Error during bulk import execution:', error);
    const errMsg = error.message || 'حدث خطأ غير متوقع أثناء استيراد البيانات في قاعدة البيانات.';
    errors.push(errMsg);
    updateProgress('error', 6, errMsg, 100);

    return {
      success: false,
      tenantId,
      tenantName,
      stats,
      credentials,
      errors,
    };
  }
}
