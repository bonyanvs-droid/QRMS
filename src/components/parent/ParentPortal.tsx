import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { queryStudentsForParent, normalizePhone } from '../../lib/parentService';
import { Student, DailySessionRecord, StudentBadge, Halaqah } from '../../types';
import { StudentQuranPlan } from '../../quran/types/plan';
import { normalizeStudentQuranPlan, selectActiveStudentPlan } from '../../quran/utils/planNormalizer';
import { evaluateStudentStatus } from '../../utils/statusCalculator';
import { SEED_BARAEM_STUDENTS } from '../../data/studentsRoster';
import { COMPREHENSIVE_HALAQAHS } from '../../data/multiStageRoster';
import { safeStorage } from '../../lib/safeStorage';
import {
  Search,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Printer,
  ChevronLeft,
  GraduationCap,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Crown,
  History,
  User,
  School,
  Check,
  AlertCircle,
  TrendingUp,
  Layers,
  Bookmark,
  RefreshCw,
  FileText,
  HeartHandshake,
  Lock,
  LogIn,
} from 'lucide-react';
import { BADGE_DEFINITIONS } from '../../utils/badgeSystem';
import { CertificateModal } from '../common/CertificateModal';
import { StudentProgressPortalView } from './StudentProgressPortalView';
import { ComprehensiveQuranPlanModal } from '../common/ComprehensiveQuranPlanModal';
import { isModuleEnabled } from '../../lib/moduleChecker';
import { TrackNominationCardModal } from '../common/TrackNominationCardModal';
import { TrackNomination } from '../../types';
import { OnlineModeStudentWidget } from '../student/OnlineModeStudentWidget';
import { LoginModal } from '../auth/LoginModal';

type ParentActiveTab = 'quran' | 'spelling' | 'educational' | 'tracks' | 'report_card';

