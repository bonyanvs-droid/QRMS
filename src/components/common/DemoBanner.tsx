import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LogOut,
  ShieldCheck,
  Award,
  BookOpen,
  UserCheck,
  GraduationCap,
  Users,
  User,
  AlertCircle,
  X,
  Lock,
  ChevronDown,
} from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const {
    isDemoMode,
    exitDemoSession,
    enterDemoSession,
    currentUser,
    demoBlockedNotice,
    clearDemoBlockedNotice,
  } = useApp();

  const navigate = useNavigate();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  if (!isDemoMode) {
    return null;
  }

  const handleRoleChange = async (roleKey: string, targetPath: string) => {
    await enterDemoSession('al-furqan', roleKey);
    setShowRoleSwitcher(false);
    navigate(targetPath);
  };

  const getRoleTitle = (role?: string) => {
    if (!role) return 'مستخدم تجريبي';
    if (role === 'campus_admin' || role === 'admin') return 'مدير المجمع';
    if (role === 'supervisor') {
      const scopeType = currentUser?.supervisorScope?.type;
      if (scopeType === 'stage_supervisor') return 'مشرف مرحلة (براعم وأشبال)';
      if (scopeType === 'educational_supervisor') return 'مشرف البرامج والأنشطة';
      if (scopeType === 'admissions_supervisor') return 'مشرف القبول والتسجيل';
      if (scopeType === 'quran_supervisor') return 'مشرف الحلقات التعليمية';
      return 'مشرف تعليمي';
    }
    if (role === 'teacher') return 'معلم حلقة (حلقة النور)';
    if (role === 'parent') return 'ولي أمر (ولي أمر ريان)';
    if (role === 'student') return 'طالب المجمع (ريان الغامدي)';
    return role;
  };

  return (
    <>
      {/* Top Floating Demo Bar */}
      <aside
        aria-label="شريط وضع التجربة الحية"
        id="demo-mode-top-banner"
        className="w-full bg-linear-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-3 sm:px-5 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2 z-50 text-xs font-sans relative border-b border-emerald-600/40"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 font-bold border border-emerald-500/50 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>وضع التجربة الحية (Demo Sandbox)</span>
          </span>

          <span className="hidden sm:inline-block text-emerald-200/80">|</span>

          <span className="text-emerald-100">
            أنت تتصفح الآن بدور:{' '}
            <strong className="text-white font-bold underline decoration-emerald-400 underline-offset-2">
              {getRoleTitle(currentUser?.role)}
            </strong>
          </span>

          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-200/90 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-700/40">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>للقراءة والاستعراض فقط • قاعدة البيانات والذاكرة محمية 100%</span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Role Switcher Button */}
          <div className="relative">
            <button
              id="demo-role-switcher-toggle"
              type="button"
              onClick={() => setShowRoleSwitcher((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-white font-bold transition-all border border-emerald-500/40 text-xs cursor-pointer"
            >
              <span>تبديل الدور التجريبي</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown menu */}
            {showRoleSwitcher && (
              <div
                id="demo-role-switcher-menu"
                className="absolute left-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                  اختر دوراً تجريبياً آخر لتجربته:
                </div>
                <button
                  type="button"
                  onClick={() => handleRoleChange('campus_admin', '/admin')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>مدير المجمع</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('stage_supervisor', '/supervisor')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>مشرف مرحلة (براعم وأشبال)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('programs_supervisor', '/supervisor')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>مشرف البرامج والأنشطة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('admissions_supervisor', '/supervisor')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>مشرف القبول والتسجيل</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('education_supervisor', '/supervisor')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>مشرف الحلقات والتعليم</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('teacher', '/teacher')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span>معلم حلقة النور</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('parent', '/parent')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>ولي الأمر (والد ريان)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('student', '/student')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>طالب المجمع (ريان الغامدي)</span>
                </button>
              </div>
            )}
          </div>

          {/* Exit Demo Button */}
          <button
            id="exit-demo-button"
            type="button"
            onClick={async () => {
              await exitDemoSession();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all text-xs shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>إنهاء التجربة والعودة</span>
          </button>
        </div>
      </aside>

      {/* Interception / Write Guard Toast / Dialog */}
      {demoBlockedNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-write-blocked-title"
          id="demo-write-blocked-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-300 animate-in zoom-in-95 text-right font-sans max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <h3 id="demo-write-blocked-title" className="text-lg font-bold text-slate-900 text-center mb-2 font-serif">
              وضع التجربة الحية (للقراءة والاستعراض فقط)
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed text-center mb-6">
              {demoBlockedNotice}
            </p>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 mb-6 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>تأكيد حماية البيانات:</strong> لم يتم إرسال أو حفظ أي بيانات إلى قاعدة بيانات السحابة (Firestore) أو الذاكرة المحلية، للحفاظ على أمان ونظافة النظام.
              </span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                id="close-demo-blocked-notice-btn"
                onClick={clearDemoBlockedNotice}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-xs cursor-pointer text-center"
              >
                فهمت ذلك، استمرار الاستعراض
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
