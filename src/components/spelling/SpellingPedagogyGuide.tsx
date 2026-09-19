import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  Users,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Save,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { safeStorage } from '../../lib/safeStorage';

export interface MethodologyStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
}

export interface CommonMistake {
  id: string;
  title: string;
  mistakeText: string;
  remedyText: string;
}

export interface GradeLevelStandard {
  id: string;
  stageName: string;
  badgeText: string;
  badgeColor: string;
  title: string;
  points: string[];
}

export interface DiagnosticWord {
  id: string;
  word: string;
  ruleCategory: string;
  note?: string;
}

export interface PedagogyGuideData {
  methodology: MethodologyStep[];
  mistakes: CommonMistake[];
  levels: GradeLevelStandard[];
  diagnostics: DiagnosticWord[];
}

const DEFAULT_GUIDE_DATA: PedagogyGuideData = {
  methodology: [
    {
      id: 'step_1',
      stepNumber: 1,
      title: 'تسمية الحرف مجرداً باسمه الفصيح',
      description:
        'يدرب المعلم الطالب على نطق اسم الحرف صحيحاً (أَلِف، بَاء، تَاء، ثَاء...) دون إمالة أو تمطيط زائد، مع التأكد من إخراج الحروف اللثوية (ث، ذ، ظ) بملامسة طرف اللسان لأطراف الثنايا العليا.',
    },
    {
      id: 'step_2',
      stepNumber: 2,
      title: 'بيان حركة الحرف وزمنها الدقيق',
      description:
        '«باء فتحة (بَ)»، «ميم كسرة (مِ)»، «كاف ضمة (كُ)». يتم التنبيه الحازم على عدم إشباع الحركة فتتولد منها حروف مد، ولا اختلاسها فيذهب نصف صوتها.',
    },
    {
      id: 'step_3',
      stepNumber: 3,
      title: 'الجمع المقطعي التراكمي (2 ثم 3)',
      description:
        'عند تهجئة كلمة مثل «كَتَبَ»: كاف فتحة (كَ) - تاء فتحة (تَ) ← يجمع فوراً: «كَتَ»، ثم يضيف الثالث: باء فتحة (بَ) ← «كَتَبَ». هذا يمنع النسيان المقطعي لدى الطفل.',
    },
    {
      id: 'step_4',
      stepNumber: 4,
      title: 'ربط الحرف الساكن بما قبله مع القلقلة',
      description:
        'الحرف الساكن لا ينطق مفرداً؛ يتهجى الطفل الحرف المتحرك أولاً ثم يقرنه بالساكن (ألف فتحة باء سكون مقلقلة: أَبْ).',
    },
    {
      id: 'step_5',
      stepNumber: 5,
      title: 'ضبط المد الطبيعي والمدود الصغرى',
      description:
        'إعطاء الألف الخنجرية وحروف المد زمناً متساوياً بمقدار حركتين (حركة قبض الإصبع وبسطه)، مع تفخيم ألف المد بعد الحروف المفخمة وترقيقها بعد المرققة.',
    },
    {
      id: 'step_6',
      stepNumber: 6,
      title: 'ضغط الشدة وتوفية الغنة',
      description:
        'بيان أن الحرف المشدد هو حرفان (ساكن فمتحرك)، والتأكيد على خروج الغنة من الخيشوم بمقدار حركتين محكمتين في النون والميم المشددتين.',
    },
    {
      id: 'step_7',
      stepNumber: 7,
      title: 'القراءة المسترسلة بطلاقة دون تقطيع',
      description:
        'بعد الانتهاء من التهجئة التفصيلية، يقرأ الطالب الكلمة كاملة في نفس واحد دون توقف بين المقاطع لربطها بالرسم المصحفي المسترسل.',
    },
  ],
  mistakes: [
    {
      id: 'mistake_1',
      title: 'الخلط بين صوت الكسرة وتوليد الياء الزائدة',
      mistakeText: 'نطق «بِـ» وكأنها «بِيـ» بتمطيط مبالغ فيه.',
      remedyText: 'تدريب الطفل على خفض الفك السفلي بسرعة واقتضاب مع الحفاظ على زمن حركة واحدة.',
    },
    {
      id: 'mistake_2',
      title: 'تفخيم الحروف المرققة المجاورة للمفخم',
      mistakeText: 'تفخيم اللام في كلمة «خَلَقَ» لتصبح كالصاد أو تفخيم التاء في «تَصْلَى».',
      remedyText: 'رياضة اللسان على الانتقال من وضع الاستعلاء إلى الاستفال وتخليص الحروف حرفاً حرفاً.',
    },
    {
      id: 'mistake_3',
      title: 'همس الحروف الشديدة المجهورة كالجيم والدال',
      mistakeText: 'إخراج هواء زائد مع الجيم (الشين الشامية أو الجيم القاهرية).',
      remedyText: 'إلصاق وسط اللسان بسقف الحنك إغلاقاً محكماً يمنع جريان النفس والصوت ثم فتحه فجأة.',
    },
  ],
  levels: [
    {
      id: 'level_1',
      stageName: 'مرحلة التمهيدي',
      badgeText: 'مرحلة التمهيدي',
      badgeColor: 'emerald',
      title: 'التأسيس الحركي والتعرف البصري',
      points: [
        'إتقان الحروف المفردة شكلاً وصوتاً (الدرس 1 و 2).',
        'التمييز التام بين الحركات الثلاث (الدروس 3 و 4).',
        'التهجي المقطعي لكلمات ثلاثية بسيطة.',
        'الوصول إلى سورة قريش في الحفظ.',
      ],
    },
    {
      id: 'level_2',
      stageName: 'الصف الأول الابتدائي',
      badgeText: 'الصف الأول الابتدائي',
      badgeColor: 'blue',
      title: 'الرسم العثماني والمدود والسكون',
      points: [
        'إتقان التنوين بالفتح والضم والكسر (الدرس 5).',
        'إتقان الألف الخنجرية والمدود الصغرى (الدرس 7).',
        'حروف المد واللين والسكون والقلقلة (الدروس 8 و 9).',
        'الوصول إلى سورة البينة في الحفظ.',
      ],
    },
    {
      id: 'level_3',
      stageName: 'الصف الثاني الابتدائي',
      badgeText: 'الصف الثاني الابتدائي',
      badgeColor: 'purple',
      title: 'الشدة والغنة والمخرج النهائي',
      points: [
        'الشدة مع الحركات والغنة الكاملة (الدروس 10 و 11).',
        'اللام الشمسية والقمرية والتهجي من المصحف (الدرس 12).',
        'القراءة المسترسلة بطلاقة دون تلعثم.',
        'الوصول إلى سورة الغاشية في الحفظ.',
      ],
    },
  ],
  diagnostics: [
    { id: 'diag_1', word: 'كَتَبَ', ruleCategory: 'حركات ثلاث' },
    { id: 'diag_2', word: 'عَمِلَ', ruleCategory: 'كسرة وسطية' },
    { id: 'diag_3', word: 'أَحَدٌ', ruleCategory: 'تنوين ضم' },
    { id: 'diag_4', word: 'هٰذَا', ruleCategory: 'ألف خنجرية' },
    { id: 'diag_5', word: 'يَقُولُ', ruleCategory: 'مد واو' },
    { id: 'diag_6', word: 'خَوْفٍ', ruleCategory: 'واو لين' },
    { id: 'diag_7', word: 'يَلِدْ', ruleCategory: 'قلقلة دال' },
    { id: 'diag_8', word: 'إِنَّ', ruleCategory: 'غنة مشددة' },
    { id: 'diag_9', word: 'رَبِّ', ruleCategory: 'شدة كسر' },
    { id: 'diag_10', word: 'الشَّمْسُ', ruleCategory: 'لام شمسية' },
  ],
};

