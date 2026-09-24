import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Users,
  CheckCircle,
  Clock,
  Printer,
  Edit3,
  MapPin,
  Video,
  FileText,
  Target,
  ChevronLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Meeting, MeetingCategory, MeetingStatus } from '../../types';
import { filterMeetingsForUser, canUserManageMeeting } from '../../utils/meetingVisibility';
import { hasPermission } from '../../lib/permissions';
import { MeetingFormModal } from './MeetingFormModal';
import { MeetingDetailsModal } from './MeetingDetailsModal';

export const MeetingsManagementView: React.FC = () => {
  const { currentUser, halaqahs, users, meetings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MeetingCategory | 'all'>('all');
  const [myMeetingsOnly, setMyMeetingsOnly] = useState(false);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);

  // Apply Supervisory Visibility & Administrative Scope
  const visibleMeetings = useMemo(() => {
    return filterMeetingsForUser(meetings, currentUser, halaqahs, users);
  }, [meetings, currentUser, halaqahs, users]);

  // Filter based on user UI controls
  const filteredMeetings = useMemo(() => {
    return visibleMeetings.filter((m) => {
      // Status
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Category
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;

      // My Meetings Only
      if (myMeetingsOnly && currentUser) {
        const isCreator = m.createdBy === currentUser.id || (currentUser.teacherId && m.createdBy === currentUser.teacherId);
        const isAttendee = m.attendees?.some((a) => a.userId === currentUser.id || (currentUser.teacherId && a.userId === currentUser.teacherId));
        if (!isCreator && !isAttendee) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchNumber = m.meetingNumber?.toLowerCase().includes(q);
        const matchLocation = m.location?.toLowerCase().includes(q);
        const matchCreator = m.createdByName.toLowerCase().includes(q);
        const matchAttendee = m.attendees?.some((a) => a.name.toLowerCase().includes(q));
        if (!matchTitle && !matchNumber && !matchLocation && !matchCreator && !matchAttendee) {
          return false;
        }
      }

      return true;
    });
  }, [visibleMeetings, statusFilter, categoryFilter, myMeetingsOnly, searchTerm, currentUser]);

  // KPIs
  const stats = useMemo(() => {
    const total = visibleMeetings.length;
    const scheduled = visibleMeetings.filter((m) => m.status === 'scheduled').length;
    const inProgress = visibleMeetings.filter((m) => m.status === 'in_progress').length;
    const completed = visibleMeetings.filter((m) => m.status === 'completed').length;
    const totalDecisions = visibleMeetings.reduce(
      (acc, m) => acc + (m.decisions?.length || 0),
      0
    );
    return { total, scheduled, inProgress, completed, totalDecisions };
  }, [visibleMeetings]);

  const canCreate =
    currentUser &&
    (currentUser.role === 'system_admin' ||
      currentUser.role === 'campus_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'supervisor' ||
      currentUser.role === 'teacher' ||
      hasPermission(currentUser, 'manage_meetings'));

  const handleOpenCreateModal = () => {
    setMeetingToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (meeting: Meeting) => {
    setMeetingToEdit(meeting);
    setIsFormModalOpen(true);
    setIsDetailsModalOpen(false);
  };

  const handleOpenDetails = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsDetailsModalOpen(true);
  };

  const getCategoryLabel = (cat?: MeetingCategory) => {
    switch (cat) {
      case 'teachers':
        return 'اجتماع معلمين';
      case 'supervisors':
        return 'اجتماع مشرفين';
      case 'educational':
        return 'اجتماع تربوي';
      case 'board':
        return 'قيادة المجمع';
      case 'emergency':
        return 'اجتماع طارئ';
      default:
        return 'اجتماع عام';
    }
  };

  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            معتمد وموثق
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3 animate-pulse" />
            قيد الانعقاد
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">
            ملغي
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            مجدول
          </span>
        );
    }
  };

  return (
    <div id="meetings-management-view" className="space-y-6" dir="rtl">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">الاجتماعات والمحاضر الرسمية</h1>
              <p className="text-xs text-slate-500">
                توثيق الجلسات وجداول الأعمال والقرارات ومتابعة التوصيات وفق الحوكمة الإدارية
              </p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            id="schedule-new-meeting-btn"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            جدولة اجتماع جديد
          </button>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">إجمالي الاجتماعات</div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{stats.total}</div>
          </div>
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">اجتماعات مجدولة</div>
            <div className="text-xl font-bold text-amber-600 mt-1 font-mono">{stats.scheduled}</div>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">محاضر معتمدة</div>
            <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">{stats.completed}</div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">القرارات الموثقة</div>
            <div className="text-xl font-bold text-blue-600 mt-1 font-mono">{stats.totalDecisions}</div>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <input
            id="meetings-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالعنوان، رقم المحضر، المقر، أو اسم المشارك..."
            className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="scheduled">مجدول</option>
            <option value="in_progress">قيد الانعقاد</option>
            <option value="completed">معتمد وموثق</option>
            <option value="cancelled">ملغي</option>
          </select>

          {/* Category Filter */}
          <select
            id="category-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">جميع التصنيفات</option>
            <option value="teachers">اجتماعات المعلمين</option>
            <option value="supervisors">اجتماعات المشرفين</option>
            <option value="educational">الاجتماعات التربوية</option>
            <option value="board">مجلس الإدارة</option>
            <option value="general">اجتماعات عامة</option>
            <option value="emergency">اجتماعات طارئة</option>
          </select>

          {/* My Meetings Toggle */}
          <button
            type="button"
            id="my-meetings-filter-btn"
            onClick={() => setMyMeetingsOnly(!myMeetingsOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition border ${
              myMeetingsOnly
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            اجتماعاتي فقط
          </button>
        </div>
      </div>

      {/* Meetings Grid / List */}
      <div className="space-y-3">
        {filteredMeetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((m) => {
              const isManager = canUserManageMeeting(m, currentUser);
              const attendedCount =
                m.attendees?.filter((a) => a.attendanceStatus === 'attended').length || 0;

              return (
                <div
                  key={m.id}
                  id={`meeting-card-${m.id}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Card Top: Badges & Category */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {getCategoryLabel(m.category)}
                      </span>
                      {getStatusBadge(m.status)}
                    </div>

                    {/* Title & Number */}
                    <div>
                      {m.meetingNumber && (
                        <div className="text-[11px] font-mono text-emerald-700 font-bold mb-1">
                          {m.meetingNumber}
                        </div>
                      )}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {m.title}
                      </h3>
                    </div>

                    {/* Metadata Items */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{m.date}</span>
                        <span>•</span>
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{m.startTime}</span>
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        {m.locationType === 'remote' ? (
                          <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{m.location || 'عن بُعد (عبر الإنترنت)'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {m.attendees?.length || 0} مشارك ({attendedCount} حضر)
                        </span>
                      </div>
                    </div>

                    {/* Objectives / Agenda snapshot */}
                    {m.agenda && m.agenda.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 line-clamp-1">
                        <span className="font-semibold text-slate-700">البنود: </span>
                        {m.agenda.map((a) => a.title).join('، ')}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      id={`view-meeting-btn-${m.id}`}
                      type="button"
                      onClick={() => handleOpenDetails(m)}
                      className="flex-1 px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      عرض المحضر
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {isManager && m.status !== 'completed' && m.status !== 'cancelled' && (
                      <button
                        type="button"
                        id={`edit-meeting-btn-${m.id}`}
                        onClick={() => handleOpenEditModal(m)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                        title="تعديل الاجتماع"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">لا توجد اجتماعات متطابقة</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || myMeetingsOnly
                  ? 'لم يتم العثور على أي اجتماعات تطابق معايير البحث والفلترة المحددة.'
                  : 'لم يتم جدولة أي اجتماعات رسمية بعد في هذا المجمع. يمكنك البدء بجدولة اجتماع جديد وتوثيق أهدافه ومدعويه.'}
              </p>
            </div>
            {canCreate && (
              <button
                type="button"
                id="empty-schedule-meeting-btn"
                onClick={handleOpenCreateModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                جدولة أول اجتماع
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <MeetingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        meetingToEdit={meetingToEdit}
      />

      <MeetingDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        meeting={selectedMeeting}
        onEditMeeting={handleOpenEditModal}
      />
    </div>
  );
};
