import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Award,
  Sparkles,
  UserCheck,
  BookOpen,
  GraduationCap,
  Users,
  User,
  X,
  Lock,
} from 'lucide-react';

interface DemoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DemoPersonaOption {
  key: string;
  title: string;
  subtitle: string;
  name: string;
  targetPath: string;
  icon: React.ElementType;
  badge: string;
  bgGrad: string;
}

export const DemoLoginModal: React.FC<DemoLoginModalProps> = ({ isOpen, onClose }) => {
  const { enterDemoSession } = useApp();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const personas: DemoPersonaOption[] = [
    {
      key: 'campus_admin',
      title: 'مدير المجمع القرآني',
      subtitle: 'صلاحيات إدارية وتشغيلية شاملة لكامل المجمع',
      name: 'أ. محمد بن عبدالله القحطاني',
      targetPath: '/admin',
      icon: ShieldCheck,
      badge: 'إدارة عليا',
      bgGrad: 'from-emerald-700 to-teal-800',
    },
    {
      key: 'stage_supervisor',
      title: 'مشرف مرحلة تعليمية',
      subtitle: 'متابعة حلقات مرحلتي البراعم والأشبال وخططهم',
      name: 'أ. عبدالرحمن بن سعد الغامدي',
      targetPath: '/supervisor',
      icon: Award,
      badge: 'إشراف تعليمي',
      bgGrad: 'from-blue-700 to-indigo-800',
    },
    {
      key: 'education_supervisor',
      title: 'مشرف الحلقات والتعليم',
      subtitle: 'متابعة سير التحفيظ، الاختبارات والخطط القرآنية',
      name: 'د. فيصل بن عبدالعزيز المقرن',
      targetPath: '/supervisor',
      icon: BookOpen,
      badge: 'شؤون تعليمية',
      bgGrad: 'from-teal-700 to-emerald-800',
    },
    {
      key: 'admissions_supervisor',
      title: 'مشرف القبول والتسجيل',
      subtitle: 'معالجة طلبات التسجيل، المقابلات وفرز الطلاب',
      name: 'أ. عمر بن إبراهيم الحازمي',
      targetPath: '/supervisor',
      icon: UserCheck,
      badge: 'القبول والتسجيل',
      bgGrad: 'from-amber-700 to-orange-800',
    },
    {
      key: 'programs_supervisor',
      title: 'مشرف البرامج والأنشطة',
      subtitle: 'إدارة خطة القيم الأسبوعية والتحفيز والأوسمة',
      name: 'أ. سامي بن منصور الزهراني',
      targetPath: '/supervisor',
      icon: Sparkles,
      badge: 'الأنشطة والبرامج',
      bgGrad: 'from-purple-700 to-violet-800',
    },
    {
      key: 'teacher',
      title: 'معلم حلقة قرآنية',
      subtitle: 'تحضير الطلاب، تقييم الحفظ وتسميع الهجاء اليومي',
      name: 'أ. مصعب بن خالد الغامدي (حلقة النور)',
      targetPath: '/teacher',
      icon: BookOpen,
      badge: 'معلم حلقة',
      bgGrad: 'from-emerald-600 to-teal-700',
    },
    {
      key: 'parent',
      title: 'ولي أمر طالب',
      subtitle: 'متابعة الإنجاز اليومي للابن، الحضور والرسائل',
      name: 'أ. ماجد بن سلطان العتيبي (ولي أمر ريان)',
      targetPath: '/parent',
      icon: Users,
      badge: 'بوابة ولي الأمر',
      bgGrad: 'from-sky-700 to-cyan-800',
    },
    {
      key: 'student',
      title: 'طالب في المجمع',
      subtitle: 'استعراض الورد اليومي، الإتقان وبنك الأوسمة',
      name: 'الطالب ريان بن ماجد العتيبي',
      targetPath: '/student',
      icon: User,
      badge: 'بوابة الطالب',
      bgGrad: 'from-amber-600 to-amber-700',
    },
  ];

  const handleSelectPersona = async (persona: DemoPersonaOption) => {
    await enterDemoSession('al-furqan', persona.key);
    onClose();
    navigate(persona.targetPath);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تجربة حية فورية • بيئة العرض</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-200 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-700/50">
                <Lock className="w-3 h-3 text-amber-300" />
                <span>محمي من التعديل 100%</span>
              </span>
            </div>
            <h3 className="text-lg font-bold font-serif text-white">
              تسجيل الدخول التجريبي لمجمع الفرقان
            </h3>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              اختر أي دور لتجربة المنصة واستعراض الواجهات وصلاحياتها مباشرة وبدون كلمة مرور:
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Personas Grid */}
        <div className="p-4 overflow-y-auto space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {personas.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPersona(p)}
                  className="group relative text-right p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-md transition-all flex items-start gap-3 cursor-pointer"
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl bg-linear-to-br ${p.bgGrad} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-900 truncate">
                        {p.title}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {p.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold truncate mb-1">
                      {p.name}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                      {p.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            جميع البيانات المعروضة في وضع التجربة للعرض والاستكشاف فقط ولن تؤثر على قاعدة البيانات الحقيقية.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
