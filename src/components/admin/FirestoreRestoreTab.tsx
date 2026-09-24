import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
  FileCode,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  HelpCircle,
  Download,
  Copy,
  Search,
  Users,
  Building,
  Key,
  Database,
  ArrowRight,
} from 'lucide-react';
import {
  RestoreDryRunReport,
  executeRestoreDryRun,
} from '../../lib/restoreDryRunEngine';
import { useApp } from '../../context/AppContext';

export const FirestoreRestoreTab: React.FC = () => {
  const { currentUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [report, setReport] = useState<RestoreDryRunReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFindingsTab, setActiveFindingsTab] = useState<string>('findings_d');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Authorization Check
  const isAuthorized =
    currentUser?.role === 'system_admin' ||
    currentUser?.role === 'campus_admin' ||
    (currentUser?.role as any) === 'admin';

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-3">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-base">غير مصرح بالوصول</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          أداة فحص ومحاكاة استعادة النسخ الاحتياطية مخصصة للإدارة المركزية فقط.
        </p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setReport(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMsg('نوع الملف غير مدعوم. يرجى رفع ملف بصيغة JSON فقط.');
      setSelectedFile(null);
      setFileContent(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 50 ميجابايت.');
      setSelectedFile(null);
      setFileContent(null);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      setErrorMsg('فشل قراءة الملف من الجهاز المحلي.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setReport(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMsg('نوع الملف غير مدعوم. يرجى رفع ملف بصيغة JSON فقط.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 50 ميجابايت.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleRunValidation = async () => {
    if (!fileContent || !selectedFile) {
      setErrorMsg('يرجى اختيار ملف نسخة احتياطية أولاً.');
      return;
    }

    setIsValidating(true);
    setErrorMsg(null);
    setReport(null);

    try {
      // First attempt via Backend API: POST /api/admin/backup/restore/validate
      const res = await fetch('/api/admin/backup/restore/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'admin@qrms.system',
          'x-user-role': currentUser?.role || 'system_admin',
        },
        body: JSON.stringify({
          backupData: fileContent,
          fileName: selectedFile.name,
          fileSizeBytes: selectedFile.size,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.report) {
          setReport(json.report);
          setIsValidating(false);
          return;
        }
      }

      // Fallback: Client-side local engine execution (guarantees seamless execution in preview)
      const localReport = executeRestoreDryRun(
        fileContent,
        selectedFile.name,
        selectedFile.size,
        { email: currentUser?.email, role: currentUser?.role }
      );
      setReport(localReport);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء فحص ومحاكاة النسخة الاحتياطية.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopyReportJson = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const handleDownloadReportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QRMS-DryRun-Report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredAuditRows = (report?.mappingAudit || []).filter((row) => {
    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchCol = row.firestoreCollection.toLowerCase().includes(q);
      const matchTable = row.postgresTable.toLowerCase().includes(q);
      if (!matchCol && !matchTable) return false;
    }

    // Status filter
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'READY') return row.status === 'READY';
    if (statusFilter === 'WARNING') return row.status === 'WARNING';
    if (statusFilter === 'ERROR') return row.status === 'ERROR';
    if (statusFilter === 'EMPTY') return row.status === 'EMPTY';
    if (statusFilter === 'SPECIAL_REVIEW') return row.status === 'SPECIAL_REVIEW';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                <UploadCloud className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black tracking-tight">
                استعادة ومحاكاة النسخ الاحتياطية v2 (Restore & Dry-Run Validation)
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              محرك التحليل المعماري والمحاكاة المتقدمة: تدقيق مطابقة المخطط (Schema Mapping Audit v2)، واستنتاج الـ Tenant Context، وتحليل منشأ الكود القديم، وفحص العلاقات دون أي تعديل على قاعدة البيانات.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>0 DATABASE WRITES (Dry-Run Only)</span>
            </span>
          </div>
        </div>

        {/* Features Tags */}
        <div className="mt-5 pt-4 border-t border-slate-700/50 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-600 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>حفظ كامل للمعرفات الأصلية (Firestore Doc ID === PostgreSQL PK)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-600 rounded-lg">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            <span>استنتاج سياق مجمع الغزاوي كـ Tenant نشط وحيد</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-600 rounded-lg">
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>فحص علاقات المفاتيح الأجنبية متعدد المستويات (Resolvable / Deferred)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-600 rounded-lg">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>تحليل دمج المعلمين والمجموعات الأرشيفية الـ 5</span>
          </span>
        </div>
      </div>

      {/* Upload Zone Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-600" />
          <span>اختيار أو سحب ملف النسخة الاحتياطية (JSON File Upload)</span>
        </h3>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            selectedFile
              ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70'
              : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <UploadCloud className="w-6 h-6" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 font-mono">
                  الحجم: {(selectedFile.size / 1024).toFixed(1)} KB — جاهز للفحص والتحليل المعماري
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  انقر هنا لاختيار ملف النسخة الاحتياطية أو اسحب الملف وأفلته
                </p>
                <p className="text-[11px] text-slate-500">
                  يجب أن يكون الملف بصيغة JSON القياسية المستخرجة من QRMS Exporter
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-[11px] text-slate-500">
            * يتم تشغيل المحاكاة المعمارية فقط (Zero DB Mutations) دون المساس ببيانات الإنتاج.
          </span>

          <button
            type="button"
            disabled={!selectedFile || isValidating}
            onClick={handleRunValidation}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
              selectedFile && !isValidating
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التحليل المعماري والمحاكاة...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>بدء الفحص والمحاكاة (Run Dry-Run v2)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-xs text-rose-800 space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>تعذر إتمام عملية الفحص والمحاكاة</span>
          </div>
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Report View */}
      {report && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Header Summary & Export Tools */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl flex items-center justify-center ${
                    report.overallDryRunStatus === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : report.overallDryRunStatus === 'WARNINGS_DETECTED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {report.overallDryRunStatus === 'SUCCESS' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : report.overallDryRunStatus === 'WARNINGS_DETECTED' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    تقرير الفحص والمحاكاة المعمارية v2 (Dry-Run Preview Report)
                  </h3>
                  <p className="text-xs text-slate-500">
                    الحالة العامة: <span className="font-bold font-mono text-indigo-700">{report.overallDryRunStatus}</span> — تاريخ الفحص: {new Date(report.auditTimestamp).toLocaleString('ar-SA')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyReportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedNotification ? 'تم النسخ!' : 'نسخ التقرير JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل التقرير</span>
                </button>
              </div>
            </div>

            {/* Strict Mathematical Metrics Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">إجمالي المجموعات</span>
                <span className="text-slate-900 font-bold font-mono text-lg">{report.totalCollections}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">إجمالي المستندات بالنسخة</span>
                <span className="text-indigo-700 font-bold font-mono text-lg">{report.totalDocuments}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">صالحة ومطابقة للاستيراد</span>
                <span className="text-emerald-700 font-bold font-mono text-lg">{report.importableDocumentsCount}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">مراجعة معمارية / خاصة</span>
                <span className="text-purple-700 font-bold font-mono text-lg">{report.specialReviewDocumentsCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">علاقات مفاتيح أجنبية مباشرة:</span>
                <span className="text-emerald-700 font-bold font-mono text-sm">{report.totalResolvableFkCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">علاقات مؤجلة (Deferred FKs):</span>
                <span className="text-indigo-700 font-bold font-mono text-sm">{report.totalDeferredFkCount}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">مستندات استنتجت لـ الغزاوي:</span>
                <span className="text-indigo-700 font-bold font-mono text-sm">{report.totalDefaultedToGhazzawiDocs}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">أخطاء حقيقية غير صالحة:</span>
                <span className={`font-bold font-mono text-sm ${report.unimportableDocumentsCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {report.unimportableDocumentsCount}
                </span>
              </div>
            </div>

            {/* Metadata Info Bar */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs font-mono text-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 font-sans block">اسم الملف:</span>
                <span className="font-bold text-slate-900">{report.fileName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">إصدار وحالة النسخة:</span>
                <span className="font-bold text-indigo-700">v{report.backupVersion} ({report.exportStatus})</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">حجم الملف:</span>
                <span className="font-bold text-slate-900">{(report.fileSizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block">المجموعات الفارغة:</span>
                <span className="font-bold text-slate-900">{report.emptyCollectionsCount} مجموعة</span>
              </div>
            </div>
          </div>

          {/* ARCHITECTURAL VALIDATION FINDINGS (SECTIONS A-H) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  النتائج المعمارية والفحص الشامل (ARCHITECTURAL VALIDATION FINDINGS)
                </h3>
                <p className="text-xs text-slate-500">
                  تحليل الأقسام الثمانية (A-H) لتشخيص سلامة البيانات ومنشأ الكود واستنتاج الـ Tenant وتكامل العلاقات
                </p>
              </div>
            </div>

            {/* Findings Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-bold">
              {[
                { id: 'findings_d', label: 'د. استنتاج Tenant (الغزاوي)', icon: Building },
                { id: 'findings_e', label: 'هـ. منشأ الكود القديم (Code Origin)', icon: FileCode },
                { id: 'findings_h', label: 'ح. المجموعات الخاصة الـ 5', icon: Users },
                { id: 'findings_f', label: 'و. العلاقات القابلة للحل (FKs)', icon: Key },
                { id: 'findings_a', label: 'أ. أخطاء البيانات', icon: ShieldCheck },
                { id: 'findings_b', label: 'ب. تحويلات Schema', icon: Layers },
                { id: 'findings_c', label: 'ج. تعديلات Mapping', icon: Info },
                { id: 'findings_g', label: 'ز. مراجع مفقودة', icon: AlertTriangle },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeFindingsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFindingsTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="pt-2 text-xs">
              {/* TAB D: Tenant Resolution */}
              {activeFindingsTab === 'findings_d' && (
                <div className="space-y-4 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-indigo-600" />
                      <span>{report.architecturalFindings.sectionD_TenantResolutionAnalysis.title}</span>
                    </h4>
                    <span className="px-2.5 py-1 bg-indigo-200 text-indigo-900 rounded-lg font-mono font-bold text-[11px]">
                      {report.architecturalFindings.sectionD_TenantResolutionAnalysis.resolutionStrategy}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1">
                      <span className="text-[11px] text-slate-500 block">المجمع المستنتج (Active Tenant):</span>
                      <strong className="text-slate-900 text-sm">
                        {report.architecturalFindings.sectionD_TenantResolutionAnalysis.activeTenantName} ({report.architecturalFindings.sectionD_TenantResolutionAnalysis.activeTenantId})
                      </strong>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-1">
                      <span className="text-[11px] text-slate-500 block">قاعدة الحوكمة المعمارية:</span>
                      <strong className="text-indigo-800 text-xs">
                        {report.architecturalFindings.sectionD_TenantResolutionAnalysis.governanceRule}
                      </strong>
                    </div>
                  </div>

                  <ul className="space-y-2 text-slate-700 bg-white p-4 rounded-xl border border-indigo-100 list-disc list-inside">
                    {report.architecturalFindings.sectionD_TenantResolutionAnalysis.items.map((item, i) => (
                      <li key={i} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB E: Legacy Code Origin Trace */}
              {activeFindingsTab === 'findings_e' && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-600" />
                      <span>{report.architecturalFindings.sectionE_LegacyCodeOriginAnalysis.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      تتبع دقيق لمواضع إنشاء المستندات التاريخية في Firestore وأسباب خلوها من tenant_id والحل الجذري في الكود:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {report.architecturalFindings.sectionE_LegacyCodeOriginAnalysis.traces.map((trace, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <span className="font-bold text-indigo-900 font-mono text-sm">
                            {trace.entityOrCollection}
                          </span>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {trace.firestoreWritePath}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] text-slate-700">
                          <div>
                            <span className="text-slate-500 block">الدالة / المصدر القديم:</span>
                            <code className="text-indigo-700 font-mono font-bold">{trace.legacyFunctionOrSource}</code>
                          </div>
                          <div>
                            <span className="text-slate-500 block">سياق المجمع (Tenant Context):</span>
                            <span className="text-slate-800">{trace.tenantContextSource}</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-[11px] text-amber-900 space-y-1">
                          <strong>السبب الجذري:</strong> {trace.rootCauseWhyMissing}
                        </div>

                        <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-1">
                          <strong>الإصلاح البرمجي الموصى به:</strong> {trace.recommendedCodeFix}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB H: Special Collections Decisions */}
              {activeFindingsTab === 'findings_h' && (
                <div className="space-y-4 bg-purple-50/40 p-5 rounded-2xl border border-purple-200 animate-fadeIn">
                  <div className="space-y-1">
                    <h4 className="font-bold text-purple-950 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>{report.architecturalFindings.sectionH_SpecialCollectionsDecisions.title}</span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      تشخيص تفصيلي للمجموعات الـ 5 (المعلمين والمجموعات الأرشيفية) مع مطابقة حسابات الكوادر وتفادي الازدواجية:
                    </p>
                  </div>

                  <div className="space-y-4">
                    {report.architecturalFindings.sectionH_SpecialCollectionsDecisions.specialCollections.map((spec) => (
                      <div
                        key={spec.collection}
                        className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-950 text-sm">{spec.collection}</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded font-mono text-[11px]">
                              {spec.count} مستند
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              spec.duplicationRisk === 'HIGH'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            مخاطر التكرار: {spec.duplicationRisk}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700">
                          <div>
                            <span className="text-slate-500 block">الوجهة المقترحة في PostgreSQL:</span>
                            <strong className="text-indigo-800 font-mono">{spec.proposedPostgresDestination}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">المعرفات الأصلية (Document IDs):</span>
                            <span className="font-mono text-slate-800">{spec.documentIds.join(', ')}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-700 space-y-1">
                          <p><strong>التبرير المعماري:</strong> {spec.justification}</p>
                          <p><strong>الحقول القابلة للمطابقة:</strong> <span className="font-mono">{spec.mappableFields.join(', ')}</span></p>
                          <p><strong>العلاقات المتأثرة:</strong> <span className="font-mono">{spec.affectedRelationships.join(', ')}</span></p>
                        </div>

                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-[11px] text-purple-950">
                          <strong>التوصية المعمارية للتنفيذ:</strong> {spec.architecturalRecommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB F: Resolvable & Deferred FKs */}
              {activeFindingsTab === 'findings_f' && (
                <div className="space-y-4 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-200 animate-fadeIn">
                  <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>{report.architecturalFindings.sectionF_ResolvableAndDeferredFk.title}</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 block text-[11px]">مباشرة قابلة للحل (Resolvable):</span>
                      <span className="text-emerald-700 font-bold font-mono text-lg">
                        {report.architecturalFindings.sectionF_ResolvableAndDeferredFk.resolvableCount}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 block text-[11px]">مؤجلة لحين ترحيل المصدر (Deferred):</span>
                      <span className="text-indigo-700 font-bold font-mono text-lg">
                        {report.architecturalFindings.sectionF_ResolvableAndDeferredFk.deferredCount}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2 text-slate-700 bg-white p-4 rounded-xl border border-emerald-100 list-disc list-inside">
                    {report.architecturalFindings.sectionF_ResolvableAndDeferredFk.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB A: Real Data Errors */}
              {activeFindingsTab === 'findings_a' && (
                <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{report.architecturalFindings.sectionA_RealDataErrors.title}</span>
                  </h4>
                  <ul className="space-y-2 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 list-disc list-inside">
                    {report.architecturalFindings.sectionA_RealDataErrors.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB B: Schema Transformations */}
              {activeFindingsTab === 'findings_b' && (
                <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{report.architecturalFindings.sectionB_TransformableSchemaDifferences.title}</span>
                  </h4>
                  <ul className="space-y-2 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 list-disc list-inside">
                    {report.architecturalFindings.sectionB_TransformableSchemaDifferences.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB C: Mapping Adjustments */}
              {activeFindingsTab === 'findings_c' && (
                <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>{report.architecturalFindings.sectionC_MappingIssuesAndAdjustments.title}</span>
                  </h4>
                  <ul className="space-y-2 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 list-disc list-inside">
                    {report.architecturalFindings.sectionC_MappingIssuesAndAdjustments.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TAB G: Unresolvable / Missing FKs */}
              {activeFindingsTab === 'findings_g' && (
                <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-fadeIn">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{report.architecturalFindings.sectionG_UnresolvableAndMissingFk.title}</span>
                  </h4>
                  <ul className="space-y-2 text-slate-700 bg-white p-4 rounded-xl border border-slate-200 list-disc list-inside">
                    {report.architecturalFindings.sectionG_UnresolvableAndMissingFk.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* RESTORE MAPPING AUDIT V2 TABLE */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  جدول تدقيق ومطابقة المخطط (RESTORE MAPPING AUDIT V2)
                </h3>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المجموعات والجداول..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48 sm:w-60"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['ALL', 'READY', 'WARNING', 'SPECIAL_REVIEW', 'EMPTY'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        statusFilter === filter
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter === 'ALL'
                        ? 'الكل'
                        : filter === 'READY'
                        ? 'جاهزة'
                        : filter === 'WARNING'
                        ? 'تنبيهات'
                        : filter === 'SPECIAL_REVIEW'
                        ? 'مراجعة معمارية'
                        : 'فارغة'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Mapping Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
              <table className="w-full text-right divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Firestore Collection</th>
                    <th className="py-2.5 px-3">PostgreSQL Table</th>
                    <th className="py-2.5 px-3 text-center">المستندات</th>
                    <th className="py-2.5 px-3 text-center">صالحة</th>
                    <th className="py-2.5 px-3 text-center">أخطاء</th>
                    <th className="py-2.5 px-3 text-center">مراجعة خاصة</th>
                    <th className="py-2.5 px-3 text-center">مفاتيح أجنبية (FKs)</th>
                    <th className="py-2.5 px-3 text-center">Tenant Resolution</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                    <th className="py-2.5 px-2 text-center">تفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredAuditRows.map((row, idx) => {
                    const isRowExpanded = expandedRow === row.firestoreCollection;
                    return (
                      <React.Fragment key={row.firestoreCollection}>
                        <tr
                          onClick={() => setExpandedRow(isRowExpanded ? null : row.firestoreCollection)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {row.firestoreCollection}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-indigo-700 font-semibold">
                            {row.postgresTable}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            {row.documentsCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                            {row.validRecords}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {row.invalidRecords > 0 ? (
                              <span className="text-rose-600">{row.invalidRecords}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            {row.specialReviewCount > 0 ? (
                              <span className="text-purple-700">{row.specialReviewCount}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                            {row.resolvableFkCount > 0 && (
                              <span className="text-emerald-700 font-bold">{row.resolvableFkCount} Direct</span>
                            )}
                            {row.deferredFkCount > 0 && (
                              <span className="text-indigo-600 font-bold mr-1">+{row.deferredFkCount} Deferred</span>
                            )}
                            {row.resolvableFkCount === 0 && row.deferredFkCount === 0 && (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[10px]">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                row.tenantResolution === 'DEFAULTED_TO_AL_GHAZZAWI'
                                  ? 'bg-indigo-50 text-indigo-800 font-bold'
                                  : row.tenantResolution === 'EXPLICIT_IN_DATA'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {row.tenantResolution === 'DEFAULTED_TO_AL_GHAZZAWI'
                                ? 'الغزاوي (مستنتج)'
                                : row.tenantResolution === 'EXPLICIT_IN_DATA'
                                ? 'صريح بالبيانات'
                                : 'عام (System Global)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                row.status === 'READY'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : row.status === 'EMPTY'
                                  ? 'bg-slate-100 text-slate-600'
                                  : row.status === 'WARNING'
                                  ? 'bg-amber-50 text-amber-700'
                                  : row.status === 'SPECIAL_REVIEW'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {row.status === 'READY'
                                ? 'جاهزة'
                                : row.status === 'EMPTY'
                                ? 'فارغة'
                                : row.status === 'WARNING'
                                ? 'تنبيهات'
                                : row.status === 'SPECIAL_REVIEW'
                                ? 'مراجعة خاصة'
                                : 'أخطاء'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400">
                            {isRowExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                        </tr>

                        {/* Expandable Details Row */}
                        {isRowExpanded && (
                          <tr className="bg-indigo-50/20">
                            <td colSpan={11} className="p-4 border-t border-b border-indigo-100 space-y-2 text-xs">
                              <div className="flex flex-col sm:flex-row justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800">
                                    ملاحظات التدقيق: <span className="font-normal text-slate-600">{row.notes || 'لا توجد ملاحظات إضافية.'}</span>
                                  </p>
                                  {row.unknownFields.length > 0 && (
                                    <p className="text-[11px] text-slate-600">
                                      <strong className="text-purple-800">الحقول المكتشفة بالمستندات:</strong>{' '}
                                      <span className="font-mono">{row.unknownFields.join(', ')}</span>
                                    </p>
                                  )}
                                  {row.missingFields.length > 0 && (
                                    <p className="text-[11px] text-rose-700">
                                      <strong>حقول إلزامية مفقودة:</strong>{' '}
                                      <span className="font-mono">{row.missingFields.join(', ')}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="text-left font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  <span>Resolvable FKs: {row.resolvableFkCount}</span> | <span>Deferred: {row.deferredFkCount}</span> | <span>Missing: {row.missingExternalFkCount}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation Errors & Warnings Accordion */}
          {(report.validationErrors.length > 0 || report.validationWarnings.length > 0) && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    سجل التنبيهات والأخطاء التفصيلية ({report.validationErrors.length} أخطاء، {report.validationWarnings.length} تنبيهات)
                  </span>
                </div>
                <button type="button" className="text-slate-400 hover:text-slate-600">
                  {showErrorDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showErrorDetails && (
                <div className="space-y-3 pt-2 text-xs">
                  {report.validationErrors.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-rose-800">الأخطاء (Fatal Validation Errors):</h4>
                      <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {report.validationErrors.map((err, i) => (
                          <div
                            key={i}
                            className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg flex justify-between"
                          >
                            <span>[{err.collection}] {err.message}</span>
                            <span className="text-rose-900 font-bold">ID: {err.docId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.validationWarnings.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-amber-800">التنبيهات (Validation Warnings):</h4>
                      <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {report.validationWarnings.slice(0, 50).map((warn, i) => (
                          <div
                            key={i}
                            className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded-lg flex justify-between"
                          >
                            <span>[{warn.collection}] {warn.message}</span>
                            <span className="text-amber-900 font-bold">ID: {warn.docId}</span>
                          </div>
                        ))}
                        {report.validationWarnings.length > 50 && (
                          <p className="text-slate-500 text-center text-[10px] py-1">
                            ...تم عرض أول 50 تنبيهاً من أصل {report.validationWarnings.length}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
