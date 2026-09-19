import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Award,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Search,
  BookMarked,
  Feather,
  Heart,
  Target,
  X,
  Save,
  Check,
  Compass,
  DollarSign,
  User,
  Eye,
} from 'lucide-react';
import { StageQuranConfig } from '../../quran/models/stageConfig';
import { SpellingLesson, SubLesson, EducationalPlanWeek } from '../../types';
import { StageConfigModal } from '../quran/StageConfigModal';
import { BadgesManagementModal } from '../teacher/BadgesManagementModal';
import { BADGE_DEFINITIONS } from '../../utils/badgeSystem';
import { QuranPlanManager } from '../quran/QuranPlanManager';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TemplatePlanPreviewModal } from './TemplatePlanPreviewModal';

const formatMemorizationPace = (amount: number = 1, unitType: string = 'line'): string => {
  switch (unitType) {
    case 'line':
    case 'lines':
      if (amount === 1) return '1 سطر مصحف';
      if (amount === 2) return 'سطران مصحف';
      if (amount >= 3 && amount <= 10) return `${amount} أسطر مصحف`;
      return `${amount} سطر مصحف`;
    case 'ayah':
    case 'ayahs':
      if (amount === 1) return 'آية واحدة';
      if (amount === 2) return 'آيتان';
      if (amount >= 3 && amount <= 10) return `${amount} آيات`;
      return `${amount} آية`;
    case 'quarter_page':
      if (amount === 1) return 'ربع صفحة';
      if (amount === 2) return 'نصف صفحة (ربعان)';
      return `${amount} أرباع صفحة`;
    case 'half_page':
      if (amount === 1) return 'نصف صفحة';
      if (amount === 2) return 'صفحة كاملة (نصفان)';
      return `${amount} أنصاف صفحات`;
    case 'page':
    case 'pages':
      if (amount === 1) return 'صفحة واحدة';
      if (amount === 2) return 'صفحتان';
      if (amount >= 3 && amount <= 10) return `${amount} صفحات`;
      return `${amount} صفحة`;
    case 'quarter':
    case 'quarters':
      if (amount === 1) return 'ربع حزب';
      if (amount === 2) return 'نصف حزب (ربعان)';
      return `${amount} أرباع حزب`;
    case 'surah':
    case 'surahs':
      if (amount === 1) return 'سورة واحدة';
      if (amount === 2) return 'سورتان';
      if (amount >= 3 && amount <= 10) return `${amount} سور`;
      return `${amount} سورة`;
    default:
      return `${amount} ${unitType}`;
  }
};

const formatWorkingDaysDisplay = (days?: number[]): string => {
  if (!Array.isArray(days) || days.length === 0) return 'غير محدد';
  const count = days.length;
  if (count === 1) return 'يوم واحد أسبوعياً';
  if (count === 2) return 'يومان أسبوعياً';
  if (count >= 3 && count <= 10) return `${count} أيام أسبوعياً`;
  return `${count} يوم أسبوعياً`;
};

