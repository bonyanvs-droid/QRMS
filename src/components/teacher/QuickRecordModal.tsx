import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DailySessionRecord, SpellingLesson, Student } from '../../types';
import { ALL_114_SURAHS, getSurahsByDirection, getSurahAyahsCount, findSurahMetadata, getSurahSequenceIndex } from '../../utils/quranMetadata';
import { QURAN_SURAHS } from '../../quran/data/quranMeta';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { Sparkles, BookOpen, BookType, RotateCcw, Repeat, Check, X, Send, ChevronLeft, ChevronRight, Star, AlertTriangle, Loader2, PencilLine } from 'lucide-react';
import { generateParentWeeklyReport } from '../../utils/reportGenerator';
import { getHalaqahActiveTrackIds } from '../../utils/trackAdapter';

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

// Meta keys written by the Quran-plan sync into customTracks (e.g. _quranPlanId,
// camelized as QuranPlanId) — internal bookkeeping, never a teacher-facing track.
const isMetaTrackKey = (k: string) => k.startsWith('_') || k.toLowerCase() === 'quranplanid';

// Older session records may store the English transliteration (e.g. 'Al-Faatiha')
// written by the plan-sync path — normalize to the Arabic name so selects,
// prefills and findSurahMetadata-based saving all resolve it.
const resolveSurahArabicName = (v?: string): string | undefined => {
  if (!v) return v;
  if (findSurahMetadata(v)) return findSurahMetadata(v)!.name;
  return QURAN_SURAHS.find((s) => s.name === v)?.arabicName || v;
};
// Halaqah track ids that map to builtin wizard steps — every other enabled track
// (custom or builtin like virtues/tilawah) gets a generic wizard step
const NON_SESSION_TRACK_IDS = ['track_quran', 'track_spelling'];

const TRACK_META: Record<string, { label: string; icon: React.ReactNode }> = {
  spelling: { label: 'الهجاء', icon: <Sparkles className="w-3.5 h-3.5" /> },
  memorization: { label: 'الحفظ', icon: <BookOpen className="w-3.5 h-3.5" /> },
  revision: { label: 'المراجعة', icon: <RotateCcw className="w-3.5 h-3.5" /> },
};

