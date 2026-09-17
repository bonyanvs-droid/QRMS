import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  CheckCircle2,
  Clock,
  Navigation,
  Users,
  AlertTriangle,
  Building,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  GraduationCap,
  Calendar as CalendarIcon,
  UserCheck,
  User,
  X,
  HelpCircle,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { filterStudentsByScope, filterHalaqahsByScope } from '../../lib/permissions';
import { exportStaffAttendanceToExcel, printAttendanceReport, exportAttendanceToExcel } from '../../utils/exportUtils';
import { getLocalDateString, isRecordForDate } from '../../utils/geoAttendance';
import { DailySessionRecord, Student, AttendanceRecord } from '../../types';

export const SmartAttendanceWidget: React.FC = () => {
  const {
    currentUser,
    activeTenant,
    staffAttendanceRecords,
    recordGeoAttendance,
    deleteStaffAttendance,
    students,
    halaqahs,
    stages,
    sessionRecords,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Geo Failure Popup Modal State
  const [geoErrorModal, setGeoErrorModal] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // Manual Check-in Reason Modal State
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('اجتماع');
  const [customReason, setCustomReason] = useState('');

  // Active Tab: 'my_attendance' | 'staff_team' | 'students'
  const isStudentOrParent = currentUser?.role === 'student' || currentUser?.role === 'parent';
  const defaultTab = isStudentOrParent ? 'students' : 'my_attendance';
  const [activeTab, setActiveTab] = useState<'my_attendance' | 'staff_team' | 'students'>(defaultTab);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  
  // Date Range Filters (من تاريخ - إلى تاريخ)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Tenant attendance config
  const attendanceCfg = activeTenant?.attendanceConfig || {
    latitude: 21.575462,
    longitude: 39.128934,
    radiusMeters: 200,
    regularDays: [0, 1, 2, 3, 4], // Sun-Thu
    welcomeMessage: 'أهلاً بك في مقر المجمع القرآني. يرجى تسجيل حضورك الذكي عند تواجدك داخل النطاق المحدد.',
  };

  const todayStr = getLocalDateString();

  // Current User Staff Check-in Record for Today (Strictly today, ignoring past records)
  const myRecordToday = (staffAttendanceRecords || []).find(
    (r) =>
      (r.tenantId === activeTenant?.id || !r.tenantId) &&
      r.userId === currentUser?.id &&
      isRecordForDate(r.date || r.timestamp, todayStr)
  );

  const isCampusAdminOrManager = currentUser && ['campus_admin', 'system_admin', 'admin', 'manager'].includes(currentUser.role);

  // Quick 1-click administrative check-in for campus admin / management
  const handleAdminImmediateCheckIn = async () => {
    if (loading) return;
    setLoading(true);
    const reason = 'حضور إداري - مدير المجمع (اعتماد فوري من المنصة)';
    const res = await recordGeoAttendance(reason);
    setLoading(false);
    if (res.success) {
      setGeoErrorModal({ open: false, message: '' });
    } else {
      setGeoErrorModal({
        open: true,
        message: res.message || 'تعذر تسجيل الحضور الإداري.',
      });
    }
  };

  // Handle Smart Geo Check-in
  const handleSmartCheckIn = async () => {
    if (loading) return;
    setLoading(true);
    const res = await recordGeoAttendance();
    setLoading(false);

    if (res.success) {
      setGeoErrorModal({ open: false, message: '' });
    } else {
      // Show failure details in Modal Popup
      setGeoErrorModal({
        open: true,
        message: res.message || 'تعذر تحديد الموقع الجغرافي أو أنك خارج نطاق المجمع المسموح.',
      });
    }
  };

  // Handle Manual Check-in Submission
  const handleManualCheckInSubmit = async () => {
    const finalReason = selectedReason === 'أخرى' ? customReason : selectedReason;
    if (!finalReason.trim()) {
      alert('يرجى تحديد أو كتابة سبب الحضور اليدوي.');
      return;
    }

    if (loading) return;
    setLoading(true);
    const res = await recordGeoAttendance(finalReason);
    setLoading(false);

    if (res.success) {
      setReasonModalOpen(false);
      setGeoErrorModal({ open: false, message: '' });
    } else {
      setReasonModalOpen(false);
      setGeoErrorModal({
        open: true,
        message: res.message || 'تعذر تسجيل الحضور اليدوي.',
      });
    }
  };

  // Scoped Halaqahs
  const accessibleHalaqahs = useMemo(() => {
    return filterHalaqahsByScope(halaqahs, currentUser);
  }, [halaqahs, currentUser]);

  // Scoped Students
  const accessibleStudents = useMemo(() => {
    return filterStudentsByScope(students, currentUser, halaqahs);
  }, [students, currentUser, halaqahs]);

  const accessibleStudentIds = useMemo(() => {
    return new Set(accessibleStudents.map((s) => s.id));
  }, [accessibleStudents]);

  // Filtered Staff Attendance Records
  const filteredStaffRecords = useMemo(() => {
    return (staffAttendanceRecords || []).filter((r) => {
      if (activeTenant?.id && r.tenantId && r.tenantId !== activeTenant.id) return false;

      // Tab Scoping: 'my_attendance' vs 'staff_team'
      if (activeTab === 'my_attendance') {
        if (r.userId !== currentUser?.id) return false;
      } else if (activeTab === 'staff_team') {
        // Teacher sees own + other teachers in same halaqah if any
        if (currentUser?.role === 'teacher') {
          if (r.userId !== currentUser.id) return false;
        } else if (currentUser?.role === 'supervisor') {
          if (r.userId !== currentUser.id && r.userRole === 'admin') return false;
        }
      }

      // Date Range Filter (من تاريخ - إلى تاريخ)
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (r.userName || '').toLowerCase().includes(q);
        const matchesRole = (r.userRole || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRole) return false;
      }

      return true;
    });
  }, [staffAttendanceRecords, activeTenant?.id, activeTab, currentUser, startDate, endDate, searchQuery]);

  // Filtered Student Attendance Session Records
  const filteredStudentRecords = useMemo(() => {
    return (sessionRecords || []).filter((r) => {
      // Must be accessible student
      if (!accessibleStudentIds.has(r.studentId)) return false;

      const studentObj = students.find((s) => s.id === r.studentId);
      if (!studentObj) return false;

      // Stage Filter
      if (selectedStageId !== 'all') {
        const halaqahObj = halaqahs.find((h) => h.id === r.halaqahId || h.id === studentObj.halaqahId);
        if (studentObj.stageId !== selectedStageId && halaqahObj?.stageId !== selectedStageId) {
          return false;
        }
      }

      // Halaqah Filter
      if (selectedHalaqahId !== 'all') {
        if (r.halaqahId !== selectedHalaqahId && studentObj.halaqahId !== selectedHalaqahId) {
          return false;
        }
      }

      // Status Filter
      if (selectedStatusFilter !== 'all') {
        if (r.attendance !== selectedStatusFilter) return false;
      }

      // Date Range Filter (من تاريخ - إلى تاريخ)
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStudent = studentObj.fullName.toLowerCase().includes(q);
        const matchesHalaqah = (r.halaqahId || '').toLowerCase().includes(q);
        if (!matchesStudent && !matchesHalaqah) return false;
      }

      return true;
    });
  }, [
    sessionRecords,
    accessibleStudentIds,
    students,
    halaqahs,
    selectedStageId,
    selectedHalaqahId,
    selectedStatusFilter,
    startDate,
    endDate,
    searchQuery,
  ]);

  const handleDeleteRecord = async (recordId: string, staffName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف سجل حضور (${staffName})؟`)) return;
    try {
      setDeletingId(recordId);
      await deleteStaffAttendance(recordId);
    } catch {
      alert('تعذر حذف السجل.');
    } finally {
      setDeletingId(null);
    }
  };

  // Export Staff Attendance
  const handleExportStaffExcel = () => {
    const title = activeTab === 'my_attendance' ? 'سجل_حضوري_الشخصي' : 'سجل_حضور_الكادر';
    exportStaffAttendanceToExcel(filteredStaffRecords, {
      title,
      fileName: `${title}_${activeTenant?.name || 'المجمع'}_${startDate || 'الكل'}_إلى_${endDate || 'الكل'}.xlsx`,
    });
  };

  const handlePrintStaffPDF = () => {
    const title = activeTab === 'my_attendance' ? 'تقرير الحضور الشخصي' : 'تقرير حضور الكادر والقيادات';
    const rangeText = startDate || endDate ? `(الفترة من ${startDate || 'بداية السجلات'} إلى ${endDate || 'اليوم'})` : '(كافة السجلات)';
    const headers = ['م', 'اسم الكادر', 'الدور الوظيفي', 'التاريخ', 'وقت التسجيل', 'نوع اليوم', 'المسافة'];
    const rows = filteredStaffRecords.map((r) => {
      const timeStr = r.timestamp
        ? new Date(r.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        : '—';
      const dayType = r.isRegularDay ? 'معتاد' : `غير معتاد (${r.reason || 'نشاط'})`;
      return [r.userName, r.userRole, r.date, timeStr, dayType, `${r.locationData?.distanceMeters || 0}م`];
    });

    printAttendanceReport(
      title,
      `${rangeText} - العدد: ${filteredStaffRecords.length} سجل`,
      headers,
      rows,
      activeTenant?.name || 'المجمع القرآني'
    );
  };

  // Export Student Attendance
  const handleExportStudentExcel = () => {
    exportAttendanceToExcel(filteredStudentRecords, accessibleStudents, 1);
  };

  const handlePrintStudentPDF = () => {
    const rangeText = startDate || endDate ? `(الفترة من ${startDate || 'البداية'} إلى ${endDate || 'اليوم'})` : '(كافة السجلات)';
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const halaqahMap = new Map(halaqahs.map((h) => [h.id, h.name]));

    const headers = ['م', 'التاريخ', 'اسم الطالب', 'الحلقة', 'حالة الحضور', 'ملاحظات المعلم'];
    const rows = filteredStudentRecords.map((r) => {
      const st = studentMap.get(r.studentId);
      const hName = halaqahMap.get(r.halaqahId || st?.halaqahId || '') || r.halaqahId || '—';
      const statusText =
        r.attendance === 'present'
          ? 'حاضر 🟢'
          : r.attendance === 'late'
          ? 'متأخر 🟡'
          : r.attendance === 'excused'
          ? 'استئذان 🔵'
          : 'غائب 🔴';

      return [r.date, st?.fullName || '—', hName, statusText, r.teacherRemarks || '—'];
    });

    printAttendanceReport(
      'تقرير حضور وافتقاد الطلاب',
      `${rangeText} - العدد: ${filteredStudentRecords.length} سجل`,
      headers,
      rows,
      activeTenant?.name || 'المجمع القرآني'
    );
  };

  const isAdminOrSupervisor =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'system_admin' ||
    currentUser?.role === 'campus_admin' ||
    currentUser?.role === 'supervisor';

  return (
    <div className="space-y-5">
      {/* 1. Today's Check-in Card (First Component on Page) */}
      {!isStudentOrParent && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">حالة حضورك اليوم</h3>
            </div>
            <span className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/60 font-medium">
              {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {myRecordToday ? (
            <div className="flex items-center gap-3.5 bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-inner">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs md:text-sm font-bold text-emerald-950">تم تسجيل حضورك بنجاح اليوم</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  وقت التسجيل: <strong className="font-mono">{new Date(myRecordToday.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</strong>
                  {myRecordToday.reason && <span className="mr-2 text-amber-800 font-semibold">(السبب: {myRecordToday.reason})</span>}
                  {myRecordToday.locationData?.distanceMeters !== undefined && (
                    <span className="mr-2 text-slate-600 font-normal">(المسافة: {myRecordToday.locationData.distanceMeters}م)</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-600">
                  لم تقم بتسجيل الحضور بعد لهذا اليوم:
                </p>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full w-fit shrink-0">
                  نطاق المقر: {attendanceCfg.radiusMeters} متر
                </span>
              </div>

              {/* Attendance Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleSmartCheckIn}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 animate-spin" />
                      <span>جاري الفحص...</span>
                    </span>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span>تسجيل حضور ذكي (GPS)</span>
                    </>
                  )}
                </button>

                {isCampusAdminOrManager && (
                  <button
                    onClick={handleAdminImmediateCheckIn}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Building className="w-4 h-4" />
                    <span>حضور إداري مباشر (مدير المجمع)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedReason('اجتماع');
                    setCustomReason('');
                    setReasonModalOpen(true);
                  }}
                  disabled={loading}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-slate-500" />
                  <span>تسجيل يدوي بعذر</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Responsive Navigation & View Tabs */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Tab Selection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {!isStudentOrParent && (
              <button
                onClick={() => setActiveTab('my_attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'my_attendance'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>حضوري</span>
              </button>
            )}

            {!isStudentOrParent && (currentUser?.role === 'admin' || currentUser?.role === 'supervisor' || currentUser?.role === 'system_admin' || currentUser?.role === 'campus_admin') && (
              <button
                onClick={() => setActiveTab('staff_team')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'staff_team'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>العاملين</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>الطلاب</span>
            </button>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={activeTab !== 'students' ? handleExportStaffExcel : handleExportStudentExcel}
              className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={activeTab !== 'students' ? handlePrintStaffPDF : handlePrintStudentPDF}
              className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>طباعة PDF</span>
            </button>
          </div>
        </div>

        {/* 3. Advanced Filter Controls (Search + Date Range + Stages/Halaqahs) */}
        <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder={activeTab !== 'students' ? 'بحث بالاسم أو الدور...' : 'بحث باسم الطالب...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Date Range: From Date (من تاريخ) */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 border border-slate-300 rounded-lg">
            <span className="text-[11px] text-slate-500 font-bold shrink-0">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-xs text-slate-800 focus:ring-0"
            />
          </div>

          {/* Date Range: To Date (إلى تاريخ) */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 border border-slate-300 rounded-lg">
            <span className="text-[11px] text-slate-500 font-bold shrink-0">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-xs text-slate-800 focus:ring-0"
            />
          </div>

          {/* Student Specific Filters: Stage */}
          {activeTab === 'students' && isAdminOrSupervisor && (
            <div>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">كل المراحل التعليمية</option>
                {stages.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    {stg.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Specific Filters: Halaqah */}
          {activeTab === 'students' && (isAdminOrSupervisor || currentUser?.role === 'teacher') && (
            <div>
              <select
                value={selectedHalaqahId}
                onChange={(e) => setSelectedHalaqahId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">كل الحلقات المصرح بها</option>
                {accessibleHalaqahs.map((hlq) => (
                  <option key={hlq.id} value={hlq.id}>
                    {hlq.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters Quick Button */}
          {(startDate || endDate || searchQuery || selectedStageId !== 'all' || selectedHalaqahId !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchQuery('');
                setSelectedStageId('all');
                setSelectedHalaqahId('all');
                setSelectedStatusFilter('all');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 underline font-semibold self-center justify-self-end"
            >
              إلغاء التصفية
            </button>
          )}
        </div>

        {/* 4. Data Tables */}

        {/* STAFF OR PERSONAL ATTENDANCE TABLE */}
        {activeTab !== 'students' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {activeTab === 'my_attendance' ? 'سجل حضورك الشخصي' : 'سجل كادر المجمع'}{' '}
                <strong className="text-slate-800">({filteredStaffRecords.length} سجل)</strong>
              </span>
              {(startDate || endDate) && (
                <span className="text-emerald-700 font-semibold">
                  النطاق الزمني: {startDate || 'البداية'} ⬅️ {endDate || 'اليوم'}
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">م</th>
                    <th className="py-2.5 px-3">اسم الموظف / الكادر</th>
                    <th className="py-2.5 px-3">الدور الوظيفي</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">وقت التبصيم</th>
                    <th className="py-2.5 px-3">نوع اليوم</th>
                    <th className="py-2.5 px-3">المسافة عن المقر</th>
                    {isAdminOrSupervisor && <th className="py-2.5 px-3 text-center">إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaffRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        لا توجد سجلات حضور تطابق الفلاتر المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredStaffRecords.map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rec.userName}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{rec.userRole}</td>
                        <td className="py-2.5 px-3 text-slate-700 dir-ltr text-right font-mono">{rec.date}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">
                          {rec.timestamp
                            ? new Date(rec.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {rec.isRegularDay ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              معتاد
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                              غير معتاد ({rec.reason || 'نشاط'})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {rec.locationData?.distanceMeters !== undefined ? `${rec.locationData.distanceMeters}م` : '—'}
                        </td>
                        {isAdminOrSupervisor && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord(rec.id, rec.userName)}
                              disabled={deletingId === rec.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-40"
                              title="حذف هذا السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STUDENTS ATTENDANCE TABLE */}
        {activeTab === 'students' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                سجلات حضور الطلاب المفلترة <strong className="text-slate-800">({filteredStudentRecords.length} سجل)</strong>
              </span>
              {(startDate || endDate) && (
                <span className="text-emerald-700 font-semibold">
                  النطاق الزمني: {startDate || 'البداية'} ⬅️ {endDate || 'اليوم'}
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">م</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">اسم الطالب</th>
                    <th className="py-2.5 px-3">الحلقة</th>
                    <th className="py-2.5 px-3">حالة الحضور</th>
                    <th className="py-2.5 px-3">ملاحظات المعلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        لا توجد سجلات حضور للطلاب تطابق الفلاتر المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentRecords.map((rec, idx) => {
                      const studentObj = students.find((s) => s.id === rec.studentId);
                      const halaqahObj = halaqahs.find((h) => h.id === rec.halaqahId || h.id === studentObj?.halaqahId);

                      return (
                        <tr key={rec.id || idx} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-700 dir-ltr text-right font-mono">{rec.date}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{studentObj?.fullName || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{halaqahObj?.name || rec.halaqahId || '—'}</td>
                          <td className="py-2.5 px-3 font-bold">
                            {rec.attendance === 'present' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px]">
                                🟢 حاضر
                              </span>
                            )}
                            {rec.attendance === 'late' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px]">
                                🟡 متأخر
                              </span>
                            )}
                            {rec.attendance === 'excused' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[11px]">
                                🔵 استئذان
                              </span>
                            )}
                            {rec.attendance === 'absent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px]">
                                🔴 غائب
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{rec.teacherRemarks || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 5. POPUP MODAL 1: Geo Attendance Failure Notification */}
      {geoErrorModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setGeoErrorModal({ open: false, message: '' })}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">تعذر تسجيل الحضور الذكي تلقائياً</h3>
                <p className="text-xs text-rose-700 font-semibold">{geoErrorModal.message}</p>
              </div>
            </div>

            {/* Campus & Location Info Card inside Modal */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-900">المجمع المستهدف:</span>
                <span className="font-semibold text-emerald-800">{activeTenant?.name || 'مجمع الغزاوي القرآني'}</span>
              </div>

              <div className="flex items-start justify-between">
                <span className="font-bold text-slate-900 shrink-0">موقع المقر المعتمد:</span>
                <span className="text-slate-600 text-left dir-ltr">
                  (2529 6389 عمر بن باجنيد، الزهراء، جدة 23424)
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                <span className="font-bold text-slate-900">إحداثيات المقر الرسمية:</span>
                <span className="font-mono text-emerald-700 dir-ltr">
                  {attendanceCfg.latitude}, {attendanceCfg.longitude}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">النطاق الجغرافي المسموح:</span>
                <span className="font-bold text-emerald-700">{attendanceCfg.radiusMeters} متر</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 bg-amber-50 p-3 rounded-lg border border-amber-200/80 text-amber-900">
              💡 <strong>تنبيه:</strong> إذا كنت متواجداً بالفعل داخل مقر المجمع ولكن تعذر التقاط الموقع، يرجى التأكد من تشغيل خدمة الموقع (GPS) والتأكد من السماح للمتصفح بالوصول لموقعك الجغرافي.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setGeoErrorModal({ open: false, message: '' })}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. POPUP MODAL 2: Manual Check-in Reason Modal */}
      {reasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">تسجيل حضور يدوي / عذر موقع</h3>
            <p className="text-xs text-slate-600">
              يرجى تحديد أو اختيار سبب الحضور اليدوي ليتم اعتماده وإرساله للمشرف والمدير:
            </p>
            <div className="space-y-2">
              {['تعطل موقع الجوال (GPS)', 'مهمة خارجية رسمية', 'اجتماع خارجي', 'نشاط مجمع', 'أخرى'].map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/80 transition"
                >
                  <input
                    type="radio"
                    name="attendanceReason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold">{r}</span>
                </label>
              ))}
              {selectedReason === 'أخرى' && (
                <input
                  type="text"
                  placeholder="اكتب السبب بالتفصيل..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReasonModalOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleManualCheckInSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2"
              >
                {loading && <Navigation className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? 'جاري الاعتماد والتسجيل...' : 'تأكيد الحضور اليدوي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