export const CurriculumTemplatesTab: React.FC = () => {
  const {
    quranStageConfigs,
    deleteQuranStageConfig,
    resetQuranStageConfigs,
    spellingLessons,
    addSpellingLesson,
    updateSpellingLesson,
    deleteSpellingLesson,
    addSubLesson,
    deleteSubLesson,
    educationalPlan,
    addEducationalWeek,
    updateEducationalWeek,
    deleteEducationalWeek,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<
    'quran_templates' | 'plan_engine' | 'spelling_lessons' | 'educational_goals' | 'badges_incentives'
  >('quran_templates');

  // Quran Stage Config Modal State
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [stageModalSelectedId, setStageModalSelectedId] = useState<string | undefined>(undefined);
  const [deleteStageConfirmId, setDeleteStageConfirmId] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<StageQuranConfig | null>(null);

  // Spelling Lesson State
  const [spellingSearch, setSpellingSearch] = useState('');
  const [editingLesson, setEditingLesson] = useState<Partial<SpellingLesson> | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [deleteLessonConfirmId, setDeleteLessonConfirmId] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubMaxScore, setNewSubMaxScore] = useState(100);
  const [selectedLessonForSub, setSelectedLessonForSub] = useState<string | null>(null);

  // Educational Goals State
  const [editingWeek, setEditingWeek] = useState<Partial<EducationalPlanWeek> | null>(null);
  const [isNewWeek, setIsNewWeek] = useState(false);
  const [deleteWeekConfirmId, setDeleteWeekConfirmId] = useState<string | null>(null);

  // Badges Modal State
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

  // Filtered spelling lessons
  const filteredLessons = useMemo(() => {
    if (!spellingSearch.trim()) return spellingLessons;
    const q = spellingSearch.toLowerCase();
    return spellingLessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.skill && l.skill.toLowerCase().includes(q))
    );
  }, [spellingLessons, spellingSearch]);

  // Handle save spelling lesson
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title?.trim()) {
      alert('يرجى كتابة عنوان الدرس');
      return;
    }

    if (isNewLesson) {
      addSpellingLesson({
        lessonNumber: editingLesson.lessonNumber || spellingLessons.length + 1,
        title: editingLesson.title.trim(),
        skill: editingLesson.skill || '',
        description: editingLesson.description || '',
        order: editingLesson.order || spellingLessons.length + 1,
        passingScore: editingLesson.passingScore || 85,
        targetGrade: editingLesson.targetGrade || 'الكل',
        subLessons: editingLesson.subLessons || [],
      });
    } else if (editingLesson.id) {
      updateSpellingLesson(editingLesson.id, {
        title: editingLesson.title.trim(),
        skill: editingLesson.skill,
        description: editingLesson.description,
        lessonNumber: editingLesson.lessonNumber,
        passingScore: editingLesson.passingScore,
        targetGrade: editingLesson.targetGrade,
      });
    }

    setEditingLesson(null);
    setIsNewLesson(false);
  };

  // Handle add sub lesson
  const handleAddSubLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonForSub || !newSubTitle.trim()) return;

    addSubLesson(selectedLessonForSub, {
      title: newSubTitle.trim(),
      maxScore: newSubMaxScore,
    });

    setNewSubTitle('');
    setNewSubMaxScore(100);
    setSelectedLessonForSub(null);
  };

  // Handle save educational week
  const handleSaveWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeek || !editingWeek.educationalGoal?.trim()) {
      alert('يرجى كتابة الهدف التربوي العام');
      return;
    }

    if (isNewWeek) {
      addEducationalWeek({
        weekNumber: editingWeek.weekNumber || educationalPlan.length + 1,
        startDate: editingWeek.startDate || new Date().toISOString().split('T')[0],
        endDate: editingWeek.endDate || new Date().toISOString().split('T')[0],
        educationalGoal: editingWeek.educationalGoal.trim(),
        motto: editingWeek.motto || editingWeek.educationalGoal.trim(),
        responsiblePerson: editingWeek.responsiblePerson || 'معلم الحلقة',
        budget: editingWeek.budget || 0,
        activity: editingWeek.activity || '',
        notes: editingWeek.notes || '',
        status: editingWeek.status || 'scheduled',
      });
    } else if (editingWeek.id) {
      updateEducationalWeek(editingWeek.id, {
        educationalGoal: editingWeek.educationalGoal.trim(),
        motto: editingWeek.motto,
        responsiblePerson: editingWeek.responsiblePerson,
        budget: editingWeek.budget,
        activity: editingWeek.activity,
        notes: editingWeek.notes,
        weekNumber: editingWeek.weekNumber,
        startDate: editingWeek.startDate,
        endDate: editingWeek.endDate,
        status: editingWeek.status,
      });
    }

    setEditingWeek(null);
    setIsNewWeek(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Main Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-white">
              قوالب الخطط القرآنية المعتمدة
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-3xl leading-relaxed font-medium">
            إدارة قوالب الخطط القرآنية، مناهج الهجاء، الأهداف التربوية، ومنظومة الأوسمة لجميع المراحل.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setStageModalSelectedId(undefined);
              setStageModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-emerald-500/30"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة نموذج قرآني</span>
          </button>
        </div>
      </div>

      {/* Subtabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveSubTab('quran_templates')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'quran_templates'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📖 قوالب الخطط القرآنية ({quranStageConfigs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('plan_engine')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'plan_engine'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>⚡ محرك التخطيط القرآني والمحاكي المتقدم</span>
        </button>

        <button
          onClick={() => setActiveSubTab('spelling_lessons')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'spelling_lessons'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Feather className="w-4 h-4" />
          <span>✍️ منهج ودروس الهجاء ({spellingLessons.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('educational_goals')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'educational_goals'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Heart className="w-4 h-4 text-rose-500" />
          <span>🌟 بنك الأهداف والخطط التربوية ({educationalPlan.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('badges_incentives')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'badges_incentives'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>🏅 منظومة الأوسمة والتحفيز ({Object.keys(BADGE_DEFINITIONS).length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. QURAN STAGE CONFIGS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'quran_templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                قوالب ونماذج المراحل القرآنية المعتمدة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تظهر هذه النماذج في نافذة الخطة القرآنية للطالب ومعالج إنشاء الخطط الجماعية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStageModalSelectedId(undefined);
                  setStageModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نموذج جديد</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (confirm('هل ترغب في استعادة القوالب الافتراضية للنظام؟')) {
                    await resetQuranStageConfigs();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="استعادة القوالب الافتراضية الأصلية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quranStageConfigs.map((cfg) => {
              const isBackward = cfg.memorization?.defaultDirection === 'backward';
              return (
                <div
                  key={cfg.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                          <h4 className="font-black text-sm text-slate-900">{cfg.name}</h4>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          {cfg.code}
                        </span>
                      </div>

                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
                          isBackward
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {isBackward ? 'تنازلي (من الناس للبقرة)' : 'تصاعدي (من الفاتحة للناس)'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {cfg.description || 'خطة قرآنية معتمدة'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-800 font-bold block">
                          مقدار الحفظ اليومي:
                        </span>
                        <span className="font-black text-emerald-950">
                          {formatMemorizationPace(
                            cfg.memorization?.defaultDailyAmount,
                            cfg.memorization?.unitType
                          )}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-600 font-bold block">
                          أيام التسميع بالأسبوع:
                        </span>
                        <span className="font-black text-slate-900">
                          {formatWorkingDaysDisplay(cfg.schedule?.workingDays)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] text-slate-400 font-medium">
                      الصفوف: {(cfg.targetGrades || []).join('، ') || 'عام'}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPreviewConfig(cfg)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                        title="معاينة جدول وتوزيع الخطة القرآنية"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>معاينة الخطة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStageModalSelectedId(cfg.id);
                          setStageModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل القالب</span>
                      </button>

                      {quranStageConfigs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDeleteStageConfirmId(cfg.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors cursor-pointer"
                          title="حذف هذا النموذج"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {deleteStageConfirmId === cfg.id && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800 animate-fadeIn">
                      <span className="font-bold">تأكيد حذف هذا النموذج؟</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteQuranStageConfig(cfg.id);
                            setDeleteStageConfirmId(null);
                          }}
                          className="px-2 py-1 bg-rose-700 text-white rounded-md font-bold cursor-pointer"
                        >
                          نعم، احذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteStageConfirmId(null)}
                          className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded-md font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADVANCED QURAN PLAN ENGINE & SIMULATOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'plan_engine' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>محرك وهندسة الخطط القرآنية المتقدم والمحاكي</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد خطط الحفظ التلقائية، اختبار التعويض عند الغياب أو التجاوز، وضبط المقادير المنهجية
              </p>
            </div>
          </div>
          <ErrorBoundary
            fallbackTitle="تعذر تحميل محرك التخطيط القرآني"
            fallbackMessage="حدث خطأ غير متوقع أثناء معالجة بيانات المصحف الشريف أو خطط الطلاب."
          >
            <QuranPlanManager />
          </ErrorBoundary>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SPELLING LESSONS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'spelling_lessons' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={spellingSearch}
                onChange={(e) => setSpellingSearch(e.target.value)}
                placeholder="بحث في دروس وقواعد الهجاء القرآني..."
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-emerald-700"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewLesson(true);
                setEditingLesson({
                  lessonNumber: spellingLessons.length + 1,
                  title: '',
                  skill: '',
                  description: '',
                  passingScore: 85,
                  targetGrade: 'الكل',
                  subLessons: [],
                });
              }}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة درس هجاء جديد</span>
            </button>
          </div>

          {/* Lessons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xs">
                      {lesson.lessonNumber}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{lesson.title}</h4>
                      {lesson.skill && (
                        <span className="text-[11px] font-bold text-emerald-700 block">
                          المهارة: {lesson.skill}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewLesson(false);
                        setEditingLesson({ ...lesson });
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="تعديل الدرس"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteLessonConfirmId(lesson.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                      title="حذف الدرس"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {deleteLessonConfirmId === lesson.id && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800 animate-fadeIn">
                    <span className="font-bold">حذف درس «{lesson.title}»؟</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          deleteSpellingLesson(lesson.id);
                          setDeleteLessonConfirmId(null);
                        }}
                        className="px-2 py-1 bg-rose-700 text-white rounded-md font-bold cursor-pointer"
                      >
                        نعم، احذف
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteLessonConfirmId(null)}
                        className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded-md font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {lesson.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                    {lesson.description}
                  </p>
                )}

                {/* Sub-lessons */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      الفقرات والتمارين الفرعية ({lesson.subLessons?.length || 0}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLessonForSub(lesson.id)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة فقرة</span>
                    </button>
                  </div>

                  {lesson.subLessons && lesson.subLessons.length > 0 ? (
                    <div className="space-y-1">
                      {lesson.subLessons.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-1.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between text-slate-700"
                        >
                          <span className="font-bold">{sub.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({sub.maxScore || 100} د)
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSubLesson(lesson.id, sub.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                              title="حذف الفقرة"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">لا توجد فقرات فرعية لهذا الدرس بعد.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDUCATIONAL GOALS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'educational_goals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                بنك القيم والخطط التربوية الأسبوعية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                القيم التربوية، الشعارات الأسبوعية، الأنشطة التطبيقية، والتحديات السلوكية
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewWeek(true);
                setEditingWeek({
                  weekNumber: educationalPlan.length + 1,
                  educationalGoal: '',
                  motto: '',
                  responsiblePerson: 'معلم الحلقة',
                  budget: 0,
                  activity: '',
                  notes: '',
                });
              }}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أسبوع / هدف تربوي</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {educationalPlan.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center font-black text-xs">
                      {plan.weekNumber}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">
                        الأسبوع {plan.weekNumber}: {plan.motto || plan.educationalGoal}
                      </h4>
                      <span className="text-[11px] text-slate-500 block">
                        الهدف: {plan.educationalGoal}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewWeek(false);
                        setEditingWeek({ ...plan });
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="تعديل الأسبوع"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteWeekConfirmId(plan.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                      title="حذف الأسبوع"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {deleteWeekConfirmId === plan.id && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800 animate-fadeIn">
                    <span className="font-bold">حذف الأسبوع {plan.weekNumber}؟</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          deleteEducationalWeek(plan.id);
                          setDeleteWeekConfirmId(null);
                        }}
                        className="px-2 py-1 bg-rose-700 text-white rounded-md font-bold cursor-pointer"
                      >
                        نعم، احذف
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteWeekConfirmId(null)}
                        className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded-md font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                {plan.activity && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950">
                    <span className="font-bold block mb-0.5">النشاط التطبيقي المقترح:</span>
                    <p>{plan.activity}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>المسؤول: {plan.responsiblePerson || 'معلم الحلقة'}</span>
                  <span>الميزانية: {plan.budget || 0} ر.س</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BADGES AND INCENTIVES TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'badges_incentives' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                مكتبة الأوسمة وشارات التكريم والتحفيز
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تُمنح هذه الأوسمة للطلاب عند تحقيق معايير الإتقان والحضور والتفوق السلوكي
              </p>
            </div>

            <button
              type="button"
              onClick={() => setBadgesModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>إدارة الأوسمة الممنوحة للطلاب</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.values(BADGE_DEFINITIONS).map((badge) => (
              <div
                key={badge.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-start gap-3.5 hover:border-amber-300 transition-all"
              >
                <div className="text-2xl p-3 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200/60 shrink-0 font-bold flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {badge.description}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                      {badge.criteriaLabel}
                    </span>
                    <span className="inline-block text-[10px] font-medium text-slate-400">
                      فئة: {badge.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Stage Config Modal */}
      <StageConfigModal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        initialSelectedId={stageModalSelectedId}
      />

      {/* Badges Management Modal */}
      <BadgesManagementModal
        isOpen={badgesModalOpen}
        onClose={() => setBadgesModalOpen(false)}
      />

      {/* Edit/Add Spelling Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-slate-900">
                {isNewLesson ? 'إضافة درس هجاء جديد' : 'تعديل بيانات درس الهجاء'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم الدرس:</label>
                  <input
                    type="number"
                    min="1"
                    value={editingLesson.lessonNumber || 1}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, lessonNumber: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">عنوان الدرس:</label>
                  <input
                    type="text"
                    required
                    value={editingLesson.title || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                    placeholder="مثال: الحروف بحركة الفتح"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">المهارة المستهدفة:</label>
                <input
                  type="text"
                  value={editingLesson.skill || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, skill: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  placeholder="مثال: ضبط حركة الفتح مع الحروف المفخمة والمرققة"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الشرح والوصف الضابط:</label>
                <textarea
                  rows={3}
                  value={editingLesson.description || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  placeholder="بيان القاعدة وطريقة نطق الحروف والأصوات..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نسبة الإتقان لاجتياز الدرس (%):</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={editingLesson.passingScore || 85}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, passingScore: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المرحلة / الصف المستهدف:</label>
                  <input
                    type="text"
                    value={editingLesson.targetGrade || 'الكل'}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, targetGrade: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الدرس</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add SubLesson Modal */}
      {selectedLessonForSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-slate-900">إضافة فقرة فرعية للدرس</h3>
              <button
                type="button"
                onClick={() => setSelectedLessonForSub(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubLessonSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان أو نص الفقرة الفرعية:</label>
                <input
                  type="text"
                  required
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  placeholder="مثال: فقرة 1: قراءة الحروف المفتوحة مفردة"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الدرجة القصوى للفقرة:</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={newSubMaxScore}
                  onChange={(e) => setNewSubMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedLessonForSub(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الفقرة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Educational Week Modal */}
      {editingWeek && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-slate-900">
                {isNewWeek ? 'إضافة أسبوع تربوي جديد' : 'تعديل بيانات الأسبوع التربوي'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingWeek(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWeek} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم الأسبوع:</label>
                  <input
                    type="number"
                    min="1"
                    value={editingWeek.weekNumber || 1}
                    onChange={(e) =>
                      setEditingWeek({ ...editingWeek, weekNumber: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">الشعار الأسبوعي:</label>
                  <input
                    type="text"
                    required
                    value={editingWeek.motto || ''}
                    onChange={(e) => setEditingWeek({ ...editingWeek, motto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                    placeholder="مثال: بر الوالدين والإحسان إليهما"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الهدف التربوي العام:</label>
                <input
                  type="text"
                  required
                  value={editingWeek.educationalGoal || ''}
                  onChange={(e) =>
                    setEditingWeek({ ...editingWeek, educationalGoal: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  placeholder="مثال: غرس خلق الطاعة والأدب في مخاطبة الوالدين"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">النشاط التطبيقي المقترح:</label>
                <textarea
                  rows={2}
                  value={editingWeek.activity || ''}
                  onChange={(e) =>
                    setEditingWeek({ ...editingWeek, activity: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  placeholder="مثال: حوار تربوي وقصة مصورة عن طاعة الوالدين..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المسؤول عن التنفيذ:</label>
                  <input
                    type="text"
                    value={editingWeek.responsiblePerson || 'معلم الحلقة'}
                    onChange={(e) =>
                      setEditingWeek({ ...editingWeek, responsiblePerson: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الميزانية التقديرية (ر.س):</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWeek.budget || 0}
                    onChange={(e) =>
                      setEditingWeek({ ...editingWeek, budget: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingWeek(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الأسبوع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEMPLATE PLAN PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewConfig && (
        <TemplatePlanPreviewModal
          config={previewConfig}
          isOpen={!!previewConfig}
          onClose={() => setPreviewConfig(null)}
        />
      )}
    </div>
  );
};
