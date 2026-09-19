import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdmissionStatus, RegistrationRequest } from '../../types';
import {
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  MessageCircle,
  Calendar,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ChevronDown,
  FileText,
  UserCheck,
  IdCard,
  CreditCard,
  ShieldCheck,
  User,
} from 'lucide-react';

export const AdmissionsManagementTab: React.FC = () => {
  const {
    activeTenantId,
    activeTenant,
    admissionsRequests,
    updateRegistrationStatus,
    enrollApplicantAsStudent,
    halaqahs,
    teachers,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AdmissionStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollTargetHalaqah, setEnrollTargetHalaqah] = useState('');
  const [enrollTargetTeacher, setEnrollTargetTeacher] = useState('');
  const [interviewNotesInput, setInterviewNotesInput] = useState('');

  // Filter requests for current tenant
  const tenantRequests = useMemo(() => {
    return admissionsRequests.filter(
      (r) => !activeTenantId || r.tenantId === activeTenantId
    );
  }, [admissionsRequests, activeTenantId]);

  const filteredRequests = useMemo(() => {
    return tenantRequests.filter((req) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        req.studentName.toLowerCase().includes(q) ||
        req.parentName.toLowerCase().includes(q) ||
        req.parentPhone.includes(q) ||
        (req.nationalId && req.nationalId.includes(q)) ||
        (req.motherPhone && req.motherPhone.includes(q));

      const matchesStatus = selectedStatus === 'all' || req.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tenantRequests, searchQuery, selectedStatus]);

  const statusCounts = useMemo(() => {
    return {
      all: tenantRequests.length,
      pending: tenantRequests.filter((r) => r.status === 'pending').length,
      interview: tenantRequests.filter((r) => r.status === 'interview').length,
      accepted: tenantRequests.filter((r) => r.status === 'accepted').length,
      rejected: tenantRequests.filter((r) => r.status === 'rejected').length,
      enrolled: tenantRequests.filter((r) => r.status === 'enrolled').length,
    };
  }, [tenantRequests]);

  const handleOpenEnrollModal = (req: RegistrationRequest) => {
    setSelectedRequest(req);
    const tenantHalaqahs = halaqahs.filter((h) => !activeTenantId || h.tenantId === activeTenantId);
    const firstHalaqah = tenantHalaqahs[0];
    setEnrollTargetHalaqah(firstHalaqah?.id || '');
    setEnrollTargetTeacher(firstHalaqah?.teacherId || teachers[0]?.id || '');
    setIsEnrollModalOpen(true);
  };

  const handleConfirmEnroll = async () => {
    if (!selectedRequest || !enrollTargetHalaqah || !enrollTargetTeacher) return;
    await enrollApplicantAsStudent(selectedRequest.id, enrollTargetHalaqah, enrollTargetTeacher);
    setIsEnrollModalOpen(false);
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async (id: string, status: AdmissionStatus, notes?: string) => {
    await updateRegistrationStatus(id, status, notes);
  };

  const getStatusBadge = (status: AdmissionStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>طلب جديد (انتظار)</span>
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <FileText className="w-3.5 h-3.5" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'interview':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Calendar className="w-3.5 h-3.5" />
            <span>مقابلة شخصية</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>تم القبول</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            <span>مرفوض</span>
          </span>
        );
      case 'enrolled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
            <UserCheck className="w-3.5 h-3.5" />
            <span>تم التسكين في حلقة</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-7 shadow-sm border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <span className="hidden sm:inline-flex bg-emerald-700/60 text-emerald-100 text-[11px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold border border-emerald-500/40">
                منظومة القبول والتسجيل SaaS
              </span>
              {activeTenant?.name && (
                <span className="text-amber-300 text-xs font-bold">
                  {activeTenant.name}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-white">
              <span className="sm:hidden">إدارة طلبات القبول والالتحاق</span>
              <span className="hidden sm:inline">إدارة طلبات القبول والالتحاق بالمجمع</span>
            </h2>
            <p className="hidden md:block text-xs md:text-sm text-emerald-200 mt-1 max-w-xl leading-relaxed">
              استقبال طلبات أولياء الأمور الجدد، وجدولة المقابلات الشخصية، والفرز الأكاديمي، وتسكين الطلاب المقبولين في الحلقات مباشرة.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-3 bg-white/10 backdrop-blur-md p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-1.5 sm:px-3 border-l border-white/20">
              <div className="text-lg sm:text-2xl font-black text-amber-300 leading-tight">{statusCounts.pending}</div>
              <div className="text-[10px] sm:text-[11px] text-emerald-200 font-medium whitespace-nowrap">قيد الانتظار</div>
            </div>
            <div className="text-center px-1.5 sm:px-3 border-l border-white/20">
              <div className="text-lg sm:text-2xl font-black text-white leading-tight">{statusCounts.accepted}</div>
              <div className="text-[10px] sm:text-[11px] text-emerald-200 font-medium whitespace-nowrap">مقبول</div>
            </div>
            <div className="text-center px-1.5 sm:px-3">
              <div className="text-lg sm:text-2xl font-black text-emerald-300 leading-tight">{statusCounts.enrolled}</div>
              <div className="text-[10px] sm:text-[11px] text-emerald-200 font-medium whitespace-nowrap">مسكّن رسميًا</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white rounded-3xl p-4 md:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم أو هاتف ولي الأمر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-xs md:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'all', label: `الكل (${statusCounts.all})` },
                { id: 'pending', label: `الانتظار (${statusCounts.pending})` },
                { id: 'interview', label: `المقابلة (${statusCounts.interview})` },
                { id: 'accepted', label: `المقبولون (${statusCounts.accepted})` },
                { id: 'enrolled', label: `المسكّنون (${statusCounts.enrolled})` },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedStatus(filter.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedStatus === filter.id
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">لا توجد طلبات تسجيل مطابقة</div>
            <p className="text-xs text-slate-400 mt-1">تظهر هنا طلبات الالتحاق المرسلة عبر البوابة العامة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white transition-all space-y-3.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-900 text-sm md:text-base">{req.studentName}</h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                        {req.grade}
                      </span>
                      {req.previouslyRegistered === 'yes' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
                          مسجل سابقاً
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200">
                          طالب جديد
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>ولي الأمر: <strong className="text-slate-700">{req.parentName}</strong></span>
                      {req.nationalId && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                            <IdCard className="w-3 h-3 text-slate-400" />
                            <span dir="ltr">{req.nationalId}</span>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(req.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                  <div>{getStatusBadge(req.status)}</div>
                </div>

                {/* Package & Tuition Tag */}
                {(req.registrationTypeLabel || req.registrationType) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{req.registrationTypeLabel || req.registrationType}</span>
                    </div>
                    {req.tuitionFeeAmount && (
                      <div className="font-black text-emerald-900 text-xs">
                        {req.tuitionFeeAmount} ريال <span className="text-[10px] font-normal text-slate-500">/ فصل</span>
                      </div>
                    )}
                  </div>
                )}

                {req.notes && (
                  <div className="text-xs text-slate-600 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl">
                    <span className="font-bold text-amber-900">ملاحظات ولي الأمر: </span>
                    {req.notes}
                  </div>
                )}

                {req.interviewNotes && (
                  <div className="text-xs text-slate-600 bg-purple-50/80 border border-purple-200/80 p-2.5 rounded-xl">
                    <span className="font-bold text-purple-900">ملاحظات المقابلة: </span>
                    {req.interviewNotes}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Father WhatsApp */}
                    <a
                      href={`https://wa.me/966${req.parentPhone.replace(/^0+/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
                      title="مراسلة ولي الأمر (الأب) عبر واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الأب:</span>
                      <span dir="ltr">{req.parentPhone}</span>
                    </a>

                    {/* Mother Phone */}
                    {req.motherPhone && (
                      <a
                        href={`https://wa.me/966${req.motherPhone.replace(/^0+/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-colors"
                        title="مراسلة والدة الطالب عبر واتساب"
                      >
                        <Phone className="w-3.5 h-3.5 text-purple-600" />
                        <span>الأم:</span>
                        <span dir="ltr">{req.motherPhone}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'interview', 'تم التواصل لتحديد موعد المقابلة')}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          تحديد مقابلة
                        </button>
                        <button
                          onClick={() => handleOpenEnrollModal(req)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          قبول وتسكين
                        </button>
                      </>
                    )}

                    {req.status === 'interview' && (
                      <>
                        <button
                          onClick={() => handleOpenEnrollModal(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          اجتاز المقابلة (تسكين)
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'rejected', 'لم يجتز معايير القبول للمرحلة')}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          اعتذار
                        </button>
                      </>
                    )}

                    {req.status === 'accepted' && (
                      <button
                        onClick={() => handleOpenEnrollModal(req)}
                        className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>تسكين في حلقة</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrollment Modal */}
      {isEnrollModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">تسكين الطالب في حلقة معتمدة</h3>
                  <p className="text-xs text-slate-500">{selectedRequest.studentName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الحلقة</label>
                <select
                  value={enrollTargetHalaqah}
                  onChange={(e) => {
                    const hId = e.target.value;
                    setEnrollTargetHalaqah(hId);
                    const halaqah = halaqahs.find((h) => h.id === hId);
                    if (halaqah?.teacherId) {
                      setEnrollTargetTeacher(halaqah.teacherId);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  {halaqahs
                    .filter((h) => !activeTenantId || h.tenantId === activeTenantId)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.teacherName})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المعلم المشرف على الحلقة</label>
                <select
                  value={enrollTargetTeacher}
                  onChange={(e) => setEnrollTargetTeacher(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  {teachers
                    .filter((t) => !activeTenantId || t.tenantId === activeTenantId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                سيتم إنشاء ملف طالب رسمي فوريًا مع إدراجه في الخطة الأكاديمية وربطه برقم هاتف ولي الأمر.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmEnroll}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs"
              >
                تأكيد التسكين والالتحاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
