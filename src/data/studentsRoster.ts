import { Student, Teacher, Halaqah, AcademicYearConfig, DailySessionRecord } from '../types';

export const BARAEM_HALAQAHS: Halaqah[] = [];

export const BARAEM_TEACHERS: Teacher[] = [];

export const BARAEM_ACADEMIC_YEAR: AcademicYearConfig = {
  id: 'ay_1447_t2',
  name: 'العام الدراسي 1447-1448 هـ',
  semester: 'الفصل الدراسي الثاني',
  startDate: '2026-08-15',
  endDate: '2026-11-15',
  operationalStartWeek: 3,
  operationalEndWeek: 14,
  totalWeeks: 12,
  currentWeek: 6,
  daysPerWeek: 4,
  spellingPassingThreshold: 85,
  gradeTargets: {
    tamheedi: { minSurah: 'الفيل', label: 'المخرج القرآني للتمهيدي: من الناس إلى الفيل' },
    grade1: { minSurah: 'الضحى', label: 'المخرج القرآني للصف الأول: من الناس إلى الضحى' },
    grade2: { minSurah: 'الغاشية', label: 'المخرج القرآني للصف الثاني: من الناس إلى الغاشية' },
  },
};

export const RAW_BARAEM_STUDENTS: Student[] = [];

export const AL_FURQAN_STUDENTS: Student[] = [];

export const AL_FURQAN_SESSION_RECORDS: DailySessionRecord[] = [];

export const SEED_BARAEM_STUDENTS: Student[] = [];

// Operational runtime state defaults to empty array; real data loads from Firestore
export const BARAEM_STUDENTS: Student[] = [];

