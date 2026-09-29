import { RegistrationRequest, Student } from '../types';

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
