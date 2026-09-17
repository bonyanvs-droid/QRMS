import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  BookOpen,
  Building2,
  ShieldCheck,
  Shield,
  Layers,
  ArrowRight,
  Database,
  Search,
  Eye,
  Check,
  X,
  FileDown,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  parseBulkImportFile,
  parseBulkImportJson,
  generateBulkImportTemplatesWorkbook,
  BulkImportDataset,
  cleanPhoneNumber,
} from '../../utils/bulkImportParser';
import {
  executeBulkImport,
  BulkImportProgress,
  BulkImportResult,
} from '../../lib/bulkImportService';
import { MosqueComplexTenant } from '../../types';
import * as XLSX from 'xlsx';

export const BulkImportCenterView: React.FC = () => {
  const {
    tenants,
    stages,
    tracks,
    activeTenant,
    activeTenantId,
    setActiveTenantId,
    currentUser,
  } = useApp();

  const isSysAdmin = currentUser?.role === 'system_admin';

  // For campus admin / supervisor / tenant manager, force their own tenant
  const userTenantId = currentUser?.tenantId || activeTenantId || tenants[0]?.id || '';

  // Target tenant selection (for SysAdmin) or lock to active/user tenant
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    isSysAdmin ? (activeTenantId || tenants[0]?.id || '') : userTenantId
  );

  // Sync if tenant or user changes
  useEffect(() => {
    if (!isSysAdmin && userTenantId) {
      setSelectedTenantId(userTenantId);
    }
  }, [isSysAdmin, userTenantId]);

  const targetTenant = (isSysAdmin ? tenants.find((t) => t.id === selectedTenantId) : (tenants.find((t) => t.id === userTenantId) || activeTenant)) || activeTenant || tenants[0];

  // Workflow steps: 1: Upload & Inspect, 2: Review & Edit, 3: Execution Progress, 4: Summary & Export Cards
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Uploaded dataset
  const [dataset, setDataset] = useState<BulkImportDataset | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Active sub-tab in Review Step (2)
  const [reviewTab, setReviewTab] = useState<'students' | 'halaqahs' | 'staff' | 'parents'>('students');
  const [reviewSearch, setReviewSearch] = useState('');

  // Execution & Progress (Step 3 & 4)
  const [importProgress, setImportProgress] = useState<BulkImportProgress | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('Admin@123456');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLTextAreaElement>(null);
  const [jsonPasteMode, setJsonPasteMode] = useState(false);
  const [jsonText, setJsonText] = useState('');

  // Download official Excel templates
  const handleDownloadTemplate = () => {
    const buffer = generateBulkImportTemplatesWorkbook();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قالب_استيراد_بيانات_المجمع_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle file selection (Excel / CSV)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    try {
      const parsed = await parseBulkImportFile(file, stages, tracks);
      setDataset(parsed);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error parsing bulk import file:', err);
      setParseError(err.message || 'تعذر قراءة أو استخراج البيانات من الملف. يرجى التأكد من صيغة Excel الصحيحة.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle JSON Paste
  const handleParseJson = () => {
    if (!jsonText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const parsed = parseBulkImportJson(jsonText, stages, tracks);
      setDataset(parsed);
      setFileName('بيانات هيكلية مُلصقة (JSON)');
      setFileSize((jsonText.length / 1024).toFixed(1) + ' KB');
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error parsing JSON:', err);
      setParseError(err.message || 'نص JSON غير صالح. يرجى مراجعة الصياغة والتراكيب.');
    } finally {
      setIsParsing(false);
    }
  };

  // Trigger Execution
  const handleStartImport = async () => {
    if (!dataset || !targetTenant) return;
    setCurrentStep(3);

    const actor = {
      id: currentUser?.id || 'admin',
      name: currentUser?.name || currentUser?.fullName || 'مدير النظام',
      role: currentUser?.role || 'campus_admin',
    };

    const res = await executeBulkImport(
      targetTenant,
      dataset,
      actor,
      (progress) => {
        setImportProgress({ ...progress });
      },
      defaultPassword
    );

    setImportResult(res);
    setCurrentStep(4);
  };

  // Export generated credentials to Excel
  const handleExportCredentialsExcel = () => {
    if (!importResult || importResult.credentials.length === 0) return;

    const wb = XLSX.utils.book_new();
    const rows = importResult.credentials.map((c, i) => ({
      '#': i + 1,
      'الاسم الكامل': c.name,
      'الدور والصلاحية': c.role,
      'رقم الجوال (اسم المستخدم)': c.phone,
      'كلمة المرور المؤقتة': c.plainPassword,
      'الحلقة / البيانات الإضافية': c.halaqahOrDetails || '',
      'رابط المنصة': window.location.origin,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'بطاقات الدخول والحسابات');

    XLSX.writeFile(wb, `بطاقات_دخول_مجمع_${targetTenant?.name || 'القرآني'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مركز الاستيراد والترحيل الشامل للمجمعات (Bulk Onboarding Engine)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
              رفع وتأسيس بيانات المجمع دفعة واحدة 🚀
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              استيراد كامل بيانات الحلقات، المعلمين، المشرفين، أولياء الأمور، والطلاب من ملف Excel أو JSON واحد مع إنشاء الحسابات وتوزيع الصلاحيات تلقائياً.
            </p>
          </div>

          {/* Target Tenant Selector */}
          <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-inner shrink-0 min-w-[280px]">
            <label className="block text-xs font-bold text-emerald-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>المجمع المستهدف بالاستيراد:</span>
              </span>
              {isSysAdmin ? (
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md font-normal">
                  صلاحية مدير المنصة
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-normal">
                  مجمعك المعتمد
                </span>
              )}
            </label>

            {isSysAdmin ? (
              <select
                value={selectedTenantId}
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setActiveTenantId(e.target.value);
                }}
                disabled={currentStep === 3}
                className="w-full bg-slate-950 border border-emerald-600/60 text-white rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.name} ({t.city || 'الرئيسي'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-slate-950/80 border border-emerald-500/40 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-amber-300">{targetTenant?.name || 'المجمع المعتمد'}</div>
                  <div className="text-[11px] text-slate-400">{targetTenant?.city || 'المقر الرئيسي'} - {targetTenant?.region || 'المنطقة'}</div>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-2 py-1 rounded-lg font-bold">
                  ثابت
                </span>
              </div>
            )}

            <div className="text-[11px] text-emerald-300/80 mt-2 flex items-center justify-between">
              <span>كود المجمع: <code className="text-amber-300 font-mono">{targetTenant?.id}</code></span>
              <span className="text-emerald-400 font-bold">جاهز للاستقبال</span>
            </div>
          </div>
        </div>

        {/* Stepper Wizard Indicator */}
        <div className="mt-8 pt-6 border-t border-emerald-700/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { step: 1, title: '1. رفع الملف', desc: 'Excel / CSV أو JSON' },
            { step: 2, title: '2. المعاينة والتدقيق', desc: 'مراجعة وتعديل الكيانات' },
            { step: 3, title: '3. التنفيذ والحفظ', desc: 'كتابة دفعات في الداتابيز' },
            { step: 4, title: '4. اكتمال الترحيل', desc: 'تصدير بطاقات الدخول' },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-3 rounded-2xl border transition-all ${
                currentStep === s.step
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md'
                  : currentStep > s.step
                  ? 'bg-emerald-800/60 text-white border-emerald-600/60'
                  : 'bg-slate-900/40 text-emerald-300/60 border-emerald-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">{s.title}</span>
                {currentStep > s.step && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
              </div>
              <p className={`text-[10px] mt-0.5 ${currentStep === s.step ? 'text-slate-800' : 'text-emerald-200/60'}`}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: UPLOAD & INGESTION */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Box */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-right space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-700">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">رفع ملف بيانات المجمع</h2>
                    <p className="text-xs text-slate-500">يدعم ملفات Microsoft Excel (.xlsx, .xls), CSV, أو نص JSON</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJsonPasteMode(!jsonPasteMode)}
                    className="text-xs text-slate-600 hover:text-emerald-700 font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {jsonPasteMode ? 'العودة لرفع ملف' : 'لصق نص JSON'}
                  </button>
                </div>
              </div>

              {parseError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-1">خطأ في معالجة الملف:</strong>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}

              {!jsonPasteMode ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                      {isParsing ? (
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        اضغط هنا لاختيار ملف الإكسيل أو اسحبه وأفلته هنا
                      </h3>
                      <p className="text-xs text-slate-500">
                        يدعم الملفات التي تحتوي على جداول (الطلاب، الحلقات، المعلمين، أولياء الأمور)
                      </p>
                    </div>
                    <span className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-colors mt-2">
                      تصفح الملفات من جهازك
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">الصق نص JSON هنا:</label>
                  <textarea
                    ref={jsonInputRef}
                    rows={8}
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder='{"halaqahs": [...], "teachers": [...], "students": [...]}'
                    className="w-full p-3 bg-slate-50 rounded-2xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleParseJson}
                    disabled={!jsonText.trim() || isParsing}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>تحليل ومعالجة نص JSON</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Templates & Guidelines Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-right space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <Download className="w-4 h-4 text-emerald-700" />
                <span>قوالب إكسيل الرسمية الجاهزة</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                حمّل القالب المعتمد المعبأ بأمثلة توضيحية لتجهيز بيانات مجمعك بالشكل المثالي والمتوافق مع النظام بنسبة 100%.
              </p>

              <button
                onClick={handleDownloadTemplate}
                className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <FileDown className="w-4 h-4" />
                <span>تحميل قالب الإكسيل المعتمد (.XLSX)</span>
              </button>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-sm text-right space-y-3">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>ميزات الاستيراد الذكي:</span>
              </h4>
              <ul className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>دمج وتوحيد أولياء الأمور تلقائياً في حال وجود أكثر من ابن بنفس رقم الهاتف.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>توليد حسابات الدخول تلقائياً للمعلمين وأولياء الأمور والطلاب وتشفيرها في قاعدة البيانات.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>ربط الطلاب تلقائياً بمراحلهم (البراعم، الأشبال، الفتيان، الشباب).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW, AUDIT & VALIDATION */}
      {currentStep === 2 && dataset && (
        <div className="space-y-6">
          {/* Summary KPIs Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    تم الاكتشاف والتحليل بنجاح
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {fileName} ({fileSize})
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  معاينة وتدقيق البيانات المستخرجة
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setDataset(null);
                    setCurrentStep(1);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  إلغاء واختيار ملف آخر
                </button>
                <button
                  onClick={handleStartImport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>تأكيد وبدء الترحيل إلى الداتابيز</span>
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                <BookOpen className="w-5 h-5 text-blue-700 mx-auto mb-1" />
                <div className="text-2xl font-black text-blue-950 font-serif">{dataset.summary.totalHalaqahs}</div>
                <div className="text-xs font-bold text-blue-800">حلقة قرآنية</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <Users className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
                <div className="text-2xl font-black text-emerald-950 font-serif">{dataset.summary.totalTeachers}</div>
                <div className="text-xs font-bold text-emerald-800">معلم ومدرس</div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                <ShieldCheck className="w-5 h-5 text-purple-700 mx-auto mb-1" />
                <div className="text-2xl font-black text-purple-950 font-serif">{dataset.summary.totalSupervisors}</div>
                <div className="text-xs font-bold text-purple-800">مشرف تربوي</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <Building2 className="w-5 h-5 text-amber-700 mx-auto mb-1" />
                <div className="text-2xl font-black text-amber-950 font-serif">{dataset.summary.totalParents}</div>
                <div className="text-xs font-bold text-amber-800">ولي أمر (فريد)</div>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
                <Sparkles className="w-5 h-5 text-teal-700 mx-auto mb-1" />
                <div className="text-2xl font-black text-teal-950 font-serif">{dataset.summary.totalStudents}</div>
                <div className="text-xs font-bold text-teal-800">طالب مكتشف</div>
              </div>
            </div>
          </div>

          {/* Tabbed Data Tables */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Tabs Switcher */}
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: 'students', label: `الطلاب (${dataset.students.length})`, icon: Users },
                  { id: 'halaqahs', label: `الحلقات (${dataset.halaqahs.length})`, icon: BookOpen },
                  { id: 'staff', label: `الكادر والمعلمون (${dataset.staff.length})`, icon: ShieldCheck },
                  { id: 'parents', label: `أولياء الأمور (${dataset.parents.length})`, icon: Building2 },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = reviewTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setReviewTab(t.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث سريع في البيانات..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Students Table */}
            {reviewTab === 'students' && (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم الطالب</th>
                      <th className="p-3">باقة الاشتراك</th>
                      <th className="p-3">الحلقة المخصصة</th>
                      <th className="p-3">المرحلة / الصف</th>
                      <th className="p-3">ولي الأمر</th>
                      <th className="p-3">رقم جوال ولي الأمر</th>
                      <th className="p-3">السورة / الهجاء</th>
                      <th className="p-3">حالة التدقيق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataset.students
                      .filter(
                        (s) =>
                          !reviewSearch ||
                          s.name.includes(reviewSearch) ||
                          (s.halaqahName && s.halaqahName.includes(reviewSearch)) ||
                          s.parentPhone.includes(reviewSearch)
                      )
                      .map((st, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{st.name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                st.registrationType === 'activities_only'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : st.registrationType === 'quran_only'
                                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                  : st.registrationType === 'scholarship'
                                  ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {st.registrationTypeLabel || 'باقة الاشتراك الكامل'}
                            </span>
                          </td>
                          <td className="p-3">
                            {st.registrationType === 'activities_only' ? (
                              <span className="text-slate-400 italic text-[11px]">بدون حلقة (أنشطة)</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-medium">
                                {st.halaqahName || 'حلقة عامة'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            {st.stageName || st.stageId} - {st.grade}
                          </td>
                          <td className="p-3 text-slate-800">{st.parentName || 'ولي أمر'}</td>
                          <td className="p-3 font-mono text-slate-700">{st.parentPhone || '—'}</td>
                          <td className="p-3 text-slate-600">
                            سورة {st.currentSurah || 'الفاتحة'} (مستوى {st.initialSpellingLevel || 1})
                          </td>
                          <td className="p-3">
                            {st.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                <Check className="w-3 h-3" /> مطابق
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-bold" title={st.validationErrors.join(', ')}>
                                <AlertTriangle className="w-3 h-3" /> {st.validationErrors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Halaqahs Table */}
            {reviewTab === 'halaqahs' && (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم الحلقة</th>
                      <th className="p-3">المرحلة الدراسية</th>
                      <th className="p-3">الصف</th>
                      <th className="p-3">المعلم المشرف</th>
                      <th className="p-3">جوال المعلم</th>
                      <th className="p-3">السورة المستهدفة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataset.halaqahs.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{h.name}</td>
                        <td className="p-3 text-emerald-800 font-bold">{h.stageName || h.stageId}</td>
                        <td className="p-3 text-slate-600">{h.grade}</td>
                        <td className="p-3 text-slate-900 font-medium">{h.teacherName || 'غير مسند'}</td>
                        <td className="p-3 font-mono text-slate-700">{h.teacherPhone || '—'}</td>
                        <td className="p-3 text-blue-800 font-bold">سورة {h.targetSurah}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Staff Table */}
            {reviewTab === 'staff' && (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الاسم الكامل</th>
                      <th className="p-3">الدور الوظيفي</th>
                      <th className="p-3">رقم الجوال (اسم المستخدم)</th>
                      <th className="p-3">رقم الهوية</th>
                      <th className="p-3">الحلقات المسندة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataset.staff.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              s.role === 'supervisor'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.role === 'supervisor' ? 'مشرف تربوي' : 'معلم قرآن'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-800 font-bold">{s.phone}</td>
                        <td className="p-3 font-mono text-slate-500">{s.nationalId || '—'}</td>
                        <td className="p-3 text-slate-600">{s.assignedHalaqahs?.join(', ') || 'كافة الحلقات'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Parents Table */}
            {reviewTab === 'parents' && (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم ولي الأمر</th>
                      <th className="p-3">رقم الجوال</th>
                      <th className="p-3">عدد الأبناء المرتبطين</th>
                      <th className="p-3">أسماء الطلاب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataset.parents.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3 font-mono text-slate-800 font-bold">{p.phone}</td>
                        <td className="p-3 font-bold text-amber-700">{p.studentNames.length} طلاب</td>
                        <td className="p-3 text-slate-600">{p.studentNames.join('، ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="p-5 rounded-2xl bg-emerald-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-white">كلمة المرور الافتراضية للحسابات المنشأة:</h4>
              <p className="text-xs text-emerald-200/80">
                يمكن للمستخدمين تغييرها لاحقاً من لوحة تحكمهم الخاصة.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                className="bg-slate-950 border border-emerald-600 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold w-40 text-center"
              />
              <button
                onClick={handleStartImport}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Database className="w-4 h-4" />
                <span>حفظ في قاعدة البيانات الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LIVE EXECUTION PROGRESS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-2xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border-4 border-emerald-100 animate-pulse">
            <RefreshCw className="w-10 h-10 animate-spin text-emerald-600" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900">
              جاري تنفيذ الترحيل السحابي الفوري
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              {importProgress?.message || 'جاري معالجة وحفظ البيانات...'}
            </h3>
            <p className="text-xs text-slate-500">
              المجمع: <strong className="text-slate-800">{targetTenant?.name}</strong>
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${importProgress?.percent || 15}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
            <span>الخطوة {importProgress?.currentStep || 1} من {importProgress?.totalSteps || 6}</span>
            <span>{importProgress?.percent || 15}%</span>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-3 gap-3 text-xs pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="font-bold text-slate-500">الحلقات المكتملة</div>
              <div className="text-lg font-black text-slate-900">{importProgress?.stats.halaqahsCreated || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="font-bold text-slate-500">المعلمون والمشرفون</div>
              <div className="text-lg font-black text-slate-900">
                {(importProgress?.stats.teachersCreated || 0) + (importProgress?.stats.supervisorsCreated || 0)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="font-bold text-slate-500">الطلاب المسكنون</div>
              <div className="text-lg font-black text-slate-900">{importProgress?.stats.studentsCreated || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: COMPLETION, SUMMARY & CARDS EXPORT */}
      {currentStep === 4 && importResult && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-8 border border-emerald-500/40 shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-serif">
                اكتمل استيراد مجمع ({importResult.tenantName}) بنجاح تام! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
                تم حفظ كافة الحلقات، المعلمين، المشرفين، أولياء الأمور، والطلاب في قاعدة البيانات وتفعيل حسابات الدخول الرسمية لهم فورياً.
              </p>
            </div>

            {/* Final Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="text-3xl font-black text-amber-300 font-serif">{importResult.stats.halaqahsCreated}</div>
                <div className="text-xs font-bold text-emerald-200">حلقة منشأة</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="text-3xl font-black text-amber-300 font-serif">
                  {importResult.stats.teachersCreated + importResult.stats.supervisorsCreated}
                </div>
                <div className="text-xs font-bold text-emerald-200">كادر تعليمي وإشرافي</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="text-3xl font-black text-amber-300 font-serif">{importResult.stats.parentsCreated}</div>
                <div className="text-xs font-bold text-emerald-200">ولي أمر مسجل</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <div className="text-3xl font-black text-amber-300 font-serif">{importResult.stats.studentsCreated}</div>
                <div className="text-xs font-bold text-emerald-200">طالب في الحلقات</div>
              </div>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-emerald-800/60">
              <button
                onClick={handleExportCredentialsExcel}
                className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير كروت وكلمات مرور الدخول للجميع (Excel)</span>
              </button>

              <button
                onClick={() => {
                  setDataset(null);
                  setImportResult(null);
                  setCurrentStep(1);
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>استيراد ملف مجمع آخر 📥</span>
              </button>
            </div>
          </div>

          {/* Credentials Preview Table */}
          {importResult.credentials.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    سجل بطاقات الدخول المنشأة للمستخدمين ({importResult.credentials.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    يمكنك مشاركة بيانات الدخول مع المعلمين وأولياء الأمور للبدء فوراً في استخدام المنصة.
                  </p>
                </div>
                <button
                  onClick={handleExportCredentialsExcel}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير كملف</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الاسم الكامل</th>
                      <th className="p-3">الدور / الصفة</th>
                      <th className="p-3">اسم المستخدم (رقم الجوال)</th>
                      <th className="p-3">كلمة المرور المؤقتة</th>
                      <th className="p-3">التفاصيل والحلقات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {importResult.credentials.slice(0, 100).map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-400 font-sans">{i + 1}</td>
                        <td className="p-3 font-bold text-slate-900 font-sans">{c.name}</td>
                        <td className="p-3 font-sans">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                            {c.role}
                          </span>
                        </td>
                        <td className="p-3 text-emerald-700 font-bold">{c.phone}</td>
                        <td className="p-3 text-slate-800 bg-amber-50/50">{c.plainPassword}</td>
                        <td className="p-3 text-slate-600 font-sans">{c.halaqahOrDetails}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
