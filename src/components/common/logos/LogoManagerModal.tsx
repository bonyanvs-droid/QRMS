import React, { useRef, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { MosqueLogo } from './MosqueLogo';
import { StageLogosManagement } from '../../admin/StageLogosManagement';
import {
  Image as ImageIcon,
  Upload,
  RefreshCw,
  CheckCircle2,
  X,
  Building2,
  Layers,
} from 'lucide-react';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    mosqueLogoUrl,
    setMosqueLogoUrl,
    activeTenant,
    resetLogos,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'mosque' | 'stages'>('mosque');
  const mosqueInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dragOverMosque, setDragOverMosque] = useState(false);

  // Strictly restricted to administrative roles
  const isAllowedAdmin =
    currentUser && ['admin', 'system_admin', 'campus_admin'].includes(currentUser.role);
  if (!isOpen || !isAllowedAdmin) return null;

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPEG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setMosqueLogoUrl(result);
      setSuccessMessage('تم اعتماد وتحديث شعار المجمع الرسمي بنجاح!');
      setTimeout(() => setSuccessMessage(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const tenantName = activeTenant?.name || 'مجمع مسجد الغزاوي القرآني';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-900">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                إدارة الهوية البصرية والشعارات
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                فصل حقيقي بين هوية المجمع الرسمية وشعارات المراحل التعليمية المستندة لقاعدة البيانات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('mosque')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mosque'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>١. هوية المجمع الأساسية (شعار المسجد)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stages'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span>٢. هوية المراحل التعليمية (شعارات المراحل)</span>
          </button>
        </div>

        {successMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Mosque Primary Identity */}
        {activeTab === 'mosque' && (
          <div className="mt-5 space-y-4">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">🕌</span>
              <div className="leading-relaxed">
                <strong>الشعار الرسمي العام:</strong> شعار المجمع هو الهوية الأساسية الثابتة التي تظهر لجميع الزوار والمستخدمين ومديري المجمع في الهيدر وصفحات تسجيل الدخول.
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverMosque(true);
              }}
              onDragLeave={() => setDragOverMosque(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverMosque(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-4 ${
                dragOverMosque
                  ? 'border-amber-500 bg-amber-100/60 scale-[1.01]'
                  : mosqueLogoUrl
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  شعار: {tenantName}
                </span>
                {mosqueLogoUrl ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>شعار مخصص معتمد</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-800 font-medium">الشعار الافتراضي للنظام</span>
                )}
              </div>

              <div className="w-36 h-36 flex items-center justify-center p-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <MosqueLogo size="xl" />
              </div>

              <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                {mosqueLogoUrl
                  ? 'يتم استخدام هذا الشعار في كافة التقارير الرسمية، الترويسة الرئيسية، وبوابة الدخول.'
                  : 'اسحب ملف شعار المسجد الجديد هنا أو انقر على الزر أدناه لتحديده من جهازك.'}
              </p>

              <div className="flex items-center justify-center gap-2 w-full max-w-sm pt-2">
                <input
                  type="file"
                  ref={mosqueInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => mosqueInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{mosqueLogoUrl ? 'استبدال شعار المجمع' : 'رفع شعار مخصص للمجمع'}</span>
                </button>
                {mosqueLogoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setMosqueLogoUrl(null);
                      setSuccessMessage('تم استعادة الشعار الافتراضي');
                      setTimeout(() => setSuccessMessage(null), 2500);
                    }}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    title="استعادة الشعار الافتراضي"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stages Identity Architecture */}
        {activeTab === 'stages' && (
          <div className="mt-5">
            <StageLogosManagement />
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {mosqueLogoUrl && (
            <button
              onClick={() => {
                resetLogos();
                setSuccessMessage('تم مسح الشعار المخصص واستعادة الوضع الأصلي');
                setTimeout(() => setSuccessMessage(null), 2500);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>استعادة ضبط شعار المجمع الأصلي</span>
            </button>
          )}
          <div className="sm:mr-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
