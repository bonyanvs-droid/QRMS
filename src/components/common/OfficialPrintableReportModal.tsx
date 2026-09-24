import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Student,
  DailySessionRecord,
  SpellingLesson,
  AcademicYearConfig,
  Halaqah,
  Teacher,
} from '../../types';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  Filter,
  BookOpen,
  Layers,
  Check,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { exportStudentsToExcel } from '../../utils/exportUtils';
import {
  exportElementToPdf,
  printElementViaIframe,
  PdfOrientation,
} from '../../utils/pdfExportUtils';
import { useApp } from '../../context/AppContext';

interface OfficialPrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  records: DailySessionRecord[];
  spellingLessons: SpellingLesson[];
  academicConfig: AcademicYearConfig;
  halaqah?: Halaqah;
  halaqahs?: Halaqah[];
  teacher?: Teacher;
  teachers?: Teacher[];
  mosqueLogoUrl?: string;
  stageLogoUrl?: string;
}

export const OfficialPrintableReportModal: React.FC<OfficialPrintableReportModalProps> = ({
  isOpen,
  onClose,
  students,
  records,
  spellingLessons,
  academicConfig,
  halaqah,
  halaqahs,
  teacher,
  teachers,
  mosqueLogoUrl = '',
  stageLogoUrl = '',
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const { activeTenant, stages, halaqahs: contextHalaqahs, teachers: contextTeachers } = useApp();

  // State hooks - MUST be called unconditionally on every render
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>(halaqah?.id || 'all');
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('portrait');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Pool of available halaqahs for selection
  const availableHalaqahs = useMemo(() => {
    if (halaqahs && halaqahs.length > 0) return halaqahs;
    if (halaqah) return [halaqah];
    return contextHalaqahs.filter((h) => !activeTenant?.id || h.tenantId === activeTenant?.id);
  }, [halaqahs, halaqah, contextHalaqahs, activeTenant]);

  const availableTeachers = useMemo(() => {
    if (teachers && teachers.length > 0) return teachers;
    return contextTeachers;
  }, [teachers, contextTeachers]);

  // Sync selected halaqah when modal opens or halaqah prop changes
  useEffect(() => {
    if (halaqah?.id) {
      setSelectedHalaqahId(halaqah.id);
    } else {
      setSelectedHalaqahId('all');
    }
  }, [halaqah, isOpen]);

  const activeSelectedHalaqah = useMemo(() => {
    if (selectedHalaqahId === 'all') return null;
    return availableHalaqahs.find((h) => h.id === selectedHalaqahId) || null;
  }, [selectedHalaqahId, availableHalaqahs]);

  // Filter students based on selection
  const effectiveStudents = useMemo(() => {
    if (!activeSelectedHalaqah) return students;
    return students.filter((s) => s.halaqahId === activeSelectedHalaqah.id);
  }, [students, activeSelectedHalaqah]);

  // Identify teacher for the selected halaqah
  const effectiveTeacher = useMemo(() => {
    if (activeSelectedHalaqah) {
      return (
        availableTeachers.find(
          (t) => t.id === activeSelectedHalaqah.teacherId || t.halaqahId === activeSelectedHalaqah.id
        ) || teacher
      );
    }
    return teacher;
  }, [activeSelectedHalaqah, availableTeachers, teacher]);

  if (!isOpen) return null;

  const currentStage = stages.find(
    (s) => s.id === (activeSelectedHalaqah?.stageId || halaqah?.stageId)
  );
  const resolvedMosqueLogo = mosqueLogoUrl || activeTenant?.logoUrl || '/ghazzawi-logo.svg';
  const resolvedStageLogo =
    currentStage?.logoUrl ||
    ((activeSelectedHalaqah?.stageId || halaqah?.stageId) === 'baraem' ? stageLogoUrl : null);
  const isStageLogoActive = currentStage
    ? currentStage.isLogoActive !== false
    : Boolean(resolvedStageLogo);

  const reportTargetName = activeSelectedHalaqah?.name
    ? activeSelectedHalaqah.name.replace(/\s+/g, '_')
    : 'كافة_الحلقات';
  const pdfFileName = `تقرير_المخرجات_المعتمد_${reportTargetName}_أسبوع_${academicConfig.currentWeek}.pdf`;

  const handleSavePdf = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPdf(true);
    setFeedbackNotice(null);

    try {
      await exportElementToPdf(printAreaRef.current, {
        fileName: pdfFileName,
        orientation: pdfOrientation,
        marginMm: 6,
      });

      setFeedbackNotice({
        text: `تم تجهيز وتنزيل ملف التقرير المعتمد (${pdfFileName}) بصيغة PDF بنجاح!`,
        type: 'success',
      });
      setTimeout(() => setFeedbackNotice(null), 7000);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setFeedbackNotice({
        text: 'تعذر إنشاء ملف PDF تلقائياً، يرجى المحاولة مرة أخرى أو استخدام زر الطباعة المباشرة.',
        type: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!printAreaRef.current) return;
    
    try {
      setFeedbackNotice({
        text: 'جارٍ فتح نافذة الطباعة المعتمدة...',
        type: 'info',
      });

      await printElementViaIframe(printAreaRef.current, {
        title: `تقرير متابعة المخرجات التعليمية - ${reportTargetName}`,
        orientation: pdfOrientation === 'auto' ? 'portrait' : pdfOrientation,
      });

      setFeedbackNotice({
        text: 'تم إرسال أمر الطباعة بنجاح إلى طابعة المتصفح.',
        type: 'success',
      });
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err) {
      console.warn('Browser print failed, attempting automated PDF fallback:', err);
      setFeedbackNotice({
        text: 'تعذر تشغيل طابعة المتصفح تلقائياً، يتم الآن تنزيل ملف PDF معتمد لجهازك فوراً...',
        type: 'info',
      });
      await handleSavePdf();
    }
  };

  const handleExportExcel = () => {
    exportStudentsToExcel(effectiveStudents, records, spellingLessons, academicConfig, {
      halaqahName: activeSelectedHalaqah?.name,
      fileName: `كشف_معتمد_${reportTargetName}_أسبوع_${academicConfig.currentWeek}.xlsx`,
    });
  };

  const todayArabic = new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'full',
  }).format(new Date());

  const todayGregorian = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print-modal-container">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Main Header Toolbar (hidden in print) */}
        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-snug">
                التقرير الرسمي المعتمد للطباعة والتصدير (PDF / Excel)
              </h3>
              <p className="text-[11px] text-slate-400">
                جاهز للطباعة المباشرة وحفظ ملف PDF معتمد بأختام وشعارات {activeTenant?.name || 'مجمع جامع الغزاوي'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            {/* Direct Save PDF Button */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleSavePdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-60 active:scale-95"
              title="حفظ وتنزيل التقرير بصيغة PDF معتمدة على جهازك"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ تجهيز PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>طباعة / حفظ PDF</span>
                </>
              )}
            </button>

            {/* Browser Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all border border-slate-700 shadow-xs cursor-pointer active:scale-95"
              title="إرسال أمر الطباعة المباشر إلى طابعة المتصفح"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>طابعة المتصفح</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Orientation & Halaqah Selection Toolbar (hidden in print) */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          {/* Halaqah Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-slate-800 shrink-0">نطاق التقرير:</span>
            
            <select
              id="halaqah-report-filter"
              value={selectedHalaqahId}
              onChange={(e) => setSelectedHalaqahId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs min-w-[200px]"
            >
              <option value="all">
                🏛️ كافة الحلقات ({students.length} طالب) – تقرير المجمع الشامل
              </option>
              {availableHalaqahs.map((h) => {
                const halaqahStudentsCount = students.filter((s) => s.halaqahId === h.id).length;
                const hTeacher = availableTeachers.find(
                  (t) => t.id === h.teacherId || t.halaqahId === h.id
                );
                return (
                  <option key={h.id} value={h.id}>
                    📖 {h.name} ({halaqahStudentsCount} طالب){hTeacher ? ` • ${hTeacher.name}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Smart Orientation Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 mx-1.5 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 ml-1">توجيه الصفحة:</span>
            
            <button
              type="button"
              onClick={() => setPdfOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                pdfOrientation === 'portrait'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              A4 طولي
            </button>

            <button
              type="button"
              onClick={() => setPdfOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                pdfOrientation === 'landscape'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              A4 عرضي
            </button>
          </div>
        </div>

        {/* In-Modal Feedback Notice Banner */}
        {feedbackNotice && (
          <div
            className={`px-4 sm:px-5 py-2 text-xs font-bold flex items-center justify-between gap-2 border-b print:hidden transition-all ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : feedbackNotice.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Printable Document Body */}
        <div
          ref={printAreaRef}
          id="official-printable-report"
          className="p-6 sm:p-10 overflow-y-auto bg-white font-['Cairo',sans-serif] text-slate-900 print:overflow-visible print:p-6"
        >
          {/* Print Letterhead Header */}
          <div className="border-b-2 border-emerald-800 pb-4 mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 leading-relaxed">
              <div className="text-right space-y-0.5">
                <p>المملكة العربية السعودية</p>
                <p>الجمعية الخيرية لتحفيظ القرآن الكريم بجدة</p>
                <p className="font-bold text-emerald-900">
                  {activeTenant?.name || 'مجمع حلقات جامع الغزاوي'} {activeTenant?.district ? `– ${activeTenant.district}` : ''}
                </p>
                <p className="text-[11px] text-emerald-800 font-bold">
                  {currentStage?.name ? `برنامج ${currentStage.name}` : 'برنامج الحلقات القرآنية النموذجية'}
                </p>
              </div>

              {/* Logos */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-emerald-200 p-1 flex items-center justify-center bg-white shadow-xs">
                  <img src={resolvedMosqueLogo} alt={activeTenant?.name || 'شعار المجمع'} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                {resolvedStageLogo && isStageLogoActive && (
                  <div className="w-16 h-16 rounded-xl border border-emerald-200 p-1 flex items-center justify-center bg-white shadow-xs">
                    <img src={resolvedStageLogo} alt={currentStage?.name || 'شعار المرحلة'} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <div className="text-left space-y-0.5">
                <p>الفصل الدراسي: {academicConfig.currentTerm}</p>
                <p>العام: {academicConfig.academicYear}</p>
                <p className="font-bold text-emerald-900">الأسبوع التشغيلي: ({academicConfig.currentWeek})</p>
                <p className="text-[10px] text-slate-500">{todayGregorian} م</p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 text-center">
              <span className="inline-block px-6 py-1.5 rounded-full bg-emerald-800 text-white font-black text-sm sm:text-base tracking-wide shadow-xs">
                تقرير متابعة المخرجات التعليمية والقرآنية – {activeSelectedHalaqah ? activeSelectedHalaqah.name : 'كافة الحلقات'}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                المخرج المستهدف المعتمد: «متقنٌ لقراءة القرآن الكريم وحفظه إلى سورة الغاشية»
              </p>
            </div>
          </div>

          {/* Halaqah & Teacher Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs mb-6">
            <div>
              <span className="text-slate-500 block">الحلقة:</span>
              <strong className="text-emerald-900 font-bold text-sm">
                {activeSelectedHalaqah ? activeSelectedHalaqah.name : 'كافة حلقات المجمع'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">المعلم المشرف:</span>
              <strong className="text-slate-900 font-bold text-sm">
                {effectiveTeacher?.name || (activeSelectedHalaqah ? 'معلم الحلقة' : 'هيئة معلمي المجمع')}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">إجمالي الطلاب:</span>
              <strong className="text-slate-900 font-bold text-sm">{effectiveStudents.length} طالباً</strong>
            </div>
            <div>
              <span className="text-slate-500 block">تاريخ الإصدار:</span>
              <strong className="text-slate-900 font-bold text-xs">{todayArabic}</strong>
            </div>
          </div>

          {/* Students Evaluation Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 mb-8">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-white font-bold border-b border-emerald-900 text-center">
                  <th className="p-2 border-l border-emerald-700 w-8">م</th>
                  <th className="p-2 border-l border-emerald-700 text-right">اسم الطالب</th>
                  <th className="p-2 border-l border-emerald-700">الصف / المرحلة</th>
                  <th className="p-2 border-l border-emerald-700">درس الهجاء الحالي</th>
                  <th className="p-2 border-l border-emerald-700">إتقان الهجاء</th>
                  <th className="p-2 border-l border-emerald-700">المحفوظ الحالي</th>
                  <th className="p-2 border-l border-emerald-700">المستهدف</th>
                  <th className="p-2 border-l border-emerald-700">المواظبة</th>
                  <th className="p-2">الحالة التربوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {effectiveStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 font-medium">
                      لا يوجد طلاب مسجلون في هذه الحلقة حالياً.
                    </td>
                  </tr>
                ) : (
                  effectiveStudents.map((student, idx) => {
                    const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);
                    const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);

                    return (
                      <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2 text-center font-mono border-l border-slate-200">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 border-l border-slate-200">
                          {student.fullName}
                        </td>
                        <td className="p-2 text-center border-l border-slate-200 text-[11px]">{student.grade}</td>
                        <td className="p-2 text-center border-l border-slate-200">
                          <span className="font-semibold text-emerald-900">
                            {currentLesson ? `د.${currentLesson.lessonNumber}` : '—'}
                          </span>
                          <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                            {currentLesson?.title}
                          </span>
                        </td>
                        <td className="p-2 text-center font-bold border-l border-slate-200">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                              evalResult.spellingMasteryRate >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {evalResult.spellingMasteryRate}%
                          </span>
                        </td>
                        <td className="p-2 text-center border-l border-slate-200 font-semibold text-[11px]">
                          سورة {student.currentSurah} ({student.currentAyah})
                        </td>
                        <td className="p-2 text-center border-l border-slate-200 text-[11px] text-slate-700">
                          {student.minimumTargetSurah}
                        </td>
                        <td className="p-2 text-center font-mono border-l border-slate-200 text-[11px]">
                          {evalResult.attendanceRate}%
                        </td>
                        <td className="p-2 text-center font-bold text-[10px]">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full ${
                              evalResult.status === 'advanced'
                                ? 'bg-purple-100 text-purple-900'
                                : evalResult.status === 'on_track'
                                ? 'bg-emerald-100 text-emerald-900'
                                : evalResult.status === 'needs_support'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {evalResult.statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures and Mosque Seal Block */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-800">
            <div className="space-y-12">
              <p className="font-bold text-slate-700">معلم الحلقة</p>
              <div className="text-slate-900 font-bold border-b border-dashed border-slate-400 pb-1 max-w-[160px] mx-auto">
                {effectiveTeacher?.name || (activeSelectedHalaqah ? 'معلم الحلقة' : 'هيئة المعلمين')}
              </div>
            </div>

            {/* Official Mosque Seal Graphic */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-700 p-1 flex flex-col items-center justify-center text-center text-emerald-900 bg-emerald-50/50 shadow-inner rotate-[-6deg]">
                <ShieldCheck className="w-6 h-6 text-emerald-800 mb-0.5" />
                <span className="text-[9px] font-black leading-tight">{activeTenant?.name || 'مجمع جامع الغزاوي'}</span>
                <span className="text-[8px] font-bold text-emerald-700">معتمد رسمياً</span>
                <span className="text-[7px] text-slate-500 font-mono mt-0.5">{todayGregorian}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">الختم المعتمد للمجمع</span>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-700">المشرف العام / مدير المجمع</p>
              <div className="text-slate-900 font-bold border-b border-dashed border-slate-400 pb-1 max-w-[160px] mx-auto">
                {activeTenant?.supervisorName || 'إدارة المجمع'}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>صدر عن المنصة الإلكترونية لإدارة المجمعات القرآنية – {activeTenant?.name || 'مجمع حلقات جامع الغزاوي'}</span>
            <span>وثيقة متابعة معتمدة ومحمية رقمياً</span>
          </div>
        </div>
      </div>
    </div>
  );
};

