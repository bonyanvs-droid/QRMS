import React, { useState, useMemo } from 'react';
import {
  Award,
  Crown,
  Sparkles,
  ShieldCheck,
  Star,
  TrendingUp,
  Flame,
  CheckCircle,
  Share2,
  Printer,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Student, StudentBadge, BadgeType, BadgeDefinition } from '../../types';
import {
  BADGE_DEFINITIONS,
  calculateEligibleBadges,
  generateBadgeCelebrationMessage,
} from '../../utils/badgeSystem';
import { CertificateModal } from '../common/CertificateModal';
import { dispatchWhatsAppMessage } from '../../lib/whatsappCloudApi';

interface BadgesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  halaqahId?: string;
}

export const BadgesManagementModal: React.FC<BadgesManagementModalProps> = ({
  isOpen,
  onClose,
  halaqahId,
}) => {
  const {
    students,
    badges,
    awardBadge,
    deleteBadge,
    sessionRecords,
    spellingLessons,
    academicConfig,
    currentUser,
    halaqahs,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedBadgeType, setSelectedBadgeType] = useState<BadgeType>('spelling_champion');
  const [manualNotes, setManualNotes] = useState('');
  const [activeCertificateBadge, setActiveCertificateBadge] = useState<StudentBadge | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Filter students by halaqah
  const halaqahStudents = useMemo(() => {
    return halaqahId ? students.filter((s) => s.halaqahId === halaqahId) : students;
  }, [students, halaqahId]);

  // Current halaqah name
  const currentHalaqahName = useMemo(() => {
    const found = halaqahs.find((h) => h.id === halaqahId);
    return found?.name || 'الحلقة القرآنية';
  }, [halaqahs, halaqahId]);

  // Find all auto-eligible suggestions across halaqah students
  const smartSuggestions = useMemo(() => {
    const list: { student: Student; badge: BadgeDefinition; reason: string }[] = [];
    for (const student of halaqahStudents) {
      const studentAwardedTypes = badges
        .filter((b) => b.studentId === student.id)
        .map((b) => b.badgeType);

      const eligible = calculateEligibleBadges(
        student,
        sessionRecords,
        spellingLessons,
        academicConfig,
        studentAwardedTypes
      );

      for (const item of eligible) {
        list.push({
          student,
          badge: item.badge,
          reason: item.reason,
        });
      }
    }
    return list;
  }, [halaqahStudents, badges, sessionRecords, spellingLessons, academicConfig]);

  // Filter badges for display
  const displayedBadges = useMemo(() => {
    const relevantStudentIds = new Set(halaqahStudents.map((s) => s.id));
    return badges.filter((b) => {
      if (!relevantStudentIds.has(b.studentId)) return false;
      if (selectedStudentId !== 'all' && b.studentId !== selectedStudentId) return false;
      return true;
    });
  }, [badges, halaqahStudents, selectedStudentId]);

  if (!isOpen) return null;

  const handleQuickAward = async (student: Student, badge: BadgeDefinition, reason: string) => {
    await awardBadge(badge.id, student.id, reason, true);
    setNotificationMsg(`تم منح ${badge.title} للطالب ${student.fullName} بنجاح!`);
    setTimeout(() => setNotificationMsg(null), 4000);

    // Prompt to share to parent WhatsApp
    if (student.parentPhone) {
      const msg = generateBadgeCelebrationMessage(
        student.fullName,
        badge,
        currentUser?.name || 'معلم الحلقة',
        reason
      );
      dispatchWhatsAppMessage(student.parentPhone, msg);
    }
  };

  const handleManualAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentId === 'all') return;
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const badgeDef = BADGE_DEFINITIONS[selectedBadgeType];
    const notesToSave = manualNotes.trim() || badgeDef.description;

    await awardBadge(selectedBadgeType, student.id, notesToSave, false);
    setManualNotes('');
    setNotificationMsg(`تم تتويج ${student.fullName} بـ ${badgeDef.title}!`);
    setTimeout(() => setNotificationMsg(null), 4000);

    if (student.parentPhone) {
      const msg = generateBadgeCelebrationMessage(
        student.fullName,
        badgeDef,
        currentUser?.name || 'معلم الحلقة',
        notesToSave
      );
      dispatchWhatsAppMessage(student.parentPhone, msg);
    }
  };

  const handleShareBadge = (badge: StudentBadge) => {
    const student = students.find((s) => s.id === badge.studentId);
    if (!student || !student.parentPhone) return;

    const def = BADGE_DEFINITIONS[badge.badgeType];
    const msg = generateBadgeCelebrationMessage(
      student.fullName,
      def,
      badge.awardedBy || currentUser?.name || 'معلم الحلقة',
      badge.notes || def.description
    );
    dispatchWhatsAppMessage(student.parentPhone, msg);
  };

  const renderBadgeIcon = (id: BadgeType, className = 'w-5 h-5') => {
    switch (id) {
      case 'spelling_champion':
        return <Sparkles className={`${className} text-emerald-600`} />;
      case 'ghashiyah_ambassador':
        return <Crown className={`${className} text-amber-600`} />;
      case 'golden_attendance':
        return <ShieldCheck className={`${className} text-blue-600`} />;
      case 'halaqah_star':
        return <Star className={`${className} text-purple-600`} />;
      case 'rapid_growth':
        return <TrendingUp className={`${className} text-teal-600`} />;
      case 'daily_diligence':
        return <Flame className={`${className} text-rose-600`} />;
      default:
        return <Award className={`${className} text-emerald-600`} />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-6 max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base md:text-lg">
                  <span className="hidden sm:inline">منظومة الحوافز والأوسمة الذكية للطلاب</span>
                  <span className="sm:hidden">الأوسمة والحوافز</span>
                </h3>
                <p className="hidden sm:block text-xs text-emerald-200">
                  تتويج إتقان الهجاء، بلوغ الغاشية، المواظبة، وبث الفرح في نفوس الطلاب وأولياء الأمور
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback alert */}
          {notificationMsg && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-900">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
          )}

          <div className="p-6 overflow-y-auto space-y-6">
            {/* 1. Smart Automated Suggestions Banner */}
            {smartSuggestions.length > 0 && (
              <div className="bg-gradient-to-l from-amber-50 to-emerald-50 rounded-2xl p-4 border border-amber-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h4 className="font-black text-sm text-slate-900">
                      ترشيحات الاستحقاق الذكي ({smartSuggestions.length} طلاب مؤهلين نالوا المعايير)
                    </h4>
                  </div>
                  <span className="text-[11px] text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full font-bold">
                    حساب ذكي تلقائي
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {smartSuggestions.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white/90 rounded-xl p-3 border border-amber-100 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                          {renderBadgeIcon(item.badge.id, 'w-4 h-4')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {item.student.fullName}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-bold">
                            {item.badge.title}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.reason}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickAward(item.student, item.badge, item.reason)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>اعتماد ومنح</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Manual Award Form */}
            <form onSubmit={handleManualAward} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <h4 className="font-bold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>منح وسام استحقاق جديد لطالب</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر الطالب:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="all" disabled>
                      -- حدد الطالب المكرم --
                    </option>
                    {halaqahStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الوسام:</label>
                  <select
                    value={selectedBadgeType}
                    onChange={(e) => setSelectedBadgeType(e.target.value as BadgeType)}
                    className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.values(BADGE_DEFINITIONS).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.criteriaLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    عبارة التتويج / سبب المنح (اختياري):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="مثال: تميز استثنائي في هجاء درس 6"
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={selectedStudentId === 'all'}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                    >
                      تتويج
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* 3. Awarded Badges Gallery */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>سجل أوسمة الطلاب الممنوحة ({displayedBadges.length})</span>
                </h4>
                {selectedStudentId !== 'all' && (
                  <button
                    onClick={() => setSelectedStudentId('all')}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    عرض جميع الطلاب
                  </button>
                )}
              </div>

              {displayedBadges.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">لم تُمنح أي أوسمة بعد لهذا التحديد</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    استخدم نموذج التتويج أعلاه أو الترشيحات الذكية لمنح أول وسام لطلاب الحلقة
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayedBadges.map((badge) => {
                    const def = BADGE_DEFINITIONS[badge.badgeType] || {
                      id: badge.badgeType,
                      title: 'وسام التميز',
                      criteriaLabel: '',
                      description: '',
                      category: 'excellence',
                      color: 'emerald',
                      icon: 'Award',
                    };

                    return (
                      <div
                        key={badge.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                              {renderBadgeIcon(badge.badgeType, 'w-6 h-6')}
                            </div>
                            <div>
                              <div className="font-black text-sm text-slate-900">{badge.studentName}</div>
                              <div className="text-xs font-bold text-emerald-800">{def.title}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>تاريخ المنح: {badge.awardedAt}</span>
                                <span>•</span>
                                <span>بواسطة: {badge.awardedBy}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteBadge(badge.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                            title="حذف الوسام"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {badge.notes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {badge.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleShareBadge(badge)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            title="إرسال تهنئة فورية لولي الأمر عبر واتساب"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>تهنئة ولي الأمر</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveCertificateBadge(badge)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            title="طباعة شهادة الوسام الفاخرة للطالب"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" />
                            <span>طباعة الشهادة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={!!activeCertificateBadge}
        onClose={() => setActiveCertificateBadge(null)}
        badge={activeCertificateBadge}
        studentHalaqahName={currentHalaqahName}
      />
    </>
  );
};
