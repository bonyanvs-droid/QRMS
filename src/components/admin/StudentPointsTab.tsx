import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Award, Plus, CheckCircle2, ShieldCheck, User, Calendar, Trash2, Edit2, Sliders, Sparkles } from 'lucide-react';
import { StudentPointRule, StudentPointTransaction } from '../../types';

export const StudentPointsTab: React.FC = () => {
  const {
    students,
    currentUser,
    activeTenant,
    studentPointRules,
    studentPointTransactions,
    savePointRule,
    awardStudentPoints,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab');

  const [activeSubTab, setActiveSubTab] = useState<'balance' | 'rules' | 'transactions'>(() => {
    if (subtabParam === 'rules' || subtabParam === 'transactions' || subtabParam === 'balance') {
      return subtabParam;
    }
    return 'balance';
  });

  useEffect(() => {
    if (subtabParam && (subtabParam === 'rules' || subtabParam === 'transactions' || subtabParam === 'balance')) {
      setActiveSubTab(subtabParam as any);
    }
  }, [subtabParam]);

  const handleSubTabChange = (tab: 'balance' | 'rules' | 'transactions') => {
    setActiveSubTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'balance') {
      nextParams.delete('subtab');
    } else {
      nextParams.set('subtab', tab);
    }
    setSearchParams(nextParams);
  };

  // New Rule Form State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<StudentPointRule | null>(null);
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleCategory, setRuleCategory] = useState<StudentPointRule['category']>('memorization');
  const [rulePoints, setRulePoints] = useState<number>(10);
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleIsActive, setRuleIsActive] = useState(true);

  // Award Points Modal State
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [customPoints, setCustomPoints] = useState<number>(10);
  const [customReason, setCustomReason] = useState('');
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0]);

  // Permission / Delegation check (ready for future RBAC)
  const canManagePoints =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'system_admin' ||
    currentUser?.role === 'campus_admin' ||
    currentUser?.role === 'supervisor' ||
    currentUser?.role === 'teacher'; // Can be delegated to teachers or supervisors

  // Calculate student point balances
  const studentBalances = students.map((s) => {
    const studentTxs = (studentPointTransactions || []).filter((tx) => tx.studentId === s.id);
    const totalPoints = studentTxs.reduce((sum, tx) => sum + tx.points, 0);
    const level = totalPoints >= 500 ? 'متمم القرآن 🌟' : totalPoints >= 250 ? 'حفظ متقدم ⭐' : totalPoints >= 100 ? 'مجتهد 🟢' : 'مبتدئ ⚪';
    return {
      student: s,
      totalPoints,
      level,
      txCount: studentTxs.length,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  const handleOpenAddRule = () => {
    setEditingRule(null);
    setRuleTitle('');
    setRuleCategory('memorization');
    setRulePoints(10);
    setRuleDescription('');
    setRuleIsActive(true);
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: StudentPointRule) => {
    setEditingRule(rule);
    setRuleTitle(rule.title);
    setRuleCategory(rule.category);
    setRulePoints(rule.defaultPoints);
    setRuleDescription(rule.description || '');
    setRuleIsActive(rule.isActive);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    const rule: StudentPointRule = {
      id: editingRule ? editingRule.id : `rule_${Date.now()}`,
      tenantId: activeTenant?.id || 'ghazzawi',
      title: ruleTitle.trim(),
      category: ruleCategory,
      defaultPoints: Number(rulePoints) || 10,
      isActive: ruleIsActive,
      description: ruleDescription.trim(),
      createdAt: editingRule ? editingRule.createdAt : new Date().toISOString(),
    };

    await savePointRule(rule);
    setIsRuleModalOpen(false);
  };

  const handleAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    const matchedRule = studentPointRules.find((r) => r.id === selectedRuleId);
    const pts = matchedRule ? matchedRule.defaultPoints : customPoints;
    const reason = matchedRule ? matchedRule.title : (customReason.trim() || 'منح نقاط تحفيزية');
    const category = matchedRule ? matchedRule.category : 'custom';
    const studentObj = students.find((s) => s.id === selectedStudentId);

    const tx: Omit<StudentPointTransaction, 'id' | 'createdAt'> = {
      tenantId: activeTenant?.id || 'ghazzawi',
      studentId: selectedStudentId,
      studentName: studentObj ? (studentObj.name || studentObj.fullName) : 'طالب',
      ruleId: matchedRule?.id,
      category,
      points: pts,
      reason,
      date: awardDate,
      recordedBy: currentUser?.name || 'المشرف',
    };

    await awardStudentPoints(tx);
    setIsAwardModalOpen(false);
    setSelectedStudentId('');
    setSelectedRuleId('');
    setCustomReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/60 text-emerald-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>برنامج التحفيز والإنجاز (Data-Driven Points)</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black">نظام نقاط وتحفيز الطلاب</h2>
          <p className="text-emerald-200 text-xs md:text-sm max-w-2xl leading-relaxed">
            محفزات إنجاز مرنة وقابلة للإدارة بالكامل. يمنح المعلمون والمشرفون النقاط وفق معايير الحفظ والمراجعة والانتظام، لتأسيس لوحة شرف تفاعلية تدعم مستويات الطلاب.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canManagePoints && (
            <>
              <button
                onClick={() => setIsAwardModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs md:text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>منح نقاط لطالب</span>
              </button>
              <button
                onClick={handleOpenAddRule}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs md:text-sm border border-white/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>قاعدة نقاط جديدة</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => handleSubTabChange('balance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'balance'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>أرصدة ولوحة شرف الطلاب ({studentBalances.length})</span>
        </button>
        <button
          onClick={() => handleSubTabChange('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'rules'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>قواعد النقاط والإنجاز ({studentPointRules.length})</span>
        </button>
        <button
          onClick={() => handleSubTabChange('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'transactions'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>سجل عمليات منح النقاط ({studentPointTransactions.length})</span>
        </button>
      </div>

      {/* TAB 1: Student Balances & Leaderboard */}
      {activeSubTab === 'balance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">لوحة شرف رصيد النقاط</h3>
            <span className="text-xs text-slate-500">مرتبة تنازلياً حسب مجموع النقاط المكتسبة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">المرتبة</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">المستوى التحفيزي</th>
                  <th className="p-3">عدد العمليات</th>
                  <th className="p-3 font-bold text-emerald-800">مجموع النقاط</th>
                  <th className="p-3 text-center">إجراء سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentBalances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد بيانات طلاب مسجلة في المجمع حالياً.
                    </td>
                  </tr>
                ) : (
                  studentBalances.map((item, index) => (
                    <tr key={item.student.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-slate-600">
                        {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `#${index + 1}`}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.student.name || item.student.fullName}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold">
                          {item.level}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{item.txCount} عملية</td>
                      <td className="p-3 font-black text-emerald-800 text-sm font-mono">{item.totalPoints} نقطة</td>
                      <td className="p-3 text-center">
                        {canManagePoints && (
                          <button
                            onClick={() => {
                              setSelectedStudentId(item.student.id);
                              setIsAwardModalOpen(true);
                            }}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs transition cursor-pointer"
                          >
                            + منح نقاط
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Point Rules Management */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">إدارة قواعد النقاط (Data-Driven Rules)</h3>
              <p className="text-xs text-slate-500">حدد المعايير وقيمة النقاط لكل إنجاز قرآني أو سلوكي.</p>
            </div>
            {canManagePoints && (
              <button
                onClick={handleOpenAddRule}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قاعدة جديدة</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentPointRules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 rounded-lg text-[11px] font-bold">
                      {rule.category === 'memorization' ? 'حفظ القرآن' : rule.category === 'review' ? 'المراجعة' : rule.category === 'plan' ? 'الخطة' : rule.category === 'attendance' ? 'الحضور' : rule.category === 'commitment' ? 'الالتزام' : rule.category === 'participation' ? 'المشاركة' : rule.category === 'competition' ? 'المسابقات' : 'أخرى'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {rule.isActive ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{rule.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{rule.description || 'لا يوجد وصف تفصيلي.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="font-black text-emerald-700 font-mono text-sm">+{rule.defaultPoints} نقطة</div>
                  {canManagePoints && (
                    <button
                      onClick={() => handleOpenEditRule(rule)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Transactions Log */}
      {activeSubTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">سجل عمليات منح النقاط</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الطالب</th>
                  <th className="p-3">سبب ومنحة النقاط</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">بواسطة</th>
                  <th className="p-3 text-left font-bold text-emerald-800">النقاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentPointTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد عمليات منح نقاط مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  studentPointTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono text-slate-500">{tx.date}</td>
                      <td className="p-3 font-bold text-slate-900">{tx.studentName || 'طالب'}</td>
                      <td className="p-3 text-slate-700 font-medium">{tx.reason}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{tx.recordedBy}</td>
                      <td className="p-3 text-left font-black text-emerald-700 font-mono text-sm">+{tx.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Rule Add / Edit */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingRule ? 'تعديل قاعدة نقاط' : 'إضافة قاعدة نقاط جديدة'}
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان القاعدة / الإنجاز</label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  placeholder="مثال: حفظ وجهين بسرد متقن"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  >
                    <option value="memorization">حفظ القرآن</option>
                    <option value="review">المراجعة</option>
                    <option value="plan">الخطة التشغيلية</option>
                    <option value="attendance">الحضور والانتظام</option>
                    <option value="commitment">الالتزام والسلوك</option>
                    <option value="participation">المشاركة التفاعلية</option>
                    <option value="competition">المسابقات</option>
                    <option value="custom">أخرى مخصصة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد النقاط الافتراضي</label>
                  <input
                    type="number"
                    value={rulePoints}
                    onChange={(e) => setRulePoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف القاعدة</label>
                <textarea
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={2}
                  placeholder="تفاصيل وشروط منح النقاط..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ruleActive"
                  checked={ruleIsActive}
                  onChange={(e) => setRuleIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                <label htmlFor="ruleActive" className="text-xs font-bold text-slate-700">تفعيل هذه القاعدة للاستخدام الفوري</label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs"
                >
                  حفظ القاعدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Award Points */}
      {isAwardModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">منح نقاط تحفيزية لطالب</h3>
              <button
                onClick={() => setIsAwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAwardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اختر الطالب</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                  required
                >
                  <option value="">-- اختر طالباً من المجمع --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.fullName} ({s.grade || 'طالب'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold type text-xs font-bold text-slate-700 mb-1">اختر معيار الإنجاز (قاعدة النقاط)</label>
                <select
                  value={selectedRuleId}
                  onChange={(e) => {
                    setSelectedRuleId(e.target.value);
                    const r = studentPointRules.find((rule) => rule.id === e.target.value);
                    if (r) setCustomPoints(r.defaultPoints);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="">-- منح مخصص (بدون قاعدة محددة) --</option>
                  {studentPointRules.filter((r) => r.isActive).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} (+{r.defaultPoints} نقطة)
                    </option>
                  ))}
                </select>
              </div>

              {!selectedRuleId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عدد النقاط الممنوحة</label>
                    <input
                      type="number"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المنح</label>
                    <input
                      type="date"
                      value={awardDate}
                      onChange={(e) => setAwardDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                      required
                    />
                  </div>
                </div>
              )}

              {!selectedRuleId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سبب أو تفاصيل المنح</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="مثال: تميز استثنائي في تسميع سورة الملك"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs"
                >
                  تأكيد ومنح النقاط ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
