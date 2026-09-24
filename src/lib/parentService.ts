import { Student, DailySessionRecord } from '../types';
import { StudentQuranPlan } from '../quran/types/plan';
import { normalizeStudentQuranPlan } from '../quran/utils/planNormalizer';
import { recordAuditLog } from './auditService';
import { StudentRepository } from './repositories/studentRepository';
import { DailyRecordRepository } from './repositories/dailyRecordRepository';
import { AcademicRepository } from './repositories/academicRepository';

export interface ParentQueryResult {
  success: boolean;
  students: Student[];
  records: Record<string, DailySessionRecord[]>;
  quranPlans?: Record<string, StudentQuranPlan[]>;
  errorMessage?: string;
}

/**
 * Normalizes Saudi phone numbers to a consistent 10-digit format (05XXXXXXXX)
 */
export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('9665')) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Searches for a student by registered parent phone or student ID from PostgreSQL
 * Scoped to the supplied tenant so the query reaches the API with tenant context.
 */
export async function queryStudentsForParent(searchTerm: string, tenantId?: string): Promise<ParentQueryResult> {
  const cleanTerm = searchTerm.trim();
  if (!cleanTerm) {
    return {
      success: false,
      students: [],
      records: {},
      errorMessage: 'يرجى إدخال رقم الهاتف المسجل لدى إدارة المجمع.',
    };
  }

  const phoneVariant1 = normalizePhone(cleanTerm);
  const phoneVariant2 = cleanTerm;
  const phoneVariant3 = phoneVariant1.startsWith('0') ? phoneVariant1.slice(1) : '0' + phoneVariant1;

  let matchedStudents: Student[] = [];

  try {
    const allStudents = await StudentRepository.getAll(tenantId);
    matchedStudents = allStudents.filter(
      (s) =>
        normalizePhone(s.parentPhone || '') === phoneVariant1 ||
        s.parentPhone === phoneVariant2 ||
        s.parentPhone === phoneVariant3 ||
        s.id === cleanTerm ||
        s.nationalId === cleanTerm
    );
  } catch (err: any) {
    console.warn('PostgreSQL student query notice:', err);
  }

  if (matchedStudents.length === 0) {
    return {
      success: false,
      students: [],
      records: {},
      errorMessage: 'لم نتمكن من العثور على طالب مسجل برقم الهاتف هذا. يرجى التأكد من الرقم المسجل في استمارة التحاق الطالب.',
    };
  }

  // Fetch session records and quran plans for the matched students
  const recordsMap: Record<string, DailySessionRecord[]> = {};
  const quranPlansMap: Record<string, StudentQuranPlan[]> = {};

  try {
    const [allRecords, allPlans] = await Promise.all([
      DailyRecordRepository.getAll(tenantId),
      AcademicRepository.getQuranPlans(tenantId),
    ]);

    for (const student of matchedStudents) {
      recordsMap[student.id] = allRecords.filter((r) => r.studentId === student.id);
      quranPlansMap[student.id] = allPlans
        .filter((p) => p.studentId === student.id)
        .map((p) => normalizeStudentQuranPlan(p, student));
    }
  } catch {
    for (const student of matchedStudents) {
      recordsMap[student.id] = [];
      quranPlansMap[student.id] = [];
    }
  }

  // Log audit event
  await recordAuditLog({
    userId: 'parent_portal',
    userName: 'ولي أمر (استعلام ذاتي)',
    userRole: 'public',
    action: 'view',
    entityType: 'student',
    entityId: matchedStudents.map((s) => s.id).join(','),
    entityName: `استعلام ولي أمر برقم: ${phoneVariant1} (${matchedStudents.map((s) => s.fullName).join(', ')})`,
  });

  return {
    success: true,
    students: matchedStudents,
    records: recordsMap,
    quranPlans: quranPlansMap,
  };
}
