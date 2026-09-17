import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Calendar,
  BookOpen,
  Sparkles,
  Layers,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  RefreshCw,
  Copy,
  Check,
  FileSpreadsheet,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { StageQuranConfig } from '../../quran/models/stageConfig';
import { QuranService } from '../../quran/services/quranService';
import { PlanningUnit } from '../../quran/types';
import { getSurahArabicName } from '../../quran/utils/positionFormatter';

interface TemplatePlanPreviewModalProps {
  config: StageQuranConfig;
  isOpen: boolean;
  onClose: () => void;
}

interface CalculatedDayRow {
  dayIndex: number;
  weekNumber: number;
  dayOfWeekName: string;
  dayOfWeekIndex: number;
  unit: PlanningUnit;
  startSurahName: string;
  startAyah: number;
  endSurahName: string;
  endAyah: number;
  totalAyahs: number;
  displayLabel: string;
  pageInfo?: string;
  suggestedRevision: string;
  cumulativeAyahs: number;
  progressPercent: number;
}

const ARABIC_DAYS_MAP: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

export const TemplatePlanPreviewModal: React.FC<TemplatePlanPreviewModalProps> = ({
  config,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dayRows, setDayRows] = useState<CalculatedDayRow[]>([]);
  const [totalTargetAyahs, setTotalTargetAyahs] = useState<number>(0);
  const [totalSurahsCount, setTotalSurahsCount] = useState<number>(0);
  const [surahsList, setSurahsList] = useState<string[]>([]);

  // Filtering & View Controls
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'weekly_cards'>('table');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [showSurahsDetail, setShowSurahsDetail] = useState<boolean>(false);
  const [showPrintView, setShowPrintView] = useState<boolean>(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  // Dynamic simulation tweaks within preview (without altering saved config)
  const [simDailyAmount, setSimDailyAmount] = useState<number>(
    config.memorization.defaultDailyAmount || 1
  );
  const [simRevisionPages, setSimRevisionPages] = useState<number>(
    config.revision?.defaultDailyPages || 1
  );
  const [simConsolidationDays, setSimConsolidationDays] = useState<number>(
    config.consolidationDays !== undefined ? config.consolidationDays : 3
  );
  const [simUnitType, setSimUnitType] = useState<string>(
    config.memorization.unitType || 'ayah'
  );
  const [simWorkingDays, setSimWorkingDays] = useState<number[]>(
    config.schedule?.workingDays || [0, 1, 2, 3]
  );
  const [showSimControls, setShowSimControls] = useState<boolean>(false);

  // Sync state when config prop changes
  useEffect(() => {
    if (config) {
      setSimDailyAmount(config.memorization.defaultDailyAmount || 1);
      setSimRevisionPages(config.revision?.defaultDailyPages || 1);
      setSimConsolidationDays(config.consolidationDays !== undefined ? config.consolidationDays : 3);
      setSimUnitType(config.memorization.unitType || 'ayah');
      setSimWorkingDays(config.schedule?.workingDays || [0, 1, 2, 3]);
      setSelectedWeekFilter('all');
      setSearchQuery('');
      setShowPrintView(false);
      setPrintFeedback(null);
    }
  }, [config]);

  // Compute plan items whenever config or simulation parameters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const calculatePlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const quranService = QuranService.getInstance();
        const startPos = config.memorization.defaultTargetStart || { surahNumber: 1, ayahNumber: 1 };
        const endPos = config.memorization.defaultTargetEnd || { surahNumber: 114, ayahNumber: 6 };
        const direction = config.memorization.defaultDirection || 'backward';

        // 1. Get all verses in range
        const verses = await quranService
          .getProvider()
          .getAyahsInRange(startPos, endPos, direction);

        if (!verses || verses.length === 0) {
          throw new Error('لم يتم العثور على آيات في النطاق المحدد لهذا القالب.');
        }

        // Distinct surahs in range
        const surahSet = new Set<number>();
        verses.forEach((v) => surahSet.add(v.surahNumber));
        const distinctSurahNames = Array.from(surahSet).map((sNum) => getSurahArabicName(sNum));

        // 2. Partition into units using Surah-isolated cumulative pacing + 3-day consolidation + independent revision
        const units = await quranService
          .getRangeCalculator()
          .partitionSurahsWithCumulativePaceAndConsolidation(
            startPos,
            endPos,
            simUnitType as any,
            simDailyAmount,
            direction,
            simConsolidationDays,
            simRevisionPages
          );

        if (!units || units.length === 0) {
          throw new Error('تعذر تقسيم النطاق إلى وحدات حفظ يومية.');
        }

        // 3. Map units to days according to working days schedule
        const activeWorkingDays = simWorkingDays.length > 0 ? simWorkingDays : [0, 1, 2, 3];
        const rows: CalculatedDayRow[] = [];
        let cumulativeAyahs = 0;
        const totalAyahs = verses.length;

        units.forEach((unit, idx) => {
          cumulativeAyahs += unit.totalAyahs;
          const dayIndex = idx + 1;
          const weekNumber = Math.floor(idx / activeWorkingDays.length) + 1;
          const dayInWeekOffset = idx % activeWorkingDays.length;
          const dayOfWeekIndex = activeWorkingDays[dayInWeekOffset];
          const dayOfWeekName = ARABIC_DAYS_MAP[dayOfWeekIndex] || 'يوم دراسي';

          const startSurahName = getSurahArabicName(unit.start.surahNumber);
          const endSurahName = getSurahArabicName(unit.end.surahNumber);

          // Suggested revision
          const suggestedRevision = unit.revisionDisplay || `مراجعة: ${simRevisionPages} صفحات`;

          let pageInfo: string | undefined = undefined;
          if (unit.pageStart && unit.pageEnd) {
            pageInfo =
              unit.pageStart === unit.pageEnd
                ? `ص ${unit.pageStart}`
                : `ص ${unit.pageStart}-${unit.pageEnd}`;
          }

          rows.push({
            dayIndex,
            weekNumber,
            dayOfWeekName,
            dayOfWeekIndex,
            unit,
            startSurahName,
            startAyah: unit.start.ayahNumber,
            endSurahName,
            endAyah: unit.end.ayahNumber,
            totalAyahs: unit.totalAyahs,
            displayLabel: unit.displayLabel,
            pageInfo,
            suggestedRevision,
            cumulativeAyahs,
            progressPercent: Math.min(100, Math.round((cumulativeAyahs / totalAyahs) * 100)),
          });
        });

        if (isMounted) {
          setDayRows(rows);
          setTotalTargetAyahs(totalAyahs);
          setTotalSurahsCount(distinctSurahNames.length);
          setSurahsList(distinctSurahNames);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'حدث خطأ أثناء معالجة معاينة الخطة.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    calculatePlan();

    return () => {
      isMounted = false;
    };
  }, [isOpen, config, simDailyAmount, simRevisionPages, simConsolidationDays, simUnitType, simWorkingDays]);

  // Derived metrics
  const totalDaysCount = dayRows.length;
  const daysPerWeek = simWorkingDays.length || 4;
  const totalWeeksCount = Math.ceil(totalDaysCount / daysPerWeek) || 1;

  // Filtered rows
  const filteredRows = useMemo(() => {
    return dayRows.filter((row) => {
      if (selectedWeekFilter !== 'all') {
        const targetWeek = parseInt(selectedWeekFilter, 10);
        if (row.weekNumber !== targetWeek) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesSurah =
          row.startSurahName.toLowerCase().includes(q) ||
          row.endSurahName.toLowerCase().includes(q) ||
          row.displayLabel.toLowerCase().includes(q) ||
          `يوم ${row.dayIndex}`.includes(q) ||
          `أسبوع ${row.weekNumber}`.includes(q);
        if (!matchesSurah) return false;
      }
      return true;
    });
  }, [dayRows, selectedWeekFilter, searchQuery]);

  // Grouped by week for the Bento Card view
  const weeklyGroups = useMemo(() => {
    const groups: {
      weekNumber: number;
      days: CalculatedDayRow[];
      startPosition: string;
      endPosition: string;
      totalAyahs: number;
    }[] = [];

    const weekMap = new Map<number, CalculatedDayRow[]>();
    filteredRows.forEach((r) => {
      const list = weekMap.get(r.weekNumber) || [];
      list.push(r);
      weekMap.set(r.weekNumber, list);
    });

    Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([wNum, days]) => {
        const first = days[0];
        const last = days[days.length - 1];
        const totalAyahs = days.reduce((sum, d) => sum + d.totalAyahs, 0);
        groups.push({
          weekNumber: wNum,
          days,
          startPosition: `${first.startSurahName} (${first.startAyah})`,
          endPosition: `${last.endSurahName} (${last.endAyah})`,
          totalAyahs,
        });
      });

    return groups;
  }, [filteredRows]);

  // Format unit label
  const unitLabel = useMemo(() => {
    switch (simUnitType) {
      case 'line':
      case 'lines':
        return simDailyAmount === 1 ? 'سطر مصحف' : `${simDailyAmount} أسطر مصحف`;
      case 'ayah':
      case 'ayahs':
        return simDailyAmount === 1 ? 'آية' : `${simDailyAmount} آيات`;
      case 'half_page':
        return 'نصف صفحة';
      case 'page':
      case 'pages':
        return 'صفحة كاملة';
      case 'surah':
        return 'سورة';
      default:
        return `${simDailyAmount} ${simUnitType}`;
    }
  }, [simDailyAmount, simUnitType]);

  // Copy plan summary to clipboard
  const handleCopySummary = () => {
    if (dayRows.length === 0) return;
    const lines = [
      `🕋 خطة القالب القرآني: ${config.name} (${config.code})`,
      `🎯 الاتجاه: ${config.memorization.defaultDirection === 'backward' ? 'تنازلي (من الناس للبقرة)' : 'تصاعدي (من الفاتحة للناس)'}`,
      `📊 الإجمالي: ${totalDaysCount} يوماً (${totalWeeksCount} أسبوعاً) | ${totalTargetAyahs} آية | ${totalSurahsCount} سورة`,
      `⏱️ الوتيرة: ${unitLabel} يومياً | ${daysPerWeek} أيام أسبوعياً`,
      `=========================================`,
      ...dayRows.map(
        (r) =>
          `• اليوم ${r.dayIndex} (${r.dayOfWeekName} - أسبوع ${r.weekNumber}): من [${r.startSurahName} آية ${r.startAyah}] إلى [${r.endSurahName} آية ${r.endAyah}] (${r.totalAyahs} آية) ${r.pageInfo ? `[${r.pageInfo}]` : ''}`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Generate complete HTML string for standalone printing / downloading
  const generatePrintableHtml = () => {
    const tableRowsHtml = dayRows
      .map((r, idx) => {
        const isNewWeek = idx === 0 || r.weekNumber !== dayRows[idx - 1].weekNumber;
        return `
          ${
            isNewWeek
              ? `<tr style="background-color: #ecfdf5; font-weight: bold; color: #065f46;">
                  <td colspan="6" style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 12px;">
                    🌿 الأسبوع ${r.weekNumber}
                  </td>
                 </tr>`
              : ''
          }
          <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #fafafa;' : ''}">
            <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: bold;">${r.dayIndex}</td>
            <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 600;">${r.dayOfWeekName}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #064e3b;">
              من ${r.startSurahName} (${r.startAyah}) إلى ${r.endSurahName} (${r.endAyah})
            </td>
            <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1;">${r.totalAyahs} آية</td>
            <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1;">${r.pageInfo || '-'}</td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px; color: #475569;">${r.suggestedRevision}</td>
          </tr>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>خطة توزيع المنهج القرآني - ${config.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Naskh Arabic', sans-serif;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 16px;
      direction: rtl;
      font-size: 12px;
    }
    .print-bar {
      background: #064e3b;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #10b981;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
    }
    .header-box {
      border: 2px solid #065f46;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 14px;
      background-color: #f0fdf4;
    }
    .header-title {
      font-size: 18px;
      font-weight: 900;
      color: #064e3b;
      margin: 0 0 6px 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      font-size: 11px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #6ee7b7;
    }
    .meta-item {
      background: #fff;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #d1fae5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 11px;
    }
    th {
      background-color: #064e3b;
      color: #ffffff;
      padding: 8px 10px;
      border: 1px solid #064e3b;
      text-align: right;
      font-weight: bold;
    }
    th.text-center {
      text-align: center;
    }
    tr {
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 18px;
      text-align: center;
      font-size: 10px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span style="font-weight: bold;">🖨️ وثيقة خطة المنهج القرآني جاهزة للطباعة أو الحفظ كـ PDF</span>
    <button class="print-btn" onclick="window.print()">طباعة الآن (Ctrl + P)</button>
  </div>

  <div class="header-box">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1 class="header-title">🕋 وثيقة توزيع الخطة القرآنية المعيارية</h1>
        <div style="font-weight: bold; font-size: 14px; color: #047857;">${config.name} (${config.code})</div>
      </div>
      <div style="text-align: left; font-size: 11px; color: #475569;">
        <div>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</div>
        <div>الاتجاه: ${config.memorization.defaultDirection === 'backward' ? 'تنازلي (من الناس للبقرة)' : 'تصاعدي (من الفاتحة للناس)'}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><strong>إجمالي الأيام:</strong> ${totalDaysCount} يوماً</div>
      <div class="meta-item"><strong>المدة التقديرية:</strong> ${totalWeeksCount} أسبوعاً</div>
      <div class="meta-item"><strong>إجمالي الآيات:</strong> ${totalTargetAyahs} آية (${totalSurahsCount} سورة)</div>
      <div class="meta-item"><strong>معدل التسميع:</strong> ${unitLabel}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 45px;">اليوم</th>
        <th class="text-center" style="width: 70px;">يوم الأسبوع</th>
        <th>نطاق الحفظ اليومي المقرر (الورد الجديد)</th>
        <th class="text-center" style="width: 65px;">المقدار</th>
        <th class="text-center" style="width: 60px;">الصفحة</th>
        <th>المراجعة والربط المقترح</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="footer">
    تم توليد هذا المنهج آلياً عبر نظام إدارة المناهج القرآنية • نموذج استرشادي قابل للتخصيص الفردي لكل طالب
  </div>
</body>
</html>`;
  };

  // Download printable HTML document directly
  const handleDownloadPrintHtml = () => {
    if (dayRows.length === 0) return;
    const html = generatePrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `خطة_${config.code || 'القرآن'}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPrintFeedback('تم تنزيل ملف الطباعة بنجاح! يمكنك فتحه وطباعته أو حفظه PDF فوراً.');
    setTimeout(() => setPrintFeedback(null), 5000);
  };

  // Robust Printing Trigger: tries opening a printable tab / iframe, with in-modal print view fallback
  const handlePrint = () => {
    if (dayRows.length === 0) return;

    try {
      // 1. Try opening new window / tab with blob URL
      const html = generatePrintableHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (_) {}
        }, 500);
        return;
      }
    } catch (e) {
      console.warn('Popup blocked or sandboxed, falling back to in-app print view', e);
    }

    // 2. If blocked by iframe sandbox, show in-app full print view mode
    setShowPrintView(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] transition-all">
        
        {/* ========================================================================= */}
        {/* PRINT FEEDBACK TOAST NOTIFICATION */}
        {/* ========================================================================= */}
        {printFeedback && (
          <div className="bg-emerald-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-fadeIn shrink-0">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{printFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrintFeedback(null)}
              className="text-emerald-200 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. COMPACT SLIM HEADER */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-3 sm:p-4 relative shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Title & Badges */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-black text-white truncate">
                    {config.name}
                  </h2>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-emerald-200 font-bold text-[10px] border border-emerald-400/30">
                    {config.code}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                    {config.memorization.defaultDirection === 'backward' ? (
                      <>
                        <ArrowDownLeft className="w-3 h-3 text-amber-300" />
                        <span>تنازلي</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-emerald-300" />
                        <span>تصاعدي</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-200/80 truncate hidden sm:block">
                  {config.description || 'توزيع منهجي محكم لآيات وسور الورد اليومي'}
                </p>
              </div>
            </div>

            {/* Compact Action Icons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowSimControls(!showSimControls)}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                  showSimControls
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="تعديل وتجربة المقادير بالمحاكي"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden md:inline">المحاكي</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-white/20"
                title="نسخ الخطة كنص"
              >
                {copiedNotification ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden md:inline">{copiedNotification ? 'تم النسخ' : 'نسخ'}</span>
              </button>

              {/* Print / Export Actions */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer border border-emerald-400/40"
                title="طباعة الخطة القرآنية"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPrintHtml}
                disabled={loading}
                className="p-1.5 rounded-xl bg-teal-700/80 hover:bg-teal-600 text-white transition-colors cursor-pointer border border-teal-500/40"
                title="تنزيل وثيقة الطباعة كملف HTML / PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsible Simulation Drawer */}
          {showSimControls && (
            <div className="mt-2.5 pt-2.5 border-t border-emerald-800/60 bg-emerald-950/80 -mx-3 -mb-3 sm:-mx-4 sm:-mb-4 p-3 text-slate-100 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>محاكاة وتجربة الوتيرة (لا تغيّر القالب المخزن):</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSimDailyAmount(config.memorization.defaultDailyAmount || 1);
                    setSimRevisionPages(config.revision?.defaultDailyPages || 1);
                    setSimConsolidationDays(config.consolidationDays !== undefined ? config.consolidationDays : 3);
                    setSimUnitType(config.memorization.unitType || 'ayah');
                    setSimWorkingDays(config.schedule?.workingDays || [0, 1, 2, 3]);
                  }}
                  className="text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>إعادة ضبط</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-emerald-200 block mb-0.5">
                    وحدة الحفظ:
                  </label>
                  <select
                    value={simUnitType}
                    onChange={(e) => setSimUnitType(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-2 py-1 text-white font-medium text-xs focus:ring-1 focus:ring-emerald-400 outline-none"
                  >
                    <option value="ayah">آيات محددة</option>
                    <option value="line">سطر مصحف</option>
                    <option value="quarter_page">ربع صفحة</option>
                    <option value="half_page">نصف صفحة</option>
                    <option value="page">صفحة كاملة</option>
                    <option value="surah">سورة كاملة</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-200 block mb-0.5">
                    مقدار الحفظ اليومي:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={simDailyAmount}
                    onChange={(e) => setSimDailyAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-2 py-1 text-white font-bold text-xs focus:ring-1 focus:ring-emerald-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-200 block mb-0.5">
                    المراجعة اليومية (صفحات):
                  </label>
                  <select
                    value={simRevisionPages}
                    onChange={(e) => setSimRevisionPages(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-2 py-1 text-white font-bold text-xs focus:ring-1 focus:ring-emerald-400 outline-none"
                  >
                    <option value="0.5">نصف صفحة (0.5)</option>
                    <option value="1">صفحة واحدة (1)</option>
                    <option value="2">صفحتان (2)</option>
                    <option value="3">3 صفحات</option>
                    <option value="4">4 صفحات</option>
                    <option value="5">5 صفحات</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-200 block mb-0.5">
                    أيام تثبيت السورة:
                  </label>
                  <select
                    value={simConsolidationDays}
                    onChange={(e) => setSimConsolidationDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-emerald-700/60 rounded-lg px-2 py-1 text-white font-bold text-xs focus:ring-1 focus:ring-emerald-400 outline-none"
                  >
                    <option value="3">3 أيام (المعيار التربوي)</option>
                    <option value="2">يومان</option>
                    <option value="1">يوم واحد</option>
                    <option value="0">بدون أيام تثبيت</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-emerald-200 block mb-0.5">
                    أيام التسميع:
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      { idx: 0, label: 'أحد' },
                      { idx: 1, label: 'اثنين' },
                      { idx: 2, label: 'ثلاثاء' },
                      { idx: 3, label: 'أربعاء' },
                      { idx: 4, label: 'خميس' },
                    ].map((d) => {
                      const isChecked = simWorkingDays.includes(d.idx);
                      return (
                        <button
                          key={d.idx}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              if (simWorkingDays.length > 1) {
                                setSimWorkingDays(simWorkingDays.filter((i) => i !== d.idx));
                              }
                            } else {
                              setSimWorkingDays([...simWorkingDays, d.idx].sort());
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
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
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. COMPACT EXECUTIVE SUMMARY STRIP (Single Slim Row) */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Highlights in one compact horizontal flex */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap text-xs text-slate-700 font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs font-bold text-emerald-950 text-[11px]">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>{totalDaysCount} يوماً</span>
                <span className="text-slate-400 font-normal">({totalWeeksCount} أسبوعاً)</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs font-bold text-amber-950 text-[11px]">
                <BookOpen className="w-3 h-3 text-amber-600" />
                <span>{totalTargetAyahs} آية</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs font-bold text-purple-950 text-[11px]">
                <Layers className="w-3 h-3 text-purple-600" />
                <span>{totalSurahsCount} سورة</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 shadow-2xs font-bold text-teal-950 text-[11px]">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>{unitLabel} يومياً</span>
              </span>

              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500">
                ({daysPerWeek} أيام أسبوعياً)
              </span>
            </div>

            {/* Toggle Surahs details button */}
            {surahsList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSurahsDetail(!showSurahsDetail)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <span>السور ({totalSurahsCount})</span>
                {showSurahsDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Surah List Chips (Only when expanded) */}
          {showSurahsDetail && surahsList.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center gap-1 flex-wrap max-h-20 overflow-y-auto animate-fadeIn">
              {surahsList.map((sName, sIdx) => (
                <span
                  key={sIdx}
                  className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[10px]"
                >
                  {sName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. COMPACT TOOLBAR & FILTER CONTROLS */}
        {/* ========================================================================= */}
        <div className="p-2 sm:p-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بسورة، آية، أو يوم..."
                className="w-full pl-2.5 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Week Dropdown Filter */}
            <div className="shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedWeekFilter}
                onChange={(e) => setSelectedWeekFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">كل الأسابيع ({totalWeeksCount})</option>
                {Array.from({ length: totalWeeksCount }).map((_, i) => (
                  <option key={i + 1} value={`${i + 1}`}>
                    أسبوع {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowPrintView(false);
                setViewMode('table');
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'table' && !showPrintView
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>جدول</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPrintView(false);
                setViewMode('weekly_cards');
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'weekly_cards' && !showPrintView
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrintView(true)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                showPrintView
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-950'
              }`}
              title="عرض وثيقة الطباعة الرسمية"
            >
              <Printer className="w-3 h-3" />
              <span>معاينة الطباعة</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. CONTENT BODY (Responsive Table / Cards / Print View) */}
        {/* ========================================================================= */}
        <div className="p-2 sm:p-4 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-600">
                جاري احتساب وتوزيع آيات الخطة القرآنية وفق إعدادات القالب...
              </p>
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : showPrintView ? (
            /* ======================================================= */
            /* IN-APP PRINT VIEW (Guaranteed to work in iframe) */
            /* ======================================================= */
            <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-emerald-800 shadow-md space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-200 flex-wrap bg-emerald-50 -m-4 sm:-m-6 p-4 sm:p-6 rounded-t-2xl mb-4">
                <div>
                  <h3 className="font-black text-base sm:text-lg text-emerald-950 flex items-center gap-1.5">
                    <Printer className="w-5 h-5 text-emerald-700" />
                    <span>وثيقة خطة التوزيع القرآني الرسمية</span>
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">
                    جاهزة للطباعة أو الحفظ كملف PDF
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPrintHtml}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل كملف HTML للطباعة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.print();
                      } catch (_) {
                        handleDownloadPrintHtml();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-emerald-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>طباعة (Ctrl+P)</span>
                  </button>
                </div>
              </div>

              {/* Printable Content Frame */}
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div><strong>القالب:</strong> {config.name} ({config.code})</div>
                  <div><strong>إجمالي الأيام:</strong> {totalDaysCount} يوماً</div>
                  <div><strong>المدة:</strong> {totalWeeksCount} أسبوعاً</div>
                  <div><strong>إجمالي الآيات:</strong> {totalTargetAyahs} آية</div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-950 text-white font-bold">
                        <th className="p-2 text-center w-12 border border-emerald-900">#</th>
                        <th className="p-2 text-center w-20 border border-emerald-900">اليوم</th>
                        <th className="p-2 border border-emerald-900">نطاق الحفظ اليومي</th>
                        <th className="p-2 text-center w-16 border border-emerald-900">المقدار</th>
                        <th className="p-2 text-center w-16 border border-emerald-900">الصفحة</th>
                        <th className="p-2 border border-emerald-900">المراجعة والربط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dayRows.map((r, idx) => {
                        const isNewWeek = idx === 0 || r.weekNumber !== dayRows[idx - 1].weekNumber;
                        return (
                          <React.Fragment key={r.dayIndex}>
                            {isNewWeek && (
                              <tr className="bg-emerald-50 text-emerald-950 font-black">
                                <td colSpan={6} className="px-3 py-1.5 text-xs border border-emerald-200">
                                  🌿 الأسبوع {r.weekNumber}
                                </td>
                              </tr>
                            )}
                            <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="p-2 text-center font-bold border border-slate-200">{r.dayIndex}</td>
                              <td className="p-2 text-center border border-slate-200">{r.dayOfWeekName}</td>
                              <td className="p-2 font-bold text-emerald-950 border border-slate-200">
                                من {r.startSurahName} ({r.startAyah}) إلى {r.endSurahName} ({r.endAyah})
                              </td>
                              <td className="p-2 text-center border border-slate-200">{r.totalAyahs} آية</td>
                              <td className="p-2 text-center border border-slate-200">{r.pageInfo || '-'}</td>
                              <td className="p-2 text-[11px] text-slate-600 border border-slate-200">{r.suggestedRevision}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              لا توجد نتائج تطابق معايير البحث أو التصفية المختارة.
            </div>
          ) : viewMode === 'table' ? (
            /* ======================================================= */
            /* TABLE VIEW (FULLY RESPONSIVE: CARDS ON MOBILE, TABLE ON DESKTOP) */
            /* ======================================================= */
            <div>
              {/* MOBILE TABLE LAYOUT (< 640px) - Crystal clear, no squished columns */}
              <div className="sm:hidden space-y-2.5">
                {filteredRows.map((row, idx) => {
                  const isNewWeekStart =
                    idx === 0 || row.weekNumber !== filteredRows[idx - 1].weekNumber;
                  return (
                    <React.Fragment key={row.dayIndex}>
                      {isNewWeekStart && (
                        <div className="bg-emerald-900 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center justify-between shadow-2xs mt-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>الأسبوع {row.weekNumber}</span>
                          </span>
                        </div>
                      )}

                      <div className={`p-3 rounded-xl border shadow-2xs space-y-2 ${
                        row.unit.isConsolidation
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}>
                        {/* Day Header Row */}
                        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-[11px] shrink-0 border ${
                              row.unit.isConsolidation
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-emerald-100 text-emerald-950 border-emerald-200'
                            }`}>
                              {row.dayIndex}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {row.dayOfWeekName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              (أسبوع {row.weekNumber})
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {row.unit.isConsolidation ? (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md font-black text-[10px] shadow-2xs">
                                تثبيت {row.unit.consolidationDayIndex}/3
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px] border border-emerald-200">
                                {row.totalAyahs} {row.totalAyahs === 1 ? 'آية' : 'آيات'}
                              </span>
                            )}
                            {row.pageInfo && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[10px]">
                                {row.pageInfo}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Range Row */}
                        <div className={`p-2 rounded-lg border flex items-center justify-between gap-1 text-xs ${
                          row.unit.isConsolidation
                            ? 'bg-emerald-100/60 border-emerald-200 text-emerald-950 font-bold'
                            : 'bg-emerald-50/60 border-emerald-100 text-emerald-950 font-bold'
                        }`}>
                          {row.unit.isConsolidation ? (
                            <div className="flex items-center gap-1 text-[11px] font-black text-emerald-900">
                              <span>🌿 تثبيت سورة {row.startSurahName} كاملة (1 - {row.endAyah})</span>
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-emerald-950 text-[11px]">
                                سورة {row.startSurahName} (1)
                              </span>
                              <span className="text-emerald-500 font-black text-xs">⬅</span>
                              <span className="font-bold text-emerald-950 text-[11px]">
                                سورة {row.endSurahName} ({row.endAyah})
                              </span>
                            </>
                          )}
                        </div>

                        {/* Revision */}
                        <div className="text-[11px] text-slate-700 bg-amber-50/70 p-1.5 rounded-md border border-amber-200/80 flex items-center gap-1">
                          <span className="font-bold text-amber-900 shrink-0">المراجعة المستقلة:</span>
                          <span className="truncate font-semibold">{row.suggestedRevision}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* DESKTOP TABLE LAYOUT (>= 640px) */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse min-w-[650px]">
                    <thead>
                      <tr className="bg-emerald-950 text-white border-b border-emerald-900 font-bold">
                        <th className="p-2.5 text-center w-12">#</th>
                        <th className="p-2.5 text-center w-24">اليوم</th>
                        <th className="p-2.5">نطاق الحفظ والتثبيت (الورد اليومي)</th>
                        <th className="p-2.5 text-center w-20">المقدار</th>
                        <th className="p-2.5 text-center w-20">الصفحة</th>
                        <th className="p-2.5">المراجعة اليومية (مستقلة بالصفحات)</th>
                        <th className="p-2.5 text-center w-16">الإنجاز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row, idx) => {
                        const isNewWeekStart =
                          idx === 0 || row.weekNumber !== filteredRows[idx - 1].weekNumber;
                        const isConsolidation = Boolean(row.unit.isConsolidation);

                        return (
                          <React.Fragment key={row.dayIndex}>
                            {isNewWeekStart && (
                              <tr className="bg-emerald-50/80 border-y border-emerald-200/80 font-bold text-emerald-900">
                                <td colSpan={7} className="px-3 py-1.5 text-[11px]">
                                  🌿 مستهدف الأسبوع {row.weekNumber}
                                </td>
                              </tr>
                            )}
                            <tr className={`transition-colors ${
                              isConsolidation
                                ? 'bg-emerald-50/50 hover:bg-emerald-100/60'
                                : 'hover:bg-emerald-50/40'
                            }`}>
                              <td className={`p-2.5 text-center font-black text-[11px] ${
                                isConsolidation ? 'bg-emerald-100/60 text-emerald-950' : 'bg-slate-50/50 text-slate-900'
                              }`}>
                                {row.dayIndex}
                              </td>

                              <td className="p-2.5 text-center">
                                <span className="font-bold text-slate-800 block text-[11px]">
                                  {row.dayOfWeekName}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  أسبوع {row.weekNumber}
                                </span>
                              </td>

                              <td className="p-2.5">
                                {isConsolidation ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px] shadow-2xs">
                                      تثبيت {row.unit.consolidationDayIndex}/3
                                    </span>
                                    <span className="font-black text-emerald-950 text-[11px]">
                                      سورة {row.startSurahName} كاملة (1 - {row.endAyah})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                      سورة {row.startSurahName} (1)
                                    </span>

                                    <span className="text-slate-400 font-bold text-[10px]">⬅</span>

                                    <span className="font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                      سورة {row.endSurahName} ({row.endAyah})
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="p-2.5 text-center font-bold text-emerald-900">
                                {isConsolidation ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                    كامل السورة ({row.totalAyahs} آية)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px]">
                                    {row.totalAyahs} {row.totalAyahs === 1 ? 'آية' : 'آيات'}
                                  </span>
                                )}
                              </td>

                              <td className="p-2.5 text-center font-mono text-[10px] text-slate-600">
                                {row.pageInfo || '-'}
                              </td>

                              <td className="p-2.5 text-slate-600 text-[11px]">
                                <span className="text-amber-950 bg-amber-50/80 px-2.5 py-0.5 rounded-md font-semibold text-[10px] border border-amber-200 inline-flex items-center gap-1">
                                  <span>📖</span>
                                  <span>{row.suggestedRevision}</span>
                                </span>
                              </td>

                              <td className="p-2.5 text-center">
                                <span className="font-bold text-slate-800 text-[10px] block">
                                  {row.progressPercent}%
                                </span>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================= */
            /* WEEKLY BENTO CARDS VIEW */
            /* ======================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {weeklyGroups.map((group) => (
                <div
                  key={group.weekNumber}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  <div className="bg-slate-900 text-white p-2.5 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <h4 className="font-black text-xs">الأسبوع {group.weekNumber}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      مستهدف الأسبوع: {group.totalAyahs} آية
                    </span>
                  </div>

                  <div className="p-2.5 space-y-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg text-[10px] flex items-center justify-between text-slate-700">
                      <span className="font-bold text-slate-500">النطاق:</span>
                      <span className="font-bold text-emerald-950">
                        من {group.startPosition} إلى {group.endPosition}
                      </span>
                    </div>

                    <div className="space-y-1 divide-y divide-slate-100">
                      {group.days.map((day) => (
                        <div
                          key={day.dayIndex}
                          className="pt-1.5 flex items-center justify-between text-xs gap-1.5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-900 font-black flex items-center justify-center text-[10px] shrink-0 border border-emerald-200">
                              {day.dayIndex}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-[11px]">
                                {day.dayOfWeekName}:
                              </span>{' '}
                              <span className="text-[10px] text-slate-600 truncate">
                                {day.startSurahName} ({day.startAyah}) ⬅ {day.endSurahName} ({day.endAyah})
                              </span>
                            </div>
                          </div>

                          <span className="font-bold text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                            {day.totalAyahs} آية
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. FOOTER SECTION */}
        {/* ========================================================================= */}
        <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            ✨ نموذج استرشادي معياري قابل للتخصيص لكل طالب.
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة المستند</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
