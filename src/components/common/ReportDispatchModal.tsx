import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Share2, Copy, Check, ExternalLink, MessageCircle, X } from 'lucide-react';
import { createWhatsAppUrl } from '../../utils/reportGenerator';

interface ReportDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  reportContent: string;
  recipientName: string;
  recipientPhone?: string;
  recipientType: 'parent' | 'teacher' | 'general_group' | 'prep_week';
  reportType: 'daily' | 'weekly' | 'monthly' | 'general' | 'prep';
  studentId?: string;
  teacherId?: string;
}

export const ReportDispatchModal: React.FC<ReportDispatchModalProps> = ({
  isOpen,
  onClose,
  title,
  reportContent,
  recipientName,
  recipientPhone,
  recipientType,
  reportType,
  studentId,
  teacherId,
}) => {
  const { addReportLog } = useApp();
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (recipientPhone) {
      const url = createWhatsAppUrl(recipientPhone, reportContent);
      window.open(url, '_blank');
    } else {
      // General group without single phone
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportContent)}`;
      window.open(url, '_blank');
    }

    // Log the dispatched report
    const logPayload: any = {
      recipientType,
      recipientName,
      reportType,
      title,
      content: reportContent,
      status: 'sent',
    };
    if (recipientPhone) logPayload.recipientPhone = recipientPhone;
    if (studentId) logPayload.studentId = studentId;
    if (teacherId) logPayload.teacherId = teacherId;

    addReportLog(logPayload);

    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header — unified emerald bar matching the platform's modal identity */}
        <div className="-mx-6 -mt-6 mb-4 px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-bold text-white line-clamp-1">{title}</h3>
              <p className="text-[11px] text-emerald-100 mt-0.5 truncate">
                المستلم: <strong>{recipientName}</strong> {recipientPhone ? `(${recipientPhone})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-xs shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="mt-4 flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs md:text-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
          {reportContent}
        </div>

        {sentSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>تم توجيه التقرير للواتساب وتسجيل العملية في سجل التقارير بنجاح!</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ للحافظة' : 'نسخ النص'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال عبر الواتساب</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
