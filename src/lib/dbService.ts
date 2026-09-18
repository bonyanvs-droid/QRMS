/**
 * QRMS PostgreSQL Data Service
 * 
 * Full Operational Data Access Layer for QRMS.
 * 100% of operational reads, writes, mutations, and real-time subscriptions are routed
 * directly to the PostgreSQL database backend with zero Firestore dependencies.
 */

import { apiClient } from './api/apiClient';
import { StudentRepository } from './repositories/studentRepository';
import { HalaqahRepository } from './repositories/halaqahRepository';
import { DailyRecordRepository } from './repositories/dailyRecordRepository';
import { UserRepository } from './repositories/userRepository';
import { TenantRepository } from './repositories/tenantRepository';
import { AcademicRepository } from './repositories/academicRepository';
import { AdminRepository } from './repositories/adminRepository';
import { recordAuditLog } from './auditService';
import {
  AcademicYearConfig,
  DailySessionRecord,
  EducationalPlanWeek,
  Halaqah,
  ArchivedHalaqah,
  ReportLog,
  SpellingLesson,
  Student,
  Teacher,
  User,
  AuditLog,
  StudentBadge,
  RemedialActionPlan,
  MosqueComplexTenant,
  AcademicTermArchive,
  EducationalStage,
  RegistrationRequest,
  AdmissionStatus,
  StudentFinancialRecord,
  PaymentTransaction,
  PaymentStatus,
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
  FinanceSettingsData,
  AssociationNomination,
  NominationStatus,
  EmergencySupportSession,
  TrackDefinition,
  TrackNomination,
  TrackNominationStatus,
  AttendanceRecord,
  Organization,
  Meeting,
  SeasonalProgram,
  SeasonalActivity,
  SeasonalParticipation,
  FrontendConfig,
} from '../types';
import { StudentQuranPlan } from '../quran/types/plan';
import { StageQuranConfig, DEFAULT_STAGE_CONFIGS } from '../quran/models/stageConfig';

export type Unsubscribe = () => void;

