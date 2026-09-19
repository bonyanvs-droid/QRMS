import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, isSupervisorRecord } from '../../context/AppContext';
import {
  Shield,
  Settings,
  Users,
  BookOpen,
  Calendar,
  Database,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  X,
  ArrowRightLeft,
  Lock,
  Image as ImageIcon,
  History,
  Search,
  Cloud,
  CloudOff,
  Activity,
  Printer,
  FileSpreadsheet,
  Crown,
  MessageSquare,
  Award,
  Building2,
  Archive,
  Layers,
  Server,
  Target,
  Info,
  Save,
  BarChart3,
  Video,
  RotateCcw,
  AlertTriangle,
  Clock,
  ExternalLink,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Halaqah, Student, Teacher, ArchivedHalaqah, HalaqahDaySchedule, AcademicYearConfig } from '../../types';
import { HalaqahScheduleEditor } from './HalaqahScheduleEditor';
import { BulkHalaqahScheduleModal } from './BulkHalaqahScheduleModal';
import { formatHalaqahWeeklySummary, formatHalaqahStructuredSummary } from '../../utils/scheduleCalculator';
import { FirestoreBackupExporterTab } from './FirestoreBackupExporterTab';
import { FirestoreRestoreTab } from './FirestoreRestoreTab';
import { AdminBackupMigrationHub } from './AdminBackupMigrationHub';

const ALL_WEEK_DAYS: { dayOfWeek: number; dayName: string }[] = [
  { dayOfWeek: 0, dayName: 'الأحد' },
  { dayOfWeek: 1, dayName: 'الاثنين' },
  { dayOfWeek: 2, dayName: 'الثلاثاء' },
  { dayOfWeek: 3, dayName: 'الأربعاء' },
  { dayOfWeek: 4, dayName: 'الخميس' },
  { dayOfWeek: 5, dayName: 'الجمعة' },
  { dayOfWeek: 6, dayName: 'السبت' },
];

const DEFAULT_WEEKLY_SCHEDULE: HalaqahDaySchedule[] = [
  { dayOfWeek: 0, dayName: 'الأحد', isActive: true },
  { dayOfWeek: 1, dayName: 'الاثنين', isActive: true },
  { dayOfWeek: 2, dayName: 'الثلاثاء', isActive: true },
  { dayOfWeek: 3, dayName: 'الأربعاء', isActive: true },
  { dayOfWeek: 4, dayName: 'الخميس', isActive: true },
  { dayOfWeek: 5, dayName: 'الجمعة', isActive: false },
  { dayOfWeek: 6, dayName: 'السبت', isActive: false },
];

export function formatHalaqahSchedule(h: Partial<Halaqah>): string {
  const schedule = h.weeklySchedule;
  const defaultStart = h.defaultStartTime || '16:00';
  const defaultEnd = h.defaultEndTime || '18:00';

  if (!schedule || schedule.length === 0) {
    return `الأحد - الخميس (${defaultStart} - ${defaultEnd})`;
  }

  const activeDays = schedule.filter((d) => d.isActive);
  if (activeDays.length === 0) return 'لا توجد أيام عمل نشطة';

  const defaultTimeDays = activeDays.filter((d) => !d.isCustomTime);
  const customTimeDays = activeDays.filter((d) => d.isCustomTime && d.startTime && d.endTime);

  const parts: string[] = [];

  if (defaultTimeDays.length > 0) {
    if (defaultTimeDays.length === 5 && defaultTimeDays[0].dayOfWeek === 0 && defaultTimeDays[4].dayOfWeek === 4) {
      parts.push(`الأحد - الخميس (${defaultStart} - ${defaultEnd})`);
    } else {
      const names = defaultTimeDays.map((d) => d.dayName).join('، ');
      parts.push(`${names} (${defaultStart} - ${defaultEnd})`);
    }
  }

  if (customTimeDays.length > 0) {
    customTimeDays.forEach((d) => {
      parts.push(`${d.dayName} (${d.startTime} - ${d.endTime})`);
    });
  }

  return parts.join(' | ');
}
import { SURAHS_LIST } from '../../data/initialData';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import { StageLogosManagement } from './StageLogosManagement';
import { OfficialPrintableReportModal } from '../common/OfficialPrintableReportModal';
import { BulkOnlineHalaqahsModal } from './BulkOnlineHalaqahsModal';
import { BadgesManagementModal } from '../teacher/BadgesManagementModal';
import { EarlyInterventionRadarModal } from '../teacher/EarlyInterventionRadarModal';
import { exportStudentsToExcel } from '../../utils/exportUtils';
import { AcademicArchivesTab } from './AcademicArchivesTab';
import { EducationalStagesTab } from './EducationalStagesTab';
import { QuranIntegrationTab } from './QuranIntegrationTab';
import { AdmissionsManagementTab } from './AdmissionsManagementTab';
import { FinancialManagementTab } from './FinancialManagementTab';
import { StudentPointsTab } from './StudentPointsTab';
import { AssociationNominationsTab } from './AssociationNominationsTab';
import { TracksManagementTab } from './TracksManagementTab';
import { EmergencySupportTab } from './EmergencySupportTab';
import { CurriculumTemplatesTab } from './CurriculumTemplatesTab';
import { PermissionsDelegationTab } from './PermissionsDelegationTab';
import FrontendManagementTab from './FrontendManagementTab';
import { SUPERVISOR_ROLES_CONFIG } from '../../utils/trackAdapter';
import { SupervisorScope } from '../../types';
import { StudentCumulativeHistoryModal } from '../common/StudentCumulativeHistoryModal';
import { isModuleEnabled } from '../../lib/moduleChecker';
import { UserPlus, DollarSign, Award as AwardIcon, ShieldAlert } from 'lucide-react';

import { AttendanceSettingsTab } from './AttendanceSettingsTab';
import { AdmissionsSettingsTab } from './AdmissionsSettingsTab';
import { FinancialSettingsTab } from './FinancialSettingsTab';
import { ReportsSettingsTab } from './ReportsSettingsTab';
import { WhatsAppSettingsTab } from './WhatsAppSettingsTab';
import { TeachersManagementTab } from './TeachersManagementTab';
import { SupervisorsManagementTab } from './SupervisorsManagementTab';
import { MeetingsManagementView } from '../meetings/MeetingsManagementView';
import { BulkImportCenterView } from './BulkImportCenterView';

import { AdminOverviewDashboard } from './AdminOverviewDashboard';
import { SmartAttendanceWidget } from '../common/SmartAttendanceWidget';
import { ALL_PERMISSIONS, hasPermission } from '../../lib/permissions';
import { UNIFIED_NAV_ITEMS, getNavigationGroups } from '../../lib/navigationConfig';
import { Navigate, useLocation } from 'react-router-dom';

