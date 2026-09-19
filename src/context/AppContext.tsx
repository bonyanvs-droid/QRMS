import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AcademicYearConfig,
  AlertItem,
  DailySessionRecord,
  EducationalPlanWeek,
  Halaqah,
  ArchivedHalaqah,
  ReportLog,
  SpellingLesson,
  Student,
  SubLesson,
  Teacher,
  User,
  UserRole,
  AuditLog,
  StudentBadge,
  BadgeType,
  RemedialActionPlan,
  MosqueComplexTenant,
  AcademicTermArchive,
  ArchivedStudentSnapshot,
  EducationalStage,
  StudentTermHistory,
  RegistrationRequest,
  AdmissionStatus,
  StudentFinancialRecord,
  PaymentStatus,
  PaymentTransaction,
  AssociationNomination,
  NominationStatus,
  EmergencySupportSession,
  TenantSubscriptionPlan,
  TenantModulesConfig,
  TrackDefinition,
  TrackNomination,
  TrackNominationStatus,
  SupervisorScope,
  AttendanceRecord,
  TenantAttendanceConfig,
  TenantPrayerConfig,
  DailyPrayerTimes,
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
  FinanceSettingsData,
  StudentPointRule,
  StudentPointTransaction,
  Organization,
  Meeting,
  MeetingAttendee,
  MeetingDecision,
  SeasonalProgram,
  SeasonalActivity,
  SeasonalParticipation,
} from '../types';
import { BUILT_IN_TRACKS } from '../utils/trackAdapter';
import { getPrayerTimesForDateSync } from '../utils/prayerTimesService';
import {
  INITIAL_ACADEMIC_YEAR,
  INITIAL_EDUCATIONAL_PLAN,
  INITIAL_HALAQAHS,
  INITIAL_REPORT_LOGS,
  INITIAL_SESSION_RECORDS,
  INITIAL_SPELLING_LESSONS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_USERS,
  INITIAL_BADGES,
  INITIAL_REMEDIAL_PLANS,
  INITIAL_TENANTS,
  FALLBACK_TENANT,
  INITIAL_STAGES,
  INITIAL_ARCHIVES,
  INITIAL_ORGANIZATIONS,
  INITIAL_SEASONAL_PROGRAMS,
  INITIAL_SEASONAL_ACTIVITIES,
  INITIAL_SEASONAL_PARTICIPATIONS,
} from '../data/initialData';
import {
  AL_FURQAN_STUDENTS,
  AL_FURQAN_SESSION_RECORDS,
} from '../data/studentsRoster';
import {
  AL_FURQAN_HALAQAHS,
  AL_FURQAN_TEACHERS,
  AL_FURQAN_ADMISSIONS,
  AL_FURQAN_ASSOCIATION_NOMINATIONS,
  AL_FURQAN_MEETINGS,
  AL_FURQAN_BADGES,
  AL_FURQAN_FINANCES,
} from '../data/alFurqanFixtures';
import {
  COMPREHENSIVE_HALAQAHS,
  COMPREHENSIVE_TEACHERS,
  COMPREHENSIVE_USERS,
} from '../data/multiStageRoster';
import { evaluateStudentStatus } from '../utils/statusCalculator';
import { calculateAcademicWeek, AcademicTimelineProgress } from '../utils/calendarManager';
import {
  ensureDatabaseInitialized,
  hashPassword,
  subscribeToUsers,
  subscribeToHalaqahs,
  subscribeToStudents,
  subscribeToDailyRecords,
  subscribeToSpellingLessons,
  subscribeToEducationalPlan,
  subscribeToAcademicConfig,
  subscribeToAuditLogs,
  subscribeToReportLogs,
  saveStudent as dbSaveStudent,
  deleteStudent as dbDeleteStudent,
  saveHalaqah as dbSaveHalaqah,
  deleteHalaqah as dbDeleteHalaqah,
  archiveHalaqah as dbArchiveHalaqah,
  restoreHalaqah as dbRestoreHalaqah,
  permanentlyDeleteArchivedHalaqah as dbPermDeleteArchivedHalaqah,
  subscribeToArchivedHalaqahs,
  saveUser as dbSaveUser,
  deleteUser as dbDeleteUser,
  archiveUser as dbArchiveUser,
  restoreUser as dbRestoreUser,
  permanentlyDeleteUser as dbPermDeleteUser,
  subscribeToArchivedUsers,
  archiveTeacherInDb as dbArchiveTeacher,
  restoreTeacherFromDb as dbRestoreTeacher,
  permanentlyDeleteTeacherFromDb as dbPermDeleteTeacher,
  subscribeToArchivedTeachers,
  archiveSupervisorInDb as dbArchiveSupervisor,
  restoreSupervisorFromDb as dbRestoreSupervisor,
  permanentlyDeleteSupervisorFromDb as dbPermDeleteSupervisor,
  subscribeToArchivedSupervisors,
  saveDailySessionRecord as dbSaveDailyRecord,
  saveBulkAttendance as dbSaveBulkAttendance,
  saveSpellingLesson as dbSaveLesson,
  deleteSpellingLesson as dbDeleteLesson,
  saveEducationalPlanWeek as dbSavePlanWeek,
  saveBulkEducationalPlanWeeks as dbSaveBulkPlanWeeks,
  deleteEducationalPlanWeek as dbDeletePlanWeek,
  deleteBulkEducationalPlanWeeks as dbDeleteBulkPlanWeeks,
  subscribeToSeasonalPrograms,
  subscribeToSeasonalActivities,
  subscribeToSeasonalParticipations,
  saveSeasonalProgram as dbSaveSeasonalProgram,
  deleteSeasonalProgram as dbDeleteSeasonalProgram,
  saveSeasonalActivity as dbSaveSeasonalActivity,
  deleteSeasonalActivity as dbDeleteSeasonalActivity,
  saveSeasonalParticipation as dbSaveSeasonalParticipation,
  deleteSeasonalParticipation as dbDeleteSeasonalParticipation,
  saveAcademicConfig as dbSaveAcademicConfig,
  saveReportLog as dbSaveReportLog,
  changeUserPassword as dbChangeUserPassword,
  subscribeToBadges,
  subscribeToRemedialPlans,
  saveBadgeToDb,
  deleteBadgeFromDb,
  saveRemedialPlanToDb,
  resolveRemedialPlanInDb,
  subscribeToTenants,
  subscribeToStages,
  subscribeToArchives,
  subscribeToOrganizations,
  saveTenantToDb,
  updateTenantAdminPasswordInDb,
  deleteTenantFromDb,
  saveStageToDb,
  deleteStageFromDb,
  saveArchiveToDb,
  saveOrganizationToDb,
  deleteOrganizationFromDb,
  subscribeToQuranPlans,
  saveQuranPlanToDb,
  getQuranPlansForStudentFromDb,
  getQuranPlanByIdFromDb,
  deleteQuranPlanFromDb,
  subscribeToQuranStageConfigs,
  saveQuranStageConfigToDb,
  deleteQuranStageConfigFromDb,
  resetQuranStageConfigsInDb,
  LOCAL_STORAGE_KEY_QURAN_PLANS,
  LOCAL_STORAGE_KEY_STAGE_CONFIGS,
  subscribeToAdmissions,
  saveAdmissionsRequest as dbSaveAdmissionsRequest,
  updateAdmissionsStatus as dbUpdateAdmissionsStatus,
  subscribeToFinancialRecords,
  saveFinancialRecord as dbSaveFinancialRecord,
  recordFinancialPayment as dbRecordFinancialPayment,
  subscribeToNominations,
  saveAssociationNomination as dbSaveAssociationNomination,
  updateNominationStatus as dbUpdateNominationStatus,
  subscribeToSupportSessions,
  startSupportSession as dbStartSupportSession,
  endSupportSession as dbEndSupportSession,
  subscribeToTrackDefinitions,
  subscribeToTrackNominations,
  saveTrackDefinition as dbSaveTrackDefinition,
  deleteTrackDefinition as dbDeleteTrackDefinition,
  deleteAllTrackDefinitions as dbDeleteAllTrackDefinitions,
  saveTrackNomination as dbSaveTrackNomination,
  updateTrackNominationStatus as dbUpdateTrackNominationStatus,
  subscribeToStaffAttendance,
  saveStaffAttendanceRecord as dbSaveStaffAttendanceRecord,
  deleteStaffAttendanceRecord as dbDeleteStaffAttendanceRecord,
  subscribeToMeetings,
  saveMeetingToDb as dbSaveMeetingToDb,
  updateMeetingInDb as dbUpdateMeetingInDb,
  deleteMeetingFromDb as dbDeleteMeetingFromDb,
} from '../lib/dbService';
import {
  subscribeToFinanceSettings,
  saveFinanceSettings as dbSaveFinanceSettings,
  subscribeToRevenues,
  saveRevenueItem as dbSaveRevenueItem,
  deleteRevenueItem as dbDeleteRevenueItem,
  subscribeToExpenses,
  saveExpenseItem as dbSaveExpenseItem,
  deleteExpenseItem as dbDeleteExpenseItem,
  subscribeToCustodies,
  saveCustody as dbSaveCustody,
  deleteCustody as dbDeleteCustody,
  subscribeToCustodyExpenses,
  saveCustodyExpenseItem as dbSaveCustodyExpenseItem,
  deleteCustodyExpenseItem as dbDeleteCustodyExpenseItem,
  subscribeToBudgetRequests,
  saveBudgetRequest as dbSaveBudgetRequest,
  deleteBudgetRequest as dbDeleteBudgetRequest,
  DEFAULT_FINANCE_SETTINGS,
} from '../lib/financeService';
import { recordAuditLog } from '../lib/auditService';
import { calculateDistanceMeters, isRegularAttendanceDay, getLocalDateString, isRecordForDate } from '../utils/geoAttendance';
import { getHalaqahActiveDays } from '../utils/scheduleCalculator';
import { StudentQuranPlan } from '../quran/types/plan';
import { StageQuranConfig, DEFAULT_STAGE_CONFIGS } from '../quran/models/stageConfig';
import { BundledQuranProvider } from '../quran/providers/BundledQuranProvider';
import { QuranMemorizationPlanningEngine } from '../quran/services/memorizationEngine';
import { PlanRecalculationService } from '../quran/services/recalculationService';
import { QuranPosition, MushafProfile } from '../quran/types';
import { ALL_MUSHAF_PROFILES } from '../quran/models/MushafProfile';
import { IntegrationConfig, QuranProviderConfig, ConnectionTestResult } from '../quran/types/config';
import { DEFAULT_INTEGRATION_CONFIGS, IntegrationConfigManager } from '../quran/config/integrationConfig';
import {
  createRealStudentPlan,
  migrateRealStudentsToQuranPlans,
  CreateRealStudentPlanParams,
  MigrationReport,
} from '../quran/services/studentPlanBridge';
import {
  authenticateUser,
  performLogout,
  updateUserPassword,
} from '../lib/authService';
import { getAcademicOutcome } from '../quran/services/outcomeService';
import { resolveContextIdentity, ResolvedIdentity } from '../lib/identityResolver';
import {
  subscribeToPublicSummary,
  updatePublicSummary,
  PublicSummaryData,
} from '../lib/publicSummaryService';
import { DEFAULT_TENANT_ADMISSIONS_CONFIG } from '../components/admissions/admissionsFormConfig';
import {
  DEMO_TENANT,
  DEMO_USERS,
  DEMO_TEACHERS,
  DEMO_HALAQAHS,
  DEMO_STUDENTS,
  DEMO_SESSION_RECORDS,
  DEMO_STAGES,
  DEMO_FINANCIAL_RECORDS,
  DEMO_REGISTRATIONS,
  DEMO_NOMINATIONS,
  DEMO_BADGES,
} from '../data/demoFixtures';
import { safeStorage } from '../lib/safeStorage';

export interface AppContextType {
  currentUser: User | null;
  currentRole: UserRole;
  academicConfig: AcademicYearConfig;
  timelineProgress: AcademicTimelineProgress;
  users: User[];
  teachers: Teacher[];
  halaqahs: Halaqah[];
  students: Student[];
  spellingLessons: SpellingLesson[];
  sessionRecords: DailySessionRecord[];
  educationalPlan: EducationalPlanWeek[];
  publicSummary: PublicSummaryData | null;
  reportLogs: ReportLog[];
  auditLogs: AuditLog[];
  alerts: AlertItem[];
  showPasswordChangeModal: boolean;
  setShowPasswordChangeModal: (show: boolean) => void;
  isOffline: boolean;
  isCloudSyncing: boolean;
  // Demo Mode Sandbox
  isDemoMode: boolean;
  demoBlockedNotice: string | null;
  clearDemoBlockedNotice: () => void;
  exitDemoSession: () => Promise<void>;
  // Auth methods
  login: (phone: string, password?: string) => Promise<User | null>;
  logout: () => void;
  resetOperationalMemory: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  enterDemoSession: (tenantId?: string, role?: string) => Promise<boolean>;
  // Spelling methods
  addSpellingLesson: (lesson: Omit<SpellingLesson, 'id'>) => void;
  updateSpellingLesson: (id: string, lesson: Partial<SpellingLesson>) => void;
  deleteSpellingLesson: (id: string) => void;
  reorderSpellingLessons: (lessonIds: string[]) => void;
  addSubLesson: (lessonId: string, subLesson: Omit<SubLesson, 'id'>) => void;
  updateSubLesson: (lessonId: string, subLessonId: string, updates: Partial<SubLesson>) => void;
  deleteSubLesson: (lessonId: string, subLessonId: string) => void;
  // Student methods
  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  transferStudent: (studentId: string, newHalaqahId: string, newTeacherId: string) => void;
  // Teacher & Halaqah methods
  addTeacher: (teacher: Omit<Teacher, 'id' | 'studentsCount'>) => Promise<void>;
  updateTeacher: (id: string, updates: Partial<Teacher>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  archivedTeachers: Teacher[];
  archiveTeacher: (id: string, reason?: string) => Promise<void>;
  restoreTeacher: (id: string) => Promise<void>;
  permanentlyDeleteTeacher: (id: string) => Promise<void>;
  // Supervisor methods
  addSupervisor: (supervisor: Omit<User, 'id'> & { plainPassword?: string }) => Promise<void>;
  updateSupervisor: (id: string, updates: Partial<User>) => Promise<void>;
  deleteSupervisor: (id: string) => Promise<void>;
  archivedSupervisors: User[];
  archiveSupervisor: (id: string, reason?: string) => Promise<void>;
  restoreSupervisor: (id: string) => Promise<void>;
  permanentlyDeleteSupervisor: (id: string) => Promise<void>;
  addHalaqah: (halaqah: Omit<Halaqah, 'id'>) => void;
  updateHalaqah: (id: string, updates: Partial<Halaqah>) => void;
  bulkUpdateHalaqahs: (ids: string[], updates: Partial<Halaqah>) => Promise<void>;
  deleteHalaqah: (id: string) => Promise<void>;
  archivedHalaqahs: ArchivedHalaqah[];
  archiveHalaqah: (id: string, reason?: string) => Promise<void>;
  restoreHalaqah: (id: string) => Promise<void>;
  permanentlyDeleteArchivedHalaqah: (id: string) => Promise<void>;
  // Record logging methods
  recordDailySession: (record: Omit<DailySessionRecord, 'id' | 'createdAt'>) => void;
  bulkMarkAttendance: (date: string, weekNumber: number, halaqahId: string, attendanceMapOrPresent: Record<string, 'present' | 'late' | 'absent'> | string[], absentStudentIds?: string[]) => void;
  // Academic & Plan config methods
  updateAcademicConfig: (updates: Partial<AcademicYearConfig>) => void;
  addEducationalWeek: (week: Omit<EducationalPlanWeek, 'id'>) => void;
  bulkAddEducationalWeeks: (weeks: Omit<EducationalPlanWeek, 'id'>[]) => Promise<void>;
  replaceStageEducationalPlan: (stageId: string, weeks: Omit<EducationalPlanWeek, 'id'>[]) => Promise<void>;
  updateEducationalWeek: (id: string, updates: Partial<EducationalPlanWeek>) => void;
  deleteEducationalWeek: (id: string) => Promise<void>;
  bulkDeleteEducationalWeeks: (ids: string[]) => Promise<void>;
  clearStageEducationalPlan: (stageId: string) => Promise<void>;
  // Seasonal Programs & Activities
  seasonalPrograms: SeasonalProgram[];
  seasonalActivities: SeasonalActivity[];
  seasonalParticipations: SeasonalParticipation[];
  addSeasonalProgram: (prog: Omit<SeasonalProgram, 'id'>) => Promise<void>;
  updateSeasonalProgram: (id: string, updates: Partial<SeasonalProgram>) => Promise<void>;
  deleteSeasonalProgram: (id: string) => Promise<void>;
  addSeasonalActivity: (act: Omit<SeasonalActivity, 'id'>) => Promise<void>;
  updateSeasonalActivity: (id: string, updates: Partial<SeasonalActivity>) => Promise<void>;
  deleteSeasonalActivity: (id: string) => Promise<void>;
  saveSeasonalParticipation: (participation: Omit<SeasonalParticipation, 'id' | 'recordedAt'>) => Promise<void>;
  deleteSeasonalParticipation: (id: string) => Promise<void>;
  // Logos Management
  mosqueLogoUrl: string | null;
  stageLogoUrl: string | null;
  setMosqueLogoUrl: (url: string | null) => void;
  setStageLogoUrl: (url: string | null) => void;
  resetLogos: () => void;
  // Report logs
  addReportLog: (log: Omit<ReportLog, 'id' | 'timestamp'>) => void;
  // P2: Badges & Incentives
  badges: StudentBadge[];
  awardBadge: (badgeType: BadgeType, studentId: string, notes?: string, isAutomatic?: boolean) => Promise<void>;
  deleteBadge: (badgeId: string) => Promise<void>;
  // P2: Remedial Intervention Plans
  remedialPlans: RemedialActionPlan[];
  saveRemedialPlan: (plan: RemedialActionPlan) => Promise<void>;
  resolveRemedialPlan: (planId: string, resolutionNotes?: string) => Promise<void>;
  // P3: Multi-Tenancy (Mosque Complexes)
  tenants: MosqueComplexTenant[];
  activeTenantId: string;
  activeTenant: MosqueComplexTenant | null;
  academicOutcome: string | null;
  resolvedIdentity: ResolvedIdentity;
  setActiveTenantId: (tenantId: string) => void;
  updateAcademicOutcome: (outcomeText: string, targetSurah?: string, tenantId?: string) => Promise<void>;
  addTenant: (tenant: Omit<MosqueComplexTenant, 'id' | 'createdAt'>, adminCredentials?: { password?: string }) => Promise<void>;
  updateTenant: (tenant: MosqueComplexTenant) => Promise<void>;
  updateCampusAdminPassword: (tenantId: string, newPlainPassword: string) => Promise<boolean>;
  deleteTenant: (tenantId: string) => Promise<void>;
  // P9: Organizations & Charity Oversight
  organizations: Organization[];
  saveOrganization: (org: Organization) => Promise<void>;
  deleteOrganization: (orgId: string) => Promise<void>;
  userCanEditTenant: (tenantId?: string) => boolean;
  getSupervisedTenants: () => MosqueComplexTenant[];
  staffAttendanceRecords: AttendanceRecord[];
  recordGeoAttendance: (reason?: string) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
  deleteStaffAttendance: (recordId: string) => Promise<void>;
  updateAttendanceConfig: (config: TenantAttendanceConfig) => Promise<void>;
  updatePrayerConfig: (config: TenantPrayerConfig) => Promise<void>;
  prayerTimesToday: DailyPrayerTimes;
  updateAdmissionsConfig: (config: import('../types').TenantAdmissionsConfig) => Promise<void>;
  updateReportsConfig: (config: import('../types').TenantReportsConfig) => Promise<void>;
  updateWhatsAppConfig: (config: import('../types').WhatsAppApiConfig) => Promise<void>;
  // P3: Educational Stages Extensibility
  stages: EducationalStage[];
  addStage: (stage: EducationalStage) => Promise<void>;
  updateStage: (stage: EducationalStage) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;
  updateStageLogo: (stageId: string, logoUrl: string | null, isLogoActive?: boolean) => Promise<void>;
  // P3: Academic Archives & Cumulative History
  archives: AcademicTermArchive[];
  archiveCurrentTerm: (termName: string, notes?: string) => Promise<void>;
  getStudentTermHistories: (studentId: string) => StudentTermHistory[];
  // Universal Quran Planning Engine Integration (Phase 3A)
  quranPlans: StudentQuranPlan[];
  quranStageConfigs: StageQuranConfig[];
  getStudentQuranPlan: (studentId: string, planId?: string) => Promise<StudentQuranPlan | null>;
  getActiveStudentQuranPlan: (studentId: string) => StudentQuranPlan | null;
  getStudentQuranPlans: (studentId: string) => StudentQuranPlan[];
  createStudentQuranPlan: (params: Omit<CreateRealStudentPlanParams, 'provider' | 'memorizationEngine'>) => Promise<StudentQuranPlan>;
  updateStudentQuranPlan: (plan: StudentQuranPlan) => Promise<void>;
  saveStudentQuranPlan: (plan: StudentQuranPlan) => Promise<void>;
  deleteStudentQuranPlan: (planId: string) => Promise<void>;
  runQuranPlanMigration: () => Promise<MigrationReport>;
  saveQuranStageConfig: (config: StageQuranConfig) => Promise<void>;
  deleteQuranStageConfig: (configId: string) => Promise<void>;
  resetQuranStageConfigs: () => Promise<void>;
  recordQuranPlanAchievement: (params: {
    planId: string;
    dayDate: string;
    status: 'completed' | 'partial' | 'overachieved' | 'absent' | 'excused' | 'unrecited';
    actualEndPosition?: QuranPosition;
    evaluation?: 'excellent' | 'very_good' | 'good' | 'needs_practice';
    notes?: string;
  }) => Promise<StudentQuranPlan>;
  // Quran Integrations & Mushaf Configuration
  integrationConfig: IntegrationConfig;
  availableMushafProfiles: MushafProfile[];
  updateIntegrationProviderConfig: (providerId: string, updates: Partial<QuranProviderConfig>, reason?: string) => Promise<void>;
  setPrimaryQuranProvider: (providerId: string, reason?: string) => Promise<void>;
  setActiveMushafProfile: (mushafId: string, reason?: string) => Promise<void>;
  testQuranProviderConnection: (providerId: string) => Promise<ConnectionTestResult>;
  // P4: Admissions
  admissionsRequests: RegistrationRequest[];
  submitRegistrationRequest: (req: Omit<RegistrationRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateRegistrationStatus: (id: string, status: AdmissionStatus, notes?: string) => Promise<void>;
  enrollApplicantAsStudent: (requestId: string, halaqahId: string, teacherId: string) => Promise<void>;
  // P5: Financial Management
  financialRecords: StudentFinancialRecord[];
  saveFinancialRecord: (record: StudentFinancialRecord) => Promise<void>;
  recordPayment: (recordId: string, payment: PaymentTransaction) => Promise<void>;
  revenues: RevenueItem[];
  saveRevenue: (item: RevenueItem) => Promise<void>;
  deleteRevenue: (id: string) => Promise<void>;
  expenses: ExpenseItem[];
  saveExpense: (item: ExpenseItem) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  custodies: Custody[];
  saveCustody: (custody: Custody) => Promise<void>;
  deleteCustody: (id: string) => Promise<void>;
  saveCustodyExpense: (item: CustodyExpenseItem) => Promise<void>;
  deleteCustodyExpense: (custodyId: string, itemId: string) => Promise<void>;
  budgetRequests: BudgetRequest[];
  saveBudgetRequest: (req: BudgetRequest) => Promise<void>;
  deleteBudgetRequest: (id: string) => Promise<void>;
  financeSettings: FinanceSettingsData;
  saveFinanceSettings: (settings: FinanceSettingsData) => Promise<void>;
  // P6: Association Testing
  associationNominations: AssociationNomination[];
  nominateStudentForAssociation: (nom: Omit<AssociationNomination, 'id' | 'createdAt' | 'supervisorStatus'>) => Promise<void>;
  updateNominationStatus: (id: string, status: NominationStatus, supervisorNotes?: string) => Promise<void>;
  // P8: Dynamic Multi-Track Platform
  tracks: TrackDefinition[];
  trackNominations: TrackNomination[];
  saveTrack: (track: TrackDefinition) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  deleteAllTracks: () => Promise<void>;
  seedDefaultTracksToDb: () => Promise<void>;
  saveTrackNomination: (nom: Omit<TrackNomination, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateTrackNominationStatus: (id: string, status: TrackNominationStatus, extras?: Partial<TrackNomination>) => Promise<void>;
  // P7: Emergency Support Session
  activeSupportSession: EmergencySupportSession | null;
  startSupportSession: (tenantId: string, reason: string, durationHours?: number) => Promise<void>;
  endSupportSession: () => Promise<void>;
  // Student Points Program
  studentPointRules: StudentPointRule[];
  studentPointTransactions: StudentPointTransaction[];
  savePointRule: (rule: StudentPointRule) => Promise<void>;
  awardStudentPoints: (tx: Omit<StudentPointTransaction, 'id' | 'createdAt'>) => Promise<void>;
  // P10: Meetings & Minutes System
  meetings: Meeting[];
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateMeeting: (id: string, updates: Partial<Meeting>, actionLabel?: string) => Promise<void>;
  updateMeetingAttendance: (meetingId: string, attendees: MeetingAttendee[]) => Promise<void>;
  completeMeetingMinutes: (
    meetingId: string,
    minutesData: {
      discussions?: string;
      decisions: MeetingDecision[];
      recommendations: string[];
      postponedItems: string[];
      notes?: string;
      attendees: MeetingAttendee[];
    }
  ) => Promise<void>;
  cancelMeeting: (meetingId: string, reason?: string) => Promise<void>;
  // DB Backup & Reset
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
}

const STORAGE_KEYS = {
  USERS: 'al_ghazzawi_users_v4',
  TEACHERS: 'al_ghazzawi_teachers_v4',
  HALAQAHS: 'al_ghazzawi_halaqahs_v4',
  STUDENTS: 'al_ghazzawi_students_v4',
  SPELLING: 'al_ghazzawi_spelling_v4',
  RECORDS: 'al_ghazzawi_records_v4',
  PLAN: 'al_ghazzawi_plan_v4',
  ACADEMIC: 'al_ghazzawi_academic_v4',
  REPORTS: 'al_ghazzawi_reports_v4',
  CURRENT_USER: 'al_ghazzawi_current_user_v4',
  MOSQUE_LOGO: 'al_ghazzawi_mosque_logo_v4',
  STAGE_LOGO: 'al_ghazzawi_stage_logo_v4',
  BADGES: 'al_ghazzawi_badges_v4',
  REMEDIAL_PLANS: 'al_ghazzawi_remedial_plans_v4',
  TENANTS: 'al_ghazzawi_tenants_v4',
  ACTIVE_TENANT: 'al_ghazzawi_active_tenant_v4',
  STAGES: 'al_ghazzawi_stages_v4',
  ARCHIVES: 'al_ghazzawi_archives_v4',
  INTEGRATION_CONFIG: 'al_ghazzawi_quran_integration_config_v2',
  ADMISSIONS: 'al_ghazzawi_admissions_v2',
  FINANCES: 'al_ghazzawi_finances_v2',
  NOMINATIONS: 'al_ghazzawi_nominations_v2',
  ORGANIZATIONS: 'al_ghazzawi_organizations_v2',
  ARCHIVED_HALAQAHS: 'al_ghazzawi_archived_halaqahs_v2',
};

export const OPERATIONAL_STORAGE_KEYS = new Set([
  'students',
  'halaqahs',
  'teachers',
  'supervisors',
  'records',
  'daily_records',
  'admissions',
  'nominations',
  'track_nominations',
  'financial_records',
  'finances',
  'remedial_plans',
  'archived_halaqahs',
  'archived_teachers',
  'archived_supervisors',
  'archived_users',
  'staff_attendance',
  'support_sessions',
  'meetings',
  'users',
  'badges',
  'tracks',
  'point_rules',
  'point_txs',
]);

export function isOperationalStorageKey(baseKey: string): boolean {
  return OPERATIONAL_STORAGE_KEYS.has(baseKey.toLowerCase());
}

export function getTenantStorageKey(tenantId: string | null | undefined, baseKey: string): string {
  const tid = tenantId || (INITIAL_TENANTS[0]?.id);
  return `schoolscreen_tenant_${tid}_${baseKey}`;
}

export function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    const saved = safeStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null' || saved.trim() === '') {
      return fallback;
    }
    const parsed = JSON.parse(saved);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`[SafeStorage] Corrupted JSON in key "${key}", using fallback:`, err);
    try {
      safeStorage.removeItem(key);
    } catch (_) {}
    return fallback;
  }
}

