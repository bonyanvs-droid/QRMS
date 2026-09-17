import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Sliders,
  RotateCcw,
  Sun,
  Moon,
  Info,
} from 'lucide-react';
import {
  DailyPrayerTimes,
  Halaqah,
  HalaqahDaySchedule,
  PrayerReference,
  PrayerTimeOffset,
  ScheduleTimeType,
} from '../../types';
import {
  formatPrayerOffset,
  normalizeWeeklySchedule,
  resolveDayScheduleTimes,
  STANDARD_WEEK_DAYS,
} from '../../utils/scheduleCalculator';
import { formatTime12Hour, PRAYER_NAMES_AR } from '../../utils/prayerTimesService';

interface HalaqahScheduleEditorProps {
  halaqah: Partial<Halaqah>;
  onChange: (updatedSchedule: {
    weeklySchedule: HalaqahDaySchedule[];
    defaultTimeType: ScheduleTimeType;
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultStartPrayerOffset?: PrayerTimeOffset;
    defaultEndPrayerOffset?: PrayerTimeOffset;
  }) => void;
  prayerTimesToday?: DailyPrayerTimes | null;
}

export const HalaqahScheduleEditor: React.FC<HalaqahScheduleEditorProps> = ({
  halaqah,
  onChange,
  prayerTimesToday,
}) => {
  const [schedule, setSchedule] = useState<HalaqahDaySchedule[]>(() =>
    normalizeWeeklySchedule(halaqah)
  );

  const [timeType, setTimeType] = useState<ScheduleTimeType>(
    halaqah.defaultTimeType ||
      (schedule.some((d) => d.timeType === 'prayer') ? 'prayer' : 'fixed')
  );

  // Global default fixed times
  const [defaultStart, setDefaultStart] = useState<string>(
    halaqah.defaultStartTime || '16:00'
  );
  const [defaultEnd, setDefaultEnd] = useState<string>(
    halaqah.defaultEndTime || '18:00'
  );

  // Global default prayer offsets (Default: on-time Maghrib and on-time Isha)
  const [defaultStartPrayer, setDefaultStartPrayer] = useState<PrayerTimeOffset>(
    halaqah.defaultStartPrayerOffset || { prayer: 'maghrib', offsetMinutes: 0 }
  );
  const [defaultEndPrayer, setDefaultEndPrayer] = useState<PrayerTimeOffset>(
    halaqah.defaultEndPrayerOffset || { prayer: 'isha', offsetMinutes: 0 }
  );

  // Propagate changes up to parent
  const notifyParent = (
    newSchedule: HalaqahDaySchedule[],
    newType: ScheduleTimeType,
    startF: string,
    endF: string,
    startP: PrayerTimeOffset,
    endP: PrayerTimeOffset
  ) => {
    setSchedule(newSchedule);
    onChange({
      weeklySchedule: newSchedule,
      defaultTimeType: newType,
      defaultStartTime: startF,
      defaultEndTime: endF,
      defaultStartPrayerOffset: startP,
      defaultEndPrayerOffset: endP,
    });
  };

  // Toggle active status for a specific day
  const handleToggleDayActive = (dayOfWeek: number) => {
    const updated = schedule.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        return { ...d, isActive: !d.isActive };
      }
      return d;
    });
    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, defaultEndPrayer);
  };

  // Apply default settings to all active days
  const handleApplyToAllActiveDays = () => {
    const updated = schedule.map((d) => {
      if (!d.isActive) return d;
      return {
        ...d,
        timeType,
        startTime: defaultStart,
        endTime: defaultEnd,
        startPrayerOffset: defaultStartPrayer,
        endPrayerOffset: defaultEndPrayer,
        isCustomTime: false,
      };
    });
    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, defaultEndPrayer);
  };

  // Toggle day-specific custom override
  const handleToggleCustomDay = (dayOfWeek: number) => {
    const updated = schedule.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        const isCustom = !d.isCustomTime;
        return {
          ...d,
          isCustomTime: isCustom,
          // If turning on custom, prefill with current defaults
          timeType: isCustom ? (d.timeType || timeType) : timeType,
          startTime: isCustom ? (d.startTime || defaultStart) : defaultStart,
          endTime: isCustom ? (d.endTime || defaultEnd) : defaultEnd,
          startPrayerOffset: isCustom ? (d.startPrayerOffset || defaultStartPrayer) : defaultStartPrayer,
          endPrayerOffset: isCustom ? (d.endPrayerOffset || defaultEndPrayer) : defaultEndPrayer,
        };
      }
      return d;
    });
    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, defaultEndPrayer);
  };

  // Update a specific day's configuration
  const handleUpdateDay = (dayOfWeek: number, patch: Partial<HalaqahDaySchedule>) => {
    const updated = schedule.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        return { ...d, ...patch, isCustomTime: true };
      }
      return d;
    });
    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, defaultEndPrayer);
  };

  // Calculate sample timing preview based on current defaults
  const sampleTimes = resolveDayScheduleTimes(
    {
      dayOfWeek: 0,
      dayName: 'الأحد',
      isActive: true,
      timeType,
      startTime: defaultStart,
      endTime: defaultEnd,
      startPrayerOffset: defaultStartPrayer,
      endPrayerOffset: defaultEndPrayer,
    },
    prayerTimesToday
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      {/* Header with Title & Timing Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="font-black text-slate-900 text-sm">
              جدول الحلقة الذكي (Smart Day-Matrix)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            حدد أيام انعقاد الحلقة ووقتها بدقة (وقت ثابت بالساعة أو مرتبط بمواقيت الصلاة)
          </p>
        </div>

        {/* Mode Selector */}
        <div className="inline-flex rounded-xl bg-slate-200/70 p-1 self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTimeType('prayer');
              const updated = schedule.map((d) => (d.isCustomTime ? d : { ...d, timeType: 'prayer' as ScheduleTimeType }));
              notifyParent(updated, 'prayer', defaultStart, defaultEnd, defaultStartPrayer, defaultEndPrayer);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              timeType === 'prayer'
                ? 'bg-white text-emerald-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-emerald-600" />
            <span>مرتبط بالصلاة</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeType('fixed');
              const updated = schedule.map((d) => (d.isCustomTime ? d : { ...d, timeType: 'fixed' as ScheduleTimeType }));
              notifyParent(updated, 'fixed', defaultStart, defaultEnd, defaultStartPrayer, defaultEndPrayer);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              timeType === 'fixed'
                ? 'bg-white text-emerald-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>وقت ثابت بالساعة</span>
          </button>
        </div>
      </div>

      {/* Default Schedule Settings Box */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold text-slate-800">
              التوقيت الافتراضي لأيام الحلقة:
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyToAllActiveDays}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
            title="تطبيق هذا التوقيت على جميع الأيام النشطة وإلغاء التخصيصات الفردية"
          >
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>تطبيق على جميع الأيام النشطة</span>
          </button>
        </div>

        {timeType === 'prayer' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Start Prayer Offset */}
            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 space-y-1.5">
              <label className="block text-[11px] font-bold text-emerald-950">
                بداية الحلقة (مرتبطة بالصلاة)
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={defaultStartPrayer.prayer}
                  onChange={(e) => {
                    const next = { ...defaultStartPrayer, prayer: e.target.value as PrayerReference };
                    setDefaultStartPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, startPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, next, defaultEndPrayer);
                  }}
                  className="w-1/2 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="fajr">صلاة الفجر</option>
                  <option value="dhuhr">صلاة الظهر</option>
                  <option value="asr">صلاة العصر</option>
                  <option value="maghrib">صلاة المغرب</option>
                  <option value="isha">صلاة العشاء</option>
                </select>

                <div className="w-1/2 flex items-center gap-1">
                  <input
                    type="number"
                    step={5}
                    value={defaultStartPrayer.offsetMinutes}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value, 10) || 0;
                      const next = { ...defaultStartPrayer, offsetMinutes: mins };
                      setDefaultStartPrayer(next);
                      const updated = schedule.map((d) =>
                        d.isCustomTime ? d : { ...d, startPrayerOffset: next }
                      );
                      notifyParent(updated, timeType, defaultStart, defaultEnd, next, defaultEndPrayer);
                    }}
                    className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-center font-mono"
                  />
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">دقيقة</span>
                </div>
              </div>

              {/* Quick adjustment buttons for start prayer */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[9px] text-slate-400 font-bold">ضبط سريع:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultStartPrayer, offsetMinutes: 0 };
                    setDefaultStartPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, startPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, next, defaultEndPrayer);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultStartPrayer.offsetMinutes === 0
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  على الموعد (0د)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultStartPrayer, offsetMinutes: 10 };
                    setDefaultStartPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, startPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, next, defaultEndPrayer);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultStartPrayer.offsetMinutes === 10
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  +10د
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultStartPrayer, offsetMinutes: 15 };
                    setDefaultStartPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, startPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, next, defaultEndPrayer);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultStartPrayer.offsetMinutes === 15
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  +15د
                </button>
              </div>

              <p className="text-[10px] text-emerald-800 font-bold">
                {defaultStartPrayer.offsetMinutes > 0 ? '+' : ''}
                {formatPrayerOffset(defaultStartPrayer)}
              </p>
            </div>

            {/* End Prayer Offset */}
            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 space-y-1.5">
              <label className="block text-[11px] font-bold text-emerald-950">
                نهاية الحلقة (مرتبطة بالصلاة)
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={defaultEndPrayer.prayer}
                  onChange={(e) => {
                    const next = { ...defaultEndPrayer, prayer: e.target.value as PrayerReference };
                    setDefaultEndPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, endPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, next);
                  }}
                  className="w-1/2 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="dhuhr">صلاة الظهر</option>
                  <option value="asr">صلاة العصر</option>
                  <option value="maghrib">صلاة المغرب</option>
                  <option value="isha">صلاة العشاء</option>
                </select>

                <div className="w-1/2 flex items-center gap-1">
                  <input
                    type="number"
                    step={5}
                    value={defaultEndPrayer.offsetMinutes}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value, 10) || 0;
                      const next = { ...defaultEndPrayer, offsetMinutes: mins };
                      setDefaultEndPrayer(next);
                      const updated = schedule.map((d) =>
                        d.isCustomTime ? d : { ...d, endPrayerOffset: next }
                      );
                      notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, next);
                    }}
                    className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-center font-mono"
                  />
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">دقيقة</span>
                </div>
              </div>

              {/* Quick adjustment buttons for end prayer */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[9px] text-slate-400 font-bold">ضبط سريع:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultEndPrayer, offsetMinutes: 0 };
                    setDefaultEndPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, endPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, next);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultEndPrayer.offsetMinutes === 0
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  على الموعد (0د)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultEndPrayer, offsetMinutes: -15 };
                    setDefaultEndPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, endPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, next);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultEndPrayer.offsetMinutes === -15
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  -15د
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultEndPrayer, offsetMinutes: -10 };
                    setDefaultEndPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, endPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, next);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultEndPrayer.offsetMinutes === -10
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  -10د
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...defaultEndPrayer, offsetMinutes: 10 };
                    setDefaultEndPrayer(next);
                    const updated = schedule.map((d) =>
                      d.isCustomTime ? d : { ...d, endPrayerOffset: next }
                    );
                    notifyParent(updated, timeType, defaultStart, defaultEnd, defaultStartPrayer, next);
                  }}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    defaultEndPrayer.offsetMinutes === 10
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  +10د
                </button>
              </div>

              <p className="text-[10px] text-emerald-800 font-bold">
                {defaultEndPrayer.offsetMinutes > 0 ? '+' : ''}
                {formatPrayerOffset(defaultEndPrayer)}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">وقت البداية</label>
              <input
                type="time"
                value={defaultStart}
                onChange={(e) => {
                  setDefaultStart(e.target.value);
                  const updated = schedule.map((d) =>
                    d.isCustomTime ? d : { ...d, startTime: e.target.value }
                  );
                  notifyParent(updated, timeType, e.target.value, defaultEnd, defaultStartPrayer, defaultEndPrayer);
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">وقت النهاية</label>
              <input
                type="time"
                value={defaultEnd}
                onChange={(e) => {
                  setDefaultEnd(e.target.value);
                  const updated = schedule.map((d) =>
                    d.isCustomTime ? d : { ...d, endTime: e.target.value }
                  );
                  notifyParent(updated, timeType, defaultStart, e.target.value, defaultStartPrayer, defaultEndPrayer);
                }}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>
        )}

        {/* Calculated preview banner for today */}
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>الموعد الفعلي المحسوب اليوم:</span>
          </div>
          <span className="font-bold text-emerald-800 font-mono">
            {sampleTimes.description} ({formatTime12Hour(sampleTimes.startTime)} - {formatTime12Hour(sampleTimes.endTime)})
          </span>
        </div>
      </div>

      {/* The 7 Days Matrix List */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          أيام الأسبوع وإمكانية تخصيص يوم منفرد:
        </label>

        <div className="grid grid-cols-1 gap-2">
          {schedule.map((day) => {
            const isToday = new Date().getDay() === day.dayOfWeek;
            const resolvedTimes = resolveDayScheduleTimes(day, prayerTimesToday);

            return (
              <div
                key={day.dayOfWeek}
                className={`rounded-xl border p-2.5 transition-all ${
                  day.isActive
                    ? day.isCustomTime
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-white border-slate-200'
                    : 'bg-slate-100/70 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Day Checkbox & Name */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={day.isActive}
                      onChange={() => handleToggleDayActive(day.dayOfWeek)}
                      className="rounded text-emerald-600 w-4 h-4"
                    />
                    <span className="font-black text-xs text-slate-900">{day.dayName}</span>
                    {isToday && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        اليوم
                      </span>
                    )}
                  </label>

                  {/* Right Side: Timing Display & Customization Button */}
                  <div className="flex items-center gap-2">
                    {day.isActive ? (
                      <>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {resolvedTimes.description} ({formatTime12Hour(resolvedTimes.startTime)} - {formatTime12Hour(resolvedTimes.endTime)})
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleCustomDay(day.dayOfWeek)}
                          className={`text-[10px] font-bold px-2 py-0.8 rounded-md border transition-colors cursor-pointer ${
                            day.isCustomTime
                              ? 'bg-amber-100 border-amber-300 text-amber-900'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {day.isCustomTime ? 'مخصص منفرد ✕' : 'تخصيص هذا اليوم'}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">غير نشط</span>
                    )}
                  </div>
                </div>

                {/* Day-specific custom editor (if custom override enabled) */}
                {day.isActive && day.isCustomTime && (
                  <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-amber-900 shrink-0">النوع:</span>
                      <select
                        value={day.timeType || timeType}
                        onChange={(e) =>
                          handleUpdateDay(day.dayOfWeek, { timeType: e.target.value as ScheduleTimeType })
                        }
                        className="text-xs font-bold px-2 py-1 rounded border border-slate-300"
                      >
                        <option value="prayer">مرتبط بالصلاة</option>
                        <option value="fixed">وقت ثابت</option>
                      </select>
                    </div>

                    {day.timeType === 'prayer' ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select
                          value={day.startPrayerOffset?.prayer || 'maghrib'}
                          onChange={(e) =>
                            handleUpdateDay(day.dayOfWeek, {
                              startPrayerOffset: {
                                prayer: e.target.value as PrayerReference,
                                offsetMinutes: day.startPrayerOffset?.offsetMinutes ?? 0,
                              },
                            })
                          }
                          className="text-xs px-1.5 py-1 rounded border border-slate-300"
                        >
                          <option value="fajr">الفجر</option>
                          <option value="dhuhr">الظهر</option>
                          <option value="asr">العصر</option>
                          <option value="maghrib">المغرب</option>
                          <option value="isha">العشاء</option>
                        </select>
                        <input
                          type="number"
                          value={day.startPrayerOffset?.offsetMinutes ?? 0}
                          onChange={(e) =>
                            handleUpdateDay(day.dayOfWeek, {
                              startPrayerOffset: {
                                prayer: day.startPrayerOffset?.prayer || 'maghrib',
                                offsetMinutes: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-14 text-xs px-1 py-1 rounded border border-slate-300 text-center font-mono"
                          placeholder="دقيقة"
                        />
                        <span className="text-[10px] text-slate-500">حتى</span>
                        <select
                          value={day.endPrayerOffset?.prayer || 'isha'}
                          onChange={(e) =>
                            handleUpdateDay(day.dayOfWeek, {
                              endPrayerOffset: {
                                prayer: e.target.value as PrayerReference,
                                offsetMinutes: day.endPrayerOffset?.offsetMinutes ?? 0,
                              },
                            })
                          }
                          className="text-xs px-1.5 py-1 rounded border border-slate-300"
                        >
                          <option value="dhuhr">الظهر</option>
                          <option value="asr">العصر</option>
                          <option value="maghrib">المغرب</option>
                          <option value="isha">العشاء</option>
                        </select>
                        <input
                          type="number"
                          value={day.endPrayerOffset?.offsetMinutes ?? 0}
                          onChange={(e) =>
                            handleUpdateDay(day.dayOfWeek, {
                              endPrayerOffset: {
                                prayer: day.endPrayerOffset?.prayer || 'isha',
                                offsetMinutes: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-14 text-xs px-1 py-1 rounded border border-slate-300 text-center font-mono"
                          placeholder="دقيقة"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={day.startTime || '16:00'}
                          onChange={(e) => handleUpdateDay(day.dayOfWeek, { startTime: e.target.value })}
                          className="text-xs px-2 py-1 rounded border border-slate-300 font-mono"
                        />
                        <span className="text-xs text-slate-400">-</span>
                        <input
                          type="time"
                          value={day.endTime || '18:00'}
                          onChange={(e) => handleUpdateDay(day.dayOfWeek, { endTime: e.target.value })}
                          className="text-xs px-2 py-1 rounded border border-slate-300 font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
