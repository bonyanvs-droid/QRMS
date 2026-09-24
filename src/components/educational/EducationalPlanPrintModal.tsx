import React, { useState } from 'react';
import {
  X,
  Printer,
  ExternalLink,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  Info,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { EducationalPlanWeek, EducationalStage } from '../../types';
import {
  printEducationalPlanDocument,
  generateEducationalPlanPrintHTML,
  downloadPrintableHTMLFile,
  exportEducationalPlanToExcel,
  formatWeekDayDate,
} from '../../utils/educationalPlanUtils';

interface EducationalPlanPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeks: EducationalPlanWeek[];
  stage?: EducationalStage;
}

export const EducationalPlanPrintModal: React.FC<EducationalPlanPrintModalProps> = ({
  isOpen,
  onClose,
  weeks,
  stage,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedDay, setSelectedDay] = useState<'saturday' | 'thursday' | 'friday' | 'full'>('saturday');
  const stageName = stage ? stage.name : 'جميع المراحل';

  if (!isOpen) return null;

  const handleDirectPrint = () => {
    printEducationalPlanDocument(weeks, stage, 'الفصل الدراسي الحالي', selectedDay);
  };

  const handleOpenInNewWindow = () => {
    const html = generateEducationalPlanPrintHTML(weeks, stage, 'الفصل الدراسي الحالي', selectedDay);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
    } else {
      downloadPrintableHTMLFile(html, `خطة_${stageName.replace(/\s+/g, '_')}.html`);
    }
  };

  const handleDownloadHTML = () => {
    const html = generateEducationalPlanPrintHTML(weeks, stage, 'الفصل الدراسي الحالي', selectedDay);
    downloadPrintableHTMLFile(html, `خطة_${stageName.replace(/\s+/g, '_')}.html`);
  };

  const handleExportExcel = () => {
    exportEducationalPlanToExcel(weeks, stageName);
  };

  const handleCopyHTML = async () => {
    const html = generateEducationalPlanPrintHTML(weeks, stage, 'الفصل الدراسي الحالي', selectedDay);
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const dayHeaderLabel =
    selectedDay === 'saturday'
      ? 'يوم وتاريخ النشاط (السبت)'
      : selectedDay === 'thursday'
      ? 'يوم وتاريخ النشاط (الخميس)'
      : selectedDay === 'friday'
      ? 'يوم وتاريخ النشاط (الجمعة)'
      : 'تاريخ الأسبوع';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-up text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 text-emerald-200 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">طباعة الخطة التربوية في صفحة واحدة (A4)</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                تجهيز مستند الطباعة الرسمي لمرحلة: <strong>{stageName}</strong> ({weeks.length} أسبوعاً)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Day Selector & Action Toolbar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col gap-3 shrink-0">
          {/* Day selection row */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold text-slate-800">
                اليوم والتاريخ المعتمد في عمود الأسبوع:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDay('saturday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDay === 'saturday'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {selectedDay === 'saturday' && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>يوم السبت (المعتمد)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDay('thursday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDay === 'thursday'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {selectedDay === 'thursday' && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>الخميس</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDay('friday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDay === 'friday'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {selectedDay === 'friday' && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>الجمعة</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDay('full')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDay === 'full'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {selectedDay === 'full' && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>تاريخ البداية والنهاية</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Direct Print Button */}
              <button
                onClick={handleDirectPrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة صفحة واحدة فوراً</span>
              </button>

              {/* Open in New Window */}
              <button
                onClick={handleOpenInNewWindow}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-emerald-700" />
                <span>فتح في تبويب مستقل</span>
              </button>

              {/* Download Standalone HTML */}
              <button
                onClick={handleDownloadHTML}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="تحميل كملف صفحة طباعة HTML مستقل"
              >
                <Download className="w-4 h-4 text-teal-700" />
                <span>تحميل ملف الطباعة (HTML)</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير Excel</span>
              </button>

              {/* Copy HTML */}
              <button
                onClick={handleCopyHTML}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                title="نسخ كود المستند"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'تم النسخ ✓' : 'نسخ HTML'}</span>
              </button>
            </div>

            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg font-bold border border-emerald-200">
              تخطيط الصفحة: <strong>صفحة واحدة A4 أفقي (Landscape)</strong>
            </span>
          </div>
        </div>

        {/* Live Printable Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-200/70">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 max-w-5xl mx-auto text-right space-y-3">
            {/* Header Preview */}
            <div className="flex items-center justify-between border-b-2 border-emerald-900 pb-2.5">
              <div>
                <h4 className="text-sm font-black text-emerald-950">
                  📘 مصفوفة وخطة البرامج التربوية الأسبوعية
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  مجمع القرآن الكريم والبرامج التربوية المصاحبة • الفصل الدراسي الحالي
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg font-bold text-slate-800">
                  المرحلة: {stageName}
                </span>
                <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg font-bold text-slate-800">
                  الأسابيع: {weeks.length}
                </span>
                <span className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-emerald-800">
                  الميزانية: {weeks.reduce((s, w) => s + (w.budget || 0), 0)} ر.س
                </span>
              </div>
            </div>

            {/* Stage Outcome */}
            {stage?.outcomeSummary && (
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex justify-between items-center">
                <span><strong>مخرج المرحلة المستهدف:</strong> {stage.outcomeSummary}</span>
                <span className="font-bold text-emerald-800">تخطيط صفحة واحدة A4</span>
              </div>
            )}

            {/* Matrix Table Preview with 1 Day Column */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-right text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-center text-[10.5px]">
                    <th className="p-2 border border-slate-700 w-8">م</th>
                    <th className="p-2 border border-slate-700 w-28">{dayHeaderLabel}</th>
                    <th className="p-2 border border-slate-700 w-16">المجال</th>
                    <th className="p-2 border border-slate-700 w-24">القيمة</th>
                    <th className="p-2 border border-slate-700 w-28">الشعار</th>
                    <th className="p-2 border border-slate-700">الهدف والموضوع المعتمد</th>
                    <th className="p-2 border border-slate-700 w-36">الفقرة التفاعلية</th>
                    <th className="p-2 border border-slate-700 w-24">المسؤول</th>
                    <th className="p-2 border border-slate-700 w-28">البرنامج القرآني</th>
                    <th className="p-2 border border-slate-700 w-16">الميزانية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {weeks.map((w) => {
                    const formattedDate = formatWeekDayDate(w, selectedDay);
                    const isVacation = w.weekType && w.weekType !== 'normal';

                    if (isVacation) {
                      return (
                        <tr key={w.id} className="bg-amber-50/80 font-bold text-amber-950">
                          <td className="p-1.5 text-center bg-amber-100">{w.weekNumber}</td>
                          <td className="p-1.5 text-center text-xs text-amber-900 font-bold">{formattedDate}</td>
                          <td colSpan={7} className="p-1.5 text-center text-amber-900 text-xs font-bold">
                            {w.specialEventTitle || 'إجازة رسمية'}
                          </td>
                          <td className="p-1.5 text-center">{w.budget ? `${w.budget} ر.س` : '-'}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="p-1.5 text-center font-bold bg-slate-50">{w.weekNumber}</td>
                        <td className="p-1.5 text-center font-bold text-slate-900 whitespace-nowrap text-[10.5px]">
                          {formattedDate}
                        </td>
                        <td className="p-1.5 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9.5px]">
                            {w.domainLabel || (w.domain === 'faith' ? 'إيماني' : w.domain === 'behavioral' ? 'سلوكي' : w.domain === 'skills' ? 'مهاري' : 'قرآني')}
                          </span>
                        </td>
                        <td className="p-1.5 font-bold text-slate-900">{w.valueTitle || '-'}</td>
                        <td className="p-1.5 font-black text-emerald-900 text-[10.5px]">{w.motto || '-'}</td>
                        <td className="p-1.5 text-[10.5px] text-slate-700 leading-tight">
                          <div>{w.educationalGoal || w.goalTopic || '-'}</div>
                          {w.goalPresenter && (
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              المقدم: {w.goalPresenter} {w.goalLocation ? `(${w.goalLocation})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="p-1.5 bg-amber-50/40 text-[10.5px] text-amber-950 leading-tight">
                          <div>{w.activity || '-'}</div>
                          {w.activityPresenter && (
                            <div className="text-[9px] text-amber-800 mt-0.5">
                              المقدم: {w.activityPresenter} {w.activityLocation ? `(${w.activityLocation})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="p-1.5 font-bold text-slate-800 text-center">{w.responsiblePerson || '-'}</td>
                        <td className="p-1.5 bg-purple-50/40 text-[10.5px] text-purple-900">
                          {w.quranicProgram || '-'}
                        </td>
                        <td className="p-1.5 text-center font-bold text-emerald-800 whitespace-nowrap">
                          {w.budget ? `${w.budget} ر.س` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Signatures */}
            <div className="pt-3 border-t border-dashed border-slate-300 flex justify-between text-xs text-slate-700 font-bold px-4">
              <div>مشرف المرحلة التربوية</div>
              <div>المشرف التعليمي والتربوي</div>
              <div>مدير المجمع القرآني (الختم والاعتماد)</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              تم ضبط التنسيق ليطبع الجدول كاملاً في <strong>صفحة واحدة A4 بالعرض (Landscape)</strong> مع دمج التاريخ في عمود واحد لليوم المختار.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
