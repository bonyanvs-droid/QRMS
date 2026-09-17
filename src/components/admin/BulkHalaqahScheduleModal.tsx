import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Check,
  CheckCheck,
  Layers,
  GraduationCap,
  Users,
  Search,
  ArrowLeft,
  Moon,
  Sun,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  DailyPrayerTimes,
  EducationalStage,
  Halaqah,
  HalaqahDaySchedule,
  PrayerReference,
  PrayerTimeOffset,
  ScheduleTimeType,
} from '../../types';
import {
  STANDARD_WEEK_DAYS,
  formatPrayerOffset,
  calculatePrayerLinkedTime,
  getHalaqahActiveDays,
} from '../../utils/scheduleCalculator';
import {
  PRAYER_NAMES_AR,
  formatTime12Hour,
} from '../../utils/prayerTimesService';

interface BulkHalaqahScheduleModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
  halaqahs: Halaqah[];
  stages: EducationalStage[];
  prayerTimesToday?: DailyPrayerTimes | null;
  onApply: (params: {
    targetHalaqahIds: string[];
    weeklySchedule: HalaqahDaySchedule[];
    defaultTimeType: ScheduleTimeType;
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultStartPrayerOffset?: PrayerTimeOffset;
    defaultEndPrayerOffset?: PrayerTimeOffset;
    lateThresholdMinutes?: number;
  }) => Promise<void>;
}

type TargetSelectionMode = 'all' | 'stage' | 'custom';

