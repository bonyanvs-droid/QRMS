import * as XLSX from 'xlsx';
import { MosqueComplexTenant, EducationalStage, TrackDefinition } from '../types';

export interface ParsedHalaqahItem {
  name: string;
  grade?: 'تمهيدي' | 'صف أول' | 'صف ثاني';
  targetSurah?: string;
  stageName?: string;
  stageId?: string;
  teacherName?: string;
  teacherPhone?: string;
  timeSlot?: string;
  capacity?: number;
  gender?: 'boys' | 'girls';
  notes?: string;
  raw: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedStaffItem {
  name: string;
  role: 'teacher' | 'supervisor';
  staffRole?: string;
  phone: string;
  nationalId?: string;
  email?: string;
  assignedHalaqahs?: string[];
  notes?: string;
  raw: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedParentItem {
  name: string;
  phone: string;
  nationalId?: string;
  email?: string;
  studentNames: string[];
  notes?: string;
  raw: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedStudentItem {
  name: string;
  nationalId?: string;
  birthDate?: string;
  grade?: string;
  halaqahName?: string;
  stageName?: string;
  stageId?: string;
  parentName?: string;
  parentPhone: string;
  parentRelationship?: string;
  currentSurah?: string;
  currentAyah?: number;
  initialSpellingLevel?: number;
  registrationType?: 'full_package' | 'quran_only' | 'activities_only' | 'scholarship' | string;
  registrationTypeLabel?: string;
  notes?: string;
  raw: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedTenantMeta {
  name?: string;
  city?: string;
  district?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  contactPhone?: string;
  email?: string;
}

export interface BulkImportDataset {
  tenantMeta?: ParsedTenantMeta;
  stages: EducationalStage[];
  tracks: TrackDefinition[];
  halaqahs: ParsedHalaqahItem[];
  staff: ParsedStaffItem[];
  parents: ParsedParentItem[];
  students: ParsedStudentItem[];
  summary: {
    totalHalaqahs: number;
    totalTeachers: number;
    totalSupervisors: number;
    totalParents: number;
    totalStudents: number;
    validCount: number;
    warningCount: number;
    errorCount: number;
  };
}

// Clean phone strings
export function cleanPhoneNumber(rawPhone: any): string {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim();
  // Remove spaces, dashes, parentheses
  str = str.replace(/[\s\-\(\)]/g, '');
  // If starts with 00966, replace with 0
  if (str.startsWith('00966')) str = '0' + str.slice(5);
  // If starts with +966, replace with 0
  if (str.startsWith('+966')) str = '0' + str.slice(4);
  // If starts with 966 and 12 digits, replace with 0
  if (str.startsWith('966') && str.length === 12) str = '0' + str.slice(3);
  return str;
}

// Map registration package types flexibly
export function parseRegistrationType(rawType: any): { type: string; label: string } {
  const str = String(rawType || '').trim().toLowerCase();
  if (!str) {
    return { type: 'full_package', label: 'باقة الاشتراك الكامل' };
  }
  if (str.includes('نشاط') || str.includes('برامج') || str.includes('activit')) {
    return { type: 'activities_only', label: 'باقة الأنشطة والبرامج فقط' };
  }
  if (str.includes('قرآن') || str.includes('قران') || str.includes('quran')) {
    return { type: 'quran_only', label: 'باقة القرآن الكريم فقط' };
  }
  if (str.includes('منحة') || str.includes('إعفاء') || str.includes('اعفاء') || str.includes('scholarship')) {
    return { type: 'scholarship', label: 'منحة دراسية / إعفاء' };
  }
  if (str.includes('كامل') || str.includes('full')) {
    return { type: 'full_package', label: 'باقة الاشتراك الكامل' };
  }
  return { type: 'full_package', label: String(rawType).trim() || 'باقة الاشتراك الكامل' };
}

// Map column names flexibly
function normalizeKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\.\:\/]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function findValue(row: Record<string, any>, candidateKeys: string[]): any {
  const normCandidates = candidateKeys.map(normalizeKey);
  for (const [origKey, val] of Object.entries(row)) {
    const normKey = normalizeKey(origKey);
    if (normCandidates.includes(normKey)) {
      return val;
    }
  }
  return undefined;
}

/**
 * Match stage name to known stage ID
 */
export function matchStageId(stageNameOrGrade: string | undefined, knownStages: EducationalStage[]): string {
  if (!stageNameOrGrade) return knownStages[0]?.id || 'baraem';
  const norm = normalizeKey(stageNameOrGrade);

  // 1. Exact or partial match with stage names or IDs
  for (const s of knownStages) {
    const sNorm = normalizeKey(s.name);
    const idNorm = normalizeKey(s.id);
    if (sNorm.includes(norm) || norm.includes(sNorm) || idNorm.includes(norm) || norm.includes(idNorm)) {
      return s.id;
    }
    // Check target grades
    for (const g of s.targetGrades || []) {
      const gNorm = normalizeKey(g);
      if (gNorm.includes(norm) || norm.includes(gNorm)) {
        return s.id;
      }
    }
  }

  // 2. Keyword fallbacks
  if (norm.includes('براعم') || norm.includes('تمهيدي') || norm.includes('روضه') || norm.includes('kg')) return 'baraem';
  if (norm.includes('اشبال') || norm.includes('ثالث') || norm.includes('رابع')) return 'ashbal';
  if (norm.includes('فتيان') || norm.includes('خامس') || norm.includes('سادس')) return 'fityan';
  if (norm.includes('متوسط') || norm.includes('motawassit')) return 'motawassit';
  if (norm.includes('ثانوي') || norm.includes('thanawi') || norm.includes('شباب') || norm.includes('يافع')) return 'thanawi';
  if (norm.includes('جامع') || norm.includes('كبار') || norm.includes('خريج') || norm.includes('jamiyeen')) return 'jamiyeen';

  return knownStages[0]?.id || 'baraem';
}

/**
 * Parse Excel Workbook or JSON text into unified BulkImportDataset
 */
export async function parseBulkImportFile(
  fileOrBuffer: File | ArrayBuffer,
  existingStages: EducationalStage[],
  existingTracks: TrackDefinition[]
): Promise<BulkImportDataset> {
  let workbook: XLSX.WorkBook;

  if (fileOrBuffer instanceof File) {
    const data = await fileOrBuffer.arrayBuffer();
    workbook = XLSX.read(data, { type: 'array' });
  } else {
    workbook = XLSX.read(fileOrBuffer, { type: 'array' });
  }

  const sheetNames = workbook.SheetNames;
  const halaqahs: ParsedHalaqahItem[] = [];
  const staff: ParsedStaffItem[] = [];
  const parentsMap = new Map<string, ParsedParentItem>();
  const students: ParsedStudentItem[] = [];
  let tenantMeta: ParsedTenantMeta | undefined = undefined;

  // Filter out non-data sheets like Instructions
  const activeSheetNames = sheetNames.filter((sName) => {
    const norm = normalizeKey(sName);
    return !(
      norm.includes('تعليمات') ||
      norm.includes('instruction') ||
      norm.includes('ارشادات') ||
      norm.includes('دليل')
    );
  });

  if (activeSheetNames.length === 1) {
    // Master Unified Sheet
    const sheet = workbook.Sheets[activeSheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    processComprehensiveSheet(rows, halaqahs, staff, parentsMap, students, existingStages);
  } else {
    // Multi-sheet workbook: iterate over data sheets
    const sheetsToProcess = activeSheetNames.length > 0 ? activeSheetNames : sheetNames;

    for (const sName of sheetsToProcess) {
      const normName = normalizeKey(sName);
      if (normName.includes('تعليمات') || normName.includes('instruction') || normName.includes('ارشادات')) {
        continue;
      }
      const sheet = workbook.Sheets[sName];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows || rows.length === 0) continue;

      // Smart classification based on sheet name and headers
      const firstRow = rows[0] || {};
      const hasStudentHeader = !!findValue(firstRow, ['اسم الطالب', 'الطالب', 'student_name', 'الاسم', 'اسم_الطالب']);
      const hasParentPhoneHeader = !!findValue(firstRow, ['جوال ولي الأمر', 'هاتف ولي الأمر', 'رقم ولي الامر', 'جوال_ولي_الأمر', 'parent_phone']);
      const hasHalaqahHeader = !!findValue(firstRow, ['الحلقة', 'اسم الحلقة', 'halaqah', 'اسم_الحلقة']);
      const hasTeacherHeader = !!findValue(firstRow, ['اسم المعلم', 'المعلم', 'teacher']);
      const hasStaffRoleHeader = !!findValue(firstRow, ['المسمى الوظيفي', 'الدور', 'role']);

      // 1. Comprehensive / Master Sheet (has students + halaqahs/parents/teachers)
      if (
        normName.includes('شامل') ||
        normName.includes('comprehensive') ||
        normName.includes('master') ||
        (normName.includes('طالب') && (normName.includes('حلق') || normName.includes('معلم'))) ||
        (hasStudentHeader && (hasParentPhoneHeader || hasTeacherHeader))
      ) {
        processComprehensiveSheet(rows, halaqahs, staff, parentsMap, students, existingStages);
      }
      // 2. Tenant metadata sheet
      else if (normName.includes('مجمع') || normName.includes('بيانات_المجمع') || normName.includes('معلومات') || normName.includes('tenant')) {
        tenantMeta = parseTenantMetaSheet(rows);
      }
      // 3. Students Sheet
      else if (normName.includes('طالب') || normName.includes('طلاب') || normName.includes('student') || hasStudentHeader) {
        parseStudentsSheet(rows, students, parentsMap, halaqahs, existingStages);
      }
      // 4. Staff / Teachers Sheet
      else if (
        normName.includes('معلم') ||
        normName.includes('مدرس') ||
        normName.includes('teacher') ||
        normName.includes('كادر') ||
        hasStaffRoleHeader ||
        hasTeacherHeader
      ) {
        parseStaffSheet(rows, staff, 'teacher');
      }
      // 5. Supervisors Sheet
      else if (normName.includes('مشرف') || normName.includes('اداره') || normName.includes('supervisor')) {
        parseStaffSheet(rows, staff, 'supervisor');
      }
      // 6. Parents Sheet
      else if (normName.includes('ولي') || normName.includes('اولياء') || normName.includes('parent') || normName.includes('اباء')) {
        parseParentsSheet(rows, parentsMap);
      }
      // 7. Halaqahs Sheet
      else if (normName.includes('حلق') || normName.includes('فصول') || normName.includes('halaqah') || hasHalaqahHeader) {
        parseHalaqahsSheet(rows, halaqahs, existingStages);
      }
      // 8. Fallback
      else {
        if (hasStudentHeader) {
          processComprehensiveSheet(rows, halaqahs, staff, parentsMap, students, existingStages);
        } else if (hasHalaqahHeader) {
          parseHalaqahsSheet(rows, halaqahs, existingStages);
        }
      }
    }
  }

  // Cross-link and validate
  validateAndSynthesizeData(halaqahs, staff, parentsMap, students, existingStages);

  const parents = Array.from(parentsMap.values());

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  const allItems = [...halaqahs, ...staff, ...parents, ...students];
  for (const item of allItems) {
    if (item.isValid) {
      if (item.validationErrors.length > 0) {
        warningCount++;
      } else {
        validCount++;
      }
    } else {
      errorCount++;
    }
  }

  return {
    tenantMeta,
    stages: existingStages,
    tracks: existingTracks,
    halaqahs,
    staff,
    parents,
    students,
    summary: {
      totalHalaqahs: halaqahs.length,
      totalTeachers: staff.filter((s) => s.role === 'teacher').length,
      totalSupervisors: staff.filter((s) => s.role === 'supervisor').length,
      totalParents: parents.length,
      totalStudents: students.length,
      validCount,
      warningCount,
      errorCount,
    },
  };
}

/**
 * Parses JSON structure directly if user uploads a JSON export/schema
 */
export function parseBulkImportJson(
  jsonText: string,
  existingStages: EducationalStage[],
  existingTracks: TrackDefinition[]
): BulkImportDataset {
  const parsed = JSON.parse(jsonText);
  // Support both raw JSON object or structured export
  const halaqahs: ParsedHalaqahItem[] = (parsed.halaqahs || []).map((h: any) => ({
    name: h.name || '',
    grade: h.grade || 'صف أول',
    targetSurah: h.targetSurah || 'الغاشية',
    stageName: h.stageName || '',
    stageId: h.stageId || matchStageId(h.stageName, existingStages),
    teacherName: h.teacherName || '',
    teacherPhone: cleanPhoneNumber(h.teacherPhone || h.phone),
    timeSlot: h.timeSlot || 'عصراً',
    raw: h,
    isValid: !!h.name,
    validationErrors: !h.name ? ['اسم الحلقة مطلوب'] : [],
  }));

  const staff: ParsedStaffItem[] = (parsed.staff || parsed.teachers || parsed.supervisors || []).map((s: any) => {
    const cleanPhone = cleanPhoneNumber(s.phone || s.contactPhone);
    const role = s.role === 'supervisor' || s.staffRole === 'supervisor' ? 'supervisor' : 'teacher';
    const errs: string[] = [];
    if (!s.name && !s.fullName) errs.push('اسم المعلم/المشرف مطلوب');
    if (!cleanPhone) errs.push('رقم الجوال مطلوب لتسجيل الدخول');
    return {
      name: s.name || s.fullName || '',
      role,
      staffRole: s.staffRole || role,
      phone: cleanPhone,
      nationalId: s.nationalId || '',
      email: s.email || '',
      assignedHalaqahs: s.assignedHalaqahs || (s.halaqahName ? [s.halaqahName] : []),
      raw: s,
      isValid: errs.length === 0,
      validationErrors: errs,
    };
  });

  const parentsMap = new Map<string, ParsedParentItem>();
  if (Array.isArray(parsed.parents)) {
    for (const p of parsed.parents) {
      const cleanPhone = cleanPhoneNumber(p.phone);
      if (cleanPhone) {
        parentsMap.set(cleanPhone, {
          name: p.name || `ولي أمر (${cleanPhone})`,
          phone: cleanPhone,
          nationalId: p.nationalId || '',
          email: p.email || '',
          studentNames: p.studentNames || [],
          raw: p,
          isValid: true,
          validationErrors: [],
        });
      }
    }
  }

  const students: ParsedStudentItem[] = (parsed.students || []).map((st: any) => {
    const parentPhone = cleanPhoneNumber(st.parentPhone || st.phone);
    const errs: string[] = [];
    if (!st.name) errs.push('اسم الطالب مطلوب');
    if (!parentPhone) errs.push('رقم جوال ولي الأمر مطلوب');

    if (parentPhone && !parentsMap.has(parentPhone)) {
      parentsMap.set(parentPhone, {
        name: st.parentName || `ولي أمر الطالب ${st.name}`,
        phone: parentPhone,
        studentNames: [st.name],
        raw: {},
        isValid: true,
        validationErrors: [],
      });
    }

    return {
      name: st.name || '',
      nationalId: st.nationalId || '',
      birthDate: st.birthDate || '',
      grade: st.grade || 'صف أول',
      halaqahName: st.halaqahName || st.halaqah || '',
      stageName: st.stageName || '',
      stageId: st.stageId || matchStageId(st.stageName || st.grade, existingStages),
      parentName: st.parentName || '',
      parentPhone,
      parentRelationship: st.parentRelationship || 'أب',
      currentSurah: st.currentSurah || 'الفاتحة',
      currentAyah: Number(st.currentAyah) || 1,
      initialSpellingLevel: Number(st.initialSpellingLevel) || 1,
      raw: st,
      isValid: errs.length === 0,
      validationErrors: errs,
    };
  });

  validateAndSynthesizeData(halaqahs, staff, parentsMap, students, existingStages);

  const parents = Array.from(parentsMap.values());

  return {
    tenantMeta: parsed.tenantMeta,
    stages: existingStages,
    tracks: existingTracks,
    halaqahs,
    staff,
    parents,
    students,
    summary: {
      totalHalaqahs: halaqahs.length,
      totalTeachers: staff.filter((s) => s.role === 'teacher').length,
      totalSupervisors: staff.filter((s) => s.role === 'supervisor').length,
      totalParents: parents.length,
      totalStudents: students.length,
      validCount: halaqahs.length + staff.length + parents.length + students.length,
      warningCount: 0,
      errorCount: 0,
    },
  };
}

// Processing Helpers

function parseTenantMetaSheet(rows: Record<string, any>[]): ParsedTenantMeta {
  const meta: ParsedTenantMeta = {};
  for (const row of rows) {
    const key = String(row['المفتاح'] || row['الحقل'] || row['Field'] || row['key'] || '').trim();
    const val = String(row['القيمة'] || row['Value'] || row['value'] || '').trim();
    const norm = normalizeKey(key);

    if (norm.includes('اسم') && norm.includes('مجمع')) meta.name = val;
    else if (norm.includes('مدينه') || norm.includes('city')) meta.city = val;
    else if (norm.includes('حي') || norm.includes('district')) meta.district = val;
    else if (norm.includes('مشرف') && norm.includes('اسم')) meta.supervisorName = val;
    else if (norm.includes('مشرف') && norm.includes('جوال')) meta.supervisorPhone = cleanPhoneNumber(val);
    else if (norm.includes('هاتف') || norm.includes('تواصل')) meta.contactPhone = cleanPhoneNumber(val);
    else if (norm.includes('بريد') || norm.includes('email')) meta.email = val;
  }
  return meta;
}

function parseHalaqahsSheet(
  rows: Record<string, any>[],
  halaqahs: ParsedHalaqahItem[],
  stages: EducationalStage[]
) {
  for (const row of rows) {
    const name = String(findValue(row, ['اسم الحلقة', 'الحلقة', 'اسم الصف', 'halaqah_name', 'name', 'اسم_الحلقة']) || '').trim();
    if (!name) continue;

    const teacherName = String(findValue(row, ['اسم المعلم', 'المعلم', 'teacher_name', 'teacher', 'اسم_المعلم']) || '').trim();
    const teacherPhone = cleanPhoneNumber(findValue(row, ['جوال المعلم', 'هاتف المعلم', 'رقم المعلم', 'teacher_phone', 'جوال_المعلم']));
    const stageName = String(findValue(row, ['المرحلة', 'المرحلة الدراسية', 'stage', 'stage_name', 'المرحلة_الدراسية']) || '').trim();
    const grade = (findValue(row, ['الصف', 'grade', 'الصف_الدراسي']) || 'صف أول') as any;
    const targetSurah = String(findValue(row, ['السورة المستهدفة', 'المستهدف', 'target_surah', 'السورة_المستهدفة']) || 'الغاشية').trim();
    const timeSlot = String(findValue(row, ['الوقت', 'الفترة', 'time_slot', 'الفترة_الزمنية']) || 'عصراً').trim();

    const stageId = matchStageId(stageName || grade, stages);

    const validationErrors: string[] = [];
    if (!name) validationErrors.push('اسم الحلقة فارغ');

    const existingIndex = halaqahs.findIndex((h) => h.name === name);
    if (existingIndex >= 0) {
      const existing = halaqahs[existingIndex];
      if (teacherName && !existing.teacherName) existing.teacherName = teacherName;
      if (teacherPhone && !existing.teacherPhone) existing.teacherPhone = teacherPhone;
      if (stageName && !existing.stageName) existing.stageName = stageName;
      if (stageId && (!existing.stageId || existing.stageId === 'baraem')) existing.stageId = stageId;
      if (targetSurah && existing.targetSurah === 'الغاشية') existing.targetSurah = targetSurah;
      if (timeSlot) existing.timeSlot = timeSlot;
    } else {
      halaqahs.push({
        name,
        grade,
        targetSurah,
        stageName,
        stageId,
        teacherName,
        teacherPhone,
        timeSlot,
        raw: row,
        isValid: validationErrors.length === 0,
        validationErrors,
      });
    }
  }
}

function parseStaffSheet(
  rows: Record<string, any>[],
  staff: ParsedStaffItem[],
  defaultRole: 'teacher' | 'supervisor'
) {
  for (const row of rows) {
    const name = String(findValue(row, ['الاسم', 'اسم المعلم', 'اسم المشرف', 'الاسم الكامل', 'name', 'full_name', 'اسم_المعلم', 'الاسم_الكامل']) || '').trim();
    if (!name) continue;

    const phone = cleanPhoneNumber(findValue(row, ['الجوال', 'رقم الجوال', 'الهاتف', 'phone', 'mobile', 'جوال_المعلم', 'رقم_الجوال']));
    const nationalId = String(findValue(row, ['الهوية', 'رقم الهوية', 'السجل المدني', 'national_id', 'id_number', 'رقم_الهوية']) || '').trim();
    const email = String(findValue(row, ['البريد', 'البريد الإلكتروني', 'email', 'البريد_الإلكتروني']) || '').trim();
    const halaqahName = String(findValue(row, ['الحلقة', 'الحلقات', 'اسم الحلقة', 'الحلقات المسندة', 'assigned_halaqahs', 'الحلقات_المسندة']) || '').trim();
    const staffRole = String(findValue(row, ['الدور', 'المسمى الوظيفي', 'role', 'staff_role', 'المسمى_الوظيفي']) || defaultRole).trim();

    const role = staffRole.includes('مشرف') || staffRole.includes('supervisor') ? 'supervisor' : 'teacher';

    const validationErrors: string[] = [];
    if (!name) validationErrors.push('الاسم مطلوب');
    if (!phone) validationErrors.push('رقم الجوال مطلوب لتسجيل الدخول');

    const assigned = halaqahName ? halaqahName.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean) : [];

    const existingIndex = staff.findIndex((s) => (phone && s.phone === phone) || s.name === name);
    if (existingIndex >= 0) {
      const existing = staff[existingIndex];
      if (nationalId && !existing.nationalId) existing.nationalId = nationalId;
      if (email && !existing.email) existing.email = email;
      if (phone && !existing.phone) existing.phone = phone;
      if (assigned.length > 0) {
        existing.assignedHalaqahs = Array.from(new Set([...(existing.assignedHalaqahs || []), ...assigned]));
      }
    } else {
      staff.push({
        name,
        role,
        staffRole,
        phone,
        nationalId,
        email,
        assignedHalaqahs: assigned,
        raw: row,
        isValid: validationErrors.length === 0,
        validationErrors,
      });
    }
  }
}

function parseParentsSheet(rows: Record<string, any>[], parentsMap: Map<string, ParsedParentItem>) {
  for (const row of rows) {
    const name = String(findValue(row, ['اسم ولي الأمر', 'ولي الأمر', 'الاسم', 'اسم_ولي_الأمر', 'parent_name', 'name']) || '').trim();
    const phone = cleanPhoneNumber(findValue(row, ['الجوال', 'رقم الجوال', 'هاتف ولي الأمر', 'جوال_ولي_الأمر', 'phone', 'mobile']));
    if (!phone) continue;

    const nationalId = String(findValue(row, ['الهوية', 'السجل المدني', 'national_id', 'رقم_الهوية']) || '').trim();
    const email = String(findValue(row, ['البريد', 'email', 'البريد_الإلكتروني']) || '').trim();

    if (parentsMap.has(phone)) {
      const existing = parentsMap.get(phone)!;
      if (name && !existing.name) existing.name = name;
      if (nationalId && !existing.nationalId) existing.nationalId = nationalId;
      if (email && !existing.email) existing.email = email;
    } else {
      parentsMap.set(phone, {
        name: name || `ولي أمر (${phone})`,
        phone,
        nationalId,
        email,
        studentNames: [],
        raw: row,
        isValid: true,
        validationErrors: [],
      });
    }
  }
}

function parseStudentsSheet(
  rows: Record<string, any>[],
  students: ParsedStudentItem[],
  parentsMap: Map<string, ParsedParentItem>,
  halaqahs: ParsedHalaqahItem[],
  stages: EducationalStage[]
) {
  for (const row of rows) {
    const name = String(findValue(row, ['اسم الطالب', 'الطالب', 'الاسم الكامل', 'student_name', 'name', 'اسم_الطالب', 'الاسم']) || '').trim();
    if (!name) continue;

    const parentPhone = cleanPhoneNumber(
      findValue(row, ['جوال ولي الأمر', 'جوال ولي الامر', 'هاتف ولي الأمر', 'رقم الأب', 'رقم الاب', 'رقم ولي الامر', 'رقم ولي الأمر', 'parent_phone', 'phone', 'جوال_ولي_الأمر', 'جوال'])
    );
    const parentName = String(findValue(row, ['اسم ولي الأمر', 'اسم ولي الامر', 'اسم الأب', 'ولي الأمر', 'ولي الامر', 'parent_name', 'اسم_ولي_الأمر']) || '').trim();
    const halaqahName = String(findValue(row, ['الحلقة', 'اسم الحلقة', 'الصف', 'halaqah', 'halaqah_name', 'اسم_الحلقة']) || '').trim();
    const stageName = String(findValue(row, ['المرحلة', 'المرحلة الدراسية', 'stage', 'المرحلة_الدراسية']) || '').trim();
    const grade = String(findValue(row, ['الصف الدراسي', 'الصف', 'grade', 'الصف_الدراسي']) || 'صف أول').trim();
    const nationalId = String(findValue(row, ['رقم الهوية', 'الهوية', 'السجل المدني', 'national_id', 'student_id', 'رقم_الهوية']) || '').trim();
    const currentSurah = String(findValue(row, ['السورة الحالية', 'آخر سورة', 'سورة الحفظ', 'المحفوظ', 'السورة', 'current_surah', 'السورة_الحالية']) || 'الفاتحة').trim();
    const currentAyah = Number(findValue(row, ['الآية', 'الاية', 'رقم الآية', 'current_ayah'])) || 1;
    const initialSpellingLevel = Number(findValue(row, ['مستوى الهجاء', 'درس الهجاء', 'spelling_level', 'مستوى_الهجاء'])) || 1;

    const stageId = matchStageId(stageName || grade, stages);
    const regTypeRaw = findValue(row, ['باقة الاشتراك', 'نوع التسجيل', 'نوع الباقة', 'الباقة', 'باقة_الاشتراك', 'نوع_التسجيل', 'registration_type', 'package', 'package_type']);
    const { type: regType, label: regTypeLabel } = parseRegistrationType(regTypeRaw);

    const validationErrors: string[] = [];
    if (!name) validationErrors.push('اسم الطالب مطلوب');
    if (!parentPhone) {
      validationErrors.push('رقم جوال ولي الأمر مفقود (مهم للإشعارات والربط)');
    }

    if (parentPhone) {
      if (!parentsMap.has(parentPhone)) {
        parentsMap.set(parentPhone, {
          name: parentName || `ولي أمر الطالب ${name}`,
          phone: parentPhone,
          studentNames: [name],
          raw: {},
          isValid: true,
          validationErrors: [],
        });
      } else {
        const p = parentsMap.get(parentPhone)!;
        if (!p.studentNames.includes(name)) p.studentNames.push(name);
        if (parentName && p.name.startsWith('ولي أمر')) p.name = parentName;
      }
    }

    const existingIndex = students.findIndex(
      (s) => (nationalId && s.nationalId === nationalId) || (s.name === name && s.halaqahName === halaqahName)
    );
    if (existingIndex >= 0) {
      const existing = students[existingIndex];
      if (nationalId && !existing.nationalId) existing.nationalId = nationalId;
      if (parentPhone && !existing.parentPhone) existing.parentPhone = parentPhone;
      if (parentName && !existing.parentName) existing.parentName = parentName;
      if (halaqahName && !existing.halaqahName) existing.halaqahName = halaqahName;
      if (regTypeRaw && !existing.registrationType) {
        existing.registrationType = regType;
        existing.registrationTypeLabel = regTypeLabel;
      }
    } else {
      students.push({
        name,
        nationalId,
        grade,
        halaqahName,
        stageName,
        stageId,
        parentName,
        parentPhone,
        parentRelationship: 'أب',
        currentSurah,
        currentAyah,
        initialSpellingLevel,
        registrationType: regType,
        registrationTypeLabel: regTypeLabel,
        raw: row,
        isValid: validationErrors.length === 0 || (validationErrors.length === 1 && !parentPhone),
        validationErrors,
      });
    }
  }
}

/**
 * Handles a single comprehensive sheet where each row is a student with their teacher, halaqah, and parent details.
 */
function processComprehensiveSheet(
  rows: Record<string, any>[],
  halaqahs: ParsedHalaqahItem[],
  staff: ParsedStaffItem[],
  parentsMap: Map<string, ParsedParentItem>,
  students: ParsedStudentItem[],
  stages: EducationalStage[]
) {
  for (const row of rows) {
    const studentName = String(findValue(row, ['اسم الطالب', 'الطالب', 'الاسم الكامل', 'student_name', 'name', 'اسم_الطالب', 'الاسم']) || '').trim();
    if (!studentName) continue;

    const halaqahName = String(findValue(row, ['الحلقة', 'اسم الحلقة', 'فصل', 'اسم الفصل', 'halaqah_name', 'halaqah', 'اسم_الحلقة']) || 'حلقة عامة').trim();
    const teacherName = String(findValue(row, ['اسم المعلم', 'المعلم', 'الأستاذ', 'الاستاذ', 'teacher_name', 'teacher', 'اسم_المعلم']) || '').trim();
    const teacherPhone = cleanPhoneNumber(findValue(row, ['جوال المعلم', 'هاتف المعلم', 'رقم المعلم', 'teacher_phone', 'جوال_المعلم']));
    const parentName = String(findValue(row, ['اسم ولي الأمر', 'ولي الأمر', 'اسم الأب', 'parent_name', 'اسم_ولي_الأمر']) || '').trim();
    const parentPhone = cleanPhoneNumber(findValue(row, ['جوال ولي الأمر', 'رقم الأب', 'هاتف ولي الأمر', 'parent_phone', 'phone', 'جوال_ولي_الأمر', 'جوال']));
    const stageName = String(findValue(row, ['المرحلة', 'المرحلة الدراسية', 'stage', 'المرحلة_الدراسية']) || '').trim();
    const grade = String(findValue(row, ['الصف', 'الصف الدراسي', 'grade', 'الصف_الدراسي']) || 'صف أول').trim();
    const currentSurah = String(findValue(row, ['السورة', 'السورة الحالية', 'المحفوظ', 'current_surah', 'السورة_الحالية']) || 'الفاتحة').trim();
    const nationalId = String(findValue(row, ['رقم الهوية', 'الهوية', 'السجل المدني', 'national_id', 'id_number', 'رقم_الهوية']) || '').trim();
    const currentAyah = Number(findValue(row, ['الآية', 'الاية', 'رقم الآية', 'current_ayah'])) || 1;
    const initialSpellingLevel = Number(findValue(row, ['مستوى الهجاء', 'درس الهجاء', 'spelling_level', 'مستوى_الهجاء'])) || 1;

    const stageId = matchStageId(stageName || grade, stages);
    const regTypeRaw = findValue(row, ['باقة الاشتراك', 'نوع التسجيل', 'نوع الباقة', 'الباقة', 'باقة_الاشتراك', 'نوع_التسجيل', 'registration_type', 'package', 'package_type']);
    const { type: regType, label: regTypeLabel } = parseRegistrationType(regTypeRaw);

    // Register Teacher (deduplicated)
    if (teacherName) {
      const existingTeacher = staff.find((s) => (teacherPhone && s.phone === teacherPhone) || s.name === teacherName);
      if (!existingTeacher) {
        staff.push({
          name: teacherName,
          role: 'teacher',
          staffRole: 'teacher',
          phone: teacherPhone || '',
          assignedHalaqahs: [halaqahName],
          raw: row,
          isValid: true,
          validationErrors: !teacherPhone ? ['رقم هاتف المعلم غير مدون'] : [],
        });
      } else {
        if (teacherPhone && !existingTeacher.phone) existingTeacher.phone = teacherPhone;
        if (!existingTeacher.assignedHalaqahs?.includes(halaqahName)) {
          existingTeacher.assignedHalaqahs?.push(halaqahName);
        }
      }
    }

    // Register Halaqah (deduplicated)
    if (halaqahName) {
      const existingHalaqah = halaqahs.find((h) => h.name === halaqahName);
      if (!existingHalaqah) {
        halaqahs.push({
          name: halaqahName,
          grade: (grade as any) || 'صف أول',
          targetSurah: 'الغاشية',
          stageName,
          stageId,
          teacherName,
          teacherPhone,
          timeSlot: 'عصراً',
          raw: row,
          isValid: true,
          validationErrors: [],
        });
      } else {
        if (teacherName && !existingHalaqah.teacherName) existingHalaqah.teacherName = teacherName;
        if (teacherPhone && !existingHalaqah.teacherPhone) existingHalaqah.teacherPhone = teacherPhone;
        if (stageName && !existingHalaqah.stageName) existingHalaqah.stageName = stageName;
        if (stageId && (!existingHalaqah.stageId || existingHalaqah.stageId === 'baraem')) existingHalaqah.stageId = stageId;
      }
    }

    // Register Parent (deduplicated)
    if (parentPhone) {
      if (!parentsMap.has(parentPhone)) {
        parentsMap.set(parentPhone, {
          name: parentName || `ولي أمر الطالب ${studentName}`,
          phone: parentPhone,
          studentNames: [studentName],
          raw: row,
          isValid: true,
          validationErrors: [],
        });
      } else {
        const p = parentsMap.get(parentPhone)!;
        if (!p.studentNames.includes(studentName)) p.studentNames.push(studentName);
        if (parentName && p.name.startsWith('ولي أمر')) p.name = parentName;
      }
    }

    // Register Student (deduplicated)
    const existingStudent = students.find(
      (s) => (nationalId && s.nationalId === nationalId) || (s.name === studentName && s.halaqahName === halaqahName)
    );
    if (!existingStudent) {
      students.push({
        name: studentName,
        nationalId,
        grade,
        halaqahName,
        stageName,
        stageId,
        parentName,
        parentPhone,
        parentRelationship: 'أب',
        currentSurah,
        currentAyah,
        initialSpellingLevel,
        registrationType: regType,
        registrationTypeLabel: regTypeLabel,
        raw: row,
        isValid: true,
        validationErrors: !parentPhone ? ['رقم هاتف ولي الأمر غير مدون'] : [],
      });
    } else {
      if (regTypeRaw && !existingStudent.registrationType) {
        existingStudent.registrationType = regType;
        existingStudent.registrationTypeLabel = regTypeLabel;
      }
    }
  }
}

function validateAndSynthesizeData(
  halaqahs: ParsedHalaqahItem[],
  staff: ParsedStaffItem[],
  parentsMap: Map<string, ParsedParentItem>,
  students: ParsedStudentItem[],
  stages: EducationalStage[]
) {
  // Ensure every halaqah has a valid stageId
  for (const h of halaqahs) {
    if (!h.stageId) {
      h.stageId = matchStageId(h.stageName || h.grade, stages);
    }
  }

  // Cross reference students with halaqahs
  const halaqahNames = new Set(halaqahs.map((h) => h.name));
  for (const st of students) {
    if (st.halaqahName && !halaqahNames.has(st.halaqahName)) {
      // Auto-create missing halaqah
      const newH: ParsedHalaqahItem = {
        name: st.halaqahName,
        grade: (st.grade as any) || 'صف أول',
        targetSurah: 'الغاشية',
        stageId: st.stageId || matchStageId(st.stageName || st.grade, stages),
        stageName: st.stageName || '',
        timeSlot: 'عصراً',
        raw: {},
        isValid: true,
        validationErrors: ['تم استنتاجها تلقائياً من بيانات الطلاب'],
      };
      halaqahs.push(newH);
      halaqahNames.add(st.halaqahName);
    }
  }
}

/**
 * Generate Excel Template with comprehensive sample data covering the 6 educational stages
 */
export function generateBulkImportTemplatesWorkbook(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // 1. Instructions Sheet
  const instructions = [
    { 'تعليمات استيراد بيانات المجمع': 'مرحباً بك في نظام الاستيراد الذكي والشامل لمنصة إدارة مجمعات القرآن الكريم' },
    { 'تعليمات استيراد بيانات المجمع': 'يمكنك تعبئة بيانات المجمع بأحد خيارين حسب ما يناسبكم:' },
    { 'تعليمات استيراد بيانات المجمع': 'الخيار الأسهل (موصى به): ورقة [الطلاب والحلقات الشاملة] تجمع بيانات الطالب، حلقته، معلمه، وولي أمره في سطر واحد.' },
    { 'تعليمات استيراد بيانات المجمع': 'باقة الاشتراك: يمكن تحديد (باقة الاشتراك الكامل، باقة القرآن الكريم فقط، باقة الأنشطة والبرامج فقط، منحة دراسية / إعفاء). وفي حال تركها فارغة تُسجل كباقة كاملة تلقائياً.' },
    { 'تعليمات استيراد بيانات المجمع': 'الخيار المتقدم: تعبئة الأوراق المنفصلة [الحلقات والفصول]، [الكادر والمعلمون]، [أولياء الأمور].' },
    { 'تعليمات استيراد بيانات المجمع': 'المراحل الست المدعومة: مرحلة البراعم، مرحلة الأشبال، مرحلة الفتيان، مرحلة المتوسطة، مرحلة الثانوية، مرحلة الجامعيين.' },
    { 'تعليمات استيراد بيانات المجمع': 'أرقام الجوالات: تُستخدم مباشرة كاسم مستخدم لتسجيل الدخول بكلمة المرور الافتراضية (Admin@123456 أو 123456).' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInst, 'تعليمات الاستيراد');

  // 2. Comprehensive Students & Halaqahs Sheet (Recommended)
  const sampleStudentsComprehensive = [
    {
      'اسم الطالب': 'عبدالرحمن محمد الغامدي',
      'رقم الهوية': '1098765432',
      'باقة الاشتراك': 'باقة الاشتراك الكامل',
      'المرحلة': 'مرحلة البراعم',
      'الصف الدراسي': 'صف أول',
      'اسم الحلقة': 'حلقة براعم النور',
      'اسم المعلم': 'الشيخ عادل الشمري',
      'جوال المعلم': '0551122334',
      'اسم ولي الأمر': 'محمد الغامدي',
      'جوال ولي الأمر': '0501234567',
      'السورة الحالية': 'الفاتحة',
      'مستوى الهجاء': 1,
    },
    {
      'اسم الطالب': 'يوسف إبراهيم السالم',
      'رقم الهوية': '1122334455',
      'باقة الاشتراك': 'باقة القرآن الكريم فقط',
      'المرحلة': 'مرحلة البراعم',
      'الصف الدراسي': 'تمهيدي',
      'اسم الحلقة': 'حلقة براعم النور',
      'اسم المعلم': 'الشيخ عادل الشمري',
      'جوال المعلم': '0551122334',
      'اسم ولي الأمر': 'إبراهيم السالم',
      'جوال ولي الأمر': '0507654321',
      'السورة الحالية': 'الناس',
      'مستوى الهجاء': 2,
    },
    {
      'اسم الطالب': 'عمر خالد الدوسري',
      'رقم الهوية': '1199887766',
      'باقة الاشتراك': 'باقة الاشتراك الكامل',
      'المرحلة': 'مرحلة الأشبال',
      'الصف الدراسي': 'صف ثالث',
      'اسم الحلقة': 'حلقة فرسان القرآن',
      'اسم المعلم': 'الشيخ فهد العتيبي',
      'جوال المعلم': '0559988776',
      'اسم ولي الأمر': 'خالد الدوسري',
      'جوال ولي الأمر': '0561122334',
      'السورة الحالية': 'النبأ',
      'مستوى الهجاء': 5,
    },
    {
      'اسم الطالب': 'سعود عبدالله القرني',
      'رقم الهوية': '1188334455',
      'باقة الاشتراك': 'باقة الأنشطة والبرامج فقط',
      'المرحلة': 'مرحلة الفتيان',
      'الصف الدراسي': 'صف خامس',
      'اسم الحلقة': '',
      'اسم المعلم': '',
      'جوال المعلم': '',
      'اسم ولي الأمر': 'عبدالله القرني',
      'جوال ولي الأمر': '0544556677',
      'السورة الحالية': '',
      'مستوى الهجاء': 7,
    },
    {
      'اسم الطالب': 'أنس طارق الحربي',
      'رقم الهوية': '1177665544',
      'باقة الاشتراك': 'منحة دراسية / إعفاء',
      'المرحلة': 'مرحلة المتوسطة',
      'الصف الدراسي': 'ثاني متوسط',
      'اسم الحلقة': 'حلقة المهرة الحفاظ',
      'اسم المعلم': 'الشيخ فيصل العنزي',
      'جوال المعلم': '0533221100',
      'اسم ولي الأمر': 'طارق الحربي',
      'جوال ولي الأمر': '0509988776',
      'السورة الحالية': 'الكهف',
      'مستوى الهجاء': 10,
    },
  ];
  const wsComp = XLSX.utils.json_to_sheet(sampleStudentsComprehensive);
  XLSX.utils.book_append_sheet(wb, wsComp, 'الطلاب والحلقات الشاملة');

  // 3. Halaqahs Sheet
  const sampleHalaqahs = [
    {
      'اسم الحلقة': 'حلقة براعم النور',
      'المرحلة': 'مرحلة البراعم',
      'الصف': 'صف أول',
      'اسم المعلم': 'الشيخ عادل الشمري',
      'جوال المعلم': '0551122334',
      'السورة المستهدفة': 'الغاشية',
      'الفترة': 'عصراً',
    },
    {
      'اسم الحلقة': 'حلقة فرسان القرآن',
      'المرحلة': 'مرحلة الأشبال',
      'الصف': 'صف ثالث',
      'اسم المعلم': 'الشيخ فهد العتيبي',
      'جوال المعلم': '0559988776',
      'السورة المستهدفة': 'الملك',
      'الفترة': 'عصراً',
    },
    {
      'اسم الحلقة': 'حلقة الهدى والبيان',
      'المرحلة': 'مرحلة الفتيان',
      'الصف': 'صف خامس',
      'اسم المعلم': 'الشيخ إبراهيم القحطاني',
      'جوال المعلم': '0503344556',
      'السورة المستهدفة': 'النساء',
      'الفترة': 'عصراً',
    },
    {
      'اسم الحلقة': 'حلقة المهرة الحفاظ',
      'المرحلة': 'مرحلة المتوسطة',
      'الصف': 'ثاني متوسط',
      'اسم المعلم': 'الشيخ فيصل العنزي',
      'جوال المعلم': '0533221100',
      'السورة المستهدفة': 'التوبة',
      'الفترة': 'مساءً',
    },
  ];
  const wsHal = XLSX.utils.json_to_sheet(sampleHalaqahs);
  XLSX.utils.book_append_sheet(wb, wsHal, 'الحلقات والفصول');

  // 4. Staff Sheet (Teachers & Supervisors)
  const sampleStaff = [
    {
      'الاسم الكامل': 'الشيخ عادل الشمري',
      'المسمى الوظيفي': 'معلم قرآن',
      'رقم الجوال': '0551122334',
      'رقم الهوية': '1088776655',
      'البريد الإلكتروني': 'adel@example.com',
      'الحلقات المسندة': 'حلقة براعم النور',
    },
    {
      'الاسم الكامل': 'الشيخ فهد العتيبي',
      'المسمى الوظيفي': 'معلم قرآن',
      'رقم الجوال': '0559988776',
      'رقم الهوية': '1077665544',
      'البريد الإلكتروني': 'fahad@example.com',
      'الحلقات المسندة': 'حلقة فرسان القرآن',
    },
    {
      'الاسم الكامل': 'الشيخ إبراهيم القحطاني',
      'المسمى الوظيفي': 'معلم قرآن',
      'رقم الجوال': '0503344556',
      'رقم الهوية': '1055443322',
      'البريد الإلكتروني': 'ibrahim@example.com',
      'الحلقات المسندة': 'حلقة الهدى والبيان',
    },
    {
      'الاسم الكامل': 'أ. عبدالرحمن الشريف',
      'المسمى الوظيفي': 'مشرف تربوي',
      'رقم الجوال': '0505544332',
      'رقم الهوية': '1066554433',
      'البريد الإلكتروني': 'supervisor@example.com',
      'الحلقات المسندة': '',
    },
  ];
  const wsStaff = XLSX.utils.json_to_sheet(sampleStaff);
  XLSX.utils.book_append_sheet(wb, wsStaff, 'الكادر والمعلمون');

  // 5. Parents Sheet
  const sampleParents = [
    {
      'اسم ولي الأمر': 'محمد الغامدي',
      'رقم الجوال': '0501234567',
      'رقم الهوية': '1012345678',
      'البريد الإلكتروني': 'mohammed.g@example.com',
    },
    {
      'اسم ولي الأمر': 'إبراهيم السالم',
      'رقم الجوال': '0507654321',
      'رقم الهوية': '1023456789',
      'البريد الإلكتروني': 'ibrahim.s@example.com',
    },
    {
      'اسم ولي الأمر': 'خالد الدوسري',
      'رقم الجوال': '0561122334',
      'رقم الهوية': '1034567890',
      'البريد الإلكتروني': 'khaled.d@example.com',
    },
  ];
  const wsPar = XLSX.utils.json_to_sheet(sampleParents);
  XLSX.utils.book_append_sheet(wb, wsPar, 'أولياء الأمور');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}
