import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AcademicTermArchive } from '../../types';
import {
  Archive,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  History,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export const AcademicArchivesTab: React.FC = () => {
  const {
    archives,
    archiveCurrentTerm,
    activeTenant,
    academicConfig,
    students,
    halaqahs,
  } = useApp();

  const [selectedArchive, setSelectedArchive] = useState<AcademicTermArchive | null>(null);
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [termNameInput, setTermNameInput] = useState('الفصل الدراسي الأول');
  const [archiveNotesInput, setArchiveNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tenantStudents = students.filter((s) => !s.tenantId || s.tenantId === activeTenant?.id);
  const excellentOrOnTrack = tenantStudents.filter(
    (s) => s.status === 'advanced' || s.status === 'on_track'
  ).length;
  const currentMasteryRate =
    tenantStudents.length > 0 ? Math.round((excellentOrOnTrack / tenantStudents.length) * 100) : 0;

  const handleExecuteArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termNameInput.trim()) return;

    setIsSubmitting(true);
    try {
      await archiveCurrentTerm(termNameInput, archiveNotesInput);
      setIsConfirmingArchive(false);
      setSuccessMessage(
        `تمت أرشفة دورة (${termNameInput}) بنجاح وتثبيت السجلات التراكمية في ملفات الطلاب السحابية.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6 text-amber-300" />
            <h3 className="text-lg font-black">
              الأرشيف السنوي وإغلاق الفصول الدراسية (Academic Archives & History)
            </h3>
          </div>
          <p className="text-xs text-blue-100/80 mt-1 max-w-2xl">
            حفظ وأرشفة نتائج الفصول والسنوات الدراسية تلقائياً مع توثيق السجل التراكمي لكل طالب في
            قاعدة البيانات السحابية المركزية لتمكين الانتقال والتقييم المستمر عبر السنوات.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsConfirmingArchive(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-colors shrink-0 cursor-pointer"
        >
          <History className="w-4 h-4" />
          <span>إغلاق الفصل وأرشفة الدورة الحالية</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Confirmation Modal for Term Archive */}
      {isConfirmingArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-900">
                <Archive className="w-6 h-6 text-amber-800" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">إجراء أرشفة وإغلاق الفصل الدراسي</h4>
                <p className="text-xs text-slate-500">المجمع: {activeTenant?.name}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteArchive} className="space-y-4 pt-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>العام الدراسي:</span>
                  <span className="font-bold text-slate-900">{academicConfig.name || academicConfig.academicYear || '1446-1447هـ'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>إجمالي الطلاب المشمولين بالأرشفة:</span>
                  <span className="font-bold text-emerald-800">{tenantStudents.length} طالباً</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>نسبة الإتقان الحالية:</span>
                  <span className="font-bold text-emerald-800">{currentMasteryRate}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مسمى الفصل الدراسي المراد أرشفته *
                </label>
                <input
                  type="text"
                  required
                  value={termNameInput}
                  onChange={(e) => setTermNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  placeholder="مثال: الفصل الدراسي الأول 1446هـ"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو توصيات إدارية للدورة المؤرشفة
                </label>
                <textarea
                  value={archiveNotesInput}
                  onChange={(e) => setArchiveNotesInput(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  placeholder="مثال: تم اختتام الفصل بمعدلات إتقان متميزة في مهارات الهجاء وسورة الغاشية"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  هذا الإجراء سيقوم بحفظ لقطة كاملة (Snapshot) لحالة كل طالب، وتثبيت تاريخ الإنجاز في سجله
                  التراكمي الدائم بالسحابة دون حذف الطلاب أو تصفير بياناتهم الحالية.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmingArchive(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'جارٍ الأرشفة والتثبيت...' : 'تأكيد وحفظ الأرشيف الفصلي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archives List / Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Archives list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              <span>الدورات والفصول المؤرشفة ({archives.length})</span>
            </h4>
          </div>

          {archives.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-500 text-xs">
              لا توجد أرشيفات محفوظة بعد. اضغط على زر "إغلاق الفصل وأرشفة الدورة" لإنشاء الأرشيف الأول.
            </div>
          ) : (
            <div className="space-y-2.5">
              {archives.map((arch) => {
                const isSelected = selectedArchive?.id === arch.id;
                return (
                  <div
                    key={arch.id}
                    onClick={() => setSelectedArchive(arch)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {arch.academicYear}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 mt-1">{arch.termName}</h5>
                        <p className="text-[11px] text-slate-500">{arch.tenantName}</p>
                      </div>

                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800">
                        {arch.overallMasteryRate}% إتقان
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                      <span>{arch.totalStudents} طالباً مؤرشفاً</span>
                      <span>{arch.totalHalaqahs} حلقات</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(arch.archivedAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Archive Details */}
        <div className="lg:col-span-2">
          {selectedArchive ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {selectedArchive.academicYear}
                    </span>
                    <h4 className="text-lg font-black text-slate-900">{selectedArchive.termName}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    أرشفة بواسطة: {selectedArchive.archivedBy} • {new Date(selectedArchive.archivedAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] text-slate-500">نسبة الإتقان</div>
                    <div className="text-base font-black text-emerald-800">
                      {selectedArchive.overallMasteryRate}%
                    </div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500">إجمالي الطلاب</div>
                    <div className="text-base font-black text-slate-800">
                      {selectedArchive.totalStudents}
                    </div>
                  </div>
                </div>
              </div>

              {selectedArchive.notes && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
                  <span className="font-bold text-slate-900 ml-1">التوثيق الإداري:</span>
                  <span>{selectedArchive.notes}</span>
                </div>
              )}

              {/* Student Snapshots Table */}
              <div>
                <h5 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>سجل لقطات الطلاب المؤرشفين ({selectedArchive.studentSnapshots?.length || 0})</span>
                </h5>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">اسم الطالب</th>
                        <th className="p-3">الحلقة والمعلم</th>
                        <th className="p-3">الصف</th>
                        <th className="p-3 text-center">أعلى درس هجاء</th>
                        <th className="p-3 text-center">نسبة الحضور</th>
                        <th className="p-3 text-center">الأوسمة</th>
                        <th className="p-3 text-center">الحالة النهائية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedArchive.studentSnapshots?.map((snap) => (
                        <tr key={snap.studentId} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900">{snap.studentName}</td>
                          <td className="p-3 text-slate-600">
                            <div>{snap.halaqahName}</div>
                            <div className="text-[10px] text-slate-400">{snap.teacherName}</div>
                          </td>
                          <td className="p-3 text-slate-600">{snap.grade}</td>
                          <td className="p-3 text-center font-semibold text-emerald-800">
                            الدرس {snap.spellingLessonReached}
                          </td>
                          <td className="p-3 text-center text-slate-700 font-mono">
                            {snap.attendanceRate}%
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                              <Award className="w-3 h-3 text-amber-600" />
                              <span>{snap.badgesCount}</span>
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={snap.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-500 text-xs shadow-xs">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">اختر دورة أو فصلاً من القائمة لعرض تفاصيل الأرشيف</p>
              <p className="text-[11px] text-slate-400 mt-1">
                تظهر لقطات أداء الطلاب، ومعدلات الإتقان، وسجلات الإنجاز المعتمدة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