export const SpellingPedagogyGuide: React.FC = () => {
  const { currentUser, currentRole } = useApp();

  const canManage =
    currentUser &&
    ['system_admin', 'campus_admin', 'admin', 'supervisor', 'charity_supervisor'].includes(
      currentUser.role || currentRole
    );

  const [activeTopic, setActiveTopic] = useState<'methodology' | 'mistakes' | 'levels' | 'qa'>('methodology');

  const [guideData, setGuideData] = useState<PedagogyGuideData>(() => {
    const saved = safeStorage.getItem('qrms_pedagogy_guide_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved pedagogy guide', e);
      }
    }
    return DEFAULT_GUIDE_DATA;
  });

  const saveGuideToStorage = (updated: PedagogyGuideData) => {
    setGuideData(updated);
    safeStorage.setItem('qrms_pedagogy_guide_data', JSON.stringify(updated));
  };

  const handleRestoreDefaults = () => {
    if (confirm('هل تريد استعادة جميع إرشادات دليل المعلم النموذجية الافتراضية؟')) {
      saveGuideToStorage(DEFAULT_GUIDE_DATA);
    }
  };

  // Methodology Step Modal State
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState(false);
  const [editingMethodology, setEditingMethodology] = useState<MethodologyStep | null>(null);
  const [methodologyForm, setMethodologyForm] = useState({
    stepNumber: 1,
    title: '',
    description: '',
  });

  // Mistakes Modal State
  const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false);
  const [editingMistake, setEditingMistake] = useState<CommonMistake | null>(null);
  const [mistakeForm, setMistakeForm] = useState({
    title: '',
    mistakeText: '',
    remedyText: '',
  });

  // Grade Levels Modal State
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<GradeLevelStandard | null>(null);
  const [levelForm, setLevelForm] = useState({
    stageName: '',
    badgeText: '',
    badgeColor: 'emerald',
    title: '',
    pointsText: '',
  });

  // Diagnostics Modal State
  const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);
  const [editingDiag, setEditingDiag] = useState<DiagnosticWord | null>(null);
  const [diagForm, setDiagForm] = useState({
    word: '',
    ruleCategory: '',
  });

  // 1. Methodology Actions
  const handleOpenAddMethodology = () => {
    setEditingMethodology(null);
    setMethodologyForm({
      stepNumber: guideData.methodology.length + 1,
      title: '',
      description: '',
    });
    setIsMethodologyModalOpen(true);
  };

  const handleOpenEditMethodology = (step: MethodologyStep) => {
    setEditingMethodology(step);
    setMethodologyForm({
      stepNumber: step.stepNumber,
      title: step.title,
      description: step.description,
    });
    setIsMethodologyModalOpen(true);
  };

  const handleSaveMethodology = (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodologyForm.title.trim()) return;

    if (editingMethodology) {
      const updatedList = guideData.methodology.map((s) =>
        s.id === editingMethodology.id
          ? {
              ...s,
              stepNumber: Number(methodologyForm.stepNumber),
              title: methodologyForm.title.trim(),
              description: methodologyForm.description.trim(),
            }
          : s
      );
      saveGuideToStorage({ ...guideData, methodology: updatedList });
    } else {
      const newStep: MethodologyStep = {
        id: `step_${Date.now()}`,
        stepNumber: Number(methodologyForm.stepNumber) || guideData.methodology.length + 1,
        title: methodologyForm.title.trim(),
        description: methodologyForm.description.trim(),
      };
      saveGuideToStorage({ ...guideData, methodology: [...guideData.methodology, newStep] });
    }
    setIsMethodologyModalOpen(false);
  };

  const handleDeleteMethodology = (stepId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الخطوة من الدليل؟')) {
      const updatedList = guideData.methodology.filter((s) => s.id !== stepId);
      saveGuideToStorage({ ...guideData, methodology: updatedList });
    }
  };

  // 2. Mistakes Actions
  const handleOpenAddMistake = () => {
    setEditingMistake(null);
    setMistakeForm({
      title: '',
      mistakeText: '',
      remedyText: '',
    });
    setIsMistakeModalOpen(true);
  };

  const handleOpenEditMistake = (item: CommonMistake) => {
    setEditingMistake(item);
    setMistakeForm({
      title: item.title,
      mistakeText: item.mistakeText,
      remedyText: item.remedyText,
    });
    setIsMistakeModalOpen(true);
  };

  const handleSaveMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mistakeForm.title.trim()) return;

    if (editingMistake) {
      const updatedList = guideData.mistakes.map((m) =>
        m.id === editingMistake.id
          ? {
              ...m,
              title: mistakeForm.title.trim(),
              mistakeText: mistakeForm.mistakeText.trim(),
              remedyText: mistakeForm.remedyText.trim(),
            }
          : m
      );
      saveGuideToStorage({ ...guideData, mistakes: updatedList });
    } else {
      const newMistake: CommonMistake = {
        id: `mistake_${Date.now()}`,
        title: mistakeForm.title.trim(),
        mistakeText: mistakeForm.mistakeText.trim(),
        remedyText: mistakeForm.remedyText.trim(),
      };
      saveGuideToStorage({ ...guideData, mistakes: [...guideData.mistakes, newMistake] });
    }
    setIsMistakeModalOpen(false);
  };

  const handleDeleteMistake = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الخطأ الشائع وطريقة علاجه؟')) {
      const updatedList = guideData.mistakes.filter((m) => m.id !== id);
      saveGuideToStorage({ ...guideData, mistakes: updatedList });
    }
  };

  // 3. Level Standards Actions
  const handleOpenAddLevel = () => {
    setEditingLevel(null);
    setLevelForm({
      stageName: 'مرحلة جديدة',
      badgeText: 'مرحلة جديدة',
      badgeColor: 'emerald',
      title: 'المستهدفات والمخرجات',
      pointsText: '• المستهدف الأول\n• المستهدف الثاني',
    });
    setIsLevelModalOpen(true);
  };

  const handleOpenEditLevel = (lvl: GradeLevelStandard) => {
    setEditingLevel(lvl);
    setLevelForm({
      stageName: lvl.stageName,
      badgeText: lvl.badgeText,
      badgeColor: lvl.badgeColor,
      title: lvl.title,
      pointsText: lvl.points.join('\n'),
    });
    setIsLevelModalOpen(true);
  };

  const handleSaveLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.stageName.trim()) return;

    const pointsArr = levelForm.pointsText
      .split('\n')
      .map((p) => p.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean);

    if (editingLevel) {
      const updatedList = guideData.levels.map((l) =>
        l.id === editingLevel.id
          ? {
              ...l,
              stageName: levelForm.stageName.trim(),
              badgeText: levelForm.badgeText.trim(),
              badgeColor: levelForm.badgeColor,
              title: levelForm.title.trim(),
              points: pointsArr,
            }
          : l
      );
      saveGuideToStorage({ ...guideData, levels: updatedList });
    } else {
      const newLvl: GradeLevelStandard = {
        id: `level_${Date.now()}`,
        stageName: levelForm.stageName.trim(),
        badgeText: levelForm.badgeText.trim() || levelForm.stageName.trim(),
        badgeColor: levelForm.badgeColor,
        title: levelForm.title.trim(),
        points: pointsArr,
      };
      saveGuideToStorage({ ...guideData, levels: [...guideData.levels, newLvl] });
    }
    setIsLevelModalOpen(false);
  };

  const handleDeleteLevel = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المرحلة من معايير التدرج؟')) {
      const updatedList = guideData.levels.filter((l) => l.id !== id);
      saveGuideToStorage({ ...guideData, levels: updatedList });
    }
  };

  // 4. Diagnostics Actions
  const handleOpenAddDiag = () => {
    setEditingDiag(null);
    setDiagForm({
      word: '',
      ruleCategory: '',
    });
    setIsDiagModalOpen(true);
  };

  const handleOpenEditDiag = (d: DiagnosticWord) => {
    setEditingDiag(d);
    setDiagForm({
      word: d.word,
      ruleCategory: d.ruleCategory,
    });
    setIsDiagModalOpen(true);
  };

  const handleSaveDiag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagForm.word.trim()) return;

    if (editingDiag) {
      const updatedList = guideData.diagnostics.map((d) =>
        d.id === editingDiag.id
          ? {
              ...d,
              word: diagForm.word.trim(),
              ruleCategory: diagForm.ruleCategory.trim(),
            }
          : d
      );
      saveGuideToStorage({ ...guideData, diagnostics: updatedList });
    } else {
      const newDiag: DiagnosticWord = {
        id: `diag_${Date.now()}`,
        word: diagForm.word.trim(),
        ruleCategory: diagForm.ruleCategory.trim(),
      };
      saveGuideToStorage({ ...guideData, diagnostics: [...guideData.diagnostics, newDiag] });
    }
    setIsDiagModalOpen(false);
  };

  const handleDeleteDiag = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الكلمة التشخيصية؟')) {
      const updatedList = guideData.diagnostics.filter((d) => d.id !== id);
      saveGuideToStorage({ ...guideData, diagnostics: updatedList });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner for Admins & Supervisors */}
      {canManage && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              صلاحية تعديل دليل المعلم مفعلة (المدير والمشرفون): يمكنك تعديل الخطوات التربوية، الأخطاء الشائعة، معايير الصفوف والاختبارات التشخيصية.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeTopic === 'methodology' && (
              <button
                type="button"
                onClick={handleOpenAddMethodology}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خطوة</span>
              </button>
            )}
            {activeTopic === 'mistakes' && (
              <button
                type="button"
                onClick={handleOpenAddMistake}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خطأ وعلاج</span>
              </button>
            )}
            {activeTopic === 'levels' && (
              <button
                type="button"
                onClick={handleOpenAddLevel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة معيار صف</span>
              </button>
            )}
            {activeTopic === 'qa' && (
              <button
                type="button"
                onClick={handleOpenAddDiag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة كلمة اختبار</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              title="استعادة الدليل النموذجي"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto text-xs font-bold no-scrollbar">
        <button
          onClick={() => setActiveTopic('methodology')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTopic === 'methodology'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📖 الخطوات السبع للتهجئة النموذجية ({guideData.methodology.length})
        </button>
        <button
          onClick={() => setActiveTopic('mistakes')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTopic === 'mistakes'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ⚠️ أشهر الأخطاء الشائعة وطرق علاجها ({guideData.mistakes.length})
        </button>
        <button
          onClick={() => setActiveTopic('levels')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTopic === 'levels'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🎯 معايير التدرج والمخرجات حسب الصف ({guideData.levels.length})
        </button>
        <button
          onClick={() => setActiveTopic('qa')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTopic === 'qa'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          💡 أسئلة تشخيصية واختبارات قياس ({guideData.diagnostics.length})
        </button>
      </div>

      {/* TOPIC 1: SEVEN-STEP METHODOLOGY */}
      {activeTopic === 'methodology' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guideData.methodology.map((step) => (
            <div
              key={step.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                  {step.stepNumber}
                </span>

                {canManage && (
                  <div className="opacity-80 group-hover:opacity-100 flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditMethodology(step)}
                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg"
                      title="تعديل الخطوة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMethodology(step.id)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg"
                      title="حذف الخطوة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* TOPIC 2: COMMON MISTAKES */}
      {activeTopic === 'mistakes' && (
        <div className="space-y-4">
          {guideData.mistakes.map((mistake) => (
            <div
              key={mistake.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-800 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-700" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">{mistake.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-rose-800">الخطأ:</strong> {mistake.mistakeText}
                      <br />
                      <strong className="text-emerald-800">العلاج:</strong> {mistake.remedyText}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="opacity-80 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditMistake(mistake)}
                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg"
                      title="تعديل الخطأ والعلاج"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMistake(mistake.id)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg"
                      title="حذف هذا البند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOPIC 3: GRADE TARGETS */}
      {activeTopic === 'levels' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {guideData.levels.map((lvl) => {
            const isEmerald = lvl.badgeColor === 'emerald';
            const isBlue = lvl.badgeColor === 'blue';
            const isPurple = lvl.badgeColor === 'purple';

            const badgeCls = isEmerald
              ? 'bg-emerald-100 text-emerald-800'
              : isBlue
              ? 'bg-blue-100 text-blue-800'
              : isPurple
              ? 'bg-purple-100 text-purple-800'
              : 'bg-slate-100 text-slate-800';

            return (
              <div
                key={lvl.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeCls}`}>
                    {lvl.badgeText}
                  </span>

                  {canManage && (
                    <div className="opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditLevel(lvl)}
                        className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg"
                        title="تعديل معايير الصف"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(lvl.id)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg"
                        title="حذف هذا الصف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{lvl.title}</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside leading-relaxed">
                  {lvl.points.map((pt, pIdx) => (
                    <li key={pIdx}>{pt}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* TOPIC 4: Q&A DIAGNOSTICS */}
      {activeTopic === 'qa' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>بطاقة الاختبار التشخيصي السريع ({guideData.diagnostics.length} كلمات معيارية):</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {guideData.diagnostics.map((diag) => (
              <div
                key={diag.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group"
              >
                {canManage && (
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 p-0.5 rounded-md border border-slate-200 shadow-2xs">
                    <button
                      onClick={() => handleOpenEditDiag(diag)}
                      className="p-1 hover:text-emerald-700 text-slate-600"
                      title="تعديل الكلمة"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteDiag(diag.id)}
                      className="p-1 hover:text-rose-600 text-slate-600"
                      title="حذف الكلمة"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <span className="text-base font-bold font-serif block text-slate-900">{diag.word}</span>
                <span className="text-[10px] text-slate-500">{diag.ruleCategory}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methodology Modal */}
      {isMethodologyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingMethodology ? 'تعديل خطوة التهجئة' : 'إضافة خطوة نموذجية جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMethodologyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMethodology} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الخطوة</label>
                <input
                  type="number"
                  required
                  value={methodologyForm.stepNumber}
                  onChange={(e) => setMethodologyForm({ ...methodologyForm, stepNumber: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الخطوة *</label>
                <input
                  type="text"
                  required
                  value={methodologyForm.title}
                  onChange={(e) => setMethodologyForm({ ...methodologyForm, title: e.target.value })}
                  placeholder="مثال: تسمية الحرف مجرداً"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شرح وتفصيل الخطوة *</label>
                <textarea
                  rows={4}
                  required
                  value={methodologyForm.description}
                  onChange={(e) => setMethodologyForm({ ...methodologyForm, description: e.target.value })}
                  placeholder="توجيهات المعلم لكيفية تطبيق الخطوة مع الطلاب..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMethodologyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الخطوة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mistakes Modal */}
      {isMistakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingMistake ? 'تعديل الخطأ الشائع وطريقة علاجه' : 'إضافة خطأ شائع جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMistakeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMistake} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الخطأ *</label>
                <input
                  type="text"
                  required
                  value={mistakeForm.title}
                  onChange={(e) => setMistakeForm({ ...mistakeForm, title: e.target.value })}
                  placeholder="مثال: الخلط بين صوت الكسرة وتوليد الياء"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-rose-800 mb-1">وصف الخطأ الصوتي *</label>
                <textarea
                  rows={2}
                  required
                  value={mistakeForm.mistakeText}
                  onChange={(e) => setMistakeForm({ ...mistakeForm, mistakeText: e.target.value })}
                  placeholder="مثال: نطق «بِـ» وكأنها «بِيـ» بتمطيط مبالغ فيه..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-800 mb-1">طريقة العلاج والتوجيه الصوتي *</label>
                <textarea
                  rows={3}
                  required
                  value={mistakeForm.remedyText}
                  onChange={(e) => setMistakeForm({ ...mistakeForm, remedyText: e.target.value })}
                  placeholder="مثال: تدريب الطفل على خفض الفك السفلي بسرعة واقتضاب..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMistakeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ البند</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Levels Modal */}
      {isLevelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingLevel ? 'تعديل معايير المرحلة والصف' : 'إضافة مرحلة ومعايير جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLevelModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المرحلة / الصف *</label>
                  <input
                    type="text"
                    required
                    value={levelForm.stageName}
                    onChange={(e) => setLevelForm({ ...levelForm, stageName: e.target.value, badgeText: e.target.value })}
                    placeholder="مثال: الصف الثالث الابتدائي"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">لون الشارة</label>
                  <select
                    value={levelForm.badgeColor}
                    onChange={(e) => setLevelForm({ ...levelForm, badgeColor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                  >
                    <option value="emerald">أخضر (زمردي)</option>
                    <option value="blue">أزرق</option>
                    <option value="purple">بنفسجي</option>
                    <option value="amber">برتقالي / كهرماني</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان المخرج المستهدف *</label>
                <input
                  type="text"
                  required
                  value={levelForm.title}
                  onChange={(e) => setLevelForm({ ...levelForm, title: e.target.value })}
                  placeholder="مثال: إتقان التنوين والمدود والسكون"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  بنود المعايير والمخرجات (سطر لكل بند) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={levelForm.pointsText}
                  onChange={(e) => setLevelForm({ ...levelForm, pointsText: e.target.value })}
                  placeholder="• إتقان التنوين بالفتح والضم والكسر&#10;• إتقان الألف الخنجرية&#10;• الوصول إلى سورة البينة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ المرحلة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {isDiagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingDiag ? 'تعديل كلمة الاختبار' : 'إضافة كلمة اختبار تشخيصي'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDiagModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiag} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الكلمة القرآنية *</label>
                <input
                  type="text"
                  required
                  value={diagForm.word}
                  onChange={(e) => setDiagForm({ ...diagForm, word: e.target.value })}
                  placeholder="مثال: يُؤْمِنُونَ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-serif font-bold text-base text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المهارة أو الحكم المستهدف *</label>
                <input
                  type="text"
                  required
                  value={diagForm.ruleCategory}
                  onChange={(e) => setDiagForm({ ...diagForm, ruleCategory: e.target.value })}
                  placeholder="مثال: همزة ساكنة ومد واو"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDiagModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الكلمة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
