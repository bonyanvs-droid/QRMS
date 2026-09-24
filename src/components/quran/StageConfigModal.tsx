import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StageQuranConfig } from '../../quran/models/stageConfig';
import {
  X,
  Save,
  Sliders,
  CheckCircle2,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { getSurahsByDirection, getSurahAyahsCount } from '../../utils/quranMetadata';
import { QuranAyahSelect } from '../common/QuranAyahSelect';

interface StageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
  initialSelectedId?: string;
}

const ALL_DAYS = [
  { day: 0, label: 'الأحد' },
  { day: 1, label: 'الاثنين' },
  { day: 2, label: 'الثلاثاء' },
  { day: 3, label: 'الأربعاء' },
  { day: 4, label: 'الخميس' },
  { day: 5, label: 'الجمعة' },
  { day: 6, label: 'السبت' },
];

const createBlankConfig = (): StageQuranConfig => {
  const stamp = Date.now();
  return {
    id: `stage_custom_${stamp}`,
    name: '',
    code: `custom_${stamp.toString().slice(-4)}`,
    description: '',
    targetGrades: [],
    dailyPaceDescription: '',
    memorization: {
      unitType: 'line',
      defaultDailyAmount: 2,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 114, ayahNumber: 6 },
      paceDescription: 'سطران يومياً',
    },
    revision: {
      mode: 'pages',
      unitType: 'page',
      defaultDailyAmount: 1,
      defaultDailyPages: 1,
      defaultDirection: 'backward',
      defaultTargetStart: { surahNumber: 1, ayahNumber: 1 },
      defaultTargetEnd: { surahNumber: 114, ayahNumber: 6 },
      surahsPerDay: 2,
    },
    consolidationDays: 3,
    schedule: {
      workingDays: [0, 1, 2, 3], // Sun-Wed
    },
    defaultTermWeeks: 12,
    isActive: true,
  };
};

