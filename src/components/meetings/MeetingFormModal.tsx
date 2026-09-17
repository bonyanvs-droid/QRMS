import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Video,
  Target,
  ListOrdered,
  Users,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Meeting,
  MeetingCategory,
  MeetingLocationType,
  MeetingAgendaItem,
  MeetingAttendee,
  User,
} from '../../types';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingToEdit?: Meeting | null;
  onSaveSuccess?: () => void;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  isOpen,
  onClose,
  meetingToEdit,
  onSaveSuccess,
}) => {
  const { currentUser, activeTenantId, users, addMeeting, updateMeeting } = useApp();

  const [title, setTitle] = useState('');
  const [meetingNumber, setMeetingNumber] = useState('');
  const [category, setCategory] = useState<MeetingCategory>('teachers');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('16:30');
  const [endTime, setEndTime] = useState('17:30');
  const [locationType, setLocationType] = useState<MeetingLocationType>('in_person');
  const [location, setLocation] = useState('قاعة الاجتماعات');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [description, setDescription] = useState('');

  // Objectives
  const [objectives, setObjectives] = useState<string[]>(['']);

  // Agenda
  const [agenda, setAgenda] = useState<MeetingAgendaItem[]>([
    {
      id: `ag_${Date.now()}_1`,
      title: 'افتتاح الاجتماع والترحيب بالحضور',
      durationMinutes: 10,
    },
  ]);

  // Selected Attendees
  const [selectedAttendees, setSelectedAttendees] = useState<MeetingAttendee[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter available users in the same tenant
  const tenantUsers = users.filter((u) => {
    if (!u.isActive) return false;
    if (currentUser?.role === 'system_admin') return true;
    return !u.tenantId || u.tenantId === activeTenantId;
  });

  // Populate form on edit or open
  useEffect(() => {
    if (!isOpen) return;

    if (meetingToEdit) {
      setTitle(meetingToEdit.title);
      setMeetingNumber(meetingToEdit.meetingNumber || '');
      setCategory(meetingToEdit.category || 'teachers');
      setDate(meetingToEdit.date);
      setStartTime(meetingToEdit.startTime);
      setEndTime(meetingToEdit.endTime || '');
      setLocationType(meetingToEdit.locationType);
      setLocation(meetingToEdit.location || '');
      setMeetingUrl(meetingToEdit.meetingUrl || '');
      setDescription(meetingToEdit.description || '');
      setObjectives(
        meetingToEdit.objectives && meetingToEdit.objectives.length > 0
          ? meetingToEdit.objectives
          : ['']
      );
      setAgenda(
        meetingToEdit.agenda && meetingToEdit.agenda.length > 0
          ? meetingToEdit.agenda
          : [{ id: `ag_${Date.now()}_1`, title: 'افتتاحية الاجتماع' }]
      );
      setSelectedAttendees(meetingToEdit.attendees || []);
    } else {
      // New meeting initialization
      setTitle('');
      setMeetingNumber(`م-${new Date().getFullYear()}/${Math.floor(Math.random() * 90 + 10)}`);
      setCategory('teachers');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('16:30');
      setEndTime('17:30');
      setLocationType('in_person');
      setLocation('قاعة الاجتماعات الرئيسية');
      setMeetingUrl('');
      setDescription('');
      setObjectives(['']);
      setAgenda([
        {
          id: `ag_${Date.now()}_1`,
          title: 'افتتاح الاجتماع واستعراض جدول الأعمال',
          durationMinutes: 10,
        },
      ]);

      // Add current user as default attendee (creator)
      if (currentUser) {
        setSelectedAttendees([
          {
            userId: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            attendanceStatus: 'attended',
          },
        ]);
      } else {
        setSelectedAttendees([]);
      }
    }
    setErrorMessage('');
  }, [isOpen, meetingToEdit, currentUser, activeTenantId]);

  if (!isOpen) return null;

  // Objective handlers
  const handleAddObjective = () => {
    setObjectives([...objectives, '']);
  };

  const handleUpdateObjective = (index: number, val: string) => {
    const updated = [...objectives];
    updated[index] = val;
    setObjectives(updated);
  };

  const handleRemoveObjective = (index: number) => {
    if (objectives.length <= 1) {
      setObjectives(['']);
      return;
    }
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  // Agenda handlers
  const handleAddAgendaItem = () => {
    setAgenda([
      ...agenda,
      {
        id: `ag_${Date.now()}_${agenda.length + 1}`,
        title: '',
        durationMinutes: 15,
      },
    ]);
  };

  const handleUpdateAgendaItem = (
    index: number,
    field: keyof MeetingAgendaItem,
    value: any
  ) => {
    const updated = [...agenda];
    updated[index] = { ...updated[index], [field]: value };
    setAgenda(updated);
  };

  const handleRemoveAgendaItem = (index: number) => {
    if (agenda.length <= 1) {
      setAgenda([
        {
          id: `ag_${Date.now()}_1`,
          title: '',
          durationMinutes: 10,
        },
      ]);
      return;
    }
    setAgenda(agenda.filter((_, i) => i !== index));
  };

  // Attendee toggle
  const handleToggleAttendee = (user: User) => {
    const exists = selectedAttendees.some((a) => a.userId === user.id);
    if (exists) {
      // Don't remove if they are the creator in edit mode
      if (meetingToEdit && meetingToEdit.createdBy === user.id) {
        return;
      }
      setSelectedAttendees(selectedAttendees.filter((a) => a.userId !== user.id));
    } else {
      setSelectedAttendees([
        ...selectedAttendees,
        {
          userId: user.id,
          name: user.name,
          role: user.role,
          attendanceStatus: user.id === currentUser?.id ? 'attended' : 'invited',
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('يرجى كتابة عنوان الاجتماع');
      return;
    }

    if (!date) {
      setErrorMessage('يرجى تحديد تاريخ الاجتماع');
      return;
    }

    if (!startTime) {
      setErrorMessage('يرجى تحديد وقت البدء');
      return;
    }

    if (selectedAttendees.length === 0) {
      setErrorMessage('يرجى تحديد الحاضرين / المدعوين للاجتماع على الأقل شخص واحد');
      return;
    }

    const cleanObjectives = objectives.map((o) => o.trim()).filter(Boolean);
    const cleanAgenda = agenda
      .filter((a) => a.title.trim().length > 0)
      .map((a) => ({
        ...a,
        title: a.title.trim(),
        description: a.description?.trim(),
      }));

    setIsSubmitting(true);
    try {
      if (meetingToEdit) {
        await updateMeeting(
          meetingToEdit.id,
          {
            title: title.trim(),
            meetingNumber: meetingNumber.trim(),
            category,
            date,
            startTime,
            endTime: endTime || undefined,
            locationType,
            location: location.trim() || undefined,
            meetingUrl: meetingUrl.trim() || undefined,
            description: description.trim() || undefined,
            objectives: cleanObjectives,
            agenda: cleanAgenda,
            attendees: selectedAttendees,
          },
          'تحديث بيانات الاجتماع'
        );
      } else {
        await addMeeting({
          tenantId: activeTenantId,
          title: title.trim(),
          meetingNumber: meetingNumber.trim() || undefined,
          category,
          date,
          startTime,
          endTime: endTime || undefined,
          locationType,
          location: location.trim() || undefined,
          meetingUrl: meetingUrl.trim() || undefined,
          description: description.trim() || undefined,
          objectives: cleanObjectives,
          agenda: cleanAgenda,
          attendees: selectedAttendees,
          decisions: [],
          recommendations: [],
          postponedItems: [],
          status: 'scheduled',
          createdBy: currentUser?.id || 'admin',
          createdByName: currentUser?.name || 'مدير النظام',
          createdByRole: currentUser?.role || 'admin',
        });
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving meeting:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ الاجتماع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsersForSearch = tenantUsers.filter((u) => {
    if (!attendeeSearch.trim()) return true;
    const q = attendeeSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="meeting-form-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
    >
      <div
        id="meeting-form-modal-container"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {meetingToEdit ? 'تعديل بيانات الاجتماع' : 'جدولة اجتماع جديد'}
              </h2>
              <p className="text-xs text-slate-500">
                توثيق الأهداف والبنود والمدعوين وفق حوكمة المجمع
              </p>
            </div>
          </div>
          <button
            id="close-meeting-form-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="meeting-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              البيانات الأساسية للاجتماع
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان الاجتماع <span className="text-red-500">*</span>
                </label>
                <input
                  id="meeting-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: اجتماع معلمي المرحلة الابتدائية لتنسيق الاختبارات"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم الاجتماع / القيد
                </label>
                <input
                  id="meeting-number-input"
                  type="text"
                  value={meetingNumber}
                  onChange={(e) => setMeetingNumber(e.target.value)}
                  placeholder="مثال: م-2026/04"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تصنيف الاجتماع
                </label>
                <select
                  id="meeting-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MeetingCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="teachers">اجتماع معلمين</option>
                  <option value="supervisors">اجتماع مشرفين</option>
                  <option value="educational">اجتماع تربوي / تعليمي</option>
                  <option value="board">مجلس إدارة / قيادة المجمع</option>
                  <option value="general">اجتماع عام</option>
                  <option value="emergency">اجتماع طارئ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  التاريخ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="meeting-date-input"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  وقت البدء <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="meeting-start-time-input"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  وقت الانتهاء المتوقع
                </label>
                <div className="relative">
                  <input
                    id="meeting-end-time-input"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Location & Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نوع الانعقاد
                </label>
                <select
                  id="meeting-location-type-select"
                  value={locationType}
                  onChange={(e) =>
                    setLocationType(e.target.value as MeetingLocationType)
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  <option value="in_person">حضوري بالمجمع</option>
                  <option value="remote">عن بُعد (عبر الإنترنت)</option>
                  <option value="hybrid">مدمج (حضوري وعن بُعد)</option>
                </select>
              </div>

              {locationType !== 'remote' && (
                <div className={locationType === 'hybrid' ? 'md:col-span-1' : 'md:col-span-2'}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المقر / القاعة
                  </label>
                  <div className="relative">
                    <input
                      id="meeting-location-input"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="مثال: قاعة الاجتماعات الرئيسية - الدور الثاني"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}

              {(locationType === 'remote' || locationType === 'hybrid') && (
                <div className={locationType === 'remote' ? 'md:col-span-2' : 'md:col-span-1'}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رابط الاجتماع الافتراضي
                  </label>
                  <div className="relative">
                    <input
                      id="meeting-url-input"
                      type="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-left font-mono"
                      dir="ltr"
                    />
                    <Video className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نبذة أو مقدمة الاجتماع (اختياري)
              </label>
              <textarea
                id="meeting-description-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="أهداف عامة أو سياق الاجتماع..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Objectives Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600" />
                أهداف الاجتماع ومخرجاته المتوقعة
              </h3>
              <button
                type="button"
                id="add-objective-btn"
                onClick={handleAddObjective}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة هدف
              </button>
            </div>

            <div className="space-y-2">
              {objectives.map((obj, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-slate-400">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => handleUpdateObjective(idx, e.target.value)}
                    placeholder={`الهدف رقم ${idx + 1}`}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  {objectives.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Agenda Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-600" />
                بنود جدول الأعمال
              </h3>
              <button
                type="button"
                id="add-agenda-btn"
                onClick={handleAddAgendaItem}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة بند
              </button>
            </div>

            <div className="space-y-2">
              {agenda.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-bold text-slate-500">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        handleUpdateAgendaItem(idx, 'title', e.target.value)
                      }
                      placeholder="عنوان البند (مثال: تقييم مخرجات مسار الحفظ)"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={item.durationMinutes || ''}
                        onChange={(e) =>
                          handleUpdateAgendaItem(
                            idx,
                            'durationMinutes',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="دقيقة"
                        className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-400">دقيقة</span>
                    </div>
                    {agenda.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAgendaItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Attendees Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                قائمة المدعوين والحضور ({selectedAttendees.length} مختار)
                <span className="text-red-500">*</span>
              </h3>
              <input
                type="text"
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                placeholder="بحث عن عضو..."
                className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
              {filteredUsersForSearch.map((u) => {
                const isSelected = selectedAttendees.some((a) => a.userId === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleToggleAttendee(u)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="truncate pl-2">
                      <div className="text-xs font-semibold truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {u.role === 'teacher'
                          ? 'معلم'
                          : u.role === 'supervisor'
                          ? 'مشرف'
                          : u.role === 'campus_admin'
                          ? 'مدير مجمع'
                          : u.role}
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            id="cancel-meeting-form-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-100 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="meeting-form"
            id="save-meeting-submit-btn"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>جاري الحفظ...</span>
            ) : meetingToEdit ? (
              <span>حفظ التعديلات</span>
            ) : (
              <span>جدولة وتثبيت الاجتماع</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