export const ParentPortal: React.FC = () => {
  const {
    currentUser,
    students: allContextStudents,
    halaqahs,
    academicConfig,
    spellingLessons,
    mosqueLogoUrl,
    stageLogoUrl,
    badges,
    quranPlans,
    getActiveStudentQuranPlan,
    getStudentQuranPlans,
    educationalPlan,
    activeTenant,
    activeTenantId,
    remedialPlans,
    tracks,
    trackNominations,
    teachers,
  } = useApp();

  const [selectedNominationForCard, setSelectedNominationForCard] = useState<TrackNomination | null>(null);

  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');
  const isBadgesActive = isModuleEnabled(activeTenant, 'badges');

  // Synchronous resolution of user to guarantee immediate rendering without search barrier
  const effectiveUser = currentUser || (() => {
    try {
      const saved = safeStorage.getItem('al_ghazzawi_current_user_v3') || safeStorage.getItem('al_ghazzawi_current_user_v4');
      if (saved && saved !== 'null') {
        const u = JSON.parse(saved);
        if (u && u.id) return u;
      }
    } catch {}
    return null;
  })();

  const isLoggedIn = !!effectiveUser;
  const isParentUser = effectiveUser?.role === 'parent';

  // Instantaneous synchronous resolution of associated students for logged in parents
  const immediateAssociatedStudents = useMemo(() => {
    if (!effectiveUser) return [];
    const phone = effectiveUser.phone ? normalizePhone(effectiveUser.phone) : '';
    const name = effectiveUser.name ? effectiveUser.name.trim() : '';

    const pool = [...allContextStudents, ...SEED_BARAEM_STUDENTS];
    const map = new Map<string, Student>();

    pool.forEach((s) => {
      const pPhone = s.parentPhone ? normalizePhone(s.parentPhone) : '';
      const pName = s.parentName ? s.parentName.trim() : '';
      if ((phone && pPhone === phone) || (name && pName === name)) {
        if (!map.has(s.id)) {
          map.set(s.id, s);
        }
      }
    });

    return Array.from(map.values());
  }, [effectiveUser, allContextStudents]);

  const [phoneNumber, setPhoneNumber] = useState(() => effectiveUser?.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>(() => immediateAssociatedStudents);
  const [recordsMap, setRecordsMap] = useState<Record<string, DailySessionRecord[]>>({});
  const [parentQuranPlans, setParentQuranPlans] = useState<Record<string, StudentQuranPlan[]>>({});
  const [showComprehensivePlan, setShowComprehensivePlan] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    return immediateAssociatedStudents.length > 0 ? immediateAssociatedStudents[0].id : null;
  });
  const [activeCertificateBadge, setActiveCertificateBadge] = useState<StudentBadge | null>(null);
  const [activeTab, setActiveTab] = useState<ParentActiveTab>('quran');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Perform search by phone number
  const performSearch = async (targetPhone: string) => {
    if (!targetPhone.trim()) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // First, check in-memory context students immediately for instant responsiveness
      const normTarget = normalizePhone(targetPhone);
      const inMemoryMatches = allContextStudents.filter(
        (s) =>
          (s.parentPhone && normalizePhone(s.parentPhone) === normTarget) ||
          s.parentPhone === targetPhone.trim() ||
          (effectiveUser?.name && s.parentName && s.parentName.trim() === effectiveUser.name.trim())
      );

      if (inMemoryMatches.length > 0) {
        setStudents(inMemoryMatches);
        setSelectedStudentId((prev) => (prev && inMemoryMatches.some((s) => s.id === prev) ? prev : inMemoryMatches[0].id));
      }

      // Query service scoped to the authenticated parent's tenant
      const result = await queryStudentsForParent(
        targetPhone,
        effectiveUser?.tenantId || activeTenantId
      );
      if (result.success && result.students.length > 0) {
        setStudents(result.students);
        setRecordsMap(result.records);
        if (result.quranPlans) {
          setParentQuranPlans(result.quranPlans);
        }
        setSelectedStudentId((prev) => (prev && result.students.some((s) => s.id === prev) ? prev : result.students[0].id));
        setErrorMessage(null);
      } else if (inMemoryMatches.length === 0 && immediateAssociatedStudents.length === 0) {
        setErrorMessage(result.errorMessage || 'لم يتم العثور على طالب مسجل بهذا الرقم.');
        setStudents([]);
        setSelectedStudentId(null);
      }
    } catch (err: any) {
      if (students.length === 0) {
        setErrorMessage('حدث خطأ أثناء الاتصال بالنظام. يرجى المحاولة لاحقاً.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(phoneNumber);
  };

  // Automatic loading when logged in
  useEffect(() => {
    if (effectiveUser?.phone) {
      setPhoneNumber(effectiveUser.phone);
      performSearch(effectiveUser.phone);
    } else if (immediateAssociatedStudents.length > 0) {
      setStudents(immediateAssociatedStudents);
      setSelectedStudentId((prev) => (prev && immediateAssociatedStudents.some((s) => s.id === prev) ? prev : immediateAssociatedStudents[0].id));
    }
  }, [effectiveUser?.phone, effectiveUser?.name]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);
  const selectedHalaqah = useMemo(() => {
    if (!selectedStudent) return null;
    const map = new Map<string, Halaqah>();
    COMPREHENSIVE_HALAQAHS.forEach((h) => map.set(h.id, h));
    halaqahs.forEach((h) => {
      const prev = map.get(h.id);
      map.set(h.id, prev ? { ...prev, ...h } : h);
    });
    const allPool = Array.from(map.values());

    return (
      allPool.find((h) => h.id === selectedStudent.halaqahId) ||
      allPool.find((h) => selectedStudent.teacherId && h.teacherId === selectedStudent.teacherId) ||
      allPool.find((h) => {
        if (!selectedStudent.halaqahName) return false;
        const sName = selectedStudent.halaqahName.replace(/[()—\-\s]/g, '');
        const hName = h.name.replace(/[()—\-\s]/g, '');
        return (
          hName.includes(sName) ||
          sName.includes(hName) ||
          (sName.includes('عثمان') && hName.includes('عثمان')) ||
          (sName.includes('عمر') && hName.includes('عمر')) ||
          (sName.includes('الصديق') && hName.includes('الصديق')) ||
          (sName.includes('علي') && hName.includes('علي')) ||
          (sName.includes('سعد') && hName.includes('سعد')) ||
          (sName.includes('طلحة') && hName.includes('طلحة')) ||
          (sName.includes('مصعب') && hName.includes('مصعب')) ||
          (sName.includes('مسعود') && hName.includes('مسعود'))
        );
      }) ||
      allPool.find((h) => h.grade && h.grade === selectedStudent.grade) ||
      (selectedStudent.stageId ? allPool.find((h) => h.stageId === selectedStudent.stageId) : null) ||
      allPool[0] ||
      null
    );
  }, [selectedStudent, halaqahs]);
  const selectedRecords = selectedStudent ? recordsMap[selectedStudent.id] || [] : [];
  const evalResult = selectedStudent
    ? evaluateStudentStatus(selectedStudent, selectedRecords, spellingLessons, academicConfig)
    : null;
  const currentLesson = selectedStudent
    ? spellingLessons.find((l) => l.id === selectedStudent.currentSpellingLessonId)
    : null;

  // Active Quran Plan for the selected student
  const studentPlan = useMemo(() => {
    if (!selectedStudent) return null;
    let found: StudentQuranPlan | null = null;
    const fromCtx = getActiveStudentQuranPlan(selectedStudent.id);
    if (fromCtx) {
      found = fromCtx;
    } else if (parentQuranPlans[selectedStudent.id]?.length > 0) {
      found = selectActiveStudentPlan(parentQuranPlans[selectedStudent.id]);
    } else {
      found = selectActiveStudentPlan(
        quranPlans.filter((p) => p.studentId === selectedStudent.id)
      );
    }
    return found ? normalizeStudentQuranPlan(found, selectedStudent) : null;
  }, [selectedStudent, getActiveStudentQuranPlan, parentQuranPlans, quranPlans]);

  // All Quran Plans for this student (memorization & revision)
  const studentAllPlans = useMemo(() => {
    if (!selectedStudent) return [];
    const fromCtx = getStudentQuranPlans(selectedStudent.id);
    const fromQuery = parentQuranPlans[selectedStudent.id] || [];
    const map = new Map<string, StudentQuranPlan>();
    fromCtx.forEach((p) => map.set(p.id, normalizeStudentQuranPlan(p, selectedStudent)));
    fromQuery.forEach((p) => map.set(p.id, normalizeStudentQuranPlan(p, selectedStudent)));
    return Array.from(map.values());
  }, [selectedStudent, getStudentQuranPlans, parentQuranPlans]);

  // Remedial plans for this student
  const studentRemedialPlans = useMemo(() => {
    if (!selectedStudent) return [];
    return remedialPlans.filter((p) => p.studentId === selectedStudent.id);
  }, [selectedStudent, remedialPlans]);

  // Badges for this student
  const studentBadges = useMemo(() => {
    if (!selectedStudent) return [];
    return badges.filter((b) => b.studentId === selectedStudent.id);
  }, [selectedStudent, badges]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. Header Banner & Welcome Section */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-l from-emerald-950 via-emerald-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute top-0 left-0 w-80 h-80 bg-radial from-emerald-500/10 to-transparent rounded-full -translate-x-32 -translate-y-32 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-radial from-teal-500/10 to-transparent rounded-full translate-x-20 translate-y-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-800/80 text-emerald-100 border border-emerald-600/40 backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>بوابة ولي الأمر الإلكترونية المعتمدة</span>
              </span>
              <span className="text-xs text-emerald-200/80 font-bold">
                {activeTenant?.name || 'مجمع الشيخ عبدالرحمن الغزاوي القرآني'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <span className="text-emerald-300">مرحباً بك:</span>
                  <span>{effectiveUser?.name}</span>
                </>
              ) : (
                <span>بوابة متابعة إنجاز الأبناء والطلاب</span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
              {isLoggedIn ? (
                <span>
                  متابعة شاملة ومباشرة لبيانات الحفظ القرآني، دروس الهجاء والقاعدة النورانية، وسجل المواظبة والتكريم التربوي لأبنائك المسجلين بالمجمع.
                </span>
              ) : (
                <span>
                  يمكنك الاستعلام المباشر عن بطاقة إنجاز ابنك عبر إدخال رقم الجوال المسجل في استمارة التسجيل.
                </span>
              )}
            </p>

            {/* Authenticated Parent Status Bar */}
            {isLoggedIn && (
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-700/40 text-emerald-200 font-mono">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{effectiveUser?.phone || phoneNumber}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-700/40 text-emerald-200 font-bold">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>الأبناء المرتبطون: {students.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* Logos */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15">
            {mosqueLogoUrl ? (
              <img
                src={mosqueLogoUrl}
                alt="شعار المجمع"
                className="w-12 h-12 rounded-xl object-contain bg-white p-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center text-white font-bold text-lg">
                مجمع
              </div>
            )}
            {stageLogoUrl && (
              <img
                src={stageLogoUrl}
                alt="شعار المرحلة"
                className="w-12 h-12 rounded-xl object-contain bg-white p-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Official Parent Authentication Gate (Strictly Enforced) */}
      {/* ========================================================================= */}
      {!isLoggedIn && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-emerald-100 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
            <Lock className="w-8 h-8 text-emerald-700" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-900 font-serif">
              تسجيل دخول ولي الأمر
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              للاطلاع على بطاقة إنجاز الأبناء وسجلات الحفظ والحضور والتكريم والتقارير الدورية، يرجى تسجيل الدخول عبر البوابة الرسمية الموحدة باستخدام رقم الجوال المسجل والرقم السري.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-emerald-200" />
              <span>تسجيل الدخول لبوابة ولي الأمر</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && students.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-emerald-100 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-800 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">جاري تحميل بيانات الأبناء من قاعدة بيانات المجمع...</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Children Selection Tabs (تبويبات بأسماء الأبناء) */}
      {/* ========================================================================= */}
      {students.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>الأبناء المسجلون في المجمع ({students.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              اضغط على اسم الابن لعرض تفاصيل إنجازه
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {students.map((student) => {
              const isSelected = student.id === selectedStudent?.id;
              const studentRecs = recordsMap[student.id] || [];
              const studentEval = evaluateStudentStatus(student, studentRecs, spellingLessons, academicConfig);

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`relative p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-gradient-to-l from-emerald-50 to-teal-50/60 border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {student.fullName.slice(0, 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-sm font-black truncate ${
                          isSelected ? 'text-emerald-950' : 'text-slate-900'
                        }`}
                      >
                        {student.fullName}
                      </h4>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                      <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {student.grade}
                      </span>
                      <span className="truncate max-w-[140px]">
                        {student.halaqahName || 'الحلقة القرآنية'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Child Detail Sub-Tabs (التبويبات المتخصصة للابن المختار) */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div className="space-y-4">
          {/* Online Halaqah Widget if online mode enabled */}
          {selectedHalaqah && (
            <OnlineModeStudentWidget halaqah={selectedHalaqah} student={selectedStudent} />
          )}

          {/* Main 4 Domain Tabs: قرآني | هجائي | تربوي وسلوكي | بطاقة الإنجاز */}
          <div className="bg-white p-1.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('quran')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'quran'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>📖 الإنجاز القرآني</span>
            </button>

            {isSpellingActive && (
              <button
                type="button"
                onClick={() => setActiveTab('spelling')}
                className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  activeTab === 'spelling'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>🔤 الإنجاز الهجائي</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('educational')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'educational'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>🌟 الإنجاز التربوي والسلوكي</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tracks')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'tracks'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>🏅 المسارات والترشيحات الرسمية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report_card')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'report_card'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>📋 بطاقة الإنجاز والشهادات</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: 📖 الإنجاز القرآني (Quranic Progress) */}
          {/* ========================================================================= */}
          {activeTab === 'quran' && (
            <div className="space-y-6 animate-fadeIn">
              {selectedStudent && (
                <button
                  onClick={() => setShowComprehensivePlan(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  الخطة القرآنية الشاملة — من البداية إلى المستهدف
                </button>
              )}
              {/* Holistic Progress View */}
              <StudentProgressPortalView
                student={selectedStudent}
                quranPlan={studentPlan}
                studentPlans={studentAllPlans}
                sessionRecords={selectedRecords}
                spellingLessons={spellingLessons}
                educationalPlan={educationalPlan}
                academicConfig={academicConfig}
              />
            </div>
          )}

          {showComprehensivePlan && selectedStudent && (
            <ComprehensiveQuranPlanModal
              student={selectedStudent}
              variant="parent"
              onClose={() => setShowComprehensivePlan(false)}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 🔤 الإنجاز الهجائي والقاعدة النورانية (Spelling & Nooraniyyah) */}
          {/* ========================================================================= */}
          {activeTab === 'spelling' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Spelling Header Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        مسار الهجاء القرآني والقاعدة النورانية
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        التأسيس الصوتي والنطقي لسلامة التلاوة ورسم المصحف الشريف
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900">
                      نسبة الإتقان: {evalResult?.spellingMasteryRate || selectedStudent.currentSpellingScore || 90}%
                    </span>
                  </div>
                </div>

                {/* Current Lesson Showcase */}
                <div className="bg-gradient-to-l from-emerald-50 via-teal-50/50 to-white p-6 rounded-2xl border border-emerald-200/70 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Bookmark className="w-4 h-4 text-emerald-700" />
                      الدرس الحالي المقرّر للطالب
                    </span>
                    <span className="bg-emerald-200/80 text-emerald-900 px-2.5 py-0.5 rounded-full font-mono">
                      درجة الإتقان الحالية: {selectedStudent.currentSpellingScore || 90}%
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-slate-900">
                    {currentLesson ? `الدرس ${currentLesson.lessonNumber}: ${currentLesson.title}` : 'الدرس الهجائي المعتمد'}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {currentLesson?.description ||
                      'تدريب يومي لمدة 10 دقائق لتأسيس النطق الصحيح ومخارج الحروف وضبط الحركات والتنوين.'}
                  </p>

                  {currentLesson?.coreSkills && currentLesson.coreSkills.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">المهارات المستهدفة:</span>
                      {(currentLesson.coreSkills || []).map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-white px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-900 border border-emerald-200/80 shadow-2xs"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 12-Lesson Progression Matrix */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>خريطة التقدم في دروس القاعدة النورانية الـ 12</span>
                    </h4>
                    <span className="text-xs text-slate-500 font-bold">
                      {spellingLessons.length} دروس مقررة
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {spellingLessons.map((lesson) => {
                      const currentLessonNum = currentLesson?.lessonNumber || 1;
                      const isCompleted = lesson.lessonNumber < currentLessonNum;
                      const isCurrent = lesson.lessonNumber === currentLessonNum;

                      return (
                        <div
                          key={lesson.id}
                          className={`p-3 rounded-xl border text-xs transition-all ${
                            isCurrent
                              ? 'bg-emerald-50 border-emerald-600 font-bold shadow-xs ring-1 ring-emerald-600'
                              : isCompleted
                              ? 'bg-slate-50/80 border-slate-200 text-slate-700'
                              : 'bg-white border-slate-100 text-slate-400 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[11px]">#{lesson.lessonNumber}</span>
                            {isCompleted && (
                              <span className="text-emerald-700 font-bold flex items-center gap-0.5 text-[10px]">
                                <Check className="w-3 h-3" /> تم الإتقان
                              </span>
                            )}
                            {isCurrent && (
                              <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                جاري التدريب
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 line-clamp-1">{lesson.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Home Practice Advice */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <h5 className="font-black text-xs sm:text-sm text-amber-900 flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-amber-700" />
                    <span>توصيات المعلم لولي الأمر للمراجعة المنزلية:</span>
                  </h5>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    يُرجى تشجيع الطالب على التهجئة بصوت واضح مدة 10 دقائق يومياً، مع تكرار نطق الحركات الثلاث والتنوين مع الإشارة بالإصبع على رسم المصحف.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 🌟 الإنجاز التربوي والسلوكي والمواظبة */}
          {/* ========================================================================= */}
          {activeTab === 'educational' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>المواظبة والانضباط</span>
                    <Calendar className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {evalResult?.attendanceRate || 95}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    أيام الحضور: <strong>{evalResult?.totalAttendedDays || 18}</strong> • الغياب:{' '}
                    <strong>{evalResult?.totalAbsentDays || 1}</strong>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>سلسلة الحضور المتصل</span>
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    {selectedStudent.attendanceStreak || 14} يوماً
                  </div>
                  <div className="text-[11px] text-emerald-900 font-semibold">
                    حضور متواصل دون انقطاع ماشاء الله
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>أوسمة التكريم المعتمدة</span>
                    <Crown className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-700 font-mono">
                    {studentBadges.length}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    أوسمة شرف وتميز معتمدة من إدارة المجمع
                  </div>
                </div>
              </div>

              {/* Badges & Honors Grid */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <h4 className="font-black text-base text-slate-900">
                      أوسمة الشرف والتكريم التربوي ({studentBadges.length})
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                    شهادات قابلة للطباعة
                  </span>
                </div>

                {studentBadges.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {studentBadges.map((badge) => {
                      const def = BADGE_DEFINITIONS[badge.badgeType] || {
                        id: badge.badgeType,
                        title: 'وسام التميز القرآني',
                        description: 'تقدير للطالب على الانضباط والإتقان',
                      };
                      return (
                        <div
                          key={badge.id}
                          className="bg-gradient-to-l from-amber-50/50 to-white p-4 rounded-2xl border border-amber-200/70 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-xs sm:text-sm text-slate-900 truncate">
                                {def.title}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                تاريخ المنح: {badge.awardedAt} • {badge.awardedBy}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveCertificateBadge(badge)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>عرض الشهادة</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    لا توجد أوسمة مسجلة حالياً، سيتم إدراج الأوسمة عند استيفاء معايير الحفظ والمواظبة.
                  </div>
                )}
              </div>

              {/* Teacher Guidance Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-3">
                <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>توجيهات وملاحظات معلم الحلقة التربوية:</span>
                </h4>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {selectedStudent.notes ||
                    'الطالب يظهر تفاعلاً ممتازاً وحرصاً على الحفظ اليومي، نوصي باستمرار المتابعة الأبوية اليومية لتثبيت السور المقررة.'}
                </div>
              </div>

              {/* Remedial / Enrichment Plans if exist */}
              {studentRemedialPlans.length > 0 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-amber-200 space-y-3">
                  <h4 className="font-black text-sm sm:text-base text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>الخطط العلاجية والإثرائية المعتمدة للطالب:</span>
                  </h4>
                  <div className="space-y-2">
                    {studentRemedialPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-950 space-y-1"
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>الخطة: {plan.title}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-semibold">
                            {plan.status === 'resolved' ? 'تم الإنجاز' : 'قيد المتابعة'}
                          </span>
                        </div>
                        <p className="text-slate-700">{plan.diagnosticSummary}</p>
                        {plan.parentGuidance && (
                          <p className="text-[11px] text-amber-900 bg-white/70 p-2 rounded-lg border border-amber-100">
                            <strong>إرشاد ولي الأمر:</strong> {plan.parentGuidance}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archives & Prior Terms */}
              {selectedStudent.termHistories && selectedStudent.termHistories.length > 0 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-3">
                  <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-700" />
                    <span>السجل التراكمي وتاريخ الفصول السابقة ({selectedStudent.termHistories.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(selectedStudent.termHistories || []).map((hist, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800">{hist.academicYear}</span>
                          <span className="font-bold text-slate-900">{hist.termName}</span>
                        </div>
                        <div className="text-slate-600">
                          الحلقة: {hist.halaqahName} • المعلم: {hist.teacherName}
                        </div>
                        <div className="text-emerald-900 font-bold">
                          أعلى درس: الدرس {hist.spellingLessonReached} • الحضور: {hist.attendanceRate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: 🏅 مسارات التميز والترشيحات الرسمية (Tracks & Nominations) */}
          {/* ========================================================================= */}
          {activeTab === 'tracks' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                      <Award className="w-6 h-6 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        مسارات التميز والترشيحات لاختبارات الجمعية
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        متابعة ترشيح {selectedStudent.fullName} لاختبارات فروع القرآن والهجاء، واستخراج بطاقات الدخول المعتمدة
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                      الحلقة: {selectedStudent.halaqahName || 'حلقة القرآن'}
                    </span>
                  </div>
                </div>

                {/* Enrolled tracks summary */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <span>المسارات التعليمية المعتمدة للابن:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                        <span>مسار القرآن الكريم</span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">أساسي</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        الحفظ الجديد والمراجعة المستمرة
                      </div>
                      <div className="text-xs font-bold text-emerald-800 mt-2">
                        المستهدف: سورة {selectedStudent.personalTargetSurah || 'الغاشية'}
                      </div>
                    </div>

                    {isSpellingActive && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                        <div className="flex items-center justify-between text-xs font-black text-amber-950">
                          <span>مسار الهجاء والتأسيس</span>
                          <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">النورانية</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          إتقان نطق الحروف وضبط الحركات
                        </div>
                        <div className="text-xs font-bold text-amber-800 mt-2">
                          الدرس: {selectedStudent.currentSpellingLessonId || 'الدرس الأول'}
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200">
                      <div className="flex items-center justify-between text-xs font-black text-purple-950">
                        <span>المسار القيمي والتربوي</span>
                        <span className="text-[10px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-md">سلوكي</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        تطبيقات الأخلاق والآداب الأسبوعية
                      </div>
                      <div className="text-xs font-bold text-purple-800 mt-2">
                        الأسبوع: {academicConfig.currentWeek} من {academicConfig.totalWeeks}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nominations List */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>سجل الترشيحات والاختبارات الرسمية للابن</span>
                    </span>
                  </h4>

                  {(() => {
                    const childNominations = (trackNominations || []).filter(
                      (n) => n.studentId === selectedStudent.id
                    );

                    if (childNominations.length === 0) {
                      return (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                          <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                          <div className="text-xs font-bold text-slate-700">
                            لا توجد ترشيحات رسمية مسجلة حالياً للابن
                          </div>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                            يقوم معلم الحلقة بترشيح الطالب آلياً فور إتقانه السور المستهدفة أو دروس الهجاء بدرجة 90% فما فوق للاختبار الداخلي المؤهل للجمعية.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {childNominations.map((nom) => {
                          const isApproved =
                            nom.status === 'approved_for_association' || nom.status === 'association_completed';
                          const isPassed = nom.status === 'association_completed';

                          return (
                            <div
                              key={nom.id}
                              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">
                                      {nom.trackName || 'مسار القرآن الكريم'}
                                    </span>
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                      فرع: {nom.targetBranchOrLevel}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    رقم الترشيح: <span className="font-mono font-bold text-slate-800">{nom.nominationCardNumber || 'قيد الاعتماد'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                                      isPassed
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : isApproved
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                                    }`}
                                  >
                                    {isPassed
                                      ? 'مكتمل ومعتمد بالجمعية'
                                      : isApproved
                                      ? 'معتمد للاختبار بالجمعية'
                                      : nom.status === 'internal_exam_completed'
                                      ? 'اجتاز الداخلي بنجاح'
                                      : 'قيد التقييم الداخلي'}
                                  </span>
                                </div>
                              </div>

                              {/* Progress details */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">الاختبار الداخلي بالمجمع:</span>
                                  <span className="font-bold text-slate-800">
                                    {nom.internalExam?.totalScore !== undefined
                                      ? `${nom.internalExam.totalScore}% (المختبر: ${nom.internalExam.examinerName || 'لجنة الاختبارات'})`
                                      : 'بانتظار تحديد موعد المختبر'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">اعتماد المشرف التربوي:</span>
                                  <span className="font-bold text-slate-800">
                                    {nom.supervisorApproval ? 'معتمد ومؤهل رسمياً' : 'قيد المراجعة الإشرافية'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">اختبار الجمعية الخيرية:</span>
                                  <span className="font-bold text-emerald-800">
                                    {nom.associationExam
                                      ? `${nom.associationExam.score}% — ${nom.associationExam.gradeText}`
                                      : 'مجدول مع مكتب الإشراف'}
                                  </span>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                <a
                                  href={`https://wa.me/966500000000?text=${encodeURIComponent(
                                    `السلام عليكم، أستفسر بخصوص ترشيح ابني ${selectedStudent.fullName} لاختبار ${nom.trackName} فرع (${nom.targetBranchOrLevel}).`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>تواصل مع المشرف عبر الواتساب</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => setSelectedNominationForCard(nom)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>{isPassed ? 'عرض وطباعة الشهادة الرسمية' : 'عرض وطباعة بطاقة الدخول'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: 📋 بطاقة الإنجاز والتقرير الشامل (Official Report Card & Print) */}
          {/* ========================================================================= */}
          {activeTab === 'report_card' && evalResult && (
            <div className="space-y-6 animate-fadeIn">
              {/* Official Printable Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-2xl shrink-0">
                      {selectedStudent.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {selectedStudent.fullName}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-emerald-800">{selectedStudent.grade}</span>
                        <span>•</span>
                        <span>{selectedStudent.halaqahName || 'الحلقة القرآنية'}</span>
                        <span>•</span>
                        <span>معلم الحلقة: {selectedStudent.teacherName || 'أ. صالح إبراهيم بشير'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                        evalResult.status === 'advanced'
                          ? 'bg-purple-100 text-purple-900'
                          : evalResult.status === 'on_track'
                          ? 'bg-emerald-100 text-emerald-900'
                          : evalResult.status === 'needs_support'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {evalResult.statusLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة بطاقة الإنجاز</span>
                    </button>
                  </div>
                </div>

                {/* Key Indicators Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
                      <span>الحفظ القرآني</span>
                      <span className="font-mono">{evalResult.memorizationProgressRate}%</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-base">
                      سورة {selectedStudent.currentSurah || 'الفيل'} (آية {selectedStudent.currentAyah || 5})
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      المستهدف: سورة {selectedStudent.minimumTargetSurah || 'الفيل'}
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
                      <span>الهجاء القرآني</span>
                      <span className="font-mono">{evalResult.spellingMasteryRate}%</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-base">
                      {currentLesson ? `الدرس ${currentLesson.lessonNumber}: ${currentLesson.title}` : 'مسار التهجئة'}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      القاعدة النورانية الشاملة
                    </p>
                  </div>

                  <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
                      <span>المواظبة والحضور</span>
                      <span className="font-mono">{evalResult.attendanceRate}%</span>
                    </div>
                    <h5 className="font-black text-slate-900 text-base">
                      {evalResult.totalAttendedDays} أيام حضور
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      الانضباط: {evalResult.attendanceRate >= 85 ? 'ممتاز ومثالي' : 'جيد'}
                    </p>
                  </div>
                </div>

                {/* Signatures & Certification Area */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <div className="font-bold text-slate-900">معلم الحلقة:</div>
                    <div>{selectedStudent.teacherName || 'أ. صالح إبراهيم بشير'}</div>
                    <div className="text-[10px] text-emerald-800 font-semibold">✓ معتمد إلكترونياً</div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <div className="font-bold text-slate-900">إدارة مجمع الغزاوي القرآني:</div>
                    <div>{activeTenant?.name || 'مجمع الشيخ عبدالرحمن الغزاوي القرآني'}</div>
                    <div className="text-[10px] text-emerald-800 font-semibold">✓ موثق بختم الإدارة الرسمي</div>
                  </div>
                </div>
              </div>

              {/* Recent Daily Recitation / Records */}
              {selectedRecords.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>سجل جلسات التسميع الأخيرة</span>
                  </h4>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedRecords.slice(0, 6).map((rec) => (
                      <div key={rec.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {rec.date}
                          </span>
                          <span className="font-semibold text-slate-800">الأسبوع {rec.weekNumber} ({rec.dayOfWeek})</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              rec.attendance === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.attendance === 'present' ? 'حاضر' : 'غائب'}
                          </span>
                        </div>

                        <div className="text-slate-600 flex items-center gap-3">
                          {rec.spellingProgress && (
                            <span>الهجاء: {rec.spellingProgress.score}%</span>
                          )}
                          {rec.memorization && (
                            <span>الحفظ: سورة {rec.memorization.surahTo}</span>
                          )}
                          {rec.spellingDrillMinutes ? (
                            <span className="text-emerald-700 font-bold">{rec.spellingDrillMinutes} د. تدريب</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* Certificate Modal */}
      {/* ========================================================================= */}
      <CertificateModal
        isOpen={!!activeCertificateBadge}
        onClose={() => setActiveCertificateBadge(null)}
        badge={activeCertificateBadge}
        studentHalaqahName={selectedStudent?.halaqahName || 'الحلقة القرآنية'}
      />

      {/* Official Nomination Card Modal */}
      <TrackNominationCardModal
        isOpen={!!selectedNominationForCard}
        onClose={() => setSelectedNominationForCard(null)}
        nomination={selectedNominationForCard}
        tenantName={activeTenant?.name}
      />

      {/* Official Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
};
