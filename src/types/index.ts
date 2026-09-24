export type UserRole = 'system_admin' | 'campus_admin' | 'admin' | 'supervisor' | 'teacher' | 'parent' | 'student' | 'public' | 'charity_supervisor';

export type StudentStatus = 'advanced' | 'on_track' | 'needs_support' | 'lagging' | 'not_moved_yet';

export type StudentGrade =
  | 'التمهيدي'
  | 'الأول ابتدائي'
  | 'الثاني ابتدائي'
  | 'الثالث ابتدائي'
  | 'الرابع ابتدائي'
  | 'الخامس ابتدائي'
  | 'السادس ابتدائي'
  | 'الأول متوسط'
  | 'الثاني متوسط'
  | 'الثالث متوسط'
  | 'الأول ثانوي'
  | 'الثاني ثانوي'
  | 'الثالث ثانوي'
  | 'تمهيدي'
  | 'صف أول'
  | 'صف ثاني'
  | 'صف ثالث'
  | 'صف رابع'
  | 'صف خامس'
  | 'صف سادس'
  | 'متوسط'
  | 'ثانوي'
  | string;

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

export type EducationalExecutionStatus = 'completed' | 'in_progress' | 'planned' | 'delayed';

export interface User {
  id: string;
  name: string;
  fullName?: string; // Compatibility alias
  phone: string;
  email?: string;
  nationalId?: string; // National ID (login identifier for students)
  loginIdentifier?: string; // Unified login identifier (nationalId for students, phone for adults)
  password?: string;
  plainPassword?: string;
  passwordHash?: string;
  role: UserRole;
  halaqahId?: string;
  stageId?: string;
  studentId?: string;
  teacherId?: string;
  studentIds?: string[]; // Dynamic multiple children link for parents
  tenantId?: string;
  organizationId?: string;
  supervisionMode?: 'read_only' | 'full_access';
  staffRole?: 'teacher' | 'supervisor';
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  mustChangePassword?: boolean;
  supervisorScope?: SupervisorScope;
  customPermissions?: string[];
  temporaryCustomPermissions?: { id: string; expiresAt: string }[];
  permissionMode?: 'role_defaults' | 'custom_only';
  assignedStageIds?: string[];
  assignedHalaqahIds?: string[];
  isAllHalaqahs?: boolean;
  delegations?: Record<string, {
    accessLevel: 'view' | 'edit';
    scopeType: 'tenant' | 'stage' | 'halaqah';
    scopeIds: string[];
  }>;
  isArchived?: boolean;
  teacherArchived?: boolean;
  supervisorArchived?: boolean;
  archiveType?: 'teacher' | 'supervisor';
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  halaqahId: string;
  halaqahName: string;
  tenantId?: string;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  studentsCount: number;
  staffRole?: 'teacher' | 'supervisor';
  supervisorScope?: SupervisorScope;
  customPermissions?: string[];
  temporaryCustomPermissions?: { id: string; expiresAt: string }[];
  assignedStageIds?: string[];
  assignedHalaqahIds?: string[];
  isAllHalaqahs?: boolean;
  isArchived?: boolean;
  teacherArchived?: boolean;
  supervisorArchived?: boolean;
  archiveType?: 'teacher' | 'supervisor';
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  delegations?: Record<string, {
    accessLevel: 'view' | 'edit';
    scopeType: 'tenant' | 'stage' | 'halaqah';
    scopeIds: string[];
  }>;
}

export interface ArchivedStaff {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  staffRole?: 'teacher' | 'supervisor';
  tenantId?: string;
  halaqahId?: string;
  halaqahName?: string;
  archivedAt: string;
  archivedBy: string;
  archiveReason?: string;
  supervisorScope?: SupervisorScope;
  customPermissions?: string[];
  temporaryCustomPermissions?: { id: string; expiresAt: string }[];
  assignedStageIds?: string[];
  assignedHalaqahIds?: string[];
  isAllHalaqahs?: boolean;
}

export type ScheduleTimeType = 'fixed' | 'prayer';
export type PrayerReference = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerAdjustmentMinutes = Partial<Record<PrayerReference, number>>;

export interface PrayerTimeOffset {
  prayer: PrayerReference;
  offsetMinutes: number; // positive: after prayer, negative: before prayer
}

export interface HalaqahDaySchedule {
  dayOfWeek: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  dayName: string;   // 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
  isActive: boolean;
  timeType?: ScheduleTimeType; // 'fixed' | 'prayer' (default: 'fixed')
  startTime?: string; // e.g. "16:00"
  endTime?: string;   // e.g. "18:00"
  startPrayerOffset?: PrayerTimeOffset; // e.g. { prayer: 'maghrib', offsetMinutes: 10 }
  endPrayerOffset?: PrayerTimeOffset;   // e.g. { prayer: 'isha', offsetMinutes: -15 }
  isCustomTime?: boolean; // true if custom override for this specific day
}

export interface Halaqah {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  teacherPhone?: string;
  assistantTeachers?: HalaqahAssistantTeacher[];
  onlineConfig?: HalaqahOnlineConfig;
  location: string;
  daysPerWeek: number;
  weeklySchedule?: HalaqahDaySchedule[];
  defaultTimeType?: ScheduleTimeType;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultStartPrayerOffset?: PrayerTimeOffset;
  defaultEndPrayerOffset?: PrayerTimeOffset;
  tenantId?: string;
  stageId?: string;
  grade?: string;
  targetSurah?: string;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  activeTrackIds?: string[]; // e.g. ['track_quran', 'track_spelling', 'track_virtues']
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
}

export interface ArchivedHalaqah extends Halaqah {
  archivedAt: string;
  archivedBy: string;
  archiveReason?: string;
}

