import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase';
import { Student, DailySessionRecord } from '../types';
import { StudentQuranPlan } from '../quran/types/plan';
import { normalizeStudentQuranPlan } from '../quran/utils/planNormalizer';
import { recordAuditLog } from './auditService';
import { LOCAL_STORAGE_KEY_QURAN_PLANS } from './dbService';
import { INITIAL_STUDENTS } from '../data/initialData';
import { SEED_BARAEM_STUDENTS } from '../data/studentsRoster';

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
 * Searches for a student by registered parent phone or student ID
 */
export async function queryStudentsForParent(searchTerm: string): Promise<ParentQueryResult> {
  const cleanTerm = searchTerm.trim();
  if (!cleanTerm) {
    return {
      success: false,
      students: [],
      records: {},
      errorMessage: 'يرجى إدخال رقم الهاتف المسجل لدى إدارة المجمع.',
    };
  }

  // Ensure Firebase Auth session exists if anonymous auth is supported
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (authErr: any) {
    // Suppress warning if admin-restricted-operation (anonymous provider disabled in console)
    if (authErr?.code !== 'auth/admin-restricted-operation') {
      console.warn('Anonymous session notice:', authErr);
    }
  }

  const phoneVariant1 = normalizePhone(cleanTerm);
  const phoneVariant2 = cleanTerm;
  const phoneVariant3 = phoneVariant1.startsWith('0') ? phoneVariant1.slice(1) : '0' + phoneVariant1;

  let matchedStudents: Student[] = [];

  try {
    // 1. Try querying by parentPhone
    const studentsCol = collection(db, 'students');
    const q1 = query(studentsCol, where('parentPhone', 'in', [phoneVariant1, phoneVariant2, phoneVariant3]));
    const snap1 = await getDocs(q1);

    snap1.forEach((d) => {
      matchedStudents.push({ id: d.id, ...d.data() } as Student);
    });

    // 2. If nothing found by phone, check if term is a direct studentId
    if (matchedStudents.length === 0) {
      const studentDocRef = doc(db, 'students', cleanTerm);
      const studentDocSnap = await getDoc(studentDocRef);
      if (studentDocSnap.exists()) {
        matchedStudents.push({ id: studentDocSnap.id, ...studentDocSnap.data() } as Student);
      }
    }
  } catch (err: any) {
    console.warn('Firestore query error, trying local cache fallback:', err);
  }

  // Fallback to local storage if Firestore is offline
  if (matchedStudents.length === 0) {
    try {
      const cachedStr = localStorage.getItem('al_ghazzawi_students_v3');
      if (cachedStr) {
        const cached: Student[] = JSON.parse(cachedStr);
        const filtered = cached.filter(
          (s) =>
            normalizePhone(s.parentPhone || '') === phoneVariant1 ||
            s.parentPhone === cleanTerm ||
            s.id === cleanTerm
        );
        if (filtered.length > 0) {
          matchedStudents = filtered;
        }
      }
    } catch {
      // ignore
    }
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

  for (const student of matchedStudents) {
    // 1. Daily Records
    try {
      const recordsCol = collection(db, 'daily_records');
      const qRecords = query(recordsCol, where('studentId', '==', student.id));
      const recordsSnap = await getDocs(qRecords);
      const list: DailySessionRecord[] = [];
      recordsSnap.forEach((r) => {
        list.push({ id: r.id, ...r.data() } as DailySessionRecord);
      });
      recordsMap[student.id] = list;
    } catch (recErr) {
      // fallback to cached records if offline
      try {
        const cachedRecStr = localStorage.getItem('al_ghazzawi_records_v3');
        if (cachedRecStr) {
          const cachedRec: DailySessionRecord[] = JSON.parse(cachedRecStr);
          recordsMap[student.id] = cachedRec.filter((r) => r.studentId === student.id);
        }
      } catch {
        recordsMap[student.id] = [];
      }
    }

    // 2. Quran Plans
    try {
      const plansCol = collection(db, 'quran_plans');
      const qPlans = query(plansCol, where('studentId', '==', student.id));
      const plansSnap = await getDocs(qPlans);
      const pList: StudentQuranPlan[] = [];
      plansSnap.forEach((p) => {
        pList.push(normalizeStudentQuranPlan({ id: p.id, ...(p.data() as any) }, student));
      });
      quranPlansMap[student.id] = pList;
    } catch (planErr) {
      // fallback to cached quran plans if offline
      try {
        const cachedPlanStr = localStorage.getItem(LOCAL_STORAGE_KEY_QURAN_PLANS);
        if (cachedPlanStr) {
          const cachedPlans: StudentQuranPlan[] = JSON.parse(cachedPlanStr);
          quranPlansMap[student.id] = cachedPlans
            .filter((p) => p.studentId === student.id)
            .map((p) => normalizeStudentQuranPlan(p, student));
        }
      } catch {
        quranPlansMap[student.id] = [];
      }
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
