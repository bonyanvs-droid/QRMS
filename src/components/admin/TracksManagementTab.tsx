import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrackDefinition, TrackRubricItem } from '../../types';
import {
  BookOpen,
  Sparkles,
  Award,
  BookCheck,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sliders,
  Check,
  Shield,
} from 'lucide-react';

export const TracksManagementTab: React.FC = () => {
  const {
    tracks,
    saveTrack,
    deleteTrack,
    deleteAllTracks,
    seedDefaultTracksToDb,
    activeTenantId,
    activeTenant,
    currentUser,
  } = useApp();
  const [selectedTrack, setSelectedTrack] = useState<TrackDefinition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewTrack, setIsNewTrack] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteConfirmTrack, setDeleteConfirmTrack] = useState<TrackDefinition | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Modal form state
  const [formData, setFormData] = useState<TrackDefinition>({
    id: '',
    code: '',
    name: '',
    shortName: '',
    description: '',
    icon: 'BookOpen',
    colorScheme: 'emerald',
    isActive: true,
    order: 5,
    nominationConfig: {
      requiresInternalExam: true,
      passingScore: 85,
      rubricItems: [
        { id: 'item_1', label: 'جودة الحفظ والإتقان', maxScore: 50 },
        { id: 'item_2', label: 'التطبيق العملي للأحكام', maxScore: 30 },
        { id: 'item_3', label: 'حسن الأداء والطلاقة', maxScore: 20 },
      ],
      branchesOrLevels: ['المستوى الأول', 'المستوى الثاني'],
    },
  });

  const [newBranchInput, setNewBranchInput] = useState('');

  const handleOpenAddModal = () => {
    setIsNewTrack(true);
    setFormData({
      id: `track_custom_${Date.now()}`,
      tenantId: activeTenantId,
      code: 'CUSTOM',
      name: '',
      shortName: '',
      description: '',
      icon: 'BookCheck',
      colorScheme: 'indigo',
      isActive: true,
      order: tracks.length + 1,
      nominationConfig: {
        requiresInternalExam: true,
        passingScore: 85,
        rubricItems: [
          { id: 'item_1', label: 'جودة الحفظ والإتقان', maxScore: 50 },
          { id: 'item_2', label: 'التطبيق العملي للأحكام', maxScore: 30 },
          { id: 'item_3', label: 'حسن الأداء والطلاقة', maxScore: 20 },
        ],
        branchesOrLevels: ['المستوى الأول', 'المستوى الثاني'],
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (track: TrackDefinition) => {
    setIsNewTrack(false);
    setFormData(JSON.parse(JSON.stringify(track)));
    setIsModalOpen(true);
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await saveTrack(formData);
    setIsModalOpen(false);
  };

  const handleDeletePrompt = (track: TrackDefinition) => {
    setDeleteConfirmTrack(track);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTrack) return;
    setIsDeleting(true);
    try {
      await deleteTrack(deleteConfirmTrack.id);
      if (isModalOpen && formData.id === deleteConfirmTrack.id) {
        setIsModalOpen(false);
      }
      setDeleteConfirmTrack(null);
      setRestoreMessage(`تم حذف مسار «${deleteConfirmTrack.name}» بنجاح.`);
      setTimeout(() => setRestoreMessage(null), 4000);
    } catch (err) {
      console.error('Error deleting track:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCommitDefaultsToDb = async () => {
    setIsSeeding(true);
    setRestoreMessage(null);
    try {
      await seedDefaultTracksToDb();
      setRestoreMessage('تم نقل واعتماد المسارات الافتراضية الأربعة في قاعدة البيانات بنجاح.');
      setTimeout(() => setRestoreMessage(null), 4500);
    } catch (err) {
      console.error('Commit defaults error:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllTracks();
      setIsDeleteAllConfirmOpen(false);
      setRestoreMessage('تم حذف جميع المسارات نهائياً من قاعدة البيانات والواجهة.');
      setTimeout(() => setRestoreMessage(null), 4500);
    } catch (err) {
      console.error('Delete all error:', err);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleAddRubricItem = () => {
    setFormData((prev) => ({
      ...prev,
      nominationConfig: {
        ...prev.nominationConfig,
        rubricItems: [
          ...prev.nominationConfig.rubricItems,
          {
            id: `item_${Date.now()}`,
            label: 'بند تقييم جديد',
            maxScore: 10,
          },
        ],
      },
    }));
  };

  const handleRemoveRubricItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      nominationConfig: {
        ...prev.nominationConfig,
        rubricItems: prev.nominationConfig.rubricItems.filter((i) => i.id !== id),
      },
    }));
  };

  const handleUpdateRubricItem = (id: string, updates: Partial<TrackRubricItem>) => {
    setFormData((prev) => ({
      ...prev,
      nominationConfig: {
        ...prev.nominationConfig,
        rubricItems: (prev.nominationConfig?.rubricItems || []).map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const handleAddBranch = () => {
    if (!newBranchInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      nominationConfig: {
        ...prev.nominationConfig,
        branchesOrLevels: [...(prev.nominationConfig?.branchesOrLevels || []), newBranchInput.trim()],
      },
    }));
    setNewBranchInput('');
  };

  const handleRemoveBranch = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      nominationConfig: {
        ...prev.nominationConfig,
        branchesOrLevels: (prev.nominationConfig?.branchesOrLevels || []).filter((_, idx) => idx !== index),
      },
    }));
  };

  const totalRubricScore = (formData.nominationConfig?.rubricItems || []).reduce((acc, i) => acc + (Number(i.maxScore) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">المسارات التعليمية بالمجمع (Dynamic Multi-Track)</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              {tracks.length} مسارات معرفة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            تهيئة مسارات الحفظ، الهجاء، والقيم وتحديد استمارات الاختبار الداخلي وبنود التقييم الخاصة بكل مسار دون المساس بالمحرك القرآني.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCommitDefaultsToDb}
            disabled={isSeeding}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0 w-full sm:w-auto disabled:opacity-50"
            title="نقل المسارات الافتراضية الأربعة واعتمادها في قاعدة البيانات كمسارات حقيقية"
          >
            <Database className={`w-3.5 h-3.5 text-emerald-600 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'جاري الاعتماد...' : 'اعتماد الافتراضي في الداتا بيز'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteAllConfirmOpen(true)}
            disabled={tracks.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors shrink-0 w-full sm:w-auto disabled:opacity-40"
            title="حذف جميع المسارات نهائياً وعدم إرجاعها مرة أخرى"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>حذف كافة المسارات</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مسار تعليمي جديد</span>
          </button>
        </div>
      </div>

      {/* Track Cards Grid / Empty State */}
      {tracks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">لا توجد مسارات تعليمية حالياً</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            تم مسح جميع المسارات. يمكنك البدء بإضافة مسار مخصص جديد من الصفر أو نقل واعتماد المسارات الافتراضية الأربعة في قاعدة البيانات.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleCommitDefaultsToDb}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>نقل واعتماد المسارات الافتراضية</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مسار مخصص جديد</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tracks.map((track) => {
          const colorStyles: Record<string, { bg: string; border: string; text: string; badge: string }> = {
            emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
            amber: { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
            purple: { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
            indigo: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
            blue: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
            rose: { bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-100 text-rose-800' },
          };

          const style = colorStyles[track.colorScheme] || colorStyles.emerald;

          return (
            <div
              key={track.id}
              className={`rounded-2xl border ${style.border} ${style.bg} p-5 flex flex-col justify-between transition-all hover:shadow-md bg-white`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${style.badge}`}>
                      {track.icon === 'Sparkles' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : track.icon === 'Award' ? (
                        <Award className="w-5 h-5" />
                      ) : track.icon === 'BookCheck' ? (
                        <BookCheck className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm ${style.text}`}>{track.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{track.code} • الرمز: {track.shortName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        track.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {track.isActive ? 'نشط' : 'معطل'}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(track)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="تعديل المسار واستمارة التقييم"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(track)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف المسار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {track.description}
                </p>

                {/* Rubric summary */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                    <span>استمارة الاختبار الداخلي:</span>
                    <span>
                      {track.nominationConfig.requiresInternalExam
                        ? `مطلوب (اجتياز ${track.nominationConfig.passingScore}%)`
                        : 'تقييم مستمر دون اختبار'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {(track.nominationConfig?.rubricItems || []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-500 bg-white/80 px-2 py-1 rounded-lg border border-slate-100">
                        <span className="truncate">{item.label}</span>
                        <span className="font-bold text-slate-700 shrink-0">{item.maxScore} درجة</span>
                      </div>
                    ))}
                  </div>

                  {/* Available branches */}
                  <div className="mt-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">الفروع المتاحة للترشيح: </span>
                    <span className="text-slate-600">
                      {(track.nominationConfig?.branchesOrLevels || []).slice(0, 3).join('، ')}
                      {(track.nominationConfig?.branchesOrLevels || []).length > 3 && ` (+${(track.nominationConfig?.branchesOrLevels || []).length - 3} أخرى)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>الترتيب في العرض: #{track.order}</span>
                <button
                  onClick={() => handleOpenEditModal(track)}
                  className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                >
                  تخصيص البنود والفروع
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal: Add or Edit Track */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {isNewTrack ? 'إضافة مسار تعليمي جديد' : `تعديل ${formData.name}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrack} className="mt-3 sm:mt-4 space-y-4 text-xs overflow-y-auto pr-1 pl-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المسار الكامل</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: مسار التلاوة والترتيل المتصل"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الاسم المختصر</label>
                  <input
                    type="text"
                    required
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="مثال: التلاوة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">وصف المنهج والمسار</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="نبذة عن المنهج والمستهدفات التعليمية..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السمة اللونية</label>
                  <select
                    value={formData.colorScheme}
                    onChange={(e) => setFormData({ ...formData, colorScheme: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="emerald">زمردي (أخضر)</option>
                    <option value="amber">كهرماني (برتقالي)</option>
                    <option value="purple">بنفسجي (قيم)</option>
                    <option value="indigo">نيلي (تلاوة)</option>
                    <option value="blue">أزرق</option>
                    <option value="rose">وردي</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">درجة الاجتياز للاختبار (%)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={formData.nominationConfig.passingScore}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nominationConfig: {
                          ...formData.nominationConfig,
                          passingScore: Number(e.target.value) || 80,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="flex items-center sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0 border-slate-200 w-full sm:w-auto">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-emerald-600 w-4 h-4"
                    />
                    <span>المسار مفعّل بالمجمع</span>
                  </label>
                </div>
              </div>

              {/* Rubric Configuration */}
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">استمارة الاختبار الداخلي وبنود التقييم</h4>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      totalRubricScore === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      المجموع: {totalRubricScore} / 100
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRubricItem}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 self-start sm:self-auto py-1 px-2 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(formData.nominationConfig?.rubricItems || []).map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-slate-400 font-bold text-[11px] w-4 text-center shrink-0">{index + 1}</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleUpdateRubricItem(item.id, { label: e.target.value })}
                          placeholder="نص البند (مثل: جودة الحفظ، أحكام التجويد)"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 pr-6 sm:pr-0 shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <label className="text-[11px] text-slate-500 font-medium">الدرجة:</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={item.maxScore}
                            onChange={(e) => handleUpdateRubricItem(item.id, { maxScore: Number(e.target.value) || 0 })}
                            className="w-14 px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-center font-bold text-xs"
                          />
                          <span className="text-slate-500 text-[11px]">درجة</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRubricItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف البند"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nomination Levels / Branches */}
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">الفروع والمستويات المتاحة للترشيح</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(formData.nominationConfig?.branchesOrLevels || []).map((branch, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold text-[11px]"
                    >
                      <span className="break-all">{branch}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBranch(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newBranchInput}
                    onChange={(e) => setNewBranchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBranch();
                      }
                    }}
                    placeholder="أدخل فرعاً أو مستوى جديداً ثم اضغط إضافة..."
                    className="flex-1 px-3 py-2 sm:py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddBranch}
                    className="px-4 py-2 sm:py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة فرع</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
                {!isNewTrack ? (
                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(formData)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المسار</span>
                  </button>
                ) : <div />}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold text-center transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors text-center"
                  >
                    حفظ المسار والبنود
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteConfirmTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              تأكيد حذف المسار التعليمي
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في حذف مسار <strong className="text-slate-900 font-bold">«{deleteConfirmTrack.name}»</strong> نهائياً من النظام وقاعدة البيانات؟ لن تتأثر سجلات الطلاب القرآنية السابقة.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTrack(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>نعم، تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete All Tracks Confirmation Modal */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4 border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              تأكيد حذف جميع المسارات التعليمية
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              هل أنت متأكد تماماً من رغبتك في حذف <strong className="text-slate-900 font-bold">كافة المسارات التعليمية ({tracks.length} مسار)</strong> نهائياً من النظام وقاعدة البيانات؟ لن يتم إرجاع أي مسار افتراضي تلقائياً.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllConfirmOpen(false)}
                disabled={isDeletingAll}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingAll ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف الكلي...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>نعم، حذف كل المسارات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success banner for restore */}
      {restoreMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold border border-emerald-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{restoreMessage}</span>
        </div>
      )}
    </div>
  );
};