interface AdminDashboardProps {
  initialTab?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    academicConfig,
    updateAcademicConfig,
    users,
    teachers,
    archivedTeachers,
    archivedSupervisors,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    halaqahs,
    addHalaqah,
    updateHalaqah,
    deleteHalaqah,
    archivedHalaqahs,
    archiveHalaqah,
    restoreHalaqah,
    permanentlyDeleteArchivedHalaqah,
    students,
    sessionRecords,
    spellingLessons,
    addStudent,
    updateStudent,
    deleteStudent,
    transferStudent,
    exportDatabaseJson,
    importDatabaseJson,
    resetToDefaultData,
    currentUser,
    mosqueLogoUrl,
    stageLogoUrl,
    setMosqueLogoUrl,
    setStageLogoUrl,
    resetLogos,
    auditLogs,
    isOffline,
    isCloudSyncing,
    tenants,
    archives,
    stages,
    activeTenantId,
    activeTenant,
    setActiveTenantId,
    organizations,
    updateAcademicOutcome,
    academicOutcome,
    admissionsRequests,
    associationNominations,
    tracks,
    prayerTimesToday,
    bulkUpdateHalaqahs,
  } = useApp();

  const isSysAdmin = currentUser?.role === 'system_admin' || (currentUser?.role as any) === 'admin';
  const isCampAdmin = currentUser?.role === 'campus_admin';

  // Resolve Charity Organization for charity_supervisor
  const currentOrg = React.useMemo(() => {
    if (!currentUser?.organizationId) return organizations[0];
    return organizations.find((o) => o.id === currentUser.organizationId) || organizations[0];
  }, [organizations, currentUser]);

  // List of tenants the user is authorized to supervise/manage
  const supervisedTenants = React.useMemo(() => {
    if (currentUser?.role === 'system_admin') return tenants;
    if (currentUser?.role === 'charity_supervisor' && currentOrg) {
      return tenants.filter(
        (t) =>
          currentOrg.tenantIds.includes(t.id) ||
          t.organizationId === currentOrg.id ||
          (t.id === 'ghazzawi' && currentOrg.id === 'org_furqan_hq')
      );
    }
    return tenants.filter((t) => t.id === currentUser?.tenantId);
  }, [tenants, currentUser, currentOrg]);

  // Authoritative module permissions for active tenant
  const isAdmissionsActive = isModuleEnabled(activeTenant, 'admissions');
  const isFinancesActive = isModuleEnabled(activeTenant, 'finances');
  const isAssociationActive = isModuleEnabled(activeTenant, 'association');
  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');
  const isBadgesActive = isModuleEnabled(activeTenant, 'badges');

  // Strictly filter data by active tenant for data isolation
  const visibleHalaqahs = React.useMemo(() => {
    return halaqahs.filter((h) => !activeTenantId || h.tenantId === activeTenantId);
  }, [halaqahs, activeTenantId]);

  const visibleArchivedHalaqahs = React.useMemo(() => {
    return (archivedHalaqahs || []).filter((h) => !activeTenantId || h.tenantId === activeTenantId);
  }, [archivedHalaqahs, activeTenantId]);

  const visibleStudents = React.useMemo(() => {
    return students.filter((s) => !activeTenantId || s.tenantId === activeTenantId);
  }, [students, activeTenantId]);

  const archivedTeacherIds = React.useMemo(() => {
    return new Set((archivedTeachers || []).map((t) => t.id));
  }, [archivedTeachers]);

  const archivedSupervisorIds = React.useMemo(() => {
    return new Set((archivedSupervisors || []).map((s) => s.id));
  }, [archivedSupervisors]);

  const visibleTeachers = React.useMemo(() => {
    const halaqahTeacherIds = new Set(visibleHalaqahs.map((h) => h.teacherId).filter(Boolean));
    const halaqahIds = new Set(visibleHalaqahs.map((h) => h.id));
    return teachers.filter(
      (t) =>
        !t.isArchived &&
        !t.teacherArchived &&
        t.isActive !== false &&
        !archivedTeacherIds.has(t.id) &&
        !archivedSupervisorIds.has(t.id) &&
        t.staffRole !== 'supervisor' &&
        (t as any).role !== 'supervisor' &&
        (!activeTenantId ||
          !t.tenantId ||
          t.tenantId === activeTenantId ||
          halaqahTeacherIds.has(t.id) ||
          (t.halaqahId && halaqahIds.has(t.halaqahId)) ||
          t.phone === activeTenant?.contactPhone)
    );
  }, [teachers, visibleHalaqahs, activeTenantId, activeTenant, archivedTeacherIds, archivedSupervisorIds]);

  const visibleRecords = React.useMemo(() => {
    const halaqahIds = new Set(visibleHalaqahs.map((h) => h.id));
    return sessionRecords.filter((r) => !activeTenantId || halaqahIds.has(r.halaqahId));
  }, [sessionRecords, visibleHalaqahs, activeTenantId]);

  const visibleSupervisors = React.useMemo(() => {
    return (users || []).filter((u) => {
      if (u.isArchived || u.supervisorArchived || u.isActive === false) return false;
      if (archivedSupervisorIds.has(u.id) || archivedTeacherIds.has(u.id)) return false;
      if (!isSupervisorRecord(u)) return false;
      if (
        activeTenantId &&
        u.tenantId &&
        u.tenantId !== activeTenantId &&
        !u.tenantId.includes(activeTenantId) &&
        !activeTenantId.includes(u.tenantId)
      ) {
        return false;
      }
      return true;
    });
  }, [users, activeTenantId, archivedSupervisorIds, archivedTeacherIds]);

  const visibleSupervisorsCount = visibleSupervisors.length;

  // Resolves the assigned teacher's display name accurately across students, halaqahs, teachers, and users
  const getStudentTeacherDisplayName = useCallback(
    (s: Student, halaqah?: Halaqah) => {
      const effectiveHalaqah = halaqah || halaqahs.find((h) => h.id === s.halaqahId);
      const effectiveTeacherId = s.teacherId || effectiveHalaqah?.teacherId;

      if (effectiveTeacherId) {
        const t =
          teachers.find((tch) => tch.id === effectiveTeacherId) ||
          users.find((u) => u.id === effectiveTeacherId);
        if (t?.name) return t.name;
        if ((t as any)?.fullName) return (t as any).fullName;
      }

      if (s.teacherName && s.teacherName.trim()) {
        return s.teacherName;
      }

      if (effectiveHalaqah?.teacherName && effectiveHalaqah.teacherName.trim()) {
        return effectiveHalaqah.teacherName;
      }

      return 'غير محدد';
    },
    [halaqahs, teachers, users]
  );

  // Resolves student registration package / type
  const getStudentRegistrationType = useCallback(
    (student: Student) => {
      if (student.registrationTypeLabel) return student.registrationTypeLabel;
      if (student.registrationType) {
        if (student.registrationType === 'full_package') return 'باقة الاشتراك الكامل';
        if (student.registrationType === 'activities_only') return 'أنشطة وبرامج';
        if (student.registrationType === 'quran_only') return 'قرآن فقط';
        if (student.registrationType === 'scholarship') return 'منحة / إعفاء';
        return student.registrationType;
      }
      // Match with admissions request if available
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
    },
    [admissionsRequests]
  );

  // Categorize student into: activities | programs | halaqah
  // - طلاب النشاط: المشتركون في باقة الأنشطة والبرامج فقط (النشاط)
  // - طلاب البرامج: المشتركون في باقة الاشتراك الكامل (شامل البرامج والحلقات والأنشطة)
  // - طلاب الحلقات: المشتركون في باقة القرآن الكريم فقط
  const getStudentCategory = useCallback(
    (student: Student): 'activities' | 'programs' | 'halaqah' => {
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
    },
    [admissionsRequests]
  );

  type AdminTabType = 'frontend'
    | 'attendance_settings'
    | 'admissions_settings'
    | 'financial_settings'
    | 'reports_settings'
    | 'whatsapp_settings'
    | 'supervisors'
    | 'overview'
    | 'academic'
    | 'curriculum'
    | 'admissions'
    | 'finances'
    | 'points'
    | 'nominations'
    | 'support'
    | 'attendance'
    | 'students'
    | 'teachers'
    | 'halaqahs'
    | 'tracks'
    | 'archives'
    | 'stages'
    | 'logos'
    | 'backup'
    | 'audit'
    | 'quranIntegration'
    | 'permissions'
    | 'bulk_import'
    | 'meetings';

  const { subtab } = useParams<{ subtab?: string }>();
  const hashSubtab = location.hash ? location.hash.replace(/^#\/?(admin\/)?/, '') : '';
  const activeTab: AdminTabType = ((initialTab || subtab || hashSubtab || 'overview') as AdminTabType);

  const [showOfficialReport, setShowOfficialReport] = useState(false);
  const [showWhatsAppSettings, setShowWhatsAppSettings] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [viewingHistoryStudent, setViewingHistoryStudent] = useState<Student | null>(null);

  // Outcome Configuration Form State
  const [outcomeForm, setOutcomeForm] = useState(() => {
    const stageOutcome = stages.find((s) => s.id === 'baraem')?.outcomeSummary;
    return {
      outcomeText:
        activeTenant?.referenceOutcome?.trim() ||
        (stageOutcome
          ? `«${stageOutcome}»`
          : activeTenant?.targetSurahDefault
          ? `«متقنٌ لهجاء القرآن وحفظه إلى ${activeTenant.targetSurahDefault}»`
          : ''),
      targetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
      tenantId: activeTenantId,
    };
  });
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  const [outcomeSaving, setOutcomeSaving] = useState(false);

  // Keep outcomeForm in sync when activeTenant changes
  React.useEffect(() => {
    const stageOutcome = stages.find((s) => s.id === 'baraem')?.outcomeSummary;
    setOutcomeForm({
      outcomeText:
        activeTenant?.referenceOutcome?.trim() ||
        (stageOutcome
          ? `«${stageOutcome}»`
          : activeTenant?.targetSurahDefault
          ? `«متقنٌ لهجاء القرآن وحفظه إلى ${activeTenant.targetSurahDefault}»`
          : ''),
      targetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
      tenantId: activeTenantId,
    });
  }, [activeTenant, activeTenantId, stages]);

  // Audit Log Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [backupSubMode, setBackupSubMode] = useState<'restore' | 'export' | 'local'>('restore');

  // Academic Config Form State
  const [academicForm, setAcademicForm] = useState(academicConfig);
  const [configSaved, setConfigSaved] = useState(false);
  const isAcademicFormDirtyRef = React.useRef(false);

  // Synchronize form when academicConfig loads or updates from backend API, unless user is actively editing
  React.useEffect(() => {
    if (academicConfig && !isAcademicFormDirtyRef.current) {
      setAcademicForm(academicConfig);
    }
  }, [academicConfig]);

  const handleAcademicFormChange = (updates: Partial<AcademicYearConfig>) => {
    isAcademicFormDirtyRef.current = true;
    setAcademicForm((prev) => ({ ...prev, ...updates }));
  };

  // Student Modals
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [transferHalaqahId, setTransferHalaqahId] = useState('');
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [bulkSourceHalaqahId, setBulkSourceHalaqahId] = useState('');
  const [bulkTargetHalaqahId, setBulkTargetHalaqahId] = useState('');
  const [studentCategoryFilter, setStudentCategoryFilter] = useState<'all' | 'programs' | 'halaqah' | 'activities' | 'archived'>('all');

  // Student Archive and Delete In-App Modals (replaces iframe-incompatible window.confirm)
  const [studentToArchive, setStudentToArchive] = useState<{ student: Student; action: 'archive' | 'unarchive' } | null>(null);
  const [studentArchiveReason, setStudentArchiveReason] = useState('');
  const [isSubmittingStudentArchive, setIsSubmittingStudentArchive] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isSubmittingStudentDelete, setIsSubmittingStudentDelete] = useState(false);
  const [studentActionNotice, setStudentActionNotice] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const archivedStudentsCount = React.useMemo(() => {
    return visibleStudents.filter((s) => s.isArchived).length;
  }, [visibleStudents]);

  const halaqahStudentsCount = React.useMemo(() => {
    return visibleStudents.filter((s) => !s.isArchived && getStudentCategory(s) === 'halaqah').length;
  }, [visibleStudents, getStudentCategory]);

  const programsStudentsCount = React.useMemo(() => {
    return visibleStudents.filter((s) => !s.isArchived && getStudentCategory(s) === 'programs').length;
  }, [visibleStudents, getStudentCategory]);

  const activitiesStudentsCount = React.useMemo(() => {
    return visibleStudents.filter((s) => !s.isArchived && getStudentCategory(s) === 'activities').length;
  }, [visibleStudents, getStudentCategory]);

  const mainCategoryStudents = React.useMemo(() => {
    if (studentCategoryFilter === 'archived') {
      return visibleStudents.filter((s) => s.isArchived);
    }
    if (studentCategoryFilter === 'all') {
      // In "all", show non-activity students (both active and archived; archived are dimmed)
      return visibleStudents.filter((s) => getStudentCategory(s) !== 'activities');
    }
    if (studentCategoryFilter === 'activities') {
      return [];
    }
    return visibleStudents.filter((s) => !s.isArchived && getStudentCategory(s) === studentCategoryFilter);
  }, [visibleStudents, studentCategoryFilter, getStudentCategory]);

  const activitySectionStudents = React.useMemo(() => {
    if (studentCategoryFilter === 'archived') {
      return [];
    }
    if (studentCategoryFilter === 'all') {
      return visibleStudents.filter((s) => getStudentCategory(s) === 'activities');
    }
    if (studentCategoryFilter === 'activities') {
      return visibleStudents.filter((s) => !s.isArchived && getStudentCategory(s) === 'activities');
    }
    return [];
  }, [visibleStudents, studentCategoryFilter, getStudentCategory]);

  // Halaqah Modals
  const [editingHalaqah, setEditingHalaqah] = useState<Partial<Halaqah> | null>(null);
  const [isNewHalaqah, setIsNewHalaqah] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [isBulkOnlineModalOpen, setIsBulkOnlineModalOpen] = useState(false);
  const [isBulkScheduleModalOpen, setIsBulkScheduleModalOpen] = useState(false);
  const [halaqahToDelete, setHalaqahToDelete] = useState<Halaqah | null>(null);
  const [isDeletingHalaqah, setIsDeletingHalaqah] = useState(false);
  const [deleteArchiveReason, setDeleteArchiveReason] = useState('');
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [restoringHalaqahId, setRestoringHalaqahId] = useState<string | null>(null);
  const [permDeletingId, setPermDeletingId] = useState<string | null>(null);

  // Backup state
  const [importJsonText, setImportJsonText] = useState('');
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);

    const handleSaveAcademic = (e: React.FormEvent) => {
    e.preventDefault();
    isAcademicFormDirtyRef.current = false;
    updateAcademicConfig(academicForm);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const handleSaveAcademicOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeForm.outcomeText.trim()) return;
    try {
      setOutcomeSaving(true);
      await updateAcademicOutcome(
        outcomeForm.outcomeText.trim(),
        outcomeForm.targetSurah,
        outcomeForm.tenantId
      );
      setOutcomeSaved(true);
      setTimeout(() => setOutcomeSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ المخرج القرآني');
    } finally {
      setOutcomeSaving(false);
    }
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.fullName) return;

    const isActivities = editingStudent.registrationType === 'activities_only';

    // Auto-resolve halaqah and teacher if not activities_only
    const h = isActivities ? null : halaqahs.find((hal) => hal.id === editingStudent.halaqahId);
    const resolvedTeacherId = isActivities ? '' : (editingStudent.teacherId || h?.teacherId || '');
    const matchedTeacher = isActivities
      ? null
      : (teachers.find((t) => t.id === resolvedTeacherId) || users.find((u) => u.id === resolvedTeacherId));
    const resolvedTeacherName = isActivities
      ? ''
      : (matchedTeacher?.name ||
        (matchedTeacher as any)?.fullName ||
        editingStudent.teacherName ||
        h?.teacherName ||
        '');

    const studentToSave = {
      ...editingStudent,
      halaqahId: isActivities ? '' : (editingStudent.halaqahId || ''),
      halaqahName: isActivities ? '' : (h?.name || editingStudent.halaqahName || ''),
      teacherId: resolvedTeacherId,
      teacherName: resolvedTeacherName,
      currentSurah: isActivities ? '' : (editingStudent.currentSurah || 'الفاتحة'),
      currentAyah: isActivities ? 0 : (editingStudent.currentAyah || 1),
      minimumTargetSurah: isActivities ? '' : (editingStudent.minimumTargetSurah || 'الغاشية'),
      personalTargetSurah: isActivities ? '' : (editingStudent.personalTargetSurah || ''),
    };

    if (isNewStudent) {
      addStudent(studentToSave as any);
    } else if (editingStudent.id) {
      updateStudent(editingStudent.id, studentToSave);
    }
    setEditingStudent(null);
  };

  const handleOpenStudentArchiveModal = (student: Student) => {
    setStudentArchiveReason('');
    setStudentToArchive({
      student,
      action: student.isArchived ? 'unarchive' : 'archive',
    });
  };

  const handleToggleStudentArchive = (student: Student) => {
    handleOpenStudentArchiveModal(student);
  };

  const handleConfirmStudentArchive = async () => {
    if (!studentToArchive) return;
    const { student, action } = studentToArchive;
    const isArchiving = action === 'archive';
    setIsSubmittingStudentArchive(true);

    try {
      await updateStudent(student.id, {
        isArchived: isArchiving,
        isActive: !isArchiving,
        archivedAt: isArchiving ? new Date().toISOString() : undefined,
        archiveReason: isArchiving ? (studentArchiveReason.trim() || 'أرشفة الطالب وحفظ سجلاته') : undefined,
      });
      setStudentActionNotice({
        text: isArchiving
          ? `تمت أرشفة الطالب «${student.fullName}» بنجاح ونقله للأرشيف`
          : `تم إلغاء أرشفة الطالب «${student.fullName}» وإعادته للحالة النشطة`,
        type: 'success',
      });
      setTimeout(() => setStudentActionNotice(null), 4000);
      setStudentToArchive(null);
      setStudentArchiveReason('');
    } catch (error) {
      console.error('Failed to toggle student archive state:', error);
    } finally {
      setIsSubmittingStudentArchive(false);
    }
  };

  const handleConfirmStudentDelete = async () => {
    if (!studentToDelete) return;
    const targetName = studentToDelete.fullName;
    setIsSubmittingStudentDelete(true);
    try {
      await deleteStudent(studentToDelete.id);
      setStudentActionNotice({
        text: `تم حذف الطالب «${targetName}» نهائياً من النظام`,
        type: 'info',
      });
      setTimeout(() => setStudentActionNotice(null), 4000);
      setStudentToDelete(null);
    } catch (error) {
      console.error('Failed to delete student:', error);
    } finally {
      setIsSubmittingStudentDelete(false);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringStudent || !transferHalaqahId) return;

    const targetHalaqah = halaqahs.find((h) => h.id === transferHalaqahId);
    if (targetHalaqah) {
      transferStudent(transferringStudent.id, targetHalaqah.id, targetHalaqah.teacherId);
    }
    setTransferringStudent(null);
  };

  const handleBulkTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSourceHalaqahId || !bulkTargetHalaqahId) return;
    if (bulkSourceHalaqahId === bulkTargetHalaqahId) {
      alert('لا يمكن نقل الحلقة إلى نفس الحلقة');
      return;
    }
    const targetHalaqah = halaqahs.find((h) => h.id === bulkTargetHalaqahId);
    if (!targetHalaqah) return;

    const studentsToTransfer = students.filter(s => s.halaqahId === bulkSourceHalaqahId);
    if (studentsToTransfer.length === 0) {
      alert('لا توجد طلاب في الحلقة المصدر');
      return;
    }

    studentsToTransfer.forEach((s) => {
      transferStudent(s.id, targetHalaqah.id, targetHalaqah.teacherId);
    });

    setIsBulkTransferOpen(false);
    setBulkSourceHalaqahId('');
    setBulkTargetHalaqahId('');
    alert(`تم بنجاح نقل ${studentsToTransfer.length} طالب إلى حلقة ${targetHalaqah.name}`);
  };

  const handleSaveHalaqah = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHalaqah || !editingHalaqah.name) return;

    const matchedTeacher = teachers.find((t) => t.id === editingHalaqah.teacherId) || users.find((u) => u.id === editingHalaqah.teacherId);
    const halaqahToSave: Halaqah = {
      ...editingHalaqah,
      teacherName: matchedTeacher ? matchedTeacher.name : (editingHalaqah.teacherName || ''),
      tenantId: editingHalaqah.tenantId || activeTenantId,
    } as Halaqah;

    if (isNewHalaqah) {
      addHalaqah(halaqahToSave);
    } else if (editingHalaqah.id) {
      updateHalaqah(editingHalaqah.id, halaqahToSave);
    }
    setEditingHalaqah(null);
  };

  const handleBulkSaveOnline = async (
    selectedIds: string[],
    config: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      scheduleDays: number[];
      meetingUrl: string;
    }
  ) => {
    for (const id of selectedIds) {
      const existing = halaqahs.find((h) => h.id === id);
      if (existing) {
        await updateHalaqah(id, {
          onlineConfig: {
            enabled: config.enabled,
            startTime: config.startTime,
            endTime: config.endTime,
            scheduleDays: config.scheduleDays,
            meetingUrl: config.meetingUrl || existing.onlineConfig?.meetingUrl || '',
          },
        });
      }
    }
  };

  const handleExportJson = () => {
    const dataStr = exportDatabaseJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `al_ghazzawi_baraem_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportJson = () => {
    const ok = importDatabaseJson(importJsonText);
    setImportSuccess(ok);
    if (ok) {
      setTimeout(() => {
        setImportSuccess(null);
        setImportJsonText('');
      }, 2000);
    }
  };

  // Dynamic Tab Protection based on UNIFIED_NAV_ITEMS and RBAC
  if (!currentUser) return null;

  const currentNavItem = UNIFIED_NAV_ITEMS.find(item => item.id === activeTab || (activeTab === 'overview' && item.id === 'dashboard'));
  let hasAccess = false;
  
  if (currentUser.role === 'system_admin' || currentUser.role === 'campus_admin' || (currentUser.role as any) === 'admin') {
     hasAccess = true;
  } else if (currentNavItem) {
     const hasRole = !currentNavItem.requiredRoles || currentNavItem.requiredRoles.includes(currentUser.role);
     const hasPerm = !currentNavItem.requiredPermission 
       ? true 
       : Array.isArray(currentNavItem.requiredPermission)
         ? currentNavItem.requiredPermission.some(p => hasPermission(currentUser, p as any, undefined, undefined, [], activeTenant))
         : hasPermission(currentUser, currentNavItem.requiredPermission as any, undefined, undefined, [], activeTenant);
     const hasModule = !currentNavItem.requiredModule || currentNavItem.requiredModule === 'core' || isModuleEnabled(activeTenant, currentNavItem.requiredModule as any);
     hasAccess = hasRole && hasPerm && hasModule;
  } else {
     // For subtabs not explicitly in UNIFIED_NAV_ITEMS yet (fallback to legacy behavior)
     const allowedLegacyRoles = ['admin', 'system_admin', 'campus_admin', 'supervisor', 'charity_supervisor'];
     if (allowedLegacyRoles.includes(currentUser.role)) {
       hasAccess = true;
     }
  }

  if (!hasAccess) {
    // If the user hit an unauthorized tab (e.g., /admin default overview),
    // try to gracefully redirect them to the first tab they DO have access to.
    const navGroups = getNavigationGroups(currentUser, activeTenant);
    const availablePaths = navGroups.flatMap(g => g.items).map(i => i.path).filter(Boolean) as string[];
    const firstAdminPath = availablePaths.find(p => p.startsWith('/admin'));

    if (firstAdminPath && location.pathname !== firstAdminPath && location.pathname === '/admin') {
      return <Navigate to={firstAdminPath} replace />;
    }

    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center max-w-md mx-auto my-12 shadow-sm">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-black text-slate-900 mb-1">صلاحيات غير كافية</h3>
        <p className="text-xs text-slate-600">عذراً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الوظيفة.</p>
      </div>
    );
  }

  const adminBadges = {
    students: visibleStudents.length,
    teachers: visibleTeachers.length,
    halaqahs: visibleHalaqahs.length,
    admissions: admissionsRequests.filter((r) => !activeTenantId || r.tenantId === activeTenantId).length,
    nominations: associationNominations.filter((n) => !activeTenantId || n.tenantId === activeTenantId).length,
    tracks: tracks.length,
    stages: stages.length,
    archives: archives.length,
    audit: auditLogs.length,
  };

  return (
    <div className="w-full space-y-6">
      {/* Charity Supervisor & Multi-tenant Switching Banner */}
      {(currentUser?.role === 'charity_supervisor' || isSysAdmin) && supervisedTenants.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-700/50">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center shrink-0 border border-white/10">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-sans">
                      {currentUser?.role === 'charity_supervisor' ? 'مشرف عام الجمعية' : 'إدارة المنصة'}
                    </span>
                    <span className="text-xs text-emerald-200 font-medium">
                      {currentOrg ? currentOrg.name : 'المنظومة المركزية'}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white font-serif mt-0.5">
                    إدارة المجمع المحدد: <span className="text-amber-300">{activeTenant?.name || 'مجمع غير محدد'}</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none">
                  <label className="block text-[10px] text-emerald-200 font-bold mb-1">التبديل إلى مجمع آخر:</label>
                  <select
                    value={activeTenantId || ''}
                    onChange={(e) => setActiveTenantId(e.target.value)}
                    className="w-full sm:w-56 bg-slate-950/80 border border-emerald-600 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
                  >
                    {supervisedTenants.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name} ({t.city})
                      </option>
                    ))}
                  </select>
                </div>

                {currentUser?.role === 'charity_supervisor' && (
                  <button
                    onClick={() => navigate('/charity-hq')}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
                    title="العودة إلى تقارير وإحصائيات الإشراف العام"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden md:inline">تقارير الإشراف العام</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {/* TAB 0: OVERVIEW DASHBOARD (Stats, KPIs, Real-time status) */}
          {activeTab === 'overview' && (
            <AdminOverviewDashboard
              students={visibleStudents}
              halaqahs={visibleHalaqahs}
              teachers={visibleTeachers}
              supervisorsCount={visibleSupervisorsCount}
              sessionRecords={visibleRecords}
              spellingLessons={spellingLessons}
              academicConfig={academicConfig}
              activeTenant={activeTenant}
              admissionsCount={admissionsRequests.filter((r) => !activeTenantId || r.tenantId === activeTenantId).length}
              nominationsCount={associationNominations.filter((n) => !activeTenantId || n.tenantId === activeTenantId).length}
              isSysAdmin={isSysAdmin}
              onOpenBadgesModal={() => setShowBadgesModal(true)}
              onOpenRadarModal={() => setShowRadarModal(true)}
              onExportExcel={() => exportStudentsToExcel(visibleStudents, visibleRecords, spellingLessons, academicConfig)}
              onOpenOfficialReport={() => setShowOfficialReport(true)}
            />
          )}

          {/* MEETINGS TAB */}
          {activeTab === 'meetings' && <MeetingsManagementView />}

          {/* TAB 1: ACADEMIC CONFIG */}
          {activeTab === 'academic' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>ضبط العام الدراسي والأسابيع التشغيلية (12 أسبوعاً)</span>
          </h3>

          <form onSubmit={handleSaveAcademic} className="mt-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم العام الدراسي</label>
                <input
                  type="text"
                  value={academicForm.name}
                  onChange={(e) => handleAcademicFormChange({ name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الفصل الدراسي</label>
                <input
                  type="text"
                  value={academicForm.semester}
                  onChange={(e) => handleAcademicFormChange({ semester: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-emerald-800">الأسبوع التشغيلي الحالي</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 font-medium">
                    <input
                      type="checkbox"
                      checked={!!academicForm.manualWeekOverride}
                      onChange={(e) =>
                        handleAcademicFormChange({ manualWeekOverride: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>تحديد يدوي ثابت</span>
                  </label>
                </div>
                {academicForm.manualWeekOverride ? (
                  <select
                    value={academicForm.currentWeek}
                    onChange={(e) =>
                      handleAcademicFormChange({ currentWeek: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-amber-500 bg-amber-50/50 font-black text-amber-900"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 3).map((w) => (
                      <option key={w} value={w}>
                        الأسبوع {w} (تثبيت يدوي)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/70 text-emerald-900 flex items-center justify-between">
                    <span className="font-black text-sm">الأسبوع {academicForm.currentWeek}</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      محسوب آلياً بالتقويم
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ بداية الفصل الدراسي (التقويم الفعلي)</label>
                <input
                  type="date"
                  value={academicForm.startDate}
                  onChange={(e) => handleAcademicFormChange({ startDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ نهاية الفصل الدراسي</label>
                <input
                  type="date"
                  value={academicForm.endDate}
                  onChange={(e) => handleAcademicFormChange({ endDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">بداية المرحلة (رقم الأسبوع)</label>
                <input
                  type="number"
                  value={academicForm.operationalStartWeek}
                  onChange={(e) =>
                    handleAcademicFormChange({
                      operationalStartWeek: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">نهاية المرحلة (رقم الأسبوع)</label>
                <input
                  type="number"
                  value={academicForm.operationalEndWeek}
                  onChange={(e) =>
                    handleAcademicFormChange({
                      operationalEndWeek: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">درجة اجتياز الهجاء (%)</label>
                <input
                  type="number"
                  value={academicForm.spellingPassingThreshold}
                  onChange={(e) =>
                    handleAcademicFormChange({
                      spellingPassingThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            {/* Minimum Grade Targets Across All Educational Stages */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>الحد الأدنى والمخرج القرآني المعتمد للمراحل التعليمية:</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  يشمل كامل مراحل المجمع (من البراعم إلى الجامعيين)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {stages.map((stage) => {
                  const stageKey = stage.id;
                  const currentSurah =
                    academicForm.gradeTargets?.[stageKey]?.minSurah ||
                    (stageKey === 'baraem' && academicForm.gradeTargets?.tamheedi?.minSurah) ||
                    stage.defaultTargetSurah ||
                    'الغاشية';

                  return (
                    <div
                      key={stage.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              stage.accentColor === 'emerald'
                                ? 'bg-emerald-500'
                                : stage.accentColor === 'blue'
                                ? 'bg-blue-500'
                                : stage.accentColor === 'amber'
                                ? 'bg-amber-500'
                                : stage.accentColor === 'teal'
                                ? 'bg-teal-500'
                                : stage.accentColor === 'purple'
                                ? 'bg-purple-500'
                                : 'bg-indigo-500'
                            }`}
                          />
                          {stage.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {stage.ageRange}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 mb-2">
                        الصفوف: <strong className="text-slate-800">{(stage.targetGrades || []).join('، ')}</strong>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-slate-500 font-medium">السورة المرجعية للحد الأدنى:</label>
                        <select
                          value={currentSurah}
                          onChange={(e) => {
                            const newTargets = {
                              ...academicForm.gradeTargets,
                              [stageKey]: { minSurah: e.target.value, label: stage.name },
                            };
                            if (stageKey === 'baraem') {
                              newTargets.tamheedi = { minSurah: e.target.value };
                              newTargets.grade1 = { minSurah: e.target.value };
                            }
                            handleAcademicFormChange({
                              gradeTargets: newTargets,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-medium text-slate-800 focus:outline-emerald-600"
                        >
                          {SURAHS_LIST.map((s) => (
                            <option key={s.number} value={s.name}>
                              سورة {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {stage.targetQuranAmount && (
                        <div className="mt-2 text-[10px] text-amber-900 bg-amber-50/80 px-2 py-1 rounded border border-amber-200/60 font-semibold">
                          المقدار: {stage.targetQuranAmount}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              {configSaved ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>تم حفظ الإعدادات بنجاح!</span>
                </span>
              ) : (
                <span></span>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                حفظ الإعدادات الأكاديمية
              </button>
            </div>
          </form>

          {/* Dynamic Reference Quran Outcome Card */}
          <div className="mt-8 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-2xl p-6 border-2 border-amber-300 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-200/80 text-amber-950 font-bold">
                  <Target className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm md:text-base">
                    المخرج القرآني المرجعي للمجمع / المرحلة
                  </h3>
                  <p className="text-xs text-slate-600">
                    تعديل واعتماد الصياغة الرسمية للمخرج القرآني وتحديد السورة المستهدفة والمجمع المعني
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                {isSysAdmin
                  ? 'صلاحية مدير النظام العام (لكافة المجمعات)'
                  : 'صلاحية مدير المجمع (خاص بمجمعك)'}
              </span>
            </div>

            <form onSubmit={handleSaveAcademicOutcome} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    نص المخرج القرآني المرجعي المعتمد (العبارة الرسمية)
                  </label>
                  <input
                    type="text"
                    value={outcomeForm.outcomeText}
                    onChange={(e) => setOutcomeForm({ ...outcomeForm, outcomeText: e.target.value })}
                    placeholder="مثال: «متقنٌ لهجاء القرآن وحفظه إلى الغاشية»"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-amber-300 focus:border-amber-600 focus:outline-none bg-white shadow-inner"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    هذا النص ينعكس فوراً في لوحة التحكم، شاشة المخرج القرآني، والتقارير المطبوعة ورسائل الواتساب.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    السورة المستهدفة للمخرج
                  </label>
                  <select
                    value={outcomeForm.targetSurah}
                    onChange={(e) => {
                      const newSurah = e.target.value;
                      setOutcomeForm((prev) => ({
                        ...prev,
                        targetSurah: newSurah,
                        outcomeText: prev.outcomeText.includes('إلى')
                          ? prev.outcomeText.replace(/إلى\s+[^\s»]+/, `إلى ${newSurah}`)
                          : `«متقنٌ لهجاء القرآن وحفظه إلى ${newSurah}»`,
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-amber-300 focus:border-amber-600 focus:outline-none bg-white"
                  >
                    {SURAHS_LIST.map((surah) => (
                      <option key={surah.number} value={surah.name}>
                        سورة {surah.name} (رقم {surah.number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Mosque Complex selection for system_admin */}
              {isSysAdmin && (
                <div className="pt-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    المجمع المستهدف بالتعديل:
                  </label>
                  <select
                    value={outcomeForm.tenantId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      const selectedT = tenants.find((t) => t.id === tId);
                      setOutcomeForm({
                        tenantId: tId,
                        outcomeText: selectedT?.referenceOutcome || `«متقنٌ لهجاء القرآن وحفظه إلى ${selectedT?.targetSurahDefault || 'الغاشية'}»`,
                        targetSurah: selectedT?.targetSurahDefault || 'الغاشية',
                      });
                    }}
                    className="w-full sm:w-80 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Explanatory Notice */}
              <div className="p-3.5 rounded-xl bg-amber-100/60 border border-amber-300 text-slate-800 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <strong>دليل الصلاحيات وسريان التعديل:</strong>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-700">
                    <li><strong>مدير النظام العام:</strong> يملك صلاحية تعديل المخرج لأي مجمع أو تعميمه لكافة المجمعات.</li>
                    <li><strong>مدير المجمع:</strong> يملك صلاحية تعديل المخرج الخاص بمجمعه التعليمي.</li>
                    <li><strong>الأثر الفوري:</strong> ينعكس التعديل فوراً في لوحة التحكم، شاشة المخرج القرآني، نماذج الخطط، رسائل الواتساب، والتقارير المطبوعة الرسمية.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {outcomeSaved ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ وتحديث المخرج القرآني المرجعي بنجاح وسرى فورياً على النظام!</span>
                  </span>
                ) : (
                  <span></span>
                )}

                <button
                  type="submit"
                  disabled={outcomeSaving}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{outcomeSaving ? 'جارٍ الحفظ...' : 'اعتماد وحفظ المخرج القرآني'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: CURRICULUM & TEMPLATES ARCHITECTURE */}
      {activeTab === 'curriculum' && <CurriculumTemplatesTab />}

      {/* TAB 2: STUDENTS MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            {/* Title & Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">قائمة طلاب المجمع المسجلين</h3>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {visibleStudents.length} طالب
                </span>
              </div>
            </div>

            {/* Actions Row in a new dedicated line */}
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => setIsBulkTransferOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span className="hidden sm:inline">نقل جماعي / حلقة</span>
                <span className="sm:hidden">نقل جماعي</span>
              </button>
              <button
                onClick={() => {
                  setIsNewStudent(true);
                  const firstH = visibleHalaqahs[0];
                  const firstT = teachers.find((t) => t.id === firstH?.teacherId) || users.find((u) => u.id === firstH?.teacherId);
                  setEditingStudent({
                    fullName: '',
                    grade: 'صف أول',
                    halaqahId: firstH?.id || '',
                    halaqahName: firstH?.name || '',
                    teacherId: firstH?.teacherId || '',
                    teacherName: firstT?.name || (firstT as any)?.fullName || firstH?.teacherName || '',
                    registrationType: 'full_package',
                    registrationTypeLabel: 'باقة الاشتراك الكامل',
                    parentPhone: '0500000000',
                    currentSurah: 'الناس',
                    currentAyah: 1,
                    minimumTargetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
                    currentSpellingScore: 85,
                    status: 'on_track',
                    isActive: true,
                    tenantId: activeTenantId,
                  });
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">إضافة طالب جديد</span>
                <span className="sm:hidden">إضافة طالب</span>
              </button>
            </div>

            {/* In-App Feedback Notification Banner for Student Actions */}
            {studentActionNotice && (
              <div
                className={`mb-3 p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs border transition-all ${
                  studentActionNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{studentActionNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentActionNotice(null)}
                  className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Filter Bar (الكل - طلاب البرامج - طلاب الحلقات - طلاب النشاط) */}
            <div className="pt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setStudentCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  studentCategoryFilter === 'all'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>الكل</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    studentCategoryFilter === 'all' ? 'bg-emerald-950/40 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {visibleStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudentCategoryFilter('programs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  studentCategoryFilter === 'programs'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>طلاب البرامج</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    studentCategoryFilter === 'programs' ? 'bg-emerald-950/40 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {programsStudentsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudentCategoryFilter('halaqah')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  studentCategoryFilter === 'halaqah'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>طلاب الحلقات</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    studentCategoryFilter === 'halaqah' ? 'bg-emerald-950/40 text-emerald-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {halaqahStudentsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudentCategoryFilter('activities')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  studentCategoryFilter === 'activities'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>طلاب النشاط</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    studentCategoryFilter === 'activities' ? 'bg-amber-950/40 text-amber-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {activitiesStudentsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudentCategoryFilter('archived')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  studentCategoryFilter === 'archived'
                    ? 'bg-rose-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>مؤرشف</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    studentCategoryFilter === 'archived' ? 'bg-rose-950/40 text-rose-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {archivedStudentsCount}
                </span>
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE VIEW (MD, LG, XL, 2XL) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3.5">الاسم الكامل</th>
                  <th className="p-3.5">الصف</th>
                  <th className="p-3.5">نوع التسجيل</th>
                  <th className="p-3.5">الحلقة</th>
                  <th className="p-3.5">المعلم المسؤول</th>
                  <th className="p-3.5">جوال ولي الأمر</th>
                  <th className="p-3.5">السورة الحالية</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mainCategoryStudents.length === 0 && activitySectionStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا يوجد طلاب مسجلون ضمن هذا التصنيف حالياً
                    </td>
                  </tr>
                ) : (
                  <>
                    {mainCategoryStudents.map((s) => {
                      const halaqah = halaqahs.find((h) => h.id === s.halaqahId);
                      const teacherDisplayName = getStudentTeacherDisplayName(s, halaqah);
                      const regType = getStudentRegistrationType(s);

                      return (
                        <tr
                          key={s.id}
                          className={
                            s.isArchived
                              ? 'opacity-60 bg-slate-100/70 border-b border-dashed border-slate-300 hover:opacity-85 transition-all'
                              : 'hover:bg-slate-50 transition-colors'
                          }
                        >
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{s.fullName}</span>
                              {s.isArchived && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                  <Archive className="w-2.5 h-2.5 text-rose-700" />
                                  <span>مؤرشف</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600">{s.grade}</td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                regType
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/60'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {regType ? <Sparkles className="w-3 h-3 text-indigo-600" /> : null}
                              <span>{regType || 'باقة عامة'}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-emerald-800 font-semibold">
                            {getStudentCategory(s) === 'activities' ? (
                              <span className="text-slate-400 italic text-[11px]">بدون حلقة (نشاط)</span>
                            ) : (
                              halaqah?.name || 'غير محدد'
                            )}
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium">
                            {getStudentCategory(s) === 'activities' ? (
                              <span className="text-slate-400 italic text-[11px]">غير ملزم</span>
                            ) : (
                              <span className={teacherDisplayName === 'غير محدد' ? 'text-amber-700 font-normal' : 'text-slate-800 font-bold'}>
                                {teacherDisplayName}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">{s.parentPhone}</td>
                          <td className="p-3.5 font-bold text-blue-900">سورة {s.currentSurah || 'الفاتحة'}</td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewingHistoryStudent(s)}
                                className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                title="عرض السجل التراكمي وتاريخ الفصول المؤرشفة"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              {!s.isArchived && (
                                <button
                                  onClick={() => {
                                    setTransferringStudent(s);
                                    setTransferHalaqahId(s.halaqahId);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                                  title="نقل لحلقة أخرى"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                              )}
                              {s.isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStudentArchive(s)}
                                  className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                                  title="إلغاء الأرشفة وتفعيل الطالب"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStudentArchive(s)}
                                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="أرشفة الطالب"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsNewStudent(false);
                                  setEditingStudent(s);
                                }}
                                className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="تعديل البيانات"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStudentToDelete(s)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="حذف الطالب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Activity Students subtle separator when 'all' is selected */}
                    {studentCategoryFilter === 'all' && activitySectionStudents.length > 0 && (
                      <tr className="bg-amber-50/20 border-t border-slate-200">
                        <td colSpan={8} className="py-2.5 px-4">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span className="font-bold text-slate-800">طلاب باقة الأنشطة والبرامج</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold font-mono">
                                {activitySectionStudents.length} طالب
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              مسجلون في الأنشطة والفعاليات العامة فقط (غير ملزمين بحلقة قرآنية)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Activity Students rows */}
                    {activitySectionStudents.map((s) => {
                      return (
                        <tr
                          key={s.id}
                          className={
                            s.isArchived
                              ? 'opacity-60 bg-slate-100/70 border-b border-dashed border-slate-300 hover:opacity-85 transition-all'
                              : 'bg-amber-50/10 hover:bg-amber-50/30 transition-colors'
                          }
                        >
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{s.fullName}</span>
                              {s.isArchived && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                  <Archive className="w-2.5 h-2.5 text-rose-700" />
                                  <span>مؤرشف</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600">{s.grade}</td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>باقة الأنشطة والبرامج</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 italic text-[11px]">بدون حلقة (نشاط)</td>
                          <td className="p-3.5 text-slate-400 italic text-[11px]">غير ملزم</td>
                          <td className="p-3.5 font-mono text-slate-600">{s.parentPhone}</td>
                          <td className="p-3.5 text-slate-400 italic text-[11px]">بدون حفظ</td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewingHistoryStudent(s)}
                                className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                title="عرض السجل التراكمي وتاريخ الفصول المؤرشفة"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              {s.isArchived ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStudentArchive(s)}
                                  className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                                  title="إلغاء الأرشفة وتفعيل الطالب"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStudentArchive(s)}
                                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="أرشفة الطالب"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsNewStudent(false);
                                  setEditingStudent(s);
                                }}
                                className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="تعديل البيانات"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStudentToDelete(s)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="حذف الطالب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW (320px - 767px) */}
          <div className="block md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/40">
            {mainCategoryStudents.length === 0 && activitySectionStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                لا يوجد طلاب مسجلون ضمن هذا التصنيف حالياً
              </div>
            ) : (
              <>
                {mainCategoryStudents.map((s) => {
                  const halaqah = halaqahs.find((h) => h.id === s.halaqahId);
                  const teacherDisplayName = getStudentTeacherDisplayName(s, halaqah);
                  const regType = getStudentRegistrationType(s);
                  const cleanPhone = (s.parentPhone || '').replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('05') ? `966${cleanPhone.substring(1)}` : cleanPhone;

                  return (
                    <div
                      key={s.id}
                      className={
                        s.isArchived
                          ? 'bg-slate-50/80 opacity-65 border border-dashed border-slate-300 rounded-2xl p-3.5 shadow-2xs hover:opacity-90 transition-all space-y-3'
                          : 'bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs hover:border-slate-300 transition-all space-y-3'
                      }
                    >
                      {/* Card Header: Student Name & Grade */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm leading-tight">{s.fullName}</h4>
                            {s.isArchived && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                <Archive className="w-3 h-3 text-rose-700" />
                                <span>مؤرشف</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {s.grade || 'صف أول'}
                            </span>
                            {!s.isArchived && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {s.isActive ? 'منتظم' : 'غير نشط'}
                              </span>
                            )}
                            {regType ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200/60 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                <span>{regType}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200/50">
                                باقة عامة
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200/80 font-serif shrink-0">
                          سورة {s.currentSurah || 'الفاتحة'}
                        </span>
                      </div>

                      {/* Card Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">الحلقة القرآنية</span>
                          <div className="font-bold text-emerald-900 truncate">
                            {halaqah?.name || 'غير محدد'}
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">المعلم المسؤول</span>
                          <div className="font-bold text-slate-800 truncate" title={teacherDisplayName}>
                            <span className={teacherDisplayName === 'غير محدد' ? 'text-amber-700 font-normal' : 'text-slate-800 font-bold'}>
                              {teacherDisplayName}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-2 p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block">جوال ولي الأمر</span>
                            <a
                              href={`tel:${s.parentPhone}`}
                              className="font-mono font-bold text-slate-800 hover:text-emerald-700 text-xs"
                              dir="ltr"
                            >
                              {s.parentPhone || '—'}
                            </a>
                          </div>

                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، بخصوص الطالب: ${s.fullName}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs"
                            >
                              واتساب
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className={`grid ${s.isArchived ? 'grid-cols-4' : 'grid-cols-5'} gap-1.5 pt-2 border-t border-slate-100`}>
                        <button
                          type="button"
                          onClick={() => setViewingHistoryStudent(s)}
                          className="py-1.5 px-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                          title="عرض السجل التراكمي"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>السجل</span>
                        </button>

                        {!s.isArchived && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferringStudent(s);
                              setTransferHalaqahId(s.halaqahId);
                            }}
                            className="py-1.5 px-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            title="نقل لحلقة أخرى"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>نقل</span>
                          </button>
                        )}

                        {s.isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentArchive(s)}
                            className="py-1.5 px-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            title="إلغاء الأرشفة وتفعيل الطالب"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تفعيل</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentArchive(s)}
                            className="py-1.5 px-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            title="أرشفة الطالب"
                          >
                            <Archive className="w-3.5 h-3.5 text-rose-700" />
                            <span>أرشفة</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsNewStudent(false);
                            setEditingStudent(s);
                          }}
                          className="py-1.5 px-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentToDelete(s)}
                          className="py-1.5 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="حذف الطالب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Activity separator in mobile view when 'all' is selected */}
                {studentCategoryFilter === 'all' && activitySectionStudents.length > 0 && (
                  <div className="pt-3 pb-1 border-t border-slate-200 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>طلاب باقة الأنشطة والبرامج</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold font-mono">
                        {activitySectionStudents.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">غير ملزم بحلقة</span>
                  </div>
                )}

                {/* Activity Students mobile cards */}
                {activitySectionStudents.map((s) => {
                  const cleanPhone = (s.parentPhone || '').replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('05') ? `966${cleanPhone.substring(1)}` : cleanPhone;

                  return (
                    <div
                      key={s.id}
                      className={
                        s.isArchived
                          ? 'bg-slate-50/80 opacity-65 border border-dashed border-slate-300 rounded-2xl p-3.5 shadow-2xs hover:opacity-90 transition-all space-y-3'
                          : 'bg-amber-50/20 rounded-2xl border border-amber-200/70 p-3.5 shadow-xs hover:border-amber-300 transition-all space-y-3'
                      }
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-amber-100/60">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm leading-tight">{s.fullName}</h4>
                            {s.isArchived && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                <Archive className="w-3 h-3 text-rose-700" />
                                <span>مؤرشف</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {s.grade || 'صف أول'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>باقة الأنشطة والبرامج</span>
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100/70 text-amber-900 border border-amber-200 shrink-0">
                          أنشطة فقط
                        </span>
                      </div>

                      {/* Card Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white border border-amber-100/80 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">نوع المسار</span>
                          <div className="font-bold text-amber-900 truncate">أنشطة وفعاليات عامة</div>
                        </div>

                        <div className="p-2 rounded-xl bg-white border border-slate-100 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">الحلقة القرآنية</span>
                          <div className="font-medium text-slate-400 truncate italic">غير ملزم بحلقة</div>
                        </div>

                        <div className="col-span-2 p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block">جوال ولي الأمر</span>
                            <a
                              href={`tel:${s.parentPhone}`}
                              className="font-mono font-bold text-slate-800 hover:text-emerald-700 text-xs"
                              dir="ltr"
                            >
                              {s.parentPhone || '—'}
                            </a>
                          </div>

                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، بخصوص الطالب: ${s.fullName}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs"
                            >
                              واتساب
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-amber-100/60">
                        <button
                          type="button"
                          onClick={() => setViewingHistoryStudent(s)}
                          className="py-1.5 px-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                          title="عرض السجل التراكمي"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>السجل</span>
                        </button>

                        {s.isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentArchive(s)}
                            className="py-1.5 px-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            title="إلغاء الأرشفة وتفعيل الطالب"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تفعيل</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentArchive(s)}
                            className="py-1.5 px-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            title="أرشفة الطالب"
                          >
                            <Archive className="w-3.5 h-3.5 text-rose-700" />
                            <span>أرشفة</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsNewStudent(false);
                            setEditingStudent(s);
                          }}
                          className="py-1.5 px-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStudentToDelete(s)}
                          className="py-1.5 px-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="حذف الطالب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEACHERS MANAGEMENT */}
      {activeTab === 'teachers' && <TeachersManagementTab />}

      {/* TAB 4: HALAQAHS MANAGEMENT */}
      {activeTab === 'halaqahs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top Header & Balanced Action Buttons */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-xs">
                <BookOpen className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                    الحلقات القرآنية
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                    {visibleHalaqahs.length} حلقة
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                  {activeTenant?.name ? `إدارة ومتابعة حلقات ${activeTenant.name}` : 'إدارة الحلقات والمسارات والمعلمين'}
                </p>
              </div>
            </div>

            {/* Exactly Equal & Responsive Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowArchivedModal(true)}
                className="h-10 sm:h-10 px-3 sm:px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/70 active:scale-[0.98] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                title="سجل وأرشيف الحلقات المحذوفة وإمكانية استعادتها"
              >
                <Archive className="w-4 h-4 shrink-0 text-amber-700" />
                <span>أرشيف الحلقات ({visibleArchivedHalaqahs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBulkOnlineModalOpen(true)}
                className="h-10 sm:h-10 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 min-w-0 sm:min-w-[150px] text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="تفعيل التعليم عن بعد وتعيين المواعيد لعدة أو كل الحلقات دفعة واحدة"
              >
                <Video className="w-4 h-4 shrink-0 text-blue-100" />
                <span className="truncate">تفعيل عن بُعد (Online)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBulkScheduleModalOpen(true)}
                className="h-10 px-3 sm:px-4 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 hover:border-emerald-400 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                title="تطبيق مواعيد الصلاة أو التوقيت الثابت على عدة حلقات دفعة واحدة"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">تعميم المواعيد بالجملة</span>
                <span className="sm:hidden">تعميم بالجملة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsNewHalaqah(true);
                  setEditingHalaqah({
                    name: '',
                    grade: 'صف أول',
                    targetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
                    teacherId: visibleTeachers[0]?.id || '',
                    tenantId: activeTenantId,
                    defaultTimeType: 'prayer',
                    defaultStartPrayerOffset: { prayer: 'maghrib', offsetMinutes: 0 },
                    defaultEndPrayerOffset: { prayer: 'isha', offsetMinutes: 0 },
                    defaultStartTime: '16:00',
                    defaultEndTime: '18:00',
                  });
                }}
                className="h-10 sm:h-10 px-3 sm:px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 min-w-0 sm:min-w-[170px] text-center focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <Plus className="w-4 h-4 shrink-0 text-emerald-100" />
                <span className="truncate">إضافة حلقة جديدة</span>
              </button>
            </div>
          </div>

          {visibleHalaqahs.length === 0 ? (
            <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">لا توجد حلقات قرآنية مسجلة</h4>
              <p className="text-xs text-slate-500 mb-4 max-w-sm leading-relaxed">
                لم يتم إضافة أي حلقة قرآنية حتى الآن في هذا النطاق. اضغط على الزر أدناه لإضافة أول حلقة.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsNewHalaqah(true);
                  setEditingHalaqah({
                    name: '',
                    grade: 'صف أول',
                    targetSurah: activeTenant?.targetSurahDefault || 'الغاشية',
                    teacherId: visibleTeachers[0]?.id || '',
                    tenantId: activeTenantId,
                    defaultTimeType: 'prayer',
                    defaultStartPrayerOffset: { prayer: 'maghrib', offsetMinutes: 0 },
                    defaultEndPrayerOffset: { prayer: 'isha', offsetMinutes: 0 },
                    defaultStartTime: '16:00',
                    defaultEndTime: '18:00',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حلقة جديدة</span>
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (MD, LG, XL, 2XL) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">اسم الحلقة</th>
                      <th className="py-3.5 px-4 font-bold">المرحلة / الصف</th>
                      <th className="py-3.5 px-4 font-bold">الموعد والجدول</th>
                      <th className="py-3.5 px-4 font-bold">السورة المستهدفة</th>
                      <th className="py-3.5 px-4 font-bold">المسارات المفعلة</th>
                      <th className="py-3.5 px-4 font-bold">المعلم المسؤول</th>
                      <th className="py-3.5 px-4 font-bold text-center">الطلاب</th>
                      <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleHalaqahs.map((h) => {
                      const teacher = teachers.find((t) => t.id === h.teacherId) || users.find((u) => u.id === h.teacherId);
                      const teacherDisplayName = teacher?.name || h.teacherName || 'غير محدد';
                      const count = visibleStudents.filter((s) => s.halaqahId === h.id).length;
                      const activeTracks = (h.activeTrackIds || ['track_quran', 'track_spelling', 'track_virtues'])
                        .map((tid) => tracks.find((tr) => tr.id === tid) || { id: tid, shortName: tid === 'track_quran' ? 'القرآن الكريم' : tid === 'track_spelling' ? 'الهجاء القرآني' : tid === 'track_virtues' ? 'القيم والتربية' : tid })
                        .filter(Boolean);

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">{h.name}</span>
                              {h.onlineConfig?.enabled && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold"
                                  title={`حلقة عن بعد مفعّلة (${h.onlineConfig.startTime || '16:00'} - ${h.onlineConfig.endTime || '18:00'})`}
                                >
                                  <Video className="w-3 h-3 text-blue-600" />
                                  <span>عن بعد</span>
                                </span>
                              )}
                              {h.assistantTeachers && h.assistantTeachers.length > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  +{h.assistantTeachers.length} مساعد
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                              {h.grade || 'صف أول'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 max-w-[220px]">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[11px] font-bold font-mono"
                                title={formatHalaqahWeeklySummary(h, prayerTimesToday)}
                              >
                                <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span className="truncate">{formatHalaqahWeeklySummary(h, prayerTimesToday)}</span>
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200/70 text-xs font-bold">
                              <Target className="w-3 h-3 text-blue-600" />
                              <span>سورة {h.targetSurah || 'الفاتحة'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {activeTracks.map((tr) => {
                                const isQuran = tr.id === 'track_quran';
                                const isSpelling = tr.id === 'track_spelling';
                                const isVirtues = tr.id === 'track_virtues';
                                const isTilawah = tr.id === 'track_tilawah';
                                
                                const colorClass = isQuran
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                  : isSpelling
                                  ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                  : isVirtues
                                  ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                                  : isTilawah
                                  ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                                  : 'bg-slate-50 text-slate-700 border-slate-200';

                                return (
                                  <span
                                    key={tr.id}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass}`}
                                  >
                                    {tr.shortName || tr.id}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{teacherDisplayName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                              {count} طلاب
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsNewHalaqah(false);
                                  setEditingHalaqah(h);
                                }}
                                className="p-2 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors"
                                title="تعديل بيانات الحلقة"
                                aria-label={`تعديل ${h.name}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHalaqahToDelete(h);
                                  setDeleteArchiveReason('');
                                }}
                                className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="حذف ونقل الحلقة للأرشيف"
                                aria-label={`حذف ${h.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (320px - 767px) */}
              <div className="block md:hidden p-3 sm:p-4 space-y-3 bg-slate-50/40">
                {visibleHalaqahs.map((h) => {
                  const teacher = teachers.find((t) => t.id === h.teacherId) || users.find((u) => u.id === h.teacherId);
                  const teacherDisplayName = teacher?.name || h.teacherName || 'غير محدد';
                  const count = visibleStudents.filter((s) => s.halaqahId === h.id).length;
                  const activeTracks = (h.activeTrackIds || ['track_quran', 'track_spelling', 'track_virtues'])
                    .map((tid) => tracks.find((tr) => tr.id === tid) || { id: tid, shortName: tid === 'track_quran' ? 'القرآن الكريم' : tid === 'track_spelling' ? 'الهجاء القرآني' : tid === 'track_virtues' ? 'القيم والتربية' : tid })
                    .filter(Boolean);

                  return (
                    <div
                      key={h.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                    >
                      {/* Card Header: Name, Online Pill, and Student Count */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-slate-900 text-sm leading-snug break-words">
                            {h.name}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {h.onlineConfig?.enabled && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold"
                                title={`عن بعد: ${h.onlineConfig.startTime || '16:00'} - ${h.onlineConfig.endTime || '18:00'}`}
                              >
                                <Video className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>عن بعد ({h.onlineConfig.startTime || '16:00'} - {h.onlineConfig.endTime || '18:00'})</span>
                              </span>
                            )}
                            {h.assistantTeachers && h.assistantTeachers.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                +{h.assistantTeachers.length} مساعد
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-black shrink-0">
                          <Users className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{count} طلاب</span>
                        </span>
                      </div>

                      {/* Smart Schedule Summary Pill */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-emerald-50/50 p-2 rounded-xl border border-emerald-200/70 font-mono">
                        <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="font-bold truncate">{formatHalaqahWeeklySummary(h, prayerTimesToday)}</span>
                      </div>

                      {/* Card Meta Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Teacher */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            المعلم المسؤول
                          </span>
                          <div className="font-bold text-slate-800 truncate" title={teacherDisplayName}>
                            {teacherDisplayName}
                          </div>
                        </div>

                        {/* Grade / Stage */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            المرحلة / الصف
                          </span>
                          <div className="font-bold text-slate-700 truncate">
                            {h.grade || 'صف أول'}
                          </div>
                        </div>

                        {/* Target Surah */}
                        <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 col-span-2 min-w-0">
                          <span className="text-[10px] font-bold text-blue-600 block mb-0.5">
                            السورة أو المنهج المستهدف
                          </span>
                          <div className="font-black text-blue-950 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>سورة {h.targetSurah || 'الفاتحة'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Tracks Section */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 block">
                          المسارات التعليمية المفعلة:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeTracks.map((tr) => {
                            const isQuran = tr.id === 'track_quran';
                            const isSpelling = tr.id === 'track_spelling';
                            const isVirtues = tr.id === 'track_virtues';
                            const isTilawah = tr.id === 'track_tilawah';

                            const colorClass = isQuran
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                              : isSpelling
                              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                              : isVirtues
                              ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                              : isTilawah
                              ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                              : 'bg-slate-50 text-slate-700 border-slate-200';

                            return (
                              <span
                                key={tr.id}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClass}`}
                              >
                                {tr.shortName || tr.id}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Action Buttons Footer */}
                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewHalaqah(false);
                            setEditingHalaqah(h);
                          }}
                          className="h-10 py-2 px-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>تعديل الحلقة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setHalaqahToDelete(h);
                            setDeleteArchiveReason('');
                          }}
                          className="h-10 py-2 px-3 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>حذف ونقل للأرشيف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 5: DATABASE BACKUP & RESTORE & MIGRATION HUB */}
      {activeTab === 'backup' && (
        <AdminBackupMigrationHub />
      )}

      {/* TAB 6: LOGOS & BRAND IDENTITY */}
      {activeTab === 'logos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-800">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">إدارة شعارات وهوية المنظومة المعتمدة</h3>
                  <p className="text-xs text-slate-600">
                    تخصيص شعار جامع الغزاوي وشعار مرحلة البراعم، أو استعادة التصاميم المعتمدة
                  </p>
                </div>
              </div>

              {(mosqueLogoUrl || stageLogoUrl) && (
                <button
                  onClick={resetLogos}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>استعادة الشعارات المعتمدة الأصلية</span>
                </button>
              )}
            </div>

            {/* Primary Mosque Identity Card */}
            <div className="mt-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50/50 to-emerald-50/30 border-2 border-amber-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                      شعار المجمع الرسمي الأساسي
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {mosqueLogoUrl ? 'شعار مخصص معتمد' : 'الشعار المعتمد للمسجد'}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    شعار المجمع الرسمي العام (Mosque Complex Logo)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                    الهوية البصرية الرسمية الثابتة لكافة أطراف المنظومة (الهيدر العام، تقارير الإنجاز، شاشات الدخول، وبطاقات المجمع).
                  </p>

                  <div className="flex items-center gap-3 mt-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>{mosqueLogoUrl ? 'استبدال شعار المجمع' : 'رفع شعار مخصص للمجمع'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setMosqueLogoUrl(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {mosqueLogoUrl && (
                      <button
                        onClick={() => setMosqueLogoUrl(null)}
                        className="py-2 px-3 text-xs text-rose-600 hover:text-rose-800 font-semibold rounded-xl hover:bg-rose-50 border border-slate-200"
                      >
                        استعادة الشعار الأصلي
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-36 h-36 p-4 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-xs shrink-0">
                  <MosqueLogo size="xl" />
                </div>
              </div>
            </div>

            {/* Dynamic Stage Logos Management */}
            <div className="mt-8">
              <StageLogosManagement />
            </div>

            {/* Display Locations Guide */}
            <div className="mt-8 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>أماكن ظهور وتكامل الشعارات عبر المنظومة:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div>
                    <strong className="text-slate-900 block">شريط التنقل العلوي:</strong>
                    <span>شعار المسجد والمرحلة بجوار اسم المنصة في كافة الشاشات.</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div>
                    <strong className="text-slate-900 block">البنر الترحيبي العام:</strong>
                    <span>عرض كامل للشعارات والأركان الخمسة مع شعار «نغرس اليوم لنحصد غداً».</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div>
                    <strong className="text-slate-900 block">سجلات وكشوفات الهجاء المطبوعة:</strong>
                    <span>الترويسة الرسمية المعتمدة لطباعة تقارير الإتقان للطلاب.</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div>
                    <strong className="text-slate-900 block">نافذة تسجيل دخول الكادر:</strong>
                    <span>ترويسة نافذة تسجيل الدخول للمديرين والمشرفين والمعلمين.</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div>
                    <strong className="text-slate-900 block">التذييل المؤسسي:</strong>
                    <span>أسفل كل صفحات النظام مع عبارة المخرج المرجعي.</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div>
                    <strong className="text-slate-900 block">المرتكزات والهوية التربوية:</strong>
                    <span>بطاقة الركائز الخمس (قرآن، إيمان، آداب، نشاط، تميز) والقيم الثلاث.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT LOG & COMPLIANCE (سجل العمليات والرقابة السحابي) */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Status & Overview Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-800">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">سجل الرقابة وتتبع العمليات السحابي (Audit Log)</h3>
                <p className="text-xs text-slate-600">
                  سجل غير قابل للتعديل يوثق كافة العمليات الحساسة: من قام بالعملية، نوعها، القيمة السابقة والجديدة، والتوقيت الزمني الدقيق.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>قاعدة بيانات فايربيس السحابية: متصلة</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                إجمالي العمليات: {auditLogs.length}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="بحث باسم المستخدم أو الطالب أو الإجراء..."
                className="w-full pl-3 pr-9 py-2 bg-slate-50 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-600 font-bold whitespace-nowrap">نوع العملية:</span>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs"
              >
                <option value="all">كافة العمليات</option>
                <option value="create">إضافة جديدة (create)</option>
                <option value="update">تعديل سجل (update)</option>
                <option value="delete">حذف سجل (delete)</option>
                <option value="transfer">نقل حلقة (transfer)</option>
                <option value="change_password">تغيير كلمة مرور (change_password)</option>
                <option value="bulk_attendance">تحضير جماعي (bulk_attendance)</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700">لا توجد سجلات عمليات مسجلة بعد</div>
                <p className="text-xs text-slate-500">
                  كافة التعديلات والإضافات المستقبلية في المنظومة سيتم توثيقها هنا فورياً.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap">التوقيت</th>
                      <th className="p-3.5 whitespace-nowrap">المستخدم (المُنفِّذ)</th>
                      <th className="p-3.5 whitespace-nowrap">نوع الإجراء</th>
                      <th className="p-3.5 whitespace-nowrap">المستهدف / السجل</th>
                      <th className="p-3.5 whitespace-nowrap">تفاصيل التغيير (القديم ← الجديد)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs
                      .filter((log) => {
                        const matchesSearch =
                          !auditSearch ||
                          log.userName?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.entityName?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.entityType?.toLowerCase().includes(auditSearch.toLowerCase());
                        const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
                        return matchesSearch && matchesAction;
                      })
                      .map((log) => {
                        const getActionBadge = (action: string) => {
                          switch (action) {
                            case 'create':
                              return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">إضافة جديدة</span>;
                            case 'update':
                              return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">تعديل</span>;
                            case 'delete':
                              return <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">حذف</span>;
                            case 'transfer':
                              return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]">نقل حلقة</span>;
                            case 'password_change':
                              return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">تغيير كلمة مرور</span>;
                            case 'bulk_attendance':
                              return <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">تحضير جماعي</span>;
                            default:
                              return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">{action}</span>;
                          }
                        };

                        const formattedDate = new Date(log.timestamp).toLocaleString('ar-SA', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        });

                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {formattedDate}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900">{log.userName || 'النظام'}</div>
                              <div className="text-[10px] text-slate-500">{log.userRole}</div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {getActionBadge(log.action)}
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-800">{log.entityName || log.entityId}</div>
                              <div className="text-[10px] text-slate-500">الجدول: {log.entityType}</div>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] max-w-xs">
                              {log.previousValue || log.newValue ? (
                                <details className="cursor-pointer group">
                                  <summary className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px]">
                                    عرض تفاصيل الحقول المعدلة
                                  </summary>
                                  <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-emerald-300 text-[10px] space-y-1.5 overflow-x-auto max-h-40">
                                    {log.previousValue && (
                                      <div>
                                        <span className="text-rose-400 font-bold block">القيمة السابقة (Previous):</span>
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.previousValue, null, 2)}</pre>
                                      </div>
                                    )}
                                    {log.newValue && (
                                      <div>
                                        <span className="text-emerald-400 font-bold block">القيمة الجديدة (New):</span>
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.newValue, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MULTI-TRACK PLATFORM MANAGEMENT */}
      {activeTab === 'tracks' && <TracksManagementTab />}

      {/* TAB 8: ACADEMIC ARCHIVES & TERM CLOSURE */}
      {activeTab === 'archives' && <AcademicArchivesTab />}

      {/* TAB 10: EDUCATIONAL STAGES EXTENSIBILITY */}
      {activeTab === 'stages' && <EducationalStagesTab />}

      {/* TAB 11: QURAN INTEGRATION & MUSHAF CONFIGURATION */}
      {activeTab === 'quranIntegration' && <QuranIntegrationTab />}

      {/* Phase 4: Admissions & Registration */}
      {activeTab === 'admissions' && isAdmissionsActive && <AdmissionsManagementTab />}

      {/* Phase 5: Student Tuition & Finances */}
      {activeTab === 'finances' && isFinancesActive && <FinancialManagementTab />}

      {/* Student Points Program */}
      {activeTab === 'points' && <StudentPointsTab />}

      {/* Phase 6: Association Testing & Nominations */}
      {activeTab === 'nominations' && isAssociationActive && <AssociationNominationsTab />}

      {/* Phase 7: Emergency Support & Privacy Isolation */}
      {activeTab === 'support' && <EmergencySupportTab />}

      {/* Smart Geo Attendance */}
      {activeTab === 'attendance' && <SmartAttendanceWidget />}

      {/* Permissions & Delegation Management */}
      {activeTab === 'permissions' && <PermissionsDelegationTab />}
      {activeTab === 'bulk_import' && <BulkImportCenterView />}
      {activeTab === 'frontend' && <FrontendManagementTab />}
      {activeTab === 'attendance_settings' && <AttendanceSettingsTab />}
      {activeTab === 'admissions_settings' && <AdmissionsSettingsTab />}
      {activeTab === 'financial_settings' && <FinancialSettingsTab />}
      {activeTab === 'reports_settings' && <ReportsSettingsTab />}
      {activeTab === 'whatsapp_settings' && <WhatsAppSettingsTab />}
      {activeTab === 'supervisors' && <SupervisorsManagementTab />}


      {/* Student Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isNewStudent ? 'إضافة طالب جديد' : 'تعديل بيانات الطالب'}
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="mt-4 space-y-3.5 text-xs">
              {/* Basic Fields: Name, Grade/Stage, Package, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">الاسم الكامل للطالب</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.fullName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع التسجيل وباقة الاشتراك</label>
                  <select
                    value={editingStudent.registrationType || 'full_package'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const labelMap: Record<string, string> = {
                        full_package: 'باقة الاشتراك الكامل',
                        quran_only: 'باقة القرآن الكريم فقط',
                        activities_only: 'باقة الأنشطة والبرامج فقط',
                        scholarship: 'منحة دراسية / إعفاء',
                      };
                      setEditingStudent({
                        ...editingStudent,
                        registrationType: val,
                        registrationTypeLabel: labelMap[val] || val,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  >
                    <option value="full_package">باقة الاشتراك الكامل</option>
                    <option value="quran_only">باقة القرآن الكريم فقط</option>
                    <option value="activities_only">باقة الأنشطة والبرامج فقط</option>
                    <option value="scholarship">منحة دراسية / إعفاء</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة الطالب (نشط / مؤرشف)</label>
                  <select
                    value={editingStudent.isArchived ? 'archived' : 'active'}
                    onChange={(e) => {
                      const isArch = e.target.value === 'archived';
                      setEditingStudent({
                        ...editingStudent,
                        isArchived: isArch,
                        isActive: !isArch,
                        archivedAt: isArch ? (editingStudent.archivedAt || new Date().toISOString()) : undefined,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  >
                    <option value="active">نشط / مقيد في المجمع</option>
                    <option value="archived">مؤرشف / مجمد</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">المرحلة / الصف</label>
                  <select
                    value={editingStudent.grade || 'صف أول'}
                    onChange={(e) => {
                      const selectedGrade = e.target.value;
                      const matchedStage = stages.find((s) => (s.targetGrades || []).includes(selectedGrade));
                      setEditingStudent({
                        ...editingStudent,
                        grade: selectedGrade as any,
                        stageId: matchedStage?.id || editingStudent.stageId || 'baraem',
                        minimumTargetSurah: matchedStage?.defaultTargetSurah || editingStudent.minimumTargetSurah || 'الغاشية',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    {stages.map((stg) => (
                      <optgroup key={stg.id} label={stg.name}>
                        {(stg.targetGrades || []).map((g) => (
                          <option key={g} value={g}>
                            {g} ({stg.name})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional Rendering: Activities Only vs Regular Quranic Student */}
              {editingStudent.registrationType === 'activities_only' ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">جوال ولي الأمر</label>
                    <input
                      type="tel"
                      required
                      value={editingStudent.parentPhone || ''}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, parentPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold block text-amber-900 mb-0.5">باقة الأنشطة والبرامج:</span>
                      تم إخفاء بيانات الحلقة القرآنية والمعلم المتابع وخطة الحفظ والسور المستهدفة تلقائياً، لكون الطالب غير ملزم بمسار التحفيظ القرآني.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">الحلقة</label>
                      <select
                        value={editingStudent.halaqahId || ''}
                        onChange={(e) => {
                          const h = halaqahs.find((hal) => hal.id === e.target.value);
                          const t = teachers.find((tch) => tch.id === h?.teacherId) || users.find((u) => u.id === h?.teacherId);
                          setEditingStudent({
                            ...editingStudent,
                            halaqahId: e.target.value,
                            halaqahName: h?.name || '',
                            teacherId: h?.teacherId || editingStudent.teacherId || '',
                            teacherName: t?.name || (t as any)?.fullName || h?.teacherName || editingStudent.teacherName || '',
                            stageId: h?.stageId || editingStudent.stageId,
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      >
                        {halaqahs.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">المعلم المسؤول</label>
                      <select
                        value={editingStudent.teacherId || ''}
                        onChange={(e) => {
                          const t = teachers.find((tch) => tch.id === e.target.value) || users.find((u) => u.id === e.target.value);
                          setEditingStudent({
                            ...editingStudent,
                            teacherId: e.target.value,
                            teacherName: t?.name || (t as any)?.fullName || '',
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                      >
                        <option value="">-- تلقائي (حسب معلم الحلقة) --</option>
                        {visibleTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Student study days — subset of the halaqah's active days */}
                  {(() => {
                    const h = halaqahs.find((hal) => hal.id === editingStudent.halaqahId);
                    const activeDays = (h?.weeklySchedule || []).filter((d) => d.isActive);
                    if (!h || activeDays.length === 0) return null;
                    const halaqahDays = activeDays.map((d) => d.dayOfWeek);
                    const pref = editingStudent.quranPlan?.preferredWorkingDays;
                    const effective = pref && pref.length > 0 ? pref : halaqahDays;
                    return (
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                        <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                          أيام دراسة الطالب <span className="text-slate-400 font-normal">(من أيام الحلقة فقط)</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {activeDays.map((d) => {
                            const checked = effective.includes(d.dayOfWeek);
                            return (
                              <button
                                key={d.dayOfWeek}
                                type="button"
                                onClick={() => {
                                  const next = checked
                                    ? effective.filter((x) => x !== d.dayOfWeek)
                                    : [...effective, d.dayOfWeek].sort((a, b) => a - b);
                                  const sameAsHalaqah =
                                    next.length === halaqahDays.length &&
                                    halaqahDays.every((x) => next.includes(x));
                                  setEditingStudent({
                                    ...editingStudent,
                                    quranPlan: {
                                      ...(editingStudent.quranPlan as any),
                                      preferredWorkingDays: sameAsHalaqah ? undefined : next,
                                    } as any,
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                  checked
                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {d.dayName}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          الخطة القرآنية تُبنى على أيام الطالب الفعلية فقط — اليوم غير المحدد ليس غيابًا.
                        </p>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">جوال ولي الأمر</label>
                      <input
                        type="tel"
                        required
                        value={editingStudent.parentPhone || ''}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, parentPhone: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">السورة الحالية</label>
                      <select
                        value={editingStudent.currentSurah || 'الناس'}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, currentSurah: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      >
                        {SURAHS_LIST.map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">الحد الأدنى المستهدف</label>
                      <select
                        value={editingStudent.minimumTargetSurah || 'البينة'}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, minimumTargetSurah: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      >
                        {SURAHS_LIST.map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">الهدف الشخصي (اختياري)</label>
                      <select
                        value={editingStudent.personalTargetSurah || ''}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, personalTargetSurah: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      >
                        <option value="">لا يوجد (مطابق للحد الأدنى)</option>
                        {SURAHS_LIST.map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Transfer Modal */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">نقل الطالب إلى حلقة أخرى</h3>
              <button
                onClick={() => setTransferringStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-3.5 text-xs">
              <p className="text-slate-700">
                الطالب المراد نقله: <strong>{transferringStudent.fullName}</strong>
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الحلقة الجديدة</label>
                <select
                  value={transferHalaqahId}
                  onChange={(e) => setTransferHalaqahId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                >
                  {visibleHalaqahs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.grade} - المشرف: {visibleTeachers.find((t) => t.id === h.teacherId)?.name || h.teacherName || 'غير محدد'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferringStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  تأكيد النقل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Student Transfer Modal */}
      {isBulkTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">نقل جماعي للطلاب (نقل حلقة كاملة)</h3>
              <button
                onClick={() => setIsBulkTransferOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkTransferSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الحلقة المصدر (لنقل جميع طلابها)</label>
                <select
                  value={bulkSourceHalaqahId}
                  onChange={(e) => setBulkSourceHalaqahId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                >
                  <option value="">-- اختر الحلقة المراد نقل طلابها --</option>
                  {visibleHalaqahs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({visibleStudents.filter(s => s.halaqahId === h.id).length} طالب مسجل)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الحلقة الوجهة (الجديدة)</label>
                <select
                  value={bulkTargetHalaqahId}
                  onChange={(e) => setBulkTargetHalaqahId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                >
                  <option value="">-- اختر حلقة الوجهة --</option>
                  {visibleHalaqahs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.grade} - المشرف: {visibleTeachers.find((t) => t.id === h.teacherId)?.name || h.teacherName || 'غير محدد'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px]">
                ⚠️ تنبيه: سيتم نقل جميع الطلاب من الحلقة المصدر إلى حلقة الوجهة دفعة واحدة، مع الحفاظ التام على السجل التاريخي لكل طالب، وإنجازاته القرآنية، وبياناته المالية والحضور دون أي فقدان للبيانات.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkTransferOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  تنفيذ النقل الجماعي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Archive / Unarchive Confirmation Modal */}
      {studentToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-auto text-right">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  studentToArchive.action === 'archive'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {studentToArchive.action === 'archive' ? (
                  <Archive className="w-5 h-5" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {studentToArchive.action === 'archive' ? 'أرشفة الطالب' : 'إلغاء الأرشفة وتفعيل الطالب'}
                </h3>
                <p className="text-xs text-slate-500">
                  {studentToArchive.action === 'archive'
                    ? 'حفظ الطالب وسجلاته في الأرشيف الآمن'
                    : 'إعادة الطالب للحالة النشطة في المجمع'}
                </p>
              </div>
            </div>

            <div className="my-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  {studentToArchive.student.fullName}
                </div>
                <div className="text-slate-600 flex items-center gap-2 flex-wrap">
                  <span>
                    الحلقة:{' '}
                    {halaqahs.find((h) => h.id === studentToArchive.student.halaqahId)?.name || 'غير محدد'}
                  </span>
                  {studentToArchive.student.grade && (
                    <span>• المرحلة: {studentToArchive.student.grade}</span>
                  )}
                </div>
              </div>

              {studentToArchive.action === 'archive' ? (
                <>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    هل ترغب في أرشفة الطالب؟ سيتم حفظ كافة سجلات التسميع والدرجات في الأرشيف ولن يظهر في كشوفات الحضور اليومية النشطة، مع إمكانية استعادته في أي لحظة.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سبب الأرشفة (اختياري):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: انقطاع، سفر، تخرج، طلب ولي الأمر..."
                      value={studentArchiveReason}
                      onChange={(e) => setStudentArchiveReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed">
                  هل أنت متأكد من إعادة تفعيل الطالب ونقله من الأرشيف إلى الحالة النشطة؟ سيظهر مجدداً في كشوفات الحلقة والتسميع اليومي.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingStudentArchive}
                onClick={() => {
                  setStudentToArchive(null);
                  setStudentArchiveReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingStudentArchive}
                onClick={handleConfirmStudentArchive}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  studentToArchive.action === 'archive'
                    ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98]'
                    : 'bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98]'
                }`}
              >
                {isSubmittingStudentArchive ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ المعالجة...</span>
                  </>
                ) : studentToArchive.action === 'archive' ? (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>تأكيد الأرشفة</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تأكيد التفعيل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-auto text-right">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">حذف الطالب نهائياً</h3>
                <p className="text-xs text-slate-500">تحذير: هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="my-4 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الطالب <strong className="text-slate-900 font-bold">«{studentToDelete.fullName}»</strong> نهائياً من النظام؟
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>تنبيه بديل آمن:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  إذا كنت ترغب في الاحتفاظ بسجلات الطالب ودرجاته، يُفضل استخدام خيار <strong>«الأرشفة»</strong> بدلاً من الحذف النهائي.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingStudentDelete}
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingStudentDelete}
                onClick={handleConfirmStudentDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmittingStudentDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف النهائي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Halaqah Edit Modal */}
      {editingHalaqah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`bg-white rounded-2xl ${showScheduleEditor ? 'max-w-2xl' : 'max-w-md'} w-full p-6 shadow-2xl border border-slate-200 my-auto transition-all duration-200`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isNewHalaqah ? 'إضافة حلقة قرآنية' : 'تعديل بيانات الحلقة'}
              </h3>
              <button
                onClick={() => {
                  setEditingHalaqah(null);
                  setShowScheduleEditor(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHalaqah} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الحلقة</label>
                <input
                  type="text"
                  required
                  value={editingHalaqah.name || ''}
                  onChange={(e) => setEditingHalaqah({ ...editingHalaqah, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المرحلة / الصف</label>
                  <select
                    value={editingHalaqah.grade || ''}
                    onChange={(e) => {
                      const selectedGrade = e.target.value;
                      const matchedStage = stages.find((s) => (s.targetGrades || []).includes(selectedGrade));
                      setEditingHalaqah({
                        ...editingHalaqah,
                        grade: selectedGrade as any,
                        stageId: matchedStage?.id || editingHalaqah.stageId || 'baraem',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    <option value="">-- اختر المرحلة / الصف --</option>
                    {/* Fallback option if current grade is not in standard list */}
                    {editingHalaqah.grade && !stages.some(s => (s.targetGrades || []).includes(editingHalaqah.grade as string)) && (
                      <option value={editingHalaqah.grade}>{editingHalaqah.grade} (غير قياسي)</option>
                    )}
                    {stages.map((stg) => (
                      <optgroup key={stg.id} label={stg.name}>
                        {(stg.targetGrades || []).map((g) => (
                          <option key={g} value={g}>
                            {g} ({stg.name})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المعلم المشرف</label>
                  <select
                    value={editingHalaqah.teacherId || ''}
                    onChange={(e) =>
                      setEditingHalaqah({ ...editingHalaqah, teacherId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    <option value="">-- اختر المعلم المسؤول --</option>
                    {/* Fallback option if current teacherId is not in visibleTeachers */}
                    {editingHalaqah.teacherId && !visibleTeachers.some(t => t.id === editingHalaqah.teacherId) && (
                      <option value={editingHalaqah.teacherId}>
                        {editingHalaqah.teacherName || 'معلم غير موجود بالقائمة'}
                      </option>
                    )}
                    {visibleTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assistant Teachers */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">المعلمون المساعدون (اختياري)</label>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-32 overflow-y-auto space-y-1">
                  {visibleTeachers.filter(t => t.id !== editingHalaqah.teacherId).map((t) => {
                    const isAssistant = editingHalaqah.assistantTeachers?.some(at => at.id === t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!isAssistant}
                          onChange={(e) => {
                            let updated = [...(editingHalaqah.assistantTeachers || [])];
                            if (e.target.checked) {
                              updated.push({ id: t.id, name: t.name });
                            } else {
                              updated = updated.filter(at => at.id !== t.id);
                            }
                            setEditingHalaqah({ ...editingHalaqah, assistantTeachers: updated });
                          }}
                          className="rounded text-emerald-600 w-3.5 h-3.5"
                        />
                        <span className="text-xs">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Online Config */}
              <div className="border-t border-slate-100 pt-3">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingHalaqah.onlineConfig?.enabled || false}
                    onChange={(e) => {
                      setEditingHalaqah({
                        ...editingHalaqah,
                        onlineConfig: {
                          enabled: e.target.checked,
                          meetingUrl: editingHalaqah.onlineConfig?.meetingUrl || '',
                          scheduleDays: editingHalaqah.onlineConfig?.scheduleDays || [0,1,2,3,4],
                          startTime: editingHalaqah.onlineConfig?.startTime || '16:00',
                          endTime: editingHalaqah.onlineConfig?.endTime || '18:00'
                        }
                      });
                    }}
                    className="rounded text-emerald-600 w-4 h-4"
                  />
                  <span>تفعيل التعليم عن بعد (Online Mode)</span>
                </label>
                {editingHalaqah.onlineConfig?.enabled && (
                  <div className="mt-2 space-y-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">وقت البداية</label>
                      <input
                        type="time"
                        value={editingHalaqah.onlineConfig.startTime}
                        onChange={(e) => setEditingHalaqah({
                          ...editingHalaqah,
                          onlineConfig: { ...editingHalaqah.onlineConfig!, startTime: e.target.value }
                        })}
                        className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">وقت النهاية</label>
                      <input
                        type="time"
                        value={editingHalaqah.onlineConfig.endTime}
                        onChange={(e) => setEditingHalaqah({
                          ...editingHalaqah,
                          onlineConfig: { ...editingHalaqah.onlineConfig!, endTime: e.target.value }
                        })}
                        className="w-full px-2 py-1 rounded border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">السورة المستهدفة للحلقة</label>
                <select
                  value={editingHalaqah.targetSurah || 'البينة'}
                  onChange={(e) =>
                    setEditingHalaqah({ ...editingHalaqah, targetSurah: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  {SURAHS_LIST.map((s) => (
                    <option key={s.number} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">المسارات التعليمية المفعلة للحلقة</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {tracks.map((trk) => {
                    const currentList = editingHalaqah.activeTrackIds || ['track_quran', 'track_spelling', 'track_virtues'];
                    const isChecked = currentList.includes(trk.id);
                    return (
                      <label
                        key={trk.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...currentList, trk.id]
                              : currentList.filter((id) => id !== trk.id);
                            setEditingHalaqah({ ...editingHalaqah, activeTrackIds: updated });
                          }}
                          className="rounded text-emerald-600 w-3.5 h-3.5"
                        />
                        <span className="truncate">{trk.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Summary & Quick Customizer Drawer */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <label className="font-bold text-slate-800 text-xs">أيام ومواعيد الحلقة</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScheduleEditor(!showScheduleEditor)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{showScheduleEditor ? 'إخفاء التخصيص' : 'تخصيص المواعيد'}</span>
                    {showScheduleEditor ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Compact Schedule Summary Card */}
                {(() => {
                  const summary = formatHalaqahStructuredSummary(editingHalaqah, prayerTimesToday);
                  return (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black text-slate-800">
                              {summary.daysText}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded">
                              {summary.isAdaptiveMatrix ? 'جدول مخصص لكل يوم' : summary.timeTypeText}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 font-mono font-medium truncate">
                            {summary.timeRangeText}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Collapsible Full Matrix Editor */}
                {showScheduleEditor && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                    <div className="mb-2 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        يمكنك هنا تخصيص أيام الأسبوع وتحديد مواعيد الصلاة أو الأوقات الثابتة لكل يوم بدقة. يتم حفظ هذا الجدول كمرجع موحد للحلقة.
                      </span>
                    </div>
                    <HalaqahScheduleEditor
                      halaqah={editingHalaqah}
                      prayerTimesToday={prayerTimesToday}
                      onChange={(scheduleData) => {
                        setEditingHalaqah((prev) =>
                          prev ? { ...prev, ...scheduleData } : prev
                        );
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingHalaqah(null);
                    setShowScheduleEditor(false);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  حفظ الحلقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Halaqah Delete / Archive Confirmation Modal */}
      {halaqahToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-auto text-right">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">أرشفة وحذف الحلقة</h3>
                <p className="text-xs text-slate-500">حماية البيانات من الحذف العرضي أو الخاطئ</p>
              </div>
            </div>

            <div className="my-4 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الحلقة <strong className="text-slate-900 font-bold">«{halaqahToDelete.name}»</strong>؟
              </p>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Archive className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>ميزة الأمان والأرشفة التلقائية:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  لن تُفقد بيانات الحلقة نهائياً، بل سيتم نقلها فوراً إلى <strong>«أرشيف الحلقات»</strong> الاحتياطي، مما يتيح لك استعادتها بجميع سجلاتها في أي لحظة عند الحاجة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب الحذف / الأرشفة (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: دمج مع حلقة أخرى، نهاية الفصل الدراسي..."
                  value={deleteArchiveReason}
                  onChange={(e) => setDeleteArchiveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingHalaqah}
                onClick={() => {
                  setHalaqahToDelete(null);
                  setDeleteArchiveReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeletingHalaqah}
                onClick={async () => {
                  setIsDeletingHalaqah(true);
                  try {
                    await archiveHalaqah(
                      halaqahToDelete.id,
                      deleteArchiveReason.trim() || 'حذف مع النقل للأرشيف تحسباً للخطأ'
                    );
                    setHalaqahToDelete(null);
                    setDeleteArchiveReason('');
                  } catch (err) {
                    console.error('Error archiving halaqah:', err);
                  } finally {
                    setIsDeletingHalaqah(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {isDeletingHalaqah ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ النقل للأرشيف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف والأرشفة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archived Halaqahs Modal */}
      {showArchivedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-auto text-right max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>أرشيف الحلقات المحذوفة</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {visibleArchivedHalaqahs.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    الحلقات المحفوظة احتياطياً لتفادي الحذف الخاطئ، يمكنك استعادتها فوراً في أي وقت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchivedModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {visibleArchivedHalaqahs.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">الأرشيف فارغ</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    لا توجد أي حلقات مؤرشفة أو محذوفة حالياً في هذا المجمع. أي حلقة تحذفها مستقبلاً ستُحفظ هنا احتياطياً.
                  </p>
                </div>
              ) : (
                visibleArchivedHalaqahs.map((arch) => (
                  <div
                    key={arch.id}
                    className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{arch.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700">
                          {arch.grade || 'غير محدد'}
                        </span>
                        {arch.targetSurah && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            سورة {arch.targetSurah}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>المعلم: <strong className="text-slate-800">{arch.teacherName || 'غير محدد'}</strong></span>
                        {arch.archivedAt && (
                          <span className="text-slate-500">
                            تاريخ الأرشفة: {new Date(arch.archivedAt).toLocaleDateString('ar-SA')} {new Date(arch.archivedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {arch.archivedBy && (
                          <span className="text-slate-500">
                            بواسطة: {arch.archivedBy}
                          </span>
                        )}
                      </div>

                      {arch.archiveReason && (
                        <p className="text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/70 px-2.5 py-1 rounded-lg inline-block font-medium">
                          سبب الأرشفة: {arch.archiveReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        disabled={restoringHalaqahId === arch.id || permDeletingId === arch.id}
                        onClick={async () => {
                          setRestoringHalaqahId(arch.id);
                          try {
                            await restoreHalaqah(arch.id);
                          } finally {
                            setRestoringHalaqahId(null);
                          }
                        }}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        title="استعادة الحلقة إلى القائمة النشطة"
                      >
                        {restoringHalaqahId === arch.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>استعادة الحلقة</span>
                      </button>

                      <button
                        type="button"
                        disabled={restoringHalaqahId === arch.id || permDeletingId === arch.id}
                        onClick={async () => {
                          setPermDeletingId(arch.id);
                          try {
                            await permanentlyDeleteArchivedHalaqah(arch.id);
                          } finally {
                            setPermDeletingId(null);
                          }
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 text-xs font-bold rounded-xl border border-rose-200/80 transition-all flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        title="حذف نهائي لا يمكن التراجع عنه"
                      >
                        {permDeletingId === arch.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>حذف نهائي</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>الحلقات المستعادة تعود مباشرة إلى جدول الحلقات الفعالة.</span>
              <button
                type="button"
                onClick={() => setShowArchivedModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      <OfficialPrintableReportModal
        isOpen={showOfficialReport}
        onClose={() => setShowOfficialReport(false)}
        students={visibleStudents}
        records={visibleRecords}
        spellingLessons={spellingLessons}
        academicConfig={academicConfig}
        halaqahs={visibleHalaqahs}
        teachers={visibleTeachers}
        mosqueLogoUrl={mosqueLogoUrl}
        stageLogoUrl={stageLogoUrl}
      />

      {/* P2: WhatsApp API Settings Modal */}
      

      {/* P2: Badges & Incentives Modal (All Complex) */}
      <BadgesManagementModal
        isOpen={showBadgesModal}
        onClose={() => setShowBadgesModal(false)}
      />

      {/* P2: Early Intervention Radar Modal (All Complex) */}
      <EarlyInterventionRadarModal
        isOpen={showRadarModal}
        onClose={() => setShowRadarModal(false)}
      />

      {/* P3: Student Cumulative History Modal */}
      <StudentCumulativeHistoryModal
        student={viewingHistoryStudent}
        isOpen={!!viewingHistoryStudent}
        onClose={() => setViewingHistoryStudent(null)}
      />

      {/* Bulk Online Halaqahs Activation Modal */}
      <BulkOnlineHalaqahsModal
        isOpen={isBulkOnlineModalOpen}
        onClose={() => setIsBulkOnlineModalOpen(false)}
        halaqahs={visibleHalaqahs}
        teachers={visibleTeachers}
        onSave={handleBulkSaveOnline}
      />

      {/* Bulk Halaqah Schedule & Timings Modal */}
      <BulkHalaqahScheduleModal
        isOpen={isBulkScheduleModalOpen}
        onClose={() => setIsBulkScheduleModalOpen(false)}
        halaqahs={visibleHalaqahs}
        stages={stages}
        prayerTimesToday={prayerTimesToday}
        onApply={async (params) => {
          const activeDays = params.weeklySchedule.filter((d) => d.isActive).map((d) => d.dayOfWeek);
          await bulkUpdateHalaqahs(params.targetHalaqahIds, {
            weeklySchedule: params.weeklySchedule,
            defaultTimeType: params.defaultTimeType,
            defaultStartTime: params.defaultStartTime,
            defaultEndTime: params.defaultEndTime,
            defaultStartPrayerOffset: params.defaultStartPrayerOffset,
            defaultEndPrayerOffset: params.defaultEndPrayerOffset,
            daysPerWeek: activeDays.length,
          });
        }}
      />
    </div>
  );
};
