import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Share2,
  X,
  FileCheck,
  UserCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  analyzeStudentsForEarlyWarning,
  createRemedialPlanFromAnalysis,
  generateInterventionParentMessage,
  EarlyWarningRiskAnalysis,
} from '../../utils/analyticsInterventionService';
import { dispatchWhatsAppMessage } from '../../lib/whatsappCloudApi';
import { RiskLevel, InterventionCategory } from '../../types';

interface EarlyInterventionRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  halaqahId?: string;
  /** When true, renders the radar content inline as a page section (no fixed overlay). */
  embedded?: boolean;
}

export const EarlyInterventionRadarModal: React.FC<EarlyInterventionRadarModalProps> = ({
  isOpen,
  onClose,
  halaqahId,
  embedded = false,
}) => {
  const {
    students,
    sessionRecords,
    spellingLessons,
    academicConfig,
    remedialPlans,
    saveRemedialPlan,
    resolveRemedialPlan,
    currentUser,
    halaqahs,
  } = useApp();

  const isSpellingTrackEnabled = (halaqahIdVal: string | undefined) => {
    const ids = halaqahs.find((h) => h.id === halaqahIdVal)?.activeTrackIds;
    return !ids || ids.includes('track_spelling');
  };

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter students for the current halaqah
  const halaqahStudents = useMemo(() => {
    return halaqahId ? students.filter((s) => s.halaqahId === halaqahId) : students;
  }, [students, halaqahId]);

  // Run the smart diagnostic scan
  const riskAnalyses = useMemo(() => {
    return analyzeStudentsForEarlyWarning(
      halaqahStudents,
      sessionRecords,
      spellingLessons,
      academicConfig
    );
  }, [halaqahStudents, sessionRecords, spellingLessons, academicConfig]);

  // Filter results
  const filteredAnalyses = useMemo(() => {
    return riskAnalyses.filter((item) => {
      if (filterRisk !== 'all' && item.riskLevel !== filterRisk) return false;
      if (filterCategory !== 'all' && item.primaryCategory !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.student.fullName.toLowerCase().includes(q) ||
          item.diagnosticSummary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [riskAnalyses, filterRisk, filterCategory, searchQuery]);

  if (!isOpen && !embedded) return null;

  const handleCreatePlan = async (item: EarlyWarningRiskAnalysis) => {
    const plan = createRemedialPlanFromAnalysis(
      item,
      currentUser?.id || item.student.teacherId,
      item.student.halaqahId
    );
    await saveRemedialPlan(plan);
    setSuccessToast(`تم اعتماد خطة التدخل للطالب ${item.student.fullName}!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSendParentGuidance = (item: EarlyWarningRiskAnalysis) => {
    if (!item.student.parentPhone) return;
    const plan = createRemedialPlanFromAnalysis(
      item,
      currentUser?.id || item.student.teacherId,
      item.student.halaqahId
    );
    const msg = generateInterventionParentMessage(plan, currentUser?.name || 'معلم الحلقة');
    dispatchWhatsAppMessage(item.student.parentPhone, msg);
    setSuccessToast(`تم فتح رسالة التوجيه لولي أمر ${item.student.fullName} عبر واتساب`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleResolve = async (studentId: string) => {
    const activePlan = remedialPlans.find(
      (p) => p.studentId === studentId && p.status !== 'resolved'
    );
    if (activePlan) {
      await resolveRemedialPlan(activePlan.id, 'تم تجاوز حالة التعثر وإتقان المهارة بحمد الله');
      setSuccessToast('تم تحديث حالة الخطة إلى مكتملة ومعالجة بنجاح!');
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            أولوية قصوى 🔴
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
            متابعة متوسطة 🟠
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
            تنبيه مبكر 🟡
          </span>
        );
    }
  };

  const getCategoryTitle = (cat: InterventionCategory) => {
    switch (cat) {
      case 'spelling_stagnation':
        return 'تذبذب الهجاء';
      case 'pronunciation_struggle':
        return 'مخارج الحروف';
      case 'attendance_drop':
        return 'انقطاع وغياب';
      case 'memorization_lag':
        return 'فجوة الحفظ';
    }
  };

  const content = (
      <div className={embedded
        ? 'bg-white w-full rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-xs'
        : 'bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 max-h-[90vh]'}>
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-xs">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg">رادار المتابعة الذكي والتدخل المبكر</h3>
                <span className="text-xs bg-rose-500/30 text-rose-200 border border-rose-400/30 px-2.5 py-0.5 rounded-full font-bold">
                  {riskAnalyses.length} طلاب بحاجة لمساندة
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                اكتشاف الفجوات الأكاديمية ونقاط الضعف في الهجاء والحفظ مبكراً قبل أن تتراكم، واقتراح خطط علاجية فورية
              </p>
            </div>
          </div>
          {!embedded && (
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Toast */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطالب..."
                className="pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <button
                onClick={() => setFilterRisk('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterRisk === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterRisk('high')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterRisk === 'high' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                حرجة (قصوى)
              </button>
              <button
                onClick={() => setFilterRisk('medium')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filterRisk === 'medium' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                متوسطة
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">نوع العائق:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">جميع الأنواع</option>
              <option value="spelling_stagnation">تذبذب الهجاء</option>
              <option value="pronunciation_struggle">مخارج الحروف والتمييز الصوتي</option>
              <option value="attendance_drop">الغياب والانقطاع</option>
              <option value="memorization_lag">فجوة الحفظ القرآني</option>
            </select>
          </div>
        </div>

        {/* Diagnostic Cards List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {filteredAnalyses.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-black text-sm text-slate-900">لا توجد حالات تعثر حرجة وفق هذا التحديد!</h4>
              <p className="text-xs text-slate-500 mt-1">
                جميع الطلاب يسيرون وفق المعايير الطبيعية أو لم تتطابق مرشحات البحث الحالية.
              </p>
            </div>
          ) : (
            filteredAnalyses.map((item) => {
              const activePlan = remedialPlans.find(
                (p) => p.studentId === item.student.id && p.status !== 'resolved'
              );

              return (
                <div
                  key={item.student.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-rose-300 transition-all space-y-3"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-800 text-sm">
                        {item.student.fullName.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{item.student.fullName}</span>
                          <span className="text-xs font-bold text-slate-600">({item.student.grade})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>السورة: {item.student.currentSurah} (آية {item.student.currentAyah})</span>
                          {isSpellingTrackEnabled(item.student.halaqahId) && (
                            <>
                              <span>•</span>
                              <span>إتقان الهجاء: {item.metrics.spellingMastery}%</span>
                              <span>•</span>
                            </>
                          )}
                          <span>المواظبة: {item.metrics.attendanceRate}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {getCategoryTitle(item.primaryCategory)}
                      </span>
                      {getRiskBadge(item.riskLevel)}
                    </div>
                  </div>

                  {/* Diagnostic Summary & Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3">
                      <div className="font-bold text-rose-950 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>التشخيص والمؤشرات المرصودة:</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed font-medium">{item.diagnosticSummary}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(item.flags || []).map((flag, idx) => (
                          <span
                            key={idx}
                            className="bg-white/90 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-bold"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                      <div className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-700" />
                        <span>الإجراء التدريسي المقترح للمعلم:</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        {item.recommendedPedagogicalAction}
                      </p>
                      <div className="mt-2 text-[11px] text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-200">
                        <span className="font-bold">توجيه المنزل: </span>
                        <span>{item.parentGuidanceAdvice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {activePlan ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>خطة التدخل معتمدة ونشطة</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCreatePlan(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>اعتماد وتثبيت خطة الدعم</span>
                        </button>
                      )}

                      {activePlan && (
                        <button
                          type="button"
                          onClick={() => handleResolve(item.student.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>إغلاق ومعالجة الخطة</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendParentGuidance(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      title="إرسال نصيحة تربوية هادئة لولي الأمر عبر واتساب"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>إرسال التوجيه لولي الأمر (واتساب)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {content}
    </div>
  );
};
