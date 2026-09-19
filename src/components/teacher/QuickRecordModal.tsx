import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DailySessionRecord, SpellingLesson, Student } from '../../types';
import { ALL_114_SURAHS, getSurahsByDirection, getSurahAyahsCount, findSurahMetadata, getSurahSequenceIndex } from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { Sparkles, BookOpen, RotateCcw, Check, X, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateParentWeeklyReport } from '../../utils/reportGenerator';

interface QuickRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onOpenReportModal?: (content: string, phone: string, name: string, studentId: string) => void;
}

export const QuickRecordModal: React.FC<QuickRecordModalProps> = ({
  isOpen,
  onClose,
  student,
  onOpenReportModal,
}) => {
  if (!isOpen || !student) return null;

  return (
    <QuickRecordModalContent
      key={student.id}
      student={student}
      onClose={onClose}
      onOpenReportModal={onOpenReportModal}
    />
  );
};

interface QuickRecordModalContentProps {
  student: Student;
  onClose: () => void;
  onOpenReportModal?: (content: string, phone: string, name: string, studentId: string) => void;
}

// Builtin step ids + any custom halaqah track id (dynamic steps)
type SessionTrack = string;

// Smart tab label: strips "مسار/مسارات" prefix, returns first meaningful word
// "مسار المناهج المدرسية" → "المناهج" | "فضائل الأعمال" → "فضائل"
const trackShortLabel = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name.trim();
  const generic = ['مسار', 'مسارات', 'المسار'];
  const meaningful = generic.includes(words[0]) ? words.slice(1) : words;
  return meaningful[0] || words[words.length - 1];
};
const BUILTIN_STEP_IDS = ['spelling', 'memorization', 'revision'];
// Halaqah track ids that map to builtin wizard steps — every other enabled track
// (custom or builtin like virtues/tilawah) gets a generic wizard step
const NON_SESSION_TRACK_IDS = ['track_quran', 'track_spelling'];

const TRACK_META: Record<string, { label: string; icon: React.ReactNode }> = {
  spelling: { label: 'الهجاء', icon: <Sparkles className="w-3.5 h-3.5" /> },
  memorization: { label: 'الحفظ', icon: <BookOpen className="w-3.5 h-3.5" /> },
  revision: { label: 'المراجعة', icon: <RotateCcw className="w-3.5 h-3.5" /> },
};