export interface QuranRevisionDayPlan {
  day: 'الأحد' | 'الاثنين' | 'الثلاثاء' | 'الأربعاء';
  surahFrom: string;
  ayahFrom?: number;
  surahTo: string;
  ayahTo?: number;
  description: string;
  status?: 'pending' | 'completed' | 'needs_reinforcement';
}

export interface IndividualQuranPlan {
  currentCompletedSurah: string;
  lastMemorizedPosition: {
    surah: string;
    ayah: number;
  };
  dailyMemorizationAmount: string; // e.g. "سطر واحد يومياً"
  nextMemorizationStart: {
    surah: string;
    ayah: number;
    description: string;
  };
  revisionDays: QuranRevisionDayPlan[];
  isCurrentWeekRevisionOnly: boolean;
  targetSurahLimit: string;
  notes?: string;
  customTeacherAdjustments?: boolean;
  /**
   * Per-student academic days (subset of the halaqah working days).
   * Undefined/empty = student follows the halaqah schedule (backward compatible).
   * Stored inside the students.quran_plan JSONB — no schema change.
   */
  preferredWorkingDays?: number[];
}

export interface SubLesson {
  id: string;
  code?: string; // e.g. "10/1", "10/2"
  title: string;
  description?: string;
  maxScore: number;
}

export interface SpellingLesson {
  id: string;
  lessonNumber: number;
  title: string;
  skill?: string;
  description?: string;
  expectedWeek?: number;
  targetGrade?: string;
  passingThreshold?: number;
  coreSkills?: string[];
  subLessons: SubLesson[];
  passingScore?: number; // e.g. 85
  order: number;
  isActive?: boolean;
}

export interface StudentTermHistory {
  termId: string;
  academicYear: string; // e.g. '1446-1447هـ'
  termName: string; // e.g. 'الفصل الدراسي الأول'
  stageId?: string;
  grade: StudentGrade;
  halaqahName: string;
  teacherName: string;
  finalSurah: string;
  spellingLessonReached: number;
  attendanceRate: number;
  badgesCount: number;
  finalStatus: StudentStatus;
  completionDate: string;
  teacherEvaluationSummary?: string;
}

export interface Student {
  id: string;
  fullName: string;
  name?: string; // Compatibility alias
  nationalId?: string; // National ID - Login Identifier for students
  grade: StudentGrade;
  halaqahId: string;
  halaqahName?: string; // Compatibility alias
  teacherId: string;
  teacherName?: string; // Compatibility alias
  teacherPhone?: string;
  tenantId?: string;
  stageId?: string;
  parentName?: string;
  parentPhone: string;
  phone?: string;
  motherPhone?: string; // Contact data only
  guardianRelationship?: string; // Contact data: صلة القرابة (أب، أم، عم، كفيل، etc.)
  otherContactPhone?: string; // Contact data: رقم آخر للتواصل
  minimumTargetSurah: string; // e.g. "الغاشية"
  personalTargetSurah?: string; // e.g. "الشمس" (stretch goal)
  status: StudentStatus;
  currentSpellingLessonId: string;
  currentSpellingScore: number;
  currentSurah: string;
  currentAyah: number;
  avatarUrl?: string;
  termHistories?: StudentTermHistory[];
  notes?: string;
  username?: string;
  quranPlan?: IndividualQuranPlan;
  activeQuranPlanId?: string;
  attendanceStreak?: number;
  createdAt?: string;
  isActive?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  registrationType?: RegistrationPackageType | string;
  registrationTypeLabel?: string;
  previouslyRegistered?: 'yes' | 'no' | string;
}

export interface DailySessionRecord {
  id: string;
  tenantId?: string;
  studentId: string;
  teacherId: string;
  halaqahId: string;
  date: string; // YYYY-MM-DD
  dayOfWeek?: number | string;
  weekNumber: number;
  attendance: AttendanceStatus;
  teacherRemarks?: string;
  spellingProgress?: any;
  spellingDrillMinutes?: number;
  spelling?: {
    lessonId: string;
    lessonNumber: number;
    subLessonScores: Record<string, number>; // { "10/1": 90, "10/2": 85 }
    finalScore: number;
    isMastered: boolean;
    statusTag: 'أتقن' | 'يحتاج تثبيت' | 'لم ينتقل بعد' | 'يحتاج مراجعة' | 'لم يجتز' | 'غياب';
    notes?: string;
  };
  memorization?: {
    surahFrom: string;
    ayahFrom: number;
    surahTo: string;
    ayahTo: number;
    score: number;
    notes?: string;
  };
  revision?: {
    surahFrom: string;
    surahTo: string;
    type: 'قريبة' | 'بعيدة';
    score: number;
    notes?: string;
    /** Set when the revision range was auto-determined by the plan engine (Auto Minor Revision) */
    isAutoRange?: boolean;
    autoRangeLabel?: string;
  };
  customTracks?: Record<string, any>; // مسارات مخصصة مستقبلية
  createdAt?: string;
}

export type EducationalPlanWeekType =
  | 'normal'
  | 'long_weekend'
  | 'founding_day'
  | 'national_day'
  | 'dead_week'
  | 'exams'
  | 'midterm_break'
  | 'vacation'
  | string;

export interface EducationalPlanWeek {
  id: string;
  tenantId?: string;
  stageId?: string; // Phase / Stage identifier (e.g., 'baraem', 'ashbal', etc.)
  targetStageIds?: string[];
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dayDates?: {
    thursday?: string; // الخميس (e.g. "5/28")
    friday?: string;   // الجمعة (e.g. "5/29")
    saturday?: string; // السبت (e.g. "5/30")
    [key: string]: string | undefined;
  };
  weekType?: EducationalPlanWeekType; // نوع الأسبوع (عادي / إجازة مطولة / يوم التأسيس / أسبوع ميت / اختبارات...)
  specialEventTitle?: string; // عنوان المناسبة الخاصة أو شريط الإجازة إن وجد

