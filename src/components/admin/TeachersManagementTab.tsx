import React, { useState, useMemo, useCallback } from 'react';
import { useApp, isTeacherRecord, isSupervisorRecord } from '../../context/AppContext';
import {
  UserCheck,
  UserPlus,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  BookOpen,
  Phone,
  ShieldAlert,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Teacher } from '../../types';

export const TeachersManagementTab: React.FC = () => {
  const {
    teachers,
    users,
    halaqahs,
    students,
    activeTenant,
    activeTenantId,
    addTeacher,
    updateTeacher,
    archiveTeacher,
    restoreTeacher,
    permanentlyDeleteTeacher,
    archivedTeachers,
  } = useApp();

  // Filter state
  const [search, setSearch] = useState('');
  const [filterHalaqah, setFilterHalaqah] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [archivingTeacherTarget, setArchivingTeacherTarget] = useState<Teacher | null>(null);
  const [archiveReason, setArchiveReason] = useState('أرشفة المعلم تحسباً للخطأ');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Teacher | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nationalId: '',
    halaqahId: '',
    isAllHalaqahs: false,
    assignedHalaqahIds: [] as string[],
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchTenant = useCallback((itemTenantId?: string) => {
    if (!activeTenantId) return true;
    if (!itemTenantId) return true;
    if (itemTenantId === activeTenantId) return true;
    if (
      (activeTenantId === 'ghazzawi' || activeTenantId === 'tenant_ghazzawi') &&
      (itemTenantId === 'ghazzawi' || itemTenantId === 'tenant_ghazzawi')
    ) {
      return true;
    }
    return itemTenantId.includes(activeTenantId) || activeTenantId.includes(itemTenantId);
  }, [activeTenantId]);

  // Accessible halaqahs
  const visibleHalaqahs = useMemo(() => {
    return halaqahs.filter((h) => matchTenant(h.tenantId));
  }, [halaqahs, matchTenant]);

  const archivedTeacherIds = useMemo(() => {
    return new Set((archivedTeachers || []).map((t) => t.id));
  }, [archivedTeachers]);

  // Strictly filter archived teachers so supervisors never appear in teachers archive
  const displayArchivedTeachers = useMemo(() => {
    return (archivedTeachers || []).filter((t) => isTeacherRecord(t) && !isSupervisorRecord(t));
  }, [archivedTeachers]);

  // Distinct active teachers (strictly role: 'teacher' or staffRole: 'teacher', avoiding supervisors)
  const visibleTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        // Exclude archived
        if (t.isArchived || t.teacherArchived || archivedTeacherIds.has(t.id)) return false;
        // Strict role check: must not be a supervisor
        if (t.staffRole === 'supervisor' || (t as any).role === 'supervisor' || isSupervisorRecord(t)) return false;
        const matchingUser = users.find((u) => u.id === t.id);
        if (matchingUser && (matchingUser.role === 'supervisor' || matchingUser.staffRole === 'supervisor' || isSupervisorRecord(matchingUser))) return false;
        if (matchingUser?.isArchived || matchingUser?.teacherArchived) return false;

        // Tenant match
        if (!matchTenant(t.tenantId)) return false;
        return true;
      })
      .map((t) => {
        const cleanTPhone = (t.phone || '').replace(/\D/g, '');
        const cleanTName = (t.name || '').trim().toLowerCase();

        const assignedHalaqahsList = visibleHalaqahs.filter((h) => {
          if (t.isAllHalaqahs) return true;
          if (h.teacherId && h.teacherId === t.id) return true;
          if (t.halaqahId && t.halaqahId === h.id) return true;
          if (t.assignedHalaqahIds && t.assignedHalaqahIds.includes(h.id)) return true;
          if (h.teacherName && cleanTName && h.teacherName.trim().toLowerCase() === cleanTName) return true;
          if (h.teacherPhone && cleanTPhone && (h.teacherPhone || '').replace(/\D/g, '') === cleanTPhone) return true;
          return false;
        });

        const assignedHalaqahsIds = new Set(assignedHalaqahsList.map((h) => h.id));
        const assignedHalaqahsNames = new Set(assignedHalaqahsList.map((h) => (h.name || '').trim().toLowerCase()));

        const studentCount = students.filter((s) => {
          if (s.isActive === false) return false;
          if (!matchTenant(s.tenantId)) return false;

          const cleanSName = (s.teacherName || '').trim().toLowerCase();
          const cleanSPhone = (s.teacherPhone || '').replace(/\D/g, '');

          if (s.teacherId && s.teacherId === t.id) return true;
          if (cleanSName && cleanTName && cleanSName === cleanTName) return true;
          if (cleanSPhone && cleanTPhone && cleanSPhone === cleanTPhone) return true;
          if (s.halaqahId && assignedHalaqahsIds.has(s.halaqahId)) return true;
          if (s.halaqahName && assignedHalaqahsNames.has((s.halaqahName || '').trim().toLowerCase())) return true;

          return false;
        }).length;

        const halaqahNameDisplay = assignedHalaqahsList.length > 0 
          ? assignedHalaqahsList.map(h => h.name).join('، ') 
          : (t.halaqahName || 'غير مسند لحلقة');

        return {
          ...t,
          halaqahName: halaqahNameDisplay,
          studentsCount: studentCount,
        };
      });
  }, [teachers, users, visibleHalaqahs, students, archivedTeacherIds, matchTenant]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return visibleTeachers.filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.includes(search) ||
        (t.halaqahName && t.halaqahName.toLowerCase().includes(search.toLowerCase()));

      const cleanTPhone = (t.phone || '').replace(/\D/g, '');
      const cleanTName = (t.name || '').trim().toLowerCase();

      const assignedIds = visibleHalaqahs
        .filter((h) => {
          if (t.isAllHalaqahs) return true;
          if (h.teacherId && h.teacherId === t.id) return true;
          if (t.halaqahId && t.halaqahId === h.id) return true;
          if (t.assignedHalaqahIds && t.assignedHalaqahIds.includes(h.id)) return true;
          if (h.teacherName && cleanTName && h.teacherName.trim().toLowerCase() === cleanTName) return true;
          if (h.teacherPhone && cleanTPhone && (h.teacherPhone || '').replace(/\D/g, '') === cleanTPhone) return true;
          return false;
        })
        .map((h) => h.id);

      const matchHalaqah =
        filterHalaqah === 'all' ||
        (filterHalaqah === 'unassigned' && assignedIds.length === 0) ||
        assignedIds.includes(filterHalaqah);

      return matchSearch && matchHalaqah;
    });
  }, [visibleTeachers, search, filterHalaqah, visibleHalaqahs]);

  // Open add modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      phone: '',
      nationalId: '',
      halaqahId: visibleHalaqahs[0]?.id || '',
      isAllHalaqahs: false,
      assignedHalaqahIds: [],
      isActive: true,
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      phone: teacher.phone,
      nationalId: (teacher as any).nationalId || '',
      halaqahId: teacher.halaqahId || '',
      isAllHalaqahs: teacher.isAllHalaqahs || false,
      assignedHalaqahIds: teacher.assignedHalaqahIds || [],
      isActive: teacher.isActive !== false,
    });
    setFormError('');
  };

  // Handle save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('يرجى إدخال اسم المعلم');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('يرجى إدخال رقم الجوال');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedHalaqah = visibleHalaqahs.find((h) => h.id === formData.halaqahId);

      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          halaqahId: formData.halaqahId,
          halaqahName: selectedHalaqah ? selectedHalaqah.name : '',
          isAllHalaqahs: formData.isAllHalaqahs,
          assignedHalaqahIds: formData.assignedHalaqahIds,
          isActive: formData.isActive,
          staffRole: 'teacher',
        });
        setEditingTeacher(null);
      } else {
        await addTeacher({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          halaqahId: formData.halaqahId,
          halaqahName: selectedHalaqah ? selectedHalaqah.name : '',
          isAllHalaqahs: formData.isAllHalaqahs,
          assignedHalaqahIds: formData.assignedHalaqahIds,
          isActive: formData.isActive,
          staffRole: 'teacher',
          tenantId: activeTenantId,
        });
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء حفظ المعلم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute archive
  const handleConfirmArchive = async () => {
    if (!archivingTeacherTarget) return;
    setIsSubmitting(true);
    try {
      await archiveTeacher(archivingTeacherTarget.id, archiveReason);
      setArchivingTeacherTarget(null);
      setArchiveReason('أرشفة المعلم تحسباً للخطأ');
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء أرشفة المعلم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute restore
  const handleRestore = async (id: string) => {
    setIsSubmitting(true);
    try {
      await restoreTeacher(id);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء استعادة المعلم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute permanent delete
  const handlePermanentDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsSubmitting(true);
    try {
      await permanentlyDeleteTeacher(deleteConfirmTarget.id);
      setDeleteConfirmTarget(null);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء الحذف النهائي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">إدارة المعلمين</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {visibleTeachers.length} معلم نشط
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة كادر التعليم القرآني، وتعيين الحلقات القرآنية، وأرشفة المعلمين واستعادتهم
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
              <span>أرشيف المعلمين ({displayArchivedTeachers.length})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="h-10 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة معلم جديد</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الجوال أو اسم الحلقة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterHalaqah}
              onChange={(e) => setFilterHalaqah(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none w-full sm:w-auto"
            >
              <option value="all">كافة الحلقات</option>
              <option value="unassigned">غير مسندين لحلقة</option>
              {visibleHalaqahs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3.5">اسم المعلم</th>
                <th className="p-3.5">رقم الجوال (معرف الدخول)</th>
                <th className="p-3.5">الحلقة المسندة</th>
                <th className="p-3.5 text-center">الطلاب المقيدون</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    لا يوجد معلمون مطابقون لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                          {teacher.name.charAt(0)}
                        </div>
                        <span>{teacher.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">{teacher.phone}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {teacher.halaqahName && teacher.halaqahName !== 'غير مسند لحلقة' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                          <BookOpen className="w-3 h-3" />
                          <span>{teacher.halaqahName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">غير مسند لحلقة</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-700">
                      {teacher.studentsCount} طلاب
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          teacher.isActive !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {teacher.isActive !== false ? 'نشط' : 'معلق'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(teacher)}
                          className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="تعديل بيانات المعلم"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchivingTeacherTarget(teacher)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="أرشفة المعلم ونقله للأرشيف تحسباً للخطأ"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (320px - 767px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredTeachers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              لا يوجد معلمون مطابقون لمعايير البحث
            </div>
          ) : (
            filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{teacher.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500" dir="ltr">
                        {teacher.phone}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      teacher.isActive !== false
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {teacher.isActive !== false ? 'نشط' : 'معلق'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400">الحلقة: </span>
                    <span className="font-semibold text-emerald-800">{teacher.halaqahName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">الطلاب: </span>
                    <span className="font-bold text-slate-800">{teacher.studentsCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(teacher)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchivingTeacherTarget(teacher)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>أرشفة</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Teacher Modal */}
      {(isAddModalOpen || editingTeacher) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {editingTeacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTeacher(null);
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

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المعلم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عبد العزيز الأحمد"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-400 mt-1">يُستخدم هذا الرقم لتسجيل دخول المعلم لمنصته</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحلقة القرآنية المسندة (الأساسية)</label>
                <select
                  value={formData.halaqahId}
                  onChange={(e) => setFormData({ ...formData, halaqahId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                >
                  <option value="">-- بدون حلقة حالياً (احتياطي) --</option>
                  {visibleHalaqahs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.grade ? `(${h.grade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* HALAQAH SCOPE FOR TEACHERS */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-800">نطاق الحلقات الإضافي (الصلاحيات)</label>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="teacherIsAllHalaqahs"
                      checked={formData.isAllHalaqahs}
                      onChange={() => setFormData({ ...formData, isAllHalaqahs: true })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">جميع الحلقات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="teacherIsAllHalaqahs"
                      checked={!formData.isAllHalaqahs}
                      onChange={() => setFormData({ ...formData, isAllHalaqahs: false })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-800">حلقات محددة</span>
                  </label>
                </div>

                {!formData.isAllHalaqahs && (
                  <div className="mt-2">
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                      {visibleHalaqahs.filter(h => h.id !== formData.halaqahId).map((h) => {
                        const isChecked = formData.assignedHalaqahIds.includes(h.id);
                        return (
                          <label
                            key={h.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer text-[10px]"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...formData.assignedHalaqahIds, h.id]
                                  : formData.assignedHalaqahIds.filter((id) => id !== h.id);
                                setFormData({ ...formData, assignedHalaqahIds: next });
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-semibold text-slate-800 truncate">{h.name}</span>
                          </label>
                        );
                      })}
                      {visibleHalaqahs.length <= 1 && (
                        <div className="col-span-2 text-center text-xs text-slate-400 py-1">لا توجد حلقات إضافية أخرى</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حالة الحساب</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>نشط ومفعل</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={!formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>معلق مؤقتاً</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTeacher(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingTeacher ? 'حفظ التعديلات' : 'إنشاء المعلم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archivingTeacherTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-800 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">أرشفة المعلم</h3>
                <p className="text-xs text-slate-500">حفظ المعلم وسجلاته في الأرشيف الآمن</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل أنت متأكد من أرشفة المعلم <strong className="text-slate-900">{archivingTeacherTarget.name}</strong>؟
                سيتم نقل بياناته وسجلاته للأرشيف لحمايتها من الفقدان، ويمكنك استعادته في أي وقت.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب الأرشفة (اختياري)</label>
                <input
                  type="text"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="مثال: انتهاء الفصل الدراسي، طلب المعلم، نقل لمجمع آخر..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchivingTeacherTarget(null)}
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

      {/* Teachers Archive Drawer/Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">سجل أرشيف المعلمين</h3>
                  <p className="text-xs text-slate-500">المعلمون المؤرشفون المحفوظة سجلاتهم مع إمكانية الاستعادة الفورية</p>
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
              {displayArchivedTeachers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  الأرشيف فارغ حالياً، لا يوجد معلمون مؤرشفون
                </div>
              ) : (
                displayArchivedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{teacher.name}</span>
                        <span className="text-[10px] font-mono text-slate-500" dir="ltr">
                          {teacher.phone}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-2">
                        {teacher.archivedAt && (
                          <span>تاريخ الأرشفة: {new Date(teacher.archivedAt).toLocaleDateString('ar-SA')}</span>
                        )}
                        {teacher.archivedBy && <span>بواسطة: {teacher.archivedBy}</span>}
                        {teacher.archiveReason && (
                          <span className="text-amber-800 font-medium">سبب الأرشفة: {teacher.archiveReason}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRestore(teacher.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>استعادة المعلم</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget(teacher)}
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-2.5 text-rose-700 pb-3 border-b border-slate-100">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-black text-rose-900">تأكيد الحذف النهائي</h3>
            </div>
            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              هل أنت متأكد من حذف المعلم <strong className="text-slate-900">{deleteConfirmTarget.name}</strong> نهائياً من قاعدة البيانات؟
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
