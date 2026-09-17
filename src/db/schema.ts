/**
 * QRMS Database Schema Types & Table Definitions
 * 
 * Provides 1:1 mapping between PostgreSQL table columns (snake_case)
 * and QRMS domain entities (camelCase) to ensure complete type safety.
 */

import {
  MosqueComplexTenant,
  User,
  Student,
  Halaqah,
  EducationalStage,
  SpellingLesson,
  DailySessionRecord,
  EducationalPlanWeek,
  SeasonalProgram,
  SeasonalActivity,
  SeasonalParticipation,
  StudentFinancialRecord,
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
  FinanceSettingsData,
  RegistrationRequest,
  TrackDefinition,
  TrackNomination,
  AssociationNomination,
  StudentBadge,
  StudentPointRule,
  StudentPointTransaction,
  RemedialActionPlan,
  Meeting,
  AttendanceRecord,
  TenantPrayerTimesDocument,
  FrontendConfig,
  AuditLog,
  ReportLog,
  AcademicTermArchive,
  EmergencySupportSession,
  AcademicYearConfig,
  Organization,
} from '../types';
import { StageQuranConfig } from '../quran/models/stageConfig';
import { StudentQuranPlan } from '../quran/types/plan';

export interface DbTableMapping {
  organizations: Organization;
  tenants: MosqueComplexTenant;
  stages: EducationalStage;
  quran_stage_configs: StageQuranConfig;
  academic_years: AcademicYearConfig;
  users: User;
  halaqahs: Halaqah;
  spelling_lessons: SpellingLesson;
  students: Student;
  quran_plans: StudentQuranPlan;
  daily_session_records: DailySessionRecord;
  educational_plan_weeks: EducationalPlanWeek;
  seasonal_programs: SeasonalProgram;
  seasonal_activities: SeasonalActivity;
  seasonal_participations: SeasonalParticipation;
  student_financial_records: StudentFinancialRecord;
  finance_revenues: RevenueItem;
  finance_expenses: ExpenseItem;
  finance_custodies: Custody;
  finance_custody_expenses: CustodyExpenseItem;
  finance_budget_requests: BudgetRequest;
  finance_settings: FinanceSettingsData;
  registration_requests: RegistrationRequest;
  track_definitions: TrackDefinition;
  track_nominations: TrackNomination;
  association_nominations: AssociationNomination;
  student_badges: StudentBadge;
  student_point_rules: StudentPointRule;
  student_points: StudentPointTransaction;
  remedial_plans: RemedialActionPlan;
  meetings: Meeting;
  staff_attendance: AttendanceRecord;
  prayer_times: TenantPrayerTimesDocument;
  frontend_configs: FrontendConfig;
  audit_logs: AuditLog;
  report_logs: ReportLog;
  academic_archives: AcademicTermArchive;
  support_sessions: EmergencySupportSession;
}

export type DbTableName = keyof DbTableMapping;

/**
 * Utility to convert PostgreSQL snake_case rows into camelCase objects
 */
export function snakeToCamelCase<T = any>(obj: any): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => snakeToCamelCase(item)) as unknown as T;
  }
  const camelObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = snakeToCamelCase(value);
  }
  return camelObj as T;
}

/**
 * Utility to convert camelCase objects into PostgreSQL snake_case column key-value pairs
 */
export function camelToSnakeCase<T = any>(obj: any): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => camelToSnakeCase(item)) as unknown as T;
  }
  const snakeObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = camelToSnakeCase(value);
  }
  return snakeObj as T;
}