  // 1. الأهداف والقيم التربوية
  domain?: 'faith' | 'behavioral' | 'skills' | 'quranic' | 'general' | string; // المجال (إيماني، سلوكي، مهاري...)
  domainLabel?: string; // "إيماني" | "سلوكي"
  valueTitle?: string; // القيمة (القرآن كلام الله، الأدب مع القرآن الكريم...)
  motto: string; // الشعار (كلام ربي، الأدب مع القرآن الكريم...)
  educationalGoal: string; // مواضيع الهدف / الهدف المعتمد (قصة الوحي، فيديو فضل القرآن...)
  goalTopic?: string; // عنوان أو موضوع الهدف
  goalPresenter?: string; // مقدم الموضوع (أ. نور، أ. صالح...)
  goalLocation?: string; // مكان تقديم الموضوع (القاعة، المسجد...)

  // 2. الفقرة الثقافية والتفاعلية والمسؤوليات
  activity: string; // اسم الفقرة التفاعلية (كراديس، مانيوليز، إكس أو، الجرس الثقافي...)
  activityPresenter?: string; // مقدم الفقرة (أ. صالح، أ. أحمد...)
  activityLocation?: string; // مكان النشاط (قاعتنا، المبنى...)
  responsiblePerson: string; // المشرف / المسؤول العام للأسبوع

  // 3. البرامج والمسابقات القرآنية
  quranicProgram?: string; // البرنامج القرآني المصاحب (مسابقة نحو المعالي، استيكرات...)
  overallProjectBudget?: number; // الميزانية الإجمالية للمشروع (مثل: 1000 ريال)

