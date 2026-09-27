import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Edit2,
  Upload,
  Download,
  FileSpreadsheet,
  Code,
  Sparkles,
  Bot,
  Copy,
  Check,
  Calendar,
  Layers,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { EducationalPlanWeek, EducationalStage, Teacher } from '../../types';
import {
  generateEducationalPlanAIPrompt,
  downloadEducationalPlanTemplate,
  parseEducationalPlanExcel,
  exportEducationalPlanToExcel,
} from '../../utils/educationalPlanUtils';

interface EducationalPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStage?: EducationalStage;
  stages?: EducationalStage[];
  teachers: Teacher[];
  totalSemesterWeeks: number;
  editingWeek: Partial<EducationalPlanWeek> | null;
  onSaveSingleWeek: (week: Partial<EducationalPlanWeek>, isNew: boolean) => void;
  onBulkSaveWeeks: (weeks: Omit<EducationalPlanWeek, 'id'>[], replaceExisting: boolean) => void;
  currentPlanWeeks: EducationalPlanWeek[];
}

export const EducationalPlanModal: React.FC<EducationalPlanModalProps> = ({
  isOpen,
  onClose,
  selectedStage,
  stages = [],
  teachers,
  totalSemesterWeeks,
  editingWeek,
  onSaveSingleWeek,
  onBulkSaveWeeks,
  currentPlanWeeks,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk_generate' | 'excel' | 'json' | 'ai_prompt'>(
    editingWeek ? 'single' : 'single'
  );

  // Single Week Form State
  const [formWeek, setFormWeek] = useState<Partial<EducationalPlanWeek>>(() => {
    if (editingWeek) {
      return {
        showSupervisorName: true,
        isVisible: true,
        ...editingWeek,
      };
    }
    const nextNum = currentPlanWeeks.length > 0 ? Math.max(...currentPlanWeeks.map((w) => w.weekNumber)) + 1 : 1;
    const defaultStageId = selectedStage?.id || (stages.length > 0 ? stages[0].id : 'baraem');
    const defaultStageObj = stages.find((s) => s.id === defaultStageId) || selectedStage;
    return {
      weekNumber: nextNum,
      stageId: defaultStageId,
      stageName: defaultStageObj?.name || 'مرحلة البراعم',
      targetStageIds: defaultStageId ? [defaultStageId] : ['baraem'],
      showSupervisorName: true,
      isVisible: true,
      weekType: 'normal',
      startDate: '',
      endDate: '',
      dayDates: { thursday: '', friday: '', saturday: '' },
      domain: 'behavioral',
      domainLabel: 'سلوكي',
      valueTitle: '',
      motto: '',
      educationalGoal: '',
      goalTopic: '',
      goalPresenter: teachers[0]?.name || '',
      goalLocation: 'القاعة الرئيسية',
      activity: '',
      activityPresenter: teachers[1]?.name || teachers[0]?.name || '',
      activityLocation: 'الساحة التفاعلية',
      responsiblePerson: 'نور إبراهيم',
      quranicProgram: 'مسابقة نحو المعالي',
      budget: 100,
      notes: '',
      status: 'scheduled',
    };
  });

  // Bulk Generator State
  const [generateCount, setGenerateCount] = useState<number>(totalSemesterWeeks || 14);
  const [bulkMode, setBulkMode] = useState<'append' | 'replace'>('replace');

  // JSON State
  const [jsonContent, setJsonContent] = useState<string>(() => {
    return JSON.stringify(
      currentPlanWeeks.map(({ id, ...rest }) => rest),
      null,
      2
    );
  });
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Excel Upload State
  const [excelPreview, setExcelPreview] = useState<Omit<EducationalPlanWeek, 'id'>[] | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Prompt Copy State
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isEditing = Boolean(editingWeek && editingWeek.id);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWeek.motto && !formWeek.educationalGoal && formWeek.weekType === 'normal') {
      alert('يرجى تعبئة شعار الأسبوع أو الهدف المعتمد');
      return;
    }
    onSaveSingleWeek(formWeek, !isEditing);
    onClose();
  };

  const handleBulkGenerate = () => {
    const weeksToCreate: Omit<EducationalPlanWeek, 'id'>[] = [];
    const count = Math.max(1, Math.min(30, generateCount));

    for (let i = 1; i <= count; i++) {
      const isLongWeekend = i === 4 || i === 8;
      const isExams = i === count;
      const isDeadWeek = i === count - 1;

      let weekType = 'normal';
      let specialEventTitle: string | undefined = undefined;
      let domain: 'faith' | 'behavioral' | 'skills' | 'quranic' = 'faith';
      let domainLabel = 'إيماني';
      let valueTitle = `قيمة الأسبوع ${i}`;
      let motto = `«شعار الأسبوع ${i}»`;
      let educationalGoal = `هدف الأسبوع ${i} لتعزيز القيم التربوية`;
      let activity = `فقرة تفاعلية ومسابقات الأسبوع ${i}`;
      let budget = 100;

      if (isLongWeekend) {
        weekType = 'long_weekend';
        specialEventTitle = 'إجازة نهاية أسبوع مطولة';
        valueTitle = 'إجازة مطولة';
        motto = '«إجازة سعيدة ومباركة»';
        educationalGoal = 'إجازة رسمية - لا توجد أنشطة حضورية';
        activity = '';
        budget = 0;
      } else if (isDeadWeek) {
        weekType = 'dead_week';
        specialEventTitle = 'الأسبوع الميت والمراجعة المكثفة';
        valueTitle = 'تثبيت المحفوظات';
        motto = '«همتي في مراجعتي»';
        educationalGoal = 'مراجعة شاملة لمقررات الفصل وتثبيت المخرج';
        activity = 'ماراثون التثبيت';
        budget = 150;
      } else if (isExams) {
        weekType = 'exams';
        specialEventTitle = 'فترة الاختبارات النهائية والتكريم';
        valueTitle = 'الحفل الختامي والتتويج';
        motto = '«تاج الوقار والإتقان»';
        educationalGoal = 'إجراء الاختبارات النهائية وتكريم الطلاب المتقنين';
        activity = 'الحفل الختامي وتوزيع الجوائز';
        budget = 500;
      } else {
        const teacherAssigned = teachers[(i - 1) % (teachers.length || 1)]?.name || 'مشرف المرحلة';
        const teacherAssigned2 = teachers[i % (teachers.length || 1)]?.name || teacherAssigned;

        if (i % 3 === 0) {
          domain = 'behavioral';
          domainLabel = 'سلوكي';
          valueTitle = i === 3 ? 'بر الوالدين' : 'الصدق والأمانة';
          motto = i === 3 ? '«ببر والدي أرتقي»' : '«أنا صادق وأمين»';
        } else if (i % 3 === 1) {
          domain = 'faith';
          domainLabel = 'إيماني';
          valueTitle = 'تعظيم القرآن الكريم';
          motto = '«قرآني نوري وكلام ربي»';
        } else {
          domain = 'skills';
          domainLabel = 'مهاري';
          valueTitle = 'إتقان الصلاة والآداب';
          motto = '«صلاتي قرة عيني»';
        }
      }

      weeksToCreate.push({
        stageId: selectedStage?.id,
        weekNumber: i,
        weekType,
        specialEventTitle,
        startDate: '',
        endDate: '',
        dayDates: {
          thursday: `${i}/خميس`,
          friday: `${i}/جمعة`,
          saturday: `${i}/سبت`,
        },
        domain,
        domainLabel,
        valueTitle,
        motto,
        educationalGoal,
        goalTopic: educationalGoal,
        goalPresenter: teachers[0]?.name || 'مشرف المرحلة',
        goalLocation: 'القاعة الرئيسية',
        activity,
        activityPresenter: teachers[1]?.name || teachers[0]?.name || 'مشرف النشاط',
        activityLocation: 'الساحة التفاعلية',
        responsiblePerson: teachers[(i - 1) % (teachers.length || 1)]?.name || 'مشرف المرحلة',
        quranicProgram: 'مسابقة نحو المعالي',
        budget,
        notes: '',
        status: 'scheduled',
      });
    }

    onBulkSaveWeeks(weeksToCreate, bulkMode === 'replace');
    onClose();
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseEducationalPlanExcel(buffer, selectedStage?.id);
        if (parsed.length === 0) {
          alert('لم يتم العثور على أي صفوف صالحة في ملف الإكسيل المرفوع');
          return;
        }
        setExcelPreview(parsed);
      } catch (err: any) {
        alert('حدث خطأ أثناء قراءة ملف الإكسيل: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyExcel = () => {
    if (!excelPreview || excelPreview.length === 0) return;
    onBulkSaveWeeks(excelPreview, bulkMode === 'replace');
    onClose();
  };

  const handleApplyJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed)) {
        setJsonError('يجب أن يكون محتوى JSON مصفوفة أسابيع Array [ { ... } ]');
        return;
      }
      const validated: Omit<EducationalPlanWeek, 'id'>[] = parsed.map((item, idx) => ({
        stageId: selectedStage?.id,
        weekNumber: item.weekNumber || idx + 1,
        weekType: item.weekType || 'normal',
        specialEventTitle: item.specialEventTitle,
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        dayDates: item.dayDates || {},
        domain: item.domain || 'faith',
        domainLabel: item.domainLabel || 'إيماني',
        valueTitle: item.valueTitle || '',
        motto: item.motto || `الأسبوع ${item.weekNumber || idx + 1}`,
        educationalGoal: item.educationalGoal || item.goalTopic || '',
        goalTopic: item.goalTopic || item.educationalGoal || '',
        goalPresenter: item.goalPresenter || '',
        goalLocation: item.goalLocation || '',
        activity: item.activity || '',
        activityPresenter: item.activityPresenter || '',
        activityLocation: item.activityLocation || '',
        responsiblePerson: item.responsiblePerson || 'مشرف المرحلة',
        quranicProgram: item.quranicProgram || '',
        overallProjectBudget: item.overallProjectBudget,
        budget: item.budget || 0,
        notes: item.notes || '',
        status: item.status || 'scheduled',
      }));

      onBulkSaveWeeks(validated, bulkMode === 'replace');
      onClose();
    } catch (err: any) {
      setJsonError('خطأ في بناء كود JSON: ' + err.message);
    }
  };

  const aiPromptText = generateEducationalPlanAIPrompt(selectedStage, teachers, totalSemesterWeeks || 14);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPromptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-800/80 text-emerald-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isEditing ? 'تعديل الأسبوع التربوي' : 'إدارة وبناء الخطة التربوية'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {selectedStage ? `المرحلة الحالية: ${selectedStage.name}` : 'الخطة التربوية العامة للمجمع'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        {!isEditing && (
          <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أسبوع فردي</span>
            </button>

            <button
              onClick={() => setActiveTab('bulk_generate')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'bulk_generate'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>توليد أسابيع الفصل دفعة واحدة</span>
            </button>

            <button
              onClick={() => setActiveTab('excel')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>استيراد وتصدير إكسيل (Excel)</span>
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-4 h-4 text-indigo-600" />
              <span>محرر JSON ولصق البيانات</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_prompt')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ai_prompt'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-purple-700 hover:text-purple-900'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-600" />
              <span>برومبت الذكاء الاصطناعي (AI Prompt)</span>
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: SINGLE WEEK FORM */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {/* Row 0: Target Stage & Public Visibility Controls */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-teal-950 mb-1">
                      المرحلة التعليمية المستهدفة للخطة
                    </label>
                    <select
                      value={formWeek.stageId || 'all'}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const st = stages.find((s) => s.id === sid);
                        setFormWeek({
                          ...formWeek,
                          stageId: sid === 'all' ? undefined : sid,
                          stageName: st?.name || (sid === 'all' ? 'الخطة العامة لكافة المراحل' : ''),
                          targetStageIds: sid === 'all' ? [] : [sid],
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-white font-bold text-slate-800"
                    >
                      <option value="all">🌐 الخطة التربوية العامة (لكافة المراحل)</option>
                      {stages.map((st) => (
                        <option key={st.id} value={st.id}>
                          🌱 {st.name} {st.code ? `(${st.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col justify-center gap-2 pt-1">
                    {/* Toggle showSupervisorName */}
                    <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-teal-200/90 shadow-2xs hover:bg-teal-50/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={formWeek.showSupervisorName !== false}
                        onChange={(e) => setFormWeek({ ...formWeek, showSupervisorName: e.target.checked })}
                        className="w-4 h-4 rounded text-teal-700 focus:ring-teal-500 accent-teal-700 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 text-[11px]">
                        إظهار اسم المشرف المسؤول في البوابة والتقارير العامة
                      </span>
                    </label>

                    {/* Toggle isVisible */}
                    <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-teal-200/90 shadow-2xs hover:bg-teal-50/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={formWeek.isVisible !== false}
                        onChange={(e) => setFormWeek({ ...formWeek, isVisible: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 accent-emerald-700 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800 text-[11px]">
                        تفعيل ظهور الخطة في البوابة العامة وبوابة أولياء الأمور
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 1: Week Number & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">رقم الأسبوع</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={formWeek.weekNumber || 1}
                    onChange={(e) => setFormWeek({ ...formWeek, weekNumber: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">نوع الأسبوع</label>
                  <select
                    value={formWeek.weekType || 'normal'}
                    onChange={(e) => setFormWeek({ ...formWeek, weekType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="normal">أسبوع نشاط عادي 📖</option>
                    <option value="long_weekend">إجازة نهاية أسبوع مطولة ☕</option>
                    <option value="founding_day">إجازة يوم التأسيس 🇸🇦</option>
                    <option value="national_day">إجازة اليوم الوطني 🇸🇦</option>
                    <option value="dead_week">الأسبوع الميت / استكمال المنهج 📚</option>
                    <option value="exams">فترة الاختبارات النهائية 🎯</option>
                    <option value="midterm_break">إجازة ما بين الفصلين 🌴</option>
                    <option value="vacation">إجازة رسمية 🏖️</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">المجال التربوي</label>
                  <select
                    value={formWeek.domain || 'faith'}
                    onChange={(e) => {
                      const d = e.target.value;
                      const label = d === 'faith' ? 'إيماني' : d === 'behavioral' ? 'سلوكي' : d === 'skills' ? 'مهاري' : 'قرآني';
                      setFormWeek({ ...formWeek, domain: d as any, domainLabel: label });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="faith">إيماني (عقيدة، تعظيم، صلاة)</option>
                    <option value="behavioral">سلوكي (آداب، بر، صدق)</option>
                    <option value="skills">مهاري (حياتي، تواصل، إلقاء)</option>
                    <option value="quranic">قرآني (حفظ، هجاء، ترتيل)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Days & Dates */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الخميس (أو البداية)</label>
                  <input
                    type="text"
                    value={formWeek.dayDates?.thursday || formWeek.startDate || ''}
                    onChange={(e) =>
                      setFormWeek({
                        ...formWeek,
                        startDate: e.target.value,
                        dayDates: { ...formWeek.dayDates, thursday: e.target.value },
                      })
                    }
                    placeholder="مثال: 5/28"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الجمعة</label>
                  <input
                    type="text"
                    value={formWeek.dayDates?.friday || ''}
                    onChange={(e) =>
                      setFormWeek({
                        ...formWeek,
                        dayDates: { ...formWeek.dayDates, friday: e.target.value },
                      })
                    }
                    placeholder="مثال: 5/29"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ السبت (أو النهاية)</label>
                  <input
                    type="text"
                    value={formWeek.dayDates?.saturday || formWeek.endDate || ''}
                    onChange={(e) =>
                      setFormWeek({
                        ...formWeek,
                        endDate: e.target.value,
                        dayDates: { ...formWeek.dayDates, saturday: e.target.value },
                      })
                    }
                    placeholder="مثال: 5/30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Row 3: Value & Motto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">القيمة التربوية</label>
                  <input
                    type="text"
                    value={formWeek.valueTitle || ''}
                    onChange={(e) => setFormWeek({ ...formWeek, valueTitle: e.target.value })}
                    placeholder="مثال: القرآن كلام الله، بر الوالدين، إتقان الصلاة..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">شعار الأسبوع</label>
                  <input
                    type="text"
                    value={formWeek.motto || ''}
                    onChange={(e) => setFormWeek({ ...formWeek, motto: e.target.value })}
                    placeholder="مثال: «كلام ربي»، «قرآني نوري»..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-black text-emerald-950"
                  />
                </div>
              </div>

              {/* Row 4: Goal & Topic Details */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-emerald-950 mb-1">
                    مواضيع الهدف المعتمد / الشرح التربوي
                  </label>
                  <textarea
                    rows={2}
                    value={formWeek.educationalGoal || ''}
                    onChange={(e) => setFormWeek({ ...formWeek, educationalGoal: e.target.value })}
                    placeholder="مثال: قصة الوحي وفضل القرآن الكريم، مقارنة بين الوحيين، تجليد المصحف..."
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">مقدم الموضوع (من المعلمين)</label>
                    <input
                      type="text"
                      list="teachers-list"
                      value={formWeek.goalPresenter || ''}
                      onChange={(e) => setFormWeek({ ...formWeek, goalPresenter: e.target.value })}
                      placeholder="اختر أو اكتب اسم المعلم..."
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">مكان تقديم الموضوع</label>
                    <input
                      type="text"
                      value={formWeek.goalLocation || ''}
                      onChange={(e) => setFormWeek({ ...formWeek, goalLocation: e.target.value })}
                      placeholder="مثال: القاعة الرئيسية، المصلى، قاعة 1..."
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Activity & Presenter */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    الفقرة الثقافية والتفاعلية (النشاط)
                  </label>
                  <input
                    type="text"
                    value={formWeek.activity || ''}
                    onChange={(e) => setFormWeek({ ...formWeek, activity: e.target.value })}
                    placeholder="مثال: كراديس، مانيوليز، إكس أو، الجرس الثقافي، بدون كلام..."
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold text-amber-950"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">مقدم الفقرة</label>
                    <input
                      type="text"
                      list="teachers-list"
                      value={formWeek.activityPresenter || ''}
                      onChange={(e) => setFormWeek({ ...formWeek, activityPresenter: e.target.value })}
                      placeholder="اسم مقدم الفقرة..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">مكان النشاط</label>
                    <input
                      type="text"
                      value={formWeek.activityLocation || ''}
                      onChange={(e) => setFormWeek({ ...formWeek, activityLocation: e.target.value })}
                      placeholder="مثال: قاعتنا، الساحة، الصالة..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-950 mb-1">المشرف المسؤول للأسبوع</label>
                    <input
                      type="text"
                      list="teachers-list"
                      value={formWeek.responsiblePerson || ''}
                      onChange={(e) => setFormWeek({ ...formWeek, responsiblePerson: e.target.value })}
                      placeholder="المشرف المسؤول..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Quranic Program & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">البرنامج القرآني المصاحب</label>
                  <input
                    type="text"
                    value={formWeek.quranicProgram || ''}
                    onChange={(e) => setFormWeek({ ...formWeek, quranicProgram: e.target.value })}
                    placeholder="مثال: مسابقة نحو المعالي، استيكرات..."
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">الميزانية المقترحة للأسبوع (ر.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={formWeek.budget || 0}
                    onChange={(e) => setFormWeek({ ...formWeek, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white font-black text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">حالة الأسبوع</label>
                  <select
                    value={formWeek.status || 'scheduled'}
                    onChange={(e) => setFormWeek({ ...formWeek, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white font-bold"
                  >
                    <option value="scheduled">مجدول 📅</option>
                    <option value="in_progress">جارٍ التنفيذ ⏳</option>
                    <option value="completed">مكتمل ومنفذ ✓</option>
                  </select>
                </div>
              </div>

              {/* Data list for teachers autocomplete */}
              <datalist id="teachers-list">
                {teachers.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs cursor-pointer"
                >
                  {isEditing ? 'حفظ تعديلات الأسبوع' : 'إضافة الأسبوع للخطة'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BULK SEMESTER GENERATOR */}
          {activeTab === 'bulk_generate' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-amber-950 text-sm">توليد جدول أسابيع الفصل الدراسي دفعة واحدة</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    يقوم هذا المعالج بإنشاء مصفوفة كاملة لجميع أسابيع الفصل الدراسي ({generateCount} أسبوعاً)، مع توزيع المعلمين بالمرحلة كمسؤولين ومقدمين، وجدولة الإجازات المطولة والأسبوع الميت والاختبارات تلقائياً.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    عدد أسابيع الفصل الدراسي المطلوب توليدها
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value) || 14)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-black text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    عدد الأسابيع المسجل في إعدادات التقويم: {totalSemesterWeeks || 14} أسبوعاً
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">طريقة الحفظ</label>
                  <select
                    value={bulkMode}
                    onChange={(e) => setBulkMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="replace">استبدال خطة المرحلة الحالية بالأسابيع الجديدة بالكامل</option>
                    <option value="append">إضافة الأسابيع كملحق فوق الخطة الحالية</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h5 className="font-bold text-slate-800 mb-2">البيانات الثابتة المستخدمة في التوليد من النظام:</h5>
                <ul className="space-y-1.5 text-slate-600 text-[11px] list-disc list-inside">
                  <li>
                    <strong className="text-slate-800">مخرج المرحلة المستهدف:</strong> {selectedStage?.outcomeSummary || 'مخرج المرحلة المعتمد'}
                  </li>
                  <li>
                    <strong className="text-slate-800">المعلمون المشرفون:</strong> {teachers.map((t) => t.name).join('، ') || 'المعلمون المسجلون بالمرحلة'}
                  </li>
                  <li>
                    <strong className="text-slate-800">البرنامج القرآني:</strong> مسابقة نحو المعالي واستيكرات التميز
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleBulkGenerate}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>توليد واعتماد {generateCount} أسبوعاً الآن</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EXCEL IMPORT & EXPORT */}
          {activeTab === 'excel' && (
            <div className="space-y-5">
              {/* Download Template Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>تحميل نموذج إكسيل مخصص للمرحلة (Excel Template)</span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    قم بتنزيل النموذج وتعبئته بالأسابيع والمحتوى والميزانيات ثم إعادة رفعه مباشرة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadEducationalPlanTemplate(selectedStage?.name || 'المرحلة')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل نموذج إكسيل فارغ</span>
                  </button>
                  {currentPlanWeeks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => exportEducationalPlanToExcel(currentPlanWeeks, selectedStage?.name)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>تصدير الخطة الحالية</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 text-center space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    اختر ملف إكسيل (.xlsx) من جهازك
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2">أو اسحب وأفلت ملف الإكسيل هنا</p>
                </div>
                {excelFileName && (
                  <p className="text-xs font-bold text-emerald-800 bg-emerald-100/80 py-1.5 px-3 rounded-lg inline-block">
                    تم اختيار الملف: {excelFileName}
                  </p>
                )}
              </div>

              {/* Preview Table if file parsed */}
              {excelPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      معاينة البيانات المقروءة ({excelPreview.length} أسبوعاً جاهزاً للاستيراد):
                    </span>
                    <select
                      value={bulkMode}
                      onChange={(e) => setBulkMode(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-xs"
                    >
                      <option value="replace">استبدال خطة المرحلة الحالية</option>
                      <option value="append">إلحاق بالخطة الحالية</option>
                    </select>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 w-16 text-center">الأسبوع</th>
                          <th className="p-2">الشعار</th>
                          <th className="p-2">الهدف التربوي</th>
                          <th className="p-2">النشاط التفاعلي</th>
                          <th className="p-2">الميزانية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {excelPreview.map((w, i) => (
                          <tr key={i}>
                            <td className="p-2 text-center font-bold">{w.weekNumber}</td>
                            <td className="p-2 font-bold text-slate-900">{w.motto}</td>
                            <td className="p-2 text-slate-600 truncate max-w-xs">{w.educationalGoal}</td>
                            <td className="p-2 text-slate-600 truncate max-w-xs">{w.activity}</td>
                            <td className="p-2 font-bold text-emerald-800">{w.budget} ر.س</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleApplyExcel}
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>اعتماد وحفظ خطة الإكسيل ({excelPreview.length} أسبوعاً)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: JSON IMPORT & EDITOR */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">محرر ولصق كود JSON</h4>
                  <p className="text-xs text-slate-500">
                    يمكنك نسخ أو لصق مصفوفة JSON المولدة من الذكاء الاصطناعي هنا وحفظها مباشرة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkMode}
                    onChange={(e) => setBulkMode(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-xs"
                  >
                    <option value="replace">استبدال خطة المرحلة</option>
                    <option value="append">إلحاق بالخطة</option>
                  </select>
                </div>
              </div>

              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <textarea
                rows={12}
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                placeholder="[ { &quot;weekNumber&quot;: 1, &quot;motto&quot;: &quot;«قرآني نوري»&quot;, ... } ]"
                className="w-full p-3 font-mono text-xs rounded-2xl border border-slate-300 bg-slate-950 text-emerald-400 focus:ring-2 focus:ring-emerald-500 leading-relaxed dir-ltr text-left"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl font-black shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Code className="w-4 h-4" />
                  <span>تطبيق واستيراد كود JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: AI PROMPT GENERATOR */}
          {activeTab === 'ai_prompt' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Bot className="w-6 h-6 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-purple-950 text-sm">
                      مُولِّد برومبت الذكاء الاصطناعي (ChatGPT / Claude / Gemini)
                    </h4>
                    <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                      هذا البرومبت مُصمَّم بدقة ومُضمَّن فيه تلقائياً مخرج مرحلة <strong>{selectedStage?.name || 'البراعم'}</strong>، والسمات المستهدفة، وأسماء المعلمين المسجلين بالنظام، ليقوم الذكاء الاصطناعي بتوليد خطة مناسبة بملف JSON يمكنك نسخه ولصقه في التبويب المجاور.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-700 hover:bg-purple-800 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم النسخ بنجاح ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ البرومبت بالكامل</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  معاينة نص البرومبت الجاهز للنسخ:
                </label>
                <div className="p-4 rounded-2xl border border-slate-300 bg-slate-50 text-slate-800 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {aiPromptText}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center justify-between">
                <span>بعد توليد الرد من الذكاء الاصطناعي، انتقل لتبويب «محرر JSON» والصق الرد هناك.</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className="text-purple-700 font-bold hover:underline cursor-pointer"
                >
                  الانتقال لتبويب JSON ←
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
