import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DailySessionRecord, SpellingLesson, Student } from '../../types';
import { SURAHS_LIST } from '../../data/initialData';
import { ALL_114_SURAHS, getSurahsByDirection, getSurahAyahsCount } from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';
import { Sparkles, BookOpen, RotateCcw, Check, MessageSquare, X, Send } from 'lucide-react';
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
  } = useApp();

  // Active Tab: spelling, memorization, revision, or all
  const [activeMode, setActiveMode] = useState<'all' | 'spelling' | 'memorization' | 'revision'>('all');

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

  // Memorization Track State
  const [surahFrom, setSurahFrom] = useState<string>(student.currentSurah);
  const [ayahFrom, setAyahFrom] = useState<number>(1);
  const [surahTo, setSurahTo] = useState<string>(student.currentSurah);
  const [ayahTo, setAyahTo] = useState<number>(student.currentAyah || 10);
  const [memScore, setMemScore] = useState<number>(90);
  const [memNotes, setMemNotes] = useState('');

  // Revision Track State
  const [revSurahFrom, setRevSurahFrom] = useState<string>('الناس');
  const [revAyahFrom, setRevAyahFrom] = useState<number>(1);
  const [revSurahTo, setRevSurahTo] = useState<string>(student.currentSurah);
  const [revAyahTo, setRevAyahTo] = useState<number>(student.currentAyah || 1);
  const [revType, setRevType] = useState<'قريبة' | 'بعيدة'>('قريبة');
  const [revScore, setRevScore] = useState<number>(95);

  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Quran Planning Engine Integration
  const activeQuranPlan = getActiveStudentQuranPlan(student.id);
  const todayIso = new Date().toISOString().split('T')[0];
  const todayDailyItem = activeQuranPlan?.generatedPlan?.dailyPlans?.find((d) => d.date === todayIso);

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
    if (avg >= 85) setSpellingStatusTag('أتقن');
    else if (avg >= 70) setSpellingStatusTag('يحتاج تثبيت');
    else setSpellingStatusTag('لم ينتقل بعد');
  };

  const handleSave = async (andSendReport = false) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const recordData: Omit<DailySessionRecord, 'id' | 'createdAt'> = {
      studentId: student.id,
      teacherId: student.teacherId,
      halaqahId: student.halaqahId,
      date: todayStr,
      weekNumber: academicConfig.currentWeek,
      attendance: 'present',
      spelling: selectedLesson
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
      memorization: {
        surahFrom,
        ayahFrom,
        surahTo,
        ayahTo,
        score: memScore,
        notes: memNotes,
      },
      revision: {
        surahFrom: revSurahFrom,
        surahTo: revSurahTo,
        type: revType,
        score: revScore,
      },
      teacherRemarks: generalNotes,
    };

    await recordDailySession(recordData);

    // Sync with Quran Planning Engine if plan is active
    if (activeQuranPlan && todayDailyItem) {
      try {
        await recordQuranPlanAchievement({
          planId: activeQuranPlan.id,
          dayDate: todayIso,
          status: 'completed',
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
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 md:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-black text-base flex items-center justify-center">
              {(student.fullName || student.name || 'ط').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-bold text-slate-900">{student.fullName}</h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  {student.grade}
                </span>
              </div>
              <p className="text-xs text-slate-700">
                المستهدف: سورة {student.minimumTargetSurah} • الموضع الحالي: سورة {student.currentSurah}
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

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 mt-4 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveMode('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeMode === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            التقييم الشامل
          </button>
          <button
            onClick={() => setActiveMode('spelling')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeMode === 'spelling' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>الهجاء القرآني</span>
          </button>
          <button
            onClick={() => setActiveMode('memorization')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeMode === 'memorization'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>الحفظ الجديد</span>
          </button>
          <button
            onClick={() => setActiveMode('revision')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeMode === 'revision' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>المراجعة</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pl-1">
          {/* TRACK 1: SPELLING */}
          {(activeMode === 'all' || activeMode === 'spelling') && (
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold text-emerald-950">تقييم الهجاء القرآني (الدرس والمهام الفرعية)</h4>
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

              {/* Status Tag Selector */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">قرار المعلم:</span>
                {(['أتقن', 'يحتاج تثبيت', 'لم ينتقل بعد', 'يحتاج مراجعة'] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSpellingStatusTag(tag)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      spellingStatusTag === tag
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TRACK 2: MEMORIZATION */}
          {(activeMode === 'all' || activeMode === 'memorization') && (
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  <h4 className="text-xs font-bold text-blue-950">تسميع المحفوظ الجديد</h4>
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

              <div className="mt-3 flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-700">تقييم إتقان التسميع والتجويد:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="60"
                    max="100"
                    step="5"
                    value={memScore}
                    onChange={(e) => setMemScore(parseInt(e.target.value))}
                    className="w-28 accent-blue-600"
                  />
                  <span className="font-bold text-blue-800">{memScore}%</span>
                </div>
              </div>
            </div>
          )}

          {/* TRACK 3: REVISION */}
          {(activeMode === 'all' || activeMode === 'revision') && (
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-bold text-amber-950">المراجعة والتثبيت</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-700 font-medium">الدرجة:</span>
                  <span className="text-base font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {revScore}%
                  </span>
                </div>
              </div>

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

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : null}
              <span>حفظ التقييم فقط</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              <Send className="w-4 h-4 text-amber-300" />
              <span>حفظ وإرسال تقرير الواتساب 📲</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
