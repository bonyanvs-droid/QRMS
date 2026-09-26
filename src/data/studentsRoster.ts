import { Student, Teacher, Halaqah, AcademicYearConfig, DailySessionRecord } from '../types';
import { generateDefaultAcademicTerms, syncAcademicConfigWithActiveTerm } from '../lib/academicYearUtils';

export const BARAEM_HALAQAHS: Halaqah[] = [];

export const BARAEM_TEACHERS: Teacher[] = [];

const defaultTerms = generateDefaultAcademicTerms();

export const BARAEM_ACADEMIC_YEAR: AcademicYearConfig = syncAcademicConfigWithActiveTerm({
  id: 'ay_1447_t2',
  name: 'العام الدراسي 1447-1448 هـ',
  systemType: 'three_terms',
  activeTermId: 'term_1',
  terms: defaultTerms,
  semester: 'الفصل الدراسي الأول',
  startDate: '2026-08-16',
  endDate: '2026-11-12',
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
});

export const RAW_BARAEM_STUDENTS: Student[] = [];

export const AL_FURQAN_STUDENTS: Student[] = [];

export const AL_FURQAN_SESSION_RECORDS: DailySessionRecord[] = [];

export const SEED_BARAEM_STUDENTS: Student[] = [];

// Operational runtime state defaults to empty array; real data loads from Firestore
export const BARAEM_STUDENTS: Student[] = [];