export function readTenantStorage<T>(tenantId: string | null | undefined, baseKey: string, legacyKey: string, defaultValue: T): T {
  // Operational data must NOT be cached in localStorage - Cloud Firestore is the single source of truth
  if (isOperationalStorageKey(baseKey)) {
    return defaultValue;
  }
  try {
    const tenantKey = getTenantStorageKey(tenantId, baseKey);
    const tenantVal = safeStorage.getItem(tenantKey);
    if (tenantVal && tenantVal !== 'undefined' && tenantVal !== 'null') {
      try {
        return JSON.parse(tenantVal);
      } catch (_) {}
    }
    const legacyVal = safeStorage.getItem(legacyKey);
    if (legacyVal && legacyVal !== 'undefined' && legacyVal !== 'null') {
      try {
        const parsed = JSON.parse(legacyVal);
        try {
          safeStorage.setItem(tenantKey, legacyVal);
        } catch (_) {}
        return parsed;
      } catch (_) {}
    }
  } catch (e) {
    console.warn(`Error reading tenant storage for ${baseKey}:`, e);
  }
  return defaultValue;
}

export function writeTenantStorage<T>(tenantId: string | null | undefined, baseKey: string, legacyKey: string, value: T): void {
  // Operational data must NOT be persisted in localStorage - Cloud Firestore is the single source of truth
  if (isOperationalStorageKey(baseKey)) {
    try {
      const tenantKey = getTenantStorageKey(tenantId, baseKey);
      safeStorage.removeItem(tenantKey);
      safeStorage.removeItem(legacyKey);
    } catch (_) {}
    return;
  }
  try {
    const tenantKey = getTenantStorageKey(tenantId, baseKey);
    const serialized = JSON.stringify(value);
    safeStorage.setItem(tenantKey, serialized);
    if (!tenantId || tenantId === (INITIAL_TENANTS[0]?.id) || tenantId === 'tenant_ghazzawi') {
      safeStorage.setItem(legacyKey, serialized);
    }
  } catch (e) {
    console.warn(`Error writing tenant storage for ${baseKey}:`, e);
  }
}