export const StageConfigModal: React.FC<StageConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  initialSelectedId,
}) => {
  const {
    quranStageConfigs,
    saveQuranStageConfig,
  } = useApp();

  const [editingConfig, setEditingConfig] = useState<StageQuranConfig | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialize or synchronize editing config when modal opens or initialSelectedId changes
  useEffect(() => {
    if (!isOpen) {
      setSavedSuccess(false);
      return;
    }

    if (initialSelectedId && initialSelectedId !== 'NEW') {
      const target = quranStageConfigs.find((c) => c.id === initialSelectedId);
      if (target) {
        setEditingConfig(JSON.parse(JSON.stringify(target)));
        setIsNewMode(false);
        return;
      }
    }

    // Otherwise, open in new template mode with a fresh blank template
    setEditingConfig(createBlankConfig());
    setIsNewMode(true);
  }, [isOpen, initialSelectedId, quranStageConfigs]);

  if (!isOpen || !editingConfig) return null;

  const handleSave = async () => {
    if (!editingConfig) return;
    if (!editingConfig.name.trim()) {
      alert('يرجى كتابة اسم نموذج المرحلة');
      return;
    }

    await saveQuranStageConfig(editingConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onConfigUpdated) onConfigUpdated();
      onClose();
    }, 600);
  };

  const toggleWorkingDay = (day: number) => {
    if (!editingConfig) return;
    const current = editingConfig.schedule.workingDays;
    const exists = current.includes(day);
    const updated = exists ? current.filter((d) => d !== day) : [...current, day].sort();
    if (updated.length === 0) {
      alert('يجب تحديد يوم دراسي واحد على الأقل.');
      return;
    }
    setEditingConfig({
      ...editingConfig,
      schedule: { workingDays: updated },
    });
  };

  const currentDirection = editingConfig.memorization.defaultDirection || 'backward';
  const surahsList = getSurahsByDirection(currentDirection);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/60 flex items-center justify-center border border-emerald-400/30 shadow-inner shrink-0">
              <Sliders className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                {isNewMode ? 'إضافة قالب خطة قرآنية' : 'تعديل قالب خطة قرآنية'}
              </h3>
              <p className="text-xs text-emerald-200/90 font-medium">
                {isNewMode
                  ? 'إعداد وتخصيص معايير الحفظ والمراجعة لنموذج مرحلي جديد'
                  : `تخصيص معايير وضوابط «${editingConfig.name || 'النموذج'}»`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. General Template Info */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  اسم نموذج المرحلة <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={editingConfig.name}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: مرحلة التمهيدي (روضة / تمهيدي)"
                  autoFocus={isNewMode}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  الرمز التعريفي (Code):
                </label>
                <input
                  type="text"
                  value={editingConfig.code}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, code: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: grade1_foundation"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">
                  الوصف التربوي والتعليمي للخطة:
                </label>
                <input
                  type="text"
                  value={editingConfig.description || ''}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثال: خطة حفظ تنازلي تبدأ بالفاتحة ثم من سورة الناس إلى سورة الفيل بمقدار آية إلى آيتين يومياً"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  الصفوف المستهدفة (مفصولة بفاصلة):
                </label>
                <input
                  type="text"
                  value={(editingConfig.targetGrades || []).join('، ')}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      targetGrades: e.target.value
                        .split(/[,،]/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800"
                  placeholder="مثال: تمهيدي، روضة"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  عدد أسابيع الفصل الدراسي الافتراضي:
                </label>
                <input
                  type="number"
                  min="4"
                  max="30"
                  value={editingConfig.defaultTermWeeks || 12}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      defaultTermWeeks: Number(e.target.value) || 12,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                />
              </div>
            </div>
          </div>

          {/* 2. Memorization Settings Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
              <BookOpen className="w-4 h-4 text-emerald-800" />
              <h4 className="font-black text-sm text-emerald-950">
                ضوابط ومقدار الحفظ الجديد الافتراضي (Memorization Engine Settings)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  الاتجاه الافتراضي للحفظ:
                </label>
                <select
                  value={editingConfig.memorization.defaultDirection}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      memorization: {
                        ...editingConfig.memorization,
                        defaultDirection: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-emerald-50/60 border border-emerald-300 text-slate-900 font-bold"
                >
                  <option value="backward">
                    تنازلي (الناس ← البقرة)
                  </option>
                  <option value="forward">
                    تصاعدي (البقرة ← الناس)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  وحدة الحفظ الافتراضية:
                </label>
                <select
                  value={editingConfig.memorization.unitType}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      memorization: {
                        ...editingConfig.memorization,
                        unitType: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                >
                  <option value="line">سطر مصحف (توزيع ذكي حسب أسطر المصحف)</option>
                  <option value="ayah">آية (عدد آيات رقمية محددة)</option>
                  <option value="quarter_page">ربع صفحة</option>
                  <option value="half_page">نصف صفحة</option>
                  <option value="page">صفحة كاملة</option>
                  <option value="quarter">ربع حزب</option>
                  <option value="surah">سورة كاملة</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  المقدار اليومي للحفظ:
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={editingConfig.memorization.defaultDailyAmount}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      memorization: {
                        ...editingConfig.memorization,
                        defaultDailyAmount: Number(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-black text-sm"
                />
              </div>
            </div>

            {/* Start and End Verses Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
              {/* Start Surah & Ayah */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-black text-slate-800 block">
                  📍 نقطة بداية الحفظ الافتراضية:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">السورة:</label>
                    <select
                      value={editingConfig.memorization.defaultTargetStart.surahNumber}
                      onChange={(e) =>
                        setEditingConfig({
                          ...editingConfig,
                          memorization: {
                            ...editingConfig.memorization,
                            defaultTargetStart: {
                              surahNumber: Number(e.target.value),
                              ayahNumber: 1,
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                    >
                      {surahsList.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">الآية:</label>
                    <QuranAyahSelect
                      surah={editingConfig.memorization.defaultTargetStart.surahNumber}
                      value={editingConfig.memorization.defaultTargetStart.ayahNumber}
                      onChange={(ayah) =>
                        setEditingConfig({
                          ...editingConfig,
                          memorization: {
                            ...editingConfig.memorization,
                            defaultTargetStart: {
                              ...editingConfig.memorization.defaultTargetStart,
                              ayahNumber: ayah,
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* End Surah & Ayah */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-black text-slate-800 block">
                  🏁 نقطة نهاية الحفظ (المستهدف النهائي):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">السورة:</label>
                    <select
                      value={editingConfig.memorization.defaultTargetEnd.surahNumber}
                      onChange={(e) => {
                        const surahNum = Number(e.target.value);
                        const maxA = getSurahAyahsCount(surahNum);
                        setEditingConfig({
                          ...editingConfig,
                          memorization: {
                            ...editingConfig.memorization,
                            defaultTargetEnd: {
                              surahNumber: surahNum,
                              ayahNumber: maxA,
                            },
                          },
                        });
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                    >
                      {surahsList.map((s) => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-0.5">الآية:</label>
                    <QuranAyahSelect
                      surah={editingConfig.memorization.defaultTargetEnd.surahNumber}
                      value={editingConfig.memorization.defaultTargetEnd.ayahNumber}
                      onChange={(ayah) =>
                        setEditingConfig({
                          ...editingConfig,
                          memorization: {
                            ...editingConfig.memorization,
                            defaultTargetEnd: {
                              ...editingConfig.memorization.defaultTargetEnd,
                              ayahNumber: ayah,
                            },
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Revision & Schedule Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h4 className="font-black text-sm text-slate-900">
                ضوابط المراجعة وأيام التسميع الأسبوعية
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  نظام المراجعة الافتراضي:
                </label>
                <select
                  value={editingConfig.revision.mode}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      revision: {
                        ...editingConfig.revision,
                        mode: e.target.value as any,
                        // Keep unitType consistent with mode so stored templates
                        // never carry the pages/surah contradiction again
                        unitType: e.target.value === 'surahs' ? 'surah' : 'page',
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                >
                  <option value="lines">مراجعة بالسطور (سطور مصحف المدينة)</option>
                  <option value="ayahs">مراجعة بالآيات</option>
                  <option value="pages">مراجعة بالصفحات (نظام معتمد)</option>
                  <option value="surahs">مراجعة بالسور (مثل سورتين يومياً)</option>
                  <option value="quarters">مراجعة بالأرباع</option>
                  <option value="hizb">مراجعة بالأحزاب</option>
                  <option value="juz">مراجعة بالأجزاء</option>
                </select>
              </div>

              {editingConfig.revision.mode === 'lines' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    مقدار المراجعة اليومية (سطور مصحف المدينة):
                  </label>
                  <select
                    value={editingConfig.revision.defaultDailyAmount ?? 1}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        revision: {
                          ...editingConfig.revision,
                          defaultDailyAmount: parseInt(e.target.value, 10) || 1,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-300 text-slate-900 font-black"
                  >
                    <option value="1">سطر واحد (1)</option>
                    <option value="2">سطران (2)</option>
                    <option value="3">3 أسطر</option>
                    <option value="5">5 أسطر</option>
                    <option value="7">نصف صفحة (قرابة 7 أسطر)</option>
                    <option value="15">صفحة كاملة (15 سطراً)</option>
                    <option value="30">صفحتان (30 سطراً)</option>
                  </select>
                </div>
              ) : editingConfig.revision.mode === 'ayahs' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    مقدار المراجعة اليومية (آيات):
                  </label>
                  <select
                    value={editingConfig.revision.defaultDailyAmount ?? 1}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        revision: {
                          ...editingConfig.revision,
                          defaultDailyAmount: parseInt(e.target.value, 10) || 1,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-300 text-slate-900 font-black"
                  >
                    <option value="1">آية واحدة (1)</option>
                    <option value="2">آيتان (2)</option>
                    <option value="3">3 آيات</option>
                    <option value="5">5 آيات</option>
                    <option value="10">10 آيات</option>
                    <option value="15">15 آية</option>
                  </select>
                </div>
              ) : editingConfig.revision.mode === 'surahs' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    مقدار المراجعة اليومية (سور):
                  </label>
                  <select
                    value={editingConfig.revision.surahsPerDay ?? 2}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        revision: {
                          ...editingConfig.revision,
                          surahsPerDay: parseInt(e.target.value, 10) || 1,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-300 text-slate-900 font-black"
                  >
                    <option value="1">سورة واحدة (1)</option>
                    <option value="2">سورتان (2)</option>
                    <option value="3">3 سور</option>
                    <option value="4">4 سور</option>
                    <option value="5">5 سور</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    مقدار المراجعة اليومية (صفحات):
                  </label>
                  <select
                    value={editingConfig.revision.defaultDailyPages ?? 1}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        revision: {
                          ...editingConfig.revision,
                          defaultDailyPages: parseFloat(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-300 text-slate-900 font-black"
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
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  اتجاه المراجعة:
                </label>
                <select
                  value={editingConfig.revision.defaultDirection || 'backward'}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      revision: {
                        ...editingConfig.revision,
                        defaultDirection: e.target.value as 'forward' | 'backward',
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                >
                  <option value="backward">مراجعة معكوسة (الأحدث حفظاً أولاً)</option>
                  <option value="forward">مع اتجاه الحفظ (من الأقدم للأحدث)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  أيام تثبيت السورة المنتهية:
                </label>
                <select
                  value={editingConfig.consolidationDays !== undefined ? editingConfig.consolidationDays : 3}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      consolidationDays: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold"
                >
                  <option value="3">3 أيام متتالية (المعيار التربوي المعتمد)</option>
                  <option value="2">يومان</option>
                  <option value="1">يوم واحد</option>
                  <option value="0">بدون أيام تثبيت</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">
                    أيام التسميع الأسبوعية المعتمدة:
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingConfig({
                        ...editingConfig,
                        schedule: { workingDays: [0, 1, 2, 3] },
                      })
                    }
                    className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                    title="تطبيق الأحد إلى الأربعاء (4 أيام)"
                  >
                    (الأحد - الأربعاء)
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {ALL_DAYS.map((d) => {
                    const isSelected = editingConfig.schedule.workingDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => toggleWorkingDay(d.day)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>تم حفظ النموذج بنجاح!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isNewMode ? 'حفظ النموذج الجديد' : 'حفظ التعديلات في القالب'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

