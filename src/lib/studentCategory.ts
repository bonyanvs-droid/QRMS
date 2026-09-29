import { RegistrationRequest, Student } from '../types';
import { StudentQuranPlan } from '../quran/types/plan';
import { getSurahArabicName } from '../quran/utils/positionFormatter';

export type StudentCategory = 'activities' | 'programs' | 'halaqah';

// Categorize student into: activities | programs | halaqah
// - طلاب النشاط: المشتركون في باقة الأنشطة والبرامج فقط (النشاط)
// - طلاب البرامج: المشتركون في باقة الاشتراك الكامل (شامل البرامج والحلقات والأنشطة)
// - طلاب الحلقات: المشتركون في باقة القرآن الكريم فقط
export function getStudentCategory(
  student: Student,
  admissionsRequests: RegistrationRequest[] = []
): StudentCategory {
  const reg = (student.registrationType || '').toLowerCase().trim();
  const label = (student.registrationTypeLabel || '').toLowerCase().trim();

  const matchedReq = admissionsRequests.find(
    (r) =>
      r.enrolledStudentId === student.id ||
      (student.nationalId && r.nationalId && r.nationalId === student.nationalId) ||
      (r.studentName && r.studentName.trim() === student.fullName.trim())
  );
  const matchedReg = (matchedReq?.registrationType || '').toLowerCase().trim();
  const matchedLabel = (matchedReq?.registrationTypeLabel || '').toLowerCase().trim();

  const combined = `${reg} ${label} ${matchedReg} ${matchedLabel}`;

  // 1. طلاب النشاط: باقة الأنشطة والبرامج فقط
  if (
    reg === 'activities_only' ||
    matchedReg === 'activities_only' ||
    combined.includes('activities_only') ||
    combined.includes('أنشطة') ||
    combined.includes('نشاط')
  ) {
    return 'activities';
  }

  // 2. طلاب الحلقات: المشتركين في باقة القرآن الكريم فقط
  if (
    reg === 'quran_only' ||
    matchedReg === 'quran_only' ||
    combined.includes('quran_only') ||
    combined.includes('قرآن فقط') ||
    combined.includes('القرآن فقط') ||
    combined.includes('القرآن الكريم فقط') ||
    combined.includes('حلقات فقط') ||
    (combined.includes('قرآن') && !combined.includes('كامل'))
  ) {
    return 'halaqah';
  }

  // 3. طلاب البرامج: المشتركين في باقة الاشتراك الكامل (أو منح وإعفاءات وبرامج)
  if (
    reg === 'full_package' ||
    reg === 'programs' ||
    reg === 'programs_only' ||
    reg === 'scholarship' ||
    matchedReg === 'full_package' ||
    matchedReg === 'programs' ||
    matchedReg === 'scholarship' ||
    combined.includes('الاشتراك الكامل') ||
    combined.includes('كامل') ||
    combined.includes('full') ||
    combined.includes('برامج') ||
    combined.includes('برنامج') ||
    combined.includes('منحة') ||
    combined.includes('إعفاء') ||
    combined.includes('اعفاء')
  ) {
    return 'programs';
  }

  // Default fallback: in the system default registration is full_package
  return 'programs';
}

// Resolves the student's registration package label, matching against the
// linked admissions request when the student record lacks one.
export function getStudentRegistrationType(
  student: Student,
  admissionsRequests: RegistrationRequest[] = []
): string | null {
  if (student.registrationTypeLabel) return student.registrationTypeLabel;
  if (student.registrationType) {
    if (student.registrationType === 'full_package') return 'باقة الاشتراك الكامل';
    if (student.registrationType === 'activities_only') return 'أنشطة وبرامج';
    if (student.registrationType === 'quran_only') return 'قرآن فقط';
    if (student.registrationType === 'scholarship') return 'منحة / إعفاء';
    return student.registrationType;
  }
  const matchedReq = admissionsRequests.find(
    (r) =>
      r.enrolledStudentId === student.id ||
      (student.nationalId && r.nationalId && r.nationalId === student.nationalId) ||
      (r.studentName && r.studentName.trim() === student.fullName.trim())
  );
  if (matchedReq?.registrationTypeLabel) return matchedReq.registrationTypeLabel;
  if (matchedReq?.registrationType) {
    if (matchedReq.registrationType === 'full_package') return 'باقة الاشتراك الكامل';
    if (matchedReq.registrationType === 'activities_only') return 'أنشطة وبرامج';
    if (matchedReq.registrationType === 'quran_only') return 'قرآن فقط';
    if (matchedReq.registrationType === 'scholarship') return 'منحة / إعفاء';
    return matchedReq.registrationType;
  }
  return null;
}

// Current surah source of truth: the ACTIVE plan's currentPosition when a
// plan exists; the registered student field is only the fallback baseline.
export function resolveCurrentSurahLabel(
  student: Student,
  activePlan: StudentQuranPlan | null | undefined
): string {
  const pos = activePlan?.currentPosition;
  const fromPlan = pos?.surahNumber ? getSurahArabicName(pos.surahNumber) : '';
  return fromPlan || student.currentSurah || 'الفاتحة';
}

