import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { EducationalStage } from '../../types';
import {
  Layers,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  Users,
  Shield,
  X,
  Plus,
  RefreshCw,
  AlertTriangle,
  Upload,
  Eye,
  ImageIcon,
  Power,
} from 'lucide-react';
import { SURAHS_LIST } from '../../data/initialData';

export const EducationalStagesTab: React.FC = () => {
  const { stages, addStage, updateStage, deleteStage, updateStageLogo, students, halaqahs } = useApp();
  const [editingStage, setEditingStage] = useState<EducationalStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<EducationalStage | null>(null);
  const [previewLogoStage, setPreviewLogoStage] = useState<EducationalStage | null>(null);
  const [activeUploadStageId, setActiveUploadStageId] = useState<string | null>(null);
  const [gradesInput, setGradesInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const createDefaultStage = (): EducationalStage => ({
    id: `stage_${Date.now()}`,
    code: `STAGE_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    name: '',
    subtitle: '',
    ageRange: '',
    targetGrades: [],
    curriculumFocus: '',
    defaultTargetSurah: 'الغاشية',
    accentColor: 'emerald',
    iconName: 'Layers',
    order: stages.length + 1,
    isActive: true,
    traits: [],
    outcomeSummary: '',
    targetQuranAmount: '',
    isLogoActive: true,
  });

  const handleOpenCreate = () => {
    setIsCreating(true);
    setEditingStage(createDefaultStage());
    setGradesInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stage: EducationalStage) => {
    setIsCreating(false);
    setEditingStage({ ...stage });
    setGradesInput((stage.targetGrades || []).join('، '));
    setIsModalOpen(true);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStage || !editingStage.name.trim()) return;

    const parsedGrades = gradesInput
      .split(/[,،\n]/)
      .map((g) => g.trim())
      .filter(Boolean);

    const stageToSave: EducationalStage = {
      ...editingStage,
      targetGrades: parsedGrades.length > 0 ? parsedGrades : editingStage.targetGrades,
    };

    if (isCreating) {
      await addStage(stageToSave);
      showToast(`تمت إضافة مرحلة (${stageToSave.name}) بنجاح`);
    } else {
      await updateStage(stageToSave);
      showToast(`تم حفظ تعديلات مرحلة (${stageToSave.name}) بنجاح`);
    }

    setIsModalOpen(false);
    setEditingStage(null);
  };

  const handleDeleteStage = async (stage: EducationalStage) => {
    await deleteStage(stage.id);
    setConfirmDeleteStage(null);
    showToast(`تم حذف مرحلة (${stage.name}) بنجاح`);
  };

  // Logo handlers
  const triggerUploadLogo = (stageId: string) => {
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
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPEG, SVG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (isModalOpen && editingStage && editingStage.id === activeUploadStageId) {
          setEditingStage({
            ...editingStage,
            logoUrl: dataUrl,
            isLogoActive: true,
          });
        }
        await updateStageLogo(activeUploadStageId, dataUrl, true);
        const stage = stages.find((s) => s.id === activeUploadStageId);
        showToast(`تم حفظ واعتماد شعار (${stage?.name || 'المرحلة'}) بنجاح`);
      }
      setActiveUploadStageId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleLogoActive = async (stage: EducationalStage) => {
    if (!stage.logoUrl) return;
    const nextState = stage.isLogoActive === false ? true : false;
    await updateStageLogo(stage.id, stage.logoUrl, nextState);
    showToast(
      nextState
        ? `تم تفعيل ظهور شعار (${stage.name}) في النظام`
        : `تم تعطيل ظهور شعار (${stage.name}) مؤقتاً`
    );
  };

  const handleDeleteLogo = async (stageId: string) => {
    await updateStageLogo(stageId, null, false);
    if (editingStage && editingStage.id === stageId) {
      setEditingStage({
        ...editingStage,
        logoUrl: undefined,
        isLogoActive: false,
      });
    }
    const stage = stages.find((s) => s.id === stageId);
    showToast(`تم حذف شعار (${stage?.name || 'المرحلة'}) بنجاح`);
  };

  return (
    <div className="space-y-6">
      {/* Hidden Global File Input for Logo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-black">
              إدارة هوية المراحل التعليمية
            </h3>
          </div>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
            تعريف وتنظيم المراحل الدراسية المعتمدة في المجمع وإدارة هويتها البصرية وشعاراتها وربط كل مرحلة بحلقاتها ومسارها التعليمي.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 font-black text-slate-950 transition-all cursor-pointer shadow-md active:scale-95"
            title="إضافة مرحلة دراسية جديدة"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>+ إضافة مرحلة دراسية</span>
          </button>
          <span className="text-xs px-3.5 py-2.5 rounded-xl bg-emerald-800/80 border border-emerald-500/40 font-bold text-emerald-200">
            {stages.filter((s) => s.isActive).length} مراحل مفعلة
          </span>
        </div>
      </div>

      {/* Stages Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stages.map((stage) => {
          const stageStudents = students.filter(
            (s) => s.stageId === stage.id || (!s.stageId && stage.id === 'baraem')
          );
          const stageHalaqahs = halaqahs.filter((h) => (h as any).stageId === stage.id);
          const hasLogo = Boolean(stage.logoUrl);
          const isLogoActive = stage.isLogoActive !== false;

          return (
            <div
              key={stage.id}
              className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                stage.isActive
                  ? 'border-slate-200 hover:border-emerald-300 shadow-xs'
                  : 'border-dashed border-slate-300 bg-slate-50/70 opacity-85'
              }`}
            >
              <div>
                {/* Header: Stage Info & Logo with Integrated Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3.5">
                    {/* Stage Logo Box */}
                    <div className="relative group shrink-0">
                      {hasLogo ? (
                        <div
                          className={`w-13 h-13 rounded-2xl bg-white border p-1 flex items-center justify-center overflow-hidden shadow-2xs transition-all ${
                            isLogoActive ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-300 opacity-60 grayscale'
                          }`}
                        >
                          <img
                            src={stage.logoUrl}
                            alt={stage.name}
                            className="w-full h-full object-contain cursor-pointer"
                            referrerPolicy="no-referrer"
                            onClick={() => setPreviewLogoStage(stage)}
                            title="انقر للمعاينة بحجم أكبر"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                            stage.accentColor === 'emerald'
                              ? 'bg-emerald-100 text-emerald-800'
                              : stage.accentColor === 'blue'
                              ? 'bg-blue-100 text-blue-800'
                              : stage.accentColor === 'purple'
                              ? 'bg-purple-100 text-purple-800'
                              : stage.accentColor === 'teal'
                              ? 'bg-teal-100 text-teal-800'
                              : stage.accentColor === 'indigo'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <Layers className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-slate-900">{stage.name}</h4>
                        {stage.isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            مفعلة
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                            قيد التجهيز
                          </span>
                        )}
                        {hasLogo ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${
                              isLogoActive
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isLogoActive ? 'شعار نشط' : 'شعار معطل'}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                            بدون شعار
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{stage.subtitle || 'لا يوجد وصف فرعي'}</p>
                    </div>
                  </div>

                  {/* Primary Stage Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(stage)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      title="تعديل بيانات وضبط المرحلة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteStage(stage)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="حذف المرحلة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Logo Quick Actions Strip */}
                <div className="flex items-center justify-between gap-2 p-2 mb-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>الهوية والشعار:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => triggerUploadLogo(stage.id)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-teal-800 hover:bg-teal-50 font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      title={hasLogo ? 'استبدال الشعار بصورة جديدة' : 'رفع شعار للمرحلة'}
                    >
                      <Upload className="w-3 h-3 text-teal-600" />
                      <span>{hasLogo ? 'استبدال' : 'رفع شعار'}</span>
                    </button>

                    {hasLogo && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewLogoStage(stage)}
                          className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-all cursor-pointer shadow-2xs"
                          title="معاينة الشعار"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLogoActive(stage)}
                          className={`p-1 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                            isLogoActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={isLogoActive ? 'تعطيل ظهور الشعار' : 'تفعيل ظهور الشعار'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLogo(stage.id)}
                          className="p-1 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shadow-2xs"
                          title="حذف الشعار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-2.5 py-2.5 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">الفئة العمرية:</span>
                    <span className="font-bold text-slate-800">{stage.ageRange || '—'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">الصفوف المستهدفة:</span>
                    <div className="flex flex-wrap gap-1">
                      {stage.targetGrades && stage.targetGrades.length > 0 ? (
                        stage.targetGrades.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                          >
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-[11px]">جميع الصفوف</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">المقدار القرآني المستهدف:</span>
                    <span className="font-black text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      {stage.targetQuranAmount || `سورة ${stage.defaultTargetSurah || 'الغاشية'}`}
                    </span>
                  </div>

                  {stage.outcomeSummary && (
                    <div className="mt-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100/80">
                      <span className="text-[11px] font-black text-emerald-900 block mb-1">
                        نص المخرج التربوي والقرآني المعتمد:
                      </span>
                      <p className="text-emerald-950 font-medium text-[11px] leading-relaxed">
                        «{stage.outcomeSummary}»
                      </p>
                    </div>
                  )}

                  {stage.traits && stage.traits.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        سمات ومخرجات الطالب في المرحلة:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                        {stage.traits.map((trait, tIdx) => (
                          <div
                            key={tIdx}
                            className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold">{trait}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 block mb-0.5 font-medium">التركيز المنهجي والتربوي:</span>
                    <p className="text-slate-700 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px] leading-relaxed">
                      {stage.curriculumFocus || 'منهج مخصص للحفظ والمراجعة والقيم'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer / Statistics */}
              <div className="flex items-center justify-between mt-3 pt-2 text-xs border-t border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>الطلاب المقيدون:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">{stageStudents.length} طالباً</span>
                  {stageHalaqahs.length > 0 && (
                    <span className="text-[11px] text-slate-500">({stageHalaqahs.length} حلقات)</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Stage Modal */}
      {isModalOpen && editingStage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {isCreating ? 'إضافة مرحلة دراسية جديدة' : 'تعديل ضبط المرحلة التعليمية'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isCreating ? 'إدخال بيانات وخصائص المرحلة الجديدة' : editingStage.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStage} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4 text-xs">
                {/* Logo Section in Modal */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block font-black text-slate-800 mb-2">هوية وشعار المرحلة</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {editingStage.logoUrl ? (
                        <img
                          src={editingStage.logoUrl}
                          alt={editingStage.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => triggerUploadLogo(editingStage.id)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-800 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-teal-600" />
                          <span>{editingStage.logoUrl ? 'تغيير الشعار' : 'رفع شعار'}</span>
                        </button>
                        {editingStage.logoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingStage({
                                ...editingStage,
                                logoUrl: undefined,
                                isLogoActive: false,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            حذف الشعار
                          </button>
                        )}
                      </div>
                      {editingStage.logoUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="modalLogoActiveCheckbox"
                            checked={editingStage.isLogoActive !== false}
                            onChange={(e) =>
                              setEditingStage({ ...editingStage, isLogoActive: e.target.checked })
                            }
                            className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                          />
                          <label
                            htmlFor="modalLogoActiveCheckbox"
                            className="text-[11px] font-bold text-slate-700 cursor-pointer"
                          >
                            تفعيل ظهور هذا الشعار في صفحات المرحلة
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم المرحلة *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مرحلة الفتيان"
                      value={editingStage.name}
                      onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رمز المرحلة (الكود)</label>
                    <input
                      type="text"
                      placeholder="مثال: FETIAN"
                      value={editingStage.code}
                      onChange={(e) => setEditingStage({ ...editingStage, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوصف الفرعي</label>
                  <input
                    type="text"
                    placeholder="مثال: المرحلة المتوسطة وتأسيس الحفظ"
                    value={editingStage.subtitle}
                    onChange={(e) => setEditingStage({ ...editingStage, subtitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الفئة العمرية</label>
                    <input
                      type="text"
                      placeholder="مثال: 11 - 14 سنة"
                      value={editingStage.ageRange}
                      onChange={(e) => setEditingStage({ ...editingStage, ageRange: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">لون التمييز</label>
                    <select
                      value={editingStage.accentColor}
                      onChange={(e) =>
                        setEditingStage({ ...editingStage, accentColor: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                    >
                      <option value="emerald">أخضر زمردي (Emerald)</option>
                      <option value="teal">سماوي تيل (Teal)</option>
                      <option value="blue">أزرق بحري (Blue)</option>
                      <option value="purple">بنفسجي ملكي (Purple)</option>
                      <option value="amber">عنبري دافئ (Amber)</option>
                      <option value="indigo">نيلي (Indigo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الصفوف المستهدفة (مفصولة بفاصلة)</label>
                  <input
                    type="text"
                    placeholder="مثال: أول متوسط، ثاني متوسط، ثالث متوسط"
                    value={gradesInput}
                    onChange={(e) => setGradesInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">السورة المرجعية</label>
                    <select
                      value={editingStage.defaultTargetSurah}
                      onChange={(e) =>
                        setEditingStage({ ...editingStage, defaultTargetSurah: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white"
                    >
                      {SURAHS_LIST.map((surah) => (
                        <option key={surah.name} value={surah.name}>
                          سورة {surah.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">المقدار القرآني المستهدف</label>
                    <input
                      type="text"
                      value={editingStage.targetQuranAmount || ''}
                      onChange={(e) => setEditingStage({ ...editingStage, targetQuranAmount: e.target.value })}
                      placeholder="مثال: 5 أجزاء، إلى سورة الملك..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نص المخرج التربوي والقرآني المعتمد (الفقرة الشاملة)</label>
                  <textarea
                    rows={2}
                    value={editingStage.outcomeSummary || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, outcomeSummary: e.target.value })}
                    placeholder="النص الكامل لمخرج الطالب عند تخرجه من هذه المرحلة..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سمات ومخرجات الطالب (مفصولة بأسطر)</label>
                  <textarea
                    rows={3}
                    value={(editingStage.traits || []).join('\n')}
                    onChange={(e) =>
                      setEditingStage({
                        ...editingStage,
                        traits: e.target.value
                          .split('\n')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="متقن لقواعد التجويد&#10;يحفظ الأجزاء المقررة&#10;متحلٍ بالخلق القرآني..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">التركيز المنهجي والتربوي</label>
                  <textarea
                    rows={2}
                    value={editingStage.curriculumFocus}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, curriculumFocus: e.target.value })
                    }
                    placeholder="بيان المنهج والتركيز الأساسي لهذه المرحلة..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="stageActiveCheckbox"
                    checked={editingStage.isActive}
                    onChange={(e) => setEditingStage({ ...editingStage, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="stageActiveCheckbox" className="font-bold text-slate-800 cursor-pointer">
                    تفعيل هذه المرحلة بالمنظومة
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 shrink-0 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 cursor-pointer"
                >
                  إلغاء وخروج
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {isCreating ? 'إضافة المرحلة' : 'حفظ إعدادات المرحلة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Logo Modal */}
      {previewLogoStage && previewLogoStage.logoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewLogoStage(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900">شعار {previewLogoStage.name}</h4>
              <button
                type="button"
                onClick={() => setPreviewLogoStage(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-48 h-48 mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
              <img
                src={previewLogoStage.logoUrl}
                alt={previewLogoStage.name}
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-xs text-slate-500 mb-4">{previewLogoStage.subtitle || previewLogoStage.name}</p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const stageId = previewLogoStage.id;
                  setPreviewLogoStage(null);
                  triggerUploadLogo(stageId);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استبدال الشعار</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewLogoStage(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Stage Modal */}
      {confirmDeleteStage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setConfirmDeleteStage(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">تأكيد حذف المرحلة التعليمية</h4>
                <p className="text-xs text-rose-700 font-bold">{confirmDeleteStage.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              هل أنت متأكد من حذف هذه المرحلة التعليمية بالكامل؟ سيتم إزالتها من قاعدة البيانات.
            </p>

            {students.some((s) => s.stageId === confirmDeleteStage.id) && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] mb-4">
                ⚠️ تنبيه: يوجد طلاب مقيدون بهذه المرحلة حالياً. يفضل تعديل انتسابهم أو إعادة توجيههم قبل الحذف.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteStage(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStage(confirmDeleteStage)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                نعم، احذف المرحلة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
