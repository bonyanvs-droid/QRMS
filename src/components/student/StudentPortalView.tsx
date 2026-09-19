import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentPlanDashboard } from '../quran/StudentPlanDashboard';
import { isModuleEnabled } from '../../lib/moduleChecker';
import { OnlineModeStudentWidget } from './OnlineModeStudentWidget';
import { TrackNominationCardModal } from '../common/TrackNominationCardModal';
import { TrackNomination, Student } from '../../types';
import { ComprehensiveQuranPlanModal } from '../common/ComprehensiveQuranPlanModal';
import {
  BookOpen,
  Award,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Heart,
  TrendingUp,
  Star,
  ShieldCheck,
  RotateCcw,
  Printer,
  ExternalLink,
  Layers,
} from 'lucide-react';

export const StudentPortalView: React.FC = () => {
  const {
    currentUser,
    students,
    halaqahs,
    teachers,
    quranPlans,
    activeTenant,
    activeTenantId,
    academicConfig,
    tracks,
    trackNominations,
  } = useApp();

  const [selectedNominationForCard, setSelectedNominationForCard] = useState<TrackNomination | null>(null);
  const [showComprehensivePlan, setShowComprehensivePlan] = useState(false);

  // Resolve active student from user session
  const student = useMemo(() => {
    const userStudentId = (currentUser as any)?.studentId;
    if (userStudentId) {
      const found = students.find((s) => s.id === userStudentId);
      if (found) return found;
    }
    // Fallback for Hatem or student matched by phone
    const foundByPhone = students.find((s) => s.parentPhone === currentUser?.phone);
    if (foundByPhone) return foundByPhone;

    return students.find((s) => !activeTenantId || s.tenantId === activeTenantId) || students[0];
  }, [currentUser, students, activeTenantId]);

  // Student's track nominations
  const studentNominations = useMemo(() => {
    if (!student) return [];
    return (trackNominations || []).filter((n) => n.studentId === student.id);
  }, [student, trackNominations]);

  // Resolve plan
  const plan = useMemo(() => {
    if (!student) return null;
    return (quranPlans || []).find((p) => p.studentId === student.id) || null;
  }, [student, quranPlans]);

  const halaqah = useMemo(() => {
    if (!student) return null;
    return (
      halaqahs.find((h) => h.id === student.halaqahId) ||
      halaqahs.find((h) => student.teacherId && h.teacherId === student.teacherId) ||
      halaqahs.find((h) => {
        if (!student.halaqahName) return false;
        const sName = student.halaqahName.replace(/[()—\-\s]/g, '');
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
      halaqahs.find((h) => h.grade && h.grade === student.grade) ||
      (student.stageId ? halaqahs.find((h) => h.stageId === student.stageId) : null) ||
      halaqahs[0] ||
      null
    );
  }, [halaqahs, student]);

  const teacher = useMemo(() => {
    return teachers.find((t) => t.id === halaqah?.teacherId);
  }, [teachers, halaqah]);

  const isSpellingActive = isModuleEnabled(activeTenant, 'spelling');

  if (!student) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 font-serif">لا يوجد سجل طالب مرتبط بهذا الحساب</h3>
        <p className="text-xs text-slate-500 mt-1">يرجى مراجعة إدارة المجمع لربط حساب الطالب.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* 1. STUDENT HERO CARD */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs text-amber-300 flex items-center justify-center font-bold text-2xl shadow-inner border border-white/20">
              {(student.fullName || student.name || 'ط').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-serif">مرحباً بك يا بطل القرآن، {student.fullName || student.name || 'البطل'}</h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-emerald-950">
                  طالب متميز
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 flex items-center gap-2">
                <span>{halaqah?.name || 'حلقة القرآن'}</span>
                <span>•</span>
                <span>المعلم: {teacher?.name || 'المعلم المعتمد'}</span>
                <span>•</span>
                <span>{activeTenant?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 text-center">
              <div className="text-xs text-emerald-200">المستهدف الفصلي</div>
              <div className="text-base font-black text-amber-300 font-serif">
                سورة {student.personalTargetSurah || student.minimumTargetSurah || activeTenant?.targetSurahDefault || 'الغاشية'}
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Highlights */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/15">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold mb-1">
              <span>الأوسمة المكتسبة</span>
              <Award className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-xl font-black text-white font-mono">12 وساماً</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold mb-1">
              <span>نقاط التميز</span>
              <Star className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-xl font-black text-white font-mono">98 نقطة</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold mb-1">
              <span>نسبة الإنجاز</span>
              <TrendingUp className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-xl font-black text-white font-mono">88%</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold mb-1">
              <span>حالة الخطة</span>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-sm font-bold text-emerald-200">منتظمة ومقفلة</div>
          </div>
        </div>
      </div>

      {halaqah && <OnlineModeStudentWidget halaqah={halaqah} student={student} />}

      {/* 2. OFFICIAL TRACK NOMINATIONS & ADMISSION CARDS */}
      {studentNominations.length > 0 && (
        <div className="bg-gradient-to-l from-amber-500/10 via-emerald-500/5 to-white rounded-3xl p-6 sm:p-8 border border-amber-300/60 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                  بطاقات الترشيح والشهادات الرسمية
                </h2>
                <p className="text-xs text-slate-600">
                  متابعة حالة ترشيحك لاختبارات الجمعية الرسمية وبطاقات الدخول المعتمدة
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentNominations.map((nom) => {
              const isApproved =
                nom.status === 'approved_for_association' || nom.status === 'association_completed';
              const isPassed = nom.status === 'association_completed';

              return (
                <div
                  key={nom.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 hover:border-emerald-500 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {nom.trackName || 'مسار القرآن الكريم'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1.5">
                        فرع: {nom.targetBranchOrLevel}
                      </h3>
                      <p className="text-xs text-slate-500">
                        رقم الترشيح: {nom.nominationCardNumber || 'قيد الإصدار'}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isPassed
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isApproved
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}
                    >
                      {isPassed
                        ? 'مكتمل ومعتمد'
                        : isApproved
                        ? 'معتمد للاختبار'
                        : nom.status === 'internal_exam_completed'
                        ? 'اجتاز الداخلي'
                        : 'قيد الإجراء'}
                    </span>
                  </div>

                  {/* Status Steps */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div
                      className={`p-2 rounded-xl border ${
                        nom.internalExam
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span>1. الاختبار الداخلي</span>
                      <div className="font-mono mt-0.5">
                        {nom.internalExam?.totalScore !== undefined
                          ? `${nom.internalExam.totalScore}%`
                          : 'قيد التقييم'}
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded-xl border ${
                        nom.supervisorApproval
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span>2. اعتماد المشرف</span>
                      <div className="mt-0.5">
                        {nom.supervisorApproval ? 'معتمد رسمياً' : 'قيد المراجعة'}
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded-xl border ${
                        nom.associationExam
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <span>3. اختبار الجمعية</span>
                      <div className="font-mono mt-0.5">
                        {nom.associationExam?.score !== undefined
                          ? `${nom.associationExam.score}%`
                          : 'بانتظار الاختبار'}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      المعلم: {nom.teacherName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedNominationForCard(nom)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isPassed ? 'عرض الشهادة الرسمية' : 'عرض بطاقة الدخول'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ENROLLED TRACKS OVERVIEW */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                مساراتك التعليمية النشطة بالمجمع
              </h2>
              <p className="text-xs text-slate-500">
                المناهج المعتمدة لمرحلتك الدراسية ({student.grade || 'المرحلة التأسيسية'})
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Quran Track */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-emerald-950">مسار القرآن الكريم</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                نشط وأساسي
              </span>
            </div>
            <p className="text-xs text-slate-600">
              الحفظ الجديد المنهجي، والمراجعة الصغرى والكبرى اليومية
            </p>
            <div className="text-[11px] font-bold text-emerald-800 pt-1">
              المستهدف: سورة {student.personalTargetSurah || 'الغاشية'}
            </div>
          </div>

          {/* Spelling Track */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-amber-950">مسار الهجاء والتأسيس</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                القاعدة النورانية
              </span>
            </div>
            <p className="text-xs text-slate-600">
              إتقان مخارج الحروف، وضبط الحركات، والتهجي السليم
            </p>
            <div className="text-[11px] font-bold text-amber-800 pt-1">
              الدرس الحالي: {student.currentSpellingLessonId || 'الدرس الأول'}
            </div>
          </div>

          {/* Virtues & Educational Track */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-purple-950">المسار القيمي والتربوي</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900">
                تطبيقي
              </span>
            </div>
            <p className="text-xs text-slate-600">
              غرس الأخلاق والآداب النبوية والتطبيقات الميدانية الأسبوعية
            </p>
            <div className="text-[11px] font-bold text-purple-800 pt-1">
              الأسبوع الحالي: {academicConfig.currentWeek}
            </div>
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE QURAN PLAN DASHBOARD */}
      {plan ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">جدول الحفظ والمراجعة الذكي</h2>
              <p className="text-xs text-slate-500">مقسم يومياً وأسبوعياً وشهرياً لضمان الإتقان التام</p>
            </div>
            <button
              onClick={() => setShowComprehensivePlan(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              الخطة القرآنية الشاملة
            </button>
          </div>

          <StudentPlanDashboard plan={plan} readOnly={true} />
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-2xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">جاري إعداد الخطة القرآنية الفردية</h3>
          <p className="text-xs text-slate-500 mt-1">يقوم معلم الحلقة بتوليد خطة الحفظ والمراجعة الذكية الخاصة بك قريباً.</p>
        </div>
      )}

      {/* Modal: Official Nomination Admission Card / Certificate */}
      <TrackNominationCardModal
        isOpen={!!selectedNominationForCard}
        onClose={() => setSelectedNominationForCard(null)}
        nomination={selectedNominationForCard}
        tenantName={activeTenant?.name}
      />

      {showComprehensivePlan && student && (
        <ComprehensiveQuranPlanModal
          student={student as Student}
          variant="student"
          onClose={() => setShowComprehensivePlan(false)}
        />
      )}
    </div>
  );
};

