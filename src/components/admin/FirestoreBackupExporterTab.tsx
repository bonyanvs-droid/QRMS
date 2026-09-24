import React, { useState } from 'react';
import {
  Database,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  FileJson,
  ShieldCheck,
  Server,
  Activity,
  Check,
} from 'lucide-react';
import {
  executeFirestoreBackup,
  downloadBackupFile,
  FirestoreFullBackup,
  BackupProgress,
  BACKUP_COLLECTIONS,
} from '../../lib/firestoreBackupService';
import { useApp } from '../../context/AppContext';
import { isCurrentSessionDemo } from '../../lib/demoGuard';

export const FirestoreBackupExporterTab: React.FC = () => {
  const { currentUser } = useApp();
  const isDemoSession = isCurrentSessionDemo();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [backupResult, setBackupResult] = useState<FirestoreFullBackup | null>(null);
  const [downloadedFileName, setDownloadedFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security check: Only administrators can access this tool
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
          أداة تصدير النسخ الاحتياطية الشاملة لقاعدة بيانات Firestore مخصصة للإدارة المركزية فقط.
        </p>
      </div>
    );
  }

  const handleStartBackup = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setBackupResult(null);
    setDownloadedFileName(null);

    try {
      const result = await executeFirestoreBackup((prog) => {
        setProgress(prog);
      });
      setBackupResult(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع أثناء استخراج النسخة الاحتياطية.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    if (!backupResult) return;
    const fileName = downloadBackupFile(backupResult);
    setDownloadedFileName(fileName);
  };

  const progressPercent = progress
    ? Math.round((progress.currentCollectionIndex / progress.totalCollections) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black tracking-tight">أداة النسخ الاحتياطي الشامل لقاعدة بيانات Firestore</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              تتيح هذه الأداة الإدارية قراءة مباشرة وشاملة لكافة الـ Collections والـ Subcollections (Read-Only) مع الحفاظ التام على معرفات المستندات (Document IDs)، المسارات الأصلية (Paths)، والأنواع الدقيقة للبيانات (Timestamps & Arrays).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStartBackup}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إنشاء نسخة احتياطية</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-xs font-bold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري استخراج البيانات... ({progressPercent}%)</span>
              </div>
            )}
          </div>
        </div>

        {/* Security & Scope Tags */}
        <div className="mt-5 pt-4 border-t border-slate-700/50 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>عملية قراءة آمنة فقط (Read-Only)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-600 rounded-lg">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>تشمل {BACKUP_COLLECTIONS.length} مجموعة + المجموعات الفرعية للعهد</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800/90 border border-slate-600 rounded-lg">
            <FileJson className="w-3.5 h-3.5 text-teal-400" />
            <span>تصدير ملف JSON بصيغة قياسية كاملة</span>
          </span>
          {isDemoSession && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-950 border border-blue-500/40 rounded-lg text-blue-300">
              <span>وضع المعاينة النشط</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress & Live Status Box */}
      {isRunning && progress && (
        <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>جاري المعالجة:</span>
              <span className="text-emerald-700 font-mono text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {progress.currentCollection}
              </span>
            </div>
            <div className="text-slate-500 font-mono">
              المجموعة {progress.currentCollectionIndex} من {progress.totalCollections} ({progressPercent}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div
              className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-0.5">المستندات بالمجموعة الحالية:</span>
              <span className="text-slate-900 font-bold font-mono text-sm">{progress.readDocsInCurrent}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-0.5">إجمالي المستندات حتى الآن:</span>
              <span className="text-emerald-700 font-bold font-mono text-sm">{progress.totalDocsSoFar}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-0.5">حالة المجموعات الفرعية:</span>
              <span className="text-slate-700 font-semibold">{progress.subcollectionStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-xs text-rose-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>PARTIAL BACKUP — NOT SAFE FOR MIGRATION</span>
          </div>
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Backup Success Result */}
      {backupResult && (
        <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl flex items-center justify-center ${
                  backupResult.metadata.exportStatus === 'COMPLETE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {backupResult.metadata.exportStatus === 'COMPLETE' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {backupResult.metadata.exportStatus === 'COMPLETE'
                    ? 'تم إنشاء النسخة الاحتياطية بنجاح'
                    : 'تحذير: اكتملت النسخة جزئياً (PARTIAL)'}
                </h3>
                <p className="text-xs text-slate-500">
                  الحالة: <span className="font-bold font-mono text-emerald-700">{backupResult.metadata.exportStatus}</span> — تاريخ الإنشاء: {new Date(backupResult.metadata.createdAt).toLocaleString('ar-SA')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تحميل النسخة الاحتياطية (JSON)</span>
            </button>
          </div>

          {downloadedFileName && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>تم تنزيل الملف بنجاح باسم:</span>
              <span className="font-mono font-bold text-emerald-950">{downloadedFileName}</span>
            </div>
          )}

          {/* Metadata KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">إجمالي المجموعات</span>
              <span className="text-slate-900 font-bold font-mono text-lg">{backupResult.metadata.totalCollections}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">إجمالي المستندات الأساسية</span>
              <span className="text-emerald-700 font-bold font-mono text-lg">{backupResult.metadata.totalDocuments}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">مستندات المجموعات الفرعية</span>
              <span className="text-teal-700 font-bold font-mono text-lg">{backupResult.metadata.totalSubcollectionDocuments}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 block mb-1">إجمالي كافة المستندات</span>
              <span className="text-blue-700 font-bold font-mono text-lg">
                {backupResult.metadata.totalDocuments + backupResult.metadata.totalSubcollectionDocuments}
              </span>
            </div>
          </div>

          {/* Database Environment Info */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-1.5 font-mono text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">معرف مشروع Firebase:</span>
              <span className="font-bold text-slate-900">{backupResult.metadata.firebaseProjectId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">قاعدة بيانات Firestore:</span>
              <span className="font-bold text-slate-900">{backupResult.metadata.firestoreDatabaseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">إصدار ملف النسخ:</span>
              <span className="font-bold text-emerald-700">v{backupResult.metadata.backupVersion}</span>
            </div>
          </div>

          {/* Collections Breakdown Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>تفاصيل مستندات المجموعات (Collections Audit Breakdown):</span>
            </h4>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 text-xs">
              <table className="w-full text-right divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">اسم المجموعة (Collection Name)</th>
                    <th className="py-2.5 px-3">مسار المستندات (Path)</th>
                    <th className="py-2.5 px-3 text-center">عدد المستندات</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {BACKUP_COLLECTIONS.map((colName, idx) => {
                    const count = backupResult.metadata.documentCounts[colName] ?? 0;
                    return (
                      <tr key={colName} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{colName}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">collections/{colName}/*</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-800">{count}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] rounded-md font-medium">
                            <Check className="w-3 h-3" />
                            <span>مكتمل</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Subcollections row */}
                  <tr className="bg-teal-50/50 font-medium">
                    <td className="py-2 px-3 text-teal-600 font-mono">Sub</td>
                    <td className="py-2 px-3 font-mono font-bold text-teal-900">custodies/*/expenses</td>
                    <td className="py-2 px-3 text-teal-700 font-mono text-[11px]">collections/custodies/&#123;id&#125;/expenses/*</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-teal-800">
                      {backupResult.metadata.subcollectionCounts['custodies/*/expenses'] ?? 0}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 text-[11px] rounded-md font-medium">
                        <Check className="w-3 h-3" />
                        <span>مكتمل</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Static Information Guide */}
      {!backupResult && !isRunning && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-xs text-slate-600 space-y-2.5">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>معلومات الفحص والنسخ الاحتياطي:</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pr-2">
            <li>يتم قراءة جميع المستندات مباشرة من قاعدة بيانات Firestore المربوطة بالسحابة.</li>
            <li>الملف الناتج ملف JSON مستقل بالكامل (Self-contained) وجاهز لأي مرحلة تحليل أو استعادة أو Migration مستقبلي.</li>
            <li>يتم الحفاظ على المعرفات الرقمية والنصية (Document IDs) وتنسيق الطوابع الزمنية (Timestamps).</li>
            <li>لا تتأثر بيانات السحابة بأي شكل أثناء هذه العملية، حيث تتم جميع العمليات بصيغة Read-Only.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
