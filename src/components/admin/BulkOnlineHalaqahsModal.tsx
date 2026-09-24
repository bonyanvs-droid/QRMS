import React, { useState, useEffect } from 'react';
import { Video, Clock, Calendar, CheckSquare, Square, X, Link, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Halaqah, Teacher } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  halaqahs: Halaqah[];
  teachers: Teacher[];
  onSave: (
    selectedIds: string[],
    config: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      scheduleDays: number[];
      meetingUrl: string;
    }
  ) => Promise<void> | void;
}

const DAYS_OF_WEEK = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
];

export function BulkOnlineHalaqahsModal({
  isOpen,
  onClose,
  halaqahs,
  teachers,
  onSave,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');
  const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize selected halaqahs when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(halaqahs.map((h) => h.id));
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, halaqahs]);

  if (!isOpen) return null;

  const filteredHalaqahs = halaqahs.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.grade && h.grade.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isAllSelected = filteredHalaqahs.length > 0 && filteredHalaqahs.every((h) => selectedIds.includes(h.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect filtered
      const filteredIds = new Set(filteredHalaqahs.map((h) => h.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Select all filtered
      const newIds = new Set([...selectedIds, ...filteredHalaqahs.map((h) => h.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleHalaqah = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleDay = (dayId: number) => {
    setScheduleDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSave(selectedIds, {
        enabled,
        startTime,
        endTime,
        scheduleDays,
        meetingUrl: meetingUrl.trim(),
      });
      setSuccessMessage(`تم بنجاح تطبيق إعدادات التعليم عن بعد على ${selectedIds.length} حلقة!`);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-linear-to-r from-blue-50/70 via-indigo-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>تفعيل وتعيين الحلقات عن بعد (Online)</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  تعديل جماعي
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد الحلقات، وضبط المواعيد وأيام البث، وتطبيقها دفعة واحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 font-bold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Toggle Mode (Enable/Disable) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block font-bold text-slate-800 mb-2">حالة وضع التعليم عن بعد:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEnabled(true)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  enabled
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>تفعيل الحلقات عن بعد (Online)</span>
              </button>
              <button
                type="button"
                onClick={() => setEnabled(false)}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  !enabled
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
                <span>تعطيل الوضع عن بعد (إرجاع لحضورية)</span>
              </button>
            </div>
          </div>

          {/* 2. Time & Days Configuration (if enabled) */}
          {enabled && (
            <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>المواعيد والجدول الزمني للحلقات</span>
                </span>
                <button
                  type="button"
                  onClick={() => setScheduleDays([0, 1, 2, 3, 4])}
                  className="text-[11px] text-blue-700 hover:underline font-bold"
                >
                  أيام الدراسة الافتراضية (أحد - خميس)
                </button>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت البدء</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت الانتهاء</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">أيام البث الأسبوعية:</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = scheduleDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDay(d.id)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meeting URL (Optional) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  رابط الاجتماع الموحد (اختياري - Zoom / Meet / Teams):
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://meet.google.com/... أو https://zoom.us/..."
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <Link className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * إذا تركته فارغاً، ستحتفظ كل حلقة برابطها الخاص أو يضعه المعلم مباشرة من لوحته.
                </p>
              </div>
            </div>
          )}

          {/* 3. Halaqahs Selection List */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-bold text-slate-800">
                اختيار الحلقات المستهدفة ({selectedIds.length} من أصل {halaqahs.length}):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  {isAllSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>إلغاء تحديد الكل</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>تحديد كل الحلقات</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Search filter for halaqahs */}
            {halaqahs.length > 5 && (
              <input
                type="text"
                placeholder="بحث عن حلقة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs placeholder:text-slate-400"
              />
            )}

            {/* List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-xs">
              {filteredHalaqahs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">لا توجد حلقات مطابقة للبحث</div>
              ) : (
                filteredHalaqahs.map((h) => {
                  const isChecked = selectedIds.includes(h.id);
                  const teacher = teachers.find((t) => t.id === h.teacherId);
                  const isCurrentlyOnline = h.onlineConfig?.enabled;

                  return (
                    <label
                      key={h.id}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleHalaqah(h.id)}
                          className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{h.name}</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {h.grade || 'حلقة'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            المعلم: {teacher?.name || 'غير محدد'}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrentlyOnline ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            أونلاين حالياً ({h.onlineConfig?.startTime} - {h.onlineConfig?.endTime})
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            حضورياً
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={selectedIds.length === 0 || isSubmitting}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all ${
                selectedIds.length === 0 || isSubmitting
                  ? 'bg-slate-300 cursor-not-allowed'
                  : enabled
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              {isSubmitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    حفظ وتطبيق على ({selectedIds.length}) حلقة
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
