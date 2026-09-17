import React, { useState, useEffect } from 'react';
import {
  PlanService,
  DEMO_PLAN_STUDENTS,
  PlanStudentDemo,
} from '../../quran/services/planService';
import { StudentQuranPlan, DailyPlanItem, PlanningUnitType } from '../../quran/types/plan';
import { Surah } from '../../quran/types';
import { StageQuranConfig } from '../../quran/models/stageConfig';
import { StudentPlanDashboard } from './StudentPlanDashboard';
import { StageConfigModal } from './StageConfigModal';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { getSurahsByDirection, getSurahAyahsCount } from '../../utils/quranMetadata';
import {
  BookOpen,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Sliders,
  History,
  Target,
  ArrowRight,
  Shield,
  Clock,
  UserCheck,
} from 'lucide-react';

export const QuranPlanManager: React.FC = () => {
  const [planService] = useState(() => new PlanService());
  const [studentsList, setStudentsList] = useState<PlanStudentDemo[]>(DEMO_PLAN_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(DEMO_PLAN_STUDENTS[0].id);

  const [allPlans, setAllPlans] = useState<StudentQuranPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudentQuranPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab inside QuranPlanManager
  const [activeMode, setActiveMode] = useState<
    'dashboard' | 'wizard' | 'simulator' | 'override'
  >('dashboard');

  // Stage configs modal
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Wizard state
  const [stageConfigs, setStageConfigs] = useState<StageQuranConfig[]>(() =>
    planService.loadStageConfigs()
  );
  const [wizardTemplateId, setWizardTemplateId] = useState<string>('early_childhood_foundation');
  const [wizardPlanType, setWizardPlanType] = useState<'memorization' | 'revision'>('memorization');
  const [wizardDirection, setWizardDirection] = useState<'forward' | 'backward'>('backward');
  const [wizardStartSurah, setWizardStartSurah] = useState<number>(114);
  const [wizardStartAyah, setWizardStartAyah] = useState<number>(1);
  const [wizardEndSurah, setWizardEndSurah] = useState<number>(105);
  const [wizardEndAyah, setWizardEndAyah] = useState<number>(5);
  const [wizardUnitType, setWizardUnitType] = useState<PlanningUnitType>('ayah');
  const [wizardDailyAmount, setWizardDailyAmount] = useState<number>(2);
  const [wizardRevisionPages, setWizardRevisionPages] = useState<number>(1);
  const [wizardConsolidationDays, setWizardConsolidationDays] = useState<number>(3);
  const [wizardStartDate, setWizardStartDate] = useState<string>('2026-09-01');
  const [wizardEndDate, setWizardEndDate] = useState<string>('2026-10-31');
  const [wizardWorkingDays, setWizardWorkingDays] = useState<number[]>([0, 1, 2, 3]); // Sun to Wed
  const [wizardPreviewPlan, setWizardPreviewPlan] = useState<StudentQuranPlan | null>(null);
  const [wizardGenerating, setWizardGenerating] = useState(false);

  // Simulator state
  const [simSelectedDayId, setSimSelectedDayId] = useState<string>('');
  const [simStatus, setSimStatus] = useState<
    'completed' | 'overachieved' | 'partial' | 'absent' | 'excused'
  >('completed');
  const [simEndAyah, setSimEndAyah] = useState<number>(1);
  const [simEvaluation, setSimEvaluation] = useState<'excellent' | 'very_good' | 'good' | 'needs_practice'>('excellent');
  const [simNotes, setSimNotes] = useState<string>('أنجز الورد بإتقان');
  const [simRecordedBy, setSimRecordedBy] = useState<string>('المعلم صالح العبدالله');
  const [simProcessing, setSimProcessing] = useState(false);

  // Override state
  const [overrideDate, setOverrideDate] = useState<string>('2026-09-10');
  const [overrideReason, setOverrideReason] = useState<string>('amount_increase');
  const [overrideArabicText, setOverrideArabicText] = useState<string>(
    'رفع مقدار الحفظ لتسارع استيعاب الطالب المتميز'
  );
  const [overrideNewAmount, setOverrideNewAmount] = useState<number>(3);
  const [overrideProcessing, setOverrideProcessing] = useState(false);

  // Surah list helper (114 surahs)
  const [surahs, setSurahs] = useState<Surah[]>(() =>
    planService.getProvider().getAllSurahs ? planService.getProvider().getAllSurahs!() : []
  );

  // Load plans on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (surahs.length === 0) {
          const s = await planService.getProvider().getSurahs();
          setSurahs(s);
        }
        const plans = await planService.loadAllPlans();
        const validPlans = (plans || []).filter(
          (p) =>
            p &&
            p.generatedPlan &&
            Array.isArray(p.generatedPlan.dailyPlans) &&
            p.generatedPlan.dailyPlans.length > 0
        );
        setAllPlans(validPlans);
        const current = validPlans.find((p) => p.studentId === selectedStudentId) || validPlans[0];
        setActivePlan(current || null);
        if (current && current.generatedPlan?.dailyPlans?.length > 0) {
          setSimSelectedDayId(current.generatedPlan.dailyPlans[0].id);
        }
      } catch (err) {
        console.error('Failed to load Quran plans:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedStudentId]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    const plan = allPlans.find((p) => p.studentId === studentId);
    setActivePlan(plan || null);
    if (plan && plan.generatedPlan?.dailyPlans?.length > 0) {
      setSimSelectedDayId(plan.generatedPlan.dailyPlans[0].id);
    }
  };

  // Quick apply template to Wizard
  const handleApplyWizardTemplate = (configId: string) => {
    setWizardTemplateId(configId);
    const cfg = stageConfigs.find((c) => c.id === configId);
    if (cfg) {
      if (cfg.memorization) {
        setWizardDirection(cfg.memorization.defaultDirection);
        setWizardUnitType(cfg.memorization.unitType);
        setWizardDailyAmount(cfg.memorization.defaultDailyAmount);
        if (cfg.memorization.defaultTargetStart) {
          setWizardStartSurah(cfg.memorization.defaultTargetStart.surahNumber);
          setWizardStartAyah(cfg.memorization.defaultTargetStart.ayahNumber);
        }
        if (cfg.memorization.defaultTargetEnd) {
          setWizardEndSurah(cfg.memorization.defaultTargetEnd.surahNumber);
          setWizardEndAyah(cfg.memorization.defaultTargetEnd.ayahNumber);
        }
      }
      if (cfg.schedule && cfg.schedule.workingDays) {
        setWizardWorkingDays(cfg.schedule.workingDays);
      }
      if (cfg.revision) {
        setWizardRevisionPages(cfg.revision.defaultDailyPages ?? 1);
      }
      if (cfg.consolidationDays !== undefined) {
        setWizardConsolidationDays(cfg.consolidationDays);
      }
    }
  };

  // Generate wizard preview
  const handleGeneratePreview = async () => {
    setWizardGenerating(true);
    try {
      if (wizardPlanType === 'memorization') {
        const preview = await planService.memorizationEngine.createPlan({
          studentId: selectedStudentId,
          startDate: wizardStartDate,
          endDate: wizardEndDate,
          targetStart: { surahNumber: wizardStartSurah, ayahNumber: wizardStartAyah },
          targetEnd: { surahNumber: wizardEndSurah, ayahNumber: wizardEndAyah },
          direction: wizardDirection,
          unitType: wizardUnitType,
          dailyAmount: wizardDailyAmount,
          revisionDailyPages: wizardRevisionPages,
          consolidationDaysPerSurah: wizardConsolidationDays,
          schedule: { workingDays: wizardWorkingDays },
        });
        setWizardPreviewPlan(preview);
      } else {
        const preview = await planService.revisionEngine.createPlan({
          studentId: selectedStudentId,
          startDate: wizardStartDate,
          endDate: wizardEndDate,
          targetStart: { surahNumber: wizardStartSurah, ayahNumber: wizardStartAyah },
          targetEnd: { surahNumber: wizardEndSurah, ayahNumber: wizardEndAyah },
          direction: wizardDirection,
          mode: wizardUnitType === 'surah' ? 'surahs' : wizardUnitType === 'quarter' ? 'quarters' : 'pages',
          dailyAmount: wizardDailyAmount,
          schedule: { workingDays: wizardWorkingDays },
        });
        setWizardPreviewPlan(preview);
      }
    } catch (e) {
      console.error('Error generating preview:', e);
    } finally {
      setWizardGenerating(false);
    }
  };

  // Save Wizard Plan
  const handleSaveWizardPlan = async () => {
    if (!wizardPreviewPlan) return;
    await planService.saveOrUpdatePlan(wizardPreviewPlan);
    const updatedAll = await planService.loadAllPlans();
    setAllPlans(updatedAll);
    setActivePlan(wizardPreviewPlan);
    setActiveMode('dashboard');
  };

  // Run Recalculation Simulator
  const handleRunSimulator = async () => {
    if (
      !activePlan ||
      !activePlan.generatedPlan ||
      !Array.isArray(activePlan.generatedPlan.dailyPlans) ||
      !simSelectedDayId
    )
      return;
    setSimProcessing(true);

    const targetDay = activePlan.generatedPlan.dailyPlans.find(
      (d) => d.id === simSelectedDayId
    );
    if (!targetDay) {
      setSimProcessing(false);
      return;
    }

    try {
      const updatedPlan = await planService.recalculationService.recordDailyAchievement({
        plan: activePlan,
        dayDate: targetDay.date,
        status: simStatus,
        actualEndPosition:
          simStatus === 'overachieved' || simStatus === 'partial'
            ? {
                surahNumber: targetDay.targetUnit.end.surahNumber,
                ayahNumber: simEndAyah || targetDay.targetUnit.end.ayahNumber,
              }
            : undefined,
        recordedBy: simRecordedBy,
        evaluation: simEvaluation,
        notes: simNotes,
      });

      await planService.saveOrUpdatePlan(updatedPlan);
      const updatedPlans = await planService.loadAllPlans();
      setAllPlans(updatedPlans);
      setActivePlan(updatedPlan);
      setActiveMode('dashboard');
    } catch (err) {
      console.error('Simulator recalculation error:', err);
    } finally {
      setSimProcessing(false);
    }
  };

  // Apply Teacher Override
  const handleApplyOverride = async () => {
    if (!activePlan) return;
    setOverrideProcessing(true);
    try {
      const updatedPlan = await planService.recalculationService.applyTeacherOverride({
        plan: activePlan,
        teacherId: 'teacher_salih',
        teacherName: 'الأستاذ صالح العبدالله',
        effectiveFromDate: overrideDate,
        reason: overrideReason as any,
        reasonArabicText: overrideArabicText,
        newDailyAmount: overrideNewAmount,
      });

      await planService.saveOrUpdatePlan(updatedPlan);
      const updatedPlans = await planService.loadAllPlans();
      setAllPlans(updatedPlans);
      setActivePlan(updatedPlan);
      setActiveMode('dashboard');
    } catch (err) {
      console.error('Teacher override error:', err);
    } finally {
      setOverrideProcessing(false);
    }
  };

  const selectedStudent = studentsList.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white shadow-sm border border-emerald-700/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black tracking-wider">
                المرحلة الثانية • UNIVERSAL PLANNING ENGINE
              </span>
              <span className="text-emerald-300 text-xs">مستقل وقابل للتوسع لأي مرحلة أو صف</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-300" />
              <span>محرك التخطيط القرآني العام</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              محرك قرآني موحد يدعم الحفظ والمراجعة (تنازلياً وتصاعدياً)، ويحافظ على حرمة السجل التاريخي (Immutability)، مع إعادة الحساب التلقائي وتشخيص تعثر الوتيرة وسجل رقابة المعلم.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-500/40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تعديل إعدادات المراحل العامة"
            >
              <Sliders className="w-4 h-4 text-amber-300" />
              <span>إعدادات المراحل العامة</span>
            </button>
          </div>
        </div>

        {/* Student Selector Pills */}
        <div className="mt-5 pt-4 border-t border-emerald-700/60 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-emerald-200 shrink-0 ml-1">
            نماذج الطلاب والخطط:
          </span>
          {studentsList.map((st) => {
            const isSelected = st.id === selectedStudentId;
            return (
              <button
                key={st.id}
                onClick={() => handleSelectStudent(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-emerald-800/80 text-emerald-100 hover:bg-emerald-700 border border-emerald-600'
                }`}
              >
                <span>{st.name}</span>
                <span className="text-[10px] opacity-80">({st.gradeName})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Mode Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveMode('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'dashboard'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>لوحة عرض الخطة (Plan Dashboard)</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('wizard');
              handleApplyWizardTemplate(wizardTemplateId);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'wizard'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>معالج بناء خطة جديدة (Plan Wizard)</span>
          </button>

          <button
            onClick={() => setActiveMode('simulator')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'simulator'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>تسجيل إنجاز ومحاكي إعادة الحساب (Recalculation)</span>
          </button>

          <button
            onClick={() => setActiveMode('override')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'override'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>تدخل المعلم المباشر (Teacher Override)</span>
          </button>
        </div>

        {selectedStudent && (
          <div className="text-xs text-slate-500 font-semibold px-2">
            الطالب النشط: <b className="text-slate-900">{selectedStudent.name}</b>
          </div>
        )}
      </div>

      {/* 3. MODE CONTENT */}

      {/* MODE 1: DASHBOARD VIEW */}
      {activeMode === 'dashboard' && (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold">
              جارٍ تحميل وتجهيز الخطة القرآنية...
            </div>
          ) : activePlan ? (
            <StudentPlanDashboard
              plan={activePlan}
              onRecordDay={(day) => {
                setSimSelectedDayId(day.id);
                setActiveMode('simulator');
              }}
            />
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-slate-600 font-bold mb-3">لا توجد خطة معتمدة لهذا الطالب حالياً</p>
              <button
                onClick={() => setActiveMode('wizard')}
                className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold"
              >
                إنشاء خطة جديدة الآن
              </button>
            </div>
          )}
        </>
      )}

      {/* MODE 2: PLAN WIZARD */}
      {activeMode === 'wizard' && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-700" />
                  <span>معالج بناء خطة قرآنية مخصصة (Custom Plan Wizard)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  بناء خطة دقيقة تعتمد على إحداثيات المصحف الحقيقية ووحدات التخطيط المرنة
                </p>
              </div>

              {/* Template Quick Loader */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">قالب المرحلة:</span>
                <select
                  value={wizardTemplateId}
                  onChange={(e) => handleApplyWizardTemplate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800"
                >
                  {stageConfigs.map((cfg) => (
                    <option key={cfg.id} value={cfg.id}>
                      {cfg.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Plan Type */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">نوع الخطة:</label>
                <select
                  value={wizardPlanType}
                  onChange={(e) => setWizardPlanType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                >
                  <option value="memorization">خطة حفظ جديد (Memorization)</option>
                  <option value="revision">خطة مراجعة وتثبيت (Revision)</option>
                </select>
              </div>

              {/* Direction */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">اتجاه السير القرآني:</label>
                <select
                  value={wizardDirection}
                  onChange={(e) => setWizardDirection(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                >
                  <option value="backward">تنازلي (من الناس نحو البقرة - قصار السور)</option>
                  <option value="forward">تصاعدي (من الفاتحة نحو الناس)</option>
                </select>
              </div>

              {/* Unit Type */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">وحدة التخطيط اليومية:</label>
                <select
                  value={wizardUnitType}
                  onChange={(e) => setWizardUnitType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                >
                  <option value="ayah">بالآيات (Ayahs)</option>
                  <option value="half_page">نصف صفحة (Half Page)</option>
                  <option value="page">صفحة كاملة (Page)</option>
                  <option value="quarter">ربع حزب (Quarter / Rub)</option>
                  <option value="surah">سورة كاملة (Surah)</option>
                </select>
              </div>

              {/* Daily Amount */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  المقدار اليومي المقرر:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={wizardDailyAmount}
                  onChange={(e) => setWizardDailyAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  مثال: 2 آية / يوم، أو نصف صفحة / يوم، أو سورتين / يوم
                </span>
              </div>

              {/* Date Range */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">تاريخ البداية والنهاية:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={wizardStartDate}
                    onChange={(e) => setWizardStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono"
                  />
                  <input
                    type="date"
                    value={wizardEndDate}
                    onChange={(e) => setWizardEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Revision Daily Pages */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">مقدار المراجعة اليومية (صفحات):</label>
                <select
                  value={wizardRevisionPages}
                  onChange={(e) => setWizardRevisionPages(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                >
                  <option value="0.5">نصف صفحة (0.5)</option>
                  <option value="1">صفحة واحدة (1)</option>
                  <option value="2">صفحتان (2)</option>
                  <option value="3">3 صفحات</option>
                  <option value="4">4 صفحات</option>
                  <option value="5">5 صفحات</option>
                  <option value="10">نصف جزء (10 صفحات)</option>
                  <option value="20">جزء كامل (20 صفحة)</option>
                </select>
              </div>

              {/* Surah Consolidation Days */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">أيام تثبيت السورة المنتهية:</label>
                <select
                  value={wizardConsolidationDays}
                  onChange={(e) => setWizardConsolidationDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold"
                >
                  <option value="3">3 أيام متتالية (المعيار التربوي المعتمد)</option>
                  <option value="2">يومان</option>
                  <option value="1">يوم واحد</option>
                  <option value="0">بدون أيام تثبيت</option>
                </select>
              </div>

              {/* Working Days */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">أيام الدراسة الأسبوعية:</label>
                  <button
                    type="button"
                    onClick={() => setWizardWorkingDays([0, 1, 2, 3])}
                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                    title="تطبيق الأحد إلى الأربعاء"
                  >
                    (الأحد - الأربعاء)
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { d: 0, l: 'أحد' },
                    { d: 1, l: 'اثنين' },
                    { d: 2, l: 'ثلاثاء' },
                    { d: 3, l: 'أربعاء' },
                    { d: 4, l: 'خميس' },
                    { d: 5, l: 'جمعة' },
                    { d: 6, l: 'سبت' },
                  ].map((day) => {
                    const isChecked = wizardWorkingDays.includes(day.d);
                    return (
                      <button
                        key={day.d}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setWizardWorkingDays(wizardWorkingDays.filter((w) => w !== day.d));
                          } else {
                            setWizardWorkingDays([...wizardWorkingDays, day.d]);
                          }
                        }}
                        className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Start & End Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-emerald-900 block">نقطة البداية (Target Start):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">السورة:</label>
                    <select
                      value={wizardStartSurah}
                      onChange={(e) => {
                        const newSurah = Number(e.target.value);
                        setWizardStartSurah(newSurah);
                        const maxA = getSurahAyahsCount(newSurah);
                        if (wizardStartAyah > maxA) setWizardStartAyah(maxA);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
                    >
                      {getSurahsByDirection(wizardDirection).map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.name} ({s.ayahsCount} آية)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <QuranAyahSelect
                      id="wizard_start_ayah"
                      surah={wizardStartSurah}
                      value={wizardStartAyah}
                      onChange={setWizardStartAyah}
                      label="الآية"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-emerald-900 block">نقطة النهاية (Target End):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">السورة:</label>
                    <select
                      value={wizardEndSurah}
                      onChange={(e) => {
                        const newSurah = Number(e.target.value);
                        setWizardEndSurah(newSurah);
                        const maxA = getSurahAyahsCount(newSurah);
                        if (wizardEndAyah > maxA) setWizardEndAyah(maxA);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
                    >
                      {getSurahsByDirection(wizardDirection).map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.name} ({s.ayahsCount} آية)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <QuranAyahSelect
                      id="wizard_end_ayah"
                      surah={wizardEndSurah}
                      value={wizardEndAyah}
                      onChange={setWizardEndAyah}
                      label="الآية"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Generate preview */}
            <div className="flex items-center justify-between pt-3 border-t">
              <button
                onClick={handleGeneratePreview}
                disabled={wizardGenerating}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {wizardGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ بناء المعاينة...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>توليد ومعاينة الخطة قبل الاعتماد</span>
                  </>
                )}
              </button>

              {wizardPreviewPlan && (
                <button
                  onClick={handleSaveWizardPlan}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-emerald-950 font-black text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد وحفظ الخطة للطالب</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Preview Display */}
          {wizardPreviewPlan && (
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-300 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    معاينة حية للخطة الناتجة ({wizardPreviewPlan.generatedPlan?.dailyPlans?.length || 0} يوماً)
                  </span>
                </h4>
                <span className="text-xs text-slate-500">
                  {wizardPreviewPlan.originalTarget?.displayTarget || ''}
                </span>
              </div>
              <StudentPlanDashboard plan={wizardPreviewPlan} readOnly={true} />
            </div>
          )}
        </div>
      )}

      {/* MODE 3: RECALCULATION SIMULATOR */}
      {activeMode === 'simulator' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b pb-3">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-700" />
              <span>محاكي تسجيل الإنجاز وإعادة الحساب التلقائي (Recalculation Simulator)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              اختبر عملياً كيف يُعيد النظام جدولة الأيام المستقبلية فورياً، مع الحفاظ الصارم على حرمة السجل التاريخي (Immutability)، وظهور إنذار تعثر الوتيرة (At-Risk) إن تأخر الطالب دون تقليص المستهدف سراً.
            </p>
          </div>

          {activePlan && activePlan.generatedPlan?.dailyPlans && activePlan.generatedPlan.dailyPlans.length > 0 ? (
            <div className="space-y-4 text-xs">
              {/* Select Day */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">اختر اليوم من جدول الطالب:</label>
                <select
                  value={simSelectedDayId}
                  onChange={(e) => setSimSelectedDayId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                >
                  {(activePlan?.generatedPlan?.dailyPlans || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dayName} ({d.date}) — المقرر: {d.targetUnit.displayLabel} [الحالة: {d.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Achievement Status */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">حالة الإنجاز اليومي:</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { s: 'completed', l: 'تم الإنجاز بنجاح (Completed)' },
                    { s: 'overachieved', l: 'فائض / متفوق (Surplus)' },
                    { s: 'partial', l: 'إنجاز جزئي (Partial)' },
                    { s: 'absent', l: 'غياب الطالب (Absent)' },
                    { s: 'excused', l: 'استئذان بعذر (Excused)' },
                  ].map((item) => (
                    <button
                      key={item.s}
                      type="button"
                      onClick={() => setSimStatus(item.s as any)}
                      className={`p-2.5 rounded-xl font-bold text-xs cursor-pointer border text-center transition-all ${
                        simStatus === item.s
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* End Ayah if overachieved or partial */}
              {(simStatus === 'overachieved' || simStatus === 'partial') && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 block">
                      الآية الفعلية التي وصل إليها الطالب:
                    </span>
                    <span className="text-[11px] text-amber-800 font-bold">
                      {activePlan?.generatedPlan?.dailyPlans?.find((d) => d.id === simSelectedDayId)?.targetUnit?.end?.surahName || ''}
                    </span>
                  </div>
                  <QuranAyahSelect
                    id="sim_end_ayah"
                    surah={activePlan?.generatedPlan?.dailyPlans?.find((d) => d.id === simSelectedDayId)?.targetUnit?.end?.surahNumber || 114}
                    value={simEndAyah}
                    onChange={setSimEndAyah}
                    selectClassName="bg-white border-amber-300 font-bold"
                  />
                  <p className="text-[11px] text-amber-900">
                    في حالة التفوق (Surplus)، سينطلق اليوم القادم من الآية التالية مباشرة.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">التقييم التربوي:</label>
                  <select
                    value={simEvaluation}
                    onChange={(e) => setSimEvaluation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="excellent">ممتاز (حفظ متقن ومخارج سليمة)</option>
                    <option value="very_good">جيد جداً (إتقان مع تنبيه يسير)</option>
                    <option value="good">جيد (يحتاج مزيد تثبيت)</option>
                    <option value="needs_followup">يحتاج متابعة وتكرار</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم المعلم المسجّل:</label>
                  <input
                    type="text"
                    value={simRecordedBy}
                    onChange={(e) => setSimRecordedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات المعلم:</label>
                <input
                  type="text"
                  value={simNotes}
                  onChange={(e) => setSimNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              {/* Submit Recalculate */}
              <div className="pt-3 border-t flex justify-end">
                <button
                  onClick={handleRunSimulator}
                  disabled={simProcessing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {simProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ إعادة الحساب...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-300" />
                      <span>تسجيل الإنجاز وإعادة الحساب التلقائي</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 font-bold">يرجى اختيار طالب لديه خطة نشطة أولاً</p>
          )}
        </div>
      )}

      {/* MODE 4: TEACHER OVERRIDE */}
      {activeMode === 'override' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b pb-3">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-700" />
              <span>تدخل وتعديل المعلم المباشر (Teacher Override & Audit Logging)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              يمكّن المعلم من تعديل وتيرة الطالب بدءاً من تاريخ معين (مثلاً لرفع أو خفض المقدار لظروف خاصة)، مع إدراج التعديل فوراً في سجل الرقابة وتحديث رقم إصدار الخطة (Version Bump).
            </p>
          </div>

          {activePlan ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ سريان التعديل:</label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    الأيام التي تسبق هذا التاريخ تظل مقفلة ومصونة تماماً.
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">سبب التعديل الرسمي:</label>
                  <select
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="amount_increase">رفع المقدار (استيعاب سريع وتفوق)</option>
                    <option value="amount_decrease">تخفيض المقدار مؤقتاً للتثبيت</option>
                    <option value="illness">ظروف صحية أو استئذان طارئ</option>
                    <option value="schedule_change">تغيير أيام الدراسة الأسبوعية</option>
                    <option value="other">أسباب تربوية أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  المقدار اليومي الجديد المقرر:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={overrideNewAmount}
                  onChange={(e) => setOverrideNewAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  شرح المعلم المدوّن في سجل الرقابة (Audit Reason):
                </label>
                <input
                  type="text"
                  value={overrideArabicText}
                  onChange={(e) => setOverrideArabicText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                />
              </div>

              {/* Submit Override */}
              <div className="pt-3 border-t flex justify-end">
                <button
                  onClick={handleApplyOverride}
                  disabled={overrideProcessing}
                  className="px-6 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {overrideProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جارٍ تطبيق التعديل...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-blue-200" />
                      <span>اعتماد تدخل المعلم وتحديث الخطة فورياً</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 font-bold">يرجى اختيار طالب لديه خطة نشطة أولاً</p>
          )}
        </div>
      )}

      {/* Stage Config Modal */}
      <StageConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        planService={planService}
        onConfigUpdated={() => {
          setStageConfigs(planService.loadStageConfigs());
        }}
      />
    </div>
  );
};