export const BulkHalaqahScheduleModal: React.FC<BulkHalaqahScheduleModalProps> = ({
  isOpen = false,
  onClose = () => {},
  inline = false,
  halaqahs,
  stages,
  prayerTimesToday,
  onApply,
}) => {
  // Target Scope State
  const [targetMode, setTargetMode] = useState<TargetSelectionMode>('all');
  const [selectedStageId, setSelectedStageId] = useState<string>(stages[0]?.id || '');
  const [customHalaqahIds, setCustomHalaqahIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Days State (default Sun - Thu)
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4]);

  // Timing Type State
  const [timeType, setTimeType] = useState<ScheduleTimeType>('prayer');

  // Fixed Times State
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');

  // Prayer Linked State (Default: on-time Maghrib to on-time Isha, 0 mins offset)
  const [startPrayerOffset, setStartPrayerOffset] = useState<PrayerTimeOffset>({
    prayer: 'maghrib',
    offsetMinutes: 0,
  });
  const [endPrayerOffset, setEndPrayerOffset] = useState<PrayerTimeOffset>({
    prayer: 'isha',
    offsetMinutes: 0,
  });

  // Late Threshold
  const [lateThreshold, setLateThreshold] = useState<number>(15);

  // Submitting state & message
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtered active halaqahs
  const activeHalaqahs = useMemo(() => halaqahs.filter((h) => !h.isArchived), [halaqahs]);

  // Resolved target IDs based on mode
  const resolvedTargetIds = useMemo(() => {
    if (targetMode === 'all') {
      return activeHalaqahs.map((h) => h.id);
    }
    if (targetMode === 'stage') {
      return activeHalaqahs
        .filter((h) => h.stageId === selectedStageId || h.grade === selectedStageId)
        .map((h) => h.id);
    }
    return customHalaqahIds;
  }, [targetMode, selectedStageId, customHalaqahIds, activeHalaqahs]);

  // Quick preset days handlers
  const handleSetSundayToThursday = () => setActiveDays([0, 1, 2, 3, 4]);
  const handleSetFourDays = () => setActiveDays([0, 1, 2, 3]);
  const handleSetThreeDays = () => setActiveDays([0, 2, 4]);
  const handleSetSaturdayToWednesday = () => setActiveDays([6, 0, 1, 2, 3]);

  const toggleDay = (dayIndex: number) => {
    setActiveDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex).sort((a, b) => a - b)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  // Custom selection helpers
  const handleSelectAllHalaqahs = () => {
    setCustomHalaqahIds(activeHalaqahs.map((h) => h.id));
  };
  const handleDeselectAllHalaqahs = () => {
    setCustomHalaqahIds([]);
  };
  const toggleHalaqahSelection = (id: string) => {
    setCustomHalaqahIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Live preview times for prayer mode
  const calculatedStartToday = useMemo(() => {
    if (timeType !== 'prayer' || !prayerTimesToday) return null;
    return calculatePrayerLinkedTime(startPrayerOffset, prayerTimesToday);
  }, [timeType, startPrayerOffset, prayerTimesToday]);

  const calculatedEndToday = useMemo(() => {
    if (timeType !== 'prayer' || !prayerTimesToday) return null;
    return calculatePrayerLinkedTime(endPrayerOffset, prayerTimesToday);
  }, [timeType, endPrayerOffset, prayerTimesToday]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvedTargetIds.length === 0) {
      alert('يرجى اختيار حلقة واحدة على الأقل لتطبيق المواعيد عليها.');
      return;
    }
    if (activeDays.length === 0) {
      alert('يرجى تحديد يوم عمل نشط واحد على الأقل في الأسبوع.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    // Build the weeklySchedule array for 7 days
    const weeklySchedule: HalaqahDaySchedule[] = STANDARD_WEEK_DAYS.map((day) => {
      const isActive = activeDays.includes(day.dayOfWeek);
      return {
        dayOfWeek: day.dayOfWeek,
        dayName: day.dayName,
        isActive,
        timeType,
        startTime: timeType === 'fixed' ? startTime : undefined,
        endTime: timeType === 'fixed' ? endTime : undefined,
        startPrayerOffset: timeType === 'prayer' ? startPrayerOffset : undefined,
        endPrayerOffset: timeType === 'prayer' ? endPrayerOffset : undefined,
        isCustomTime: false,
      };
    });

    try {
      await onApply({
        targetHalaqahIds: resolvedTargetIds,
        weeklySchedule,
        defaultTimeType: timeType,
        defaultStartTime: startTime,
        defaultEndTime: endTime,
        defaultStartPrayerOffset: startPrayerOffset,
        defaultEndPrayerOffset: endPrayerOffset,
        lateThresholdMinutes: lateThreshold,
      });

      setSuccessMessage(`تم بنجاح تعميم الجدول الموحد على (${resolvedTargetIds.length}) حلقة.`);
      setTimeout(() => {
        setSuccessMessage(null);
        if (!inline && onClose) {
          onClose();
        }
      }, 1500);
    } catch (err: any) {
      alert('حدث خطأ أثناء تطبيق الجدول بالجملة: ' + (err.message || 'تعذر الإكمال'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormBody = () => (
    <>
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. TARGET SCOPE SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>1. اختر نطاق الحلقات المستهدفة بالتعميم:</span>
              </label>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                المحدد: {resolvedTargetIds.length} حلقة
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: All Halaqahs */}
              <button
                type="button"
                onClick={() => setTargetMode('all')}
                className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  targetMode === 'all'
                    ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-600/20 text-emerald-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold">جميع حلقات المجمع</span>
                  </div>
                  {targetMode === 'all' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <span className="text-[11px] text-slate-500 font-normal">
                  يشمل كافة الحلقات النشطة ({activeHalaqahs.length} حلقة)
                </span>
              </button>

              {/* Option 2: By Stage */}
              <button
                type="button"
                onClick={() => setTargetMode('stage')}
                className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  targetMode === 'stage'
                    ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-600/20 text-emerald-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold">حسب المرحلة التعليمية</span>
                  </div>
                  {targetMode === 'stage' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <span className="text-[11px] text-slate-500 font-normal">
                  تحديد مرحلة معينة وتطبيق المواعيد على حلقاتها
                </span>
              </button>

              {/* Option 3: Custom selection */}
              <button
                type="button"
                onClick={() => {
                  setTargetMode('custom');
                  if (customHalaqahIds.length === 0) {
                    setCustomHalaqahIds(activeHalaqahs.map((h) => h.id));
                  }
                }}
                className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  targetMode === 'custom'
                    ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-600/20 text-emerald-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold">تحديد يدوي مخصص</span>
                  </div>
                  {targetMode === 'custom' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <span className="text-[11px] text-slate-500 font-normal">
                  اختيار حلقات محددة عبر مربعات التحديد
                </span>
              </button>
            </div>

            {/* Sub-selector for Stage mode */}
            {targetMode === 'stage' && (
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">المرحلة المراد تعميم المواعيد على حلقاتها:</span>
                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800"
                >
                  {stages.map((stg) => {
                    const count = activeHalaqahs.filter((h) => h.stageId === stg.id || h.grade === stg.id).length;
                    return (
                      <option key={stg.id} value={stg.id}>
                        {stg.name} ({count} حلقة)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Sub-selector for Custom mode */}
            {targetMode === 'custom' && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="بحث في أسماء الحلقات أو المعلمين..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleSelectAllHalaqahs}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllHalaqahs}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                  {activeHalaqahs
                    .filter((h) => !searchQuery || h.name.includes(searchQuery) || (h.teacherName && h.teacherName.includes(searchQuery)))
                    .map((hlq) => {
                      const isChecked = customHalaqahIds.includes(hlq.id);
                      return (
                        <button
                          key={hlq.id}
                          type="button"
                          onClick={() => toggleHalaqahSelection(hlq.id)}
                          className={`p-2 rounded-lg text-right text-xs transition cursor-pointer border flex items-center justify-between gap-1.5 ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{hlq.name}</span>
                          <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                            isChecked ? 'bg-emerald-700 text-white border-emerald-700' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 2. WEEKLY ACTIVE DAYS SELECTION */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>2. حدد أيام الحضور الأسبوعية المعتمدة للحلقات:</span>
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSetSundayToThursday}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200"
                >
                  الأحد - الخميس (5 أيام)
                </button>
                <button
                  type="button"
                  onClick={handleSetFourDays}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200"
                >
                  الأحد - الأربعاء (4 أيام)
                </button>
                <button
                  type="button"
                  onClick={handleSetThreeDays}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200"
                >
                  3 أيام
                </button>
                <button
                  type="button"
                  onClick={handleSetSaturdayToWednesday}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200"
                >
                  السبت - الأربعاء
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {STANDARD_WEEK_DAYS.map((day) => {
                const isSelected = activeDays.includes(day.dayOfWeek);
                return (
                  <button
                    key={day.dayOfWeek}
                    type="button"
                    onClick={() => toggleDay(day.dayOfWeek)}
                    className={`p-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    <span>{day.dayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TIMING CONFIGURATION (PRAYER LINKED VS FIXED) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>3. اختر نمط التوقيت المراد تعميمه:</span>
            </label>

            {/* Time Type Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTimeType('prayer')}
                className={`p-4 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between ${
                  timeType === 'prayer'
                    ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-600/20 text-emerald-950 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeType === 'prayer' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block">مرتبط بمواقيت الصلاة</span>
                    <span className="text-[11px] text-slate-500 font-normal">يتكيف يومياً تلقائياً مع أذان المسجد</span>
                  </div>
                </div>
                {timeType === 'prayer' && <CheckCircle2 className="w-5 h-5 text-emerald-700" />}
              </button>

              <button
                type="button"
                onClick={() => setTimeType('fixed')}
                className={`p-4 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between ${
                  timeType === 'fixed'
                    ? 'bg-emerald-50 border-emerald-700 ring-2 ring-emerald-600/20 text-emerald-950 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${timeType === 'fixed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block">توقيت ثابت بالساعة</span>
                    <span className="text-[11px] text-slate-500 font-normal">ساعات محددة لا تتغير مع الفصول</span>
                  </div>
                </div>
                {timeType === 'fixed' && <CheckCircle2 className="w-5 h-5 text-emerald-700" />}
              </button>
            </div>

            {/* PRAYER LINKED CONTROLS */}
            {timeType === 'prayer' && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Prayer Setting */}
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">وقت بداية الحلقة (الحضور):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">الصلاة المرجعية</label>
                        <select
                          value={startPrayerOffset.prayer}
                          onChange={(e) =>
                            setStartPrayerOffset((prev) => ({
                              ...prev,
                              prayer: e.target.value as PrayerReference,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-800"
                        >
                          <option value="fajr">صلاة الفجر</option>
                          <option value="sunrise">الشروق</option>
                          <option value="dhuhr">صلاة الظهر</option>
                          <option value="asr">صلاة العصر</option>
                          <option value="maghrib">صلاة المغرب</option>
                          <option value="isha">صلاة العشاء</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">فارق الدقائق</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="-120"
                            max="180"
                            step={5}
                            value={startPrayerOffset.offsetMinutes}
                            onChange={(e) =>
                              setStartPrayerOffset((prev) => ({
                                ...prev,
                                offsetMinutes: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold font-mono bg-white"
                          />
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">د</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick offset buttons for start prayer */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">ضبط سريع:</span>
                      <button
                        type="button"
                        onClick={() => setStartPrayerOffset((prev) => ({ ...prev, offsetMinutes: 0 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          startPrayerOffset.offsetMinutes === 0
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        على الموعد (0د)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartPrayerOffset((prev) => ({ ...prev, offsetMinutes: 10 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          startPrayerOffset.offsetMinutes === 10
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        +10د
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartPrayerOffset((prev) => ({ ...prev, offsetMinutes: 15 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          startPrayerOffset.offsetMinutes === 15
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        +15د
                      </button>
                    </div>

                    <p className="text-[11px] text-emerald-800 font-bold pt-1">
                      {formatPrayerOffset(startPrayerOffset)}
                    </p>
                  </div>

                  {/* End Prayer Setting */}
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">وقت نهاية الحلقة (الانصراف):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">الصلاة المرجعية</label>
                        <select
                          value={endPrayerOffset.prayer}
                          onChange={(e) =>
                            setEndPrayerOffset((prev) => ({
                              ...prev,
                              prayer: e.target.value as PrayerReference,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-slate-800"
                        >
                          <option value="fajr">صلاة الفجر</option>
                          <option value="sunrise">الشروق</option>
                          <option value="dhuhr">صلاة الظهر</option>
                          <option value="asr">صلاة العصر</option>
                          <option value="maghrib">صلاة المغرب</option>
                          <option value="isha">صلاة العشاء</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1">فارق الدقائق</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="-120"
                            max="180"
                            step={5}
                            value={endPrayerOffset.offsetMinutes}
                            onChange={(e) =>
                              setEndPrayerOffset((prev) => ({
                                ...prev,
                                offsetMinutes: parseInt(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold font-mono bg-white"
                          />
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">د</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick offset buttons for end prayer */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">ضبط سريع:</span>
                      <button
                        type="button"
                        onClick={() => setEndPrayerOffset((prev) => ({ ...prev, offsetMinutes: 0 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          endPrayerOffset.offsetMinutes === 0
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        على الموعد (0د)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndPrayerOffset((prev) => ({ ...prev, offsetMinutes: -15 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          endPrayerOffset.offsetMinutes === -15
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        -15د
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndPrayerOffset((prev) => ({ ...prev, offsetMinutes: -10 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          endPrayerOffset.offsetMinutes === -10
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        -10د
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndPrayerOffset((prev) => ({ ...prev, offsetMinutes: 10 }))}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          endPrayerOffset.offsetMinutes === 10
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        +10د
                      </button>
                    </div>

                    <p className="text-[11px] text-emerald-800 font-bold pt-1">
                      {formatPrayerOffset(endPrayerOffset)}
                    </p>
                  </div>
                </div>

                {/* Live Prayer Times Preview Banner */}
                {prayerTimesToday && calculatedStartToday && calculatedEndToday && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">
                        معاينة التوقيت الفعلي اليوم بموجب تقويم المسجد:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold font-mono">
                        من {formatTime12Hour(calculatedStartToday)} إلى {formatTime12Hour(calculatedEndToday)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FIXED TIMING CONTROLS */}
            {timeType === 'fixed' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>ساعة بداية الدوام المعتمدة</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>ساعة نهاية الدوام والانصراف</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono bg-white text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* Late threshold */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">وقت التأخير المسموح به:</span>
                <span className="text-[11px] text-slate-500">
                  عدد الدقائق المسموحة قبل رصد المعلم أو الطالب كـ "متأخر"
                </span>
              </div>
              <div className="relative w-36">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold font-mono bg-white text-slate-800"
                />
                <span className="absolute left-3 top-1.5 text-xs text-slate-500">دقيقة</span>
              </div>
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span>تنبيه: سيتم استبدال الجدول الأسبوعي والمواعيد لكافة الـ </span>
              <strong className="underline decoration-amber-600 font-bold">
                ({resolvedTargetIds.length}) حلقة المحددة
              </strong>
              <span>، بينما ستظل بيانات الطلاب والمسارات والمعلمين كما هي دون تغيير.</span>
            </div>
          </div>
    </>
  );

  if (inline) {
    return (
      <div
        className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6 text-right"
        dir="rtl"
      >
        {/* Inline Section Header */}
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>الضبط والتعميم الجماعي لمواعيد وأيام الحلقات</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ربط بمواقيت الصلاة والتوقيت الثابت
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تطبيق أوقات الصلاة المتكيفة تلقائياً أو التوقيت الثابت على حلقات المجمع والمراحل بنقرة واحدة
              </p>
            </div>
          </div>
        </div>

        {/* Inline Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(e);
          }}
          className="space-y-6"
        >
          {renderFormBody()}

          {/* Inline Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="submit"
              disabled={isSubmitting || resolvedTargetIds.length === 0}
              className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isSubmitting || resolvedTargetIds.length === 0
                  ? 'bg-emerald-400 opacity-60 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الاعتماد وتحديث الحلقات...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>اعتماد وتطبيق الجدول على ({resolvedTargetIds.length}) حلقة فوراً</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-linear-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Sparkles className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>الضبط والتعميم الجماعي لمواعيد الحلقات</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  دفعة واحدة
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                تطبيق أوقات الصلاة المتكيفة تلقائياً أو التوقيت الثابت على عدة حلقات بنقرة زر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {renderFormBody()}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting || resolvedTargetIds.length === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-md ${
                isSubmitting || resolvedTargetIds.length === 0
                  ? 'bg-emerald-400 opacity-60 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الاعتماد وتحديث الحلقات...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>اعتماد وتطبيق الجدول على ({resolvedTargetIds.length}) حلقة فوراً</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
