import React from 'react';
import { Award, Printer, X, Sparkles, Calendar, CheckCircle2 } from 'lucide-react';
import { StudentBadge, BadgeDefinition } from '../../types';
import { BADGE_DEFINITIONS } from '../../utils/badgeSystem';
import { useApp } from '../../context/AppContext';
import { MosqueLogo } from './logos/MosqueLogo';
import { StageLogo } from './logos/StageLogo';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: StudentBadge | null;
  studentHalaqahName?: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  badge,
  studentHalaqahName = 'الحلقة القرآنية',
}) => {
  const { activeTenant, students, stages } = useApp();

  if (!isOpen || !badge) return null;

  const student = students.find((s) => s.id === badge.studentId);
  const studentStage = stages.find((st) => st.id === (student?.stageId || 'baraem'));
  const mosqueName = activeTenant?.name || 'مجمع جامع الغزاوي القرآني';
  const stageName = studentStage?.name || studentHalaqahName;

  const definition: BadgeDefinition =
    BADGE_DEFINITIONS[badge.badgeType] || {
      id: badge.badgeType,
      title: 'وسام التميز القرآني',
      category: 'excellence',
      description: badge.notes || 'تقديراً للجد والاجتهاد في مدارسة القرآن الكريم',
      icon: 'Award',
      color: 'emerald',
      criteriaLabel: 'استحقاق متميز',
    };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 print:shadow-none print:border-none print:m-0 print:max-w-none max-h-[92vh] overflow-y-auto">
        {/* Top Screen Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">معاينة وطباعة شهادة الوسام القرآني</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الشهادة (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (A4 Ratio with Traditional Islamic Framing) */}
        <div className="p-8 md:p-12 bg-[#faf8f5] text-slate-900 relative overflow-hidden flex flex-col justify-between min-h-[580px] border-8 border-double border-amber-600/30 m-4 rounded-2xl">
          {/* Subtle Corner Accents */}
          <div className="absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 border-amber-600/60 pointer-events-none" />
          <div className="absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 border-amber-600/60 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 border-amber-600/60 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 border-amber-600/60 pointer-events-none" />

          {/* Certificate Header */}
          <div>
            <div className="flex items-center justify-between border-b border-amber-200 pb-4">
              <div className="flex items-center gap-3">
                <MosqueLogo size="md" />
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-700">المملكة العربية السعودية</div>
                  <div className="text-sm font-black text-emerald-950">{mosqueName}</div>
                  <div className="text-[11px] text-amber-800 font-bold">{stageName}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {studentStage && (
                  <StageLogo stageId={studentStage.id} size="md" />
                )}
              </div>
            </div>

            {/* Bismillah & Title */}
            <div className="text-center mt-6">
              <p className="font-serif text-sm text-emerald-900 font-bold tracking-widest">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-amber-900 mt-2 font-serif">
                شهادة فخر ووسام استحقاق
              </h1>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                قال رسول الله ﷺ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
              </p>
            </div>
          </div>

          {/* Core Content */}
          <div className="my-6 text-center space-y-4">
            <p className="text-sm text-slate-700 font-bold">
              تَفْخَرُ إدارة {stageName} بـ {mosqueName} بِمَنْحِ الطالب المُبَارَك:
            </p>

            <div className="inline-block px-8 py-3 bg-white/80 border-2 border-amber-500/40 rounded-2xl shadow-xs">
              <span className="text-2xl md:text-3xl font-black text-emerald-950 font-serif">
                {badge.studentName}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-600 mb-1">استحقاقاً وتتويجاً بنيله:</p>
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-900 text-amber-300 rounded-full font-black text-base shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{definition.title}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 max-w-xl mx-auto leading-relaxed font-medium bg-amber-50/70 p-3 rounded-xl border border-amber-100">
              {badge.notes || definition.description}
            </p>
          </div>

          {/* Signatures & Official Complex Seal */}
          <div className="border-t border-amber-200 pt-6 mt-4">
            <div className="grid grid-cols-3 items-end text-center gap-4 text-xs text-slate-800">
              <div>
                <div className="font-bold text-slate-900">معلم الحلقة</div>
                <div className="text-emerald-900 font-black mt-1">{badge.awardedBy}</div>
                <div className="mt-4 font-serif text-[11px] text-slate-600 italic">التوقيع: .....................</div>
              </div>

              {/* Official Seal Stamp */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-22 h-22 rounded-full border-4 border-double border-emerald-800 bg-emerald-50/50 flex flex-col items-center justify-center p-2 text-center text-emerald-950 rotate-[-8deg] shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mb-0.5" />
                  <span className="text-[10px] font-black leading-tight">{activeTenant?.name || ''}</span>
                  <span className="text-[8px] font-bold text-amber-900">معتمد رسميًا</span>
                  <span className="text-[7px] text-slate-700">{stageName}</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1">تاريخ الاعتماد: {badge.awardedAt}</div>
              </div>

              <div>
                <div className="font-bold text-slate-900">المشرف العام على المجمع</div>
                <div className="text-emerald-950 font-black mt-1">إدارة مجمع الغزاوي القرآني</div>
                <div className="mt-4 font-serif text-[11px] text-slate-600 italic">الختم والاعتماد الرسمي</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
