import React, { useState, useMemo } from 'react';
import { useApp, isSupervisorRecord } from '../../context/AppContext';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  Phone,
  Mail,
  ShieldAlert,
  X,
  Layers,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { User, SupervisorType, SupervisorScope } from '../../types';
import { SUPERVISOR_ROLES_CONFIG } from '../../utils/trackAdapter';
import { ALL_PERMISSIONS } from '../../lib/permissions';

export const SupervisorsManagementTab: React.FC = () => {
  const {
    users,
    halaqahs,
    stages,
    activeTenant,
    activeTenantId,
    addSupervisor,
    updateSupervisor,
    archiveSupervisor,
    restoreSupervisor,
    permanentlyDeleteSupervisor,
    archivedSupervisors,
  } = useApp();

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<User | null>(null);
  const [archivingTarget, setArchivingTarget] = useState<User | null>(null);
  const [archiveReason, setArchiveReason] = useState('أرشفة المشرف تحسباً للخطأ');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    supervisorType: 'general_supervisor' as SupervisorType,
    selectedTracks: ['track_quran', 'track_spelling', 'track_virtues', 'track_tilawah'],
    selectedStages: [] as string[],
    isAllHalaqahs: false,
    selectedHalaqahs: [] as string[],
    permissionMode: 'role_defaults' as 'role_defaults' | 'custom_only',
    customPermissions: [] as string[],
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available halaqahs strictly filtered by selected stages and tenant
  const availableHalaqahs = useMemo(() => {
    return halaqahs.filter((h) => {
      if (h.isArchived) return false;
      if (activeTenantId && h.tenantId && h.tenantId !== activeTenantId && !h.tenantId.includes(activeTenantId) && !activeTenantId.includes(h.tenantId)) return false;
      if (formData.selectedStages.length > 0) {
        return Boolean(h.stageId && formData.selectedStages.includes(h.stageId));
      }
      return false;
    });
  }, [halaqahs, activeTenantId, formData.selectedStages]);

  const archivedSupervisorIds = useMemo(() => {
    return new Set((archivedSupervisors || []).map((s) => s.id));
  }, [archivedSupervisors]);

  // Strictly filter archived supervisors so only valid supervisors appear in the supervisors archive
  const displayArchivedSupervisors = useMemo(() => {
    return (archivedSupervisors || []).filter((s) => isSupervisorRecord(s));
  }, [archivedSupervisors]);

  // Distinct active supervisors strictly belonging to current tenant
  const visibleSupervisors = useMemo(() => {
    return users.filter((u) => {
      // Must have role or staffRole supervisor
      if (u.role !== 'supervisor' && u.staffRole !== 'supervisor' && !isSupervisorRecord(u)) return false;
      // Exclude archived
      if (u.isArchived || u.supervisorArchived || archivedSupervisorIds.has(u.id)) return false;
      // Tenant check
      if (activeTenantId && u.tenantId && u.tenantId !== activeTenantId && !u.tenantId.includes(activeTenantId) && !activeTenantId.includes(u.tenantId)) return false;
      return true;
    });
  }, [users, activeTenantId, archivedSupervisorIds]);

  // Filtered supervisors
  const filteredSupervisors = useMemo(() => {
    return visibleSupervisors.filter((s) => {
      const matchSearch =
        !search.trim() ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search)) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase()));

      const supType = s.supervisorScope?.type || 'general_supervisor';
      const matchType = typeFilter === 'all' || supType === typeFilter;

      return matchSearch && matchType;
    });
  }, [visibleSupervisors, search, typeFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const initialStageIds = stages.map((st) => st.id);
    const initialHalaqahIds = halaqahs
      .filter((h) => !h.isArchived && (!activeTenantId || h.tenantId === activeTenantId) && h.stageId && initialStageIds.includes(h.stageId))
      .map((h) => h.id);

    setFormData({
      name: '',
      phone: '',
      email: '',
      password: 'Admin@123456',
      supervisorType: 'general_supervisor',
      selectedTracks: ['track_quran', 'track_spelling', 'track_virtues', 'track_tilawah'],
      selectedStages: initialStageIds,
      isAllHalaqahs: false,
      selectedHalaqahs: initialHalaqahIds,
      permissionMode: 'role_defaults',
      customPermissions: [],
      isActive: true,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (supervisor: User) => {
    setEditingSupervisor(supervisor);
    const scope = supervisor.supervisorScope;
    const currentStageIds = scope?.stageIds || supervisor.assignedStageIds || [];
    let currentHalaqahIds = scope?.halaqahIds || supervisor.assignedHalaqahIds || [];

    if ((supervisor.isAllHalaqahs || currentHalaqahIds.length === 0) && currentStageIds.length > 0) {
      currentHalaqahIds = halaqahs
        .filter((h) => !h.isArchived && (!activeTenantId || h.tenantId === activeTenantId) && h.stageId && currentStageIds.includes(h.stageId))
        .map((h) => h.id);
    }

    setFormData({
      name: supervisor.name,
      phone: supervisor.phone || '',
      email: supervisor.email || '',
      password: '',
      supervisorType: scope?.type || 'general_supervisor',
      selectedTracks: scope?.trackIds || ['track_quran'],
      selectedStages: currentStageIds,
      isAllHalaqahs: false,
      selectedHalaqahs: currentHalaqahIds,
      permissionMode: supervisor.permissionMode || 'role_defaults',
      customPermissions: supervisor.customPermissions || [],
      isActive: supervisor.isActive !== false,
    });
    setFormError('');
  };

  // Save Supervisor
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('يرجى إدخال اسم المشرف');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('يرجى إدخال رقم الجوال');
      return;
    }

    setIsSubmitting(true);
    try {
      const scopePayload: SupervisorScope = {
        type: formData.supervisorType,
        trackIds: formData.selectedTracks,
        stageIds: formData.selectedStages,
        halaqahIds: formData.selectedHalaqahs,
      };

      if (editingSupervisor) {
        await updateSupervisor(editingSupervisor.id, {
          name: formData.name.trim(),
          fullName: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          supervisorScope: scopePayload,
          assignedStageIds: formData.selectedStages,
          assignedHalaqahIds: formData.selectedHalaqahs,
          isAllHalaqahs: formData.isAllHalaqahs,
          permissionMode: formData.permissionMode,
          customPermissions: formData.customPermissions,
          isActive: formData.isActive,
          role: 'supervisor',
          staffRole: 'supervisor',
        });
        setEditingSupervisor(null);
      } else {
        await addSupervisor({
          name: formData.name.trim(),
          fullName: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          role: 'supervisor',
          staffRole: 'supervisor',
          supervisorScope: scopePayload,
          assignedStageIds: formData.selectedStages,
          assignedHalaqahIds: formData.selectedHalaqahs,
          isAllHalaqahs: formData.isAllHalaqahs,
          permissionMode: formData.permissionMode,
          customPermissions: formData.customPermissions,
          isActive: formData.isActive,
          tenantId: activeTenantId,
          plainPassword: formData.password || 'Admin@123456',
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء حفظ المشرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive
  const handleConfirmArchive = async () => {
    if (!archivingTarget) return;
    setIsSubmitting(true);
    try {
      await archiveSupervisor(archivingTarget.id, archiveReason);
      setArchivingTarget(null);
      setArchiveReason('أرشفة المشرف تحسباً للخطأ');
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء أرشفة المشرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore
  const handleRestore = async (id: string) => {
    setIsSubmitting(true);
    try {
      await restoreSupervisor(id);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء استعادة المشرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsSubmitting(true);
    try {
      await permanentlyDeleteSupervisor(deleteConfirmTarget.id);
      setDeleteConfirmTarget(null);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء الحذف النهائي للمشرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get role config
  const getSupervisorBadge = (type?: string) => {
    const conf = SUPERVISOR_ROLES_CONFIG.find((c) => c.type === type) || SUPERVISOR_ROLES_CONFIG[0];
    const colorClasses: Record<string, string> = {
      quran_supervisor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      educational_supervisor: 'bg-blue-100 text-blue-800 border-blue-200',
      spelling_supervisor: 'bg-purple-100 text-purple-800 border-purple-200',
      finance_supervisor: 'bg-amber-100 text-amber-900 border-amber-200',
      stage_supervisor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      activity_supervisor: 'bg-rose-100 text-rose-800 border-rose-200',
      general_supervisor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    const style = colorClasses[type || 'general_supervisor'] || 'bg-slate-100 text-slate-800 border-slate-200';

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${style}`}>
        <ShieldCheck className="w-3 h-3" />
        <span>{conf.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">إدارة المشرفين</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {visibleSupervisors.length} مشرف معتمد
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة الكادر الإشرافي، وتحديد النوع التخصصي ونطاقات الإشراف (المراحل، المسارات، الحلقات) والصلاحيات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsArchiveModalOpen(true)}
              className="h-10 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Archive className="w-4 h-4 text-amber-700" />
              <span>أرشيف المشرفين ({displayArchivedSupervisors.length})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="h-10 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مشرف جديد</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال أو البريد الإلكتروني..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none w-full sm:w-auto"
            >
              <option value="all">كافة التخصصات الإشرافية</option>
              {SUPERVISOR_ROLES_CONFIG.map((conf) => (
                <option key={conf.type} value={conf.type}>
                  {conf.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Supervisors List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3.5">اسم المشرف</th>
                <th className="p-3.5">رقم الجوال (معرف الدخول)</th>
                <th className="p-3.5">نوع الإشراف (Role Type)</th>
                <th className="p-3.5">نطاق الإشراف (Scope)</th>
                <th className="p-3.5 text-center">وضع الصلاحيات</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    لا يوجد مشرفون مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredSupervisors.map((supervisor) => {
                  const scope = supervisor.supervisorScope;
                  const stageNames = (scope?.stageIds || supervisor.assignedStageIds || [])
                    .map((sid) => stages.find((st) => st.id === sid)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={supervisor.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0">
                            {supervisor.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block">{supervisor.name}</span>
                            {supervisor.email && (
                              <span className="text-[10px] text-slate-400 font-normal">{supervisor.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr">{supervisor.phone || supervisor.loginIdentifier}</span>
                        </div>
                      </td>
                      <td className="p-3.5">{getSupervisorBadge(scope?.type)}</td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {stageNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {stageNames.map((name, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-medium"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">كافة المراحل</span>
                          )}
                          {scope?.trackIds && scope.trackIds.length > 0 && (
                            <div className="text-[10px] text-slate-400">
                              {scope.trackIds.length} مسارات معتمدة
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            supervisor.permissionMode === 'custom_only'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {supervisor.permissionMode === 'custom_only' ? 'مخصص فقط' : 'صلاحيات الدور'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            supervisor.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {supervisor.isActive !== false ? 'نشط' : 'معلق'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(supervisor)}
                            className="p-1.5 text-slate-600 hover:text-blue-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="تعديل بيانات ونطاق المشرف"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchivingTarget(supervisor)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="أرشفة المشرف ونقله للأرشيف تحسباً للخطأ"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (320px - 767px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredSupervisors.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              لا يوجد مشرفون مطابقون لمعايير البحث
            </div>
          ) : (
            filteredSupervisors.map((supervisor) => {
              const scope = supervisor.supervisorScope;

              return (
                <div key={supervisor.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs shrink-0">
                        {supervisor.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{supervisor.name}</h4>
                        <p className="text-[11px] font-mono text-slate-500" dir="ltr">
                          {supervisor.phone || supervisor.loginIdentifier}
                        </p>
                      </div>
                    </div>
                    {getSupervisorBadge(scope?.type)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400">الصلاحيات: </span>
                      <span className="font-semibold text-slate-800">
                        {supervisor.permissionMode === 'custom_only' ? 'مخصصة' : 'دور افتراضي'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        supervisor.isActive !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {supervisor.isActive !== false ? 'نشط' : 'معلق'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(supervisor)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchivingTarget(supervisor)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>أرشفة</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Supervisor Modal */}
      {(isAddModalOpen || editingSupervisor) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md sm:max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingSupervisor ? 'تعديل بيانات ونطاق المشرف' : 'إضافة مشرف جديد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSupervisor(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المشرف الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عبد الرحمن بن خليل"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال (اسم الدخول) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="05xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني (اختياري)</label>
                  <input
                    type="email"
                    placeholder="supervisor@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    dir="ltr"
                  />
                </div>

                {!editingSupervisor && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الابتدائية</label>
                    <input
                      type="text"
                      placeholder="Admin@123456"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              {/* Supervisor Type (Specialty) */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
                <label className="block text-xs font-bold text-blue-900">
                  تخصص ونوع الإشراف (Supervisory Role Type)
                </label>
                <select
                  value={formData.supervisorType}
                  onChange={(e) => {
                    const newType = e.target.value as SupervisorType;
                    const conf = SUPERVISOR_ROLES_CONFIG.find((c) => c.type === newType);
                    setFormData({
                      ...formData,
                      supervisorType: newType,
                      selectedTracks: conf?.defaultTrackIds || ['track_quran'],
                    });
                  }}
                  className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white text-xs font-bold text-blue-900 outline-none"
                >
                  {SUPERVISOR_ROLES_CONFIG.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-blue-700/90 leading-normal">
                  {SUPERVISOR_ROLES_CONFIG.find((c) => c.type === formData.supervisorType)?.description}
                </p>
              </div>

              {/* Stages Scope */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    نطاق المراحل التعليمية المصرح بالإشراف عليها
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allStageIds = stages.map((st) => st.id);
                      const isAllSelected = allStageIds.every((id) => formData.selectedStages.includes(id));
                      if (isAllSelected) {
                        setFormData({
                          ...formData,
                          selectedStages: [],
                          selectedHalaqahs: [],
                        });
                      } else {
                        const nextHalaqahIds = halaqahs
                          .filter((h) => !h.isArchived && (!activeTenantId || h.tenantId === activeTenantId) && h.stageId && allStageIds.includes(h.stageId))
                          .map((h) => h.id);
                        setFormData({
                          ...formData,
                          selectedStages: allStageIds,
                          selectedHalaqahs: nextHalaqahIds,
                        });
                      }
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {stages.length > 0 && stages.every((st) => formData.selectedStages.includes(st.id))
                      ? 'إلغاء تحديد كافة المراحل'
                      : 'تحديد كافة المراحل'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1">
                  {stages.map((st) => {
                    const isChecked = formData.selectedStages.includes(st.id);
                    return (
                      <label
                        key={st.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] transition-all ${
                          isChecked
                            ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextStages: string[];
                            if (e.target.checked) {
                              nextStages = [...formData.selectedStages, st.id];
                            } else {
                              nextStages = formData.selectedStages.filter((id) => id !== st.id);
                            }
                            // Re-calculate halaqahs matching nextStages
                            const matchingHalaqahIds = halaqahs
                              .filter((h) => !h.isArchived && (!activeTenantId || h.tenantId === activeTenantId) && h.stageId && nextStages.includes(h.stageId))
                              .map((h) => h.id);

                            setFormData({
                              ...formData,
                              selectedStages: nextStages,
                              selectedHalaqahs: matchingHalaqahIds,
                            });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{st.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* HALAQAH SCOPE */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    الحلقات المصرح بها لـ (المراحل المختارة) ({formData.selectedHalaqahs.length} / {availableHalaqahs.length})
                  </label>
                  {availableHalaqahs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allAvailIds = availableHalaqahs.map((h) => h.id);
                        const isAllSelected = availableHalaqahs.every((h) => formData.selectedHalaqahs.includes(h.id));
                        if (isAllSelected) {
                          setFormData({
                            ...formData,
                            selectedHalaqahs: formData.selectedHalaqahs.filter((id) => !allAvailIds.includes(id)),
                          });
                        } else {
                          const merged = Array.from(new Set([...formData.selectedHalaqahs, ...allAvailIds]));
                          setFormData({ ...formData, selectedHalaqahs: merged });
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {availableHalaqahs.length > 0 && availableHalaqahs.every((h) => formData.selectedHalaqahs.includes(h.id))
                        ? 'إلغاء تحديد كل الحلقات'
                        : 'تحديد كافة حلقات المراحل'}
                    </button>
                  )}
                </div>

                {formData.selectedStages.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center text-xs text-amber-800 font-medium">
                    ⚠️ يرجى تحديد مرحلة تعليمية واحدة على الأقل أعلاه لعرض الحلقات التابعة لها
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1">
                      {availableHalaqahs.map((h) => {
                        const isChecked = formData.selectedHalaqahs.includes(h.id);
                        return (
                          <label
                            key={h.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-[11px] transition-all ${
                              isChecked
                                ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...formData.selectedHalaqahs, h.id]
                                  : formData.selectedHalaqahs.filter((id) => id !== h.id);
                                setFormData({ ...formData, selectedHalaqahs: next });
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{h.name}</span>
                          </label>
                        );
                      })}
                      {availableHalaqahs.length === 0 && (
                        <div className="col-span-full text-center text-xs text-slate-400 py-3">
                          لا توجد حلقات تابعة للمراحل التعليمية المحددة
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحساب</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="isActiveSupervisor"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>نشط ومفعل</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="isActiveSupervisor"
                      checked={!formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>معلق مؤقتاً</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSupervisor(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingSupervisor ? 'حفظ التعديلات' : 'إنشاء المشرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archivingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-amber-800 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">أرشفة المشرف</h3>
                <p className="text-xs text-slate-500">حفظ المشرف وسجلاته في الأرشيف الآمن</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل أنت متأكد من أرشفة المشرف <strong className="text-slate-900">{archivingTarget.name}</strong>؟
                سيتم نقل بياناته وسجلاته للأرشيف لحمايتها من الفقدان، مع إمكانية استعادته في أي وقت.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب الأرشفة (اختياري)</label>
                <input
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="مثال: انتهاء فترة التكليف، نقل لمجمع آخر، أرشفة إدارية..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchivingTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري النقل...' : 'تأكيد الأرشفة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisors Archive Drawer/Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">سجل أرشيف المشرفين</h3>
                  <p className="text-xs text-slate-500">المشرفون المؤرشفون المحفوظة سجلاتهم مع إمكانية الاستعادة الفورية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {displayArchivedSupervisors.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  الأرشيف فارغ حالياً، لا يوجد مشرفون مؤرشفون
                </div>
              ) : (
                displayArchivedSupervisors.map((supervisor) => (
                  <div
                    key={supervisor.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{supervisor.name}</span>
                        <span className="text-[10px] font-mono text-slate-500" dir="ltr">
                          {supervisor.phone || supervisor.loginIdentifier}
                        </span>
                        {getSupervisorBadge(supervisor.supervisorScope?.type)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-2">
                        {supervisor.archivedAt && (
                          <span>تاريخ الأرشفة: {new Date(supervisor.archivedAt).toLocaleDateString('ar-SA')}</span>
                        )}
                        {supervisor.archivedBy && <span>بواسطة: {supervisor.archivedBy}</span>}
                        {supervisor.archiveReason && (
                          <span className="text-amber-800 font-medium">سبب الأرشفة: {supervisor.archiveReason}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(supervisor.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة المشرف</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget(supervisor)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="حذف نهائي لا رجعة فيه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-2.5 text-rose-700 pb-3 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-black text-rose-900">تأكيد الحذف النهائي</h3>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              هل أنت متأكد من حذف المشرف <strong className="text-slate-900">{deleteConfirmTarget.name}</strong> نهائياً من قاعدة البيانات؟
              هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                {isSubmitting ? 'جاري الحذف...' : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