/**
 * Native SHA-256 password hashing.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface DatabaseState {
  isInitialized: boolean;
  isSyncing: boolean;
  isOffline: boolean;
}

/**
 * Bootstraps database connectivity check and initial setup
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    const health = await apiClient.get('/health');
    console.log('[PostgreSQL] Database operational status:', health);
  } catch (err) {
    console.warn('[PostgreSQL] Database connection probe warning:', err);
  }
}

export async function seedAllStagesAndHalaqahsToFirestore(_force = false): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Seeding to PostgreSQL is managed via SQL migrations' };
}

export async function syncAllTenantsAdminUsers(): Promise<void> {
  // Managed by PostgreSQL users table
}

// -----------------------------------------------------------------------------
// Universal Subscription Helper for polymorphic argument lists
// -----------------------------------------------------------------------------

function parseSubArgs<T>(
  a1: any,
  a2?: any,
  a3?: any,
  a4?: any
): { callback: (data: T) => void; tenantId?: string; role?: string; entityId?: string } {
  if (typeof a1 === 'function') {
    return { callback: a1, tenantId: typeof a2 === 'string' ? a2 : undefined };
  }
  if (typeof a2 === 'function') {
    return { callback: a2, tenantId: typeof a1 === 'string' ? a1 : undefined };
  }
  if (typeof a3 === 'function') {
    return {
      callback: a3,
      tenantId: typeof a4 === 'string' ? a4 : typeof a1 === 'string' ? a1 : undefined,
      role: typeof a1 === 'string' ? a1 : undefined,
      entityId: typeof a2 === 'string' ? a2 : undefined,
    };
  }
  if (typeof a4 === 'function') {
    return {
      callback: a4,
      tenantId: typeof a1 === 'string' ? a1 : undefined,
    };
  }
  return { callback: () => {} };
}

// -----------------------------------------------------------------------------
// Realtime Subscriptions (PostgreSQL API Client Powered)
// -----------------------------------------------------------------------------

export function subscribeToUsers(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<User[]>(a1, a2, a3, a4);
  return UserRepository.subscribe(callback, tenantId);
}

export function subscribeToHalaqahs(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<Halaqah[]>(a1, a2, a3, a4);
  return HalaqahRepository.subscribe(callback, tenantId);
}

export function subscribeToStudents(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<Student[]>(a1, a2, a3, a4);
  return StudentRepository.subscribe(callback, tenantId);
}

export function subscribeToDailyRecords(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<DailySessionRecord[]>(a1, a2, a3, a4);
  return DailyRecordRepository.subscribe(callback, tenantId);
}

export function subscribeToSpellingLessons(
  callback: (lessons: SpellingLesson[]) => void,
  stageId?: string
): Unsubscribe {
  return AcademicRepository.subscribeSpellingLessons(callback, stageId);
}

export function subscribeToEducationalPlan(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<EducationalPlanWeek[]>(a1, a2, a3, a4);
  return AcademicRepository.subscribeEducationalPlans(callback, tenantId);
}

export function subscribeToAcademicConfig(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<AcademicYearConfig>(a1, a2, a3, a4);
  return TenantRepository.subscribeAcademicYears((years) => {
    if (years && years.length > 0) {
      callback(years[0]);
    }
  }, tenantId);
}

export function subscribeToAuditLogs(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<AuditLog[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeAuditLogs(callback, tenantId);
}

export function subscribeToReportLogs(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<ReportLog[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeReportLogs(callback, tenantId);
}

export function subscribeToBadges(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<StudentBadge[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeBadges(callback, tenantId);
}

export function subscribeToRemedialPlans(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<RemedialActionPlan[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeRemedialPlans(callback, tenantId);
}

export function subscribeToTenants(
  callback: (tenants: MosqueComplexTenant[]) => void
): Unsubscribe {
  return TenantRepository.subscribeTenants(callback);
}

export function subscribeToStages(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<EducationalStage[]>(a1, a2, a3, a4);
  return TenantRepository.subscribeStages(callback, tenantId);
}

export function subscribeToArchives(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<AcademicTermArchive[]>(a1, a2, a3, a4);
  return AcademicRepository.subscribeArchives(callback, tenantId);
}

export function subscribeToOrganizations(
  callback: (orgs: Organization[]) => void
): Unsubscribe {
  return AdminRepository.subscribeOrganizations(callback);
}

export function subscribeToQuranPlans(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<StudentQuranPlan[]>(a1, a2, a3, a4);
  return AcademicRepository.subscribeQuranPlans(callback, tenantId);
}

export function subscribeToQuranStageConfigs(
  callback: (configs: StageQuranConfig[]) => void
): Unsubscribe {
  return AcademicRepository.subscribeStageQuranConfigs(callback);
}

export function subscribeToAdmissions(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<RegistrationRequest[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeRegistrationRequests(callback, tenantId);
}

export function subscribeToFinancialRecords(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<StudentFinancialRecord[]>(a1, a2, a3, a4);
  return apiClient.subscribe<StudentFinancialRecord[]>('student_financial_records', callback, { tenantId });
}

export function subscribeToRevenues(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<RevenueItem[]>(a1, a2, a3, a4);
  return apiClient.subscribe<RevenueItem[]>('finance_revenues', callback, { tenantId });
}

export function subscribeToExpenses(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<ExpenseItem[]>(a1, a2, a3, a4);
  return apiClient.subscribe<ExpenseItem[]>('finance_expenses', callback, { tenantId });
}

export function subscribeToCustodies(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<Custody[]>(a1, a2, a3, a4);
  return apiClient.subscribe<Custody[]>('finance_custodies', callback, { tenantId });
}

export function subscribeToBudgetRequests(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<BudgetRequest[]>(a1, a2, a3, a4);
  return apiClient.subscribe<BudgetRequest[]>('finance_budget_requests', callback, { tenantId });
}

export function subscribeToFinanceSettings(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<FinanceSettingsData>(a1, a2, a3, a4);
  return apiClient.subscribe<FinanceSettingsData>('finance_settings', callback, { tenantId });
}

export function subscribeToNominations(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<AssociationNomination[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeAssociationNominations(callback, tenantId);
}

export function subscribeToSupportSessions(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<EmergencySupportSession[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeSupportSessions(callback, tenantId);
}

export function subscribeToTrackDefinitions(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<TrackDefinition[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeTrackDefinitions(callback, tenantId);
}

export function subscribeToTrackNominations(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<TrackNomination[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeTrackNominations(callback, tenantId);
}

export function subscribeToSeasonalPrograms(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<SeasonalProgram[]>(a1, a2, a3, a4);
  return AcademicRepository.subscribeSeasonalPrograms(callback, tenantId);
}

export function subscribeToSeasonalActivities(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<SeasonalActivity[]>(a1, a2, a3, a4);
  return AcademicRepository.subscribeSeasonalActivities(callback, tenantId);
}

export function subscribeToSeasonalParticipations(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<SeasonalParticipation[]>(a1, a2, a3, a4);
  return AcademicRepository.subscribeSeasonalParticipations(callback, tenantId);
}

export function subscribeToMeetings(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<Meeting[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeMeetings(callback, tenantId);
}

export function subscribeToStaffAttendance(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<AttendanceRecord[]>(a1, a2, a3, a4);
  return AdminRepository.subscribeStaffAttendance(callback, tenantId);
}

export function subscribeToArchivedHalaqahs(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<Halaqah[]>(a1, a2, a3, a4);
  return apiClient.subscribe<Halaqah[]>('halaqahs', callback, { isArchived: true, tenantId });
}

export function subscribeToArchivedUsers(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<User[]>(a1, a2, a3, a4);
  return apiClient.subscribe<User[]>('users', callback, { isArchived: true, tenantId });
}

export function subscribeToArchivedTeachers(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<User[]>(a1, a2, a3, a4);
  return apiClient.subscribe<User[]>('users', callback, { isArchived: true, role: 'teacher', tenantId });
}

export function subscribeToArchivedSupervisors(a1: any, a2?: any, a3?: any, a4?: any): Unsubscribe {
  const { callback, tenantId } = parseSubArgs<User[]>(a1, a2, a3, a4);
  return apiClient.subscribe<User[]>('users', callback, { isArchived: true, role: 'supervisor', tenantId });
}

// -----------------------------------------------------------------------------
// Database Mutations (PostgreSQL API Layer)
// -----------------------------------------------------------------------------

export async function saveStudent(student: Student, actor?: { id: string; name: string; role: any }): Promise<void> {
  await StudentRepository.save(student);
  if (actor) {
    recordAuditLog(actor, 'student', student.id, 'SAVE_STUDENT', { name: student.name }, student.tenantId);
  }
}

export async function deleteStudent(studentId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  await StudentRepository.delete(studentId);
  if (actor) {
    recordAuditLog(actor, 'student', studentId, 'DELETE_STUDENT', {}, undefined);
  }
}

export async function saveHalaqah(halaqah: Halaqah, actor?: { id: string; name: string; role: any }): Promise<void> {
  await HalaqahRepository.save(halaqah);
  if (actor) {
    recordAuditLog(actor, 'halaqah', halaqah.id, 'SAVE_HALAQAH', { name: halaqah.name }, halaqah.tenantId);
  }
}

export async function deleteHalaqah(halaqahId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  await HalaqahRepository.delete(halaqahId);
  if (actor) {
    recordAuditLog(actor, 'halaqah', halaqahId, 'DELETE_HALAQAH', {}, undefined);
  }
}

export async function archiveHalaqah(
  halaqahOrId: Halaqah | string,
  actorOrReason?: any,
  reasonOrActor?: any
): Promise<void> {
  const id = typeof halaqahOrId === 'string' ? halaqahOrId : halaqahOrId.id;
  const actor = typeof actorOrReason === 'object' ? actorOrReason : typeof reasonOrActor === 'object' ? reasonOrActor : undefined;
  const reason = typeof actorOrReason === 'string' ? actorOrReason : typeof reasonOrActor === 'string' ? reasonOrActor : 'أرشفة حلقة';

  const h = typeof halaqahOrId === 'object' ? halaqahOrId : await HalaqahRepository.getById(id);
  if (h) {
    await HalaqahRepository.save({ ...h, isArchived: true, archiveReason: reason, archivedAt: new Date().toISOString() });
    if (actor) {
      recordAuditLog(actor, 'halaqah', id, 'ARCHIVE_HALAQAH', { reason }, h.tenantId);
    }
  }
}

export async function restoreHalaqah(halaqahOrId: Halaqah | string, actor?: { id: string; name: string; role: any }): Promise<void> {
  const id = typeof halaqahOrId === 'string' ? halaqahOrId : halaqahOrId.id;
  const h = typeof halaqahOrId === 'object' ? halaqahOrId : await HalaqahRepository.getById(id);
  if (h) {
    await HalaqahRepository.save({ ...h, isArchived: false, archiveReason: undefined, archivedAt: undefined });
    if (actor) {
      recordAuditLog(actor, 'halaqah', id, 'RESTORE_HALAQAH', {}, h.tenantId);
    }
  }
}

export async function permanentlyDeleteArchivedHalaqah(halaqahId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  await HalaqahRepository.delete(halaqahId);
  if (actor) {
    recordAuditLog(actor, 'halaqah', halaqahId, 'PERM_DELETE_HALAQAH', {}, undefined);
  }
}

export async function saveUser(user: User, actor?: { id: string; name: string; role: any }): Promise<void> {
  await UserRepository.save(user);
  if (actor) {
    recordAuditLog(actor, 'auth', user.id, 'SAVE_USER', { name: user.name, role: user.role }, user.tenantId);
  }
}

export async function archiveUser(
  userOrId: User | Teacher | string,
  actorOrReason?: any,
  reasonOrActor?: any
): Promise<void> {
  const id = typeof userOrId === 'string' ? userOrId : userOrId.id;
  const actor = typeof actorOrReason === 'object' ? actorOrReason : typeof reasonOrActor === 'object' ? reasonOrActor : undefined;
  const reason = typeof actorOrReason === 'string' ? actorOrReason : typeof reasonOrActor === 'string' ? reasonOrActor : 'أرشفة مستخدم';

  const u = typeof userOrId === 'object' ? (userOrId as any) : await UserRepository.getById(id);
  if (u) {
    await UserRepository.save({ ...u, isArchived: true, archiveReason: reason, archivedAt: new Date().toISOString() });
    if (actor) {
      recordAuditLog(actor, 'auth', id, 'ARCHIVE_USER', { reason }, u.tenantId);
    }
  }
}

export async function restoreUser(userId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  const u = await UserRepository.getById(userId);
  if (u) {
    await UserRepository.save({ ...u, isArchived: false, archiveReason: undefined, archivedAt: undefined });
    if (actor) {
      recordAuditLog(actor, 'auth', userId, 'RESTORE_USER', {}, u.tenantId);
    }
  }
}

export async function permanentlyDeleteUser(userId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  await UserRepository.delete(userId);
  if (actor) {
    recordAuditLog(actor, 'auth', userId, 'PERM_DELETE_USER', {}, undefined);
  }
}

export async function archiveTeacherInDb(
  teacherOrId: Teacher | User | string,
  actorOrReason?: any,
  reasonOrActor?: any
): Promise<void> {
  return archiveUser(teacherOrId, actorOrReason, reasonOrActor);
}

export async function restoreTeacherFromDb(teacherId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  return restoreUser(teacherId, actor);
}

export async function permanentlyDeleteTeacherFromDb(teacherId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  return permanentlyDeleteUser(teacherId, actor);
}

export async function archiveSupervisorInDb(
  supervisorOrId: User | string,
  actorOrReason?: any,
  reasonOrActor?: any
): Promise<void> {
  return archiveUser(supervisorOrId, actorOrReason, reasonOrActor);
}

export async function restoreSupervisorFromDb(userId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  return restoreUser(userId, actor);
}

export async function permanentlyDeleteSupervisorFromDb(userId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  return permanentlyDeleteUser(userId, actor);
}

export async function deleteUser(userId: string, actor?: { id: string; name: string; role: any }): Promise<void> {
  await UserRepository.delete(userId);
  if (actor) {
    recordAuditLog(actor, 'auth', userId, 'DELETE_USER', {}, undefined);
  }
}

export async function saveDailySessionRecord(record: DailySessionRecord, actor?: { id: string; name: string; role: any }): Promise<void> {
  await DailyRecordRepository.save(record);
  if (actor) {
    recordAuditLog(actor, 'session_record', record.id, 'SAVE_DAILY_RECORD', { studentId: record.studentId, date: record.date }, record.tenantId);
  }
}

export async function saveBulkAttendance(records: DailySessionRecord[], actor?: { id: string; name: string; role: any }): Promise<void> {
  await DailyRecordRepository.bulkSave(records);
  if (actor && records.length > 0) {
    recordAuditLog(actor, 'session_record', 'bulk', 'BULK_ATTENDANCE', { count: records.length }, records[0].tenantId);
  }
}

export async function saveSpellingLesson(lesson: SpellingLesson, _actor?: any): Promise<void> {
  await AcademicRepository.saveSpellingLesson(lesson);
}

export async function deleteSpellingLesson(lessonId: string, _actor?: any): Promise<void> {
  await apiClient.delete(`/spelling_lessons/${lessonId}`);
}

export async function saveEducationalPlanWeek(plan: EducationalPlanWeek, _actor?: any): Promise<void> {
  await AcademicRepository.saveEducationalPlan(plan);
}

export async function saveBulkEducationalPlanWeeks(plans: EducationalPlanWeek[], _actor?: any): Promise<void> {
  await apiClient.post('/educational_plan_weeks/bulk', { items: plans });
}

export async function deleteEducationalPlanWeek(id: string, _actor?: any): Promise<void> {
  await apiClient.delete(`/educational_plan_weeks/${id}`);
}

export async function deleteBulkEducationalPlanWeeks(ids: string[], _actor?: any): Promise<void> {
  for (const id of ids) {
    await apiClient.delete(`/educational_plan_weeks/${id}`);
  }
}

export async function saveSeasonalProgram(program: SeasonalProgram, _actor?: any): Promise<void> {
  await AcademicRepository.saveSeasonalProgram(program);
}

export async function deleteSeasonalProgram(id: string, _titleOrActor?: any, _actor?: any): Promise<void> {
  await AcademicRepository.deleteSeasonalProgram(id);
}

export async function saveSeasonalActivity(activity: SeasonalActivity, _actor?: any): Promise<void> {
  await AcademicRepository.saveSeasonalActivity(activity);
}

export async function deleteSeasonalActivity(id: string, _titleOrActor?: any, _actor?: any): Promise<void> {
  await AcademicRepository.deleteSeasonalActivity(id);
}

export async function saveSeasonalParticipation(part: SeasonalParticipation, _actor?: any): Promise<void> {
  await AcademicRepository.saveSeasonalParticipation(part);
}

export async function deleteSeasonalParticipation(id: string, _actor?: any): Promise<void> {
  await AcademicRepository.deleteSeasonalParticipation(id);
}

export async function saveAcademicConfig(config: AcademicYearConfig, _actor?: any): Promise<void> {
  await TenantRepository.saveAcademicYear(config);
}

export async function saveReportLog(log: ReportLog, _actor?: any): Promise<void> {
  await AdminRepository.saveReportLog(log);
}

export async function changeUserPassword(userId: string, newPass: string, _actor?: any): Promise<boolean> {
  try {
    await apiClient.post('/auth/update-password', { userId, newPassword: newPass });
    return true;
  } catch (e) {
    console.error('Password change error:', e);
    return false;
  }
}

export async function saveBadgeToDb(badge: StudentBadge, _actor?: any): Promise<void> {
  await AdminRepository.saveBadge(badge);
}

export async function deleteBadgeFromDb(id: string, _actor?: any): Promise<void> {
  await AdminRepository.deleteBadge(id);
}

export async function saveRemedialPlanToDb(plan: RemedialActionPlan, _actor?: any): Promise<void> {
  await AdminRepository.saveRemedialPlan(plan);
}

export async function resolveRemedialPlanInDb(id: string, notes?: string, _actor?: any): Promise<void> {
  const existing = await apiClient.get<RemedialActionPlan>(`/remedial_plans/${id}`);
  if (existing) {
    await AdminRepository.saveRemedialPlan({
      ...existing,
      status: 'resolved',
      notes: notes || existing.notes,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function saveTenantToDb(
  tenant: MosqueComplexTenant,
  _actor?: any,
  _initialPassword?: string
): Promise<void> {
  await TenantRepository.saveTenant(tenant);
}

export async function updateTenantAdminPasswordInDb(tenantId: string, newPass: string, _actor?: any): Promise<boolean> {
  const users = await UserRepository.getAll(tenantId);
  const admin = users.find((u) => u.role === 'admin' || u.role === 'campus_admin');
  if (admin) {
    return changeUserPassword(admin.id, newPass, _actor);
  }
  return false;
}

export async function deleteTenantFromDb(tenantId: string, _actor?: any): Promise<void> {
  await TenantRepository.deleteTenant(tenantId);
}

export async function saveStageToDb(stage: EducationalStage, _actor?: any): Promise<void> {
  await TenantRepository.saveStage(stage);
}

export async function deleteStageFromDb(stageId: string, _actor?: any): Promise<void> {
  await apiClient.delete(`/stages/${stageId}`);
}

export async function saveArchiveToDb(archive: AcademicTermArchive, _actor?: any): Promise<void> {
  await AcademicRepository.saveArchive(archive);
}

export async function saveOrganizationToDb(org: Organization, _actor?: any): Promise<void> {
  await AdminRepository.saveOrganization(org);
}

export async function deleteOrganizationFromDb(id: string, _actor?: any): Promise<void> {
  await apiClient.delete(`/organizations/${id}`);
}

export async function saveQuranPlanToDb(plan: StudentQuranPlan, _actor?: any): Promise<void> {
  await AcademicRepository.saveQuranPlan(plan);
}

export async function getQuranPlansForStudentFromDb(studentId: string): Promise<StudentQuranPlan[]> {
  const plans = await AcademicRepository.getQuranPlans();
  return plans.filter((p) => p.studentId === studentId);
}

export async function deleteQuranPlanFromDb(planId: string, _actor?: any): Promise<void> {
  await apiClient.delete(`/quran_plans/${planId}`);
}

export async function saveQuranStageConfigToDb(config: StageQuranConfig, _actor?: any): Promise<void> {
  await AcademicRepository.saveStageQuranConfig(config);
}

export async function deleteQuranStageConfigFromDb(id: string, _actor?: any): Promise<void> {
  await apiClient.delete(`/quran_stage_configs/${id}`);
}

export async function resetQuranStageConfigsInDb(_actor?: any): Promise<StageQuranConfig[]> {
  for (const cfg of DEFAULT_STAGE_CONFIGS) {
    await AcademicRepository.saveStageQuranConfig(cfg);
  }
  return DEFAULT_STAGE_CONFIGS;
}

export async function saveAdmissionsRequest(req: RegistrationRequest, _actor?: any): Promise<void> {
  await AdminRepository.saveRegistrationRequest(req);
}

export async function updateAdmissionsStatus(
  id: string,
  status: AdmissionStatus,
  extras?: { interviewNotes?: string; notes?: string } | string,
  _actor?: any
): Promise<void> {
  const req = await apiClient.get<RegistrationRequest>(`/registration_requests/${id}`);
  if (req) {
    const notes = typeof extras === 'string' ? extras : extras?.notes || extras?.interviewNotes;
    await AdminRepository.saveRegistrationRequest({
      ...req,
      status,
      interviewNotes: notes || req.interviewNotes,
    });
  }
}

export async function saveFinancialRecord(rec: StudentFinancialRecord, _actor?: any): Promise<void> {
  await apiClient.post('/student_financial_records', rec);
}

export async function recordFinancialPayment(
  recordId: string,
  tx: PaymentTransaction,
  _actor?: any
): Promise<void> {
  const rec = await apiClient.get<StudentFinancialRecord>(`/student_financial_records/${recordId}`);
  if (rec) {
    const payments = [...(rec.payments || []), tx];
    const paidAmount = payments.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const base = Number(rec.baseTuition) || 0;
    const discount = Number(rec.discountAmount) || 0;
    const scholarship = Number(rec.scholarshipAmount) || 0;
    const netDue = Math.max(0, base - discount - scholarship);
    const remainingAmount = Math.max(0, netDue - paidAmount);
    const status: PaymentStatus = rec.isExempt || netDue === 0
      ? 'exempted'
      : remainingAmount === 0
      ? 'fully_paid'
      : paidAmount > 0
      ? 'partially_paid'
      : 'unpaid';

    await apiClient.post('/student_financial_records', {
      ...rec,
      payments,
      paidAmount,
      remainingAmount,
      status,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function saveRevenueItem(item: RevenueItem): Promise<void> {
  await apiClient.post('/finance_revenues', item);
}

export async function deleteRevenueItem(id: string): Promise<void> {
  await apiClient.delete(`/finance_revenues/${id}`);
}

export async function saveExpenseItem(item: ExpenseItem): Promise<void> {
  await apiClient.post('/finance_expenses', item);
}

export async function deleteExpenseItem(id: string): Promise<void> {
  await apiClient.delete(`/finance_expenses/${id}`);
}

export async function saveCustody(custody: Custody): Promise<void> {
  await apiClient.post('/finance_custodies', custody);
}

export async function deleteCustody(id: string): Promise<void> {
  await apiClient.delete(`/finance_custodies/${id}`);
}

export async function saveCustodyExpenseItem(item: CustodyExpenseItem): Promise<void> {
  await apiClient.post('/finance_custody_expenses', item);
}

export async function deleteCustodyExpenseItem(custodyId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/finance_custody_expenses/${itemId}`);
}

export async function saveBudgetRequest(req: BudgetRequest): Promise<void> {
  await apiClient.post('/finance_budget_requests', req);
}

export async function deleteBudgetRequest(id: string): Promise<void> {
  await apiClient.delete(`/finance_budget_requests/${id}`);
}

export async function saveFinanceSettings(settings: FinanceSettingsData): Promise<void> {
  await apiClient.post('/finance_settings', settings);
}

export async function saveAssociationNomination(nom: AssociationNomination, _actor?: any): Promise<void> {
  await AdminRepository.saveAssociationNomination(nom);
}

export async function updateNominationStatus(
  id: string,
  status: NominationStatus,
  extras?: { supervisorNotes?: string } | string,
  _actor?: any
): Promise<void> {
  const nom = await apiClient.get<AssociationNomination>(`/association_nominations/${id}`);
  if (nom) {
    const supervisorNotes = typeof extras === 'string' ? extras : extras?.supervisorNotes;
    await AdminRepository.saveAssociationNomination({
      ...nom,
      supervisorStatus: status,
      supervisorNotes: supervisorNotes || nom.supervisorNotes,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function startSupportSession(session: EmergencySupportSession, _actor?: any): Promise<void> {
  await AdminRepository.saveSupportSession(session);
}

export async function endSupportSession(id: string, _actor?: any): Promise<void> {
  const session = await apiClient.get<EmergencySupportSession>(`/support_sessions/${id}`);
  if (session) {
    await AdminRepository.saveSupportSession({
      ...session,
      isActive: false,
    });
  }
}

export async function saveTrackDefinition(track: TrackDefinition, _actor?: any): Promise<void> {
  await AdminRepository.saveTrackDefinition(track);
}

export async function deleteTrackDefinition(id: string, _actor?: any): Promise<void> {
  await AdminRepository.deleteTrackDefinition(id);
}

export async function deleteAllTrackDefinitions(tenantId?: string, _actor?: any): Promise<void> {
  const tracks = await AdminRepository.getTrackDefinitions(tenantId);
  for (const t of tracks) {
    await AdminRepository.deleteTrackDefinition(t.id);
  }
}

export async function saveTrackNomination(nom: TrackNomination, _actor?: any): Promise<void> {
  await AdminRepository.saveTrackNomination(nom);
}

export async function updateTrackNominationStatus(
  id: string,
  status: TrackNominationStatus,
  extras?: Partial<TrackNomination>,
  _actor?: any
): Promise<void> {
  const nom = await apiClient.get<TrackNomination>(`/track_nominations/${id}`);
  if (nom) {
    await AdminRepository.saveTrackNomination({
      ...nom,
      status,
      ...extras,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function deleteStaffAttendanceRecord(recordId: string, _actor?: any): Promise<void> {
  await AdminRepository.deleteStaffAttendance(recordId);
}

export async function saveStaffAttendanceRecord(record: AttendanceRecord, _actor?: any): Promise<AttendanceRecord> {
  return AdminRepository.saveStaffAttendance(record);
}

export async function saveMeetingToDb(meeting: Meeting, _actor?: any): Promise<void> {
  await AdminRepository.saveMeeting(meeting);
}

export async function updateMeetingInDb(
  meetingId: string,
  data: Partial<Meeting>,
  _actor?: any,
  _actionLabel?: string
): Promise<void> {
  const current = await apiClient.get<Meeting>(`/meetings/${meetingId}`);
  if (current) {
    await AdminRepository.saveMeeting({ ...current, ...data, id: meetingId });
  }
}

export async function deleteMeetingFromDb(meetingId: string, _actor?: any): Promise<void> {
  await AdminRepository.deleteMeeting(meetingId);
}

export async function getFrontendConfig(configId: string): Promise<FrontendConfig | null> {
  return AdminRepository.getFrontendConfig(configId);
}

export async function saveFrontendConfig(configId: string, config: Partial<FrontendConfig>): Promise<FrontendConfig> {
  return AdminRepository.saveFrontendConfig(configId, config);
}

// Aliases matching AppContext db* conventions
export const dbSaveStudent = saveStudent;
export const dbDeleteStudent = deleteStudent;
export const dbSaveHalaqah = saveHalaqah;
export const dbDeleteHalaqah = deleteHalaqah;
export const dbArchiveHalaqah = archiveHalaqah;
export const dbRestoreHalaqah = restoreHalaqah;
export const dbPermDeleteHalaqah = permanentlyDeleteArchivedHalaqah;
export const dbSaveUser = saveUser;
export const dbDeleteUser = deleteUser;
export const dbArchiveTeacher = archiveTeacherInDb;
export const dbRestoreTeacher = restoreTeacherFromDb;
export const dbPermDeleteTeacher = permanentlyDeleteTeacherFromDb;
export const dbArchiveSupervisor = archiveSupervisorInDb;
export const dbRestoreSupervisor = restoreSupervisorFromDb;
export const dbPermDeleteSupervisor = permanentlyDeleteSupervisorFromDb;
export const dbSaveDailySessionRecord = saveDailySessionRecord;
export const dbSaveBulkAttendance = saveBulkAttendance;
export const dbSavePlanWeek = saveEducationalPlanWeek;
export const dbSaveBulkPlanWeeks = saveBulkEducationalPlanWeeks;
export const dbDeletePlanWeek = deleteEducationalPlanWeek;
export const dbDeleteBulkPlanWeeks = deleteBulkEducationalPlanWeeks;
export const dbSaveSeasonalProgram = saveSeasonalProgram;
export const dbDeleteSeasonalProgram = deleteSeasonalProgram;
export const dbSaveSeasonalActivity = saveSeasonalActivity;
export const dbDeleteSeasonalActivity = deleteSeasonalActivity;
export const dbSaveSeasonalParticipation = saveSeasonalParticipation;
export const dbDeleteSeasonalParticipation = deleteSeasonalParticipation;
export const dbSaveAcademicConfig = saveAcademicConfig;
export const dbSaveReportLog = saveReportLog;
export const dbSaveAdmissionsRequest = saveAdmissionsRequest;
export const dbUpdateAdmissionsStatus = updateAdmissionsStatus;
export const dbSaveFinancialRecord = saveFinancialRecord;
export const dbRecordFinancialPayment = recordFinancialPayment;
export const dbSaveRevenueItem = saveRevenueItem;
export const dbDeleteRevenueItem = deleteRevenueItem;
export const dbSaveExpenseItem = saveExpenseItem;
export const dbDeleteExpenseItem = deleteExpenseItem;
export const dbSaveCustody = saveCustody;
export const dbDeleteCustody = deleteCustody;
export const dbSaveCustodyExpenseItem = saveCustodyExpenseItem;
export const dbDeleteCustodyExpenseItem = deleteCustodyExpenseItem;
export const dbSaveBudgetRequest = saveBudgetRequest;
export const dbDeleteBudgetRequest = deleteBudgetRequest;
export const dbSaveFinanceSettings = saveFinanceSettings;
export const dbSaveAssociationNomination = saveAssociationNomination;
export const dbUpdateNominationStatus = updateNominationStatus;
export const dbStartSupportSession = startSupportSession;
export const dbEndSupportSession = endSupportSession;
export const dbSaveTrackDefinition = saveTrackDefinition;
export const dbDeleteTrackDefinition = deleteTrackDefinition;
export const dbDeleteAllTrackDefinitions = deleteAllTrackDefinitions;
export const dbSaveTrackNomination = saveTrackNomination;
export const dbUpdateTrackNominationStatus = updateTrackNominationStatus;
export const dbSaveMeetingToDb = saveMeetingToDb;
export const dbUpdateMeetingInDb = updateMeetingInDb;
export const dbDeleteMeetingFromDb = deleteMeetingFromDb;

// Local storage key constants
export const LOCAL_STORAGE_KEY_QURAN_PLANS = 'al_ghazzawi_quran_plans_v1';
export const LOCAL_STORAGE_KEY_STAGE_CONFIGS = 'al_ghazzawi_stage_configs_v1';

// Online classroom live state helpers
export async function getOnlineSession(sessionId: string): Promise<any> {
  return apiClient.get(`/online-sessions/${sessionId}`);
}

export async function saveOnlineSession(sessionId: string, sessionData: any): Promise<any> {
  return apiClient.post(`/online-sessions/${sessionId}`, sessionData);
}

export function subscribeToOnlineSession(sessionId: string, callback: (data: any) => void): Unsubscribe {
  let isSubscribed = true;
  const poll = async () => {
    try {
      const data = await getOnlineSession(sessionId);
      if (isSubscribed) {
        callback(data);
      }
    } catch {
      // Ignored
    }
  };
  poll();
  const timer = setInterval(poll, 3000);
  return () => {
    isSubscribed = false;
    clearInterval(timer);
  };
}
