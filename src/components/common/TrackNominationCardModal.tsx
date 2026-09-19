import React from 'react';
import { TrackNomination } from '../../types';
import { Printer, X, Award, CheckCircle2, ShieldCheck, QrCode, Share2 } from 'lucide-react';

interface TrackNominationCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomination: TrackNomination | null;
  tenantName?: string;
  tenantLogo?: string;
}

export const TrackNominationCardModal: React.FC<TrackNominationCardModalProps> = ({
  isOpen,
  onClose,
  nomination,
  tenantName = '',
  tenantLogo,
}) => {
  if (!isOpen || !nomination) return null;

  const isPassed = nomination.status === 'association_completed' || nomination.associationExam?.passed;
  const isApproved =
    nomination.status === 'approved_for_association' ||
    nomination.status === 'association_completed' ||
    nomination.supervisorApproval !== undefined;

  const handlePrint = () => {
    window.print();
  };

  const cardNumber = nomination.nominationCardNumber || `NOM-${nomination.id.slice(-6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 print:shadow-none print:border-none print:p-0 print:max-w-none max-h-[92vh] overflow-y-auto">
        {/* Header - Screen only */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-base">
              {isPassed ? 'وثيقة الاعتماد والشهادة الرسمية' : 'بطاقة دخول اختبار المسار الرسمي'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Official Card Body */}
        <div className="p-6 sm:p-8 border-2 border-emerald-700/80 rounded-3xl bg-gradient-to-b from-emerald-50/40 via-white to-amber-50/20 text-center space-y-6 relative overflow-hidden shadow-xs print:border-2 print:rounded-2xl">
          {/* Watermark/Accent */}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-emerald-100/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-100/40 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top Title & Emblems */}
          <div className="space-y-1 text-center relative z-10">
            <div className="text-[11px] font-bold text-slate-500 tracking-wider">
              المملكة العربية السعودية • الجمعية الخيرية لتحفيظ القرآن الكريم
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-950 font-serif">
              {tenantName}
            </div>
            <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-800 text-amber-200 text-xs font-bold shadow-2xs mt-1">
              {isPassed ? 'شهادة إتقان واجتياز رسمي' : 'بطاقة دخول اختبار معتمدة'}
            </div>
          </div>

          {/* Student Info Highlight */}
          <div className="py-4 px-3 border-y border-emerald-200 bg-white/80 rounded-2xl relative z-10 space-y-1">
            <div className="text-xs text-slate-500 font-semibold">اسم الطالب المرشح للاختبار</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-serif">
              {nomination.studentName}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/70 text-emerald-900 text-xs font-bold rounded-lg mt-1">
              <span>{nomination.trackName || 'مسار القرآن الكريم'}</span>
              <span>•</span>
              <span className="text-amber-800">{nomination.targetBranchOrLevel}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs text-right bg-white/90 p-4 rounded-2xl border border-emerald-100 shadow-2xs relative z-10">
            <div>
              <span className="text-slate-500 block text-[11px]">رقم بطاقة الترشيح:</span>
              <span className="font-mono font-black text-slate-900 text-sm">{cardNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">درجة الاختبار الداخلي المؤهل:</span>
              <span className="font-bold text-emerald-700 text-sm">
                {nomination.internalExam?.totalScore !== undefined ? `${nomination.internalExam.totalScore}%` : 'مستوفٍ للشروط'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">الحلقة القرآنية:</span>
              <span className="font-bold text-slate-900">{nomination.halaqahName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">المعلم المرشح:</span>
              <span className="font-bold text-slate-900">{nomination.teacherName}</span>
            </div>

            {/* If Passed Association Result */}
            {nomination.associationExam && (
              <>
                <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block text-[11px]">نتيجة اختبار الجمعية:</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {nomination.associationExam.score}% ({nomination.associationExam.gradeText})
                    </span>
                  </div>
                  {nomination.associationExam.certificateNumber && (
                    <div className="text-left">
                      <span className="text-slate-500 block text-[11px]">رقم الشهادة:</span>
                      <span className="font-mono font-bold text-amber-900 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {nomination.associationExam.certificateNumber}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Validation & Seals */}
          <div className="flex items-center justify-between pt-2 px-2 text-[11px] text-slate-600 font-semibold relative z-10">
            <div className="text-center space-y-1">
              <div className="text-emerald-800 font-bold">اعتماد المشرف التربوي</div>
              <div className="text-[10px] text-slate-400">
                {nomination.supervisorApproval?.approvedAt || 'معتمد رسمياً للنظام'}
              </div>
            </div>

            <div className="w-14 h-14 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center p-1 bg-emerald-50/50">
              <ShieldCheck className="w-8 h-8 text-emerald-700" />
            </div>

            <div className="text-center space-y-1">
              <div className="text-emerald-800 font-bold">ختم إدارة المجمع</div>
              <div className="text-[10px] text-slate-400">إدارة الشؤون التعليمية</div>
            </div>
          </div>
        </div>

        {/* Action Controls - Screen only */}
        <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة البطاقة الرسمية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