/** Shared 0-100 mastery slider — same UX reused by memorization & revision */
const ScoreSlider: React.FC<{
  value: number;
  onChange: (v: number) => void;
  accent: string;
  textClass: string;
  min?: number;
  label: string;
}> = ({ value, onChange, accent, textClass, min = 60, label }) => (
  <div className="mt-3 flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
    <span className="text-slate-700">{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-28 ${accent}`}
      />
      <span className={`font-bold ${textClass}`}>{value}%</span>
    </div>
  </div>
);

// Spelling mastery zones (equal quarters): <25 لم ينتقل بعد | 25-49 يحتاج مراجعة | 50-74 يحتاج تثبيت | >=75 أتقن
const tagForSpellingScore = (
  val: number
): 'أتقن' | 'يحتاج تثبيت' | 'لم ينتقل بعد' | 'يحتاج مراجعة' =>
  val >= 75 ? 'أتقن' : val >= 50 ? 'يحتاج تثبيت' : val >= 25 ? 'يحتاج مراجعة' : 'لم ينتقل بعد';

const QuickRecordModalContent: React.FC<QuickRecordModalContentProps> = ({
  student,
  onClose,
  onOpenReportModal,
}) => {
  const {
    spellingLessons,
    academicConfig,
    recordDailySession,
    sessionRecords,
    halaqahs,
    teachers,
    getActiveStudentQuranPlan,
    recordQuranPlanAchievement,
    tracks,
  } = useApp();

  // Quran Planning Engine Integration — plan determines which tracks today's session needs
  const activeQuranPlan = getActiveStudentQuranPlan(student.id);
  const todayIso = new Date().toISOString().split('T')[0];
  const todayDailyItem = activeQuranPlan?.generatedPlan?.dailyPlans?.find((d) => d.date === todayIso);

  // Auto Minor Revision: engine-determined range, teacher only records the actual result
  const autoRevision = activeQuranPlan?.autoMinorRevisionMode === true;
  const autoRevLabel = todayDailyItem?.revisionDisplayLabel;
  const autoRevPages = todayDailyItem?.revisionPagesAmount;

  // Plan-derived memorization target (prefill, teacher may adjust to actual)
  const planUnit = todayDailyItem?.targetUnit;
  const planStartSurah = useMemo(() => {
    if (!planUnit?.start) return undefined;
    return (
      planUnit.start.surahName ||
      ALL_114_SURAHS.find((s) => s.number === planUnit.start.surahNumber)?.name
    );
  }, [planUnit]);
  const planEndSurah = useMemo(() => {
    if (!planUnit?.end) return undefined;
    return (
      planUnit.end.surahName ||
      ALL_114_SURAHS.find((s) => s.number === planUnit.end.surahNumber)?.name
    );
  }, [planUnit]);

  // Spelling Track State
  const initialLesson =
    spellingLessons.find((l) => l.id === student.currentSpellingLessonId) || spellingLessons[0];
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLesson?.id || '');
  const selectedLesson = spellingLessons.find((l) => l.id === selectedLessonId) || initialLesson;

  // Sub-lessons scores map: { [subLessonId]: score }
  const [subScores, setSubScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    selectedLesson?.subLessons?.forEach((sub) => {
      map[sub.id] = 85; // Default good score
    });
    return map;
  });

  const [spellingFinalScore, setSpellingFinalScore] = useState<number>(student.currentSpellingScore || 85);
  const [spellingStatusTag, setSpellingStatusTag] = useState<'أتقن' | 'يحتاج تثبيت' | 'لم ينتقل بعد' | 'يحتاج مراجعة'>('أتقن');
  const [spellingNotes, setSpellingNotes] = useState('');

  // Memorization Track State — prefilled from the Quran plan when available
  const [surahFrom, setSurahFrom] = useState<string>(planStartSurah || student.currentSurah);
  const [ayahFrom, setAyahFrom] = useState<number>(planUnit?.start?.ayahNumber || 1);
  const [surahTo, setSurahTo] = useState<string>(planEndSurah || student.currentSurah);
  const [ayahTo, setAyahTo] = useState<number>(planUnit?.end?.ayahNumber || student.currentAyah || 10);
  const [memScore, setMemScore] = useState<number>(90);
  const [memNotes, setMemNotes] = useState('');

  // Revision Track State
  const [revSurahFrom, setRevSurahFrom] = useState<string>('الناس');
  const [revAyahFrom, setRevAyahFrom] = useState<number>(1);
  const [revSurahTo, setRevSurahTo] = useState<string>(student.currentSurah);
  const [revAyahTo, setRevAyahTo] = useState<number>(student.currentAyah || 1);
  const [revType, setRevType] = useState<'قريبة' | 'بعيدة'>('قريبة');
  const [revScore, setRevScore] = useState<number>(95);
  const [revManualOverride, setRevManualOverride] = useState(false);

  // Custom (admin-defined) tracks — generic score + notes per track, saved to customTracks
  const [customTrackScores, setCustomTrackScores] = useState<Record<string, number>>({});
  const [customTrackNotes, setCustomTrackNotes] = useState<Record<string, string>>({});

  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // ── Wizard: tracks required TODAY, driven by the student's plan + halaqah enabled tracks ──
  const studentHalaqah =
    halaqahs.find((h) => h.id === student.halaqahId) ||
    halaqahs.find((h) => h.name === student.halaqahName);
  const enabledTrackIds = studentHalaqah?.activeTrackIds || [
    'track_quran',
    'track_spelling',
    'track_virtues',
  ];
  const isSpellingTrackEnabled = enabledTrackIds.includes('track_spelling');
  const isQuranTrackEnabled = enabledTrackIds.includes('track_quran');

  const steps = useMemo<SessionTrack[]>(() => {
    const list: SessionTrack[] = [];
    if (isSpellingTrackEnabled) list.push('spelling');
    if (!isQuranTrackEnabled) {
      for (const tid of enabledTrackIds) {
        if (!NON_SESSION_TRACK_IDS.includes(tid) && !list.includes(tid)) list.push(tid);
      }
      return list;
    }
    if (todayDailyItem) {
      const dt = todayDailyItem.dayType;
      if (!dt || dt === 'memorization' || dt === 'consolidation') list.push('memorization');
      if (
        dt === 'revision' ||
        dt === 'general_revision' ||
        (todayDailyItem.revisionPagesAmount ?? 0) > 0
      )
        list.push('revision');
    } else {
      list.push('memorization', 'revision');
    }
    if (list.length === 0) list.push('memorization');
    // Custom admin-defined tracks → generic wizard steps, in halaqah track order
    for (const tid of enabledTrackIds) {
      if (!NON_SESSION_TRACK_IDS.includes(tid) && !list.includes(tid)) list.push(tid);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson?.id, todayDailyItem?.id, isSpellingTrackEnabled, isQuranTrackEnabled]);

  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];
  const isFirstStep = safeIndex === 0;
  const isLastStep = safeIndex === steps.length - 1;
  const singleStep = steps.length === 1;

  // When lesson changes, re-populate sub-scores
  const handleLessonChange = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const targetLesson = spellingLessons.find((l) => l.id === lessonId);
    if (targetLesson?.subLessons) {
      const map: Record<string, number> = {};
      targetLesson.subLessons.forEach((sub) => {
        map[sub.id] = 85;
      });
      setSubScores(map);
    }
  };

  const handleSubScoreChange = (subId: string, val: number) => {
    const updated: Record<string, number> = { ...subScores, [subId]: val };
    setSubScores(updated);

    // Auto calculate average score
    const values: number[] = Object.values(updated);
    const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : val;
    setSpellingFinalScore(avg);

    // Auto status tag
    setSpellingStatusTag(tagForSpellingScore(avg));
  };

  // Colored mastery slider → maps zones to teacher decision (visual input only)
  const handleSpellingScoreChange = (val: number) => {
    setSpellingFinalScore(val);
    setSpellingStatusTag(tagForSpellingScore(val));
  };

  // Step state lives in component state — navigating back/forward never loses data
  const handleNextStep = () => {
    setCompletedSteps((prev) => new Set(prev).add(safeIndex));
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };
  const handlePrevStep = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSave = async (andSendReport = false) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const recordData: Omit<DailySessionRecord, 'id' | 'createdAt'> = {
      studentId: student.id,
      teacherId: student.teacherId,
      halaqahId: student.halaqahId,
      date: todayStr,
      weekNumber: academicConfig.currentWeek,
      attendance: 'present',
      customTracks: (() => {
        const ids = steps.filter((t) => !BUILTIN_STEP_IDS.includes(t));
        if (ids.length === 0) return undefined;
        const out: Record<string, { score: number; notes?: string }> = {};
        for (const id of ids) {
          out[id] = {
            score: customTrackScores[id] ?? 85,
            notes: customTrackNotes[id] || undefined,
          };
        }
        return out;
      })(),
      spelling: steps.includes('spelling') && selectedLesson
        ? {
            lessonId: selectedLesson.id,
            lessonNumber: selectedLesson.lessonNumber,
            subLessonScores: subScores,
            finalScore: spellingFinalScore,
            isMastered: spellingFinalScore >= academicConfig.spellingPassingThreshold,
            statusTag: spellingStatusTag,
            notes: spellingNotes,
          }
        : undefined,
      memorization: steps.includes('memorization')
        ? {
            surahFrom,
            ayahFrom,
            surahTo,
            ayahTo,
            score: memScore,
            notes: memNotes,
          }
        : undefined,
      revision: steps.includes('revision')
        ? {
            surahFrom: revSurahFrom,
            surahTo: revSurahTo,
            type: revType,
            score: revScore,
            ...(autoRevision && autoRevLabel && !revManualOverride
              ? { isAutoRange: true, autoRangeLabel: autoRevLabel }
              : {}),
          }
        : undefined,
      teacherRemarks: generalNotes,
    };

    await recordDailySession(recordData);

    // Sync with Quran Planning Engine if plan is active — record the ACTUAL
    // memorized end position so the engine rebuilds the remaining term from
    // the true last-achieved verse (overachievement advances, underachievement
    // replans, nothing is assumed).
    if (activeQuranPlan && todayDailyItem && steps.includes('memorization')) {
      try {
        const endMeta = findSurahMetadata(surahTo);
        const dir = activeQuranPlan.direction || 'backward';
        let planStatus: 'completed' | 'partial' | 'overachieved' = 'completed';
        let actualEndPosition: { surahNumber: number; ayahNumber: number } | undefined;
        if (endMeta) {
          actualEndPosition = {
            surahNumber: endMeta.number,
            ayahNumber: Math.min(Math.max(1, ayahTo), getSurahAyahsCount(endMeta.number)),
          };
          const plannedEnd = todayDailyItem.targetUnit?.end;
          if (plannedEnd?.surahNumber) {
            const plannedOrd =
              getSurahSequenceIndex(plannedEnd.surahNumber, dir) * 1000 + plannedEnd.ayahNumber;
            const actualOrd =
              getSurahSequenceIndex(endMeta.number, dir) * 1000 + actualEndPosition.ayahNumber;
            planStatus =
              actualOrd > plannedOrd ? 'overachieved' : actualOrd < plannedOrd ? 'partial' : 'completed';
          }
        }
        await recordQuranPlanAchievement({
          planId: activeQuranPlan.id,
          dayDate: todayIso,
          status: planStatus,
          actualEndPosition,
          evaluation: memScore >= 95 ? 'excellent' : memScore >= 85 ? 'very_good' : 'good',
          notes: memNotes || 'تم التسميع عبر نافذة التسجيل السريع للمعلم',
        });
      } catch (err) {
        console.error('Quran plan recording sync warning:', err);
      }
    }

    setIsSaved(true);

    if (andSendReport && onOpenReportModal) {
      const updatedRecords = [
        ...sessionRecords,
        { ...recordData, id: 'temp', createdAt: new Date().toISOString() },
      ];
      const text = generateParentWeeklyReport(
        student,
        updatedRecords,
        spellingLessons,
        halaqahs,
        teachers,
        academicConfig
      );
      setTimeout(() => {
        onClose();
        onOpenReportModal(text, student.parentPhone, student.fullName, student.id);
      }, 300);
    } else {
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-700 text-white font-black text-sm sm:text-base flex items-center justify-center shrink-0">
              {(student.fullName || student.name || 'ط').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 line-clamp-2">{student.fullName}</h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  {student.grade}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-700">
                المستهدف: سورة {student.minimumTargetSurah}<span className="hidden sm:inline"> • الموضع الحالي: سورة {student.currentSurah}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator — one track at a time, no "التقييم الشامل" */}
        {!singleStep && (
          <div className="flex items-center gap-1.5 mt-4">
            {steps.map((st, i) => {
              const done = completedSteps.has(i);
              const active = i === safeIndex;
              const meta = TRACK_META[st] || {
                label: trackShortLabel(
                  tracks.find((tr) => tr.id === st)?.name || st
                ),
                icon: <BookOpen className="w-3.5 h-3.5" />,
              };
              return (
                <div
                  key={st}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    active
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : done
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done && !active ? <Check className="w-3.5 h-3.5" /> : meta.icon}
                  <span className="truncate">{meta.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Content Body — single active track */}
        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pl-1">
          {steps.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-600 font-bold">
              لا توجد مسارات تعليمية مفعّلة لهذه الحلقة حاليًا — راجع إعدادات الحلقة.
            </div>
          )}
          {/* STEP: SPELLING */}
          {currentStep === 'spelling' && !selectedLesson && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center text-xs text-slate-600 font-bold">
              مسار الهجاء مفعّل لهذه الحلقة لكن لا توجد دروس هجاء مهيأة لهذا الطالب حاليًا.
            </div>
          )}
          {currentStep === 'spelling' && selectedLesson && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-emerald-950">✏️ الهجاء القرآني</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 font-medium">الدرجة:</span>
                  <span className="text-base font-black text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    {spellingFinalScore}%
                  </span>
                </div>
              </div>

              {/* Lesson Dropdown */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الدرس الهجائي المستهدف</label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => handleLessonChange(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {spellingLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      الدرس {l.lessonNumber}: {l.title} ({l.targetGrade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-Lessons List */}
              <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">المهام الجزئية للدرس:</span>
                {(selectedLesson?.subLessons || []).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-800 flex-1 truncate">{sub.title}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={subScores[sub.id] || 85}
                        onChange={(e) => handleSubScoreChange(sub.id, parseInt(e.target.value))}
                        className="w-24 accent-emerald-600"
                      />
                      <span className="w-10 text-left font-mono font-bold text-emerald-800">
                        {subScores[sub.id] || 85}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Colored mastery slider — the sole decision input (4 zones) */}
              <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold text-slate-700">
                  <span>مؤشر إتقان الهجاء</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-800">{spellingFinalScore}%</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        spellingStatusTag === 'أتقن'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : spellingStatusTag === 'يحتاج تثبيت'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : spellingStatusTag === 'يحتاج مراجعة'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {spellingStatusTag}
                    </span>
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full overflow-hidden flex" dir="ltr">
                    <div className="h-full bg-emerald-300" style={{ width: '25%' }} />
                    <div className="h-full bg-amber-300" style={{ width: '25%' }} />
                    <div className="h-full bg-rose-300" style={{ width: '25%' }} />
                    <div className="h-full bg-slate-300" style={{ width: '25%' }} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={spellingFinalScore}
                    onChange={(e) => handleSpellingScoreChange(parseInt(e.target.value))}
                    className="relative w-full h-2 appearance-none bg-transparent accent-slate-800"
                  />
                </div>
                <div className="flex text-[10px] font-bold mt-1">
                  <span className="text-slate-500 text-center flex-1">لم ينتقل بعد</span>
                  <span className="text-rose-700 text-center flex-1">يحتاج مراجعة</span>
                  <span className="text-amber-700 text-center flex-1">يحتاج تثبيت</span>
                  <span className="text-emerald-700 text-center flex-1">أتقن</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP: MEMORIZATION */}
          {currentStep === 'memorization' && (
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  <h4 className="text-xs font-bold text-blue-950">📖 الحفظ الجديد</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 font-medium">درجة الحفظ:</span>
                  <span className="text-base font-black text-blue-800 bg-white px-2.5 py-0.5 rounded-lg border border-blue-300">
                    {memScore}%
                  </span>
                </div>
              </div>

              {/* Quran Plan Daily Unit Banner */}
              {todayDailyItem && (
                <div className="mb-3 bg-white p-2.5 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-blue-600 font-bold block">مقرر ورد اليوم بالخطة القرآنية:</span>
                    <span className="font-bold text-slate-900 font-['Amiri',serif]">
                      {todayDailyItem.targetUnit?.displayLabel}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                    مربوط تلقائياً
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Surah & Ayah */}
                <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-900 block mb-1.5">من (البداية)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">السورة</label>
                      <select
                        value={surahFrom}
                        onChange={(e) => {
                          const newSurah = e.target.value;
                          setSurahFrom(newSurah);
                          const maxA = getSurahAyahsCount(newSurah);
                          if (ayahFrom > maxA) setAyahFrom(maxA);
                        }}
                        className="w-full text-xs px-2 py-1.5 bg-white rounded-lg border border-slate-300"
                      >
                        {getSurahsByDirection(activeQuranPlan?.direction || 'backward').map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.number}. {s.name} ({s.ayahsCount} آية)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <QuranAyahSelect
                        id="quick_mem_ayah_from"
                        surah={surahFrom}
                        value={ayahFrom}
                        onChange={setAyahFrom}
                        label="الآية"
                      />
                    </div>
                  </div>
                </div>

                {/* To Surah & Ayah */}
                <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-900 block mb-1.5">إلى (النهاية)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">السورة</label>
                      <select
                        value={surahTo}
                        onChange={(e) => {
                          const newSurah = e.target.value;
                          setSurahTo(newSurah);
                          const maxA = getSurahAyahsCount(newSurah);
                          if (ayahTo > maxA) setAyahTo(maxA);
                        }}
                        className="w-full text-xs px-2 py-1.5 bg-white rounded-lg border border-slate-300"
                      >
                        {getSurahsByDirection(activeQuranPlan?.direction || 'backward').map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.number}. {s.name} ({s.ayahsCount} آية)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <QuranAyahSelect
                        id="quick_mem_ayah_to"
                        surah={surahTo}
                        value={ayahTo}
                        onChange={setAyahTo}
                        label="الآية"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <ScoreSlider
                label="تقييم إتقان التسميع والتجويد:"
                value={memScore}
                onChange={setMemScore}
                accent="accent-blue-600"
                textClass="text-blue-800"
              />
            </div>
          )}

          {/* STEP: REVISION */}
          {currentStep === 'revision' && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-bold text-amber-950">🔄 المراجعة والتثبيت</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 font-medium">الدرجة:</span>
                  <span className="text-base font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {revScore}%
                  </span>
                </div>
              </div>

              {/* Plan-driven daily revision banner */}
              {todayDailyItem?.revisionDisplayLabel && (
                <div className="mb-3 bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-amber-700 font-bold block">مقرر مراجعة اليوم بالخطة:</span>
                    <span className="font-bold text-slate-900">{todayDailyItem.revisionDisplayLabel}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                    مربوط تلقائياً
                  </span>
                </div>
              )}

              {/* Auto Minor Revision — engine-determined range */}
              {autoRevision && autoRevLabel && !revManualOverride ? (
                <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      المراجعة التلقائية
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevManualOverride(true)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      تعديل النطاق يدويًا
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="font-bold text-slate-900">{autoRevLabel}</span>
                    {autoRevPages !== undefined && (
                      <span className="text-slate-600">
                        المقدار اليومي: <strong className="text-amber-900">{autoRevPages} صفحة</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-600">نوع المراجعة:</span>
                    {(['قريبة', 'بعيدة'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRevType(t)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                          revType === t
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rev From */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 block mb-1.5">من سورة وآية</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        value={revSurahFrom}
                        onChange={(e) => {
                          const newSurah = e.target.value;
                          setRevSurahFrom(newSurah);
                          const maxA = getSurahAyahsCount(newSurah);
                          if (revAyahFrom > maxA) setRevAyahFrom(maxA);
                        }}
                        className="w-full text-xs px-2 py-1.5 bg-white rounded-lg border border-slate-300"
                      >
                        {getSurahsByDirection(activeQuranPlan?.direction || 'backward').map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <QuranAyahSelect
                        id="quick_rev_ayah_from"
                        surah={revSurahFrom}
                        value={revAyahFrom}
                        onChange={setRevAyahFrom}
                        compact
                      />
                    </div>
                  </div>
                </div>

                {/* Rev To */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-900 block mb-1.5">إلى سورة وآية</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        value={revSurahTo}
                        onChange={(e) => {
                          const newSurah = e.target.value;
                          setRevSurahTo(newSurah);
                          const maxA = getSurahAyahsCount(newSurah);
                          if (revAyahTo > maxA) setRevAyahTo(maxA);
                        }}
                        className="w-full text-xs px-2 py-1.5 bg-white rounded-lg border border-slate-300"
                      >
                        {getSurahsByDirection(activeQuranPlan?.direction || 'backward').map((s) => (
                          <option key={s.number} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <QuranAyahSelect
                        id="quick_rev_ayah_to"
                        surah={revSurahTo}
                        value={revAyahTo}
                        onChange={setRevAyahTo}
                        compact
                      />
                    </div>
                  </div>
                </div>

                {/* Rev Type */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex flex-col justify-center">
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5">نوع المراجعة</label>
                  <div className="flex gap-1">
                    {(['قريبة', 'بعيدة'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRevType(t)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                          revType === t
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {/* Revision mastery — same slider UX as memorization */}
              <ScoreSlider
                label="تقييم المراجعة والتثبيت:"
                value={revScore}
                onChange={setRevScore}
                accent="accent-amber-600"
                textClass="text-amber-800"
                min={0}
              />
            </div>
          )}

          {/* Teacher Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">ملاحظة المعلم / التوصية</label>
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="مثال: متميز في المدود، يحتاج تثبيت نطق القلقلة والمتابعة المنزلية"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Wizard Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              إلغاء
            </button>
            {!isFirstStep && (
              <button
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>رجوع</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {steps.length > 0 && isLastStep && onOpenReportModal && (
              <button
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                title="حفظ الجلسة ثم فتح تقرير واتساب لولي الأمر"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">حفظ وإرسال تقرير</span>
                <span className="sm:hidden">تقرير</span>
              </button>
            )}

            {steps.length > 0 && (singleStep || isLastStep) ? (
              <button
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                {isSaved ? <Check className="w-4 h-4 text-emerald-200" /> : null}
                <span>حفظ</span>
              </button>
            ) : steps.length > 0 ? (
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
