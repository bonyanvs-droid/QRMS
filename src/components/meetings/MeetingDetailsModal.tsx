import React, { useState } from 'react';
import {
  X,
  Printer,
  Edit3,
  Ban,
  CheckCircle,
  Clock,
  MapPin,
  Video,
  Calendar,
  Users,
  Target,
  ListOrdered,
  FileText,
  Plus,
  Trash2,
  Check,
  UserCheck,
  UserX,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Meeting,
  MeetingAttendee,
  MeetingAttendanceStatus,
  MeetingDecision,
} from '../../types';
import { canUserManageMeeting } from '../../utils/meetingVisibility';

interface MeetingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onEditMeeting?: (meeting: Meeting) => void;
}

export const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onEditMeeting,
}) => {
  const {
    currentUser,
    activeTenant,
    users,
    updateMeetingAttendance,
    completeMeetingMinutes,
    cancelMeeting,
    updateMeeting,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'minutes' | 'print'>('overview');

  // Attendance state
  const [attendeesList, setAttendeesList] = useState<MeetingAttendee[]>([]);

  // Minutes & Decisions state
  const [discussions, setDiscussions] = useState('');
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [postponedItems, setPostponedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Cancel prompt state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // Success/Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!meeting) return;
    setAttendeesList(meeting.attendees || []);
    setDiscussions(meeting.discussions || '');
    setDecisions(meeting.decisions || []);
    setRecommendations(meeting.recommendations || []);
    setPostponedItems(meeting.postponedItems || []);
    setNotes(meeting.notes || '');
    setShowCancelPrompt(false);
    setCancellationReason('');
    setFeedbackMessage(null);
  }, [meeting]);

  if (!isOpen || !meeting) return null;

  const isManager = canUserManageMeeting(meeting, currentUser);
  const isCompleted = meeting.status === 'completed';
  const isCancelled = meeting.status === 'cancelled';

  // Attendance Handlers
  const handleUpdateAttendeeStatus = (
    userId: string,
    status: MeetingAttendanceStatus,
    excuseReason?: string
  ) => {
    setAttendeesList((prev) =>
      prev.map((a) =>
        a.userId === userId ? { ...a, attendanceStatus: status, excuseReason } : a
      )
    );
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      await updateMeetingAttendance(meeting.id, attendeesList);
      setFeedbackMessage({ type: 'success', text: 'تم حفظ وتحديث سجل الحضور بنجاح' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'تعذر حفظ الحضور' });
    } finally {
      setIsSaving(false);
    }
  };

  // Decision Handlers
  const handleAddDecision = () => {
    setDecisions([
      ...decisions,
      {
        id: `dec_${Date.now()}_${decisions.length + 1}`,
        text: '',
        status: 'pending',
      },
    ]);
  };

  const handleUpdateDecision = (
    index: number,
    field: keyof MeetingDecision,
    value: any
  ) => {
    const updated = [...decisions];
    updated[index] = { ...updated[index], [field]: value };
    setDecisions(updated);
  };

  const handleRemoveDecision = (index: number) => {
    setDecisions(decisions.filter((_, i) => i !== index));
  };

  // Recommendations Handlers
  const handleAddRecommendation = () => {
    setRecommendations([...recommendations, '']);
  };

  const handleUpdateRecommendation = (index: number, val: string) => {
    const updated = [...recommendations];
    updated[index] = val;
    setRecommendations(updated);
  };

  const handleRemoveRecommendation = (index: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };

  // Postponed Items Handlers
  const handleAddPostponed = () => {
    setPostponedItems([...postponedItems, '']);
  };

  const handleUpdatePostponed = (index: number, val: string) => {
    const updated = [...postponedItems];
    updated[index] = val;
    setPostponedItems(updated);
  };

  const handleRemovePostponed = (index: number) => {
    setPostponedItems(postponedItems.filter((_, i) => i !== index));
  };

  // Save Minutes as Draft
  const handleSaveDraftMinutes = async () => {
    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      const cleanDecisions = decisions.filter((d) => d.text.trim().length > 0);
      const cleanRecommendations = recommendations.map((r) => r.trim()).filter(Boolean);
      const cleanPostponed = postponedItems.map((p) => p.trim()).filter(Boolean);

      await updateMeeting(
        meeting.id,
        {
          discussions,
          decisions: cleanDecisions,
          recommendations: cleanRecommendations,
          postponedItems: cleanPostponed,
          notes,
          attendees: attendeesList,
        },
        'تحديث مسودة المحضر'
      );
      setFeedbackMessage({ type: 'success', text: 'تم حفظ مسودة المحضر بنجاح' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'تعذر حفظ المسودة' });
    } finally {
      setIsSaving(false);
    }
  };

  // Finalize / Complete Minutes
  const handleFinalizeMinutes = async () => {
    if (!window.confirm('هل أنت متأكد من اعتماد وإقفال محضر الاجتماع رسمياً؟')) {
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);
    try {
      const cleanDecisions = decisions.filter((d) => d.text.trim().length > 0);
      const cleanRecommendations = recommendations.map((r) => r.trim()).filter(Boolean);
      const cleanPostponed = postponedItems.map((p) => p.trim()).filter(Boolean);

      await completeMeetingMinutes(meeting.id, {
        discussions,
        decisions: cleanDecisions,
        recommendations: cleanRecommendations,
        postponedItems: cleanPostponed,
        notes,
        attendees: attendeesList,
      });
      setFeedbackMessage({ type: 'success', text: 'تم اعتماد وإقفال محضر الاجتماع بنجاح' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'تعذر اعتماد المحضر' });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = async () => {
    setIsSaving(true);
    try {
      await cancelMeeting(meeting.id, cancellationReason.trim() || undefined);
      setShowCancelPrompt(false);
      setFeedbackMessage({ type: 'success', text: 'تم إلغاء الاجتماع بنجاح' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'تعذر إلغاء الاجتماع' });
    } finally {
      setIsSaving(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = () => {
    switch (meeting.status) {
      case 'completed':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            منعقد وموثق
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            قيد الانعقاد والتوثيق
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" />
            ملغي
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            مجدول
          </span>
        );
    }
  };

  return (
    <div
      id="meeting-details-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
    >
      <div
        id="meeting-details-modal-container"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-slate-900 line-clamp-2">{meeting.title}</h2>
                {getStatusBadge()}
                {meeting.meetingNumber && (
                  <span className="text-xs font-mono bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                    {meeting.meetingNumber}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1.5 sm:gap-3 mt-0.5 flex-wrap">
                <span>تاريخ: {meeting.date}</span>
                <span>•</span>
                <span>الوقت: {meeting.startTime} {meeting.endTime ? `- ${meeting.endTime}` : ''}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">المنسق: {meeting.createdByName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isManager && !isCompleted && !isCancelled && onEditMeeting && (
              <button
                id="edit-meeting-header-btn"
                onClick={() => onEditMeeting(meeting)}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                تعديل
              </button>
            )}
            <button
              id="print-meeting-btn"
              onClick={() => setActiveTab('print')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              المحضر للطباعة
            </button>
            <button
              id="close-meeting-details-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-white gap-2">
          <button
            id="tab-overview-btn"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Target className="w-4 h-4" />
            البيانات والأهداف والبنود
          </button>

          <button
            id="tab-attendance-btn"
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'attendance'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            سجل الحضور والغياب ({meeting.attendees?.length || 0})
          </button>

          <button
            id="tab-minutes-btn"
            onClick={() => setActiveTab('minutes')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'minutes'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            المحضر والقرارات والتوصيات
            {isCompleted && <Lock className="w-3 h-3 text-emerald-600" />}
          </button>

          <button
            id="tab-print-btn"
            onClick={() => setActiveTab('print')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'print'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Printer className="w-4 h-4" />
            المعاينة الرسمية والطباعة
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <Ban className="w-4 h-4 text-red-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Meta Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">الموعد والتوقيت</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{meeting.date}</div>
                    <div className="text-xs text-slate-600 mt-0.5 font-mono">
                      {meeting.startTime} {meeting.endTime ? `إلى ${meeting.endTime}` : ''}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    {meeting.locationType === 'remote' ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">مكان الانعقاد</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {meeting.locationType === 'in_person'
                        ? 'حضوري بالمجمع'
                        : meeting.locationType === 'remote'
                        ? 'عن بُعد (افتراضي)'
                        : 'مدمج (حضوري وعن بُعد)'}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 truncate">
                      {meeting.location || 'غير محدد'}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">المدعوون والحضور</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {meeting.attendees?.length || 0} عضو
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      حضر: {meeting.attendees?.filter((a) => a.attendanceStatus === 'attended').length || 0} | اعتذر: {meeting.attendees?.filter((a) => a.attendanceStatus === 'excused').length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Online Meeting Link if present */}
              {meeting.meetingUrl && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-blue-900">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">رابط الاجتماع الافتراضي:</span>
                    <a
                      href={meeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-700 underline truncate max-w-md"
                    >
                      {meeting.meetingUrl}
                    </a>
                  </div>
                  <a
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    الانضمام الآن
                  </a>
                </div>
              )}

              {/* Cancellation Reason if cancelled */}
              {isCancelled && meeting.cancellationReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  <span className="font-bold">سبب الإلغاء: </span>
                  {meeting.cancellationReason}
                </div>
              )}

              {/* Description */}
              {meeting.description && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 mb-1">مقدمة وسياق الاجتماع</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {meeting.description}
                  </p>
                </div>
              )}

              {/* Objectives */}
              {meeting.objectives && meeting.objectives.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    أهداف ومخرجات الاجتماع
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {meeting.objectives.map((obj, i) => (
                      <div
                        key={i}
                        className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-950 flex items-start gap-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {i + 1}
                        </span>
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agenda */}
              {meeting.agenda && meeting.agenda.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-emerald-600" />
                    بنود جدول الأعمال
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                    {meeting.agenda.map((item, i) => (
                      <div key={item.id || i} className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center text-xs font-bold text-slate-400">
                            #{i + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{item.title}</div>
                            {item.description && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {item.durationMinutes && (
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {item.durationMinutes} دقيقة
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">سجل التحضير والحضور</h3>
                  <p className="text-xs text-slate-500">
                    رصد حالة حضور كل عضو مشارك في الاجتماع وتوثيق المبررات
                  </p>
                </div>
                {isManager && !isCompleted && !isCancelled && (
                  <button
                    id="save-attendance-btn"
                    onClick={handleSaveAttendance}
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    حفظ سجل الحضور
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">اسم المشارك</th>
                      <th className="p-3">الصفة / الدور</th>
                      <th className="p-3">حالة الحضور</th>
                      <th className="p-3">الملاحظات / سبب الاعتذار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {attendeesList.map((att, idx) => (
                      <tr key={att.userId || idx} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900">{att.name}</td>
                        <td className="p-3 text-slate-500">
                          {att.role === 'teacher'
                            ? 'معلم'
                            : att.role === 'supervisor'
                            ? 'مشرف'
                            : att.role === 'campus_admin'
                            ? 'مدير مجمع'
                            : att.role}
                        </td>
                        <td className="p-3">
                          {isManager && !isCompleted && !isCancelled ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendeeStatus(att.userId, 'attended')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                  att.attendanceStatus === 'attended'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <UserCheck className="w-3 h-3" />
                                حاضر
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendeeStatus(att.userId, 'excused')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                  att.attendanceStatus === 'excused'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                              >
                                <HelpCircle className="w-3 h-3" />
                                معتذر
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateAttendeeStatus(att.userId, 'absent')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                                  att.attendanceStatus === 'absent'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                                }`}
                              >
                                <UserX className="w-3 h-3" />
                                غائب
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 ${
                                att.attendanceStatus === 'attended'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : att.attendanceStatus === 'excused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : att.attendanceStatus === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {att.attendanceStatus === 'attended'
                                ? 'حاضر'
                                : att.attendanceStatus === 'excused'
                                ? 'معتذر'
                                : att.attendanceStatus === 'absent'
                                ? 'غائب'
                                : 'مدعو'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {isManager && !isCompleted && !isCancelled ? (
                            <input
                              type="text"
                              value={att.excuseReason || ''}
                              onChange={(e) =>
                                handleUpdateAttendeeStatus(
                                  att.userId,
                                  att.attendanceStatus,
                                  e.target.value
                                )
                              }
                              placeholder="سبب الاعتذار أو ملاحظة..."
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          ) : (
                            <span className="text-slate-500 text-xs">
                              {att.excuseReason || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MINUTES & DECISIONS */}
          {activeTab === 'minutes' && (
            <div className="space-y-6">
              {isCompleted && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold">
                      تم اعتماد وإقفال هذا المحضر رسمياً ولا يمكن التعديل عليه إلا بإذن مدير المجمع.
                    </span>
                  </div>
                </div>
              )}

              {/* Discussions */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  وقائع ومداولات الاجتماع (ملخص النقاشات)
                </label>
                <textarea
                  id="discussions-textarea"
                  rows={4}
                  disabled={!isManager || isCompleted}
                  value={discussions}
                  onChange={(e) => setDiscussions(e.target.value)}
                  placeholder="توثيق أبرز النقاط التي تمت مناقشتها خلال الجلسة..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>

              {/* Actionable Decisions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      القرارات والإجراءات المتفق عليها ({decisions.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      قرارات محددة مع تحديد المسؤول وتاريخ الإنجاز
                    </p>
                  </div>
                  {isManager && !isCompleted && (
                    <button
                      type="button"
                      id="add-decision-btn"
                      onClick={handleAddDecision}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة قرار
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {decisions.map((dec, idx) => (
                    <div
                      key={dec.id || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 text-center text-xs font-bold text-slate-500 mt-1.5">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          disabled={!isManager || isCompleted}
                          value={dec.text}
                          onChange={(e) =>
                            handleUpdateDecision(idx, 'text', e.target.value)
                          }
                          placeholder="نص القرار / الإجراء المطلوب تنفيذه"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                        />
                        {isManager && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDecision(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pr-7">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">المسؤول عن التنفيذ</label>
                          <select
                            disabled={!isManager || isCompleted}
                            value={dec.responsibleUserId || ''}
                            onChange={(e) => {
                              const found = users.find((u) => u.id === e.target.value);
                              handleUpdateDecision(idx, 'responsibleUserId', e.target.value);
                              handleUpdateDecision(idx, 'responsibleUserName', found?.name || '');
                            }}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                          >
                            <option value="">-- اختر المسؤول --</option>
                            {attendeesList.map((a) => (
                              <option key={a.userId} value={a.userId}>
                                {a.name} ({a.role})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">تاريخ الإنجاز المستهدف</label>
                          <input
                            type="date"
                            disabled={!isManager || isCompleted}
                            value={dec.dueDate || ''}
                            onChange={(e) =>
                              handleUpdateDecision(idx, 'dueDate', e.target.value)
                            }
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">حالة القرار</label>
                          <select
                            disabled={!isManager || isCompleted}
                            value={dec.status || 'pending'}
                            onChange={(e) =>
                              handleUpdateDecision(idx, 'status', e.target.value)
                            }
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                          >
                            <option value="pending">قيد الانتظار</option>
                            <option value="in_progress">جاري التنفيذ</option>
                            <option value="completed">تم الإنجاز</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  {decisions.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      لا توجد قرارات موثقة حتى الآن
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations & Postponed Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recommendations */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      التوصيات والمقترحات
                    </label>
                    {isManager && !isCompleted && (
                      <button
                        type="button"
                        onClick={handleAddRecommendation}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        إضافة
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled={!isManager || isCompleted}
                          value={rec}
                          onChange={(e) => handleUpdateRecommendation(i, e.target.value)}
                          placeholder={`توصية رقم ${i + 1}`}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                        />
                        {isManager && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRecommendation(i)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {recommendations.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        لا توجد توصيات مسجلة
                      </div>
                    )}
                  </div>
                </div>

                {/* Postponed items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      البنود المؤجلة لاجتماعات قادمة
                    </label>
                    {isManager && !isCompleted && (
                      <button
                        type="button"
                        onClick={handleAddPostponed}
                        className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        إضافة
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {postponedItems.map((post, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          disabled={!isManager || isCompleted}
                          value={post}
                          onChange={(e) => handleUpdatePostponed(i, e.target.value)}
                          placeholder={`بند مؤجل ${i + 1}`}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                        />
                        {isManager && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleRemovePostponed(i)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {postponedItems.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        لا توجد بنود مؤجلة
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Minutes */}
              {isManager && !isCompleted && !isCancelled && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    id="save-draft-minutes-btn"
                    onClick={handleSaveDraftMinutes}
                    disabled={isSaving}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
                  >
                    حفظ كمسودة
                  </button>
                  <button
                    type="button"
                    id="finalize-minutes-btn"
                    onClick={handleFinalizeMinutes}
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    اعتماد وإقفال المحضر رسمياً
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: OFFICIAL PRINT / EXPORT VIEW */}
          {activeTab === 'print' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between no-print p-3 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">
                  معاينة النموذج الرسمي المعتمد لمحضر الاجتماع جاهز للطباعة والتصدير
                </span>
                <button
                  type="button"
                  id="trigger-print-btn"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الآن / تصدير PDF
                </button>
              </div>

              {/* Official Document Sheet */}
              <div
                id="official-meeting-print-sheet"
                className="bg-white p-8 border border-slate-300 rounded-xl shadow-sm text-slate-900 font-sans space-y-6 print:p-0 print:border-0 print:shadow-none"
              >
                {/* Official Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <div className="text-xs font-bold text-slate-600">المملكة العربية السعودية</div>
                    <div className="text-sm font-bold text-slate-900">{activeTenant?.name || 'مجمع حلقات القرآن الكريم'}</div>
                    <div className="text-xs text-slate-500">نظام إدارة الحلقات والمحاضر (QRMS)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-extrabold text-slate-900">محضر اجتماع رسمي</div>
                    <div className="text-xs font-mono font-bold text-emerald-800 mt-1">
                      {meeting.meetingNumber || `رقم القيد: ${meeting.id.substring(0, 10)}`}
                    </div>
                  </div>
                  <div className="text-left text-xs text-slate-600">
                    <div>التاريخ: {meeting.date}</div>
                    <div>الوقت: {meeting.startTime}</div>
                    <div>الحالة: {meeting.status === 'completed' ? 'معتمد' : 'مسودة'}</div>
                  </div>
                </div>

                {/* Meeting Meta Table */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold">عنوان الاجتماع: </span>{meeting.title}</div>
                    <div><span className="font-bold">مقر الانعقاد: </span>{meeting.location || 'حضوري بالمجمع'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-bold">أمين / مقرر الجلسة: </span>{meeting.createdByName}</div>
                    <div><span className="font-bold">نوع الاجتماع: </span>{meeting.category || 'اجتماع عمل'}</div>
                  </div>
                </div>

                {/* Objectives & Agenda */}
                <div className="space-y-3 text-xs">
                  <div className="font-bold text-slate-900 border-r-4 border-emerald-600 pr-2">
                    أولاً: أهداف وبنود جدول الأعمال
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 pr-2">
                    {meeting.agenda?.map((ag, idx) => (
                      <li key={ag.id || idx}>
                        <span className="font-semibold">{ag.title}</span>
                        {ag.durationMinutes && ` (${ag.durationMinutes} دقيقة)`}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Attendance Matrix */}
                <div className="space-y-3 text-xs">
                  <div className="font-bold text-slate-900 border-r-4 border-emerald-600 pr-2">
                    ثانياً: سجل الحضور والغياب
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-center text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="border border-slate-300 p-1.5 w-10">#</th>
                        <th className="border border-slate-300 p-1.5 text-right">الاسم</th>
                        <th className="border border-slate-300 p-1.5">الصفة</th>
                        <th className="border border-slate-300 p-1.5">حالة الحضور</th>
                        <th className="border border-slate-300 p-1.5">التوقيع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meeting.attendees?.map((att, i) => (
                        <tr key={att.userId || i}>
                          <td className="border border-slate-300 p-1.5 font-bold">{i + 1}</td>
                          <td className="border border-slate-300 p-1.5 text-right font-medium">{att.name}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-600">{att.role}</td>
                          <td className="border border-slate-300 p-1.5">
                            {att.attendanceStatus === 'attended' ? 'حاضر' : att.attendanceStatus === 'excused' ? 'معتذر' : 'غائب'}
                          </td>
                          <td className="border border-slate-300 p-1.5 w-28 text-slate-300 font-mono">
                            {att.attendanceStatus === 'attended' ? '✓ معتمد' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Discussions */}
                {meeting.discussions && (
                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-slate-900 border-r-4 border-emerald-600 pr-2">
                      ثالثاً: وقائع ومداولات الجلسة
                    </div>
                    <p className="text-slate-700 leading-relaxed pr-2 whitespace-pre-line bg-slate-50 p-3 rounded border border-slate-200">
                      {meeting.discussions}
                    </p>
                  </div>
                )}

                {/* Decisions Table */}
                <div className="space-y-3 text-xs">
                  <div className="font-bold text-slate-900 border-r-4 border-emerald-600 pr-2">
                    رابعاً: القرارات والإجراءات التنفيذية
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-slate-300 p-1.5 w-10">م</th>
                        <th className="border border-slate-300 p-1.5 text-right">القرار / الإجراء</th>
                        <th className="border border-slate-300 p-1.5 w-36">المسؤول</th>
                        <th className="border border-slate-300 p-1.5 w-28">موعد الإنجاز</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meeting.decisions && meeting.decisions.length > 0 ? (
                        meeting.decisions.map((dec, i) => (
                          <tr key={dec.id || i}>
                            <td className="border border-slate-300 p-1.5 text-center font-bold">{i + 1}</td>
                            <td className="border border-slate-300 p-1.5">{dec.text}</td>
                            <td className="border border-slate-300 p-1.5 text-center">{dec.responsibleUserName || '-'}</td>
                            <td className="border border-slate-300 p-1.5 text-center font-mono">{dec.dueDate || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-slate-300 p-2 text-center text-slate-400">
                            لا توجد قرارات ملزمة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recommendations */}
                {meeting.recommendations && meeting.recommendations.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-slate-900 border-r-4 border-emerald-600 pr-2">
                      خامساً: التوصيات والمقترحات
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pr-2">
                      {meeting.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Signatures Block */}
                <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs font-bold text-slate-900">
                  <div className="space-y-8">
                    <div>مقرر الاجتماع</div>
                    <div className="text-slate-500 font-normal">{meeting.createdByName}</div>
                  </div>
                  <div className="space-y-8">
                    <div>المشرف التعليمي</div>
                    <div className="text-slate-400 font-normal">........................</div>
                  </div>
                  <div className="space-y-8">
                    <div>مدير المجمع (الاعتماد والختم)</div>
                    <div className="text-slate-400 font-normal">........................</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Status controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            {isManager && !isCancelled && !isCompleted && (
              <>
                {!showCancelPrompt ? (
                  <button
                    type="button"
                    id="show-cancel-prompt-btn"
                    onClick={() => setShowCancelPrompt(true)}
                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition"
                  >
                    إلغاء هذا الاجتماع
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="سبب الإلغاء..."
                      className="px-3 py-1 text-xs bg-white border border-red-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      id="confirm-cancel-meeting-btn"
                      onClick={handleCancelMeeting}
                      disabled={isSaving}
                      className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                    >
                      تأكيد الإلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-2 py-1 text-slate-500 text-xs hover:bg-slate-200 rounded-lg"
                    >
                      تراجع
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            id="close-meeting-modal-bottom-btn"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