export function purgeOperationalLocalStorage(): void {
  try {
    const allKeys = safeStorage.getAllKeys();
    const keysToRemove: string[] = [];
    for (const key of allKeys) {
      if (!key) continue;
      const lower = key.toLowerCase();
      if (
        lower === 'firestore_quota_exceeded' ||
        lower.includes('student') ||
        lower.includes('teacher') ||
        lower.includes('halaqah') ||
        lower.includes('supervisor') ||
        lower.includes('record') ||
        lower.includes('admission') ||
        lower.includes('nomination') ||
        lower.includes('finance') ||
        lower.includes('archived') ||
        lower.includes('staff_attendance') ||
        lower.includes('remedial') ||
        lower.includes('meeting') ||
        lower.includes('point_') ||
        lower.includes('badge') ||
        lower.includes('users')
      ) {
        if (
          !lower.includes('active_tenant') &&
          !lower.includes('theme') &&
          !lower.includes('logo') &&
          !lower.includes('academic') &&
          !lower.includes('integration')
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => safeStorage.removeItem(k));
  } catch (e) {
    console.warn('Notice clearing operational localStorage:', e);
  }
}

export function isSupervisorRecord(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '');
  const role = String(item.role || '');
  const staffRole = String(item.staffRole || '');
  const archiveType = String(item.archiveType || '');

  // 1. Explicitly NOT a supervisor if student or parent
  if (role === 'student' || role === 'parent') return false;

  // 2. Explicit admin roles are not supervisors unless explicitly scoped without admin role
  if (role === 'campus_admin' || role === 'system_admin' || role === 'admin') {
    return false;
  }

  // 3. Explicit supervisor role or staffRole
  if (role === 'supervisor' || staffRole === 'supervisor') return true;

  // 4. Archive type indicates supervisor
  if (archiveType === 'supervisor' || item.supervisorArchived === true) {
    return true;
  }

  // 5. Known supervisor ID prefixes or patterns (e.g. usr_sup_...)
  if (
    id.startsWith('usr_sup_') ||
    id.startsWith('usr_supervisor_') ||
    id.includes('supervisor')
  ) {
    return true;
  }

  // 6. Supervisor scope or assigned stages
  if (
    (item.supervisorScope && typeof item.supervisorScope === 'object' && Object.keys(item.supervisorScope).length > 0 && (item.supervisorScope.type || item.supervisorScope.stageIds?.length > 0)) ||
    (Array.isArray(item.assignedStageIds) && item.assignedStageIds.length > 0)
  ) {
    return true;
  }

  return false;
}

export function isTeacherRecord(item: any): boolean {
  if (!item || typeof item !== 'object') return false;

  // CRITICAL: A supervisor or admin or student/parent can NEVER be classified as a teacher
  if (isSupervisorRecord(item)) return false;

  const id = String(item.id || '');
  const role = String(item.role || '');
  const staffRole = String(item.staffRole || '');
  const archiveType = String(item.archiveType || '');

  // 1. Explicitly NOT a teacher if student, parent, or admin
  if (role === 'student' || role === 'parent') return false;
  if (role === 'campus_admin' || role === 'system_admin' || role === 'admin') return false;

  // 2. Explicit teacher role or staffRole
  if (role === 'teacher' || staffRole === 'teacher' || archiveType === 'teacher' || item.teacherArchived === true) {
    return true;
  }

  // 3. Explicit teacher ID patterns
  if (id.startsWith('usr_tch_') || id.startsWith('usr_teacher_') || id.includes('teacher')) {
    return true;
  }

  return false;
}

export function getInitialArchivedTeachers(_tid?: string): Teacher[] {
  // Operational data is not cached in localStorage; Firestore real-time listener populates state
  return [];
}

export function getInitialArchivedSupervisors(_tid?: string): User[] {
  // Operational data is not cached in localStorage; Firestore real-time listener populates state
  return [];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const DEFAULT_MOSQUE_LOGO = '/8349e039-325f-4c91-a534-9d77eed414bc.jpeg';
  const DEFAULT_STAGE_LOGO = '/76101.png';

  const [mosqueLogoUrl, setMosqueLogoUrlState] = useState<string | null>(() => {
    return safeStorage.getItem(STORAGE_KEYS.MOSQUE_LOGO) || DEFAULT_MOSQUE_LOGO;
  });

  const [stageLogoUrl, setStageLogoUrlState] = useState<string | null>(() => {
    return safeStorage.getItem(STORAGE_KEYS.STAGE_LOGO) || DEFAULT_STAGE_LOGO;
  });

  const setMosqueLogoUrl = (url: string | null) => {
    setMosqueLogoUrlState(url);
    if (url) {
      safeStorage.setItem(STORAGE_KEYS.MOSQUE_LOGO, url);
    } else {
      safeStorage.removeItem(STORAGE_KEYS.MOSQUE_LOGO);
    }
  };

  const setStageLogoUrl = (url: string | null) => {
    setStageLogoUrlState(url);
    if (url) {
      safeStorage.setItem(STORAGE_KEYS.STAGE_LOGO, url);
    } else {
      safeStorage.removeItem(STORAGE_KEYS.STAGE_LOGO);
    }
  };

  const resetLogos = () => {
    setMosqueLogoUrlState(DEFAULT_MOSQUE_LOGO);
    setStageLogoUrlState(DEFAULT_STAGE_LOGO);
    safeStorage.removeItem(STORAGE_KEYS.MOSQUE_LOGO);
    safeStorage.removeItem(STORAGE_KEYS.STAGE_LOGO);
  };

  // Connectivity state
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Application Data States (Operational data is strictly loaded from Cloud Firestore, never cached locally)
  const [users, setUsers] = useState<User[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return safeStorageGet<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  });

  // P3 States: Multi-Tenancy, Stages, and Archives
  const [tenants, setTenants] = useState<MosqueComplexTenant[]>(() => {
    return safeStorageGet<MosqueComplexTenant[]>(STORAGE_KEYS.TENANTS, INITIAL_TENANTS);
  });

  // P9: Organizations & Charity State
  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    return safeStorageGet<Organization[]>(STORAGE_KEYS.ORGANIZATIONS, INITIAL_ORGANIZATIONS);
  });

  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => {
    try {
      const savedUser = safeStorageGet<User | null>(STORAGE_KEYS.CURRENT_USER, null);
      if (savedUser?.tenantId) return savedUser.tenantId;
    } catch {}
    return safeStorage.getItem(STORAGE_KEYS.ACTIVE_TENANT) || (INITIAL_TENANTS[0]?.id);
  });

  // Operational states strictly live in memory and sync directly with Cloud Firestore
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [archivedHalaqahs, setArchivedHalaqahs] = useState<ArchivedHalaqah[]>([]);
  const [archivedTeachers, setArchivedTeachers] = useState<Teacher[]>([]);
  const [archivedSupervisors, setArchivedSupervisors] = useState<User[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<User[]>([]);

  // Interactive Read-Only Demo Sandbox (100% in-memory, no Firestore writes, no localStorage pollution)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoBlockedNotice, setDemoBlockedNotice] = useState<string | null>(null);

  const showDemoBlockedNotice = useCallback((actionName?: string) => {
    setDemoBlockedNotice(
      actionName
        ? `تنبيه: أنت تتصفح المنصة في وضع التجربة الحية (Demo Sandbox) للاطلاع والاستعراض فقط. تم حظر إجراء (${actionName}) لحماية البيانات ومنع التعديل أو الحفظ في قاعدة البيانات.`
        : 'تنبيه: أنت في الوضع التجريبي الاستعراضي (Demo Mode) — هذا الحساب مخصص للاطلاع وتجربة المزايا والتنقل بين الصفحات فقط ومغلق عن التعديل أو الحفظ في قاعدة البيانات.'
    );
  }, []);

  const clearDemoBlockedNotice = useCallback(() => {
    setDemoBlockedNotice(null);
  }, []);

  const guardDemoWrite = useCallback(
    (actionName = 'التعديل أو الحفظ'): boolean => {
      if (isDemoMode) {
        showDemoBlockedNotice(actionName);
        return true;
      }
      return false;
    },
    [isDemoMode, showDemoBlockedNotice]
  );

  // Self-healing: Strictly guarantee mutual exclusivity between archived teachers and archived supervisors
  useEffect(() => {
    let changed = false;
    let cleanTeachers = archivedTeachers;
    let cleanSupervisors = archivedSupervisors;

    const leakedSupervisors = archivedTeachers.filter((t) => isSupervisorRecord(t));
    if (leakedSupervisors.length > 0) {
      changed = true;
      cleanTeachers = archivedTeachers.filter((t) => !isSupervisorRecord(t) && isTeacherRecord(t));
      const supMap = new Map<string, User>();
      cleanSupervisors.forEach((s) => supMap.set(s.id, s));
      leakedSupervisors.forEach((t) => {
        if (!supMap.has(t.id)) {
          supMap.set(t.id, {
            id: t.id,
            name: t.name,
            fullName: t.name,
            phone: t.phone || '',
            role: 'supervisor',
            staffRole: 'supervisor',
            tenantId: t.tenantId || activeTenantId,
            isActive: false,
            isArchived: true,
            supervisorArchived: true,
            teacherArchived: false,
            archiveType: 'supervisor',
            archivedAt: (t as any).archivedAt || new Date().toISOString(),
            archivedBy: (t as any).archivedBy || 'مدير النظام',
            archiveReason: (t as any).archiveReason || 'أرشفة المشرف',
          });
        }
      });
      cleanSupervisors = Array.from(supMap.values());
    }

    const leakedTeachers = cleanSupervisors.filter((s) => !isSupervisorRecord(s) && isTeacherRecord(s));
    if (leakedTeachers.length > 0) {
      changed = true;
      cleanSupervisors = cleanSupervisors.filter((s) => isSupervisorRecord(s));
      const teachMap = new Map<string, Teacher>();
      cleanTeachers.forEach((t) => teachMap.set(t.id, t));
      leakedTeachers.forEach((s) => {
        if (!teachMap.has(s.id)) {
          teachMap.set(s.id, {
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            halaqahId: s.halaqahId || '',
            halaqahName: '',
            tenantId: s.tenantId || activeTenantId,
            isActive: false,
            isArchived: true,
            teacherArchived: true,
            supervisorArchived: false,
            archiveType: 'teacher',
            archivedAt: (s as any).archivedAt || new Date().toISOString(),
            archivedBy: (s as any).archivedBy || 'مدير النظام',
            archiveReason: (s as any).archiveReason || 'أرشفة المعلم',
            studentsCount: 0,
            staffRole: 'teacher',
          });
        }
      });
      cleanTeachers = Array.from(teachMap.values());
    }

    if (changed) {
      setArchivedTeachers(cleanTeachers);
      setArchivedSupervisors(cleanSupervisors);
    }
  }, [archivedTeachers, archivedSupervisors, activeTenantId]);

  const [students, setStudents] = useState<Student[]>([]);

  const [spellingLessons, setSpellingLessons] = useState<SpellingLesson[]>(() => {
    return safeStorageGet<SpellingLesson[]>(STORAGE_KEYS.SPELLING, INITIAL_SPELLING_LESSONS);
  });

  const [sessionRecords, setSessionRecords] = useState<DailySessionRecord[]>([]);

  const [educationalPlan, setEducationalPlan] = useState<EducationalPlanWeek[]>(() => {
    return safeStorageGet<EducationalPlanWeek[]>(STORAGE_KEYS.PLAN, INITIAL_EDUCATIONAL_PLAN);
  });

  const [seasonalPrograms, setSeasonalPrograms] = useState<SeasonalProgram[]>(() => INITIAL_SEASONAL_PROGRAMS);
  const [seasonalActivities, setSeasonalActivities] = useState<SeasonalActivity[]>(() => INITIAL_SEASONAL_ACTIVITIES);
  const [seasonalParticipations, setSeasonalParticipations] = useState<SeasonalParticipation[]>(() => INITIAL_SEASONAL_PARTICIPATIONS);

  const [academicConfig, setAcademicConfig] = useState<AcademicYearConfig>(() => {
    return safeStorageGet<AcademicYearConfig>(STORAGE_KEYS.ACADEMIC, INITIAL_ACADEMIC_YEAR);
  });

  const [reportLogs, setReportLogs] = useState<ReportLog[]>(() => {
    return safeStorageGet<ReportLog[]>(STORAGE_KEYS.REPORTS, INITIAL_REPORT_LOGS);
  });

  const [badges, setBadges] = useState<StudentBadge[]>([]);

  const [remedialPlans, setRemedialPlans] = useState<RemedialActionPlan[]>([]);

  const [stages, setStages] = useState<EducationalStage[]>(() => {
    return safeStorageGet<EducationalStage[]>(STORAGE_KEYS.STAGES, INITIAL_STAGES);
  });

  const [archives, setArchives] = useState<AcademicTermArchive[]>(() => {
    return safeStorageGet<AcademicTermArchive[]>(STORAGE_KEYS.ARCHIVES, INITIAL_ARCHIVES);
  });

  // P4: Admissions Requests State
  const [admissionsRequests, setAdmissionsRequests] = useState<RegistrationRequest[]>([]);

  // P5: Financial Records State
  const [financialRecords, setFinancialRecords] = useState<StudentFinancialRecord[]>([]);

  // Comprehensive Finance Module State
  const [revenues, setRevenues] = useState<RevenueItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [financeSettings, setFinanceSettings] = useState<FinanceSettingsData>({
    tenantId: activeTenantId,
    ...DEFAULT_FINANCE_SETTINGS,
  });

  // P6: Association Nominations State
  const [associationNominations, setAssociationNominations] = useState<AssociationNomination[]>([]);

  // P8: Multi-Track Platform Tracks & Nominations State
  const [tracks, setTracks] = useState<TrackDefinition[]>(BUILT_IN_TRACKS);

  const [trackNominations, setTrackNominations] = useState<TrackNomination[]>([]);

  const [staffAttendanceRecords, setStaffAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Student Points Program State
  const INITIAL_POINT_RULES: StudentPointRule[] = [
    { id: 'rule_1', tenantId: (INITIAL_TENANTS[0]?.id), title: 'حفظ وجه جديد بإتقان', category: 'memorization', defaultPoints: 10, isActive: true, description: 'منح نقاط عند تسميع وجه جديد من القرآن الكريم بدرجة إتقان عالية', createdAt: new Date().toISOString() },
    { id: 'rule_2', tenantId: (INITIAL_TENANTS[0]?.id), title: 'مراجعة الجزء السابق', category: 'review', defaultPoints: 10, isActive: true, description: 'منح نقاط عند إنجاز مراجعة الحفظ السابق', createdAt: new Date().toISOString() },
    { id: 'rule_3', tenantId: (INITIAL_TENANTS[0]?.id), title: 'إتمام خطة الأسبوع التشغيلية', category: 'plan', defaultPoints: 25, isActive: true, description: 'منح نقاط عند تحقيق المتطلبات الأسبوعية للحلقة', createdAt: new Date().toISOString() },
    { id: 'rule_4', tenantId: (INITIAL_TENANTS[0]?.id), title: 'الحضور المبكر والانتظام', category: 'attendance', defaultPoints: 5, isActive: true, description: 'منح نقاط للحضور المبكر وعدم التأخير', createdAt: new Date().toISOString() },
    { id: 'rule_5', tenantId: (INITIAL_TENANTS[0]?.id), title: 'الالتزام بآداب وسلوكيات الحلقة', category: 'commitment', defaultPoints: 5, isActive: true, description: 'منح نقاط للالتزام والإنصات', createdAt: new Date().toISOString() },
    { id: 'rule_6', tenantId: (INITIAL_TENANTS[0]?.id), title: 'المشاركة الفعالة في الأنشطة', category: 'participation', defaultPoints: 10, isActive: true, description: 'منح نقاط للمشاركة والمبادرة', createdAt: new Date().toISOString() },
    { id: 'rule_7', tenantId: (INITIAL_TENANTS[0]?.id), title: 'الفوز في مسابقات المجمع', category: 'competition', defaultPoints: 50, isActive: true, description: 'منح نقاط متقدمة للفائزين في مسابقات الحفظ والتجويد', createdAt: new Date().toISOString() },
  ];

  const [studentPointRules, setStudentPointRules] = useState<StudentPointRule[]>(INITIAL_POINT_RULES);

  const [studentPointTransactions, setStudentPointTransactions] = useState<StudentPointTransaction[]>([]);

  const savePointRule = useCallback(async (rule: StudentPointRule) => {
    setStudentPointRules((prev) => {
      const exists = prev.some((r) => r.id === rule.id);
      return exists ? prev.map((r) => r.id === rule.id ? rule : r) : [rule, ...prev];
    });
  }, []);

  const awardStudentPoints = useCallback(async (txInput: Omit<StudentPointTransaction, 'id' | 'createdAt'>) => {
    const newTx: StudentPointTransaction = {
      ...txInput,
      id: `ptx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setStudentPointTransactions((prev) => [newTx, ...prev]);
  }, []);

  // P7: Active Emergency Support Session State
  const [activeSupportSession, setActiveSupportSession] = useState<EmergencySupportSession | null>(null);

  // P10: Meetings & Minutes State
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Universal Quran Planning States (Phase 3A)
  const [quranPlans, setQuranPlans] = useState<StudentQuranPlan[]>([]);

  const [quranStageConfigs, setQuranStageConfigs] = useState<StageQuranConfig[]>(() => {
    return safeStorageGet<StageQuranConfig[]>(LOCAL_STORAGE_KEY_STAGE_CONFIGS, DEFAULT_STAGE_CONFIGS);
  });

  // Operational State Memory Reset for switching accounts or roles
  const resetOperationalMemory = useCallback(() => {
    setUsers([]);
    setTeachers([]);
    setHalaqahs([]);
    setArchivedHalaqahs([]);
    setArchivedTeachers([]);
    setArchivedSupervisors([]);
    setArchivedUsers([]);
    setStudents([]);
    setSessionRecords([]);
    setBadges([]);
    setRemedialPlans([]);
    setAdmissionsRequests([]);
    setFinancialRecords([]);
    setRevenues([]);
    setExpenses([]);
    setCustodies([]);
    setBudgetRequests([]);
    setAssociationNominations([]);
    setTrackNominations([]);
    setStaffAttendanceRecords([]);
    setStudentPointTransactions([]);
    setMeetings([]);
    setQuranPlans([]);
  }, []);

  // Synchronize auth changes and zero memory whenever user/role/tenant switches
  const prevAuthKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (isDemoMode) return;
    const currentAuthKey = currentUser ? `${currentUser.id}_${currentUser.role}_${currentUser.tenantId || activeTenantId}` : 'unauthenticated';
    if (prevAuthKeyRef.current !== null && prevAuthKeyRef.current !== currentAuthKey) {
      resetOperationalMemory();
      purgeOperationalLocalStorage();
    } else if (prevAuthKeyRef.current === null) {
      purgeOperationalLocalStorage();
    }
    prevAuthKeyRef.current = currentAuthKey;
  }, [currentUser, activeTenantId, resetOperationalMemory, isDemoMode]);

  // Quran Integration & Mushaf Profiles Configuration
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>(() => {
    return safeStorageGet<IntegrationConfig>(STORAGE_KEYS.INTEGRATION_CONFIG, DEFAULT_INTEGRATION_CONFIGS.development);
  });

  const integrationManager = useMemo(() => {
    const mgr = new IntegrationConfigManager(integrationConfig.environment);
    if (integrationConfig.providers) {
      Object.keys(integrationConfig.providers).forEach((pId) => {
        try {
          mgr.updateProviderConfig(pId, integrationConfig.providers[pId]);
        } catch {
          // Provider might not be in template
        }
      });
    }
    if (integrationConfig.primaryProviderId) {
      try {
        mgr.setPrimaryProvider(integrationConfig.primaryProviderId);
      } catch {
        // Fall back to bundled
      }
    }
    if (integrationConfig.activeMushafProfileId) {
      mgr.setActiveMushafProfileId(integrationConfig.activeMushafProfileId);
    }
    return mgr;
  }, [integrationConfig]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.INTEGRATION_CONFIG, JSON.stringify(integrationConfig));
  }, [integrationConfig]);

  const activeTenant = useMemo(() => {
    return tenants.find((t) => t.id === activeTenantId) || tenants[0] || null;
  }, [tenants, activeTenantId]);

  const resolvedIdentity = useMemo(() => {
    return resolveContextIdentity({
      currentUser,
      activeTenant,
      stages,
      halaqahs,
      students,
      mosqueLogoUrlFallback: mosqueLogoUrl,
    });
  }, [currentUser, activeTenant, stages, halaqahs, students, mosqueLogoUrl]);

  const academicOutcome = useMemo(() => {
    return resolvedIdentity.resolvedOutcome;
  }, [resolvedIdentity]);

  const setActiveTenantId = useCallback((tenantId: string) => {
    // If logged in as campus_admin or teacher, lock to their assigned tenantId to prevent cross-tenant data leak
    if (currentUser?.tenantId && currentUser.role !== 'system_admin' && (currentUser.role as any) !== 'admin') {
      setActiveTenantIdState(currentUser.tenantId);
      safeStorage.setItem(STORAGE_KEYS.ACTIVE_TENANT, currentUser.tenantId);
      resetOperationalMemory();
      return;
    }
    setActiveTenantIdState(tenantId);
    safeStorage.setItem(STORAGE_KEYS.ACTIVE_TENANT, tenantId);
    resetOperationalMemory();
  }, [currentUser, resetOperationalMemory]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [publicSummary, setPublicSummary] = useState<PublicSummaryData | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);

  // Synchronize non-operational auth and system config with local storage
  useEffect(() => {
    if (currentUser) {
      safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.SPELLING, JSON.stringify(spellingLessons));
  }, [spellingLessons]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(educationalPlan));
  }, [educationalPlan]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.ACADEMIC, JSON.stringify(academicConfig));
  }, [academicConfig]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reportLogs));
  }, [reportLogs]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify(stages));
  }, [stages]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));
  }, [archives]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(organizations));
  }, [organizations]);

  // Derived current role
  const currentRole: UserRole = currentUser ? currentUser.role : 'public';

  // Dynamic academic timeline calculation based on today's calendar date
  const timelineProgress = useMemo(() => {
    return calculateAcademicWeek(academicConfig);
  }, [academicConfig]);

  // Ensure currentWeek is dynamically kept in sync with the real calendar (unless manually overridden by admin)
  useEffect(() => {
    if (!academicConfig.manualWeekOverride && academicConfig.currentWeek !== timelineProgress.currentWeek) {
      setAcademicConfig((prev) => ({
        ...prev,
        currentWeek: timelineProgress.currentWeek,
      }));
    }
  }, [timelineProgress.currentWeek, academicConfig.currentWeek, academicConfig.manualWeekOverride]);

  // -------------------------------------------------------------
  // Cloud Database Initialization and Real-Time Subscriptions
  // -------------------------------------------------------------
  useEffect(() => {
    if (isDemoMode) {
      return;
    }
    let unsubs: Array<() => void> = [];

    const initializeCloudSync = async () => {
      setIsCloudSyncing(true);
      try {
        await ensureDatabaseInitialized();

        // 1. General Operational Subscriptions (Publicly Safe / No Individual PII)
        unsubs.push(
          subscribeToAcademicConfig((remoteConfig) => {
            setAcademicConfig((prev) => ({ ...prev, ...remoteConfig }));
          })
        );

        unsubs.push(
          subscribeToArchivedHalaqahs(currentUser?.role === 'system_admin' ? undefined : activeTenantId, (remoteArchived) => {
            setArchivedHalaqahs(remoteArchived);
          })
        );

        unsubs.push(
          subscribeToArchivedTeachers(currentUser?.role === 'system_admin' ? undefined : activeTenantId, (remoteArchived) => {
            const validTeachers = remoteArchived.filter((t) => isTeacherRecord(t) && !isSupervisorRecord(t));
            const leakedSupervisors = remoteArchived.filter((t) => isSupervisorRecord(t));

            setArchivedTeachers((prev) => {
              const map = new Map<string, Teacher>();
              prev.forEach((t) => {
                if (isTeacherRecord(t) && !isSupervisorRecord(t)) {
                  map.set(t.id, t);
                }
              });
              validTeachers.forEach((t) => {
                map.set(t.id, t);
              });
              const merged = Array.from(map.values());
              writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', merged);
              return merged;
            });

            if (leakedSupervisors.length > 0) {
              setArchivedSupervisors((prev) => {
                const map = new Map<string, User>();
                prev.forEach((s) => { if (isSupervisorRecord(s)) map.set(s.id, s); });
                leakedSupervisors.forEach((s: any) => {
                  map.set(s.id, {
                    ...s,
                    role: 'supervisor',
                    staffRole: 'supervisor',
                    isActive: false,
                    isArchived: true,
                    supervisorArchived: true,
                    teacherArchived: false,
                    archiveType: 'supervisor',
                  });
                });
                const merged = Array.from(map.values());
                writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', merged);
                return merged;
              });
            }
          })
        );

        unsubs.push(
          subscribeToArchivedSupervisors(currentUser?.role === 'system_admin' ? undefined : activeTenantId, (remoteArchived) => {
            const validSupervisors = remoteArchived.filter((s) => isSupervisorRecord(s));
            const supIds = new Set(validSupervisors.map((s) => s.id));

            setArchivedSupervisors((prev) => {
              const map = new Map<string, User>();
              prev.forEach((s) => {
                if (isSupervisorRecord(s)) {
                  map.set(s.id, s);
                }
              });
              validSupervisors.forEach((s) => {
                map.set(s.id, s);
              });
              const merged = Array.from(map.values());
              writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', merged);
              return merged;
            });

            // Ensure none of these supervisor IDs exist in archivedTeachers
            setArchivedTeachers((prev) => {
              const cleaned = prev.filter((t) => !supIds.has(t.id) && !isSupervisorRecord(t));
              if (cleaned.length !== prev.length) {
                writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', cleaned);
              }
              return cleaned;
            });
          })
        );

        unsubs.push(
          subscribeToArchivedUsers(currentUser?.role === 'system_admin' ? undefined : activeTenantId, (remoteArchived) => {
            setArchivedUsers((prev) => {
              const map = new Map<string, User>();
              prev.forEach((u) => map.set(u.id, u));
              remoteArchived.forEach((u) => map.set(u.id, u));
              const merged = Array.from(map.values());
              writeTenantStorage(activeTenantId, 'archived_users', 'furqan_archived_users', merged);
              return merged;
            });

            // Recover and separate any archived teachers present in legacy archived users
            const legacyTeachers = remoteArchived.filter((u) => isTeacherRecord(u)).map((u) => ({
              id: u.id,
              name: u.fullName || u.name,
              phone: u.phone || '',
              halaqahId: u.halaqahId || '',
              halaqahName: '',
              tenantId: u.tenantId || activeTenantId,
              isActive: false,
              isArchived: true,
              teacherArchived: true,
              supervisorArchived: false,
              archiveType: 'teacher' as const,
              archivedAt: u.archivedAt || new Date().toISOString(),
              archivedBy: u.archivedBy || 'مدير النظام',
              archiveReason: u.archiveReason || 'أرشفة المعلم تحسباً للخطأ',
              studentsCount: (u as any).studentsCount || 0,
              staffRole: 'teacher' as const,
            }));

            if (legacyTeachers.length > 0) {
              setArchivedTeachers((prev) => {
                const map = new Map<string, Teacher>();
                prev.forEach((t) => { if (isTeacherRecord(t)) map.set(t.id, t); });
                legacyTeachers.forEach((t) => map.set(t.id, t));
                const merged = Array.from(map.values());
                writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', merged);
                return merged;
              });
            }

            // Recover and separate any archived supervisors present in legacy archived users
            const legacySupervisors = remoteArchived.filter((u) => isSupervisorRecord(u)).map((u) => ({
              ...u,
              role: 'supervisor' as const,
              staffRole: 'supervisor' as const,
              isActive: false,
              isArchived: true,
              supervisorArchived: true,
              teacherArchived: false,
              archiveType: 'supervisor' as const,
              archivedAt: u.archivedAt || new Date().toISOString(),
              archivedBy: u.archivedBy || 'مدير النظام',
              archiveReason: u.archiveReason || 'أرشفة المشرف تحسباً للخطأ',
            }));

            if (legacySupervisors.length > 0) {
              setArchivedSupervisors((prev) => {
                const map = new Map<string, User>();
                prev.forEach((s) => { if (isSupervisorRecord(s)) map.set(s.id, s); });
                legacySupervisors.forEach((s) => map.set(s.id, s));
                const merged = Array.from(map.values());
                writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', merged);
                return merged;
              });
            }
          })
        );

        unsubs.push(
          subscribeToHalaqahs(currentUser?.role === 'system_admin' ? undefined : activeTenantId, (remoteHalaqahs) => {
            // Read archived IDs to strictly filter out any archived halaqahs
            const cachedArchived = readTenantStorage<ArchivedHalaqah[]>(activeTenantId, 'archived_halaqahs', STORAGE_KEYS.ARCHIVED_HALAQAHS, []);
            const archivedIds = new Set(cachedArchived.map((a) => a.id));

            const merged = remoteHalaqahs.filter((h) => !archivedIds.has(h.id) && !h.isArchived);
            setHalaqahs(merged);
          })
        );

        unsubs.push(
          subscribeToSpellingLessons((remoteLessons) => {
            setSpellingLessons(remoteLessons);
          })
        );

        unsubs.push(
          subscribeToEducationalPlan((remotePlan) => {
            if (remotePlan && remotePlan.length > 0) {
              setEducationalPlan(remotePlan);
            }
          })
        );

        unsubs.push(
          subscribeToSeasonalPrograms((remotePrograms) => {
            if (remotePrograms && remotePrograms.length > 0) {
              setSeasonalPrograms(remotePrograms);
            }
          })
        );

        unsubs.push(
          subscribeToSeasonalActivities((remoteActivities) => {
            if (remoteActivities && remoteActivities.length > 0) {
              setSeasonalActivities(remoteActivities);
            }
          })
        );

        unsubs.push(
          subscribeToSeasonalParticipations((remoteParts) => {
            if (remoteParts && remoteParts.length > 0) {
              setSeasonalParticipations(remoteParts);
            }
          })
        );

        unsubs.push(
          subscribeToPublicSummary((summary) => {
            setPublicSummary(summary);
          })
        );

        // Badges: student incentives and certificates are accessible for display and portal verification
        unsubs.push(
          subscribeToBadges((remoteBadges) => {
            setBadges(remoteBadges);
          }, activeTenantId)
        );

        // P3 Subscriptions: Multi-Tenancy, Stages, and Archives
        unsubs.push(
          subscribeToTenants((remoteTenants) => {
            setTenants(remoteTenants);
          })
        );

        unsubs.push(
          subscribeToStages((remoteStages) => {
            if (remoteStages && remoteStages.length > 0) {
              setStages(remoteStages);
            } else {
              setStages(INITIAL_STAGES);
            }
          })
        );

        unsubs.push(
          subscribeToArchives((remoteArchives) => {
            setArchives(remoteArchives);
          })
        );

        unsubs.push(
          subscribeToOrganizations((remoteOrgs) => {
            setOrganizations(remoteOrgs);
          })
        );

        // Universal Quran Planning Subscriptions (Phase 3A)
        unsubs.push(
          subscribeToQuranStageConfigs((remoteConfigs) => {
            setQuranStageConfigs(remoteConfigs);
          })
        );

        unsubs.push(
          subscribeToQuranPlans((remotePlans) => {
            setQuranPlans(remotePlans);
          })
        );

        // 2. Protected Collections: Enforce Strict Role-Based Data Isolation
        if (
          currentUser &&
          (currentUser.role === 'admin' ||
            currentUser.role === 'system_admin' ||
            currentUser.role === 'campus_admin' ||
            currentUser.role === 'supervisor' ||
            currentUser.role === 'charity_supervisor' ||
            currentUser.role === 'teacher')
        ) {
          // Support Sessions Subscription
          unsubs.push(
            subscribeToSupportSessions(activeTenantId, (sessions) => {
              const active = sessions.find((s) => s.isActive);
              setActiveSupportSession(active || null);
            })
          );

          // Meetings Subscription
          unsubs.push(
            subscribeToMeetings(activeTenantId, (remoteMeetings) => {
              setMeetings(remoteMeetings);
              writeTenantStorage(activeTenantId, 'meetings', 'al_ghazzawi_meetings_v2', remoteMeetings);
            })
          );
        }

        if (
          currentUser &&
          (currentUser.role === 'admin' ||
            currentUser.role === 'system_admin' ||
            currentUser.role === 'campus_admin' ||
            currentUser.role === 'supervisor' ||
            currentUser.role === 'charity_supervisor')
        ) {
          // Admin has overarching view of all users, halaqahs, and logs
          unsubs.push(
            subscribeToUsers(
              currentUser.role === 'system_admin' || currentUser.role === 'charity_supervisor'
                ? undefined
                : activeTenantId,
              (remoteUsers) => {
                const cachedArchivedTeachers = getInitialArchivedTeachers(activeTenantId);
                const cachedArchivedSupervisors = getInitialArchivedSupervisors(activeTenantId);
                const archivedTeacherIds = new Set(cachedArchivedTeachers.map((a) => a.id));
                const archivedSupervisorIds = new Set(cachedArchivedSupervisors.map((a) => a.id));

                const userMap = new Map<string, User>();
                remoteUsers.forEach((u) => {
                  const isSup = isSupervisorRecord(u);
                  const isArchived = isSup
                    ? (u.isArchived || u.supervisorArchived || archivedSupervisorIds.has(u.id))
                    : (u.isArchived || u.teacherArchived || archivedTeacherIds.has(u.id));
                  const prev = userMap.get(u.id);
                  userMap.set(u.id, prev ? { ...prev, ...u, isArchived, isActive: isArchived ? false : u.isActive } : { ...u, isArchived, isActive: isArchived ? false : u.isActive });
                });
                const mergedUsers = Array.from(userMap.values());
                setUsers(mergedUsers);

                // Auto-populate isolated archives if any user in remoteUsers has archive flags
                const archivedInRemote = remoteUsers.filter((u) => u.isArchived || u.teacherArchived || u.supervisorArchived || (!u.isActive && (u as any).archivedAt));
                const teachersToArchive = archivedInRemote.filter((u) => isTeacherRecord(u)).map((u) => ({
                  id: u.id,
                  name: u.fullName || u.name,
                  phone: u.phone || '',
                  halaqahId: u.halaqahId || '',
                  halaqahName: '',
                  tenantId: u.tenantId || activeTenantId,
                  isActive: false,
                  isArchived: true,
                  teacherArchived: true,
                  supervisorArchived: false,
                  archiveType: 'teacher' as const,
                  archivedAt: (u as any).archivedAt || new Date().toISOString(),
                  archivedBy: (u as any).archivedBy || 'مدير النظام',
                  archiveReason: (u as any).archiveReason || 'أرشفة المعلم',
                  studentsCount: (u as any).studentsCount || 0,
                  staffRole: 'teacher' as const,
                }));
                if (teachersToArchive.length > 0) {
                  const teacherIds = new Set(teachersToArchive.map((t) => t.id));
                  setArchivedTeachers((prev) => {
                    const map = new Map<string, Teacher>();
                    prev.forEach((t) => { if (isTeacherRecord(t) && !isSupervisorRecord(t)) map.set(t.id, t); });
                    teachersToArchive.forEach((t) => { if (isTeacherRecord(t) && !isSupervisorRecord(t)) map.set(t.id, t); });
                    const merged = Array.from(map.values());
                    writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', merged);
                    return merged;
                  });
                  setArchivedSupervisors((prev) => {
                    const cleaned = prev.filter((s) => !teacherIds.has(s.id) && isSupervisorRecord(s));
                    writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', cleaned);
                    return cleaned;
                  });
                }

                const supervisorsToArchive = archivedInRemote.filter((u) => isSupervisorRecord(u)).map((u) => ({
                  ...u,
                  role: 'supervisor' as const,
                  staffRole: 'supervisor' as const,
                  isActive: false,
                  isArchived: true,
                  supervisorArchived: true,
                  teacherArchived: false,
                  archiveType: 'supervisor' as const,
                  archivedAt: (u as any).archivedAt || new Date().toISOString(),
                  archivedBy: (u as any).archivedBy || 'مدير النظام',
                  archiveReason: (u as any).archiveReason || 'أرشفة المشرف',
                }));
                if (supervisorsToArchive.length > 0) {
                  const supervisorIds = new Set(supervisorsToArchive.map((s) => s.id));
                  setArchivedSupervisors((prev) => {
                    const map = new Map<string, User>();
                    prev.forEach((s) => { if (isSupervisorRecord(s)) map.set(s.id, s); });
                    supervisorsToArchive.forEach((s) => { if (isSupervisorRecord(s)) map.set(s.id, s); });
                    const merged = Array.from(map.values());
                    writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', merged);
                    return merged;
                  });
                  setArchivedTeachers((prev) => {
                    const cleaned = prev.filter((t) => !supervisorIds.has(t.id) && !isSupervisorRecord(t) && isTeacherRecord(t));
                    writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', cleaned);
                    return cleaned;
                  });
                }

                const teacherMap = new Map<string, Teacher>();

                mergedUsers
                  .filter((u) => {
                    if (u.isArchived || u.teacherArchived || archivedTeacherIds.has(u.id)) return false;
                    if (isSupervisorRecord(u)) return false;
                    return isTeacherRecord(u);
                  })
                  .forEach((u) => {
                    const prev = teacherMap.get(u.id);
                    teacherMap.set(u.id, {
                      id: u.id,
                      name: u.fullName || u.name,
                      phone: u.phone || '',
                      halaqahId: u.halaqahId || prev?.halaqahId || '',
                      halaqahName: prev?.halaqahName || '',
                      tenantId: u.tenantId || prev?.tenantId || activeTenantId,
                      isActive: u.isActive ?? true,
                      isArchived: false,
                      teacherArchived: false,
                      studentsCount: prev?.studentsCount || 0,
                      staffRole: 'teacher',
                      isAllHalaqahs: u.isAllHalaqahs ?? prev?.isAllHalaqahs ?? false,
                      supervisorScope: u.supervisorScope || prev?.supervisorScope,
                      customPermissions: u.customPermissions || prev?.customPermissions,
                      assignedStageIds: u.assignedStageIds || prev?.assignedStageIds,
                      assignedHalaqahIds: u.assignedHalaqahIds || prev?.assignedHalaqahIds,
                    });
                  });

                const mergedTeachers = Array.from(teacherMap.values()).filter((t) => !t.isArchived && !t.teacherArchived && !archivedTeacherIds.has(t.id));
                setTeachers(mergedTeachers);
                writeTenantStorage(activeTenantId, 'teachers', STORAGE_KEYS.TEACHERS, mergedTeachers);
              }
            )
          );

          unsubs.push(
            subscribeToStudents('admin', undefined, (remoteStudents) => {
              setStudents(remoteStudents);
            }, currentUser.role === 'system_admin' ? undefined : activeTenantId)
          );

          unsubs.push(
            subscribeToDailyRecords('admin', undefined, (remoteRecords) => {
              setSessionRecords(remoteRecords);
            }, activeTenantId)
          );

          unsubs.push(
            subscribeToRemedialPlans('admin', undefined, (remotePlans) => {
              setRemedialPlans(remotePlans);
            }, activeTenantId)
          );

          unsubs.push(
            subscribeToAdmissions(activeTenantId, (remoteAdmissions) => {
              setAdmissionsRequests(remoteAdmissions);
            })
          );

          unsubs.push(
            subscribeToFinancialRecords(activeTenantId, (remoteFinances) => {
              setFinancialRecords(remoteFinances);
            })
          );

          unsubs.push(
            subscribeToRevenues(activeTenantId, (items) => {
              setRevenues(items);
            })
          );

          unsubs.push(
            subscribeToExpenses(activeTenantId, (items) => {
              setExpenses(items);
            })
          );

          unsubs.push(
            subscribeToCustodies(activeTenantId, (items) => {
              setCustodies(items);
            })
          );

          unsubs.push(
            subscribeToBudgetRequests(activeTenantId, (items) => {
              setBudgetRequests(items);
            })
          );

          unsubs.push(
            subscribeToFinanceSettings(activeTenantId, (settings) => {
              setFinanceSettings(settings);
            })
          );

          unsubs.push(
            subscribeToNominations(activeTenantId, (remoteNominations) => {
              setAssociationNominations(remoteNominations);
            })
          );

          unsubs.push(
            subscribeToTrackDefinitions(activeTenantId, (remoteTracks) => {
              if (remoteTracks) {
                setTracks(remoteTracks);
              }
            })
          );

          unsubs.push(
            subscribeToTrackNominations(activeTenantId, (remoteTrackNoms) => {
              setTrackNominations(remoteTrackNoms);
            })
          );

          unsubs.push(
            subscribeToStaffAttendance(activeTenantId, (remoteAtt) => {
              setStaffAttendanceRecords(remoteAtt);
              writeTenantStorage(activeTenantId, 'staff_attendance', 'al_ghazzawi_staff_attendance_v2', remoteAtt);
            })
          );

          unsubs.push(
            subscribeToAuditLogs((remoteAudit) => {
              setAuditLogs(remoteAudit);
            })
          );

          unsubs.push(
            subscribeToReportLogs((remoteReports) => {
              setReportLogs(remoteReports);
            })
          );
        } else if (currentUser && currentUser.role === 'teacher') {
          // Teacher is strictly isolated to their own halaqah's students and records
          unsubs.push(
            subscribeToStudents('teacher', currentUser.halaqahId, (remoteStudents) => {
              setStudents(remoteStudents);
            }, activeTenantId)
          );

          unsubs.push(
            subscribeToDailyRecords('teacher', currentUser.halaqahId, (remoteRecords) => {
              setSessionRecords(remoteRecords);
            }, activeTenantId)
          );

          unsubs.push(
            subscribeToRemedialPlans('teacher', currentUser.halaqahId, (remotePlans) => {
              setRemedialPlans(remotePlans);
            }, activeTenantId)
          );

          unsubs.push(
            subscribeToNominations(activeTenantId, (remoteNominations) => {
              setAssociationNominations(remoteNominations);
            }, currentUser.halaqahId)
          );

          unsubs.push(
            subscribeToTrackDefinitions(activeTenantId, (remoteTracks) => {
              if (remoteTracks) {
                setTracks(remoteTracks);
              }
            })
          );

          unsubs.push(
            subscribeToTrackNominations(activeTenantId, (remoteTrackNoms) => {
              setTrackNominations(remoteTrackNoms);
            }, currentUser.halaqahId)
          );

          unsubs.push(
            subscribeToStaffAttendance(activeTenantId, (remoteAtt) => {
              setStaffAttendanceRecords(remoteAtt);
              writeTenantStorage(activeTenantId, 'staff_attendance', 'al_ghazzawi_staff_attendance_v2', remoteAtt);
            })
          );
        }
      } catch (err) {
        console.warn('Notice during cloud sync bootstrap:', err);
      } finally {
        setIsCloudSyncing(false);
      }
    };

    initializeCloudSync();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser?.role, currentUser?.halaqahId, activeTenantId, isDemoMode]);

  // Compute smart alerts for teachers and supervisors
  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];

    students.forEach((student) => {
      const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
      const evalResult = evaluateStudentStatus(student, sessionRecords, spellingLessons, academicConfig);

      if (evalResult.status === 'lagging') {
        list.push({
          id: `alert_lag_${student.id}`,
          studentId: student.id,
          studentName: student.fullName,
          halaqahName: halaqah?.name || 'الحلقة',
          teacherId: student.teacherId,
          type: 'lagging_spelling',
          title: 'طالب متأخر في المسار',
          description: evalResult.reason,
          severity: 'critical',
          recommendedAction: 'تحديد جلسة دعم فردية وتكثيف المتابعة في يوم الهجاء والتواصل مع ولي الأمر',
        });
      } else if (evalResult.status === 'needs_support') {
        list.push({
          id: `alert_supp_${student.id}`,
          studentId: student.id,
          studentName: student.fullName,
          halaqahName: halaqah?.name || 'الحلقة',
          teacherId: student.teacherId,
          type: 'low_mastery',
          title: 'يحتاج تثبيت مهارة الهجاء',
          description: evalResult.reason,
          severity: 'warning',
          recommendedAction: 'تخصيص 10 دقائق مراجعة هجاء يومية وتركيز مخارج الحروف المشكلة',
        });
      } else if (evalResult.status === 'advanced') {
        list.push({
          id: `alert_adv_${student.id}`,
          studentId: student.id,
          studentName: student.fullName,
          halaqahName: halaqah?.name || 'الحلقة',
          teacherId: student.teacherId,
          type: 'advanced_enrichment',
          title: 'طالب متقدم (فرصة إثراء)',
          description: evalResult.reason,
          severity: 'star',
          recommendedAction: 'رفع الهدف الشخصي للطالب وإسناد تلاوات نموذجية له في بداية الحلقة',
        });
      }
    });

    return list;
  }, [students, sessionRecords, spellingLessons, academicConfig, halaqahs]);

  // Current actor helper for audit logging
  const currentActor = useMemo(() => {
    return {
      id: currentUser?.id || 'anonymous',
      name: currentUser?.name || 'زائر',
      role: currentRole,
    };
  }, [currentUser, currentRole]);

  // -------------------------------------------------------------
  // Secure Authentication with Firebase Auth & Audit
  // -------------------------------------------------------------
  const login = useCallback(async (phone: string, password?: string): Promise<User | null> => {
    try {
      const authResult = await authenticateUser(phone, password);
      if (!authResult.success || !authResult.user) {
        return null;
      }

      const user = authResult.user;
      const defaultTenantId = INITIAL_TENANTS[0]?.id || '';
      const targetTenantId = user.tenantId || defaultTenantId;

      // 1. Establish tenant boundary synchronously
      setActiveTenantIdState(targetTenantId);
      safeStorage.setItem(STORAGE_KEYS.ACTIVE_TENANT, targetTenantId);

      // 2. Synchronously write user session to prevent race conditions during immediate redirect
      safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      setCurrentUser(user);

      // Ensure user is in users list so they appear in Permissions & Roles management
      setUsers((prev) => {
        if (!prev.some((u) => u.id === user.id || u.phone === user.phone)) {
          return [...prev, user];
        }
        return prev;
      });

      // 3. Guarantee strict tenant data isolation: zero operational memory and purge any stale operational cache
      resetOperationalMemory();
      purgeOperationalLocalStorage();

      if (
        user.role === 'admin' ||
        user.role === 'system_admin' ||
        user.role === 'campus_admin'
      ) {
        ensureDatabaseInitialized().catch((err) => {
          console.warn('Admin database bootstrap notice:', err);
        });
      }
      if (authResult.mustChangePassword) {
        setShowPasswordChangeModal(true);
      }
      return user;
    } catch (err) {
      console.error('Login error:', err);
      return null;
    }
  }, [resetOperationalMemory]);

  const logout = useCallback(async () => {
    try {
      await performLogout(currentUser?.id, currentUser?.name, currentUser?.role);
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    if (isDemoMode) {
      setIsDemoMode(false);
      setDemoBlockedNotice(null);
      setCurrentUser(null);
      setShowPasswordChangeModal(false);
      safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      resetOperationalMemory();
      purgeOperationalLocalStorage();
      setActiveTenantIdState(INITIAL_TENANTS[0]?.id || '');
      return;
    }
    // 1. Reset user state and purge user storage synchronously
    const tenantToPreserve = currentUser?.tenantId || activeTenantId || (INITIAL_TENANTS[0]?.id);
    setCurrentUser(null);
    setShowPasswordChangeModal(false);
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    safeStorage.setItem(STORAGE_KEYS.ACTIVE_TENANT, tenantToPreserve);

    // 2. Retain active campus tenant context
    setActiveTenantIdState(tenantToPreserve);

    // 3. Zero operational memory and purge stale cache
    resetOperationalMemory();
    purgeOperationalLocalStorage();
  }, [currentUser, activeTenantId, resetOperationalMemory, isDemoMode]);

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    if (guardDemoWrite('تغيير كلمة المرور')) return false;
    if (!currentUser) return false;
    const success = await updateUserPassword(currentUser, newPassword);
    if (success) {
      const newHash = await hashPassword(newPassword);
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUser.id ? { ...u, password: newHash, mustChangePassword: false } : u))
      );
      setCurrentUser((prev) => (prev ? { ...prev, password: newHash, mustChangePassword: false } : null));
      setShowPasswordChangeModal(false);
      return true;
    }
    return false;
  }, [currentUser, guardDemoWrite]);

  const exitDemoSession = useCallback(async () => {
    setIsDemoMode(false);
    setDemoBlockedNotice(null);
    setCurrentUser(null);
    setShowPasswordChangeModal(false);
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    resetOperationalMemory();
    purgeOperationalLocalStorage();
    setActiveTenantIdState(INITIAL_TENANTS[0]?.id || '');
  }, [resetOperationalMemory]);

  const enterDemoSession = useCallback(
    async (tenantId: string = 'al-furqan', personaKey: string = 'campus_admin'): Promise<boolean> => {
      // 1. Activate strict demo mode (memory sandbox, zero firestore writes, zero storage pollution)
      setIsDemoMode(true);
      setDemoBlockedNotice(null);

      const demoUser = DEMO_USERS[personaKey] || DEMO_USERS['campus_admin'];

      // 2. Set current actor and active tenant state
      setCurrentUser(demoUser);
      setActiveTenantIdState(DEMO_TENANT.id);

      // 3. Populate memory-only fixtures
      setTenants([DEMO_TENANT]);
      setStages(DEMO_STAGES);
      setTeachers(DEMO_TEACHERS);
      setHalaqahs(DEMO_HALAQAHS);
      setStudents(DEMO_STUDENTS);
      setSessionRecords(DEMO_SESSION_RECORDS);
      setFinancialRecords(DEMO_FINANCIAL_RECORDS);
      setAdmissionsRequests(DEMO_REGISTRATIONS);
      setAssociationNominations(DEMO_NOMINATIONS);
      setBadges(DEMO_BADGES);
      setUsers([demoUser, ...Object.values(DEMO_USERS)]);
      setStaffAttendanceRecords([]);

      return true;
    },
    []
  );

  // -------------------------------------------------------------
  // Spelling Lessons CRUD (With Cloud Firestore Sync)
  // -------------------------------------------------------------
  const addSpellingLesson = useCallback(async (lesson: Omit<SpellingLesson, 'id'>) => {
    if (guardDemoWrite('إضافة درس هجاء قرآني')) return;
    const newLesson: SpellingLesson = {
      ...lesson,
      id: `spl_${Date.now()}`,
    };
    setSpellingLessons((prev) => [...prev, newLesson].sort((a, b) => a.order - b.order));
    await dbSaveLesson(newLesson, currentActor);
  }, [currentActor, guardDemoWrite]);

  const updateSpellingLesson = useCallback(async (id: string, updates: Partial<SpellingLesson>) => {
    if (guardDemoWrite('تعديل درس هجاء قرآني')) return;
    let updatedLesson: SpellingLesson | null = null;
    setSpellingLessons((prev) => {
      const list = prev.map((l) => {
        if (l.id === id) {
          updatedLesson = { ...l, ...updates };
          return updatedLesson;
        }
        return l;
      }).sort((a, b) => a.order - b.order);
      return list;
    });
    if (updatedLesson) {
      await dbSaveLesson(updatedLesson, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const deleteSpellingLesson = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف درس هجاء قرآني')) return;
    setSpellingLessons((prev) => prev.filter((l) => l.id !== id));
    await dbDeleteLesson(id, currentActor);
  }, [currentActor, guardDemoWrite]);

  const reorderSpellingLessons = useCallback(async (lessonIds: string[]) => {
    if (guardDemoWrite('إعادة ترتيب دروس الهجاء')) return;
    let reordered: SpellingLesson[] = [];
    setSpellingLessons((prev) => {
      const map = new Map<string, SpellingLesson>();
      prev.forEach((l) => map.set(l.id, l));
      const list: SpellingLesson[] = [];
      lessonIds.forEach((id, index) => {
        const item = map.get(id);
        if (item) {
          list.push({ ...item, order: index + 1 });
        }
      });
      reordered = list;
      return list;
    });

    for (const lesson of reordered) {
      await dbSaveLesson(lesson, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const addSubLesson = useCallback(async (lessonId: string, subLesson: Omit<SubLesson, 'id'>) => {
    if (guardDemoWrite('إضافة مهارة هجاء فرعية')) return;
    let updated: SpellingLesson | null = null;
    setSpellingLessons((prev) =>
      prev.map((l) => {
        if (l.id === lessonId) {
          const newSub: SubLesson = { ...subLesson, id: `sub_${Date.now()}` };
          updated = { ...l, subLessons: [...l.subLessons, newSub] };
          return updated;
        }
        return l;
      })
    );
    if (updated) {
      await dbSaveLesson(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const updateSubLesson = useCallback(async (lessonId: string, subLessonId: string, updates: Partial<SubLesson>) => {
    if (guardDemoWrite('تعديل مهارة هجاء فرعية')) return;
    let updated: SpellingLesson | null = null;
    setSpellingLessons((prev) =>
      prev.map((l) => {
        if (l.id === lessonId) {
          updated = {
            ...l,
            subLessons: l.subLessons.map((sub) => (sub.id === subLessonId ? { ...sub, ...updates } : sub)),
          };
          return updated;
        }
        return l;
      })
    );
    if (updated) {
      await dbSaveLesson(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const deleteSubLesson = useCallback(async (lessonId: string, subLessonId: string) => {
    if (guardDemoWrite('حذف مهارة هجاء فرعية')) return;
    let updated: SpellingLesson | null = null;
    setSpellingLessons((prev) =>
      prev.map((l) => {
        if (l.id === lessonId) {
          updated = {
            ...l,
            subLessons: l.subLessons.filter((sub) => sub.id !== subLessonId),
          };
          return updated;
        }
        return l;
      })
    );
    if (updated) {
      await dbSaveLesson(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  // -------------------------------------------------------------
  // Student CRUD (With Cloud Firestore Sync & Unified User Account Provisioning)
  // -------------------------------------------------------------
  const addStudent = useCallback(async (student: Omit<Student, 'id' | 'createdAt'>) => {
    if (guardDemoWrite('إضافة طالب جديد')) return;
    const newId = `stu_${Date.now()}`;
    const newStudent: Student = {
      ...student,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setStudents((prev) => [...prev, newStudent]);
    await dbSaveStudent(newStudent, currentActor);

    // 1. Provision Platform User Account for the Student (Student login via nationalId)
    const studentLoginId = (newStudent.nationalId || '').trim();
    const studentUserId = studentLoginId ? `usr_stu_${studentLoginId}` : `usr_${newId}`;
    const studentUser: User = {
      id: studentUserId,
      name: newStudent.fullName || newStudent.name || 'طالب',
      fullName: newStudent.fullName || newStudent.name || 'طالب',
      nationalId: studentLoginId || undefined,
      loginIdentifier: studentLoginId || newStudent.parentPhone || newId,
      phone: newStudent.parentPhone || '',
      role: 'student',
      studentId: newId,
      halaqahId: newStudent.halaqahId,
      tenantId: newStudent.tenantId || activeTenantId,
      isActive: true,
      mustChangePassword: true,
    };
    await dbSaveUser({ ...studentUser, plainPassword: 'Student@2026' }, currentActor);

    // 2. Link or Provision Platform User Account for the Parent (Adult login via phone, supports multiple students)
    const parentPhoneClean = (newStudent.parentPhone || '').replace(/[^\d+]/g, '').trim();
    if (parentPhoneClean) {
      const existingParent = users.find(
        (u) => u.role === 'parent' && (u.phone?.replace(/[^\d+]/g, '') === parentPhoneClean || u.loginIdentifier === parentPhoneClean)
      );

      if (existingParent) {
        const currentStudentIds = existingParent.studentIds || [];
        if (!currentStudentIds.includes(newId)) {
          const updatedStudentIds = [...currentStudentIds, newId];
          const updatedParentUser: User = {
            ...existingParent,
            studentIds: updatedStudentIds,
          };
          setUsers((prev) => prev.map((u) => (u.id === existingParent.id ? updatedParentUser : u)));
          await dbSaveUser(updatedParentUser, currentActor);
        }
      } else {
        const parentUserId = `usr_parent_${parentPhoneClean}`;
        const parentUser: User = {
          id: parentUserId,
          name: newStudent.parentName || `ولي أمر الطالب (${newStudent.fullName || newStudent.name})`,
          fullName: newStudent.parentName || `ولي أمر الطالب (${newStudent.fullName || newStudent.name})`,
          phone: parentPhoneClean,
          loginIdentifier: parentPhoneClean,
          role: 'parent',
          studentIds: [newId],
          tenantId: newStudent.tenantId || activeTenantId,
          isActive: true,
          mustChangePassword: true,
        };
        setUsers((prev) => [...prev, parentUser]);
        await dbSaveUser({ ...parentUser, plainPassword: 'Parent@2026' }, currentActor);
      }
    }
  }, [currentActor, activeTenantId, users]);

  const updateStudent = useCallback(async (id: string, updates: Partial<Student>) => {
    if (guardDemoWrite('تعديل بيانات طالب')) return;
    let updated: Student | null = null;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          updated = { ...s, ...updates };
          return updated;
        }
        return s;
      })
    );
    if (updated) {
      await dbSaveStudent(updated, currentActor);

      // Sync student's platform_user record
      const studentUser = users.find((u) => u.studentId === id || u.id === `usr_${id}` || (updated?.nationalId && u.nationalId === updated.nationalId));
      if (studentUser) {
        const updatedUser: User = {
          ...studentUser,
          name: updated.fullName || updated.name || studentUser.name,
          fullName: updated.fullName || updated.name || studentUser.fullName,
          nationalId: updated.nationalId || studentUser.nationalId,
          loginIdentifier: updated.nationalId || studentUser.loginIdentifier,
          halaqahId: updated.halaqahId || studentUser.halaqahId,
        };
        await dbSaveUser(updatedUser, currentActor);
      }
    }
  }, [currentActor, users, guardDemoWrite]);

  const deleteStudent = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف طالب')) return;
    setStudents((prev) => prev.filter((s) => s.id !== id));
    await dbDeleteStudent(id, currentActor);

    // Delete associated student platform user
    const studentUser = users.find((u) => u.studentId === id || u.id === `usr_${id}`);
    if (studentUser) {
      setUsers((prev) => prev.filter((u) => u.id !== studentUser.id));
      await dbDeleteUser(studentUser.id, currentActor);
    }
  }, [currentActor, users, guardDemoWrite]);

  const transferStudent = useCallback(async (studentId: string, newHalaqahId: string, newTeacherId: string) => {
    if (guardDemoWrite('نقل طالب بين الحلقات')) return;
    let updated: Student | null = null;
    const targetHalaqah = halaqahs.find(h => h.id === newHalaqahId);
    const targetTeacher = teachers.find(t => t.id === newTeacherId || t.id === targetHalaqah?.teacherId);
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const oldHalaqahName = s.halaqahName || halaqahs.find(h => h.id === s.halaqahId)?.name || 'الحلقة السابقة';
          const oldTeacherName = s.teacherName || teachers.find(t => t.id === s.teacherId)?.name || 'المعلم السابق';
          const historySnapshot = {
            termId: `transfer_${Date.now()}`,
            academicYear: academicConfig.name,
            termName: academicConfig.semester,
            stageId: s.stageId,
            grade: s.grade,
            halaqahName: oldHalaqahName,
            teacherName: oldTeacherName,
            finalSurah: s.currentSurah || 'الفاتحة',
            spellingLessonReached: Number(s.currentSpellingLessonId) || 1,
            attendanceRate: 100,
            badgesCount: 0,
            finalStatus: s.status,
            completionDate: new Date().toISOString().split('T')[0],
          };
          updated = {
            ...s,
            halaqahId: newHalaqahId,
            halaqahName: targetHalaqah ? targetHalaqah.name : s.halaqahName,
            teacherId: newTeacherId || targetHalaqah?.teacherId || s.teacherId,
            teacherName: targetTeacher ? targetTeacher.name : s.teacherName,
            termHistories: [...(s.termHistories || []), historySnapshot],
          };
          return updated;
        }
        return s;
      })
    );
    if (updated) {
      await dbSaveStudent(updated, currentActor);
    }
  }, [currentActor, halaqahs, teachers, academicConfig, guardDemoWrite]);

  // -------------------------------------------------------------
  // Teacher & Halaqah CRUD (With Cloud Firestore Sync)
  // -------------------------------------------------------------
  // Teachers Management (Role: teacher | Dedicated & Isolated)
  // -------------------------------------------------------------
  const addTeacher = useCallback(async (teacher: Omit<Teacher, 'id' | 'studentsCount'>) => {
    if (guardDemoWrite('إضافة معلم جديد')) return;
    const newId = `usr_teacher_${Date.now()}`;
    const cleanPhone = (teacher.phone || '').replace(/[^\d+]/g, '').trim();
    const newTeacher: Teacher = {
      ...teacher,
      id: newId,
      studentsCount: 0,
      staffRole: 'teacher',
      isActive: true,
      tenantId: teacher.tenantId || activeTenantId,
    };
    setTeachers((prev) => [...prev, newTeacher]);

    const newUser: User = {
      id: newId,
      name: teacher.name,
      fullName: teacher.name,
      phone: teacher.phone,
      loginIdentifier: cleanPhone || teacher.phone,
      role: 'teacher',
      staffRole: 'teacher',
      teacherId: newId,
      halaqahId: teacher.halaqahId,
      isAllHalaqahs: teacher.isAllHalaqahs,
      assignedHalaqahIds: teacher.assignedHalaqahIds,
      tenantId: teacher.tenantId || activeTenantId,
      isActive: true,
      mustChangePassword: true,
    };
    setUsers((prev) => [...prev, newUser]);
    await dbSaveUser({ ...newUser, plainPassword: 'Teacher@2026' }, currentActor);
  }, [currentActor, activeTenantId, guardDemoWrite]);

  const updateTeacher = useCallback(async (id: string, updates: Partial<Teacher>) => {
    if (guardDemoWrite('تعديل بيانات المعلم')) return;
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    let updatedUser: User | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          updatedUser = {
            ...u,
            name: updates.name || u.name,
            fullName: updates.name || u.fullName || u.name,
            phone: updates.phone || u.phone,
            halaqahId: updates.halaqahId !== undefined ? updates.halaqahId : u.halaqahId,
            isAllHalaqahs: updates.isAllHalaqahs !== undefined ? updates.isAllHalaqahs : u.isAllHalaqahs,
            assignedHalaqahIds: updates.assignedHalaqahIds !== undefined ? updates.assignedHalaqahIds : u.assignedHalaqahIds,
            isActive: updates.isActive !== undefined ? updates.isActive : u.isActive,
          };
          return updatedUser;
        }
        return u;
      })
    );
    if (updatedUser) {
      await dbSaveUser(updatedUser, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const archiveTeacher = useCallback(async (id: string, reason?: string) => {
    if (guardDemoWrite('أرشفة معلم')) return;
    const targetUser = users.find((u) => u.id === id);
    const targetTeacher = teachers.find((t) => t.id === id);
    const resolvedName = targetTeacher?.name || targetUser?.name || 'معلم';
    const resolvedPhone = targetTeacher?.phone || targetUser?.phone || '';
    const nowIso = new Date().toISOString();
    const actorName = currentActor?.name || currentUser?.name || 'مدير النظام';
    const archiveReasonText = reason || 'أرشفة المعلم تحسباً للخطأ';

    const archivedTeacherPayload: Teacher & { role: string } = {
      id,
      role: 'teacher',
      name: resolvedName,
      phone: resolvedPhone,
      halaqahId: targetTeacher?.halaqahId || targetUser?.halaqahId || '',
      halaqahName: targetTeacher?.halaqahName || '',
      tenantId: targetTeacher?.tenantId || targetUser?.tenantId || activeTenantId,
      isActive: false,
      isArchived: true,
      teacherArchived: true,
      supervisorArchived: false,
      archiveType: 'teacher',
      archivedAt: nowIso,
      archivedBy: actorName,
      archiveReason: archiveReasonText,
      studentsCount: targetTeacher?.studentsCount || 0,
      staffRole: 'teacher',
    };

    // 1. Optimistically remove from active teachers
    setTeachers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeTenantStorage(activeTenantId, 'teachers', STORAGE_KEYS.TEACHERS, next);
      return next;
    });

    // 2. Optimistically update user record: mark teacherArchived and inactivate teacher role
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              isActive: false,
              isArchived: true,
              teacherArchived: true,
              supervisorArchived: false,
              archiveType: 'teacher',
              archivedAt: nowIso,
              archivedBy: actorName,
              archiveReason: archiveReasonText,
            }
          : u
      )
    );

    // 3. Optimistically add to isolated archived teachers
    setArchivedTeachers((prev) => {
      const next = [archivedTeacherPayload, ...prev.filter((t) => t.id !== id)];
      writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', next);
      return next;
    });

    // Ensure it NEVER exists in archivedSupervisors
    setArchivedSupervisors((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', next);
      return next;
    });

    // 4. Vacate halaqah teacher assignment if assigned
    if (targetTeacher?.halaqahId) {
      setHalaqahs((prev) =>
        prev.map((h) =>
          h.id === targetTeacher.halaqahId || h.teacherId === id
            ? { ...h, teacherId: '', teacherName: 'شاغرة (بانتظار تكليف)' }
            : h
        )
      );
    }

    // 5. Persist isolated to Firestore
    await dbArchiveTeacher(archivedTeacherPayload, currentActor, archiveReasonText);
  }, [users, teachers, currentActor, currentUser, activeTenantId, guardDemoWrite]);

  const restoreTeacher = useCallback(async (id: string) => {
    if (guardDemoWrite('استعادة معلم من الأرشيف')) return;
    const archivedItem = archivedTeachers.find((t) => t.id === id);
    const restoredName = archivedItem?.name || 'معلم';
    const restoredPhone = archivedItem?.phone || '';

    // 1. Remove from archived teachers state
    setArchivedTeachers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', next);
      return next;
    });

    // 2. Restore to teachers state
    const restoredTeacher: Teacher = {
      id,
      name: restoredName,
      phone: restoredPhone,
      halaqahId: archivedItem?.halaqahId || '',
      halaqahName: '',
      tenantId: archivedItem?.tenantId || activeTenantId,
      isActive: true,
      isArchived: false,
      teacherArchived: false,
      supervisorArchived: false,
      studentsCount: 0,
      staffRole: 'teacher',
    };

    setTeachers((prev) => {
      const next = [...prev.filter((t) => t.id !== id), restoredTeacher];
      writeTenantStorage(activeTenantId, 'teachers', STORAGE_KEYS.TEACHERS, next);
      return next;
    });

    // 3. Restore in users state
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              isActive: true,
              isArchived: false,
              teacherArchived: false,
              archivedAt: undefined,
              archivedBy: undefined,
              archiveReason: undefined,
              archiveType: undefined,
            }
          : u
      )
    );

    // 4. Persist to Firestore
    await dbRestoreTeacher(id, currentActor);
  }, [archivedTeachers, activeTenantId, currentActor, guardDemoWrite]);

  const permanentlyDeleteTeacher = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف نهائي لمعلم')) return;
    setTeachers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeTenantStorage(activeTenantId, 'teachers', STORAGE_KEYS.TEACHERS, next);
      return next;
    });
    setArchivedTeachers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', next);
      return next;
    });
    setUsers((prev) => prev.filter((u) => u.id !== id));
    await dbPermDeleteTeacher(id, currentActor);
  }, [activeTenantId, currentActor, guardDemoWrite]);

  const deleteTeacher = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف أو أرشفة معلم')) return;
    await archiveTeacher(id, 'أرشفة المعلم عند الحذف تحسباً للخطأ');
  }, [archiveTeacher, guardDemoWrite]);

  // -------------------------------------------------------------
  // Supervisors Management (Role: supervisor | Dedicated & Isolated)
  // -------------------------------------------------------------
  const addSupervisor = useCallback(async (supervisor: Omit<User, 'id'> & { plainPassword?: string }) => {
    if (guardDemoWrite('إضافة مشرف جديد')) return;
    const newId = `usr_sup_${Date.now()}`;
    const cleanPhone = (supervisor.phone || '').replace(/[^\d+]/g, '').trim();

    const newUser: User = {
      ...supervisor,
      id: newId,
      role: 'supervisor',
      staffRole: 'supervisor',
      name: supervisor.name,
      fullName: supervisor.fullName || supervisor.name,
      phone: supervisor.phone || '',
      loginIdentifier: cleanPhone || supervisor.phone || newId,
      tenantId: supervisor.tenantId || activeTenantId,
      supervisorScope: supervisor.supervisorScope || { type: 'general_supervisor' },
      customPermissions: supervisor.customPermissions || [],
      isActive: true,
      isArchived: false,
      supervisorArchived: false,
      mustChangePassword: true,
    };

    setUsers((prev) => [...prev, newUser]);
    await dbSaveUser({ ...newUser, plainPassword: supervisor.plainPassword || 'Admin@123456' }, currentActor);
  }, [currentActor, activeTenantId, guardDemoWrite]);

  const updateSupervisor = useCallback(async (id: string, updates: Partial<User>) => {
    if (guardDemoWrite('تعديل بيانات مشرف')) return;
    let updatedUser: User | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          updatedUser = { ...u, ...updates };
          return updatedUser;
        }
        return u;
      })
    );
    if (updatedUser) {
      await dbSaveUser(updatedUser, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const archiveSupervisor = useCallback(async (id: string, reason?: string) => {
    if (guardDemoWrite('أرشفة مشرف')) return;
    const targetUser = users.find((u) => u.id === id);
    const resolvedName = targetUser?.name || 'مشرف';
    const resolvedPhone = targetUser?.phone || '';
    const nowIso = new Date().toISOString();
    const actorName = currentActor?.name || currentUser?.name || 'مدير النظام';
    const archiveReasonText = reason || 'أرشفة المشرف تحسباً للخطأ';

    const archivedPayload: User = {
      ...(targetUser || {}),
      id,
      name: resolvedName,
      fullName: resolvedName,
      phone: resolvedPhone,
      role: 'supervisor',
      staffRole: 'supervisor',
      tenantId: targetUser?.tenantId || activeTenantId,
      isActive: false,
      isArchived: true,
      supervisorArchived: true,
      teacherArchived: false,
      archiveType: 'supervisor',
      archivedAt: nowIso,
      archivedBy: actorName,
      archiveReason: archiveReasonText,
    };

    // 1. Optimistically update users state so isArchived / supervisorArchived is active immediately
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              isActive: false,
              isArchived: true,
              supervisorArchived: true,
              teacherArchived: false,
              archiveType: 'supervisor',
              archivedAt: nowIso,
              archivedBy: actorName,
              archiveReason: archiveReasonText,
            }
          : u
      )
    );

    // 2. Optimistically add to isolated archived supervisors list
    setArchivedSupervisors((prev) => {
      const next = [archivedPayload, ...prev.filter((s) => s.id !== id)];
      writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', next);
      return next;
    });

    // Ensure it NEVER exists in archivedTeachers
    setArchivedTeachers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeTenantStorage(activeTenantId, 'archived_teachers', 'furqan_archived_teachers', next);
      return next;
    });

    // 3. Persist isolated to Firestore
    await dbArchiveSupervisor(archivedPayload, currentActor, archiveReasonText);
  }, [users, currentActor, currentUser, activeTenantId, guardDemoWrite]);

  const restoreSupervisor = useCallback(async (id: string) => {
    if (guardDemoWrite('استعادة مشرف من الأرشيف')) return;
    // 1. Remove from archived supervisors state
    setArchivedSupervisors((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', next);
      return next;
    });

    // 2. Restore in users state
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              isActive: true,
              isArchived: false,
              supervisorArchived: false,
              archivedAt: undefined,
              archivedBy: undefined,
              archiveReason: undefined,
              archiveType: undefined,
            }
          : u
      )
    );

    // 3. Persist to Firestore
    await dbRestoreSupervisor(id, currentActor);
  }, [activeTenantId, currentActor, guardDemoWrite]);

  const permanentlyDeleteSupervisor = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف نهائي لمشرف')) return;
    setArchivedSupervisors((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeTenantStorage(activeTenantId, 'archived_supervisors', 'furqan_archived_supervisors', next);
      return next;
    });
    setUsers((prev) => prev.filter((u) => u.id !== id));
    await dbPermDeleteSupervisor(id, currentActor);
  }, [activeTenantId, currentActor, guardDemoWrite]);

  const deleteSupervisor = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف أو أرشفة مشرف')) return;
    await archiveSupervisor(id, 'أرشفة المشرف عند الحذف تحسباً للخطأ');
  }, [archiveSupervisor, guardDemoWrite]);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    if (guardDemoWrite('تعديل بيانات المستخدم')) return;
    let updatedUser: User | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          updatedUser = { ...u, ...updates };
          return updatedUser;
        }
        return u;
      })
    );
    if (updatedUser) {
      await dbSaveUser(updatedUser, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const addHalaqah = useCallback(async (halaqah: Omit<Halaqah, 'id'>) => {
    if (guardDemoWrite('إضافة حلقة جديدة')) return;
    const newHalaqah: Halaqah = {
      ...halaqah,
      id: `hal_${Date.now()}`,
    };
    setHalaqahs((prev) => [...prev, newHalaqah]);
    await dbSaveHalaqah(newHalaqah, currentActor);
  }, [currentActor, guardDemoWrite]);

  const updateHalaqah = useCallback(async (id: string, updates: Partial<Halaqah>) => {
    if (guardDemoWrite('تعديل بيانات الحلقة')) return;
    let updated: Halaqah | null = null;
    setHalaqahs((prev) => {
      const next = prev.map((h) => {
        if (h.id === id) {
          updated = { ...h, ...updates };
          return updated;
        }
        return h;
      });
      writeTenantStorage(activeTenantId, 'halaqahs', STORAGE_KEYS.HALAQAHS, next);
      return next;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('halaqah_meeting_updated', {
          detail: { halaqahId: id, updates },
        })
      );
    }

    if (updated) {
      await dbSaveHalaqah(updated, currentActor);
    }
  }, [currentActor, activeTenantId, guardDemoWrite]);

  const bulkUpdateHalaqahs = useCallback(
    async (ids: string[], updates: Partial<Halaqah>) => {
      if (guardDemoWrite('تعديل جدول ومواعيد الحلقات بالجملة')) return;
      if (!ids || ids.length === 0) return;

      const updatedList: Halaqah[] = [];
      setHalaqahs((prev) => {
        const next = prev.map((h) => {
          if (ids.includes(h.id)) {
            const updated = { ...h, ...updates };
            updatedList.push(updated);
            return updated;
          }
          return h;
        });
        writeTenantStorage(activeTenantId, 'halaqahs', STORAGE_KEYS.HALAQAHS, next);
        return next;
      });

      for (const h of updatedList) {
        await dbSaveHalaqah(h, currentActor);
      }
    },
    [currentActor, activeTenantId, guardDemoWrite]
  );

  const archiveHalaqah = useCallback(async (id: string, reason?: string) => {
    if (guardDemoWrite('أرشفة حلقة')) return;
    const target = halaqahs.find((h) => h.id === id);
    if (!target) return;

    const archivedItem: ArchivedHalaqah = {
      ...target,
      isArchived: true,
      archivedAt: new Date().toISOString(),
      archivedBy: currentActor?.name || currentUser?.name || 'الإدارة',
      archiveReason: reason || 'أرشفة يدوية تحسباً للخطأ',
    };

    setHalaqahs((prev) => {
      const next = prev.filter((h) => h.id !== id);
      writeTenantStorage(activeTenantId, 'halaqahs', STORAGE_KEYS.HALAQAHS, next);
      return next;
    });

    setArchivedHalaqahs((prev) => {
      const next = [archivedItem, ...prev.filter((a) => a.id !== id)];
      writeTenantStorage(activeTenantId, 'archived_halaqahs', STORAGE_KEYS.ARCHIVED_HALAQAHS, next);
      return next;
    });

    await dbArchiveHalaqah(target, currentActor, reason);
  }, [halaqahs, activeTenantId, currentActor, currentUser, guardDemoWrite]);

  const deleteHalaqah = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف أو أرشفة حلقة')) return;
    // Automatically archive before deleting to prevent accidental loss
    await archiveHalaqah(id, 'حذف مع النقل للأرشيف تحسباً للخطأ');
  }, [archiveHalaqah, guardDemoWrite]);

  const restoreHalaqah = useCallback(async (id: string) => {
    if (guardDemoWrite('استعادة حلقة من الأرشيف')) return;
    const target = archivedHalaqahs.find((a) => a.id === id);
    if (!target) return;

    const restored: Halaqah = {
      ...target,
      isArchived: false,
      isActive: true,
    };
    delete (restored as any).archivedAt;
    delete (restored as any).archivedBy;
    delete (restored as any).archiveReason;

    setArchivedHalaqahs((prev) => {
      const next = prev.filter((a) => a.id !== id);
      writeTenantStorage(activeTenantId, 'archived_halaqahs', STORAGE_KEYS.ARCHIVED_HALAQAHS, next);
      return next;
    });

    setHalaqahs((prev) => {
      const next = [...prev.filter((h) => h.id !== id), restored];
      writeTenantStorage(activeTenantId, 'halaqahs', STORAGE_KEYS.HALAQAHS, next);
      return next;
    });

    await dbRestoreHalaqah(target, currentActor);
  }, [archivedHalaqahs, activeTenantId, currentActor, guardDemoWrite]);

  const permanentlyDeleteArchivedHalaqah = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف نهائي لحلقة')) return;
    setArchivedHalaqahs((prev) => {
      const next = prev.filter((a) => a.id !== id);
      writeTenantStorage(activeTenantId, 'archived_halaqahs', STORAGE_KEYS.ARCHIVED_HALAQAHS, next);
      return next;
    });
    await dbPermDeleteArchivedHalaqah(id, currentActor);
  }, [activeTenantId, currentActor, guardDemoWrite]);

  // -------------------------------------------------------------
  // Session Records Recording (Instant Offline Cache + Cloud Sync)
  // -------------------------------------------------------------
  const recordDailySession = useCallback(async (record: Omit<DailySessionRecord, 'id' | 'createdAt'>) => {
    if (guardDemoWrite('تسجيل حلقة يومية وتقييم طالب')) return;
    const newRecord: DailySessionRecord = {
      ...record,
      id: `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setSessionRecords((prev) => [newRecord, ...prev]);

    // Update student's fast progress pointer
    let updatedStudent: Student | null = null;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === record.studentId) {
          const updates: Partial<Student> = {};
          if (record.spelling && record.spelling.finalScore > 0) {
            updates.currentSpellingLessonId = record.spelling.lessonId;
            updates.currentSpellingScore = record.spelling.finalScore;
            if (record.spelling.statusTag === 'يحتاج تثبيت' || record.spelling.statusTag === 'لم ينتقل بعد') {
              updates.status = 'not_moved_yet';
            }
          }
          if (record.memorization && record.memorization.surahTo) {
            updates.currentSurah = record.memorization.surahTo;
            updates.currentAyah = record.memorization.ayahTo;
          }
          updatedStudent = { ...s, ...updates };
          return updatedStudent;
        }
        return s;
      })
    );

    await dbSaveDailyRecord(newRecord, currentActor);
    if (updatedStudent) {
      await dbSaveStudent(updatedStudent, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const bulkMarkAttendance = useCallback(async (
    date: string,
    weekNumber: number,
    halaqahId: string,
    attendanceMapOrPresent: Record<string, 'present' | 'late' | 'absent'> | string[],
    absentStudentIds?: string[]
  ) => {
    if (guardDemoWrite('تسجيل تحضير وغياب جماعي')) return;
    const newRecords: DailySessionRecord[] = [];
    const halaqah = halaqahs.find((h) => h.id === halaqahId);
    const teacherId = halaqah?.teacherId || '';

    if (Array.isArray(attendanceMapOrPresent)) {
      const presentStudentIds = attendanceMapOrPresent;
      const absIds = absentStudentIds || [];
      presentStudentIds.forEach((sid) => {
        newRecords.push({
          id: `rec_att_${Date.now()}_${sid}`,
          studentId: sid,
          teacherId,
          halaqahId,
          date,
          weekNumber,
          attendance: 'present',
          createdAt: new Date().toISOString(),
        });
      });
      absIds.forEach((sid) => {
        newRecords.push({
          id: `rec_att_${Date.now()}_${sid}`,
          studentId: sid,
          teacherId,
          halaqahId,
          date,
          weekNumber,
          attendance: 'absent',
          spelling: {
            lessonId: '',
            lessonNumber: 0,
            subLessonScores: {},
            finalScore: 0,
            isMastered: false,
            statusTag: 'غياب',
            notes: 'غائب',
          },
          createdAt: new Date().toISOString(),
        });
      });
    } else {
      const attendanceMap = attendanceMapOrPresent;
      Object.entries(attendanceMap).forEach(([sid, status]) => {
        newRecords.push({
          id: `rec_att_${Date.now()}_${sid}`,
          studentId: sid,
          teacherId,
          halaqahId,
          date,
          weekNumber,
          attendance: status as any,
          spelling: status === 'absent' ? {
            lessonId: '',
            lessonNumber: 0,
            subLessonScores: {},
            finalScore: 0,
            isMastered: false,
            statusTag: 'غياب',
            notes: 'غائب',
          } : undefined,
          createdAt: new Date().toISOString(),
        });
      });
    }

    setSessionRecords((prev) => [...newRecords, ...prev]);
    await dbSaveBulkAttendance(newRecords, currentActor);
  }, [halaqahs, currentActor, guardDemoWrite]);

  // -------------------------------------------------------------
  // Academic Config & Educational Plan
  // -------------------------------------------------------------
  const updateAcademicConfig = useCallback(async (updates: Partial<AcademicYearConfig>) => {
    if (guardDemoWrite('تعديل إعدادات العام الدراسي')) return;
    let updated: AcademicYearConfig | null = null;
    setAcademicConfig((prev) => {
      updated = { ...prev, ...updates };
      return updated;
    });
    if (updated) {
      await dbSaveAcademicConfig(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const addEducationalWeek = useCallback(async (week: Omit<EducationalPlanWeek, 'id'>) => {
    if (guardDemoWrite('إضافة أسبوع للخطة التعليمية')) return;
    const newWeek: EducationalPlanWeek = {
      ...week,
      id: `edu_w_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    setEducationalPlan((prev) => [...prev, newWeek].sort((a, b) => a.weekNumber - b.weekNumber));
    await dbSavePlanWeek(newWeek, currentActor);
  }, [currentActor, guardDemoWrite]);

  const bulkAddEducationalWeeks = useCallback(async (weeks: Omit<EducationalPlanWeek, 'id'>[]) => {
    if (guardDemoWrite('إضافة دفعة أسابيع للخطة التربوية')) return;
    const newWeeks: EducationalPlanWeek[] = weeks.map((w, idx) => ({
      ...w,
      id: `edu_w_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
    }));
    setEducationalPlan((prev) => [...prev, ...newWeeks].sort((a, b) => a.weekNumber - b.weekNumber));
    await dbSaveBulkPlanWeeks(newWeeks, currentActor);
  }, [currentActor, guardDemoWrite]);

  const replaceStageEducationalPlan = useCallback(async (stageId: string, weeks: Omit<EducationalPlanWeek, 'id'>[]) => {
    if (guardDemoWrite('تحديث خطة المرحلة التربوية')) return;
    const oldWeeks = educationalPlan.filter((w) =>
      stageId === 'all' ? true : (w.stageId === stageId || (w.targetStageIds && w.targetStageIds.includes(stageId)))
    );
    const oldIds = oldWeeks.map((w) => w.id);
    if (oldIds.length > 0) {
      await dbDeleteBulkPlanWeeks(oldIds, currentActor);
    }

    const newWeeks: EducationalPlanWeek[] = weeks.map((w, idx) => ({
      ...w,
      stageId: stageId === 'all' ? (w.stageId || 'baraem') : (w.stageId || stageId),
      id: `edu_w_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
    }));
    setEducationalPlan((prev) => {
      const filtered = stageId === 'all' 
        ? [] 
        : prev.filter((w) => w.stageId !== stageId && (!w.targetStageIds || !w.targetStageIds.includes(stageId)));
      return [...filtered, ...newWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
    });
    await dbSaveBulkPlanWeeks(newWeeks, currentActor);
  }, [educationalPlan, currentActor, guardDemoWrite]);

  const updateEducationalWeek = useCallback(async (id: string, updates: Partial<EducationalPlanWeek>) => {
    if (guardDemoWrite('تعديل أسبوع في الخطة التعليمية')) return;
    let updated: EducationalPlanWeek | null = null;
    setEducationalPlan((prev) => {
      const list = prev.map((w) => {
        if (w.id === id) {
          updated = { ...w, ...updates };
          return updated;
        }
        return w;
      }).sort((a, b) => a.weekNumber - b.weekNumber);
      return list;
    });
    if (updated) {
      await dbSavePlanWeek(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const deleteEducationalWeek = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف أسبوع من الخطة التعليمية')) return;
    setEducationalPlan((prev) => prev.filter((w) => w.id !== id));
    await dbDeletePlanWeek(id, currentActor);
  }, [currentActor, guardDemoWrite]);

  const bulkDeleteEducationalWeeks = useCallback(async (ids: string[]) => {
    if (guardDemoWrite('حذف دفعة أسابيع من الخطة التعليمية')) return;
    if (!ids || ids.length === 0) return;
    const idsSet = new Set(ids);
    setEducationalPlan((prev) => prev.filter((w) => !idsSet.has(w.id)));
    await dbDeleteBulkPlanWeeks(ids, currentActor);
  }, [currentActor, guardDemoWrite]);

  const clearStageEducationalPlan = useCallback(async (stageId: string) => {
    if (guardDemoWrite('إفراغ وحذف خطة المرحلة')) return;
    const toDelete = educationalPlan.filter((w) =>
      stageId === 'all' || w.stageId === stageId || (w.targetStageIds && w.targetStageIds.includes(stageId))
    );
    const ids = toDelete.map((w) => w.id);
    if (ids.length > 0) {
      const idsSet = new Set(ids);
      setEducationalPlan((prev) => prev.filter((w) => !idsSet.has(w.id)));
      await dbDeleteBulkPlanWeeks(ids, currentActor);
    }
  }, [educationalPlan, currentActor, guardDemoWrite]);

  // -------------------------------------------------------------
  // Seasonal Programs & Activities (البرامج والأنشطة الموسمية المستقلة)
  // -------------------------------------------------------------
  const addSeasonalProgram = useCallback(async (prog: Omit<SeasonalProgram, 'id'>) => {
    if (guardDemoWrite('إضافة برنامج موسمي جديد')) return;
    const newProg: SeasonalProgram = {
      ...prog,
      id: `prog_seas_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setSeasonalPrograms((prev) => [newProg, ...prev]);
    await dbSaveSeasonalProgram(newProg, currentActor);
  }, [currentActor, guardDemoWrite]);

  const updateSeasonalProgram = useCallback(async (id: string, updates: Partial<SeasonalProgram>) => {
    if (guardDemoWrite('تعديل برنامج موسمي')) return;
    let updated: SeasonalProgram | null = null;
    setSeasonalPrograms((prev) => {
      return prev.map((p) => {
        if (p.id === id) {
          updated = { ...p, ...updates, updatedAt: new Date().toISOString().split('T')[0] };
          return updated;
        }
        return p;
      });
    });
    if (updated) {
      await dbSaveSeasonalProgram(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const deleteSeasonalProgram = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف برنامج موسمي')) return;
    const target = seasonalPrograms.find((p) => p.id === id);
    setSeasonalPrograms((prev) => prev.filter((p) => p.id !== id));
    setSeasonalActivities((prev) => prev.filter((a) => a.programId !== id));
    setSeasonalParticipations((prev) => prev.filter((part) => part.programId !== id));
    await dbDeleteSeasonalProgram(id, target?.title || id, currentActor);
  }, [seasonalPrograms, currentActor, guardDemoWrite]);

  const addSeasonalActivity = useCallback(async (act: Omit<SeasonalActivity, 'id'>) => {
    if (guardDemoWrite('إضافة نشاط للبرنامج الموسمي')) return;
    const newAct: SeasonalActivity = {
      ...act,
      id: `act_seas_${Date.now()}`,
    };
    setSeasonalActivities((prev) => [...prev, newAct]);
    await dbSaveSeasonalActivity(newAct, currentActor);
  }, [currentActor, guardDemoWrite]);

  const updateSeasonalActivity = useCallback(async (id: string, updates: Partial<SeasonalActivity>) => {
    if (guardDemoWrite('تعديل نشاط في البرنامج الموسمي')) return;
    let updated: SeasonalActivity | null = null;
    setSeasonalActivities((prev) => {
      return prev.map((a) => {
        if (a.id === id) {
          updated = { ...a, ...updates };
          return updated;
        }
        return a;
      });
    });
    if (updated) {
      await dbSaveSeasonalActivity(updated, currentActor);
    }
  }, [currentActor, guardDemoWrite]);

  const deleteSeasonalActivity = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف نشاط من البرنامج الموسمي')) return;
    const target = seasonalActivities.find((a) => a.id === id);
    setSeasonalActivities((prev) => prev.filter((a) => a.id !== id));
    await dbDeleteSeasonalActivity(id, target?.title || id, currentActor);
  }, [seasonalActivities, currentActor, guardDemoWrite]);

  const saveSeasonalParticipation = useCallback(async (participation: Omit<SeasonalParticipation, 'id' | 'recordedAt'>) => {
    if (guardDemoWrite('رصد حضور ومشاركة الطالب في البرنامج الموسمي')) return;
    const existingIndex = seasonalParticipations.findIndex(
      (p) => p.programId === participation.programId && p.studentId === participation.studentId && (participation.activityId ? p.activityId === participation.activityId : true)
    );
    let record: SeasonalParticipation;
    if (existingIndex >= 0) {
      record = {
        ...seasonalParticipations[existingIndex],
        ...participation,
        recordedAt: new Date().toISOString().split('T')[0],
      };
      setSeasonalParticipations((prev) => {
        const next = [...prev];
        next[existingIndex] = record;
        return next;
      });
    } else {
      record = {
        ...participation,
        id: `part_seas_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        recordedAt: new Date().toISOString().split('T')[0],
      };
      setSeasonalParticipations((prev) => [record, ...prev]);
    }
    await dbSaveSeasonalParticipation(record, currentActor);
  }, [seasonalParticipations, currentActor, guardDemoWrite]);

  const deleteSeasonalParticipation = useCallback(async (id: string) => {
    if (guardDemoWrite('حذف سجل مشاركة موسمي')) return;
    setSeasonalParticipations((prev) => prev.filter((p) => p.id !== id));
    await dbDeleteSeasonalParticipation(id);
  }, [guardDemoWrite]);

  const addReportLog = useCallback(async (log: Omit<ReportLog, 'id' | 'timestamp'>) => {
    if (guardDemoWrite('تسجيل سجل تقرير')) return;
    const newLog: ReportLog = {
      ...log,
      id: `rep_${Date.now()}`,
      timestamp: new Date().toLocaleString('ar-SA'),
    };
    setReportLogs((prev) => [newLog, ...prev]);
    await dbSaveReportLog(newLog);
  }, [guardDemoWrite]);

  // -------------------------------------------------------------
  // P2: Badges and Incentives
  // -------------------------------------------------------------
  const awardBadge = useCallback(
    async (badgeType: BadgeType, studentId: string, notes?: string, isAutomatic = false) => {
      if (guardDemoWrite('منح وسام لطالب')) return;
      const student = students.find((s) => s.id === studentId);
      const newBadge: StudentBadge = {
        id: `bdg_${studentId}_${badgeType}_${Date.now()}`,
        badgeType,
        studentId,
        studentName: student?.fullName || 'طالب',
        awardedAt: new Date().toISOString().split('T')[0],
        awardedBy: currentUser?.name || 'معلم الحلقة',
        notes: notes || '',
        isAutomatic,
      };

      setBadges((prev) => {
        const filtered = prev.filter((b) => !(b.studentId === studentId && b.badgeType === badgeType));
        return [newBadge, ...filtered];
      });

      // Synchronize with Firestore cloud database
      await saveBadgeToDb(newBadge, currentActor);
    },
    [students, currentUser, currentActor, guardDemoWrite]
  );

  const deleteBadge = useCallback(
    async (badgeId: string) => {
      if (guardDemoWrite('حذف وسام')) return;
      setBadges((prev) => prev.filter((b) => b.id !== badgeId));
      await deleteBadgeFromDb(badgeId, currentActor);
    },
    [currentActor, guardDemoWrite]
  );

  // -------------------------------------------------------------
  // P2: Remedial Action Plans
  // -------------------------------------------------------------
  const saveRemedialPlan = useCallback(
    async (plan: RemedialActionPlan) => {
      if (guardDemoWrite('حفظ خطة علاجية')) return;
      setRemedialPlans((prev) => {
        const idx = prev.findIndex((p) => p.id === plan.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...plan, updatedAt: new Date().toISOString() };
          return updated;
        }
        return [plan, ...prev];
      });

      // Synchronize with Firestore cloud database
      await saveRemedialPlanToDb(plan, currentActor);
    },
    [currentActor, guardDemoWrite]
  );

  const resolveRemedialPlan = useCallback(
    async (planId: string, resolutionNotes?: string) => {
      if (guardDemoWrite('إغلاق خطة علاجية')) return;
      setRemedialPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                status: 'resolved',
                updatedAt: new Date().toISOString(),
                notes: resolutionNotes ? `${p.notes ? p.notes + ' | ' : ''}${resolutionNotes}` : p.notes,
              }
            : p
        )
      );

      // Synchronize with Firestore cloud database
      await resolveRemedialPlanInDb(planId, resolutionNotes, currentActor);
    },
    [currentActor, guardDemoWrite]
  );

  // -------------------------------------------------------------
  // P3: Multi-Tenancy Management
  // -------------------------------------------------------------
  const addTenant = useCallback(
    async (
      tenantData: Omit<MosqueComplexTenant, 'id' | 'createdAt'>,
      adminCredentials?: { password?: string }
    ) => {
      if (guardDemoWrite('إضافة مجمع جديد')) return;
      const id = `tenant_${Date.now()}`;
      const newTenant: MosqueComplexTenant = {
        ...tenantData,
        id,
        createdAt: new Date().toISOString(),
        admissionsConfig: tenantData.admissionsConfig || {
          ...DEFAULT_TENANT_ADMISSIONS_CONFIG,
          contactPhones: tenantData.contactPhone ? [tenantData.contactPhone] : DEFAULT_TENANT_ADMISSIONS_CONFIG.contactPhones,
        },
      };
      const initialPassword = adminCredentials?.password || 'Admin@123456';
      setTenants((prev) => [...prev, newTenant]);

      // Save tenant and automatically create campus_admin in platform_users
      await saveTenantToDb(newTenant, currentActor, initialPassword);

      // Also register into local users state for immediate UI feedback
      if (newTenant.supervisorName || newTenant.contactPhone || newTenant.email) {
        const cleanPhone = (newTenant.contactPhone || '').replace(/[^\d+]/g, '').trim();
        const adminUserId = `usr_adm_${id}`;

        const campusAdminUser: User = {
          id: adminUserId,
          name: newTenant.supervisorName || `مدير ${newTenant.name}`,
          fullName: newTenant.supervisorName || `مدير ${newTenant.name}`,
          phone: newTenant.contactPhone || '',
          email: newTenant.email || undefined,
          loginIdentifier: cleanPhone || newTenant.email || adminUserId,
          role: 'campus_admin',
          tenantId: id,
          isActive: true,
          mustChangePassword: false,
          customPermissions: [],
        };

        setUsers((prev) => [...prev.filter((u) => u.id !== adminUserId), campusAdminUser]);
      }
    },
    [currentActor, guardDemoWrite]
  );

  const updateTenant = useCallback(
    async (tenant: MosqueComplexTenant) => {
      if (guardDemoWrite('تعديل بيانات المجمع')) return;
      setTenants((prev) => {
        const exists = prev.some((t) => t.id === tenant.id);
        const next = exists ? prev.map((t) => (t.id === tenant.id ? tenant : t)) : [...prev, tenant];
        try {
          safeStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to cache tenants in safeStorage:', e);
        }
        return next;
      });
      // Saves tenant and synchronizes the campus_admin user in platform_users
      await saveTenantToDb(tenant, currentActor);

      // Also update local users state
      const cleanPhone = (tenant.contactPhone || '').replace(/[^\d+]/g, '').trim();
      setUsers((prev) =>
        prev.map((u) => {
          if (u.tenantId === tenant.id && u.role === 'campus_admin') {
            return {
              ...u,
              name: tenant.supervisorName || `مدير ${tenant.name}`,
              fullName: tenant.supervisorName || `مدير ${tenant.name}`,
              phone: tenant.contactPhone || u.phone,
              loginIdentifier: cleanPhone || u.loginIdentifier,
              email: tenant.email || u.email,
              isActive: tenant.isActive !== false,
            };
          }
          return u;
        })
      );
    },
    [currentActor, guardDemoWrite]
  );

  const updateCampusAdminPassword = useCallback(
    async (tenantId: string, newPlainPassword: string): Promise<boolean> => {
      if (guardDemoWrite('تعديل كلمة مرور مدير المجمع')) return false;
      const cleanPass = newPlainPassword.trim();
      if (!cleanPass) return false;

      // Update directly in the source platform_users table in Firestore
      const dbSuccess = await updateTenantAdminPasswordInDb(tenantId, cleanPass, currentActor);

      // Also update in-memory state
      setUsers((prev) =>
        prev.map((u) => {
          if (u.tenantId === tenantId && u.role === 'campus_admin') {
            return {
              ...u,
              password: cleanPass,
              mustChangePassword: false,
            };
          }
          return u;
        })
      );

      return dbSuccess;
    },
    [currentActor, guardDemoWrite]
  );

  const deleteTenant = useCallback(
    async (tenantId: string) => {
      if (guardDemoWrite('حذف مجمع')) return;
      if (tenantId === 'al-furqan') {
        throw new Error('لا يمكن حذف مجمع الفرقان النموذجي التجريبي حمايةً لمنصة التجربة.');
      }
      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      await deleteTenantFromDb(tenantId, currentActor);
    },
    [currentActor, guardDemoWrite]
  );

  // -------------------------------------------------------------
  // P9: Organization & Charity Supervision Management
  // -------------------------------------------------------------
  const saveOrganization = useCallback(
    async (org: Organization) => {
      if (guardDemoWrite('حفظ جمعية أو جهة إشراف')) return;
      setOrganizations((prev) => {
        const idx = prev.findIndex((o) => o.id === org.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = org;
          return next;
        }
        return [...prev, org];
      });
      await saveOrganizationToDb(org, currentActor);
    },
    [currentActor, guardDemoWrite]
  );

  const deleteOrganization = useCallback(
    async (orgId: string) => {
      if (guardDemoWrite('حذف جهة إشراف')) return;
      setOrganizations((prev) => prev.filter((t) => t.id !== orgId));
      await deleteOrganizationFromDb(orgId, currentActor);
    },
    [currentActor, guardDemoWrite]
  );

  const userCanEditTenant = useCallback(
    (targetTenantId?: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'system_admin') return true;
      if (currentUser.role === 'charity_supervisor') {
        if (currentUser.supervisionMode === 'read_only') return false;
        if (currentUser.organizationId) {
          const org = organizations.find((o) => o.id === currentUser.organizationId);
          if (org && targetTenantId) {
            return org.tenantIds.includes(targetTenantId);
          }
        }
        return true;
      }
      return true;
    },
    [currentUser, organizations]
  );

  const getSupervisedTenants = useCallback((): MosqueComplexTenant[] => {
    if (!currentUser) return tenants;
    if (currentUser.role === 'system_admin') return tenants;
    if (currentUser.role === 'charity_supervisor' && currentUser.organizationId) {
      const org = organizations.find((o) => o.id === currentUser.organizationId);
      if (org) {
        return tenants.filter((t) => org.tenantIds.includes(t.id) || t.organizationId === org.id);
      }
    }
    return tenants;
  }, [currentUser, organizations, tenants]);

  const updateAcademicOutcome = useCallback(
    async (outcomeText: string, targetSurah?: string, tenantId?: string) => {
      // Security check: only system_admin, admin, or campus_admin can update academic outcomes
      const canEdit =
        currentUser?.role === 'system_admin' ||
        (currentUser?.role as any) === 'admin' ||
        currentUser?.role === 'campus_admin';

      if (!canEdit) {
        throw new Error('غير مصرح لك بتعديل المخرج القرآني المرجعي. يقتصر التعديل على مديري النظام والمجمعات.');
      }

      // If campus_admin, can only edit their own assigned tenant
      const effectiveTenantId =
        currentUser?.role === 'campus_admin' && currentUser.tenantId
          ? currentUser.tenantId
          : tenantId || activeTenantId;

      const targetTenant = tenants.find((t) => t.id === effectiveTenantId) || activeTenant;
      if (!targetTenant) return;

      const updatedTenant: MosqueComplexTenant = {
        ...targetTenant,
        referenceOutcome: outcomeText.trim(),
        targetSurahDefault: targetSurah || targetTenant.targetSurahDefault,
      };

      await updateTenant(updatedTenant);

      // Record audit log
      const logEntry: AuditLog = {
        id: `audit_outcome_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'مدير النظام',
        userRole: (currentUser?.role as any) || 'system_admin',
        action: 'update',
        entityType: 'tenant',
        entityId: targetTenant.id,
        notes: `تعديل المخرج القرآني المرجعي لمجمع [${targetTenant.name}] إلى: "${outcomeText.trim()}" (السورة المستهدفة: ${targetSurah || targetTenant.targetSurahDefault})`,
      };
      setAuditLogs((prev) => [logEntry, ...prev]);
    },
    [currentUser, activeTenantId, activeTenant, tenants, updateTenant]
  );

  
  const updateAdmissionsConfig = useCallback(
    async (config: import('../types').TenantAdmissionsConfig) => {
      if (!activeTenantId || !activeTenant) return;
      try {
        const updatedTenant: MosqueComplexTenant = {
          ...activeTenant,
          admissionsConfig: config,
        };
        await updateTenant(updatedTenant);
        console.log('تم تحديث إعدادات القبول والتسجيل بنجاح');
      } catch (error) {
        console.error('حدث خطأ أثناء التحديث', error);
        throw error;
      }
    },
    [activeTenantId, activeTenant, updateTenant]
  );

  
  const updateReportsConfig = useCallback(
    async (config: import('../types').TenantReportsConfig) => {
      if (!activeTenantId) return;
      try {
        setTenants(prev =>
          prev.map(t =>
            t.id === activeTenantId
              ? { ...t, reportsConfig: config }
              : t
          )
        );
        console.log('تم تحديث إعدادات التقارير بنجاح');
      } catch (error) {
        console.error('حدث خطأ أثناء التحديث');
      }
    },
    [activeTenantId]
  );

  
  const updateWhatsAppConfig = useCallback(
    async (config: import('../types').WhatsAppApiConfig) => {
      if (!activeTenantId) return;
      try {
        setTenants(prev =>
          prev.map(t =>
            t.id === activeTenantId
              ? { ...t, whatsappConfig: config }
              : t
          )
        );
        console.log('تم حفظ إعدادات WhatsApp بنجاح');
      } catch (error) {
        console.error('حدث خطأ أثناء التحديث');
      }
    },
    [activeTenantId]
  );

  const updateAttendanceConfig = useCallback(
    async (config: TenantAttendanceConfig) => {
      if (!activeTenant) return;
      const updated: MosqueComplexTenant = {
        ...activeTenant,
        attendanceConfig: config,
      };
      await updateTenant(updated);
    },
    [activeTenant, updateTenant]
  );

  const updatePrayerConfig = useCallback(
    async (config: TenantPrayerConfig) => {
      if (!activeTenant) return;
      const updated: MosqueComplexTenant = {
        ...activeTenant,
        prayerConfig: config,
      };
      await updateTenant(updated);
    },
    [activeTenant, updateTenant]
  );

  const prayerTimesToday = useMemo(() => {
    return getPrayerTimesForDateSync(activeTenant);
  }, [activeTenant]);

  const isRecordingGeoAttendanceRef = useRef(false);

  const recordGeoAttendance = useCallback(
    async (reason?: string): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> => {
      if (!currentUser) {
        return { success: false, message: 'يرجى تسجيل الدخول أولاً.' };
      }
      if (!activeTenant) {
        return { success: false, message: 'لم يتم تحديد المجمع الحالي.' };
      }

      const todayStr = getLocalDateString();

      // Concurrency lock: prevent simultaneous executions from rapid clicks or auto-tracker racing
      if (isRecordingGeoAttendanceRef.current) {
        return { success: false, message: 'جاري تسجيل الحضور بالفعل، يرجى الانتظار...' };
      }

      // Strictly check for TODAY's attendance only. Past records from different days NEVER block today's registration!
      const alreadyChecked = (staffAttendanceRecords || []).find(
        (r) =>
          (r.tenantId === activeTenant?.id || !r.tenantId) &&
          r.userId === currentUser.id &&
          isRecordForDate(r.date || r.timestamp, todayStr)
      );
      if (alreadyChecked) {
        return { success: false, message: 'لقد سجلت حضورك لهذا اليوم بالفعل.', record: alreadyChecked };
      }

      isRecordingGeoAttendanceRef.current = true;

      const attendanceCfg = activeTenant?.attendanceConfig || {
        latitude: 21.56466,
        longitude: 39.14420,
        radiusMeters: 200,
        regularDays: [0, 1, 2, 3, 4],
      };

      const isManagerOrAdmin = ['campus_admin', 'system_admin', 'admin', 'manager'].includes(currentUser.role);
      const hasReason = Boolean(reason && reason.trim().length > 0);

      const saveAttendanceInternal = async (
        method: 'geo' | 'manual',
        dist?: number,
        lat?: number,
        lng?: number,
        customReason?: string
      ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> => {
        let effectiveRegularDays = attendanceCfg.regularDays || [0, 1, 2, 3, 4];
        const userStageId = currentUser.stageId || currentUser.assignedStageIds?.[0];
        if (attendanceCfg.attendanceScope === 'halaqah' && currentUser.halaqahId) {
          const matchedHalaqah = halaqahs.find((h) => h.id === currentUser.halaqahId);
          if (matchedHalaqah) {
            effectiveRegularDays = getHalaqahActiveDays(matchedHalaqah);
          } else if (attendanceCfg.halaqahOverrides?.[currentUser.halaqahId]) {
            effectiveRegularDays = attendanceCfg.halaqahOverrides[currentUser.halaqahId].regularDays;
          }
        } else if (attendanceCfg.attendanceScope === 'stage' && userStageId && attendanceCfg.stageOverrides?.[userStageId]) {
          effectiveRegularDays = attendanceCfg.stageOverrides[userStageId].regularDays;
        }

        const isRegular = isRegularAttendanceDay(effectiveRegularDays, new Date());
        const finalReason = customReason || reason || (isRegular ? 'حضور اعتيادي' : isManagerOrAdmin ? 'حضور إداري - مدير المجمع' : 'أخرى');

        const deterministicId = `att_${activeTenant?.id}_${currentUser.id}_${todayStr}`;

        const newRecord: AttendanceRecord = {
          id: deterministicId,
          tenantId: activeTenant?.id,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          date: todayStr,
          timestamp: new Date().toISOString(),
          isRegularDay: isRegular || isManagerOrAdmin,
          reason: finalReason,
          method,
          locationData: lat !== undefined && lng !== undefined ? {
            latitude: lat,
            longitude: lng,
            distanceMeters: dist,
            tenantLatitude: attendanceCfg.latitude,
            tenantLongitude: attendanceCfg.longitude,
            radiusMeters: attendanceCfg.radiusMeters,
          } : undefined,
        };

        const actualRecord = isDemoMode ? newRecord : await dbSaveStaffAttendanceRecord(newRecord);

        setStaffAttendanceRecords((prev) => {
          const filtered = prev.filter(
            (r) => !(
              (r.tenantId === activeTenant?.id || !r.tenantId) &&
              r.userId === currentUser.id &&
              isRecordForDate(r.date || r.timestamp, todayStr)
            )
          );
          const next = [actualRecord, ...filtered];
          writeTenantStorage(activeTenant?.id, 'staff_attendance', 'al_ghazzawi_staff_attendance_v2', next);
          return next;
        });

        return { success: true, message: 'تم تسجيل الحضور بنجاح!', record: actualRecord };
      };

      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          if (isManagerOrAdmin || hasReason) {
            saveAttendanceInternal('manual', undefined, undefined, undefined, reason || (isManagerOrAdmin ? 'حضور إداري - مدير المجمع' : 'حضور يدوي'))
              .then(resolve)
              .catch((err) => resolve({ success: false, message: 'حدث خطأ: ' + err.message }))
              .finally(() => {
                isRecordingGeoAttendanceRef.current = false;
              });
            return;
          }
          isRecordingGeoAttendanceRef.current = false;
          resolve({ success: false, message: 'متصفحك لا يدعم خاصية تحديد الموقع الجغرافي. يمكنك تسجيل الحضور يدوياً بعذر.' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              const distance = calculateDistanceMeters(userLat, userLng, attendanceCfg.latitude, attendanceCfg.longitude);

              if (distance > attendanceCfg.radiusMeters) {
                if (isManagerOrAdmin || hasReason) {
                  const res = await saveAttendanceInternal(
                    'manual',
                    distance,
                    userLat,
                    userLng,
                    reason || (isManagerOrAdmin ? `حضور إداري - مدير المجمع (${distance}م)` : `حضور معتمد بعذر (${distance}م)`)
                  );
                  resolve(res);
                  return;
                }

                resolve({
                  success: false,
                  message: `أنت خارج نطاق المجمع (${distance} متر عن الموقع. النطاق المسموح: ${attendanceCfg.radiusMeters} متر). يمكنك اختيار تسجيل حضور يدوي مع تحديد السبب.`,
                });
                return;
              }

              let effectiveRegularDays = attendanceCfg.regularDays || [0, 1, 2, 3, 4];
              const userStageId = currentUser.stageId || currentUser.assignedStageIds?.[0];
              if (attendanceCfg.attendanceScope === 'halaqah' && currentUser.halaqahId) {
                const matchedHalaqah = halaqahs.find((h) => h.id === currentUser.halaqahId);
                if (matchedHalaqah) {
                  effectiveRegularDays = getHalaqahActiveDays(matchedHalaqah);
                } else if (attendanceCfg.halaqahOverrides?.[currentUser.halaqahId]) {
                  effectiveRegularDays = attendanceCfg.halaqahOverrides[currentUser.halaqahId].regularDays;
                }
              } else if (attendanceCfg.attendanceScope === 'stage' && userStageId && attendanceCfg.stageOverrides?.[userStageId]) {
                effectiveRegularDays = attendanceCfg.stageOverrides[userStageId].regularDays;
              }

              const isRegular = isRegularAttendanceDay(effectiveRegularDays, new Date());
              if (!isRegular && !reason && !isManagerOrAdmin) {
                resolve({
                  success: false,
                  message: 'اليوم ليس من أيام الحضور المعتادة. يرجى توضيح سبب الحضور (اجتماع، نشاط، تدريب، مهمة، أخرى).',
                  record: undefined,
                });
                return;
              }

              const res = await saveAttendanceInternal('geo', distance, userLat, userLng, reason);
              resolve(res);
            } catch (err: any) {
              resolve({ success: false, message: 'حدث خطأ أثناء حفظ سجل الحضور: ' + (err.message || '') });
            } finally {
              isRecordingGeoAttendanceRef.current = false;
            }
          },
          async (error) => {
            if (isManagerOrAdmin || hasReason) {
              try {
                const res = await saveAttendanceInternal(
                  'manual',
                  undefined,
                  undefined,
                  undefined,
                  reason || (isManagerOrAdmin ? 'حضور إداري - مدير المجمع' : 'حضور يدوي / تعذر تحديد الموقع')
                );
                resolve(res);
              } catch (err: any) {
                resolve({ success: false, message: 'حدث خطأ أثناء الحفظ: ' + (err.message || '') });
              } finally {
                isRecordingGeoAttendanceRef.current = false;
              }
              return;
            }

            isRecordingGeoAttendanceRef.current = false;
            let msg = 'تعذر الحصول على موقعك الجغرافي.';
            if (error.code === error.PERMISSION_DENIED) {
              msg = 'تم رفض إذن الوصول إلى الموقع الجغرافي من المتصفح.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              msg = 'معلومات الموقع الجغرافي غير متوفرة حالياً.';
            } else if (error.code === error.TIMEOUT) {
              msg = 'انتهت مهلة طلب تحديد الموقع الجغرافي.';
            }
            resolve({ success: false, message: msg + ' يمكنك استخدام التسجيل اليدوي بعذر.' });
          },
          { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
        );
      });
    },
    [currentUser, activeTenant, staffAttendanceRecords, halaqahs, isDemoMode]
  );

  const deleteStaffAttendance = useCallback(
    async (recordId: string) => {
      if (guardDemoWrite('حذف سجل حضور موظف')) return;
      setStaffAttendanceRecords((prev) => {
        const next = prev.filter((r) => r.id !== recordId);
        writeTenantStorage(activeTenantId, 'staff_attendance', 'al_ghazzawi_staff_attendance_v2', next);
        return next;
      });
      await dbDeleteStaffAttendanceRecord(recordId);
    },
    [activeTenantId, guardDemoWrite]
  );

  // -------------------------------------------------------------
  // P3: Educational Stages Extensibility
  // -------------------------------------------------------------
  const addStage = useCallback(
    async (stage: EducationalStage) => {
      if (guardDemoWrite('إضافة مرحلة تعليمية جديدة')) return;
      setStages((prev) => {
        const exists = prev.some((s) => s.id === stage.id);
        const next = exists ? prev.map((s) => (s.id === stage.id ? stage : s)) : [...prev, stage];
        writeTenantStorage(activeTenantId, 'stages', 'furqan_stages', next);
        return next;
      });
      await saveStageToDb(stage, currentActor);
    },
    [currentActor, guardDemoWrite, activeTenantId]
  );

  const updateStage = useCallback(
    async (stage: EducationalStage) => {
      if (guardDemoWrite('تعديل مرحلة تعليمية')) return;
      setStages((prev) => {
        const next = prev.map((s) => (s.id === stage.id ? stage : s));
        writeTenantStorage(activeTenantId, 'stages', 'furqan_stages', next);
        return next;
      });
      await saveStageToDb(stage, currentActor);
    },
    [currentActor, guardDemoWrite, activeTenantId]
  );

  const deleteStage = useCallback(
    async (stageId: string) => {
      if (guardDemoWrite('حذف مرحلة تعليمية')) return;
      setStages((prev) => {
        const next = prev.filter((s) => s.id !== stageId);
        writeTenantStorage(activeTenantId, 'stages', 'furqan_stages', next);
        return next;
      });
      await deleteStageFromDb(stageId, currentActor);
    },
    [currentActor, guardDemoWrite, activeTenantId]
  );

  const updateStageLogo = useCallback(
    async (stageId: string, logoUrl: string | null, isLogoActive: boolean = true) => {
      if (guardDemoWrite('تعديل شعار المرحلة التعليمية')) return;
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;
      const updatedStage: EducationalStage = {
        ...stage,
        logoUrl: logoUrl || undefined,
        isLogoActive: logoUrl ? isLogoActive : false,
      };
      await updateStage(updatedStage);
    },
    [stages, updateStage, guardDemoWrite]
  );

  // -------------------------------------------------------------
  // P3: Academic Archives & Cumulative History
  // -------------------------------------------------------------
  const archiveCurrentTerm = useCallback(
    async (termName: string, notes?: string) => {
      if (guardDemoWrite('أرشفة الفصل الدراسي الحالي')) return;
      const tenant = activeTenant;
      const relevantStudents = students.filter((s) => !s.tenantId || s.tenantId === tenant.id);

      const totalStudents = relevantStudents.length;
      const excellentStudents = relevantStudents.filter((s) => s.status === 'advanced').length;
      const onTrackStudents = relevantStudents.filter((s) => s.status === 'on_track').length;
      const lateStudents = relevantStudents.filter((s) => s.status === 'needs_support' || s.status === 'lagging').length;
      const criticalStudents = relevantStudents.filter((s) => s.status === 'not_moved_yet').length;
      const overallMasteryRate =
        totalStudents > 0 ? Math.round(((excellentStudents + onTrackStudents) / totalStudents) * 100) : 0;

      const studentSnapshots: ArchivedStudentSnapshot[] = relevantStudents.map((s) => {
        const halaqah = halaqahs.find((h) => h.id === s.halaqahId);
        const lessonNum = s.currentSpellingLessonId ? parseInt(s.currentSpellingLessonId.replace(/\D/g, '') || '1') : 1;
        const studentBadgesCount = badges.filter((b) => b.studentId === s.id).length;
        return {
          studentId: s.id,
          studentName: s.fullName,
          grade: s.grade,
          halaqahName: halaqah?.name || 'غير محدد',
          teacherName: halaqah?.teacherName || 'معلم الحلقة',
          finalSurah: s.minimumTargetSurah || 'الغاشية',
          spellingLessonReached: lessonNum,
          spellingScore: s.currentSpellingScore || 90,
          attendanceRate: 95,
          badgesCount: studentBadgesCount,
          status: s.status,
          notes: `سورة: ${s.currentSurah}`,
        };
      });

      const archiveId = `arch_${tenant.id}_${Date.now()}`;
      const newArchive: AcademicTermArchive = {
        id: archiveId,
        tenantId: tenant.id,
        tenantName: tenant.name,
        academicYear: academicConfig.name || '1446-1447هـ',
        termName,
        archivedAt: new Date().toISOString(),
        archivedBy: currentActor.name,
        totalStudents,
        totalHalaqahs: halaqahs.length,
        overallMasteryRate,
        studentSnapshots,
        notes: notes || `أرشفة فترية شاملة وإغلاق دورة الفصل (${termName}) لمجمع ${tenant.name}`,
      };

      // 1. Save archive to cloud
      setArchives((prev) => [newArchive, ...prev]);
      await saveArchiveToDb(newArchive, currentActor);

      // 2. Append history to each student entity and sync
      const updatedStudents = students.map((s) => {
        if (!s.tenantId || s.tenantId === tenant.id) {
          const snap = studentSnapshots.find((item) => item.studentId === s.id);
          if (snap) {
            const historyItem: StudentTermHistory = {
              termId: archiveId,
              academicYear: newArchive.academicYear,
              termName: newArchive.termName,
              stageId: s.stageId || 'baraem',
              grade: s.grade,
              halaqahName: snap.halaqahName,
              teacherName: snap.teacherName,
              finalSurah: snap.finalSurah,
              spellingLessonReached: snap.spellingLessonReached,
              attendanceRate: snap.attendanceRate,
              badgesCount: snap.badgesCount,
              finalStatus: snap.status,
              completionDate: newArchive.archivedAt,
              teacherEvaluationSummary: `أتم بنجاح متطلبات الفصل بمعدل حضور ${snap.attendanceRate}% وبلوغ الدرس ${snap.spellingLessonReached}`,
            };
            const existingHistories = s.termHistories || [];
            const updated: Student = {
              ...s,
              termHistories: [historyItem, ...existingHistories],
            };
            // Sync student cumulative history to Firestore
            dbSaveStudent(updated, currentActor);
            return updated;
          }
        }
        return s;
      });

      setStudents(updatedStudents);
    },
    [activeTenant, students, halaqahs, spellingLessons, badges, academicConfig, currentActor, guardDemoWrite]
  );

  const getStudentTermHistories = useCallback(
    (studentId: string): StudentTermHistory[] => {
      const student = students.find((s) => s.id === studentId);
      return student?.termHistories || [];
    },
    [students]
  );

  // -------------------------------------------------------------
  // Universal Quran Planning Engine Operations (Phase 3A)
  // -------------------------------------------------------------
  const getActiveStudentQuranPlan = useCallback(
    (studentId: string): StudentQuranPlan | null => {
      // Find active plan for the student — 'at_risk' is still an active plan.
      // Among duplicates (legacy rows), prefer the one whose generated
      // plan payload is actually populated.
      const candidates = quranPlans.filter((p) => p.studentId === studentId);
      const isActive = (p: StudentQuranPlan) =>
        p.isCurrentActive || p.status === 'active' || p.status === 'at_risk';
      const hasData = (p: StudentQuranPlan) =>
        (p.generatedPlan?.dailyPlans?.length ?? 0) > 0;
      return (
        candidates.find((p) => isActive(p) && hasData(p)) ||
        candidates.find(isActive) ||
        candidates[0] ||
        null
      );
    },
    [quranPlans]
  );

  const getStudentQuranPlans = useCallback(
    (studentId: string): StudentQuranPlan[] => {
      return quranPlans.filter((p) => p.studentId === studentId);
    },
    [quranPlans]
  );

  const getStudentQuranPlan = useCallback(
    async (studentId: string, planId?: string): Promise<StudentQuranPlan | null> => {
      if (planId) {
        const byId = quranPlans.find((p) => p.id === planId);
        if (byId) return byId;
      }
      const active = getActiveStudentQuranPlan(studentId);
      if (active) return active;

      // Query database if not found in current memory state
      const fromDb = await getQuranPlansForStudentFromDb(studentId);
      if (fromDb.length > 0) {
        if (planId) {
          const matched = fromDb.find((p) => p.id === planId);
          if (matched) return matched;
        }
        return fromDb.find((p) => p.isCurrentActive || p.status === 'active') || fromDb[0];
      }
      return null;
    },
    [quranPlans, getActiveStudentQuranPlan]
  );

  const createStudentQuranPlan = useCallback(
    async (
      params: Omit<CreateRealStudentPlanParams, 'provider' | 'memorizationEngine'>
    ): Promise<StudentQuranPlan> => {
      if (guardDemoWrite('إنشاء خطة قرآنية جديدة')) throw new Error('وضع الديمو تجريبي للعرض فقط.');
      const provider = integrationManager.getActiveProvider();
      const memorizationEngine = new QuranMemorizationPlanningEngine(provider);
      const plan = await createRealStudentPlan({
        ...params,
        allStageConfigs: quranStageConfigs,
        academicConfig,
        provider,
        memorizationEngine,
      });

      await saveQuranPlanToDb(plan, currentActor);

      // Link to student record if student doesn't have activeQuranPlanId yet
      if (params.student.activeQuranPlanId !== plan.id) {
        updateStudent(params.student.id, { activeQuranPlanId: plan.id });
      }

      setQuranPlans((prev) => {
        const idx = prev.findIndex((p) => p.id === plan.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = plan;
          return next;
        }
        return [...prev, plan];
      });

      return plan;
    },
    [currentActor, quranStageConfigs, academicConfig, updateStudent, integrationManager, guardDemoWrite]
  );

  const saveStudentQuranPlan = useCallback(
    async (plan: StudentQuranPlan): Promise<void> => {
      if (guardDemoWrite('حفظ خطة قرآنية')) return;
      await saveQuranPlanToDb(plan, currentActor);
      setQuranPlans((prev) => {
        const idx = prev.findIndex((p) => p.id === plan.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = plan;
          return next;
        }
        return [...prev, plan];
      });
    },
    [currentActor, guardDemoWrite]
  );

  const updateStudentQuranPlan = useCallback(
    async (plan: StudentQuranPlan): Promise<void> => {
      await saveStudentQuranPlan(plan);
    },
    [saveStudentQuranPlan]
  );

  const deleteStudentQuranPlan = useCallback(
    async (planId: string): Promise<void> => {
      if (guardDemoWrite('حذف خطة قرآنية')) return;
      await deleteQuranPlanFromDb(planId, currentActor);
      setQuranPlans((prev) => prev.filter((p) => p.id !== planId));
    },
    [currentActor, guardDemoWrite]
  );

  const saveQuranStageConfig = useCallback(
    async (config: StageQuranConfig): Promise<void> => {
      if (guardDemoWrite('حفظ معايير مرحلة قرآنية')) return;
      await saveQuranStageConfigToDb(config, currentActor);
      setQuranStageConfigs((prev) => {
        const idx = prev.findIndex((c) => c.id === config.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = config;
          return next;
        }
        return [...prev, config];
      });
    },
    [currentActor, guardDemoWrite]
  );

  const deleteQuranStageConfig = useCallback(
    async (configId: string): Promise<void> => {
      if (guardDemoWrite('حذف معايير مرحلة قرآنية')) return;
      await deleteQuranStageConfigFromDb(configId, currentActor);
      setQuranStageConfigs((prev) => prev.filter((c) => c.id !== configId));
    },
    [currentActor, guardDemoWrite]
  );

  const resetQuranStageConfigs = useCallback(
    async (): Promise<void> => {
      if (guardDemoWrite('إعادة تعيين معايير المراحل القرآنية')) return;
      const res = await resetQuranStageConfigsInDb(currentActor);
      setQuranStageConfigs(res);
    },
    [currentActor, guardDemoWrite]
  );

  const runQuranPlanMigration = useCallback(async (): Promise<MigrationReport> => {
    if (guardDemoWrite('ترحيل الخطط القرآنية')) {
      return {
        totalStudentsExamined: 0,
        migratedCount: 0,
        migratedPlans: [],
        existingSkippedCount: 0,
        existingSkippedStudentIds: [],
        failedCount: 0,
        failedStudents: [],
        timestamp: new Date().toISOString(),
        success: false,
      };
    }
    const provider = integrationManager.getActiveProvider();
    const memorizationEngine = new QuranMemorizationPlanningEngine(provider);
    const report = await migrateRealStudentsToQuranPlans({
      students,
      stageConfigs: quranStageConfigs,
      academicConfig,
      existingPlans: quranPlans,
      provider,
      memorizationEngine,
    });

    for (const plan of report.migratedPlans) {
      await saveQuranPlanToDb(plan, currentActor);
      // Link to student
      updateStudent(plan.studentId, { activeQuranPlanId: plan.id });
    }

    if (report.migratedPlans.length > 0) {
      setQuranPlans((prev) => [...prev, ...report.migratedPlans]);
    }

    return report;
  }, [students, quranStageConfigs, academicConfig, quranPlans, currentActor, updateStudent, integrationManager]);

  const recordQuranPlanAchievement = useCallback(
    async (params: {
      planId: string;
      dayDate: string;
      status: 'completed' | 'partial' | 'overachieved' | 'absent' | 'excused' | 'unrecited';
      actualEndPosition?: QuranPosition;
      evaluation?: 'excellent' | 'very_good' | 'good' | 'needs_practice';
      notes?: string;
    }): Promise<StudentQuranPlan> => {
      // 1. Locate plan — always recalculate on top of the latest persisted copy
      // from PostgreSQL so a stale in-memory state can never overwrite a newer
      // plan (last recorded achievement = source of truth).
      let targetPlan = await getQuranPlanByIdFromDb(params.planId).catch(() => null);
      if (!targetPlan) {
        targetPlan = quranPlans.find((p) => p.id === params.planId) || null;
      }
      if (!targetPlan) {
        throw new Error(`الخطة القرآنية غير موجودة.`);
      }

      // 2. Run recalculation service with Universal Provider
      const provider = integrationManager.getActiveProvider();
      const recalculationService = new PlanRecalculationService(provider);
      const updatedPlan = await recalculationService.recordDailyAchievement({
        plan: targetPlan,
        dayDate: params.dayDate,
        status: params.status,
        actualEndPosition: params.actualEndPosition,
        recordedBy: currentActor?.name || 'المعلم المعتمد',
        evaluation: params.evaluation,
        notes: params.notes,
      });

      // 3. Persist to Firestore and local state
      await saveStudentQuranPlan(updatedPlan);

      // 4. Update the student record's currentSurah and currentAyah safely
      const targetStudent = students.find((s) => s.id === updatedPlan.studentId);
      if (targetStudent && updatedPlan.currentPosition?.surahNumber) {
        const surahMeta = await provider.getSurah(updatedPlan.currentPosition.surahNumber);
        if (surahMeta) {
          updateStudent(targetStudent.id, {
            currentSurah: surahMeta.name,
            currentAyah: updatedPlan.currentPosition.ayahNumber || 1,
            activeQuranPlanId: updatedPlan.id,
          });
        }
      }

      // 5. Keep sessionRecords synchronized for daily reports and attendance tracking
      const targetDayItem = updatedPlan.generatedPlan?.dailyPlans?.find((d) => d.date === params.dayDate);
      if (targetDayItem && targetStudent && targetDayItem.targetUnit?.start?.surahNumber) {
        const surahFromMeta = await provider.getSurah(targetDayItem.targetUnit.start.surahNumber);
        const toSurahNum =
          params.actualEndPosition?.surahNumber ||
          targetDayItem.targetUnit.end?.surahNumber ||
          targetDayItem.targetUnit.start.surahNumber;
        const surahToMeta = toSurahNum ? await provider.getSurah(toSurahNum) : null;

        const isAbsent = params.status === 'absent';
        const isExcused = params.status === 'excused';

        recordDailySession({
          studentId: targetStudent.id,
          teacherId: currentActor?.id || targetStudent.teacherId || '',
          halaqahId: targetStudent.halaqahId,
          date: params.dayDate,
          weekNumber: targetDayItem.weekNumber || 1,
          attendance: isAbsent ? 'absent' : isExcused ? 'excused' : 'present',
          teacherRemarks: params.notes || targetDayItem.targetUnit.displayLabel,
          memorization: {
            surahFrom: surahFromMeta?.name || '',
            ayahFrom: targetDayItem.targetUnit.start.ayahNumber,
            surahTo: surahToMeta?.name || '',
            ayahTo: params.actualEndPosition
              ? params.actualEndPosition.ayahNumber
              : targetDayItem.targetUnit.end.ayahNumber,
            score:
              params.evaluation === 'excellent'
                ? 98
                : params.evaluation === 'very_good'
                ? 88
                : params.evaluation === 'good'
                ? 78
                : 65,
            notes: params.notes,
          },
          revision: {
            surahFrom: 'الناس',
            surahTo: surahFromMeta?.name || '',
            type: 'قريبة',
            score: 95,
          },
        });
      }

      return updatedPlan;
    },
    [quranPlans, currentActor, saveStudentQuranPlan, students, updateStudent, recordDailySession, integrationManager]
  );

  // -------------------------------------------------------------
  // Quran Integration Configuration Methods (Strict Role & Audit Protected)
  // -------------------------------------------------------------
  const updateIntegrationProviderConfig = useCallback(
    async (providerId: string, updates: Partial<QuranProviderConfig>, reason?: string): Promise<void> => {
      const prev = integrationConfig.providers[providerId];
      const nextConfig: IntegrationConfig = {
        ...integrationConfig,
        providers: {
          ...integrationConfig.providers,
          [providerId]: {
            ...integrationConfig.providers[providerId],
            ...updates,
          },
        },
        updatedAt: new Date().toISOString(),
      };
      setIntegrationConfig(nextConfig);
      safeStorage.setItem(STORAGE_KEYS.INTEGRATION_CONFIG, JSON.stringify(nextConfig));

      // Strictly record system audit log
      await recordAuditLog({
        userId: currentUser?.id || 'sys_admin',
        userName: currentUser?.name || 'مدير النظام',
        userRole: currentRole,
        action: 'integration_config',
        entityType: 'integration',
        entityId: providerId,
        entityName: `إعدادات مزود القرآن (${providerId})`,
        previousValue: prev,
        newValue: nextConfig.providers[providerId],
        notes: reason || 'تعديل سياسات وإعدادات الاتصال بمزود القرآن',
      });
    },
    [integrationConfig, currentUser, currentRole, recordAuditLog]
  );

  const setPrimaryQuranProvider = useCallback(
    async (providerId: string, reason?: string): Promise<void> => {
      const prev = integrationConfig.primaryProviderId;
      const nextConfig: IntegrationConfig = {
        ...integrationConfig,
        primaryProviderId: providerId,
        updatedAt: new Date().toISOString(),
      };
      setIntegrationConfig(nextConfig);
      safeStorage.setItem(STORAGE_KEYS.INTEGRATION_CONFIG, JSON.stringify(nextConfig));

      // Strictly record system audit log
      await recordAuditLog({
        userId: currentUser?.id || 'sys_admin',
        userName: currentUser?.name || 'مدير النظام',
        userRole: currentRole,
        action: 'integration_config',
        entityType: 'integration',
        entityId: 'primary_provider',
        entityName: 'المزود القرآني الأساسي للمنظومة',
        previousValue: { primaryProviderId: prev },
        newValue: { primaryProviderId: providerId },
        notes: reason || `تحويل المزود القرآني الأساسي إلى ${providerId} مع الحفاظ على سلامة الخطط التاريخية`,
      });
    },
    [integrationConfig, currentUser, currentRole, recordAuditLog]
  );

  const setActiveMushafProfile = useCallback(
    async (mushafId: string, reason?: string): Promise<void> => {
      const prev = integrationConfig.activeMushafProfileId || 'madani_15_lines';
      const nextConfig: IntegrationConfig = {
        ...integrationConfig,
        activeMushafProfileId: mushafId,
        updatedAt: new Date().toISOString(),
      };
      setIntegrationConfig(nextConfig);
      safeStorage.setItem(STORAGE_KEYS.INTEGRATION_CONFIG, JSON.stringify(nextConfig));

      // Strictly record system audit log
      await recordAuditLog({
        userId: currentUser?.id || 'sys_admin',
        userName: currentUser?.name || 'مدير النظام',
        userRole: currentRole,
        action: 'integration_config',
        entityType: 'integration',
        entityId: 'mushaf_profile',
        entityName: 'ملف المصحف النشط',
        previousValue: { activeMushafProfileId: prev },
        newValue: { activeMushafProfileId: mushafId },
        notes: reason || `تغيير قالب المصحف المعتمد إلى (${mushafId}) – السجلات السابقة محفوظة ومحمية تماماً`,
      });
    },
    [integrationConfig, currentUser, currentRole, recordAuditLog]
  );

  const testQuranProviderConnection = useCallback(
    async (providerId: string): Promise<ConnectionTestResult> => {
      const result = await integrationManager.testConnection(providerId);
      setIntegrationConfig((prev) => {
        const prov = prev.providers[providerId];
        if (!prov) return prev;
        const updatedProv: QuranProviderConfig = {
          ...prov,
          connectionStatus: result.success ? 'connected' : 'failed',
          lastTestedAt: result.timestamp,
          lastError: result.success ? undefined : result.message,
        };
        const next = {
          ...prev,
          providers: {
            ...prev.providers,
            [providerId]: updatedProv,
          },
          updatedAt: new Date().toISOString(),
        };
        safeStorage.setItem(STORAGE_KEYS.INTEGRATION_CONFIG, JSON.stringify(next));
        return next;
      });
      return result;
    },
    [integrationManager]
  );

  // -------------------------------------------------------------
  // SaaS Phase 4: Admissions Methods
  // -------------------------------------------------------------
  const submitRegistrationRequest = useCallback(
    async (req: Omit<RegistrationRequest, 'id' | 'createdAt' | 'status'>): Promise<void> => {
      const newReq: RegistrationRequest = {
        ...req,
        id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        tenantId: req.tenantId || activeTenantId,
      };
      setAdmissionsRequests((prev) => [newReq, ...prev]);
      await dbSaveAdmissionsRequest(newReq, currentActor);
    },
    [activeTenantId, currentActor]
  );

  const updateRegistrationStatus = useCallback(
    async (id: string, status: AdmissionStatus, notes?: string): Promise<void> => {
      setAdmissionsRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, interviewNotes: notes || r.interviewNotes } : r))
      );
      await dbUpdateAdmissionsStatus(id, status, notes ? { interviewNotes: notes } : undefined, currentActor);
    },
    [currentActor]
  );

  const enrollApplicantAsStudent = useCallback(
    async (requestId: string, halaqahId: string, teacherId: string): Promise<void> => {
      const req = admissionsRequests.find((r) => r.id === requestId);
      if (!req) return;
      const targetHalaqah = halaqahs.find((h) => h.id === halaqahId);
      const targetTeacher =
        teachers.find((t) => t.id === teacherId || t.id === targetHalaqah?.teacherId) ||
        users.find((u) => u.id === teacherId || u.id === targetHalaqah?.teacherId);
      const effectiveTeacherId = teacherId || targetHalaqah?.teacherId || '';
      const effectiveTeacherName =
        targetTeacher?.name ||
        (targetTeacher as any)?.fullName ||
        targetHalaqah?.teacherName ||
        'المعلم المعتمد';

      const newStudent: Omit<Student, 'id' | 'createdAt'> = {
        name: req.studentName,
        fullName: req.studentName,
        nationalId: req.nationalId,
        grade: req.grade || 'صف أول',
        halaqahId,
        halaqahName: targetHalaqah?.name || 'الحلقة القرآنية',
        teacherId: effectiveTeacherId,
        teacherName: effectiveTeacherName,
        parentName: req.parentName,
        parentPhone: req.parentPhone,
        motherPhone: req.motherPhone,
        otherContactPhone: req.otherContactPhone,
        guardianRelationship: req.guardianRelationship,
        minimumTargetSurah: 'الغاشية',
        status: 'on_track',
        currentSpellingLessonId: '1',
        currentSpellingScore: 100,
        currentSurah: 'الناس',
        currentAyah: 1,
        notes: req.notes,
        tenantId: req.tenantId || activeTenantId,
        isActive: true,
        registrationType: req.registrationType,
        registrationTypeLabel: req.registrationTypeLabel,
        previouslyRegistered: req.previouslyRegistered,
      };

      addStudent(newStudent);
      await updateRegistrationStatus(requestId, 'enrolled', `تم تسكين الطالب في ${targetHalaqah?.name || ''}`);
    },
    [admissionsRequests, halaqahs, teachers, activeTenantId, addStudent, updateRegistrationStatus]
  );

  // -------------------------------------------------------------
  // SaaS Phase 5: Financial Management Methods
  // -------------------------------------------------------------
  const saveFinancialRecord = useCallback(
    async (record: StudentFinancialRecord): Promise<void> => {
      const recWithTenant: StudentFinancialRecord = {
        ...record,
        tenantId: record.tenantId || activeTenantId,
      };
      setFinancialRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === recWithTenant.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = recWithTenant;
          return next;
        }
        return [...prev, recWithTenant];
      });
      await dbSaveFinancialRecord(recWithTenant, currentActor);
    },
    [activeTenantId, currentActor]
  );

   const recordPayment = useCallback(
    async (recordId: string, payment: PaymentTransaction): Promise<void> => {
      setFinancialRecords((prev) =>
        prev.map((rec) => {
          if (rec.id !== recordId) return rec;
          const base = Number(rec.baseTuition) || 0;
          const discount = Number(rec.discountAmount) || 0;
          const scholarship = Number(rec.scholarshipAmount) || 0;
          const paid = Number(rec.paidAmount) || 0;
          const paymentAmount = Number(payment.amount) || 0;
          const newPayments = [...(rec.payments || []), payment];
          const newPaidAmount = paid + paymentAmount;
          const netDue = Math.max(0, base - discount - scholarship);
          const newRemaining = Math.max(0, netDue - newPaidAmount);
          const newStatus: PaymentStatus = rec.isExempt || netDue === 0
            ? 'exempted'
            : newRemaining === 0
            ? 'fully_paid'
            : newPaidAmount > 0
            ? 'partially_paid'
            : 'unpaid';
          return {
            ...rec,
            baseTuition: base,
            discountAmount: discount,
            scholarshipAmount: scholarship,
            payments: newPayments,
            paidAmount: newPaidAmount,
            remainingAmount: newRemaining,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        })
      );
      await dbRecordFinancialPayment(recordId, payment, currentActor);
    },
    [currentActor]
  );

  const saveRevenue = useCallback(async (item: RevenueItem): Promise<void> => {
    setRevenues((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
    await dbSaveRevenueItem(item);
  }, []);

  const deleteRevenue = useCallback(async (id: string): Promise<void> => {
    setRevenues((prev) => prev.filter((i) => i.id !== id));
    await dbDeleteRevenueItem(id);
  }, []);

  const saveExpense = useCallback(async (item: ExpenseItem): Promise<void> => {
    setExpenses((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
    await dbSaveExpenseItem(item);
  }, []);

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    setExpenses((prev) => prev.filter((i) => i.id !== id));
    await dbDeleteExpenseItem(id);
  }, []);

  const saveCustody = useCallback(async (custody: Custody): Promise<void> => {
    setCustodies((prev) => {
      const idx = prev.findIndex((i) => i.id === custody.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = custody;
        return next;
      }
      return [custody, ...prev];
    });
    await dbSaveCustody(custody);
  }, []);

  const deleteCustody = useCallback(async (id: string): Promise<void> => {
    setCustodies((prev) => prev.filter((i) => i.id !== id));
    await dbDeleteCustody(id);
  }, []);

  const saveCustodyExpense = useCallback(async (item: CustodyExpenseItem): Promise<void> => {
    await dbSaveCustodyExpenseItem(item);
  }, []);

  const deleteCustodyExpense = useCallback(async (custodyId: string, itemId: string): Promise<void> => {
    await dbDeleteCustodyExpenseItem(custodyId, itemId);
  }, []);

  const saveBudgetRequest = useCallback(async (req: BudgetRequest): Promise<void> => {
    setBudgetRequests((prev) => {
      const idx = prev.findIndex((i) => i.id === req.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = req;
        return next;
      }
      return [req, ...prev];
    });
    await dbSaveBudgetRequest(req);
  }, []);

  const deleteBudgetRequest = useCallback(async (id: string): Promise<void> => {
    setBudgetRequests((prev) => prev.filter((i) => i.id !== id));
    await dbDeleteBudgetRequest(id);
  }, []);

  const saveFinanceSettings = useCallback(async (settings: FinanceSettingsData): Promise<void> => {
    setFinanceSettings(settings);
    await dbSaveFinanceSettings(settings);
  }, []);

  // -------------------------------------------------------------
  // SaaS Phase 6: Association Testing Methods
  // -------------------------------------------------------------
  const nominateStudentForAssociation = useCallback(
    async (nom: Omit<AssociationNomination, 'id' | 'createdAt' | 'supervisorStatus'>): Promise<void> => {
      const newNom: AssociationNomination = {
        ...nom,
        id: `nom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        supervisorStatus: 'pending',
        tenantId: nom.tenantId || activeTenantId,
        updatedAt: new Date().toISOString(),
      };
      setAssociationNominations((prev) => [newNom, ...prev]);
      await dbSaveAssociationNomination(newNom, currentActor);
    },
    [activeTenantId, currentActor]
  );

  const updateNominationStatus = useCallback(
    async (id: string, status: NominationStatus, supervisorNotes?: string): Promise<void> => {
      setAssociationNominations((prev) =>
        prev.map((n) => (n.id === id ? { ...n, supervisorStatus: status, supervisorNotes } : n))
      );
      await dbUpdateNominationStatus(id, status, supervisorNotes ? { supervisorNotes } : undefined, currentActor);
    },
    [currentActor]
  );

  // -------------------------------------------------------------
  // P8: Dynamic Multi-Track Platform Methods
  // -------------------------------------------------------------
  const saveTrack = useCallback(
    async (track: TrackDefinition): Promise<void> => {
      // 1. Optimistic state update
      setTracks((prev) => {
        const exists = prev.some((t) => t.id === track.id);
        if (exists) return prev.map((t) => (t.id === track.id ? track : t));
        return [...prev, track];
      });

      // 2. Save ONLY the edited/new track to Firestore
      await dbSaveTrackDefinition(track, currentActor);
    },
    [currentActor]
  );

  const deleteTrack = useCallback(
    async (trackId: string): Promise<void> => {
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      await dbDeleteTrackDefinition(trackId, currentActor);
    },
    [currentActor]
  );

  const deleteAllTracks = useCallback(async (): Promise<void> => {
    setTracks([]);
    await dbDeleteAllTrackDefinitions(activeTenantId, currentActor);
  }, [activeTenantId, currentActor]);

  const seedDefaultTracksToDb = useCallback(async (): Promise<void> => {
    setTracks(BUILT_IN_TRACKS);
    for (const t of BUILT_IN_TRACKS) {
      await dbSaveTrackDefinition(t, currentActor);
    }
  }, [currentActor]);

  const saveTrackNomination = useCallback(
    async (nom: Omit<TrackNomination, 'id' | 'createdAt' | 'status'>): Promise<void> => {
      const newNom: TrackNomination = {
        ...nom,
        id: `trknom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: 'submitted',
        tenantId: nom.tenantId || activeTenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTrackNominations((prev) => [newNom, ...prev]);
      await dbSaveTrackNomination(newNom, currentActor);
    },
    [activeTenantId, currentActor]
  );

  const updateTrackNominationStatus = useCallback(
    async (id: string, status: TrackNominationStatus, extras?: Partial<TrackNomination>): Promise<void> => {
      setTrackNominations((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status, ...extras, updatedAt: new Date().toISOString() } : n))
      );
      await dbUpdateTrackNominationStatus(id, status, extras, currentActor);
    },
    [currentActor]
  );

  // -------------------------------------------------------------
  // SaaS Phase 7: Emergency Support Session Methods
  // -------------------------------------------------------------
  const startSupportSession = useCallback(
    async (targetTenantId: string, reason: string, durationHours: number = 1): Promise<void> => {
      const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
      const session: EmergencySupportSession = {
        id: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId: targetTenantId,
        systemAdminUid: currentUser?.id || 'sys_admin',
        systemAdminName: currentUser?.name || 'مدير النظام (School Screen)',
        reason,
        expiresAt,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      setActiveSupportSession(session);
      setActiveTenantId(targetTenantId);
      await dbStartSupportSession(session, currentActor);
    },
    [currentUser, currentActor, setActiveTenantId]
  );

  const endSupportSession = useCallback(async (): Promise<void> => {
    if (!activeSupportSession) return;
    setActiveSupportSession(null);
    await dbEndSupportSession(activeSupportSession.id, currentActor);
  }, [activeSupportSession, currentActor]);

  // -------------------------------------------------------------
  // P10: Meetings & Minutes Operations
  // -------------------------------------------------------------
  const addMeeting = useCallback(
    async (meetingInput: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      const now = new Date().toISOString();
      const newMeeting: Meeting = {
        ...meetingInput,
        id: `meet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };

      setMeetings((prev) => {
        const next = [newMeeting, ...prev];
        writeTenantStorage(activeTenantId, 'meetings', 'al_ghazzawi_meetings_v2', next);
        return next;
      });

      await dbSaveMeetingToDb(newMeeting, currentActor);
      return newMeeting.id;
    },
    [activeTenantId, currentActor]
  );

  const updateMeeting = useCallback(
    async (id: string, updates: Partial<Meeting>, actionLabel?: string): Promise<void> => {
      const now = new Date().toISOString();
      setMeetings((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: now } : m));
        writeTenantStorage(activeTenantId, 'meetings', 'al_ghazzawi_meetings_v2', next);
        return next;
      });

      await dbUpdateMeetingInDb(id, updates, currentActor, actionLabel);
    },
    [activeTenantId, currentActor]
  );

  const updateMeetingAttendance = useCallback(
    async (meetingId: string, attendees: MeetingAttendee[]): Promise<void> => {
      await updateMeeting(
        meetingId,
        { attendees, status: 'in_progress' },
        'تحديث حضور الاجتماع'
      );
    },
    [updateMeeting]
  );

  const completeMeetingMinutes = useCallback(
    async (
      meetingId: string,
      minutesData: {
        discussions?: string;
        decisions: MeetingDecision[];
        recommendations: string[];
        postponedItems: string[];
        notes?: string;
        attendees: MeetingAttendee[];
      }
    ): Promise<void> => {
      await updateMeeting(
        meetingId,
        {
          ...minutesData,
          status: 'completed',
        },
        'توثيق واعتماد محضر الاجتماع'
      );
    },
    [updateMeeting]
  );

  const cancelMeeting = useCallback(
    async (meetingId: string, reason?: string): Promise<void> => {
      await updateMeeting(
        meetingId,
        {
          status: 'cancelled',
          cancellationReason: reason,
        },
        'إلغاء الاجتماع'
      );
    },
    [updateMeeting]
  );

  // -------------------------------------------------------------
  // Export / Import (Preserved for Backup Layer)
  // -------------------------------------------------------------
  const exportDatabaseJson = useCallback((): string => {
    const data = {
      users,
      teachers,
      halaqahs,
      students,
      spellingLessons,
      sessionRecords,
      educationalPlan,
      academicConfig,
      reportLogs,
      auditLogs,
      badges,
      remedialPlans,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [users, teachers, halaqahs, students, spellingLessons, sessionRecords, educationalPlan, academicConfig, reportLogs, auditLogs, badges, remedialPlans]);

  const importDatabaseJson = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.students && parsed.spellingLessons && parsed.academicConfig) {
        if (parsed.users) setUsers(parsed.users);
        if (parsed.teachers) setTeachers(parsed.teachers);
        if (parsed.halaqahs) setHalaqahs(parsed.halaqahs);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.spellingLessons) setSpellingLessons(parsed.spellingLessons);
        if (parsed.sessionRecords) setSessionRecords(parsed.sessionRecords);
        if (parsed.educationalPlan) setEducationalPlan(parsed.educationalPlan);
        if (parsed.academicConfig) setAcademicConfig(parsed.academicConfig);
        if (parsed.reportLogs) setReportLogs(parsed.reportLogs);
        if (parsed.badges) setBadges(parsed.badges);
        if (parsed.remedialPlans) setRemedialPlans(parsed.remedialPlans);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const resetToDefaultData = useCallback(() => {
    setUsers(INITIAL_USERS);
    setTeachers(INITIAL_TEACHERS);
    setHalaqahs(INITIAL_HALAQAHS);
    setStudents(INITIAL_STUDENTS);
    setSpellingLessons(INITIAL_SPELLING_LESSONS);
    setSessionRecords(INITIAL_SESSION_RECORDS);
    setEducationalPlan(INITIAL_EDUCATIONAL_PLAN);
    setAcademicConfig(INITIAL_ACADEMIC_YEAR);
    setReportLogs(INITIAL_REPORT_LOGS);
    setBadges(INITIAL_BADGES);
    setRemedialPlans(INITIAL_REMEDIAL_PLANS);
    safeStorage.clear();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole,
        academicConfig,
        timelineProgress,
        users,
        teachers,
        halaqahs,
        students,
        spellingLessons,
        sessionRecords,
        educationalPlan,
        publicSummary,
        reportLogs,
        auditLogs,
        alerts,
        showPasswordChangeModal,
        setShowPasswordChangeModal,
        isOffline,
        isCloudSyncing,
        login,
        logout,
        resetOperationalMemory,
        changePassword,
        isDemoMode,
        demoBlockedNotice,
        clearDemoBlockedNotice,
        enterDemoSession,
        exitDemoSession,
        addSpellingLesson,
        updateSpellingLesson,
        deleteSpellingLesson,
        reorderSpellingLessons,
        addSubLesson,
        updateSubLesson,
        deleteSubLesson,
        addStudent,
        updateStudent,
        deleteStudent,
        transferStudent,
        addTeacher,
        updateTeacher,
        updateUser,
        deleteTeacher,
        archivedTeachers,
        archiveTeacher,
        restoreTeacher,
        permanentlyDeleteTeacher,
        addSupervisor,
        updateSupervisor,
        deleteSupervisor,
        archivedSupervisors,
        archiveSupervisor,
        restoreSupervisor,
        permanentlyDeleteSupervisor,
        staffAttendanceRecords,
        recordGeoAttendance,
        deleteStaffAttendance,
        updateAttendanceConfig,
        updatePrayerConfig,
        prayerTimesToday,
        updateAdmissionsConfig,
        updateReportsConfig,
        updateWhatsAppConfig,
        addHalaqah,
        updateHalaqah,
        bulkUpdateHalaqahs,
        deleteHalaqah,
        archivedHalaqahs,
        archiveHalaqah,
        restoreHalaqah,
        permanentlyDeleteArchivedHalaqah,
        recordDailySession,
        bulkMarkAttendance,
        updateAcademicConfig,
        addEducationalWeek,
        bulkAddEducationalWeeks,
        replaceStageEducationalPlan,
        updateEducationalWeek,
        deleteEducationalWeek,
        bulkDeleteEducationalWeeks,
        clearStageEducationalPlan,
        seasonalPrograms,
        seasonalActivities,
        seasonalParticipations,
        addSeasonalProgram,
        updateSeasonalProgram,
        deleteSeasonalProgram,
        addSeasonalActivity,
        updateSeasonalActivity,
        deleteSeasonalActivity,
        saveSeasonalParticipation,
        deleteSeasonalParticipation,
        addReportLog,
        badges,
        awardBadge,
        deleteBadge,
        remedialPlans,
        saveRemedialPlan,
        resolveRemedialPlan,
        tenants,
        activeTenantId,
        activeTenant,
        academicOutcome,
        resolvedIdentity,
        setActiveTenantId,
        updateAcademicOutcome,
        addTenant,
        updateTenant,
        updateCampusAdminPassword,
        deleteTenant,
        organizations,
        saveOrganization,
        deleteOrganization,
        userCanEditTenant,
        getSupervisedTenants,
        stages,
        addStage,
        updateStage,
        deleteStage,
        updateStageLogo,
        archives,
        archiveCurrentTerm,
        getStudentTermHistories,
        // SaaS Modules: Admissions, Finances, Association Testing, Support Sessions
        admissionsRequests,
        submitRegistrationRequest,
        updateRegistrationStatus,
        enrollApplicantAsStudent,
        financialRecords,
        saveFinancialRecord,
        recordPayment,
        associationNominations,
        nominateStudentForAssociation,
        updateNominationStatus,
        // P8: Multi-Track Platform
        tracks,
        trackNominations,
        saveTrack,
        deleteTrack,
        deleteAllTracks,
        seedDefaultTracksToDb,
        saveTrackNomination,
        updateTrackNominationStatus,
        activeSupportSession,
        startSupportSession,
        endSupportSession,
        studentPointRules,
        studentPointTransactions,
        savePointRule,
        awardStudentPoints,
        quranPlans,
        quranStageConfigs,
        getStudentQuranPlan,
        getActiveStudentQuranPlan,
        getStudentQuranPlans,
        createStudentQuranPlan,
        updateStudentQuranPlan,
        saveStudentQuranPlan,
        deleteStudentQuranPlan,
        runQuranPlanMigration,
        saveQuranStageConfig,
        deleteQuranStageConfig,
        resetQuranStageConfigs,
        recordQuranPlanAchievement,
        integrationConfig,
        availableMushafProfiles: ALL_MUSHAF_PROFILES,
        updateIntegrationProviderConfig,
        setPrimaryQuranProvider,
        setActiveMushafProfile,
        testQuranProviderConnection,
        mosqueLogoUrl,
        stageLogoUrl,
        setMosqueLogoUrl,
        setStageLogoUrl,
        resetLogos,
        exportDatabaseJson,
        importDatabaseJson,
        resetToDefaultData,
        revenues,
        saveRevenue,
        deleteRevenue,
        expenses,
        saveExpense,
        deleteExpense,
        custodies,
        saveCustody,
        deleteCustody,
        saveCustodyExpense,
        deleteCustodyExpense,
        budgetRequests,
        saveBudgetRequest,
        deleteBudgetRequest,
        financeSettings,
        saveFinanceSettings,
        // P10: Meetings & Minutes
        meetings,
        addMeeting,
        updateMeeting,
        updateMeetingAttendance,
        completeMeetingMinutes,
        cancelMeeting,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
