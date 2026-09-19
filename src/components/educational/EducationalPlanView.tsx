import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  DollarSign,
  User,
  X,
  Target,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  Download,
  Printer,
  Copy,
  Check,
  Filter,
  Grid,
  List,
  Compass,
  Award,
  BookOpen,
  Info,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  Activity,
} from 'lucide-react';
import { EducationalPlanWeek, EducationalStage } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { EarlyInterventionRadarModal } from '../teacher/EarlyInterventionRadarModal';
import { ReportDispatchModal } from '../common/ReportDispatchModal';
import { generatePrepWeekAnnouncement } from '../../utils/reportGenerator';
import { StageHalaqahControlBar } from '../common/StageHalaqahControlBar';
import { EducationalPlanMatrix } from './EducationalPlanMatrix';
import { EducationalPlanModal } from './EducationalPlanModal';
import { EducationalPlanPrintModal } from './EducationalPlanPrintModal';
import {
  exportEducationalPlanToExcel,
  printEducationalPlanDocument,
} from '../../utils/educationalPlanUtils';

interface ConfirmDeleteModalState {
  isOpen: boolean;
  title: string;
  message: string;
  submessage?: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

export const EducationalPlanView: React.FC = () => {
  const {
    educationalPlan,
    addEducationalWeek,
    bulkAddEducationalWeeks,
    replaceStageEducationalPlan,
    updateEducationalWeek,
    deleteEducationalWeek,
    bulkDeleteEducationalWeeks,
    clearStageEducationalPlan,
    academicConfig,
    currentRole,
    currentUser,
    stages,
    halaqahs,
    teachers,
    students,
    activeTenantId,
    activeTenant,
  } = useApp();

  const [searchParams] = useSearchParams();
  const canViewRadar = hasPermission(
    currentUser,
    'view_intervention_radar',
    undefined,
    undefined,
    halaqahs,
    activeTenant
  );

  const isAdmin = Boolean(
    currentUser && (
      currentUser.role === 'admin' ||
      currentUser.role === 'system_admin' ||
      currentUser.role === 'campus_admin'
    )
  );

  const isSupervisor = Boolean(currentUser && currentUser.role === 'supervisor');

  // Supervisor stage restrictions
  const supervisorAssignedStageIds = useMemo(() => {
    if (!currentUser || !isSupervisor) return null;
    const list: string[] = [];
    if (currentUser.stageId) list.push(currentUser.stageId);
    if (currentUser.assignedStageIds) list.push(...currentUser.assignedStageIds);
    if (currentUser.supervisorScope?.stageIds) list.push(...currentUser.supervisorScope.stageIds);
    return list.length > 0 ? Array.from(new Set(list)) : null;
  }, [currentUser, isSupervisor]);

  // Allowed stages for current user
  const allowedStages = useMemo(() => {
    if (!stages || stages.length === 0) return [];
    if (isAdmin) return stages;
    if (isSupervisor && supervisorAssignedStageIds && supervisorAssignedStageIds.length > 0) {
      return stages.filter((s) => supervisorAssignedStageIds.includes(s.id));
    }
    return stages;
  }, [stages, isAdmin, isSupervisor, supervisorAssignedStageIds]);

  // Default stage selection
  const [selectedStageId, setSelectedStageId] = useState<string>(() => {
    if (isSupervisor && supervisorAssignedStageIds && supervisorAssignedStageIds.length > 0) {
      return supervisorAssignedStageIds[0];
    }
    return stages?.[0]?.id || 'all';
  });

  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'cards' | 'overview' | 'radar'>(() =>
    searchParams.get('view') === 'radar' && canViewRadar ? 'radar' : 'matrix'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-selection state
  const [selectedWeekIds, setSelectedWeekIds] = useState<string[]>([]);

  // Confirmation Modal State (replaces iframe-incompatible window.confirm)
  const [confirmModal, setConfirmModal] = useState<ConfirmDeleteModalState | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Modals state
  const [planModalOpen, setPlanModalOpen] = useState<boolean>(false);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [editingWeek, setEditingWeek] = useState<Partial<EducationalPlanWeek> | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState({ title: '', content: '' });

  // Active Stage Entity
  const selectedStage = useMemo(() => {
    if (!stages || stages.length === 0 || selectedStageId === 'all') return undefined;
    return stages.find((s) => s.id === selectedStageId);
  }, [stages, selectedStageId]);

  // Check management permission
  const canManage = Boolean(
    isAdmin ||
    (isSupervisor && (!supervisorAssignedStageIds || selectedStageId === 'all' || supervisorAssignedStageIds.includes(selectedStageId)))
  );

  const isStaff = Boolean(isAdmin || isSupervisor || currentUser?.role === 'teacher');

  // Filter halaqahs for active tenant
  const tenantHalaqahs = useMemo(() => {
    return (halaqahs || []).filter((h) => !activeTenantId || h.tenantId === activeTenantId);
  }, [halaqahs, activeTenantId]);

  const visibleHalaqahs = useMemo(() => {
    if (selectedStageId === 'all') return tenantHalaqahs;
    const stage = (stages || []).find((s) => s.id === selectedStageId);
    return tenantHalaqahs.filter((h) => {
      if (h.stageId && h.stageId === selectedStageId) return true;
      if (stage?.targetGrades && stage.targetGrades.includes(h.grade as any)) return true;
      return false;
    });
  }, [tenantHalaqahs, selectedStageId, stages]);

  // Filtered Plan for Selected Stage
  const stageFilteredPlan = useMemo(() => {
    let list = [...(educationalPlan || [])];

    if (selectedStageId !== 'all') {
      list = list.filter((w) => {
        if (!w.stageId && (!w.targetStageIds || w.targetStageIds.length === 0)) return true; // Global weeks apply to all
        if (w.stageId === selectedStageId) return true;
        if (w.targetStageIds && w.targetStageIds.includes(selectedStageId)) return true;
        return false;
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((w) => (w.status || 'scheduled') === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.motto?.toLowerCase().includes(q) ||
          w.educationalGoal?.toLowerCase().includes(q) ||
          w.activity?.toLowerCase().includes(q) ||
          w.valueTitle?.toLowerCase().includes(q) ||
          w.responsiblePerson?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.weekNumber - b.weekNumber);
  }, [educationalPlan, selectedStageId, statusFilter, searchQuery]);

  // Statistics
  const totalBudget = stageFilteredPlan.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const completedCount = stageFilteredPlan.filter((w) => w.status === 'completed').length;
  const inProgressCount = stageFilteredPlan.filter((w) => w.status === 'in_progress').length;

  // Handlers for Selection
  const handleToggleSelectWeek = (id: string) => {
    setSelectedWeekIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allIds = stageFilteredPlan.map((w) => w.id);
    if (selectedWeekIds.length === allIds.length && allIds.length > 0) {
      setSelectedWeekIds([]);
    } else {
      setSelectedWeekIds(allIds);
    }
  };

  // Handlers for Single Deletion (In-App Modal)
  const handleDeleteWeek = (id: string, weekNumber: number, title?: string) => {
    setConfirmModal({
      isOpen: true,
      title: `تأكيد حذف الأسبوع ${weekNumber}`,
      message: `هل أنت متأكد من حذف بيانات الأسبوع ${weekNumber}${
        title ? ` (${title})` : ''
      } من الخطة التربوية؟`,
      submessage: 'سيتم إزالة هذا الأسبوع وبياناته نهائياً من قاعدة البيانات.',
      confirmLabel: 'نعم، احذف الأسبوع',
      isDestructive: true,
      onConfirm: async () => {
        await deleteEducationalWeek(id);
        setSelectedWeekIds((prev) => prev.filter((wId) => wId !== id));
        showToast(`تم حذف الأسبوع ${weekNumber} بنجاح.`);
      },
    });
  };

  // Handlers for Bulk Deletion
  const handleBulkDeleteSelected = () => {
    if (selectedWeekIds.length === 0) return;
    const count = selectedWeekIds.length;
    setConfirmModal({
      isOpen: true,
      title: `تأكيد الحذف الجماعي لـ (${count}) أسبوع`,
      message: `هل أنت متأكد من رغبتك في حذف ${count} أسبوع محدد دفعة واحدة من الخطة التربوية؟`,
      submessage: 'سيتم حذف جميع الأسابيع المحددة ومسحها نهائياً.',
      confirmLabel: `حذف ${count} أسبوع نهائياً`,
      isDestructive: true,
      onConfirm: async () => {
        await bulkDeleteEducationalWeeks(selectedWeekIds);
        setSelectedWeekIds([]);
        showToast(`تم حذف ${count} أسبوع من الخطة بنجاح.`);
      },
    });
  };

  // Handlers for Clearing Entire Stage Plan
  const handleClearStagePlan = () => {
    const count = stageFilteredPlan.length;
    if (count === 0) return;
    const stageName = selectedStage ? selectedStage.name : 'جميع المراحل';
    setConfirmModal({
      isOpen: true,
      title: `إفراغ وحذف كامل خطة ${stageName}`,
      message: `هل أنت متأكد من حذف وإفراغ جميع أسابيع الخطة (${count} أسبوع) الخاصة بـ [${stageName}]؟`,
      submessage: 'سيتم مسح جدول الخطة بالكامل لتتمكن من إعادة توليده أو إعداده من جديد.',
      confirmLabel: `إفراغ وحذف الخطة بالكامل (${count} أسبوع)`,
      isDestructive: true,
      onConfirm: async () => {
        await clearStageEducationalPlan(selectedStageId);
        setSelectedWeekIds([]);
        showToast(`تم إفراغ وحذف خطة ${stageName} بنجاح.`);
      },
    });
  };

  // Handlers for Bulk Status Update
  const handleBulkUpdateStatus = (newStatus: 'scheduled' | 'in_progress' | 'completed') => {
    if (selectedWeekIds.length === 0) return;
    selectedWeekIds.forEach((id) => {
      updateEducationalWeek(id, { status: newStatus });
    });
    const statusLabel =
      newStatus === 'completed' ? 'منفذ' : newStatus === 'in_progress' ? 'جارٍ' : 'مجدول';
    showToast(`تم تغيير حالة ${selectedWeekIds.length} أسبوع إلى [${statusLabel}].`);
    setSelectedWeekIds([]);
  };

  // Other Handlers
  const handleOpenAdd = () => {
    setEditingWeek(null);
    setPlanModalOpen(true);
  };

  const handleEditWeek = (week: EducationalPlanWeek) => {
    setEditingWeek(week);
    setPlanModalOpen(true);
  };

  const handleToggleStatus = (week: EducationalPlanWeek) => {
    const nextStatus =
      week.status === 'scheduled'
        ? 'in_progress'
        : week.status === 'in_progress'
        ? 'completed'
        : 'scheduled';
    updateEducationalWeek(week.id, { status: nextStatus });
  };

  const handleSendAnnouncement = (week: EducationalPlanWeek) => {
    const content = generatePrepWeekAnnouncement(week.weekNumber, week);
    setReportData({
      title: `إعلان تحضيري للأسبوع ${week.weekNumber} (${week.motto})`,
      content,
    });
    setReportModalOpen(true);
  };

  const handleSaveSingleWeek = (weekData: Partial<EducationalPlanWeek>, isNew: boolean) => {
    if (isNew) {
      addEducationalWeek({
        ...weekData,
        stageId: selectedStageId === 'all' ? undefined : (weekData.stageId || selectedStageId),
      } as Omit<EducationalPlanWeek, 'id'>);
    } else if (weekData.id) {
      updateEducationalWeek(weekData.id, weekData);
    }
  };

  const handleBulkSaveWeeks = (weeks: Omit<EducationalPlanWeek, 'id'>[], replaceExisting: boolean) => {
    if (replaceExisting && selectedStageId !== 'all') {
      replaceStageEducationalPlan(selectedStageId, weeks);
    } else {
      bulkAddEducationalWeeks(weeks);
    }
  };

  const handlePrint = () => {
    setPrintModalOpen(true);
  };

  const handleExportExcel = () => {
    exportEducationalPlanToExcel(
      stageFilteredPlan,
      selectedStage ? selectedStage.name : 'البرنامج التربوي العام'
    );
  };

  return (
    <div className="space-y-6 pb-24 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center gap-3 animate-fade-in text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner - Unified Premium Card matching the System's Card Archetype */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 print:hidden">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white flex items-center justify-center shadow-xs shrink-0 ring-4 ring-emerald-50">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-100" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                <span className="sm:hidden">البرنامج التربوي</span>
                <span className="hidden sm:inline">البرنامج التربوي ومصفوفة القيم الأسبوعية</span>
              </h2>

              {/* 11 أسبوعاً Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200 shadow-2xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                {stageFilteredPlan.length} أسبوعاً
              </span>

              {/* Stage Badge */}
              {selectedStage && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 shadow-2xs shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                  {selectedStage.name}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed font-medium">
              إدارة خطة أنشطة نهاية الأسبوع (الخميس، الجمعة، السبت): الأهداف الإيمانية والسلوكية، الشعارات الأسبوعية، والفقرات التفاعلية المعتمدة.
            </p>
          </div>
        </div>

        {/* Action Buttons - Refined, Harmonious Colors matching the App Design System */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer min-h-[42px] active:scale-[0.98]"
            title="تصدير كملف إكسيل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">تصدير Excel</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer min-h-[42px] active:scale-[0.98]"
            title="طباعة الخطة التربوية"
          >
            <Printer className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="whitespace-nowrap">طباعة</span>
          </button>

          {/* Manage Plan Button (Primary) */}
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4.5 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="whitespace-nowrap">إدارة الخطة</span>
            </button>
          )}

          {/* Clear Plan Button (Danger) - Placed directly beside Manage Plan */}
          {canManage && stageFilteredPlan.length > 0 && (
            <button
              onClick={handleClearStagePlan}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer min-h-[42px] active:scale-[0.98]"
              title="إفراغ وحذف جميع أسابيع خطة المرحلة الحالية"
            >
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="whitespace-nowrap">إفراغ الخطة</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Stage Outcome Context Card (Hidden for Admins and Supervisors who have dedicated stage configs, visible for Teachers, Students & Parents) */}
      {selectedStage && !(isAdmin || isSupervisor) && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 rounded-3xl p-5 border border-emerald-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-emerald-950">
                    مخرج {selectedStage.name} المستهدف
                  </h3>
                  {selectedStage.ageRange && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-bold">
                      الفئة: {selectedStage.ageRange}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-900/90 mt-0.5 leading-relaxed font-medium">
                  {selectedStage.outcomeSummary || selectedStage.subtitle}
                </p>
              </div>
            </div>

            {selectedStage.targetQuranAmount && (
              <div className="bg-white/80 border border-emerald-200 px-3.5 py-2 rounded-2xl text-xs text-right shrink-0">
                <span className="text-slate-500 text-[10px] block">المقدار القرآني المستهدف</span>
                <strong className="text-emerald-900 font-bold block">{selectedStage.targetQuranAmount}</strong>
              </div>
            )}
          </div>

          {/* Stage Traits Badges */}
          {selectedStage.traits && selectedStage.traits.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-200/60">
              <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 ml-1">
                <Target className="w-3.5 h-3.5 text-emerald-700" />
                <span>السمات المرجوة:</span>
              </span>
              {selectedStage.traits.map((trait, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-[11px] font-medium shadow-2xs"
                >
                  ✓ {trait}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Stage & Filter Control Center */}
      <div className="print:hidden space-y-3">
        {/* Stage Selector Chips Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-700 shrink-0 ml-1">المرحلة:</span>
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedStageId('all');
                  setSelectedWeekIds([]);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedStageId === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                جميع المراحل
              </button>
            )}
            {allowedStages.map((stg) => (
              <button
                key={stg.id}
                onClick={() => {
                  setSelectedStageId(stg.id);
                  setSelectedWeekIds([]);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedStageId === stg.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {stg.name}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'matrix'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>عرض المصفوفة الرسمية</span>
            </button>

            <button
              onClick={() => setActiveViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'cards'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>عرض البطاقات</span>
            </button>

            <button
              onClick={() => setActiveViewMode('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'overview'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>مؤشرات التنفيذ</span>
            </button>

            {canViewRadar && (
              <button
                onClick={() => setActiveViewMode('radar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeViewMode === 'radar'
                    ? 'bg-white text-rose-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>رادار التدخل المبكر</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالشعار، القيمة، أو الهدف..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-slate-500 text-[11px] font-bold shrink-0">الحالة:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              الكل ({stageFilteredPlan.length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-white border border-slate-200 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              منفذ ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 ${
                statusFilter === 'in_progress'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-amber-800 hover:bg-amber-50'
              }`}
            >
              جارٍ ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer shrink-0 ${
                statusFilter === 'scheduled'
                  ? 'bg-slate-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              مجدول ({stageFilteredPlan.length - completedCount - inProgressCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. FLOATING BULK ACTIONS TOOLBAR (When items are selected) */}
      {canManage && selectedWeekIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-3 animate-slide-up text-xs font-bold max-w-[95vw]">
          <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              {selectedWeekIds.length}
            </span>
            <span className="text-slate-200">أسبوع محدد</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Delete Selected */}
            <button
              onClick={handleBulkDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              title="حذف جميع الأسابيع المحددة"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف المحدد ({selectedWeekIds.length})</span>
            </button>

            {/* Mark as Completed */}
            <button
              onClick={() => handleBulkUpdateStatus('completed')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition-colors cursor-pointer"
              title="تعيين كـ مكتمل"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اكتمال</span>
            </button>

            {/* Mark as In Progress */}
            <button
              onClick={() => handleBulkUpdateStatus('in_progress')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors cursor-pointer"
              title="تعيين كـ جارٍ"
            >
              <Clock className="w-4 h-4" />
              <span>جارٍ</span>
            </button>

            {/* Mark as Scheduled */}
            <button
              onClick={() => handleBulkUpdateStatus('scheduled')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
              title="تعيين كـ مجدول"
            >
              <Calendar className="w-4 h-4" />
              <span>مجدول</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedWeekIds([])}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer mr-1"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. MAIN VIEW CONTENT */}

      {/* VIEW 1: MATRIX VIEW (The High Craft Matrix Table) */}
      {/* Early Intervention Radar — permission-gated page section */}
      {activeViewMode === 'radar' && canViewRadar && (
        <EarlyInterventionRadarModal
          embedded
          isOpen={true}
          onClose={() => setActiveViewMode('matrix')}
          halaqahId={selectedHalaqahId || undefined}
        />
      )}

      {activeViewMode === 'matrix' && (
        <EducationalPlanMatrix
          weeks={stageFilteredPlan}
          stage={selectedStage}
          currentAcademicWeek={academicConfig.currentWeek}
          canManage={canManage}
          isStaff={isStaff}
          selectedWeekIds={selectedWeekIds}
          onToggleSelectWeek={handleToggleSelectWeek}
          onToggleSelectAll={handleToggleSelectAll}
          onEditWeek={handleEditWeek}
          onDeleteWeek={handleDeleteWeek}
          onToggleStatus={handleToggleStatus}
          onSendAnnouncement={handleSendAnnouncement}
        />
      )}

      {/* VIEW 2: CARDS VIEW */}
      {activeViewMode === 'cards' && (
        <div className="space-y-3">
          {canManage && stageFilteredPlan.length > 0 && (
            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-600">
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {selectedWeekIds.length === stageFilteredPlan.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedWeekIds.length === stageFilteredPlan.length
                    ? 'إلغاء تحديد الكل'
                    : 'تحديد جميع البطاقات'}
                </span>
              </button>
              {selectedWeekIds.length > 0 && (
                <span className="text-emerald-700">تم تحديد {selectedWeekIds.length} أسبوع</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stageFilteredPlan.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
                لا توجد أسابيع مسجلة بعد. انقر على «إدارة وتوليد الخطة» لإضافة الأسابيع.
              </div>
            ) : (
              stageFilteredPlan.map((week) => {
                const isCurrent = week.weekNumber === academicConfig.currentWeek;
                const isCompleted = week.status === 'completed';
                const isInProgress = week.status === 'in_progress';
                const isSelected = selectedWeekIds.includes(week.id);

                return (
                  <div
                    key={week.id}
                    className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-400/60 bg-emerald-50/30 shadow-md'
                        : isCurrent
                        ? 'border-amber-400 ring-2 ring-amber-300 shadow-md'
                        : 'border-slate-200 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Card Bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {canManage && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectWeek(week.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                              title={`تحديد الأسبوع ${week.weekNumber}`}
                            />
                          )}
                          <span
                            className={`w-9 h-9 rounded-2xl font-black text-sm flex items-center justify-center shadow-2xs ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : isCompleted
                                ? 'bg-emerald-800 text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {week.weekNumber}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(week)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : isInProgress
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isCompleted ? 'مكتمل ✓' : isInProgress ? 'جارٍ ⏳' : 'مجدول 📅'}
                          </button>
                        </div>
                      </div>

                      {/* Motto & Value */}
                      <div>
                        <h4 className="text-base font-black text-slate-900">{week.motto || week.specialEventTitle || 'أسبوع الخطة'}</h4>
                        {week.valueTitle && (
                          <span className="text-xs font-bold text-emerald-800 mt-0.5 block">
                            القيمة: {week.valueTitle}
                          </span>
                        )}
                      </div>

                      {/* Goal */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Target className="w-3 h-3 text-emerald-600" />
                          <span>الهدف ومقدمه:</span>
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {week.educationalGoal || '-'}
                        </p>
                        {week.goalPresenter && (
                          <span className="text-[11px] font-bold text-slate-900 block mt-1">
                            المقدم: {week.goalPresenter} {week.goalLocation ? `(${week.goalLocation})` : ''}
                          </span>
                        )}
                      </div>

                      {/* Activity */}
                      {week.activity && (
                        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>الفقرة التفاعلية:</span>
                          </span>
                          <p className="text-xs font-bold text-amber-950">{week.activity}</p>
                          {week.activityPresenter && (
                            <span className="text-[11px] text-amber-900 block">
                              المقدم: {week.activityPresenter}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900">
                        {week.budget ? `الميزانية: ${week.budget} ر.س` : 'الميزانية: -'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendAnnouncement(week)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="إرسال إعلان واتساب"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => handleEditWeek(week)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="تعديل الأسبوع"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWeek(week.id, week.weekNumber, week.valueTitle || week.educationalGoal || week.motto)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="حذف الأسبوع"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: OVERVIEW & ANALYTICS */}
      {activeViewMode === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Box 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-700" />
              <span>معدل إنجاز وتغطية الخطة</span>
            </h4>
            <div className="text-center py-4">
              <span className="text-4xl font-black text-emerald-800">
                {stageFilteredPlan.length > 0
                  ? Math.round((completedCount / stageFilteredPlan.length) * 100)
                  : 0}
                %
              </span>
              <p className="text-xs text-slate-500 mt-1">نسبة الأسابيع المكتملة حتى الآن</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>الأسابيع المنفذة:</span>
                <strong className="text-emerald-800">{completedCount} أسبوعاً</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الأسابيع الجارية:</span>
                <strong className="text-amber-800">{inProgressCount} أسبوعاً</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الأسابيع المتبقية:</span>
                <strong className="text-slate-800">
                  {stageFilteredPlan.length - completedCount - inProgressCount} أسبوعاً
                </strong>
              </div>
            </div>
          </div>

          {/* Summary Box 2: Budget */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <span>الميزانية التربوية المعتمدة</span>
            </h4>
            <div className="text-center py-4">
              <span className="text-4xl font-black text-slate-900">{totalBudget}</span>
              <span className="text-sm font-bold text-slate-500 mr-1">ر.س</span>
              <p className="text-xs text-slate-500 mt-1">إجمالي الميزانيات المقترحة لجميع الأسابيع</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              متوسط ميزانية الأسبوع الواحد:{' '}
              <strong>
                {stageFilteredPlan.length > 0 ? Math.round(totalBudget / stageFilteredPlan.length) : 0} ر.س
              </strong>
            </div>
          </div>

          {/* Summary Box 3: Governance */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700" />
              <span>الحوكمة وصلاحيات المشرف</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isAdmin
                ? 'لديك صلاحية إدارة وتعديل الخطط التربوية لجميع المراحل في المجمع.'
                : isSupervisor
                ? `لديك صلاحية إدارة خطة مرحلتك المعتمدة (${selectedStage?.name || 'مرحلتك'}).`
                : 'أنت في وضع العرض فقط.'}
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1">
              <p>
                <strong>المعلمون بالمرحلة:</strong> {teachers.length} معلماً
              </p>
              <p>
                <strong>الحلقات التابعة:</strong> {visibleHalaqahs.length} حلقة
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (In-App Dialog) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up text-right">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
                {confirmModal.submessage && (
                  <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-100 mt-2">
                    {confirmModal.submessage}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={async () => {
                  const onConf = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await onConf();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-colors cursor-pointer ${
                  confirmModal.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Add / Bulk / Excel / JSON / AI Prompt */}
      {planModalOpen && (
        <EducationalPlanModal
          isOpen={planModalOpen}
          onClose={() => setPlanModalOpen(false)}
          selectedStage={selectedStage}
          teachers={teachers}
          totalSemesterWeeks={academicConfig.totalWeeks || 14}
          editingWeek={editingWeek}
          onSaveSingleWeek={handleSaveSingleWeek}
          onBulkSaveWeeks={handleBulkSaveWeeks}
          currentPlanWeeks={stageFilteredPlan}
        />
      )}

      {/* WhatsApp Report Modal */}
      {reportModalOpen && (
        <ReportDispatchModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          title={reportData.title}
          reportContent={reportData.content}
          recipientName="جروب أولياء الأمور والمعلمين"
          recipientType="prep_week"
          reportType="prep"
        />
      )}

      {/* Official Print & PDF Export Modal */}
      {printModalOpen && (
        <EducationalPlanPrintModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          weeks={stageFilteredPlan}
          stage={selectedStage}
        />
      )}
    </div>
  );
};
