import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CreditCard,
  Building2,
  DollarSign,
  Layers,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  ShieldCheck,
  Calendar,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { BankAccountConfig, FinanceSettingsData } from '../../types';
import { DEFAULT_FINANCE_SETTINGS } from '../../lib/financeService';

export const FinancialSettingsTab: React.FC = () => {
  const { activeTenantId, activeTenant, financeSettings, saveFinanceSettings } = useApp();

  // 1. Revenue Sources
  const [revenueSources, setRevenueSources] = useState<string[]>(() => {
    const raw = financeSettings.revenueSources || DEFAULT_FINANCE_SETTINGS.revenueSources;
    return raw.filter((s) => s !== 'رسوم الطلاب');
  });
  const [newRevenueSource, setNewRevenueSource] = useState('');

  // 2. Expense Categories
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    financeSettings.expenseCategories || DEFAULT_FINANCE_SETTINGS.expenseCategories
  );
  const [newExpenseCategory, setNewExpenseCategory] = useState('');

  // 3. Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    financeSettings.paymentMethods || DEFAULT_FINANCE_SETTINGS.paymentMethods
  );
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // 4. Default Tuition & Due Period
  const [defaultTuitionAmount, setDefaultTuitionAmount] = useState<number>(
    financeSettings.defaultTuitionAmount ?? DEFAULT_FINANCE_SETTINGS.defaultTuitionAmount ?? 2000
  );
  const [paymentDueDays, setPaymentDueDays] = useState<number>(
    financeSettings.financialPolicies?.paymentDueDays ?? DEFAULT_FINANCE_SETTINGS.financialPolicies?.paymentDueDays ?? 14
  );

  // 5. Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccountConfig[]>(() => {
    if (financeSettings.bankAccounts && financeSettings.bankAccounts.length > 0) {
      return financeSettings.bankAccounts;
    }
    return (DEFAULT_FINANCE_SETTINGS.bankAccounts as BankAccountConfig[]) || [];
  });

  // Modal for adding a new bank account
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBank, setNewBank] = useState<Partial<BankAccountConfig>>({
    bankName: '',
    accountName: '',
    iban: '',
    accountNumber: '',
    isDefault: false,
  });

  // 6. Financial Policies
  const [refundPolicy, setRefundPolicy] = useState(
    financeSettings.financialPolicies?.refundPolicy ||
      DEFAULT_FINANCE_SETTINGS.financialPolicies?.refundPolicy ||
      'يحق للمشترك استرداد كامل الرسوم خلال الأسبوع الأول من بدء الفصل الدراسي، ونصف الرسوم خلال الأسبوع الثاني، ولا يحق الاسترداد بعد انقضاء الأسبوعين.'
  );
  const [exemptionPolicy, setExemptionPolicy] = useState(
    financeSettings.financialPolicies?.exemptionPolicy ||
      DEFAULT_FINANCE_SETTINGS.financialPolicies?.exemptionPolicy ||
      'تمنح الإعفاءات الكلية والجزئية لأبناء الأسر المستحقة والأيتام وفق معايير اللجنة الإدارية والمالية للمجمع.'
  );
  const [receiptFooterNote, setReceiptFooterNote] = useState(
    financeSettings.financialPolicies?.receiptFooterNote ||
      DEFAULT_FINANCE_SETTINGS.financialPolicies?.receiptFooterNote ||
      'سند مالي رسمي معتمد إلكترونياً من إدارة مجمع الغزاوي القرآني.'
  );

  // Status & Notifications
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Sync state when financeSettings from context changes
  useEffect(() => {
    if (financeSettings) {
      const rawSources = financeSettings.revenueSources && financeSettings.revenueSources.length > 0
        ? financeSettings.revenueSources
        : DEFAULT_FINANCE_SETTINGS.revenueSources;
      setRevenueSources(rawSources.filter((s) => s !== 'رسوم الطلاب'));
      setExpenseCategories(
        financeSettings.expenseCategories && financeSettings.expenseCategories.length > 0
          ? financeSettings.expenseCategories
          : DEFAULT_FINANCE_SETTINGS.expenseCategories
      );
      setPaymentMethods(
        financeSettings.paymentMethods && financeSettings.paymentMethods.length > 0
          ? financeSettings.paymentMethods
          : DEFAULT_FINANCE_SETTINGS.paymentMethods
      );
      setDefaultTuitionAmount(
        financeSettings.defaultTuitionAmount ?? DEFAULT_FINANCE_SETTINGS.defaultTuitionAmount ?? 2000
      );
      setPaymentDueDays(
        financeSettings.financialPolicies?.paymentDueDays ?? DEFAULT_FINANCE_SETTINGS.financialPolicies?.paymentDueDays ?? 14
      );
      if (financeSettings.bankAccounts && financeSettings.bankAccounts.length > 0) {
        setBankAccounts(financeSettings.bankAccounts);
      } else if (DEFAULT_FINANCE_SETTINGS.bankAccounts) {
        setBankAccounts(DEFAULT_FINANCE_SETTINGS.bankAccounts as BankAccountConfig[]);
      }
      if (financeSettings.financialPolicies?.refundPolicy) {
        setRefundPolicy(financeSettings.financialPolicies.refundPolicy);
      }
      if (financeSettings.financialPolicies?.exemptionPolicy) {
        setExemptionPolicy(financeSettings.financialPolicies.exemptionPolicy);
      }
      if (financeSettings.financialPolicies?.receiptFooterNote) {
        setReceiptFooterNote(financeSettings.financialPolicies.receiptFooterNote);
      }
    }
  }, [financeSettings]);

  // Handlers for lists
  const handleAddRevenueSource = () => {
    const trimmed = newRevenueSource.trim();
    if (!trimmed) return;
    if (revenueSources.includes(trimmed)) return;
    setRevenueSources([...revenueSources, trimmed]);
    setNewRevenueSource('');
  };

  const handleRemoveRevenueSource = (src: string) => {
    if (revenueSources.length <= 1) return;
    setRevenueSources(revenueSources.filter((s) => s !== src));
  };

  const handleAddExpenseCategory = () => {
    const trimmed = newExpenseCategory.trim();
    if (!trimmed) return;
    if (expenseCategories.includes(trimmed)) return;
    setExpenseCategories([...expenseCategories, trimmed]);
    setNewExpenseCategory('');
  };

  const handleRemoveExpenseCategory = (cat: string) => {
    if (expenseCategories.length <= 1) return;
    setExpenseCategories(expenseCategories.filter((c) => c !== cat));
  };

  const handleAddPaymentMethod = () => {
    const trimmed = newPaymentMethod.trim();
    if (!trimmed) return;
    if (paymentMethods.includes(trimmed)) return;
    setPaymentMethods([...paymentMethods, trimmed]);
    setNewPaymentMethod('');
  };

  const handleRemovePaymentMethod = (method: string) => {
    if (paymentMethods.length <= 1) return;
    setPaymentMethods(paymentMethods.filter((m) => m !== method));
  };

  // Bank account handlers
  const handleCreateBankAccount = () => {
    if (!newBank.bankName || !newBank.iban) return;
    const account: BankAccountConfig = {
      id: `bank_${Date.now()}`,
      bankName: newBank.bankName.trim(),
      accountName: newBank.accountName?.trim() || activeTenant?.name || 'مجمع الغزاوي القرآني',
      iban: newBank.iban.trim().toUpperCase(),
      accountNumber: newBank.accountNumber?.trim() || '',
      isDefault: newBank.isDefault || bankAccounts.length === 0,
    };

    let updated = [...bankAccounts];
    if (account.isDefault) {
      updated = updated.map((b) => ({ ...b, isDefault: false }));
    }
    updated.push(account);
    setBankAccounts(updated);
    setNewBank({
      bankName: '',
      accountName: '',
      iban: '',
      accountNumber: '',
      isDefault: false,
    });
    setShowAddBankModal(false);
  };

  const handleSetDefaultBank = (id: string) => {
    setBankAccounts(
      bankAccounts.map((b) => ({
        ...b,
        isDefault: b.id === id,
      }))
    );
  };

  const handleDeleteBank = (id: string) => {
    if (bankAccounts.length <= 1) return;
    const filtered = bankAccounts.filter((b) => b.id !== id);
    if (!filtered.some((b) => b.isDefault) && filtered.length > 0) {
      filtered[0].isDefault = true;
    }
    setBankAccounts(filtered);
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard?.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  // Save Settings
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload: FinanceSettingsData = {
        tenantId: activeTenantId || 'ghazzawi',
        revenueSources,
        expenseCategories,
        paymentMethods,
        defaultTuitionAmount: Number(defaultTuitionAmount) || 2000,
        bankAccounts,
        financialPolicies: {
          refundPolicy: refundPolicy.trim(),
          exemptionPolicy: exemptionPolicy.trim(),
          receiptFooterNote: receiptFooterNote.trim(),
          paymentDueDays: Number(paymentDueDays) || 14,
        },
      };

      await saveFinanceSettings(payload);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3500);
    } catch (err: unknown) {
      console.error('Failed to save finance settings:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء حفظ الإعدادات المالية، يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-12">
      {/* Success Modal */}
      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h4 className="text-lg font-black text-slate-900 mb-1.5">تم حفظ الإعدادات المالية بنجاح</h4>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-5">
              تم تحديث مصادر الإيرادات، بنود المصروفات، طرق الدفع، الحسابات البنكية، والسياسات المالية للمجمع.
            </p>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-100 text-xs font-bold backdrop-blur-xs flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>الإعدادات المالية المستقلة</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-medium border border-emerald-400/20">
              {activeTenant?.name || 'مجمع الغزاوي القرآني'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">الإعدادات والسياسات المالية</h2>
          <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            تخصيص تصنيفات الإيرادات والمصروفات، وتحديد الحسابات البنكية المعتمدة للتحويلات، وضوابط الرسوم وسياسات الاسترداد المالي للمجمع.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 text-sm font-black shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-emerald-800 border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4 text-emerald-700" />
            )}
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Section 1: Official Bank Accounts */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">الحسابات البنكية الرسمية للتحويل</h3>
                <p className="text-xs text-slate-500">
                  الحسابات البنكية المعتمدة التي تظهر لأولياء الأمور والمشتركين لإيداع الرسوم والتبرعات
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddBankModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold border border-teal-200/80 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حساب بنكي</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all relative ${
                  b.isDefault
                    ? 'border-emerald-500/80 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span className="font-bold text-slate-900 text-sm">{b.bankName}</span>
                    {b.isDefault && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                        الحساب الرئيسي
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!b.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultBank(b.id)}
                        className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-white"
                        title="تعيين كحساب افتراضي"
                      >
                        تعيين كرئيسي
                      </button>
                    )}
                    {bankAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">اسم الحساب:</span>
                    <span className="font-bold text-slate-900">{b.accountName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">رقم الآيبان (IBAN):</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 text-xs">
                      <span dir="ltr">{b.iban}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyIban(b.iban)}
                        className="p-1 text-slate-400 hover:text-emerald-700 rounded-md transition-colors"
                        title="نسخ الآيبان"
                      >
                        {copiedIban === b.iban ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {b.accountNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">رقم الحساب:</span>
                      <span className="font-mono text-slate-800">{b.accountNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Revenue Sources & Expense Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue Sources */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">مصادر الإيرادات والدخل</h3>
                  <p className="text-xs text-slate-500">التصنيفات المتاحة عند تسجيل وتوثيق أي إيراد</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {revenueSources.map((src) => (
                  <span
                    key={src}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold"
                  >
                    <span>{src}</span>
                    {revenueSources.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRevenueSource(src)}
                        className="hover:text-rose-600 transition-colors p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={newRevenueSource}
                onChange={(e) => setNewRevenueSource(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRevenueSource();
                  }
                }}
                placeholder="اسم مصدر إيراد جديد..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddRevenueSource}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 transition-colors"
              >
                إضافة
              </button>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">بنود وتصنيفات المصروفات</h3>
                  <p className="text-xs text-slate-500">التصنيفات المعتمدة للمصروفات والعهد والمشتريات</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {expenseCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold"
                  >
                    <span>{cat}</span>
                    {expenseCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExpenseCategory(cat)}
                        className="hover:text-rose-600 transition-colors p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddExpenseCategory();
                  }
                }}
                placeholder="اسم تصنيف مصروف جديد..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddExpenseCategory}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shrink-0 transition-colors"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Payment Methods & Default Tuition Config */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">وسائل وطرق الدفع المعتمدة</h3>
                  <p className="text-xs text-slate-500">القنوات المقبولة لتسجيل العمليات المالية وسندات القبض</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {paymentMethods.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200/80 text-xs font-bold"
                  >
                    <span>{m}</span>
                    {paymentMethods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentMethod(m)}
                        className="hover:text-rose-600 transition-colors p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPaymentMethod();
                  }
                }}
                placeholder="اسم طريقة دفع جديدة..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddPaymentMethod}
                className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shrink-0 transition-colors"
              >
                إضافة
              </button>
            </div>
          </div>

          {/* Tuition Defaults & Due Period */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">الرسوم الدراسية الافتراضية والمهل</h3>
                <p className="text-xs text-slate-500">القيمة المرجعية لاشتراك الطالب وفترة السداد النظامية</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرسوم الدراسية المرجعية للفصل (ر.س)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={defaultTuitionAmount}
                    onChange={(e) => setDefaultTuitionAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ر.س</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  تطبق كقيمة افتراضية عند توليد القيود المالية للطلاب المسجلين.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مهلة سداد الرسوم بعد بدء الفصل (أيام)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={paymentDueDays}
                    onChange={(e) => setPaymentDueDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">يوم</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  الفترة الزمنية المحددة لولي الأمر لإكمال السداد قبل اعتبار الرسوم متأخرة.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Policies & Receipt Footer */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">السياسات المالية وتوثيق السندات</h3>
              <p className="text-xs text-slate-500">
                النصوص الرسمية لسياسة الاسترداد، ضوابط الإعفاء، وتذييل السندات المطبوعة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سياسة استرداد الرسوم والانسحاب
              </label>
              <textarea
                rows={3}
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="شروط وضوابط استرداد الرسوم..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ضوابط المنح والإعفاءات المالية
              </label>
              <textarea
                rows={3}
                value={exemptionPolicy}
                onChange={(e) => setExemptionPolicy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="معايير وضوابط الإعفاء من الرسوم..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نص تذييل سندات القبض والإيصالات المالية المطبوعة
            </label>
            <input
              type="text"
              value={receiptFooterNote}
              onChange={(e) => setReceiptFooterNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="نص التذييل الرسمي الذي يظهر في أسفل سندات القبض..."
            />
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'جارٍ حفظ الإعدادات...' : 'حفظ كافة الإعدادات المالية'}</span>
          </button>
        </div>
      </form>

      {/* Add Bank Account Modal */}
      {showAddBankModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">إضافة حساب بنكي جديد</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم البنك *</label>
                <input
                  type="text"
                  value={newBank.bankName || ''}
                  onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                  placeholder="مثال: مصرف الراجحي، بنك الإنماء، البنك الأهلي..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم صاحب الحساب (المستفيد)</label>
                <input
                  type="text"
                  value={newBank.accountName || ''}
                  onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                  placeholder="مجمع الغزاوي القرآني"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الآيبان (IBAN) *</label>
                <input
                  type="text"
                  dir="ltr"
                  value={newBank.iban || ''}
                  onChange={(e) => setNewBank({ ...newBank, iban: e.target.value.toUpperCase() })}
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-left"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الحساب (اختياري)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={newBank.accountNumber || ''}
                  onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-left"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="makeDefault"
                  checked={newBank.isDefault || false}
                  onChange={(e) => setNewBank({ ...newBank, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="makeDefault" className="font-bold text-slate-800 cursor-pointer">
                  تعيين هذا الحساب كحساب رسمي رئيسي
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateBankAccount}
                disabled={!newBank.bankName || !newBank.iban}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold disabled:opacity-50"
              >
                إضافة الحساب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
