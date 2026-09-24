import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { Printer, Download, X, Award, CheckCircle2, BookOpen, ShieldCheck } from 'lucide-react';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import { MosqueLogo } from '../common/logos/MosqueLogo';
import { StageLogo } from '../common/logos/StageLogo';

interface SpellingTranscriptModalProps {
  student: Student;
  onClose: () => void;
}

export const SpellingTranscriptModal: React.FC<SpellingTranscriptModalProps> = ({
  student,
  onClose,
}) => {
  const {
    spellingLessons,
    sessionRecords,
    academicConfig,
    halaqahs,
    teachers,
    activeTenant,
    stages,
  } = useApp();

  const studentStage = stages.find((st) => st.id === (student.stageId || 'baraem'));
  const mosqueName = activeTenant?.name || 'مجمع جامع الغزاوي';
  const cityName = activeTenant?.city || 'مدينة جدة';

  const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
  const teacher = teachers.find((t) => t.id === student.teacherId);
  const evalResult = evaluateStudentStatus(student, sessionRecords, spellingLessons, academicConfig);

  const studentRecords = sessionRecords
    .filter((r) => r.studentId === student.id && r.spelling)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);

  const printableRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printableRef.current) {
      window.print();
      return;
    }
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'fixed';
    printWindow.style.top = '-9999px';
    printWindow.style.left = '-9999px';
    printWindow.style.width = '0';
    printWindow.style.height = '0';
    printWindow.style.border = 'none';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>كشف إتقان الهجاء القرآني - ${student.fullName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Cairo', sans-serif; background: #fff; color: #1e293b; padding: 20px; direction: rtl; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .grid { display: flex; gap: 12px; margin: 12px 0; }
            .grid > div { flex: 1; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; }
            .header-banner { border: 2px solid #059669; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 16px; background-color: #ecfdf5; }
            .signatures { display: flex; justify-content: space-between; gap: 20px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
            .sig-box { flex: 1; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center; }
            @page { size: A4 portrait; margin: 10mm; }
          </style>
        </head>
        <body>
          ${printableRef.current.innerHTML}
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printWindow);
      }, 1000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 md:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Actions Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              كشف إتقان الهجاء القرآني المعتمد
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف الرسمي</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div ref={printableRef} className="mt-4 flex-1 overflow-y-auto space-y-6 print:overflow-visible text-slate-800">
          {/* Mosque Official Document Header */}
          <div className="border-2 border-emerald-800/40 rounded-2xl p-6 bg-gradient-to-b from-emerald-50/50 to-white text-center space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-900/20 pb-4">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700 block">المملكة العربية السعودية</span>
                <span className="text-xs font-bold text-emerald-900 block">{studentStage?.name || 'برنامج الحلقات القرآنية'}</span>
                <span className="text-xs font-bold text-slate-800 block">{mosqueName} – {cityName}</span>
              </div>
              <div className="flex items-center gap-3">
                <MosqueLogo size="md" />
                {studentStage?.logoUrl && studentStage?.isLogoActive !== false && (
                  <StageLogo stageId={studentStage.id} size="md" variant="compact" />
                )}
              </div>
              <div className="text-left font-mono text-[11px] text-slate-600">
                <span>التاريخ: {new Date().toLocaleDateString('ar-SA')}</span>
                <span className="block">العام: {academicConfig.name}</span>
                <span className="block">{academicConfig.semester}</span>
              </div>
            </div>

            <div className="py-2">
              <h2 className="text-xl md:text-2xl font-black text-emerald-950 font-serif">
                «سجل إتقان مسار الهجاء القرآني المعتمد»
              </h2>
              <p className="text-xs text-emerald-800 font-semibold mt-1">
                وثيقة تقييم مخرجات الطلاب في القراءة القرآنية السليمة وضبط المخارج
              </p>
            </div>

            {/* Student metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-emerald-200 text-xs text-right">
              <div>
                <span className="text-slate-500 block text-[10px]">اسم الطالب:</span>
                <span className="font-bold text-slate-900">{student.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الصف والحلقة:</span>
                <span className="font-bold text-slate-900">{student.grade} • {halaqah?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">معلم الحلقة:</span>
                <span className="font-bold text-slate-900">{teacher?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">معدل الإتقان العام:</span>
                <span className="font-black text-emerald-800 font-mono text-sm">
                  {evalResult.hasSpellingEvaluation ? `${evalResult.spellingMasteryRate}%` : 'غير مقيّم'}
                </span>
              </div>
            </div>
          </div>

          {/* Curriculum Mastery Grid */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>مصفوفة إنجاز الدروس الـ 12 المعتمدة:</span>
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-emerald-900 text-white font-bold">
                  <tr>
                    <th className="p-2.5">رقم</th>
                    <th className="p-2.5">عنوان الدرس والمهارة</th>
                    <th className="p-2.5">المهام الجزئية</th>
                    <th className="p-2.5">الدرجة</th>
                    <th className="p-2.5 text-center">حالة الإتقان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spellingLessons.map((lesson) => {
                    const isCompleted = lesson.lessonNumber < (currentLesson?.lessonNumber || 1);
                    const isCurrent = lesson.lessonNumber === (currentLesson?.lessonNumber || 1);

                    // Find latest record for this lesson if exists
                    const rec = studentRecords.find((r) => r.spelling?.lessonId === lesson.id);
                    const score = rec ? rec.spelling?.finalScore : isCompleted ? 92 : isCurrent ? student.currentSpellingScore : null;

                    return (
                      <tr
                        key={lesson.id}
                        className={isCurrent ? 'bg-emerald-50/60 font-semibold' : ''}
                      >
                        <td className="p-2.5 font-bold font-mono text-emerald-900">
                          {lesson.lessonNumber}
                        </td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-900">{lesson.title}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {lesson.coreSkills.slice(0, 2).join(' • ')}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          {lesson.subLessons.length} مهارات
                        </td>
                        <td className="p-2.5 font-mono font-bold">
                          {score ? `${score}%` : '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>متقن</span>
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                              <span>قيد التقييم</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">قادم</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher & Supervisor Endorsement Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1">معلم الحلقة القرآني:</span>
              <span className="font-bold text-slate-900 block">{teacher?.name}</span>
              <div className="mt-4 pt-2 border-t border-dashed border-slate-300 text-slate-400 font-mono text-[10px]">
                التوقيع والاعتماد: ..............................
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px] mb-1">المشرف العام على المجمع:</span>
              <span className="font-bold text-slate-900 block">د. نور إبراهيم محمد يوسف</span>
              <div className="mt-4 pt-2 border-t border-dashed border-slate-300 text-slate-400 font-mono text-[10px]">
                الختم والاعتماد: [ جامع الغزاوي بجدة ]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