// Canonical grade vocabulary — matches stages.target_grades labels in the DB
// (تمهيدي / صف أول / صف ثاني / ... / أول متوسط / أول ثانوي / جامعي).
const GRADE_CANONICAL: Record<string, string> = {
  'تمهيدي': 'تمهيدي',
  'التمهيدي': 'تمهيدي',
  'تحضيري': 'تمهيدي',
  'التحضيري': 'تمهيدي',
  'روضة': 'تمهيدي',
  'صف أول': 'صف أول',
  'الصف الأول': 'صف أول',
  'أول': 'صف أول',
  'الأول ابتدائي': 'صف أول',
  'الأول الابتدائي': 'صف أول',
  'أول ابتدائي': 'صف أول',
  'الصف الأول ابتدائي': 'صف أول',
  'الصف الأول الابتدائي': 'صف أول',
  'صف ثاني': 'صف ثاني',
  'الصف الثاني': 'صف ثاني',
  'ثاني': 'صف ثاني',
  'الثاني ابتدائي': 'صف ثاني',
  'الثاني الابتدائي': 'صف ثاني',
  'ثاني ابتدائي': 'صف ثاني',
  'الصف الثاني ابتدائي': 'صف ثاني',
  'الصف الثاني الابتدائي': 'صف ثاني',
  'صف ثالث': 'صف ثالث',
  'الصف الثالث': 'صف ثالث',
  'الثالث ابتدائي': 'صف ثالث',
  'الثالث الابتدائي': 'صف ثالث',
  'ثالث ابتدائي': 'صف ثالث',
  'صف رابع': 'صف رابع',
  'الصف الرابع': 'صف رابع',
  'الرابع ابتدائي': 'صف رابع',
  'الرابع الابتدائي': 'صف رابع',
  'رابع ابتدائي': 'صف رابع',
  'صف خامس': 'صف خامس',
  'الصف الخامس': 'صف خامس',
  'الخامس ابتدائي': 'صف خامس',
  'الخامس الابتدائي': 'صف خامس',
  'خامس ابتدائي': 'صف خامس',
  'صف سادس': 'صف سادس',
  'الصف السادس': 'صف سادس',
  'السادس ابتدائي': 'صف سادس',
  'السادس الابتدائي': 'صف سادس',
  'سادس ابتدائي': 'صف سادس',
  'أول متوسط': 'أول متوسط',
  'الأول متوسط': 'أول متوسط',
  'الأول المتوسط': 'أول متوسط',
  'الصف الأول متوسط': 'أول متوسط',
  'الصف الأول المتوسط': 'أول متوسط',
  'ثاني متوسط': 'ثاني متوسط',
  'الثاني متوسط': 'ثاني متوسط',
  'الثاني المتوسط': 'ثاني متوسط',
  'الصف الثاني متوسط': 'ثاني متوسط',
  'الصف الثاني المتوسط': 'ثاني متوسط',
  'ثالث متوسط': 'ثالث متوسط',
  'الثالث متوسط': 'ثالث متوسط',
  'الثالث المتوسط': 'ثالث متوسط',
  'الصف الثالث متوسط': 'ثالث متوسط',
  'الصف الثالث المتوسط': 'ثالث متوسط',
  'أول ثانوي': 'أول ثانوي',
  'الأول ثانوي': 'أول ثانوي',
  'الأول الثانوي': 'أول ثانوي',
  'الصف الأول ثانوي': 'أول ثانوي',
  'ثاني ثانوي': 'ثاني ثانوي',
  'الثاني ثانوي': 'ثاني ثانوي',
  'الثاني الثانوي': 'ثاني ثانوي',
  'الصف الثاني ثانوي': 'ثاني ثانوي',
  'ثالث ثانوي': 'ثالث ثانوي',
  'الثالث ثانوي': 'ثالث ثانوي',
  'الثالث الثانوي': 'ثالث ثانوي',
  'الصف الثالث ثانوي': 'ثالث ثانوي',
  'جامعي': 'جامعي',
  'جامعة': 'جامعي',
  'خريج': 'خريج',
  'كبار': 'كبار',
};

// Normalizes free-text grade spellings (Excel imports, admission forms) to the
// canonical stage vocabulary. Returns '' when the text is unrecognized.
export function normalizeGrade(raw?: string | null): string {
  const g = (raw || '').trim().replace(/\s+/g, ' ');
  if (!g) return '';
  if (GRADE_CANONICAL[g]) return GRADE_CANONICAL[g];
  const stripped = g.replace(/^ال/, '');
  for (const [alias, canonical] of Object.entries(GRADE_CANONICAL)) {
    if (alias.replace(/^ال/, '') === stripped) return canonical;
  }
  return '';
}
