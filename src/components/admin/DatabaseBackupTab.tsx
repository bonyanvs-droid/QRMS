/**
 * QRMS PostgreSQL Production Backup Tab (Admin Panel)
 *
 * إنشاء نسخة احتياطية حقيقية كاملة من قاعدة بيانات PostgreSQL الإنتاجية
 * الحالية عبر pg_dump على الخادم، مع سجل النسخ السابقة وتنزيل آمن.
 *
 * هذه الميزة للنسخ الاحتياطي فقط (PostgreSQL → استعادة/حماية) —
 * وهي مستقلة تمامًا عن تصدير نسخة Firestore JSON المستخدم للترحيل.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Database, ShieldCheck, AlertTriangle, Download, RefreshCw, Loader2, HardDriveDownload } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  sizeHuman: string;
  createdAt: string;
}

interface BackupCreationResult {
  filename: string;
  sizeBytes: number;
  sizeHuman: string;
  createdAt: string;
  verified: boolean;
}

export const DatabaseBackupTab: React.FC = () => {
  const { currentUser } = useApp();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdBackup, setCreatedBackup] = useState<BackupCreationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const isAdmin =
    currentUser?.role === 'system_admin' ||
    currentUser?.role === 'campus_admin' ||
    (currentUser?.role as any) === 'admin';

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const resp = await fetch('/api/admin/backup/database/database/history', {
        headers: { 'x-user-role': currentUser?.role || 'system_admin' },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) setBackups(data.backups || []);
      }
    } catch {
      // ignore network errors
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    if (isAdmin) fetchHistory();
  }, [isAdmin, fetchHistory]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    setCreatedBackup(null);
    setIsConfirming(false);
    try {
      const resp = await fetch('/api/admin/backup/database/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'system_admin',
        },
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data?.error || 'فشل إنشاء النسخة الاحتياطية.');
      }
      setCreatedBackup(data.backup);
      fetchHistory();
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ غير متوقع أثناء إنشاء النسخة الاحتياطية.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      const resp = await fetch(`/api/admin/backup/database/database/download/${encodeURIComponent(filename)}`, {
        headers: { 'x-user-role': currentUser?.role || 'system_admin' },
      });
      if (!resp.ok) throw new Error('فشل تنزيل النسخة الاحتياطية.');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل تنزيل النسخة الاحتياطية.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ar-SA');
    } catch {
      return iso;
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 text-rose-700">
          <AlertTriangle className="w-6 h-6" />
          <p className="font-bold">غير مصرح — صلاحية النسخ الاحتياطي لقاعدة البيانات متاحة لمديري النظام والمشرفين المعتمدين فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* بطاقة إنشاء النسخة الاحتياطية */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-start justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Database className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">نسخ احتياطي لقاعدة بيانات PostgreSQL</h2>
              <p className="text-sm text-slate-500">إنشاء نسخة احتياطية كاملة من قاعدة البيانات الحالية (المخطط + البيانات)</p>
            </div>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
        </div>

        <div className="pt-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            يتم إنشاء النسخة عبر <span className="font-mono font-bold">pg_dump</span> على الخادم مباشرة بصيغة الأرشيف الكاملة،
            وتُخزَّن خارج شجرة المصدر في مجلد النسخ الاحتياطية المؤمّن، ثم يتم التحقق من سلامة الأرشيف قبل اعتماده.
            هذه العملية للقراءة فقط ولا تُعدّل أي بيانات.
          </p>

          {!isConfirming && !isCreating && (
            <button
              type="button"
              onClick={() => setIsConfirming(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <HardDriveDownload className="w-5 h-5" />
              <span>إنشاء نسخة احتياطية الآن</span>
            </button>
          )}

          {isConfirming && !isCreating && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-amber-800">تأكيد إنشاء النسخة الاحتياطية</p>
              <p className="text-sm text-amber-700">سيتم إنشاء ملف نسخة احتياطية كاملة من قاعدة بيانات الإنتاج الحالية. هل تريد المتابعة؟</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateBackup}
                  className="px-5 py-2.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors text-sm"
                >
                  نعم، أنشئ النسخة الآن
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="px-5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {isCreating && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700">جاري إنشاء النسخة الاحتياطية من قاعدة البيانات... يرجى الانتظار.</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800 text-sm">فشل إنشاء النسخة الاحتياطية</p>
                <p className="text-sm text-rose-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {createdBackup && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <p className="font-bold text-emerald-800">تم إنشاء النسخة الاحتياطية بنجاح</p>
                {createdBackup.verified && (
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    أرشيف مُتحقق منه (pg_restore)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-lg border border-emerald-100 p-3">
                  <p className="text-slate-500 text-xs mb-1">اسم الملف</p>
                  <p className="font-mono font-bold text-slate-800 text-xs break-all">{createdBackup.filename}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-100 p-3">
                  <p className="text-slate-500 text-xs mb-1">الحجم</p>
                  <p className="font-bold text-slate-800">{createdBackup.sizeHuman}</p>
                </div>
                <div className="bg-white rounded-lg border border-emerald-100 p-3">
                  <p className="text-slate-500 text-xs mb-1">التاريخ والوقت</p>
                  <p className="font-bold text-slate-800">{formatDateTime(createdBackup.createdAt)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(createdBackup.filename)}
                disabled={downloadingFile === createdBackup.filename}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors text-sm disabled:opacity-60"
              >
                {downloadingFile === createdBackup.filename ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>تنزيل النسخة الاحتياطية</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* سجل النسخ الاحتياطية */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">نسخ قاعدة البيانات</h3>
              <p className="text-xs text-slate-500">النسخ المحفوظة على الخادم (الأحدث أولًا)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            disabled={isLoadingHistory}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        <div className="pt-4 overflow-x-auto">
          {backups.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">لا توجد نسخ احتياطية محفوظة بعد.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3 font-bold">التاريخ</th>
                  <th className="py-2.5 px-3 font-bold">اسم النسخة</th>
                  <th className="py-2.5 px-3 font-bold">الحجم</th>
                  <th className="py-2.5 px-3 font-bold">الحالة</th>
                  <th className="py-2.5 px-3 font-bold">تحميل</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{formatDateTime(b.createdAt)}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-800 break-all">{b.filename}</td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{b.sizeHuman}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">محفوظة</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleDownload(b.filename)}
                        disabled={downloadingFile === b.filename}
                        className="inline-flex items-center gap-1.5 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-xs disabled:opacity-60"
                      >
                        {downloadingFile === b.filename ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>تنزيل</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
