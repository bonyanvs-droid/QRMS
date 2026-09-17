import React, { useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  Check,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  User,
  GraduationCap,
  Sparkles,
  Phone,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { UnifiedStudentFinancialRecord } from './FinancialManagementTab';
import { MosqueComplexTenant } from '../../types';

interface StudentPaymentReceiptModalProps {
  record: UnifiedStudentFinancialRecord;
  tenant: MosqueComplexTenant | null;
  footerNote?: string;
  onClose: () => void;
  onOpenPaymentModal?: (record: UnifiedStudentFinancialRecord) => void;
}

/**
 * تحويل الأرقام البسيطة إلى كلمات باللغة العربية (تفقيط)
 */
function tafqeetRiyal(amount: number): string {
  if (!amount || amount <= 0) return 'صفر ريال سعودي فقط لا غير';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertChunk(num: number): string {
    let result = '';
    const h = Math.floor(num / 100);
    const rem = num % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (rem > 0) {
      if (result) result += ' و';
      if (rem < 10) {
        result += units[rem];
      } else if (rem < 20) {
        result += teens[rem - 10];
      } else {
        const u = rem % 10;
        const t = Math.floor(rem / 10);
        if (u > 0) {
          result += units[u] + ' و' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const thousands = Math.floor(amount / 1000);
  const remainder = amount % 1000;

  let finalWords = '';

  if (thousands > 0) {
    if (thousands === 1) {
      finalWords = 'ألف';
    } else if (thousands === 2) {
      finalWords = 'ألفان';
    } else if (thousands >= 3 && thousands <= 10) {
      finalWords = convertChunk(thousands) + ' آلاف';
    } else {
      finalWords = convertChunk(thousands) + ' ألف';
    }
  }

  if (remainder > 0) {
    if (finalWords) finalWords += ' و';
    finalWords += convertChunk(remainder);
  }

  return finalWords ? `${finalWords} ريال سعودي فقط لا غير` : `${amount} ريال سعودي فقط لا غير`;
}

export const StudentPaymentReceiptModal: React.FC<StudentPaymentReceiptModalProps> = ({
  record,
  tenant,
  footerNote,
  onClose,
  onOpenPaymentModal,
}) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const complexName = tenant?.name || 'مجمع الغزاوي القرآني';
  const todayFormatted = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const todayGregorian = new Date().toISOString().split('T')[0];

  const primaryReceiptNumber =
    record.payments && record.payments.length > 0
      ? record.payments[record.payments.length - 1].receiptNumber || `REC-${record.studentId.slice(-4)}`
      : `REC-${record.studentId.slice(-4)}`;

  const totalRequired = record.baseTuition - record.discountAmount - record.scholarshipAmount;
  const isFullyPaid = record.remainingAmount <= 0;

  // طباعة الإيصال عبر أمر الطباعة المنسق
  const handlePrint = () => {
    window.print();
  };

  // نسخ ملخص السند للمشاركة
  const handleCopyText = () => {
    const summaryText = `*سند قبض مالي - ${complexName}*
------------------------------
👤 الطالب: ${record.studentName}
📖 الحلقة: ${record.halaqahName} (${record.grade})
📦 باقة الاشتراك: ${record.packageLabel}
💰 إجمالي الرسوم: ${totalRequired.toLocaleString()} ر.س
✅ إجمالي المسدد: ${record.paidAmount.toLocaleString()} ر.س
⌛ المتبقي: ${record.remainingAmount.toLocaleString()} ر.س
📊 حالة السداد: ${isFullyPaid ? 'مسدد بالكامل' : 'مسدد جزئياً'}
📝 عدد الدفعات: ${record.payments?.length || 1} دفعة
------------------------------
صدر بتاريخ: ${todayGregorian}
القسم المالي والتحصيل`;

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // إرسال واتساب لولي الأمر
  const handleSendWhatsapp = () => {
    if (!record.parentPhone) return;
    const cleanPhone = record.parentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`السلام عليكم ورحمة الله وبركاته،
نفيدكم بصدور سند سداد الرسوم للطالب: *${record.studentName}*
🏫 ${complexName} - القسم المالي والتحصيل

📦 باقة الاشتراك: ${record.packageLabel}
💰 الرسوم المقررة: ${totalRequired.toLocaleString()} ر.س
✅ إجمالي المسدد حتى تاريخه: ${record.paidAmount.toLocaleString()} ر.س
⌛ المتبقي في الذمة: ${record.remainingAmount.toLocaleString()} ر.س
🏷️ حالة الحساب: ${isFullyPaid ? 'مسدد بالكامل' : 'مسدد جزئياً'}

شاكرين ومقدرين حرصكم واهتمامكم.`);

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 md:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container Box */}
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 my-auto print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">إيصال سداد رسوم معتمد</h3>
              <p className="text-[11px] text-slate-300">القسم المالي والتحصيل • مجمع الحلقات</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الإيصال</span>
            </button>

            {record.parentPhone && (
              <button
                onClick={handleSendWhatsapp}
                className="px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-700 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="إرسال لواتساب ولي الأمر"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">واتساب</span>
              </button>
            )}

            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="نسخ ملخص السند"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCopied ? 'تم النسخ' : 'مشاركة'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* PRINTABLE RECEIPT CONTENT */}
        {/* ============================================================= */}
        <div ref={receiptRef} className="p-6 md:p-8 space-y-6 text-slate-900 bg-white" dir="rtl">
          {/* 1. Header Banner */}
          <div className="border-b-2 border-emerald-800/20 pb-5">
            <div className="flex items-start justify-between gap-4">
              {/* Complex Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-black text-xs shadow-xs">
                    ق
                  </div>
                  <h2 className="text-lg font-black text-emerald-900 tracking-tight">{complexName}</h2>
                </div>
                <p className="text-xs font-bold text-slate-600">القسم المالي والتحصيل • وحدة الإيرادات والرسوم</p>
                <p className="text-[11px] text-slate-700">المملكة العربية السعودية</p>
              </div>

              {/* Receipt Number & Date */}
              <div className="text-left space-y-1 bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-2xl min-w-[170px]">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  سند قبض مالي رسمي
                </div>
                <div className="text-xs font-mono font-black text-slate-900">{primaryReceiptNumber}</div>
                <div className="text-[10px] text-slate-700">{todayGregorian}م</div>
                <div className="text-[10px] text-emerald-700 font-bold">{todayFormatted}</div>
              </div>
            </div>
          </div>

          {/* 2. Student Info Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-700 font-bold block mb-0.5">اسم الطالب:</span>
              <span className="font-bold text-slate-900 text-sm">{record.studentName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-700 font-bold block mb-0.5">الحلقة والمرحلة:</span>
              <span className="font-semibold text-slate-800">
                {record.halaqahName} • {record.grade}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-700 font-bold block mb-0.5">باقة الاشتراك:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md text-[11px]">
                <Sparkles className="w-2.5 h-2.5" />
                {record.packageLabel}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-700 font-bold block mb-0.5">العام الدراسي:</span>
              <span className="font-semibold text-slate-800">{record.academicYear || '1446-1447هـ'}</span>
            </div>
          </div>

          {/* 3. Financial Breakdown Summary */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-700 font-bold block">إجمالي المطلوب</span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {totalRequired.toLocaleString()} ر.س
              </span>
              {record.discountAmount > 0 && (
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  (خصم: {record.discountAmount.toLocaleString()} ر.س)
                </span>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-emerald-800 font-bold block">إجمالي المسدد</span>
              <span className="text-base font-black text-emerald-700 mt-0.5 block">
                {record.paidAmount.toLocaleString()} ر.س
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">
                {isFullyPaid ? 'سداد كامل' : 'سداد جزئي'}
              </span>
            </div>

            <div
              className={`rounded-2xl p-3 text-center border ${
                record.remainingAmount > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <span className="text-[11px] font-bold block">المتبقي في الذمة</span>
              <span className="text-base font-black mt-0.5 block">
                {record.remainingAmount.toLocaleString()} ر.س
              </span>
              <span className="text-[10px] block mt-0.5 font-bold">
                {record.remainingAmount === 0 ? 'لا يوجد متبقي' : 'مستحق السداد'}
              </span>
            </div>
          </div>

          {/* 4. Tafqeet Text Banner */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2.5 text-xs text-amber-950 flex items-center justify-between gap-3">
            <div className="font-bold flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-700 shrink-0" />
              <span>المبلغ المقبوض كتابةً:</span>
              <span className="text-amber-900 underline decoration-amber-300 font-black">
                {tafqeetRiyal(record.paidAmount)}
              </span>
            </div>
            <div className="text-[10px] font-bold text-amber-800 shrink-0">
              عدد الدفعات: {record.payments && record.payments.length > 0 ? record.payments.length : 1}
            </div>
          </div>

          {/* 5. Payments History Table (بيان الدفعات) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>بيان تفاصيل الدفعات المسجلة بالسند:</span>
              </h4>
              <span className="text-[10px] text-slate-700">
                {record.payments && record.payments.length > 1
                  ? `مجموع ${record.payments.length} دفعات مسددة`
                  : 'دفعة سداد واحدة'}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">رقم السند</th>
                    <th className="py-2.5 px-3">تاريخ التحصيل</th>
                    <th className="py-2.5 px-3">طريقة الدفع</th>
                    <th className="py-2.5 px-3">المبلغ المسدد</th>
                    <th className="py-2.5 px-3">المستلم / المحصل</th>
                    <th className="py-2.5 px-3">البيان والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!record.payments || record.payments.length === 0 ? (
                    <tr>
                      <td className="py-2.5 px-3 font-mono">1</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{primaryReceiptNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{todayGregorian}</td>
                      <td className="py-2.5 px-3 text-slate-700">نقدي</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {record.paidAmount.toLocaleString()} ر.س
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">القسم المالي</td>
                      <td className="py-2.5 px-3 text-slate-700 text-[11px]">سداد رسوم اشتراك الفصل</td>
                    </tr>
                  ) : (
                    record.payments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-slate-700">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">
                          {p.receiptNumber || `REC-${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{p.date}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {p.paymentMethod === 'cash'
                            ? 'نقدي'
                            : p.paymentMethod === 'bank_transfer'
                            ? 'تحويل بنكي'
                            : p.paymentMethod === 'online'
                            ? 'دفع إلكتروني'
                            : p.paymentMethod || 'نقدي'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          {p.amount.toLocaleString()} ر.س
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {p.recordedBy || 'أمين الصندوق'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 text-[11px] max-w-[140px] truncate">
                          {p.notes || 'سداد رسوم دراسية'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/70 font-black text-emerald-950 border-t-2 border-emerald-200 text-xs">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      إجمالي المبالغ المسددة في هذا الإيصال:
                    </td>
                    <td className="py-2.5 px-3 text-emerald-800 text-sm font-black">
                      {record.paidAmount.toLocaleString()} ر.س
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-[11px] text-emerald-700 font-bold">
                      {isFullyPaid ? 'تم تسديد كامل الرسوم المستحقة ✓' : `المتبقي: ${record.remainingAmount.toLocaleString()} ر.س`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 6. Official Stamp & Signatures */}
          <div className="pt-3 border-t border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
              {/* Note */}
              <div className="sm:col-span-2 space-y-1 text-slate-700 text-[11px]">
                <p className="font-bold text-slate-800">
                  {footerNote || 'سند مالي رسمي معتمد إلكترونياً من إدارة مجمع الغزاوي القرآني.'}
                </p>
                <p className="text-[10px] text-slate-700">
                  * هذا السند يثبت العمليات المالية المقيدة بحساب الطالب حتى تاريخ الإصدار، ويُعتد به كإشعار رسمي.
                </p>
              </div>

              {/* Stamp Graphic */}
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-center p-1 text-emerald-800 rotate-[-8deg] shadow-2xs">
                  <span className="text-[8px] font-black uppercase tracking-wider">سند معتمد</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-700 my-0.5" />
                  <span className="text-[7px] font-bold">القسم المالي</span>
                </div>
                <span className="text-[9px] font-bold text-slate-700 mt-1">الختم المالي المعتمد</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions (Hidden on Print) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-700">
            حالة الحساب:{' '}
            <span
              className={`font-bold ${
                isFullyPaid ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isFullyPaid ? 'مسدد بالكامل' : 'مسدد جزئياً (يوجد متبقي)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {record.remainingAmount > 0 && onOpenPaymentModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPaymentModal(record);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>تسديد دفعة إضافية</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