/** Star configuration for 1-5 rating system: 1=20%, 2=40%, 3=60%, 4=80%, 5=100% */
const STAR_LEVELS = [
  { stars: 5, score: 100, label: 'أتقن / ممتاز مرتفع', desc: 'تلاوة متقنة دون أي تردد أو أخطاء', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { stars: 4, score: 80, label: 'متقن / جيد جداً', desc: 'تنبيه يسير أو تردد خفيف تم تصويبه', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { stars: 3, score: 60, label: 'جيد / يحتاج تمكين', desc: 'تردد في موضعين أو ثلاثة مع التصويب', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { stars: 2, score: 40, label: 'يحتاج تدريب وتكرار', desc: 'تعثر متكرر ويحتاج إعادة تكرار الورد وتثبيته', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { stars: 1, score: 20, label: 'غير متقن / إعادة التسميع', desc: 'لم يستحضر الآيات والمطلوب حفظه', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
];

/** 5-Star interactive rating component with unachieved toggle and debt guard */
const FiveStarRating: React.FC<{
  value: number; // 0-100 percentage (20, 40, 60, 80, 100)
  onChange: (v: number) => void;
  label: string;
  theme?: 'blue' | 'amber';
  isUnachieved?: boolean;
  onToggleUnachieved?: () => void;
  hasPendingDebt?: boolean;
}> = ({
  value,
  onChange,
  label,
  theme = 'blue',
  isUnachieved = false,
  onToggleUnachieved,
  hasPendingDebt = false,
}) => {
  // Map percentage to stars (1-5): exactly 20% per star
  const currentStars = useMemo(() => {
    if (value >= 90) return 5;
    if (value >= 70) return 4;
    if (value >= 50) return 3;
    if (value >= 30) return 2;
    return 1;
  }, [value]);

  const activeLevel = STAR_LEVELS.find((l) => l.stars === currentStars) || STAR_LEVELS[1];

  return (
    <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-800">{label}</span>

        <div className="flex items-center gap-2">
          {hasPendingDebt ? (
            <span
              className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs"
              title="الطالب لديه واجب غير منجز من الجلسة السابقة — يلزم إثباته اليوم ولا يمكن تأجيله ليومين"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>واجب متراكم — يلزم الإنجاز اليوم</span>
            </span>
          ) : onToggleUnachieved ? (
            <button
              type="button"
              onClick={onToggleUnachieved}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                isUnachieved
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
              }`}
              title={isUnachieved ? 'إلغاء وسم عدم الإنجاز وتفعيل التقييم' : 'وسم هذا المسار كغير منجز لهذا اليوم'}
            >
              {isUnachieved ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>تم الوسم: لم يُنجز</span>
                </>
              ) : (
                <span>لم يُنجز اليوم ✕</span>
              )}
            </button>
          ) : null}

          {!isUnachieved && (
            <span className="text-xs font-black text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {value}%
            </span>
          )}
        </div>
      </div>

      {isUnachieved ? (
        <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-lg text-center my-1.5 animate-fadeIn">
          <p className="text-xs font-bold text-rose-800">
            تم استثناء هذا المسار لجلسة اليوم (لن تُسجل له درجات، وسيبقى واجباً متراكماً للجلسة القادمة).
          </p>
          {onToggleUnachieved && (
            <button
              type="button"
              onClick={onToggleUnachieved}
              className="mt-1.5 text-[11px] text-rose-700 underline font-semibold cursor-pointer hover:text-rose-900"
            >
              تراجع وتفعيل التقييم بالنجوم
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1 py-1">
            {[1, 2, 3, 4, 5].map((s) => {
              const isSelected = s <= currentStars;
              const levelInfo = STAR_LEVELS.find((l) => l.stars === s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(levelInfo?.score || 90)}
                  className="flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer group"
                  title={`${levelInfo?.stars} نجوم: ${levelInfo?.label}`}
                >
                  <Star
                    className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                      isSelected
                        ? theme === 'blue'
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-amber-400 text-amber-500'
                        : 'text-slate-300 fill-slate-100'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 font-mono font-bold group-hover:text-slate-700">
                    {s}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic pedagogical description badge */}
          <div className={`mt-2 px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between ${activeLevel.bg}`}>
            <span className={`font-bold ${activeLevel.color}`}>{activeLevel.label}</span>
            <span className="text-[11px] text-slate-500">{activeLevel.desc}</span>
          </div>
        </>
      )}
    </div>
  );
};

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
  const toLocalIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = toLocalIso(new Date());

  // Update-mode: if today's session already carries a genuine achievement, reopening
  // must show THAT recorded entry (editable) — never the next milestone's prefilled
  // range. An attendance-only record is NOT an achievement and must not lock the day.
  const todayRecord = useMemo(() => {
    const hasTrackData = (r: DailySessionRecord) =>
      Boolean(
        r.memorization ||
          r.revision ||
          // spelling stub written for absent marks (lessonId:'', tag 'غياب') is not an achievement
          (r.spelling && r.spelling.lessonId) ||
          (r.customTracks && Object.keys(r.customTracks).some((k) => !isMetaTrackKey(k)))
      );
    return (sessionRecords || [])
      .filter((r) => r.studentId === student.id && r.date === todayIso && hasTrackData(r))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  }, [sessionRecords, student.id, todayIso]);

  // Intelligent Floating Milestone: when today's achievement exists, reopen today's
  // milestone for update. Otherwise resume from the OLDEST unfulfilled milestone —
  // yesterday's debt surfaces before today's target.
  const todayDailyItem = useMemo(() => {
    const dailyPlans = activeQuranPlan?.generatedPlan?.dailyPlans;
    if (!dailyPlans || dailyPlans.length === 0) return undefined;

    const exactToday = dailyPlans.find((d) => d.date === todayIso);

    // 1. Achievement already recorded today → today's milestone in update-mode
    //    (saving UPDATES it and rebuilds the future plan — never consumes tomorrow).
    if (todayRecord && exactToday) {
      return exactToday;
    }

    // 2. Floating Milestone Queue: first pending milestone in chronological sequence
    const firstPending = dailyPlans.find((d) => !d.isHistorical && d.status === 'pending');
    if (firstPending) {
      return firstPending;
    }

    // 3. Fallback to today or the last item
    return exactToday || dailyPlans[dailyPlans.length - 1];
  }, [activeQuranPlan, todayIso, todayRecord]);

  // Auto Minor Revision: engine-determined range, teacher only records the actual result
  const isRevisionPlan = activeQuranPlan?.planType === 'revision';
  const isMemOnlyPlan = activeQuranPlan?.planType === 'memorization' || activeQuranPlan?.revisionMode === 'none';
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

  // Spelling Track State — in update-mode prefill from today's recorded entry
  const initialLesson =
    spellingLessons.find((l) => l.id === (todayRecord?.spelling?.lessonId || student.currentSpellingLessonId)) ||
    spellingLessons[0];
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLesson?.id || '');
  const selectedLesson = spellingLessons.find((l) => l.id === selectedLessonId) || initialLesson;

  // Sub-lessons scores map: { [subLessonId]: score }
  const [subScores, setSubScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    selectedLesson?.subLessons?.forEach((sub) => {
      map[sub.id] = 85; // Default good score
    });
    if (todayRecord?.spelling?.subLessonScores) {
      Object.assign(map, todayRecord.spelling.subLessonScores);
    }
    return map;
  });

  const [spellingFinalScore, setSpellingFinalScore] = useState<number>(
    todayRecord?.spelling?.finalScore || student.currentSpellingScore || 85
  );
  const [spellingStatusTag, setSpellingStatusTag] = useState<'أتقن' | 'يحتاج تثبيت' | 'لم ينتقل بعد' | 'يحتاج مراجعة'>(
    (['أتقن', 'يحتاج تثبيت', 'لم ينتقل بعد', 'يحتاج مراجعة'] as const).includes(
      todayRecord?.spelling?.statusTag as never
    )
      ? (todayRecord!.spelling!.statusTag as 'أتقن' | 'يحتاج تثبيت' | 'لم ينتقل بعد' | 'يحتاج مراجعة')
      : 'أتقن'
  );
  const [spellingNotes, setSpellingNotes] = useState(todayRecord?.spelling?.notes || '');

  // Memorization Track State — prefilled from today's record (update-mode) else the Quran plan
  const [surahFrom, setSurahFrom] = useState<string>(resolveSurahArabicName(todayRecord?.memorization?.surahFrom) || planStartSurah || student.currentSurah);
  const [ayahFrom, setAyahFrom] = useState<number>(todayRecord?.memorization?.ayahFrom || planUnit?.start?.ayahNumber || 1);
  const [surahTo, setSurahTo] = useState<string>(resolveSurahArabicName(todayRecord?.memorization?.surahTo) || planEndSurah || student.currentSurah);
  const [ayahTo, setAyahTo] = useState<number>(todayRecord?.memorization?.ayahTo || planUnit?.end?.ayahNumber || student.currentAyah || 10);
  const [memScore, setMemScore] = useState<number>(todayRecord?.memorization?.score || 100);
  const [memNotes, setMemNotes] = useState(todayRecord?.memorization?.notes || '');

  // Revision Track State — prefilled from today's record (update-mode) else the plan target
  const [revSurahFrom, setRevSurahFrom] = useState<string>(() => {
    const recName = resolveSurahArabicName(todayRecord?.revision?.surahFrom);
    if (recName) return recName;
    if (isRevisionPlan && planStartSurah) return planStartSurah;
    return 'الناس';
  });
  const [revAyahFrom, setRevAyahFrom] = useState<number>(() => {
    if (isRevisionPlan && planUnit?.start?.ayahNumber) return planUnit.start.ayahNumber;
    return 1;
  });
  const [revSurahTo, setRevSurahTo] = useState<string>(() => {
    const recName = resolveSurahArabicName(todayRecord?.revision?.surahTo);
    if (recName) return recName;
    if (isRevisionPlan && planEndSurah) return planEndSurah;
    return student.currentSurah || 'الفاتحة';
  });
  const [revAyahTo, setRevAyahTo] = useState<number>(() => {
    if (isRevisionPlan && planUnit?.end?.ayahNumber) return planUnit.end.ayahNumber;
    return student.currentAyah || 1;
  });
  const [revType, setRevType] = useState<'قريبة' | 'بعيدة'>(todayRecord?.revision?.type || 'قريبة');
  const [revScore, setRevScore] = useState<number>(todayRecord?.revision?.score || 100);

  // Custom (admin-defined) tracks — generic score + notes per track, saved to customTracks
  const [customTrackScores, setCustomTrackScores] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const [tid, t] of Object.entries(todayRecord?.customTracks || {})) {
      if (!isMetaTrackKey(tid)) out[tid] = t?.score ?? 85;
    }
    return out;
  });
  const [customTrackNotes, setCustomTrackNotes] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [tid, t] of Object.entries(todayRecord?.customTracks || {})) {
      if (!isMetaTrackKey(tid) && t?.notes) out[tid] = t.notes;
    }
    return out;
  });

  const [generalNotes, setGeneralNotes] = useState(todayRecord?.teacherRemarks || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Update-mode opens on a LOCKED read-only summary of today's recorded
  // achievement; pressing «تحديث إنجاز اليوم» reveals the editable wizard.
  const [isEditingToday, setIsEditingToday] = useState(false);
  const isLockedUpdateView = Boolean(todayRecord) && !isEditingToday;

  // ── Track debt detection from student's sessions BEFORE today ──
  // (today's own record is handled by update-mode prefill; an "unachieved" flag
  // recorded today stays reversible here, while older debts stay locked in.)
  const studentPreviousSessions = useMemo(() => {
    return (sessionRecords || [])
      .filter((r) => r.studentId === student.id && r.date < todayIso)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [sessionRecords, student.id, todayIso]);

  const lastMemRecord = useMemo(() => {
    return studentPreviousSessions.find((r) => r.memorization !== undefined);
  }, [studentPreviousSessions]);

  const lastRevRecord = useMemo(() => {
    return studentPreviousSessions.find((r) => r.revision !== undefined);
  }, [studentPreviousSessions]);

  const lastSpellingRecord = useMemo(() => {
    return studentPreviousSessions.find((r) => r.spelling !== undefined);
  }, [studentPreviousSessions]);

  // Has pending debt if the last recorded session had the track explicitly unachieved
  const memHasPendingDebt = useMemo(() => {
    return Boolean(lastMemRecord?.memorization?.unachieved);
  }, [lastMemRecord]);

  const revHasPendingDebt = useMemo(() => {
    return Boolean(lastRevRecord?.revision?.unachieved);
  }, [lastRevRecord]);

  const spellingHasPendingDebt = useMemo(() => {
    return Boolean(lastSpellingRecord?.spelling?.unachieved);
  }, [lastSpellingRecord]);

  // Teacher selections for unachieved tracks today — restored from today's record in update-mode
  const [unachievedTracks, setUnachievedTracks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (todayRecord?.spelling?.unachieved) init.spelling = true;
    if (todayRecord?.memorization?.unachieved) init.memorization = true;
    if (todayRecord?.revision?.unachieved) init.revision = true;
    for (const [tid, t] of Object.entries(todayRecord?.customTracks || {})) {
      if ((t as { unachieved?: boolean })?.unachieved) init[tid] = true;
    }
    return init;
  });

  const toggleTrackUnachieved = (trackKey: string) => {
    setUnachievedTracks((prev) => ({
      ...prev,
      [trackKey]: !prev[trackKey],
    }));
  };

  // ── Wizard: tracks required TODAY, driven by the student's plan + halaqah enabled tracks ──
  const studentHalaqah =
    halaqahs.find((h) => h.id === student.halaqahId) ||
    halaqahs.find((h) => h.name === student.halaqahName);
  const enabledTrackIds = getHalaqahActiveTrackIds(studentHalaqah);
  const isSpellingTrackEnabled = enabledTrackIds.includes('track_spelling');
  const isQuranTrackEnabled = enabledTrackIds.includes('track_quran');

  const planSteps = useMemo<SessionTrack[]>(() => {
    const list: SessionTrack[] = [];
    if (isSpellingTrackEnabled || spellingHasPendingDebt) list.push('spelling');
    if (!isQuranTrackEnabled) {
      for (const tid of enabledTrackIds) {
        if (!NON_SESSION_TRACK_IDS.includes(tid) && !list.includes(tid)) list.push(tid);
      }
      return list;
    }

    if (todayDailyItem) {
      const dt = todayDailyItem.dayType;
      // 1. Memorization track step:
      if (!isRevisionPlan) {
        if (!dt || dt === 'memorization' || dt === 'consolidation' || memHasPendingDebt) {
          list.push('memorization');
        }
      } else if (memHasPendingDebt) {
        list.push('memorization');
      }

      // 2. Revision track step:
      if (!isMemOnlyPlan) {
        if (
          isRevisionPlan ||
          dt === 'revision' ||
          dt === 'general_revision' ||
          (todayDailyItem.revisionPagesAmount ?? 0) > 0 ||
          revHasPendingDebt
        ) {
          list.push('revision');
        }
      } else if (revHasPendingDebt) {
        list.push('revision');
      }
    } else {
      if (isRevisionPlan) {
        list.push('revision');
      } else if (isMemOnlyPlan) {
        list.push('memorization');
      } else {
        list.push('memorization', 'revision');
      }
    }

    if (list.length === 0) {
      if (isRevisionPlan) {
        list.push('revision');
      } else {
        list.push('memorization');
      }
    }

    // Custom admin-defined tracks → generic wizard steps, in halaqah track order
    for (const tid of enabledTrackIds) {
      if (!NON_SESSION_TRACK_IDS.includes(tid) && !list.includes(tid)) list.push(tid);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLesson?.id, todayDailyItem?.id, isSpellingTrackEnabled, isQuranTrackEnabled, memHasPendingDebt, revHasPendingDebt, spellingHasPendingDebt, isRevisionPlan, isMemOnlyPlan, enabledTrackIds]);

  // Update-mode: today's record may hold tracks the floating milestone no longer
  // proposes (e.g. next day is revision-only). Surface every recorded track so
  // re-saving updates it instead of silently dropping it.
  const steps = useMemo<SessionTrack[]>(() => {
    const list = [...planSteps];
    if (todayRecord) {
      if (todayRecord.spelling && !list.includes('spelling')) list.push('spelling');
      if (todayRecord.memorization && !list.includes('memorization')) list.push('memorization');
      if (todayRecord.revision && !list.includes('revision')) list.push('revision');
      for (const tid of Object.keys(todayRecord.customTracks || {})) {
        if (!isMetaTrackKey(tid) && !list.includes(tid)) list.push(tid);
      }
      const order = ['spelling', 'memorization', 'revision'];
      list.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    }
    return list;
  }, [planSteps, todayRecord]);

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
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    const todayStr = toLocalIso(new Date());

    const isSpellingUnachieved = Boolean(unachievedTracks['spelling']);
    const isMemUnachieved = Boolean(unachievedTracks['memorization']);
    const isRevUnachieved = Boolean(unachievedTracks['revision']);

    const recordData: Omit<DailySessionRecord, 'id' | 'createdAt'> = {
      tenantId: student.tenantId,
      studentId: student.id,
      teacherId: student.teacherId,
      halaqahId: student.halaqahId,
      date: todayStr,
      weekNumber: academicConfig.currentWeek,
      attendance: 'present',
      customTracks: (() => {
        const ids = steps.filter((t) => !BUILTIN_STEP_IDS.includes(t) && !isMetaTrackKey(t));
        if (ids.length === 0) return undefined;
        const out: Record<string, { score: number; notes?: string; unachieved?: boolean }> = {};
        for (const id of ids) {
          const isUnach = Boolean(unachievedTracks[id]);
          out[id] = {
            score: isUnach ? 0 : customTrackScores[id] ?? 85,
            notes: isUnach ? 'لم يُنجز اليوم (مؤجل)' : customTrackNotes[id] || undefined,
            unachieved: isUnach,
          };
        }
        return out;
      })(),
      spelling: steps.includes('spelling') && selectedLesson
        ? {
            lessonId: selectedLesson.id,
            lessonNumber: selectedLesson.lessonNumber,
            subLessonScores: isSpellingUnachieved ? {} : subScores,
            finalScore: isSpellingUnachieved ? 0 : spellingFinalScore,
            isMastered: isSpellingUnachieved ? false : spellingFinalScore >= academicConfig.spellingPassingThreshold,
            statusTag: isSpellingUnachieved ? 'لم ينتقل بعد' : spellingStatusTag,
            notes: isSpellingUnachieved ? 'لم يُنجز اليوم (مؤجل)' : spellingNotes,
            unachieved: isSpellingUnachieved,
          }
        : undefined,
      memorization: steps.includes('memorization')
        ? {
            surahFrom,
            ayahFrom,
            surahTo,
            ayahTo,
            score: isMemUnachieved ? 0 : memScore,
            notes: isMemUnachieved ? 'لم يُنجز اليوم (مؤجل)' : memNotes,
            unachieved: isMemUnachieved,
          }
        : undefined,
      revision: steps.includes('revision')
        ? {
            surahFrom: revSurahFrom,
            surahTo: revSurahTo,
            type: revType,
            score: isRevUnachieved ? 0 : revScore,
            notes: isRevUnachieved ? 'لم يُنجز اليوم (مؤجل)' : undefined,
            unachieved: isRevUnachieved,
          }
        : undefined,
      teacherRemarks: generalNotes,
    };

    try {
    await recordDailySession(recordData);

    // Sync with Quran Planning Engine if plan is active and memorization was achieved — record the ACTUAL
    // memorized end position so the engine rebuilds the remaining term from
    // the true last-achieved verse. When unachieved, do not advance so the milestone waits for next session.
    if (activeQuranPlan && todayDailyItem && steps.includes('memorization') && !isMemUnachieved) {
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
        const milestoneDate = todayDailyItem.date || todayIso;
        await recordQuranPlanAchievement({
          planId: activeQuranPlan.id,
          dayDate: milestoneDate,
          status: planStatus,
          actualEndPosition,
          evaluation:
            memScore >= 90
              ? 'excellent'
              : memScore >= 70
              ? 'very_good'
              : memScore >= 50
              ? 'good'
              : 'needs_practice',
          notes: memNotes || 'تم التسميع عبر نافذة التسجيل السريع للمعلم',
        });
      } catch (err) {
        console.error('Quran plan recording sync warning:', err);
      }
    }

    // Sync with Quran Planning Engine when student is on a Revision-Only plan
    if (activeQuranPlan && todayDailyItem && isRevisionPlan && steps.includes('revision') && !isRevUnachieved) {
      try {
        const endMeta = findSurahMetadata(revSurahTo);
        let actualEndPosition: { surahNumber: number; ayahNumber: number } | undefined;
        if (endMeta) {
          actualEndPosition = {
            surahNumber: endMeta.number,
            ayahNumber: Math.min(Math.max(1, revAyahTo), getSurahAyahsCount(endMeta.number)),
          };
        }
        const milestoneDate = todayDailyItem.date || todayIso;
        await recordQuranPlanAchievement({
          planId: activeQuranPlan.id,
          dayDate: milestoneDate,
          status: 'completed',
          actualEndPosition,
          evaluation:
            revScore >= 90
              ? 'excellent'
              : revScore >= 70
              ? 'very_good'
              : revScore >= 50
              ? 'good'
              : 'needs_practice',
          notes: 'تمت المراجعة عبر نافذة التسجيل السريع للمعلم',
        });
      } catch (err) {
        console.error('Quran revision plan recording sync warning:', err);
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
    } catch (err) {
      console.error('Session save failed:', err);
      setSaveError('تعذّر حفظ الإنجاز — تحقق من الاتصال ثم أعد المحاولة');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto">
      <div
        className={`bg-white rounded-2xl max-w-2xl w-full p-5 md:p-6 shadow-2xl border animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] overflow-y-auto ${
          todayRecord ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
        }`}
      >
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
                {todayRecord && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-300 whitespace-nowrap"
                    title="يوجد إنجاز مسجّل لهذا اليوم — التعديل هنا يحدّث سجل اليوم ويعيد بناء الخطة المستقبلية"
                  >
                    تحديث إنجاز اليوم
                  </span>
                )}
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

        {/* Update-mode banner — today's recorded achievement is being edited */}
        {todayRecord && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400/90 text-white flex items-center justify-center shrink-0">
              <PencilLine className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-900">إنجاز اليوم مسجّل</p>
              <p className="text-[10px] text-amber-800 leading-snug">
                {isLockedUpdateView
                  ? 'المسجَّل معروض للاطلاع — اضغط «تحديث إنجاز اليوم» أسفل الملخص للتعديل'
                  : 'الحقول معبأة بإنجاز اليوم الحالي — أي تعديل يُحدّث سجل اليوم ويعيد بناء الخطة المستقبلية'}
              </p>
            </div>
          </div>
        )}

        {/* Locked read-only summary of today's recorded achievement */}
        {isLockedUpdateView && todayRecord && (
          <div className="mt-4 space-y-3">
            {todayRecord.memorization && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    الحفظ الجديد
                  </span>
                  {todayRecord.memorization.unachieved ? (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">لم يُنجَز</span>
                  ) : (
                    <span className="text-sm font-black text-emerald-800">{todayRecord.memorization.score}%</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs font-bold text-slate-800">
                  سورة {resolveSurahArabicName(todayRecord.memorization.surahFrom) || todayRecord.memorization.surahFrom} — آية {todayRecord.memorization.ayahFrom} ← سورة {resolveSurahArabicName(todayRecord.memorization.surahTo) || todayRecord.memorization.surahTo} — آية {todayRecord.memorization.ayahTo}
                </p>
                {todayRecord.memorization.notes && (
                  <p className="mt-1 text-[10px] text-slate-600">{todayRecord.memorization.notes}</p>
                )}
              </div>
            )}
            {todayRecord.revision && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" />
                    المراجعة{todayRecord.revision.type ? ` (${todayRecord.revision.type})` : ''}
                  </span>
                  {todayRecord.revision.unachieved ? (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">لم تُنجَز</span>
                  ) : (
                    <span className="text-sm font-black text-amber-800">{todayRecord.revision.score}%</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs font-bold text-slate-800">
                  {todayRecord.revision.surahFrom || todayRecord.revision.surahTo
                    ? `من ${resolveSurahArabicName(todayRecord.revision.surahFrom) || todayRecord.revision.surahFrom || '—'} إلى ${resolveSurahArabicName(todayRecord.revision.surahTo) || todayRecord.revision.surahTo || '—'}`
                    : todayRecord.revision.autoRangeLabel || '—'}
                </p>
              </div>
            )}
            {todayRecord.spelling && todayRecord.spelling.lessonId && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-900 flex items-center gap-1.5">
                    <BookType className="w-3.5 h-3.5" />
                    الهجاء — درس {todayRecord.spelling.lessonNumber || '؟'}
                  </span>
                  {todayRecord.spelling.unachieved ? (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">لم يُنجَز</span>
                  ) : (
                    <span className="text-sm font-black text-teal-800">{todayRecord.spelling.finalScore}%</span>
                  )}
                </div>
                {todayRecord.spelling.statusTag && (
                  <p className="mt-1.5 text-[10px] font-bold text-slate-700">{todayRecord.spelling.statusTag}</p>
                )}
              </div>
            )}
            {Object.entries(todayRecord.customTracks || {})
              .filter(([tid]) => !isMetaTrackKey(tid))
              .map(([tid, t]) => (
                <div key={tid} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {tracks.find((tr) => tr.id === tid)?.name || tid}
                    </span>
                    {t?.unachieved ? (
                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">لم يُنجَز</span>
                    ) : (
                      <span className="text-sm font-black text-slate-800">{t?.score}%</span>
                    )}
                  </div>
                  {t?.notes && <p className="mt-1.5 text-[10px] text-slate-600">{t.notes}</p>}
                </div>
              ))}
            {todayRecord.teacherRemarks && (
              <p className="text-[11px] font-bold text-slate-600 px-1">
                ملاحظات: <span className="font-semibold">{todayRecord.teacherRemarks}</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsEditingToday(true)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm shadow-amber-200 transition-all active:scale-[0.99]"
            >
              <PencilLine className="w-4 h-4" />
              تحديث إنجاز اليوم
            </button>
          </div>
        )}

        {!isLockedUpdateView && (<>

        {/* Step Indicator — one track at a time, no "التقييم الشامل" */}
        {!singleStep && (
          <div className="flex items-center gap-1.5 mt-4">
            {steps.map((st, i) => {
              const done = completedSteps.has(i);
              const active = i === safeIndex;
              const isUnach = Boolean(unachievedTracks[st]);
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
                      ? isUnach
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-emerald-700 text-white shadow-xs'
                      : isUnach
                      ? 'bg-rose-50 text-rose-800 border border-rose-300'
                      : done
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isUnach ? (
                    <X className="w-3.5 h-3.5 text-rose-500" />
                  ) : done && !active ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    meta.icon
                  )}
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
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-emerald-950">✏️ الهجاء القرآني</h4>
                </div>
                <div className="flex items-center gap-2">
                  {spellingHasPendingDebt ? (
                    <span
                      className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs"
                      title="الطالب لديه درس هجاء متراكم من الجلسة السابقة — يلزم إثباته اليوم ولا يمكن تأجيله"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>واجب متراكم — يلزم الإنجاز اليوم</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleTrackUnachieved('spelling')}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        unachievedTracks['spelling']
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                      }`}
                      title={unachievedTracks['spelling'] ? 'إلغاء وسم عدم الإنجاز' : 'وسم الهجاء كغير منجز لهذا اليوم'}
                    >
                      {unachievedTracks['spelling'] ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>تم الوسم: لم يُنجز</span>
                        </>
                      ) : (
                        <span>لم يُنجز اليوم ✕</span>
                      )}
                    </button>
                  )}

                  {!unachievedTracks['spelling'] && (
                    <span className="text-base font-black text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">
                      {spellingFinalScore}%
                    </span>
                  )}
                </div>
              </div>

              {unachievedTracks['spelling'] ? (
                <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-xl text-center my-2 animate-fadeIn">
                  <p className="text-xs font-bold text-rose-800">
                    تم استثناء درس الهجاء لجلسة اليوم (لن تُسجل له درجات أو يتم تصعيد الدرس).
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleTrackUnachieved('spelling')}
                    className="mt-1.5 text-[11px] text-rose-700 underline font-semibold cursor-pointer hover:text-rose-900"
                  >
                    تراجع وتفعيل تقييم الدرس
                  </button>
                </div>
              ) : (
                <>
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
                </>
              )}
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

              {/* Pending Debt Banner if previous session memorization was unachieved */}
              {memHasPendingDebt && (
                <div className="mb-3 bg-amber-100/90 border border-amber-300 p-2.5 rounded-xl flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-amber-900 font-bold block">واجب متراكم من الجلسة السابقة:</span>
                      <span className="font-bold text-amber-950 font-['Amiri',serif]">
                        {todayDailyItem?.targetUnit?.displayLabel || `${surahFrom} (${ayahFrom}-${ayahTo})`}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    مستحق التسميع اليوم
                  </span>
                </div>
              )}

              {/* Quran Plan Daily Unit Banner */}
              {todayDailyItem && !memHasPendingDebt && (
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

              <FiveStarRating
                label="تقييم إتقان التسميع والتجويد (بالنجوم):"
                value={memScore}
                onChange={setMemScore}
                theme="blue"
                isUnachieved={Boolean(unachievedTracks['memorization'])}
                onToggleUnachieved={() => toggleTrackUnachieved('memorization')}
                hasPendingDebt={memHasPendingDebt}
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

              {/* Pending Debt Banner if previous session revision was unachieved */}
              {revHasPendingDebt && (
                <div className="mb-3 bg-amber-100/90 border border-amber-300 p-2.5 rounded-xl flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-amber-900 font-bold block">واجب مراجعة متراكم من الجلسة السابقة:</span>
                      <span className="font-bold text-amber-950">
                        {todayDailyItem?.revisionDisplayLabel || `${revSurahFrom} إلى ${revSurahTo}`}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    مستحق المراجعة اليوم
                  </span>
                </div>
              )}

              {/* Plan-driven daily revision banner */}
              {todayDailyItem?.revisionDisplayLabel && !revHasPendingDebt && (
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

              {/* Auto Minor Revision — engine-suggested range shown as info;
                  fields stay editable directly (no manual-unlock step). */}
              {autoRevision && autoRevLabel && revHasPendingDebt && (
                <p className="mb-2 text-[10px] font-bold text-amber-800">
                  مقرر المراجعة التلقائي: {autoRevLabel}
                  {autoRevPages !== undefined ? ` — ${autoRevPages} صفحة` : ''}
                </p>
              )}
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

              {/* Revision mastery — 5-star interactive rating */}
              <FiveStarRating
                label="تقييم إتقان المراجعة والتثبيت (بالنجوم):"
                value={revScore}
                onChange={setRevScore}
                theme="amber"
                isUnachieved={Boolean(unachievedTracks['revision'])}
                onToggleUnachieved={() => toggleTrackUnachieved('revision')}
                hasPendingDebt={revHasPendingDebt}
              />
            </div>
          )}

          {/* STEP: DYNAMIC / CUSTOM TRACK */}
          {!BUILTIN_STEP_IDS.includes(currentStep) && (
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-700" />
                  <h4 className="text-xs font-bold text-purple-950">
                    {tracks.find((t) => t.id === currentStep)?.name || currentStep}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTrackUnachieved(currentStep)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      unachievedTracks[currentStep]
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                    }`}
                  >
                    {unachievedTracks[currentStep] ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>تم الوسم: لم يُنجز</span>
                      </>
                    ) : (
                      <span>لم يُنجز اليوم ✕</span>
                    )}
                  </button>

                  {!unachievedTracks[currentStep] && (
                    <span className="text-base font-black text-purple-900 bg-white px-2.5 py-0.5 rounded-lg border border-purple-300">
                      {customTrackScores[currentStep] ?? 85}%
                    </span>
                  )}
                </div>
              </div>

              {unachievedTracks[currentStep] ? (
                <div className="p-3.5 bg-rose-50/90 border border-rose-200 rounded-xl text-center my-2 animate-fadeIn">
                  <p className="text-xs font-bold text-rose-800">
                    تم استثناء هذا المسار لجلسة اليوم (لن تُسجل له درجات).
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleTrackUnachieved(currentStep)}
                    className="mt-1.5 text-[11px] text-rose-700 underline font-semibold cursor-pointer hover:text-rose-900"
                  >
                    تراجع وتفعيل التقييم
                  </button>
                </div>
              ) : (
                <>
                  <FiveStarRating
                    label="تقييم إتقان المسار (بالنجوم):"
                    value={customTrackScores[currentStep] ?? 85}
                    onChange={(sc) =>
                      setCustomTrackScores((prev) => ({ ...prev, [currentStep]: sc }))
                    }
                    theme="blue"
                  />
                  <div className="mt-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      ملاحظة المسار
                    </label>
                    <input
                      type="text"
                      value={customTrackNotes[currentStep] || ''}
                      onChange={(e) =>
                        setCustomTrackNotes((prev) => ({
                          ...prev,
                          [currentStep]: e.target.value,
                        }))
                      }
                      placeholder="ملاحظة خاصة بهذا المسار..."
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300"
                    />
                  </div>
                </>
              )}
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
            {saveError && (
              <span className="text-xs font-bold text-rose-600">{saveError}</span>
            )}
            {steps.length > 0 && isLastStep && onOpenReportModal && (
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
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
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSaved ? (
                  <Check className="w-4 h-4 text-emerald-200" />
                ) : null}
                <span>{isSaving ? 'جارٍ الحفظ…' : 'حفظ'}</span>
              </button>
            ) : steps.length > 0 ? (
              <button
                onClick={handleNextStep}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors disabled:opacity-60"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
};