  // 4. الميزانية والملاحظات والحالة
  budget: number; // الميزانية المقترحة للأسبوع (50 ر.س)
  notes?: string; // ملاحظات
  valuesList?: string[];
  executionStatus?: EducationalExecutionStatus;
  status?: 'scheduled' | 'in_progress' | 'completed';
  createdAt?: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// SEASONAL PROGRAMS & ACTIVITIES SCHEMA (البرامج والأنشطة الموسمية المستقلة)
// -------------------------------------------------------------
export type SeasonalProgramType = 'summer' | 'ramadan' | 'holiday' | 'special' | 'winter' | 'spring' | 'vacation' | 'general' | string;
export type SeasonalProgramStatus = 'planning' | 'upcoming' | 'active' | 'completed' | 'archived';

export interface SeasonalProgram {
  id: string;
  tenantId: string;
  title: string; // e.g. "أجيال الصيفي 14", "ملتقى النور الرمضاني"
  name?: string; // Alias for title
  code?: string;
  type: SeasonalProgramType;
  season?: string; // 'summer' | 'ramadan' | 'winter' | 'spring' | 'vacation' | 'general'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  targetStageIds?: string[]; // e.g. ['stage_ashbal', 'stage_fityan']
  targetAudience?: string;
  location?: string;
  maxCapacity?: number;
  supervisorId?: string; // المشرف التربوي المسؤول
  supervisorName?: string;
  status: SeasonalProgramStatus;
  budget?: number;
  description?: string;
  goals?: string[]; // أهداف البرنامج الموسمي
  enrolledStudentIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonalActivity {
  id: string;
  programId: string;
  tenantId: string;
  title: string; // e.g. "برنامج قيمي / نشاط رياضي / سينما قيمية"
  description?: string;
  activityType?: string;
  category?: 'quran' | 'values' | 'sports' | 'cultural' | 'skills' | 'trip' | 'general' | string;
  dayOfWeek?: string; // 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
  date?: string; // YYYY-MM-DD (اختياري للأنشطة المحددة بتاريخ)
  timeSlot?: string; // e.g. "04:30 م - 05:15 م"
  time?: string;
  responsibleName?: string;
  supervisorName?: string;
  supervisorId?: string;
  location?: string;
  points?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonalParticipation {
  id: string;
  tenantId: string;
  programId: string;
  activityId?: string; // اختياري إذا كان التقييم للبرنامج ككل أو لنشاط معين
  studentId: string;
  studentName?: string;
  originalHalaqahId?: string; // الحلقة الأصلية للطالب (تظل ثابتة ولا تتغير)
  originalHalaqahName?: string;
  attendanceStatus: 'present' | 'absent' | 'excused' | 'distinguished';
  participationLevel?: 'excellent' | 'good' | 'fair' | string;
  seasonalPointsEarned?: number; // نقاط تحفيزية خاصة بالبرنامج الموسمي
  pointsEarned?: number;
  achievementNote?: string;
  recordedBy?: string;
  notes?: string;
  recordedAt: string;
}

export interface OfficialHoliday {
  id: string;
  name: string; // e.g. "إجازة اليوم الوطني"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
}

export interface AcademicYearConfig {
  id: string;
  name: string; // e.g. "العام الدراسي 1447-1448 هـ"
  semester: string; // e.g. "الفصل الدراسي الثاني"
  currentTerm?: string; // Compatibility alias
  academicYear?: string; // Compatibility alias
  startDate: string;
  endDate: string;
  holidays?: string[];
  officialHolidays?: OfficialHoliday[];
  operationalStartWeek: number; // 3
  operationalEndWeek: number; // 14
  totalWeeks: number; // 12 operational weeks
  currentWeek: number; // e.g. 5
  manualWeekOverride?: boolean; // When true, admin manual selection is locked
  daysPerWeek: number; // 4 days (1 full spelling day, 3 days 10m review)
  spellingPassingThreshold: number; // 85%
  gradeTargets: {
    tamheedi?: { minSurah: string; label?: string };
    grade1?: { minSurah: string; label?: string };
    grade2?: { minSurah: string; label?: string };
    [stageOrGradeKey: string]: { minSurah: string; label?: string } | undefined;
  };
}

export interface ReportLog {
  id: string;
  recipientType: 'parent' | 'teacher' | 'general_group' | 'prep_week';
  recipientName: string;
  recipientPhone?: string;
  studentId?: string;
  teacherId?: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'general' | 'prep';
  title: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
}

export interface AlertItem {
  id: string;
  studentId: string;
  studentName: string;
  halaqahName: string;
  teacherId: string;
  type: 'lagging_spelling' | 'low_mastery' | 'repeated_failure' | 'absenteeism' | 'advanced_enrichment';
  title: string;
  description: string;
  severity: 'warning' | 'critical' | 'info' | 'star';
  recommendedAction: string;
}

export interface SurahMeta {
  number: number;
  name: string;
  ayahsCount: number;
  ayas?: number;
  juz: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  performedByRole?: UserRole; // Compatibility alias
  action: 'create' | 'update' | 'delete' | 'attendance' | 'bulk_attendance' | 'score_update' | 'login' | 'logout' | 'password_change' | 'lookup' | 'view' | 'badge_award' | 'remedial_plan' | 'archive_term' | 'archive_plan' | 'tenant_switch' | 'integration_config';
  entityType: 'student' | 'teacher' | 'halaqah' | 'session_record' | 'plan' | 'lesson' | 'auth' | 'system' | 'badge' | 'intervention' | 'tenant' | 'archive' | 'stage' | 'integration' | 'meeting' | 'program' | 'activity' | 'participation';
  entityId: string;
  targetId?: string; // Compatibility alias
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  timestamp: string;
  notes?: string;
}

// -------------------------------------------------------------
// P2: INCENTIVES & SMART BADGES SYSTEM
// -------------------------------------------------------------
export type BadgeType =
  | 'spelling_champion'
  | 'ghashiyah_ambassador'
  | 'golden_attendance'
  | 'halaqah_star'
  | 'rapid_growth'
  | 'daily_diligence';

export interface BadgeDefinition {
  id: BadgeType;
  title: string;
  category: 'spelling' | 'quran' | 'discipline' | 'excellence';
  description: string;
  icon: string;
  color: string;
  criteriaLabel: string;
}

export interface StudentBadge {
  id: string;
  badgeType: BadgeType;
  studentId: string;
  studentName: string;
  awardedAt: string; // YYYY-MM-DD
  awardedBy: string; // Teacher or System
  notes?: string;
  isAutomatic: boolean;
}

// -------------------------------------------------------------
// P2: EARLY WARNING & REMEDIAL INTERVENTION SYSTEM
// -------------------------------------------------------------
export type RiskLevel = 'high' | 'medium' | 'low';

export type InterventionCategory =
  | 'spelling_stagnation' // تذبذب الهجاء
  | 'attendance_drop'    // غياب متكرر
  | 'memorization_lag'   // فجوة الحفظ
  | 'pronunciation_struggle'; // صعوبة مخارج الحروف

export interface RemedialActionPlan {
  id: string;
  studentId: string;
  studentName: string;
  halaqahId: string;
  teacherId: string;
  riskLevel: RiskLevel;
  category: InterventionCategory;
  title: string;
  diagnosticSummary: string; // التشخيص الدقيق للمشكلة
  recommendedAction: string; // الإجراء التدريسي الموصى به للمعلم
  parentGuidance: string; // نصيحة ولي الأمر بالمنزل
  status: 'active' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// -------------------------------------------------------------
// P2: WHATSAPP BUSINESS API CLOUD ARCHITECTURE
// -------------------------------------------------------------
export interface WhatsAppApiConfig {
  enabled: boolean;
  isEnabled?: boolean; // Compatibility alias
  provider: 'direct_web' | 'meta_cloud_api' | 'twilio';
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  permanentAccessToken?: string;
  webhookSecret?: string;
  webhookVerifyToken?: string;
  templateNamespace?: string;
  autoSendDailyAttendance: boolean;
  autoSendBadgeNotification: boolean;
  autoSendInterventionAlert: boolean;
  lastTestedAt?: string;
  testStatus?: 'success' | 'failed' | 'idle';
}

// -------------------------------------------------------------
// P3: MULTI-TENANCY & MOSQUE COMPLEX EXPANSION
// -------------------------------------------------------------
export interface TenantModulesConfig {
  quranMemorization?: boolean; // حفظ القرآن الكريم
  quranRevision?: boolean; // المراجعة الصغرى والكبرى
  attendance?: boolean; // رصد الحضور والغياب
  quranSpelling?: boolean; // الهجاء القرآني المطور
  educationalValues?: boolean; // البرنامج القيمي والتربوي الأسبوعي
  admissions?: boolean; // بوابة القبول والتسجيل الإلكتروني
  finance?: boolean; // إدارة الرسوم والاشتراكات المالية
  associationTesting?: boolean; // ترشيحات اختبارات الجمعية
  badgesAndRewards?: boolean; // منظومة الأوسمة والتحفيز الذكي
  whatsappNotifications?: boolean; // إشعارات وتقارير الواتساب
  parentPortal?: boolean; // البوابة الذكية لولي الأمر
  spelling?: boolean; // alias for quranSpelling
  quran?: boolean; // alias for quranMemorization
  educational?: boolean; // alias for educationalValues
  reports?: boolean; // alias
  finances?: boolean; // alias for finance
  association?: boolean; // alias for associationTesting
  badges?: boolean; // alias for badgesAndRewards
  whatsapp?: boolean; // alias for whatsappNotifications
}

export interface TenantSubscriptionPlan {
  planId: 'starter' | 'growth' | 'enterprise';
  planName: string;
  maxStudentsQuota: number;
  status: 'active' | 'suspended' | 'expired' | 'trial';
  startDate?: string; // تاريخ بداية الاشتراك
  validUntil: string; // تاريخ انتهاء الاشتراك
}

// -------------------------------------------------------------
// P9: CHARITY & MULTI-TENANT HQ ORGANIZATION SCHEMA
// -------------------------------------------------------------
export interface Organization {
  id: string; // e.g. 'furqan-charity'
  name: string; // 'جمعية الفرقان لتحفيظ القرآن'
  code?: string; // e.g. 'FURQAN-HQ'
  licenseNumber?: string; // e.g. '1445-Q'
  logoUrl?: string;
  tenantIds: string[]; // ['ghazzawi', 'al-furqan', 'bonyan']
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  description?: string;
  city?: string;
  region?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface AdmissionFormFieldConfig {
  id: string;
  label: string;
  helpText?: string;
  visible: boolean;
  required: boolean;
  customLabel?: string;
  order?: number;
}

export interface TenantAdmissionsConfig {
  isOpen: boolean;
  maxOpenApplications: number;
  openTracks: string[];
  termsAndConditions?: string;
  closedMessage?: string;
  formFields?: Record<string, AdmissionFormFieldConfig>;
  fullPackagePrice?: number;
  activitiesOnlyPrice?: number;
  quranOnlyPrice?: number;
  contactPhones?: string[];
  pledgeText?: string;
}


export interface TenantReportsConfig {
  headerImageUrl?: string;
  signatureImageUrl?: string;
  footerText?: string;
}

export interface MosqueComplexTenant {
  id: string; // e.g. 'ghazzawi', 'al-furqan', 'al-huda'
  slug: string; // e.g. 'ghazzawi', 'furqan'
  name: string; // e.g. 'مجمع مسجد الغزاوي القرآني'
  organizationId?: string; // e.g. 'furqan-charity'
  description?: string; // نبذة ووصف المجمع
  city: string; // 'جدة'
  district: string; // 'حي السلامة'
  region?: string; // e.g. 'منطقة مكة المكرمة'
  address?: string; // العنوان التفصيلي
  supervisorName: string;
  contactPhone: string;
  email?: string;
  whatsappNumber?: string; // رقم الواتساب الرسمي
  logoUrl?: string;
  stageLogoUrl?: string;
  targetSurahDefault?: string; // e.g. 'الغاشية'
  referenceOutcome?: string; // e.g. '«متقنٌ لهجاء القرآن وحفظه إلى الغاشية»'
  supportedStages?: string[]; // ['baraem', 'ashbal']
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  createdAt: string;
  notes?: string;
  customDomain?: string;
  tenantType?: 'production' | 'demo';
  showOnPublicDirectory?: boolean; // حالة الظهور في "المجمعات المعتمدة" على الصفحة الرئيسية
  subscription?: TenantSubscriptionPlan;
  modulesConfig?: TenantModulesConfig;
  attendanceConfig?: TenantAttendanceConfig;
  prayerConfig?: TenantPrayerConfig;
  admissionsConfig?: TenantAdmissionsConfig;
  reportsConfig?: TenantReportsConfig;
  whatsappConfig?: WhatsAppApiConfig;
}

export interface DailyPrayerTimes {
  date: string; // 'YYYY-MM-DD'
  fajr: string; // 'HH:mm'
  sunrise: string; // 'HH:mm'
  dhuhr: string; // 'HH:mm'
  asr: string; // 'HH:mm'
  maghrib: string; // 'HH:mm'
  isha: string; // 'HH:mm'
  hijriDate?: string; // e.g. "14 ربيع الثاني 1448"
}

export interface TenantPrayerTimesDocument {
  id: string; // `${tenantId}_${year}`
  tenantId: string;
  year: number;
  latitude: number;
  longitude: number;
  timezone: string;
  method: number;
  lastSyncedAt: string;
  source: string;
  timingsByDate: Record<string, DailyPrayerTimes>;
  adjustments?: Partial<Record<PrayerReference, number>>;
}

export interface TenantPrayerConfig {
  calculationMethod: number; // 4 = Umm Al-Qura University, Makkah
  latitude?: number;
  longitude?: number;
  timezone?: string; // default: 'Asia/Riyadh'
  adjustments?: Partial<Record<PrayerReference, number>>;
  showOnPublicPage?: boolean; // toggle for public landing page
  lastSyncedAt?: string;
  source?: string; // 'aladhan' | 'local'
}

// -------------------------------------------------------------
// P4: ADMISSIONS & REGISTRATION REQUESTS
// -------------------------------------------------------------
export type AdmissionStatus =
  | 'pending'
  | 'review'
  | 'interview'
  | 'financial_decision'
  | 'accepted'
  | 'rejected'
  | 'enrolled';

export type RegistrationPackageType =
  | 'full_package' // اشتراك كامل 2000 ريال
  | 'activities_only' // اشتراك أنشطة أسبوعية فقط 1500 ريال
  | 'quran_only'; // اشتراك برامج قرآنية فقط 1000 ريال

export interface RegistrationRequest {
  id: string;
  tenantId: string;
  studentName: string;
  nationalId?: string; // رقم هوية الطالب (10 أرقام)
  parentName: string;
  parentPhone: string;
  motherPhone?: string; // جوال والدة الطالب
  guardianRelationship?: string; // صلة القرابة
  otherContactPhone?: string; // رقم آخر للتواصل
  birthDate?: string;
  grade: StudentGrade;
  registrationType?: RegistrationPackageType | string;
  registrationTypeLabel?: string;
  tuitionFeeAmount?: number;
  feePledgeAccepted?: boolean;
  previouslyRegistered?: 'yes' | 'no' | string;
  desiredStageId?: string;
  status: AdmissionStatus;
  notes?: string;
  interviewNotes?: string;
  interviewScore?: number;
  financialDecisionNotes?: string;
  assignedHalaqahId?: string;
  assignedTeacherId?: string;
  enrolledStudentId?: string;
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// P5: FINANCE & TUITION MANAGEMENT
// -------------------------------------------------------------
export type PaymentStatus = 'fully_paid' | 'partially_paid' | 'unpaid' | 'exempted';

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'online';
  receiptUrl?: string;
  notes?: string;
  recordedBy: string;
}

export interface StudentFinancialRecord {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  academicYear: string;
  baseTuition: number; // المبلغ الإجمالي المطلوب
  discountAmount: number; // قيمة الخصم
  discountReason?: string; // سبب الخصم (أبناء معلمين، أيتام، إخوة)
  scholarshipAmount: number; // منحة تفوق
  isExempt: boolean; // إعفاء كامل
  exemptionReason?: string;
  paidAmount: number; // إجمالي المدفوع
  remainingAmount: number; // المتبقي
  status: PaymentStatus;
  payments: PaymentTransaction[];
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// P6: ASSOCIATION TESTING & NOMINATION WORKFLOW
// -------------------------------------------------------------
export type NominationStatus = 'pending' | 'approved' | 'returned';

export interface AssociationNomination {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  halaqahId: string;
  halaqahName: string;
  teacherId: string;
  teacherName: string;
  nominationType: 'juz_completion' | 'surah_completion' | 'spelling_mastery';
  targetTitle: string; // e.g. "جزء عم كاملاً" أو "حفظ حتى الغاشية"
  internalExamScore: number; // درجة الاختبار الداخلي (مثلاً 95%)
  teacherRecommendation: 'recommended' | 'needs_reinforcement';
  teacherNotes?: string;
  supervisorStatus: NominationStatus;
  supervisorNotes?: string;
  nominationCardNumber?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// P7: SYSTEM SUPPORT SESSIONS & PLATFORM SECURITY
// -------------------------------------------------------------
export interface EmergencySupportSession {
  id: string;
  systemAdminUid: string;
  systemAdminName: string;
  tenantId: string;
  reason: string;
  expiresAt: string; // ISO string (max 60 mins)
  createdAt: string;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
}

// -------------------------------------------------------------
// P3: ANNUAL ACADEMIC ARCHIVES & TERM CLOSURES
// -------------------------------------------------------------
export interface ArchivedStudentSnapshot {
  studentId: string;
  studentName: string;
  grade: StudentGrade;
  halaqahName: string;
  teacherName: string;
  finalSurah: string;
  spellingLessonReached: number;
  spellingScore: number;
  attendanceRate: number;
  badgesCount: number;
  status: StudentStatus;
  notes?: string;
}

export interface AcademicTermArchive {
  id: string; // e.g. 'arch_1446_t1'
  tenantId: string;
  tenantName: string;
  academicYear: string; // e.g. '1446-1447هـ'
  termName: string; // e.g. 'الفصل الدراسي الأول'
  archivedAt: string;
  archivedBy: string;
  totalStudents: number;
  totalHalaqahs: number;
  overallMasteryRate: number;
  notes?: string;
  studentSnapshots: ArchivedStudentSnapshot[];
}

// -------------------------------------------------------------
// P3: EDUCATIONAL STAGES EXTENSION ARCHITECTURE
// -------------------------------------------------------------
export interface EducationalStage {
  id: string; // 'baraem' | 'ashbal' | 'fityan' | 'motawassit' | 'thanawi' | 'jamiyeen'
  code: string;
  name: string; // 'مرحلة البراعم', 'مرحلة الأشبال', etc.
  subtitle: string;
  ageRange: string; // '4 - 7 سنوات'
  targetGrades: string[]; // ['تمهيدي', 'صف أول', 'صف ثاني']
  curriculumFocus: string; // 'الهجاء القرآني وتأسيس النطق وسور المفصل'
  defaultTargetSurah: string; // 'الغاشية'
  accentColor: string; // 'emerald' | 'blue' | 'purple' | 'amber' | 'teal' | 'indigo'
  iconName: string;
  order: number;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  traits?: string[]; // سمات ومخرجات المربي والطالب (مثل: متقن لهجاء القرآن، محب لله ورسوله ﷺ)
  outcomeSummary?: string; // النص الشامل للمخرج (مثل: طفل متقن لهجاء القرآن وحفظه إلى الغاشية...)
  targetQuranAmount?: string; // e.g. "إلى سورة الغاشية", "إلى سورة الملك", "الجزء الرابع", "10 أجزاء", "15 جزءاً", "كامل القرآن الكريم"
  logoUrl?: string; // رابط أو بيانات شعار المرحلة التعليمية
  isLogoActive?: boolean; // حالة تفعيل ظهور شعار المرحلة (افتراضياً true إذا وجد الشعار)
}

// -------------------------------------------------------------
// P8: DYNAMIC MULTI-TRACK PLATFORM ARCHITECTURE
// -------------------------------------------------------------

export type SupervisorType =
  | 'quran_supervisor'       // مشرف قرآني
  | 'spelling_supervisor'    // مشرف هجاء
  | 'educational_supervisor' // مشرف تربوي / قيم
  | 'stage_supervisor'       // مشرف مرحلة (براعم، أشبال، إلخ)
  | 'admissions_supervisor'  // مشرف القبول والتسجيل
  | 'finance_supervisor'     // مشرف الشؤون المالية والرسوم
  | 'general_supervisor';    // مشرف عام (يرى كل شيء)

export interface SupervisorScope {
  type: SupervisorType;
  trackIds?: string[];      // المسارات المصرح له بمتابعتها والترشيح فيها
  stageIds?: string[];      // المراحل المصرح له بها (مثلاً: البراعم فقط)
  halaqahIds?: string[];    // حلقات محددة (اختياري، إن وجد تخصيص دقيق)
}

export interface TrackRubricItem {
  id: string;
  label: string;            // e.g. "جودة الحفظ وعدم التردد", "التهجي وضبط الحركات"
  maxScore: number;         // الوزن من الدرجة الكلية (مجموع الأوزان 100)
}

export interface TrackNominationConfig {
  requiresInternalExam: boolean; // هل يتطلب اختباراً داخلياً قبل الجمعية؟
  passingScore: number;          // درجة الاجتياز (مثلاً: 90 في القرآن، 85 في الهجاء)
  rubricItems: TrackRubricItem[];// بنود استمارة التقييم الداخلي لهذا المسار
  branchesOrLevels: string[];    // الفروع أو الأجزاء المتاحة للترشيح في هذا المسار
}

export interface TrackDefinition {
  id: string;                      // e.g. 'track_quran', 'track_spelling', 'track_virtues', 'track_tilawah'
  tenantId?: string;               // فارغ = مسار قياسي عام، أو معرف المجمع لمسار مخصص
  code: string;                    // 'QURAN' | 'SPELLING' | 'VIRTUES' | 'TILAWAH' | string
  name: string;                    // 'مسار القرآن الكريم (الحفظ والمراجعة)'
  shortName: string;               // 'القرآن'
  description: string;             // نبذة عن المنهج
  icon: string;                    // اسم الأيقونة من Lucide (BookOpen, Award, Sparkles, etc.)
  colorScheme: 'emerald' | 'amber' | 'blue' | 'purple' | 'indigo' | 'rose';
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;               // حالة التفعيل بالمجمع
  order: number;                   // ترتيب العرض في الواجهات
  nominationConfig: TrackNominationConfig;
}

export type TrackNominationStatus =
  | 'submitted'                 // تم الرفع من المعلم
  | 'examiner_assigned'         // تم تعيين المختبر الداخلي
  | 'internal_exam_completed'   // اكتمل الاختبار الداخلي
  | 'approved_for_association'  // معتمد لاختبار الجمعية
  | 'association_completed'     // اكتمل اختبار الجمعية ورصدت النتيجة
  | 'returned_for_revision';    // إعادة للطالب للمراجعة والتثبيت

export interface TrackNominationInternalExam {
  examinerId: string;
  examinerName: string;
  examDate: string;
  scores: Record<string, number>; // درجات البنود المعرفة في TrackDefinition
  totalScore: number;
  passed: boolean;
  recommendation: 'nominate' | 'retest' | 'reinforce';
  notes?: string;
  rubricSnapshot?: TrackRubricItem[]; // لقطة ثابتة من البنود لحماية السجلات التاريخية
}

export interface TrackNominationSupervisorApproval {
  supervisorId: string;
  supervisorName?: string;
  approvedAt: string;
  notes?: string;
}

export interface TrackNominationAssociationExam {
  examDate: string;
  score: number;
  gradeText: 'ممتاز مرتفع' | 'ممتاز' | 'جيد جداً' | 'لم يجتز';
  certificateNumber?: string;
  passed: boolean;
  notes?: string;
}

export interface TrackNomination {
  id: string;
  tenantId: string;
  trackId: string;                // مسار القرآن، مسار الهجاء، مسار التلاوة...
  trackName?: string;
  studentId: string;
  studentName: string;
  halaqahId: string;
  halaqahName: string;
  teacherId: string;
  teacherName: string;
  targetBranchOrLevel: string;    // e.g. "جزء عم", "الدرس العاشر في الهجاء"
  targetBranchSnapshot?: string;
  status: TrackNominationStatus;
  nominationCardNumber?: string;
  internalExam?: TrackNominationInternalExam;
  supervisorApproval?: TrackNominationSupervisorApproval;
  associationExam?: TrackNominationAssociationExam;
  teacherRecommendation?: 'recommended' | 'needs_reinforcement';
  teacherNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StageAttendanceOverride {
  regularDays: number[];
  startTime?: string;
  endTime?: string;
  lateThresholdMinutes?: number;
  timeType?: ScheduleTimeType;
  startPrayerOffset?: PrayerTimeOffset;
  endPrayerOffset?: PrayerTimeOffset;
}

export interface HalaqahAttendanceOverride {
  regularDays: number[];
  startTime?: string;
  endTime?: string;
  lateThresholdMinutes?: number;
  timeType?: ScheduleTimeType;
  startPrayerOffset?: PrayerTimeOffset;
  endPrayerOffset?: PrayerTimeOffset;
}

export interface TenantAttendanceConfig {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  regularDays: number[]; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  welcomeMessage?: string;
  startTime?: string; // وقت بداية الحضور والدوام (HH:mm)
  endTime?: string; // وقت نهاية الدوام (HH:mm)
  lateThresholdMinutes?: number; // وقت التأخير المسموح بالدقائق
  attendanceScope?: 'general' | 'stage' | 'halaqah'; // عام على مستوى المجمع | مخصص لمرحلة | مخصص لحلقة
  stageOverrides?: Record<string, StageAttendanceOverride>;
  halaqahOverrides?: Record<string, HalaqahAttendanceOverride>;
  timeType?: ScheduleTimeType;
  startPrayerOffset?: PrayerTimeOffset;
  endPrayerOffset?: PrayerTimeOffset;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  isRegularDay: boolean;
  reason?: string; // 'اجتماع' | 'نشاط' | 'تدريب' | 'مهمة' | 'أخرى' | string
  method: 'geo' | 'manual' | 'admin';
  locationData?: {
    latitude?: number;
    longitude?: number;
    distanceMeters?: number;
    tenantLatitude?: number;
    tenantLongitude?: number;
    radiusMeters?: number;
  };
}

// Finance Module Types
export interface RevenueItem {
  id: string;
  tenantId: string;
  sourceName: string; // e.g. 'رسوم الطلاب', 'تبرعات', 'دعم حكومي', 'أوقاف'
  amount: number;
  date: string; // YYYY-MM-DD
  donorOrSource?: string;
  paymentMethod: string; // 'نقدي' | 'تحويل بنكي' | 'شبكة' | 'أخرى'
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface ExpenseItem {
  id: string;
  tenantId: string;
  category: string; // e.g. 'تشغيلي', 'رواتب ومكافآت', 'برامج وأنشطة', 'قرطاسية'
  description: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  date: string; // YYYY-MM-DD
  beneficiary: string; // المستفيد / المورد
  paymentMethod: string;
  programName?: string; // النشاط المرتبط اختيارياً
  invoiceNumber?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface CustodyExpenseItem {
  id: string;
  custodyId: string;
  tenantId: string;
  vendor: string; // المورد
  description: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  category: string;
  date: string;
  paymentMethod: string;
  invoiceNumber?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export type CustodyStatus = 'draft' | 'disbursed' | 'under_review' | 'settled' | 'closed';

export interface Custody {
  id: string;
  tenantId: string;
  holderId: string; // المشرف أو المعلم المسؤول
  holderName: string;
  purpose: string; // الغرض / النشاط
  originalAmount: number; // المبلغ المرصود
  status: CustodyStatus;
  createdAt: string;
  disbursedAt?: string;
  settledAt?: string;
  closedAt?: string;
  reviewedBy?: string;
  notes?: string;
  createdBy: string;
}

export type BudgetRequestStatus = 'pending' | 'approved' | 'rejected';

export interface BudgetRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  requesterName: string;
  programName: string;
  estimatedAmount: number;
  justification: string;
  status: BudgetRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface TuitionConfigItem {
  id: string;
  academicYear: string;
  semester: string;
  defaultAmount: number;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  createdAt: string;
}

export interface BankAccountConfig {
  id: string;
  bankName: string;
  accountName: string;
  iban: string;
  accountNumber?: string;
  isDefault?: boolean;
}

export interface FinanceSettingsData {
  tenantId: string;
  revenueSources: string[]; // ['رسوم الطلاب', 'تبرعات', 'دعم', 'أوقاف', 'أخرى']
  expenseCategories: string[]; // ['تشغيلي', 'رواتب ومكافآت', 'برامج وأنشطة', 'قرطاسية', 'جوائز وهدايا', 'أخرى']
  paymentMethods: string[]; // ['نقدي', 'تحويل بنكي', 'شبكة', 'أخرى']
  tuitionConfigs?: TuitionConfigItem[];
  defaultTuitionAmount?: number;
  bankAccounts?: BankAccountConfig[];
  financialPolicies?: {
    refundPolicy?: string;
    exemptionPolicy?: string;
    receiptFooterNote?: string;
    paymentDueDays?: number;
  };
}

export interface StudentPointRule {
  id: string;
  tenantId: string;
  title: string; // e.g. "حفظ وجه جديد", "إتقان مراجعة", "حضور مبكر", "مشاركة متميزة"
  category: 'memorization' | 'review' | 'plan' | 'attendance' | 'commitment' | 'participation' | 'competition' | 'custom';
  defaultPoints: number; // e.g. 10
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  description?: string;
  createdAt: string;
}

export interface StudentPointTransaction {
  id: string;
  tenantId: string;
  studentId: string;
  studentName?: string;
  ruleId?: string;
  category: string;
  points: number;
  reason: string;
  date: string; // YYYY-MM-DD
  recordedBy: string; // name of teacher/supervisor/manager
  createdAt: string;
}




export interface HalaqahAssistantTeacher {
  id: string;
  name: string;
}

export interface HalaqahOnlineConfig {
  enabled: boolean;
  meetingUrl: string;
  scheduleDays: number[]; // 0=Sunday, etc.
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface BannerItem {
  id: string;
  subtitle?: string;
  linkUrl?: string;
  ctaText?: string;
  imageUrl: string;
  title: string;
  description?: string;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  order: number;
}

export interface AdItem {
  id: string;
  type: 'image' | 'video';
  mediaUrl: string;
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  contactNumber?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  isActive: boolean;
  rolePermissionsOverrides?: Record<string, string[]>;
  order: number;
}

export interface SectionVisibility {
  id: string;
  label: string;
  isVisible: boolean;
  order: number;
}

export interface FrontendConfig {
  id: string;
  ads?: AdItem[]; // 'platform' or tenantId
  type: 'platform' | 'tenant';
  name: string;
  description?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  address?: string;
  showSupervisor?: boolean;
  showPrayerTimes?: boolean;
  primaryColor?: string;
  banners: BannerItem[];
  announcements: AdItem[];
  sections: SectionVisibility[];
}

// -------------------------------------------------------------
// P10: MEETINGS & OFFICIAL MINUTES SYSTEM
// -------------------------------------------------------------
export type MeetingStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingLocationType = 'in_person' | 'remote' | 'hybrid';
export type MeetingCategory = 'general' | 'supervisors' | 'teachers' | 'board' | 'educational' | 'emergency';
export type MeetingAttendanceStatus = 'invited' | 'attended' | 'absent' | 'excused';

export interface MeetingAttendee {
  userId: string;
  name: string;
  role: UserRole;
  attendanceStatus: MeetingAttendanceStatus;
  excuseReason?: string;
  notes?: string;
}

export interface MeetingAgendaItem {
  id: string;
  title: string;
  description?: string;
  presenterUserId?: string;
  presenterName?: string;
  durationMinutes?: number;
}

export interface MeetingDecision {
  id: string;
  text: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  dueDate?: string; // YYYY-MM-DD
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface Meeting {
  id: string;
  tenantId: string;
  title: string;
  meetingNumber?: string; // e.g. "م-2026/01"
  category?: MeetingCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  locationType: MeetingLocationType;
  location?: string;
  meetingUrl?: string;
  description?: string;
  objectives: string[];
  agenda: MeetingAgendaItem[];
  attendees: MeetingAttendee[];
  discussions?: string;
  decisions: MeetingDecision[];
  recommendations: string[];
  postponedItems: string[];
  notes?: string;
  status: MeetingStatus;
  cancellationReason?: string;
  createdBy: string; // User.id
  createdByName: string;
  createdByRole: UserRole;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

