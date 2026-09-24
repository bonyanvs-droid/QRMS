import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EducationalStage } from '../../types';
import {
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Info,
  ImageIcon,
} from 'lucide-react';

interface StageLogosManagementProps {
  className?: string;
}

export const StageLogosManagement: React.FC<StageLogosManagementProps> = ({ className = '' }) => {
  const { stages, updateStageLogo, currentUser } = useApp();
  const [selectedStageForPreview, setSelectedStageForPreview] = useState<EducationalStage | null>(null);
  const [activeUploadStageId, setActiveUploadStageId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDeleteStageId, setConfirmDeleteStageId] = useState<string | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const infoTooltipRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close tooltip on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (infoTooltipRef.current && !infoTooltipRef.current.contains(event.target as Node)) {
        setShowInfoTooltip(false);
      }
    }
    if (showInfoTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoTooltip]);

  // Verification of permissions: restricted to system_admin, campus_admin, admin
  const isAuthorized =
    currentUser && ['admin', 'system_admin', 'campus_admin'].includes(currentUser.role);

  if (!isAuthorized) {
    return null;
  }

  const triggerUploadForStage = (stageId: string) => {
    setActiveUploadStageId(stageId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadStageId) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ text: 'يرجى اختيار ملف صورة صالح (PNG, JPEG, SVG, WebP)', type: 'error' });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    const stage = stages.find((s) => s.id === activeUploadStageId);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        await updateStageLogo(activeUploadStageId, dataUrl, true);
        setStatusMessage({
          text: `تم حفظ واعتماد شعار (${stage?.name || 'المرحلة'}) وتفعيله بنجاح`,
          type: 'success',
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
      setActiveUploadStageId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleLogoActive = async (stage: EducationalStage) => {
    if (!stage.logoUrl) return;
    const nextState = stage.isLogoActive === false ? true : false;
    await updateStageLogo(stage.id, stage.logoUrl, nextState);
    setStatusMessage({
      text: nextState
        ? `تم تفعيل استخدام شعار (${stage.name}) في سياق المرحلة`
        : `تم تعطيل استخدام شعار (${stage.name}) مؤقتاً`,
      type: 'success',
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteLogo = async (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    await updateStageLogo(stageId, null, false);
    setConfirmDeleteStageId(null);
    setStatusMessage({
      text: `تم حذف شعار (${stage?.name || 'المرحلة'}) بنجاح`,
      type: 'success',
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-xs ${className}`}>
      {/* Hidden Global File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header section with Tooltip */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-teal-700" />
          </div>
          <div className="relative flex items-center gap-1.5" ref={infoTooltipRef}>
            <h3 className="text-base font-black text-slate-900">
              إدارة هوية المراحل التعليمية
            </h3>
            <button
              type="button"
              onClick={() => setShowInfoTooltip((prev) => !prev)}
              onMouseEnter={() => setShowInfoTooltip(true)}
              className="p-1 rounded-full text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
              title="تلميح ومعلومات"
              aria-label="تلميح ومعلومات عن إدارة هوية المراحل"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Interactive Tooltip for mobile & desktop */}
            {showInfoTooltip && (
              <div
                className="absolute top-full right-0 mt-2 z-50 w-72 sm:w-80 p-3.5 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-xl border border-slate-700 leading-relaxed animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2 mb-1 pb-1 border-b border-slate-800">
                  <span className="font-bold text-teal-400">هوية المراحل التعليمية</span>
                  <button
                    type="button"
                    onClick={() => setShowInfoTooltip(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p>
                  تخصيص وإدارة شعار كل مرحلة تعليمية بشكل ديناميكي كامل يتبع قاعدة البيانات والسياق، دون أي دمج عشوائي في الهيدر العام.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 shrink-0">
            {stages.length} مراحل
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`mt-4 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border border-rose-300 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Desktop View: Structured Stage Logos Table */}
      <div className="hidden md:block mt-5 overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <th className="py-3 px-4 rounded-r-xl">المرحلة التعليمية</th>
              <th className="py-3 px-4">الشعار المعتمد</th>
              <th className="py-3 px-4">حالة الشعار</th>
              <th className="py-3 px-4 text-left rounded-l-xl">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stages.map((stage) => {
              const hasLogo = Boolean(stage.logoUrl);
              const isActive = stage.isLogoActive !== false && hasLogo;

              return (
                <tr key={stage.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Stage Details */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          stage.accentColor === 'emerald'
                            ? 'bg-emerald-100 text-emerald-800'
                            : stage.accentColor === 'blue'
                            ? 'bg-blue-100 text-blue-800'
                            : stage.accentColor === 'purple'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{stage.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {stage.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {stage.ageRange} • {stage.subtitle}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Stage Logo Preview Cell */}
                  <td className="py-3.5 px-4">
                    {hasLogo ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                          <img
                            src={stage.logoUrl}
                            alt={stage.name}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5 opacity-40" />
                      </div>
                    )}
                  </td>

                  {/* Logo Status Cell */}
                  <td className="py-3.5 px-4">
                    {hasLogo ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLogoActive(stage)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="انقر لتفعيل أو تعطيل ظهور الشعار"
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✓ مفعّل</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>معطّل مؤقتاً</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">
                        — غير مضاف
                      </span>
                    )}
                  </td>

                  {/* Actions Cell */}
                  <td className="py-3.5 px-4 text-left">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* Preview Button */}
                      {hasLogo && (
                        <button
                          type="button"
                          onClick={() => setSelectedStageForPreview(stage)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                          title="معاينة الشعار بحجمه الطبيعي"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>معاينة</span>
                        </button>
                      )}

                      {/* Upload / Replace Button */}
                      <button
                        type="button"
                        onClick={() => triggerUploadForStage(stage.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          hasLogo
                            ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                            : 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                        }`}
                        title={hasLogo ? 'استبدال الشعار الحالي بصورة جديدة' : 'رفع شعار جديد لهذه المرحلة'}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{hasLogo ? 'استبدال' : 'رفع الشعار'}</span>
                      </button>

                      {/* Delete Button */}
                      {hasLogo && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStageId(stage.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف الشعار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Cards Layout */}
      <div className="md:hidden mt-4 space-y-3">
        {stages.map((stage) => {
          const hasLogo = Boolean(stage.logoUrl);
          const isActive = stage.isLogoActive !== false && hasLogo;

          return (
            <div
              key={stage.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3"
            >
              {/* Header: Stage info + Code */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      stage.accentColor === 'emerald'
                        ? 'bg-emerald-100 text-emerald-800'
                        : stage.accentColor === 'blue'
                        ? 'bg-blue-100 text-blue-800'
                        : stage.accentColor === 'purple'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{stage.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-mono">
                        {stage.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {stage.ageRange} • {stage.subtitle}
                    </div>
                  </div>
                </div>

                {/* Status indicator badge */}
                {hasLogo ? (
                  <button
                    type="button"
                    onClick={() => handleToggleLogoActive(stage)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>✓ مفعّل</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>معطّل</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-slate-400 text-[11px] font-medium shrink-0">
                    — غير مضاف
                  </span>
                )}
              </div>

              {/* Logo preview thumbnail & Action buttons row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-bold text-slate-500">الشعار:</div>
                  {hasLogo ? (
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shadow-2xs">
                      <img
                        src={stage.logoUrl}
                        alt={stage.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-200/60 border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-4 h-4 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {hasLogo && (
                    <button
                      type="button"
                      onClick={() => setSelectedStageForPreview(stage)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                      title="معاينة"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => triggerUploadForStage(stage.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      hasLogo
                        ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                        : 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{hasLogo ? 'استبدال' : 'رفع'}</span>
                  </button>

                  {hasLogo && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteStageId(stage.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف الشعار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {selectedStageForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedStageForPreview(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="font-bold text-sm text-slate-900">
                معاينة شعار {selectedStageForPreview.name}
              </span>
              <button
                onClick={() => setSelectedStageForPreview(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-44 h-44 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-center shadow-inner">
              <img
                src={selectedStageForPreview.logoUrl}
                alt={selectedStageForPreview.name}
                className="max-w-full max-h-full object-contain drop-shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="mt-4 text-xs text-slate-500">
              الحالة: {selectedStageForPreview.isLogoActive !== false ? '✓ مفعّل في السياق' : 'معطّل'}
            </div>

            <div className="flex gap-2 w-full mt-5">
              <button
                type="button"
                onClick={() => {
                  triggerUploadForStage(selectedStageForPreview.id);
                  setSelectedStageForPreview(null);
                }}
                className="flex-1 py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                استبدال الصورة
              </button>
              <button
                type="button"
                onClick={() => setSelectedStageForPreview(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDeleteStageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setConfirmDeleteStageId(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-black text-slate-900 mb-2">تأكيد حذف الشعار</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من حذف شعار المرحلة التعليمية؟ سيتم إزالته فوراً والعودة إلى حالة (غير مضاف).
            </p>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteStageId(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLogo(confirmDeleteStageId)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                نعم، احذف الشعار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
