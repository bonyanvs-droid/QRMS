import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { subscribeToCustodyExpenses, DEFAULT_FINANCE_SETTINGS } from '../../lib/financeService';
import {
  PaymentStatus,
  PaymentTransaction,
  StudentFinancialRecord,
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
} from '../../types';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Receipt,
  FileSpreadsheet,
  Printer,
  Calendar,
  X,
  CreditCard,
  Building,
  User,
  Percent,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  FileText,
  Check,
  Settings,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  CheckSquare,
  Trash2,
  Edit,
  Sparkles,
  History,
  Eye,
  Archive,
  ChevronDown,
} from 'lucide-react';
import { StudentPaymentReceiptModal } from './StudentPaymentReceiptModal';

export interface UnifiedStudentFinancialRecord extends StudentFinancialRecord {
  isPersisted: boolean;
  packageType: string;
  packageLabel: string;
  halaqahName: string;
  grade: string;
  isArchived: boolean;
  parentPhone?: string;
}

export const FinancialManagementTab: React.FC = () => {
  const {
    activeTenantId,
    activeTenant,
    currentUser,
    financialRecords,
    students,
    halaqahs,
    saveFinancialRecord,
    recordPayment,
    revenues,
    saveRevenue,
    deleteRevenue,
    expenses,
    saveExpense,
    deleteExpense,
    custodies,
    saveCustody,
    deleteCustody,
    saveCustodyExpense,
    deleteCustodyExpense,
    budgetRequests,
    saveBudgetRequest,
    deleteBudgetRequest,
    financeSettings,
    saveFinanceSettings,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab');

  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'tuitions' | 'revenues' | 'expenses' | 'custodies' | 'budgets'
  >(() => {
    if (subtabParam === 'tuitions' || subtabParam === 'revenues' || subtabParam === 'expenses' ||
        subtabParam === 'custodies' || subtabParam === 'budgets' || subtabParam === 'overview') {
      return subtabParam;
    }
    return 'overview';
  });

  useEffect(() => {
    if (subtabParam && (
      subtabParam === 'tuitions' || subtabParam === 'revenues' || subtabParam === 'expenses' ||
      subtabParam === 'custodies' || subtabParam === 'budgets' || subtabParam === 'overview'
    )) {
      setActiveSubTab(subtabParam as any);
    }
  }, [subtabParam]);

  const handleSubTabChange = (tab: 'overview' | 'tuitions' | 'revenues' | 'expenses' | 'custodies' | 'budgets') => {
    setActiveSubTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'overview') {
      nextParams.delete('subtab');
    } else {
      nextParams.set('subtab', tab);
    }
    setSearchParams(nextParams);
  };

  // Check role permissions
  const isFinanceManager =
    currentUser?.role === 'system_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'campus_admin';

  // ----------------------------------------------------
  // 1. Student Tuitions State
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'active_only' | 'archived_only'>('all');
  const [selectedRecord, setSelectedRecord] = useState<UnifiedStudentFinancialRecord | null>(null);
  const [viewingPaymentsRecord, setViewingPaymentsRecord] = useState<UnifiedStudentFinancialRecord | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<UnifiedStudentFinancialRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(100);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'online' | string>('cash');
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // ----------------------------------------------------
  // 2. Revenues State (Exclude student tuitions from general revenue)
  // ----------------------------------------------------
  const availableRevenueSources = useMemo(() => {
    const raw = financeSettings.revenueSources || DEFAULT_FINANCE_SETTINGS.revenueSources;
    return raw.filter((s) => s !== 'رسوم الطلاب');
  }, [financeSettings.revenueSources]);

  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [revSource, setRevSource] = useState(() => availableRevenueSources[0] || 'تبرعات نقدية');

  useEffect(() => {
    if (!availableRevenueSources.includes(revSource)) {
      setRevSource(availableRevenueSources[0] || 'تبرعات نقدية');
    }
  }, [availableRevenueSources, revSource]);

  const [revAmount, setRevAmount] = useState<number>(500);
  const [revDate, setRevDate] = useState(new Date().toISOString().split('T')[0]);
  const [revDonor, setRevDonor] = useState('');
  const [revMethod, setRevMethod] = useState('نقدي');
  const [revNotes, setRevNotes] = useState('');

  // ----------------------------------------------------
  // 3. Expenses State
  // ----------------------------------------------------
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState(financeSettings.expenseCategories[0] || 'تشغيلي');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number>(300);
  const [expTax, setExpTax] = useState<number>(0);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expBeneficiary, setExpBeneficiary] = useState('');
  const [expMethod, setExpMethod] = useState('نقدي');
  const [expProgram, setExpProgram] = useState('');
  const [expInvoiceNo, setExpInvoiceNo] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // ----------------------------------------------------
  // 4. Custodies State
  // ----------------------------------------------------
  const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
  const [custodyHolderId, setCustodyHolderId] = useState('');
  const [custodyHolderName, setCustodyHolderName] = useState('');
  const [custodyPurpose, setCustodyPurpose] = useState('');
  const [custodyAmount, setCustodyAmount] = useState<number>(1000);
  const [custodyNotes, setCustodyNotes] = useState('');

  // Selected Custody for viewing expenses & settlement
  const [activeCustodyId, setActiveCustodyId] = useState<string | null>(null);
  const [isCustodyExpenseModalOpen, setIsCustodyExpenseModalOpen] = useState(false);
  const [custodyExpVendor, setCustodyExpVendor] = useState('');
  const [custodyExpDesc, setCustodyExpDesc] = useState('');
  const [custodyExpAmount, setCustodyExpAmount] = useState<number>(200);
  const [custodyExpTax, setCustodyExpTax] = useState<number>(0);
  const [custodyExpCategory, setCustodyExpCategory] = useState(financeSettings.expenseCategories[0] || 'تشغيلي');
  const [custodyExpDate, setCustodyExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [custodyExpMethod, setCustodyExpMethod] = useState('نقدي');
  const [custodyExpInvoice, setCustodyExpInvoice] = useState('');

  // Custody items sub-collection state simulator or fetched via custom state if needed
  // In our financeService, subscribeToCustodyExpenses is used. Let's create a local map or hook for active custody expenses.
  const [activeCustodyExpenses, setActiveCustodyExpenses] = useState<CustodyExpenseItem[]>([]);
  React.useEffect(() => {
    if (!activeCustodyId) {
      setActiveCustodyExpenses([]);
      return;
    }
    const unsub = subscribeToCustodyExpenses(activeCustodyId, (items) => {
      setActiveCustodyExpenses(items);
    });
    return () => unsub();
  }, [activeCustodyId]);

  // ----------------------------------------------------
  // 5. Budget Requests State
  // ----------------------------------------------------
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetProgram, setBudgetProgram] = useState('');
  const [budgetAmount, setBudgetAmount] = useState<number>(2000);
  const [budgetJustification, setBudgetJustification] = useState('');

  // ----------------------------------------------------
  // Filtered & Tenant Data (Includes ALL Mosque Registered Students)
  // ----------------------------------------------------
  const computeStatus = (base: number, discount: number, paid: number, isExempt?: boolean): PaymentStatus => {
    if (isExempt) return 'exempted';
    const net = Math.max(0, base - discount);
    if (net === 0) return 'exempted';
    if (paid >= net) return 'fully_paid';
    if (paid > 0) return 'partially_paid';
    return 'unpaid';
  };

  const tenantRecords = useMemo<UnifiedStudentFinancialRecord[]>(() => {
    const tenantStudents = students.filter((s) => !activeTenantId || s.tenantId === activeTenantId);
    const standardTuition = Number(financeSettings.defaultTuitionAmount) || 2000;

    // Track existing financial records matched with active students
    const linkedRecordIds = new Set<string>();

    const studentRows: UnifiedStudentFinancialRecord[] = tenantStudents.map((s) => {
      // Find matching financial record
      const existingRec = financialRecords.find(
        (r) =>
          (!activeTenantId || r.tenantId === activeTenantId) &&
          (r.studentId === s.id || (r.studentName && (r.studentName === s.fullName || r.studentName === s.name)))
      );

      if (existingRec) {
        linkedRecordIds.add(existingRec.id);
      }

      // Determine package
      const regType = s.registrationType || 'full_package';
      let regLabel = s.registrationTypeLabel;
      if (!regLabel) {
        if (regType === 'activities_only') regLabel = 'باقة الأنشطة والبرامج';
        else if (regType === 'quran_only') regLabel = 'باقة القرآن الكريم فقط';
        else if (regType === 'scholarship') regLabel = 'منحة دراسية / إعفاء';
        else if (regType === 'full_package') regLabel = 'باقة الاشتراك الكامل';
        else regLabel = 'باقة عامة';
      }

      // Expected base tuition according to package
      let defaultBaseForPackage = standardTuition;
      if (regType === 'activities_only') {
        defaultBaseForPackage = Math.round(standardTuition * 0.4);
      } else if (regType === 'quran_only') {
        defaultBaseForPackage = Math.round(standardTuition * 0.7);
      } else if (regType === 'scholarship') {
        defaultBaseForPackage = standardTuition;
      }

      const isExempt = existingRec ? existingRec.isExempt || regType === 'scholarship' : regType === 'scholarship';
      const base = existingRec && existingRec.baseTuition > 0 ? Number(existingRec.baseTuition) : defaultBaseForPackage;
      const discount = existingRec
        ? Number(existingRec.discountAmount) || 0
        : (regType === 'scholarship' ? base : 0);
      const scholarship = existingRec ? Number(existingRec.scholarshipAmount) || 0 : 0;
      const paid = existingRec ? Number(existingRec.paidAmount) || 0 : 0;
      const netDue = isExempt ? 0 : Math.max(0, base - discount - scholarship);
      const remainingAmount = isExempt ? 0 : Math.max(0, netDue - paid);
      const status = computeStatus(base, discount + scholarship, paid, isExempt || netDue === 0);
      const halaqahObj = halaqahs.find((h) => h.id === s.halaqahId);
      const halaqahName = halaqahObj?.name || (regType === 'activities_only' ? 'أنشطة فقط' : 'غير محدد');

      return {
        id: existingRec ? existingRec.id : `temp_rec_${s.id}`,
        tenantId: s.tenantId || activeTenantId || 'default',
        studentId: s.id,
        studentName: s.fullName || s.name || 'طالب',
        academicYear: existingRec?.academicYear || '1445-1446',
        baseTuition: base,
        discountAmount: discount,
        scholarshipAmount: scholarship,
        isExempt: !!isExempt,
        paidAmount: paid,
        remainingAmount,
        status,
        payments: existingRec?.payments || [],
        createdAt: existingRec?.createdAt || s.createdAt || new Date().toISOString(),
        updatedAt: existingRec?.updatedAt || new Date().toISOString(),
        isPersisted: !!existingRec,
        packageType: regType,
        packageLabel: regLabel,
        halaqahName,
        grade: s.grade || '—',
        isArchived: !!s.isArchived,
        parentPhone: s.parentPhone,
      };
    });

    // Also include any unlinked records from financialRecords (for legacy or historical records)
    const unlinkedRecords: UnifiedStudentFinancialRecord[] = financialRecords
      .filter((r) => (!activeTenantId || r.tenantId === activeTenantId) && !linkedRecordIds.has(r.id))
      .map((r) => {
        const base = Number(r.baseTuition) || standardTuition;
        const discount = Number(r.discountAmount) || 0;
        const scholarship = Number(r.scholarshipAmount) || 0;
        const paid = Number(r.paidAmount) || 0;
        const netDue = r.isExempt ? 0 : Math.max(0, base - discount - scholarship);
        const remainingAmount = r.isExempt ? 0 : Math.max(0, netDue - paid);
        const status = computeStatus(base, discount + scholarship, paid, r.isExempt || netDue === 0);
        return {
          ...r,
          baseTuition: base,
          discountAmount: discount,
          scholarshipAmount: scholarship,
          paidAmount: paid,
          remainingAmount,
          status,
          payments: r.payments || [],
          isPersisted: true,
          packageType: 'general',
          packageLabel: 'باقة عامة',
          halaqahName: 'سجل مالي أرشيفي',
          grade: '—',
          isArchived: false,
        };
      });

    return [...studentRows, ...unlinkedRecords];
  }, [students, financialRecords, halaqahs, activeTenantId, financeSettings.defaultTuitionAmount]);

  const filteredTenantRecords = useMemo(() => {
    return tenantRecords.filter((record) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        record.studentName.toLowerCase().includes(q) ||
        record.studentId.toLowerCase().includes(q) ||
        record.packageLabel.toLowerCase().includes(q) ||
        record.halaqahName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      const matchesPackage =
        packageFilter === 'all' ||
        record.packageType === packageFilter ||
        (packageFilter === 'general' && !['full_package', 'quran_only', 'activities_only', 'scholarship'].includes(record.packageType));

      const matchesArchive =
        archiveFilter === 'all' ||
        (archiveFilter === 'active_only' && !record.isArchived) ||
        (archiveFilter === 'archived_only' && record.isArchived);

      return matchesSearch && matchesStatus && matchesPackage && matchesArchive;
    });
  }, [tenantRecords, searchQuery, statusFilter, packageFilter, archiveFilter]);

  const tenantRevenues = useMemo(() => {
    return revenues.filter((r) => !activeTenantId || r.tenantId === activeTenantId);
  }, [revenues, activeTenantId]);

  const tenantExpenses = useMemo(() => {
    return expenses.filter((e) => !activeTenantId || e.tenantId === activeTenantId);
  }, [expenses, activeTenantId]);

  const tenantCustodies = useMemo(() => {
    return custodies.filter((c) => !activeTenantId || c.tenantId === activeTenantId);
  }, [custodies, activeTenantId]);

  const tenantBudgetRequests = useMemo(() => {
    return budgetRequests.filter((b) => !activeTenantId || b.tenantId === activeTenantId);
  }, [budgetRequests, activeTenantId]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    const tuitionRequired = tenantRecords.reduce((acc, r) => acc + (r.isExempt ? 0 : (r.baseTuition - r.discountAmount - r.scholarshipAmount)), 0);
    const tuitionPaid = tenantRecords.reduce((acc, r) => acc + r.paidAmount, 0);
    const tuitionPending = Math.max(0, tuitionRequired - tuitionPaid);
    const tuitionCollectionRate = tuitionRequired > 0 ? Math.round((tuitionPaid / tuitionRequired) * 100) : 100;
    const otherRevenuesTotal = tenantRevenues.reduce((acc, r) => acc + r.amount, 0);
    const totalRevenues = tuitionPaid + otherRevenuesTotal;

    const generalExpensesTotal = tenantExpenses.reduce((acc, e) => acc + e.totalAmount, 0);
    
    // Open & unsettled custodies
    const openCustodies = tenantCustodies.filter((c) => c.status !== 'closed' && c.status !== 'settled');
    const totalCustodiesAllocated = tenantCustodies.reduce((acc, c) => acc + c.originalAmount, 0);

    const netBalance = totalRevenues - generalExpensesTotal;

    const fullyPaidCount = tenantRecords.filter(r => r.status === 'fully_paid').length;
    const partiallyPaidCount = tenantRecords.filter(r => r.status === 'partially_paid').length;
    const unpaidCount = tenantRecords.filter(r => r.status === 'unpaid').length;
    const exemptedCount = tenantRecords.filter(r => r.status === 'exempted').length;
    const pendingBudgetsCount = tenantBudgetRequests.filter(b => b.status === 'pending').length;

    return {
      tuitionRequired,
      tuitionPaid,
      tuitionPending,
      tuitionCollectionRate,
      fullyPaidCount,
      partiallyPaidCount,
      unpaidCount,
      exemptedCount,
      pendingBudgetsCount,
      otherRevenuesTotal,
      totalRevenues,
      generalExpensesTotal,
      netBalance,
      openCustodiesCount: openCustodies.length,
      totalCustodiesAllocated,
    };
  }, [tenantRecords, tenantRevenues, tenantExpenses, tenantCustodies, tenantBudgetRequests]);

  // Handlers for Student Tuitions
  const handleOpenPaymentModal = (record: UnifiedStudentFinancialRecord) => {
    setSelectedRecord(record);
    const suggested = record.remainingAmount > 0 ? record.remainingAmount : 100;
    setPaymentAmount(suggested);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaymentReceiptNumber(`REC-${Date.now().toString().slice(-6)}`);
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!selectedRecord) return;
    const payment: PaymentTransaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      amount: paymentAmount,
      date: paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod as any,
      receiptNumber: paymentReceiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      notes: paymentNotes,
      recordedBy: currentUser?.name || 'المحاسب',
    };

    if (selectedRecord.isPersisted && !selectedRecord.id.startsWith('temp_rec_')) {
      await recordPayment(selectedRecord.id, payment);
    } else {
      const base = selectedRecord.baseTuition;
      const discount = selectedRecord.discountAmount;
      const scholarship = selectedRecord.scholarshipAmount;
      const newPaid = (selectedRecord.paidAmount || 0) + paymentAmount;
      const netDue = selectedRecord.isExempt ? 0 : Math.max(0, base - discount - scholarship);
      const newRemaining = selectedRecord.isExempt ? 0 : Math.max(0, netDue - newPaid);
      const newStatus: PaymentStatus = selectedRecord.isExempt || netDue === 0
        ? 'exempted'
        : newRemaining === 0
        ? 'fully_paid'
        : newPaid > 0
        ? 'partially_paid'
        : 'unpaid';

      const newRec: StudentFinancialRecord = {
        id: `rec_${selectedRecord.studentId}`,
        tenantId: selectedRecord.tenantId || activeTenantId || 'default',
        studentId: selectedRecord.studentId,
        studentName: selectedRecord.studentName,
        academicYear: selectedRecord.academicYear || '1445-1446',
        baseTuition: base,
        discountAmount: discount,
        scholarshipAmount: scholarship,
        isExempt: selectedRecord.isExempt,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        payments: [payment],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveFinancialRecord(newRec);
    }

    setIsPaymentModalOpen(false);
    setSelectedRecord(null);
  };

  // Handlers for Revenues
  const handleCreateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: RevenueItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenantId || 'default',
      sourceName: revSource,
      amount: revAmount,
      date: revDate,
      donorOrSource: revDonor,
      paymentMethod: revMethod,
      notes: revNotes,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'المحاسب',
    };
    await saveRevenue(item);
    setIsRevenueModalOpen(false);
    setRevDonor('');
    setRevNotes('');
  };

  // Handlers for Expenses
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = expAmount + (expTax || 0);
    const item: ExpenseItem = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenantId || 'default',
      category: expCategory,
      description: expDesc,
      amount: expAmount,
      taxAmount: expTax,
      totalAmount: total,
      date: expDate,
      beneficiary: expBeneficiary,
      paymentMethod: expMethod,
      programName: expProgram,
      invoiceNumber: expInvoiceNo,
      notes: expNotes,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'المحاسب',
    };
    await saveExpense(item);
    setIsExpenseModalOpen(false);
    setExpDesc('');
    setExpBeneficiary('');
    setExpInvoiceNo('');
    setExpNotes('');
  };

  // Handlers for Custodies
  const handleCreateCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    const custody: Custody = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenantId || 'default',
      holderId: custodyHolderId,
      holderName: custodyHolderName,
      purpose: custodyPurpose,
      originalAmount: custodyAmount,
      status: 'disbursed',
      createdAt: new Date().toISOString(),
      disbursedAt: new Date().toISOString(),
      notes: custodyNotes,
      createdBy: currentUser?.name || 'المشرف المالي',
    };
    await saveCustody(custody);
    setIsCustodyModalOpen(false);
    setCustodyPurpose('');
    setCustodyNotes('');
  };

  const handleAddCustodyExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustodyId) return;
    const total = custodyExpAmount + (custodyExpTax || 0);
    const item: CustodyExpenseItem = {
      id: `cexp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      custodyId: activeCustodyId,
      tenantId: activeTenantId || 'default',
      vendor: custodyExpVendor,
      description: custodyExpDesc,
      amount: custodyExpAmount,
      taxAmount: custodyExpTax,
      totalAmount: total,
      category: custodyExpCategory,
      date: custodyExpDate,
      paymentMethod: custodyExpMethod,
      invoiceNumber: custodyExpInvoice,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'المستفيد',
    };
    await saveCustodyExpense(item);
    setIsCustodyExpenseModalOpen(false);
    setCustodyExpVendor('');
    setCustodyExpDesc('');
    setCustodyExpInvoice('');
  };

  // Handlers for Budget Requests
  const handleCreateBudgetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const req: BudgetRequest = {
      id: `bud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenantId || 'default',
      requesterId: currentUser?.id || 'usr_1',
      requesterName: currentUser?.name || 'مشرف البرنامج',
      programName: budgetProgram,
      estimatedAmount: budgetAmount,
      justification: budgetJustification,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await saveBudgetRequest(req);
    setIsBudgetModalOpen(false);
    setBudgetProgram('');
    setBudgetJustification('');
  };

  const handleUpdateBudgetStatus = async (req: BudgetRequest, status: 'approved' | 'rejected') => {
    const updated: BudgetRequest = {
      ...req,
      status,
      reviewedBy: currentUser?.name || 'المدير',
      reviewedAt: new Date().toISOString(),
    };
    await saveBudgetRequest(updated);

    // If approved, optionally convert to custody automatically
    if (status === 'approved') {
      const custody: Custody = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId: activeTenantId || 'default',
        holderId: req.requesterId,
        holderName: req.requesterName,
        purpose: `ميزانية معتمدة: ${req.programName}`,
        originalAmount: req.estimatedAmount,
        status: 'disbursed',
        createdAt: new Date().toISOString(),
        disbursedAt: new Date().toISOString(),
        notes: `محول من طلب ميزانية: ${req.justification}`,
        createdBy: currentUser?.name || 'المدير',
      };
      await saveCustody(custody);
    }
  };

  const handleGenerateRealisticTestData = async () => {
    if (!students || students.length === 0) {
      alert('لا توجد بيانات طلاب مسجلة في النظام لتوليد السجلات المالية عليها.');
      return;
    }

    // 1. Student Tuitions with diverse payment states mapped to real students
    for (let i = 0; i < Math.min(students.length, 6); i++) {
      const st = students[i];
      const studentName = st.name || st.fullName || 'طالب';
      const targetStatuses: PaymentStatus[] = ['fully_paid', 'partially_paid', 'fully_paid', 'exempted', 'unpaid', 'partially_paid'];
      const stStatus = targetStatuses[i % targetStatuses.length];
      const base = 1200;
      const discount = stStatus === 'exempted' ? 1200 : (i === 1 ? 300 : 0);
      const net = Math.max(0, base - discount);
      // Ensure strict mathematical consistency: if fully_paid, paid === net. If partially_paid, paid === 450. If unpaid, paid === 0.
      const paid = stStatus === 'fully_paid' ? net : (stStatus === 'partially_paid' ? 450 : 0);
      const remaining = Math.max(0, net - paid);
      const computedStatus = computeStatus(base, discount, paid, stStatus === 'exempted');

      const rec: StudentFinancialRecord = {
        id: `fin_rec_${st.id}`,
        tenantId: activeTenantId,
        studentId: st.id,
        studentName: studentName,
        academicYear: '1447-1448 هـ',
        baseTuition: base,
        discountAmount: discount,
        scholarshipAmount: 0,
        isExempt: computedStatus === 'exempted',
        exemptionReason: computedStatus === 'exempted' ? 'منحة أبناء الأسر المحتاجة والتعاون الخيري' : undefined,
        paidAmount: paid,
        remainingAmount: remaining,
        status: computedStatus,
        payments: paid > 0 ? [
          {
            id: `pay_${Date.now()}_${i}`,
            amount: paid,
            date: new Date().toISOString().split('T')[0],
            paymentMethod: i % 2 === 0 ? 'cash' : 'bank_transfer',
            receiptNumber: `REC-2026-${200 + i}`,
            notes: 'دفعة سداد اشتراك الفصل الدراسي',
            recordedBy: currentUser?.name || 'المحاسب المالي',
          }
        ] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveFinancialRecord(rec);
    }

    // 2. Revenues from Firestore settings
    const revItems: RevenueItem[] = [
      {
        id: `rev_1_${Date.now()}`,
        tenantId: activeTenantId,
        sourceName: financeSettings.revenueSources[1] || 'تبرعات نقدية',
        amount: 5000,
        date: new Date().toISOString().split('T')[0],
        donorOrSource: 'فاعل خير (وقف جامع الغزاوي)',
        paymentMethod: 'تحويل بنكي',
        notes: 'تبرع دعم تشغيلي لحلقات التحفيظ',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'مدير المجمع',
      },
      {
        id: `rev_2_${Date.now()}`,
        tenantId: activeTenantId,
        sourceName: financeSettings.revenueSources[2] || 'دعم خيري',
        amount: 12000,
        date: new Date().toISOString().split('T')[0],
        donorOrSource: 'مؤسسة الراجحي الإنسانية',
        paymentMethod: 'تحويل بنكي',
        notes: 'دعم برامج القرآن الكريم السنوية',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'مدير المجمع',
      }
    ];
    for (const r of revItems) {
      await saveRevenue(r);
    }

    // 3. Expenses with invoice & tax
    const expItems: ExpenseItem[] = [
      {
        id: `exp_1_${Date.now()}`,
        tenantId: activeTenantId,
        category: 'جوائز وهدايا',
        description: 'شراء جوائز تكريم الطلاب المتفوقين لشهر صفر',
        amount: 1500,
        taxAmount: 225,
        totalAmount: 1725,
        date: new Date().toISOString().split('T')[0],
        beneficiary: 'مكتبة العبيكان التجارية',
        paymentMethod: 'شبكة مدى',
        programName: 'حلقة عثمان بن عفان',
        invoiceNumber: 'INV-98214',
        notes: 'تمت المراجعة والاعتماد المالي',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'المحاسب',
      },
      {
        id: `exp_2_${Date.now()}`,
        tenantId: activeTenantId,
        category: 'مأكولات ومشروبات',
        description: 'ضيافة حفل الختام والملتقى المفتوح للبراعم',
        amount: 800,
        taxAmount: 120,
        totalAmount: 920,
        date: new Date().toISOString().split('T')[0],
        beneficiary: 'مؤسسة ضيافة الأندلس',
        paymentMethod: 'نقدي',
        programName: 'برنامج البراعم',
        invoiceNumber: 'INV-4412',
        notes: 'مرفق فاتورة ضريبية مبسطة',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'المحاسب',
      }
    ];
    for (const e of expItems) {
      await saveExpense(e);
    }

    // 4. Custodies
    const custodyItems: Custody[] = [
      {
        id: `cust_1_${Date.now()}`,
        tenantId: activeTenantId,
        holderId: 'usr_holder_1',
        holderName: 'أ. صالح إبراهيم بشير (مشرف الحلقات)',
        purpose: 'عهدة تشغيلية للأنشطة والجوائز الأسبوعية',
        originalAmount: 1500,
        status: 'disbursed',
        createdAt: new Date().toISOString(),
        disbursedAt: new Date().toISOString(),
        notes: 'عهدة نشطة ومصروفة',
        createdBy: currentUser?.name || 'المدير',
      },
      {
        id: `cust_2_${Date.now()}`,
        tenantId: activeTenantId,
        holderId: 'usr_holder_2',
        holderName: 'أ. عثمان محمد عيسى (مسؤول المعاملات)',
        purpose: 'عهدة نثريات وضيافة المجمع',
        originalAmount: 1000,
        status: 'under_review',
        createdAt: new Date().toISOString(),
        disbursedAt: new Date().toISOString(),
        notes: 'عهدة قيد التسوية والمراجعة المالية',
        createdBy: currentUser?.name || 'المدير',
      },
      {
        id: `cust_3_${Date.now()}`,
        tenantId: activeTenantId,
        holderId: 'usr_holder_3',
        holderName: 'أ. عبدالله الغريبي',
        purpose: 'عهدة مسابقة القرآن الكبرى',
        originalAmount: 2000,
        status: 'settled',
        createdAt: new Date().toISOString(),
        disbursedAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
        notes: 'مستهلكة بالكامل ومسواة',
        createdBy: currentUser?.name || 'المدير',
      }
    ];
    for (const c of custodyItems) {
      await saveCustody(c);
    }

    // 5. Budget Requests
    const budgetReqs: BudgetRequest[] = [
      {
        id: `bud_1_${Date.now()}`,
        tenantId: activeTenantId,
        requesterId: 'usr_req_1',
        requesterName: currentUser?.name || 'المشرف التعليمي',
        programName: 'الملتقى الشتوي للقرآن الكريم والتهجئة',
        estimatedAmount: 3500,
        justification: 'تغطية تكاليف طباعة المناهج وجوائز المسابقة الكبرى للطلاب',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: `bud_2_${Date.now()}`,
        tenantId: activeTenantId,
        requesterId: 'usr_req_2',
        requesterName: currentUser?.name || 'مشرف البرامج',
        programName: 'دورة إعداد المعلمين وتطوير الأداء',
        estimatedAmount: 2000,
        justification: 'رسوم حقائب تدريبية وإقامة ورشة عمل',
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser?.name || 'مدير المجمع',
        reviewNotes: 'تمت الموافقة وصرف المبلغ كعهدة مالية مخصصة',
        createdAt: new Date().toISOString(),
      }
    ];
    for (const b of budgetReqs) {
      await saveBudgetRequest(b);
    }

    alert('تم بنجاح توليد بيانات الاختبار الواقعية بناءً على طلاب ومعلمي المجمع الحقيقيين!');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ---------------------------------------------------------------- */}
      {/* 1. KEY STATISTIC CARDS (2 per row on mobile, 4 on desktop)      */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: إجمالي الإيرادات */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">إجمالي الإيرادات</span>
            <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {metrics.totalRevenues.toLocaleString()} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">ر.س</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            رسوم: {metrics.tuitionPaid.toLocaleString()} | أخرى: {metrics.otherRevenuesTotal.toLocaleString()}
          </div>
        </div>

        {/* Card 2: إجمالي المصروفات العامة */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">إجمالي المصروفات العامة</span>
            <div className="p-1.5 sm:p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
              <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {metrics.generalExpensesTotal.toLocaleString()} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">ر.س</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            المصروفات النثرية والتشغيلية
          </div>
        </div>

        {/* Card 3: صافي المركز المالي */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">صافي المركز المالي</span>
            <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${metrics.netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black tracking-tight truncate ${metrics.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {metrics.netBalance.toLocaleString()} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">ر.س</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            {metrics.netBalance >= 0 ? 'فائض مالي متاح' : 'عجز مالي'}
          </div>
        </div>

        {/* Card 4: العهد المالية المفتوحة */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">العهد المالية المفتوحة</span>
            <div className="p-1.5 sm:p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {metrics.openCustodiesCount} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">عهدة</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
            مرصود: {metrics.totalCustodiesAllocated.toLocaleString()} ر.س
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2. OPERATIONAL FINANCIAL OPERATIONS (QUICK ACTIONS BAR)          */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-emerald-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>إدارة العمليات المالية التشغيلية</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-emerald-200/90 mt-0.5 leading-relaxed">
            سجل إيراداً جديداً، أصرف مصروفاً نثرياً، أو أنشئ عهدة مالية للمشرفين والبرامج بضغطة زر.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('revenues');
              setIsRevenueModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center px-3 sm:px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>إضافة إيراد</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('expenses');
              setIsExpenseModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center px-3 sm:px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>تسجيل مصروف</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('custodies');
              setIsCustodyModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center px-3 sm:px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>إنشاء عهدة مالية</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('budgets');
              setIsBudgetModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center px-3 sm:px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 active:scale-[0.98] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>تقديم طلب ميزانية</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 3. FINANCIAL FEES & OPERATIONAL SYSTEM (HEADER & 6 SUB-TABS)     */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
            <span>نظام الرسوم والماليات التشغيلي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            إدارة الإيرادات، المصروفات، العهد المالية، طلبات الميزانية، ومؤشرات الأداء المالي للمجمع.
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium overflow-x-auto max-w-full scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => handleSubTabChange('overview')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
              activeSubTab === 'overview' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المؤشرات المالية
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('tuitions')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
              activeSubTab === 'tuitions' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            رسوم الطلاب
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('revenues')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
              activeSubTab === 'revenues' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الإيرادات
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('expenses')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
              activeSubTab === 'expenses' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المصروفات العامة
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('custodies')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
              activeSubTab === 'custodies' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            العهد المالية
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('budgets')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
              activeSubTab === 'budgets' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            طلبات الميزانية
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 4. SUB-TAB VIEW CONTENTS                                         */}
      {/* ---------------------------------------------------------------- */}

      {/* 1. OVERVIEW (المؤشرات المالية) */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Tuition Collection Progress Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>معدل تحصيل رسوم واشتراكات الطلاب</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  متابعة نسبة التزام الطلاب بسداد الرسوم والاشتراكات المقررة للفصل الدراسي الحالي.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSubTabChange('tuitions')}
                className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>إدارة رسوم الطلاب</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">نسبة التحصيل الإجمالية</span>
                <span className="font-black text-emerald-700 text-sm">{metrics.tuitionCollectionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.tuitionCollectionRate)}%` }}
                />
              </div>
            </div>

            {/* Sub stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
                <div className="text-[11px] font-bold text-slate-500">إجمالي المطلوب</div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {metrics.tuitionRequired.toLocaleString()} <span className="text-xs font-normal text-slate-500">ر.س</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">بعد تطبيق الخصومات</div>
              </div>

              <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-800">المحصل فعلياً</div>
                <div className="text-base sm:text-lg font-black text-emerald-900 mt-1">
                  {metrics.tuitionPaid.toLocaleString()} <span className="text-xs font-normal text-emerald-700">ر.س</span>
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">{metrics.fullyPaidCount} طالب مسدد بالكامل</div>
              </div>

              <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-100">
                <div className="text-[11px] font-bold text-amber-800">المتبقي للتحصيل</div>
                <div className="text-base sm:text-lg font-black text-amber-900 mt-1">
                  {metrics.tuitionPending.toLocaleString()} <span className="text-xs font-normal text-amber-700">ر.س</span>
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">{metrics.partiallyPaidCount} مسدد جزئياً</div>
              </div>

              <div className="bg-rose-50/70 rounded-xl p-3.5 border border-rose-100">
                <div className="text-[11px] font-bold text-rose-800">غير المسددين والمعفيين</div>
                <div className="text-base sm:text-lg font-black text-rose-900 mt-1">
                  {metrics.unpaidCount} <span className="text-xs font-normal text-slate-500">طالب</span>
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">{metrics.exemptedCount} طالب معفى نظاماً</div>
              </div>
            </div>
          </div>

          {/* Breakdown Cards: Revenues & Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenues Breakdown Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>تفصيل مصادر الإيرادات</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleSubTabChange('revenues')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    عرض الكل ←
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">رسوم اشتراكات الطلاب المحصلة</span>
                    <span className="text-xs font-black text-emerald-700">{metrics.tuitionPaid.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">إيرادات وتبرعات أخرى مسجلة</span>
                    <span className="text-xs font-black text-emerald-700">{metrics.otherRevenuesTotal.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">إجمالي التدفقات الواردة</span>
                <span className="text-sm font-black text-slate-900">{metrics.totalRevenues.toLocaleString()} ر.س</span>
              </div>
            </div>

            {/* Expenses Breakdown Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>المصروفات والعهد التشغيلية</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleSubTabChange('expenses')}
                    className="text-xs font-bold text-rose-700 hover:text-rose-800 cursor-pointer"
                  >
                    عرض الكل ←
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">المصروفات العامة المنفقة</span>
                    <span className="text-xs font-black text-rose-700">{metrics.generalExpensesTotal.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">مبالغ العهد المالية المرصودة</span>
                    <span className="text-xs font-black text-amber-700">{metrics.totalCustodiesAllocated.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">العهد الجارية النشطة</span>
                <span className="text-sm font-black text-slate-900">{metrics.openCustodiesCount} عهدة تحت الصرف</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 2. STUDENT TUITIONS */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'tuitions' && (
        <div className="space-y-4">
          {/* Quick Tuition Statistics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">طلاب المجمع المسجلين</span>
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <User className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2">
                {tenantRecords.length} <span className="text-xs font-normal text-slate-700">طالباً</span>
              </div>
              <div className="text-[11px] text-slate-700 mt-1">
                نشط: {tenantRecords.filter(r => !r.isArchived).length} | مؤرشف: {tenantRecords.filter(r => r.isArchived).length}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">إجمالي المطلوب (عليه كام)</span>
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2">
                {metrics.tuitionRequired.toLocaleString()} <span className="text-xs font-normal text-slate-700">ر.س</span>
              </div>
              <div className="text-[11px] text-slate-700 mt-1">
                شامل كافة الباقات والأنشطة
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">المحصل الفعلي (سدد كام)</span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-emerald-600 mt-2">
                {metrics.tuitionPaid.toLocaleString()} <span className="text-xs font-normal text-slate-700">ر.س</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                مكتمل السداد: {metrics.fullyPaidCount} طلاب
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">المتبقي للتحصيل (متبقي كام)</span>
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-rose-600 mt-2">
                {metrics.tuitionPending.toLocaleString()} <span className="text-xs font-normal text-slate-700">ر.س</span>
              </div>
              <div className="text-[11px] text-rose-600 font-bold mt-1">
                غير مسدد/جزئي: {metrics.unpaidCount + metrics.partiallyPaidCount} طلاب
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 font-medium">نسبة التحصيل العامة</span>
                <span className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-teal-600 mt-2">
                %{metrics.tuitionCollectionRate}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics.tuitionCollectionRate))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            {/* Header & Filters */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>رسوم الطلاب وتحصيل الاشتراكات</span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                      {filteredTenantRecords.length} من {tenantRecords.length} طالب
                    </span>
                  </h3>
                  <p className="text-xs text-slate-700 mt-0.5">
                    متابعة اشتراكات ورسوم كافة طلاب المسجد المسجلين بحسب الباقات وإجراء تسديد الدفعات مباشرة
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="بحث باسم الطالب، الحلقة، أو الباقة..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500 transition outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-700 font-bold ml-1">حالة السداد:</span>
                  {(
                    [
                      { key: 'all', label: 'الكل' },
                      { key: 'unpaid', label: 'غير مسدد' },
                      { key: 'partially_paid', label: 'مسدد جزئياً' },
                      { key: 'fully_paid', label: 'مسدد بالكامل' },
                      { key: 'exempted', label: 'معفى / منحة' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setStatusFilter(st.key)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                        statusFilter === st.key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Dropdown Filters */}
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  {/* Package Filter */}
                  <div className="relative flex-1 sm:flex-initial min-w-[135px]">
                    <select
                      value={packageFilter}
                      onChange={(e) => setPackageFilter(e.target.value)}
                      className="w-full appearance-none pr-3 pl-8 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white hover:bg-slate-50 font-bold text-xs shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                    >
                      <option value="all">كافة الباقات</option>
                      <option value="full_package">باقة الاشتراك الكامل</option>
                      <option value="quran_only">باقة القرآن فقط</option>
                      <option value="activities_only">باقة الأنشطة والبرامج</option>
                      <option value="scholarship">منحة دراسية / إعفاء</option>
                      <option value="general">باقة عامة</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Archive Filter */}
                  <div className="relative flex-1 sm:flex-initial min-w-[155px]">
                    <select
                      value={archiveFilter}
                      onChange={(e) => setArchiveFilter(e.target.value as any)}
                      className="w-full appearance-none pr-3 pl-8 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white hover:bg-slate-50 font-bold text-xs shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                    >
                      <option value="all">كل الطلاب (نشط + مؤرشف)</option>
                      <option value="active_only">الطلاب النشطين فقط</option>
                      <option value="archived_only">الطلاب المؤرشفين فقط</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3">الطالب / الحلقة</th>
                    <th className="p-3">باقة الاشتراك</th>
                    <th className="p-3">المبلغ المطلوب (عليه)</th>
                    <th className="p-3">المسدد (سدد كام)</th>
                    <th className="p-3">المتبقي (متبقي كام)</th>
                    <th className="p-3">حالة السداد</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenantRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-700">
                        لا توجد نتائج مطابقة لمعايير البحث والفلترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredTenantRecords.map((record) => {
                      const isArchived = record.isArchived;
                      const hasPayments = record.payments && record.payments.length > 0;
                      return (
                        <tr
                          key={record.id}
                          className={`transition ${
                            isArchived
                              ? 'bg-slate-50/60 opacity-65 grayscale hover:opacity-90'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Student & Group */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {record.studentName.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{record.studentName}</span>
                                  {isArchived && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-600 font-bold">
                                      مؤرشف
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-700 flex items-center gap-2 mt-0.5">
                                  <span>{record.halaqahName}</span>
                                  {record.grade && record.grade !== '—' && (
                                    <>
                                      <span>•</span>
                                      <span>{record.grade}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Subscription Package */}
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                record.packageType === 'activities_only'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                                  : record.packageType === 'quran_only'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                                  : record.packageType === 'scholarship'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                                  : record.packageType === 'full_package'
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/80'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{record.packageLabel}</span>
                            </span>
                          </td>

                          {/* Base / Required Amount */}
                          <td className="p-3">
                            <div className="font-bold text-slate-900">
                              {record.isExempt ? (
                                <span className="text-emerald-600 font-bold">0 ر.س (معفى)</span>
                              ) : (
                                <span>{(record.baseTuition - record.discountAmount - record.scholarshipAmount).toLocaleString()} ر.س</span>
                              )}
                            </div>
                            {record.discountAmount > 0 && !record.isExempt && (
                              <div className="text-[10px] text-slate-700 line-through">
                                الأساسي: {record.baseTuition.toLocaleString()} ر.س
                              </div>
                            )}
                          </td>

                          {/* Paid Amount */}
                          <td className="p-3">
                            <div className="font-bold text-emerald-600">
                              {record.paidAmount.toLocaleString()} ر.س
                            </div>
                            {hasPayments && (
                              <div className="text-[10px] text-slate-700">
                                {record.payments.length} دفعات مسجلة
                              </div>
                            )}
                          </td>

                          {/* Remaining Amount */}
                          <td className="p-3">
                            {record.isExempt ? (
                              <span className="text-slate-700 text-xs font-bold">0 ر.س</span>
                            ) : record.remainingAmount > 0 ? (
                              <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                                {record.remainingAmount.toLocaleString()} ر.س
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                0 ر.س (مكتمل)
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                record.status === 'fully_paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : record.status === 'partially_paid'
                                  ? 'bg-amber-100 text-amber-800'
                                  : record.status === 'exempted'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {record.status === 'fully_paid' && <CheckCircle className="w-3 h-3" />}
                              {record.status === 'partially_paid' && <Clock className="w-3 h-3" />}
                              {record.status === 'exempted' && <ShieldCheck className="w-3 h-3" />}
                              {record.status === 'unpaid' && <AlertCircle className="w-3 h-3" />}
                              <span>
                                {record.status === 'fully_paid'
                                  ? 'مسدد بالكامل'
                                  : record.status === 'partially_paid'
                                  ? 'مسدد جزئياً'
                                  : record.status === 'exempted'
                                  ? 'معفى'
                                  : 'غير مسدد'}
                              </span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {hasPayments && (
                                <button
                                  onClick={() => setReceiptRecord(record)}
                                  title="إصدار وطباعة إيصال سداد رسمي"
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>إيصال سداد</span>
                                </button>
                              )}

                              {record.remainingAmount > 0 && !record.isExempt ? (
                                <button
                                  onClick={() => handleOpenPaymentModal(record)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  <span>تسديد دفعة</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenPaymentModal(record)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>إضافة دفعة</span>
                                </button>
                              )}

                              {hasPayments && (
                                <button
                                  onClick={() => setViewingPaymentsRecord(record)}
                                  title="عرض سجل الدفعات السابقة"
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {filteredTenantRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-700 text-xs bg-slate-50 rounded-xl">
                  لا توجد نتائج مطابقة لمعايير البحث والفلترة.
                </div>
              ) : (
                filteredTenantRecords.map((record) => {
                  const isArchived = record.isArchived;
                  const hasPayments = record.payments && record.payments.length > 0;
                  return (
                    <div
                      key={record.id}
                      className={`p-4 rounded-xl border space-y-3 transition ${
                        isArchived
                          ? 'bg-slate-50/70 border-slate-200 opacity-70 grayscale'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{record.studentName}</span>
                            {isArchived && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-600 font-bold">
                                مؤرشف
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-700 mt-0.5 flex items-center gap-1.5">
                            <span>{record.halaqahName}</span>
                            <span>•</span>
                            <span>{record.grade}</span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            record.packageType === 'activities_only'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                              : record.packageType === 'quran_only'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                              : record.packageType === 'scholarship'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200/80'
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{record.packageLabel}</span>
                        </span>
                      </div>

                      {/* Amounts Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-700 font-medium">المطلوب</div>
                          <div className="font-bold text-slate-800 mt-0.5">
                            {record.isExempt ? '0 ر.س' : `${(record.baseTuition - record.discountAmount - record.scholarshipAmount).toLocaleString()} ر.س`}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-700 font-medium">المسدد</div>
                          <div className="font-bold text-emerald-600 mt-0.5">
                            {record.paidAmount.toLocaleString()} ر.س
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-700 font-medium">المتبقي</div>
                          <div className={`font-bold mt-0.5 ${record.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {record.remainingAmount.toLocaleString()} ر.س
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            record.status === 'fully_paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : record.status === 'exempted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {record.status === 'fully_paid'
                            ? 'مسدد بالكامل'
                            : record.status === 'partially_paid'
                            ? 'مسدد جزئياً'
                            : record.status === 'exempted'
                            ? 'معفى'
                            : 'غير مسدد'}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {hasPayments && (
                            <>
                              <button
                                onClick={() => setReceiptRecord(record)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="إصدار وطباعة إيصال سداد رسمي"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>إيصال سداد</span>
                              </button>
                              <button
                                onClick={() => setViewingPaymentsRecord(record)}
                                className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                                title="عرض سجل العمليات"
                              >
                                السجل ({record.payments.length})
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenPaymentModal(record)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>تسديد دفعة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 3. REVENUES */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'revenues' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">إدارة الإيرادات المتنوعة</h3>
            <button
              onClick={() => setIsRevenueModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل إيراد جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">مصدر الإيراد</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الجهة / المتبرع</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">الملاحظات</th>
                  <th className="p-3 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantRevenues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد إيرادات مسجلة حالياً.
                    </td>
                  </tr>
                ) : (
                  tenantRevenues.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-slate-900">{rev.sourceName}</td>
                      <td className="p-3 font-black text-emerald-700">{rev.amount} ر.س</td>
                      <td className="p-3 text-slate-600">{rev.date}</td>
                      <td className="p-3">{rev.donorOrSource || '—'}</td>
                      <td className="p-3">{rev.paymentMethod}</td>
                      <td className="p-3 text-slate-500">{rev.notes || '—'}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteRevenue(rev.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 4. GENERAL EXPENSES */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">سجل المصروفات العامة والنثرية</h3>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل مصروف جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">الضريبة</th>
                  <th className="p-3 font-bold">الإجمالي</th>
                  <th className="p-3">المستفيد / المورد</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد مصروفات عامة مسجلة حالياً.
                    </td>
                  </tr>
                ) : (
                  tenantExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-slate-800">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">{exp.category}</span>
                      </td>
                      <td className="p-3 text-slate-900">{exp.description}</td>
                      <td className="p-3">{exp.amount} ر.س</td>
                      <td className="p-3 text-slate-500">{exp.taxAmount || 0} ر.س</td>
                      <td className="p-3 font-black text-rose-600">{exp.totalAmount} ر.س</td>
                      <td className="p-3">{exp.beneficiary}</td>
                      <td className="p-3 text-slate-600">{exp.date}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 5. CUSTODIES & SETTLEMENT */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'custodies' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">إدارة العهد المالية والتسويات</h3>
              <p className="text-xs text-slate-500 mt-1">تتبع العهد المسلمة للمشرفين والمعلمين وبنود مصروفاتها وتصفياتها.</p>
            </div>
            <button
              onClick={() => setIsCustodyModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء عهدة جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Custodies List */}
            <div className="md:col-span-1 space-y-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">قائمة العهد المالية</h4>
              {tenantCustodies.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  لا توجد عهد مالية مسجلة.
                </div>
              ) : (
                tenantCustodies.map((custody) => (
                  <div
                    key={custody.id}
                    onClick={() => setActiveCustodyId(custody.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      activeCustodyId === custody.id
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">{custody.holderName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          custody.status === 'closed' || custody.status === 'settled'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {custody.status === 'closed' ? 'مغلقة' : custody.status === 'settled' ? 'مسواة' : 'نشطة'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2">{custody.purpose}</div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">المبلغ: {custody.originalAmount} ر.س</span>
                      <span className="text-emerald-700">اضغط للمتابعة</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Custody Detail & Settlement */}
            <div className="md:col-span-2">
              {activeCustodyId ? (() => {
                const custody = tenantCustodies.find((c) => c.id === activeCustodyId);
                if (!custody) return null;
                const totalExpenses = activeCustodyExpenses.reduce((acc, i) => acc + i.totalAmount, 0);
                const remaining = custody.originalAmount - totalExpenses;

                return (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">تفاصيل العهدة: {custody.purpose}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">المسؤول: {custody.holderName}</p>
                      </div>
                      <button
                        onClick={() => setIsCustodyExpenseModalOpen(true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة فاتورة/بند مصروف</span>
                      </button>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-[11px] text-slate-500">إجمالي العهدة</div>
                        <div className="text-lg font-black text-slate-900 mt-1">{custody.originalAmount} ر.س</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-[11px] text-slate-500">إجمالي المصروفات</div>
                        <div className="text-lg font-black text-rose-600 mt-1">{totalExpenses} ر.س</div>
                      </div>
                      <div className={`p-3 rounded-xl border ${remaining >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                        <div className="text-[11px] font-bold">{remaining >= 0 ? 'المتبقي (فائض)' : 'التجاوز'}</div>
                        <div className="text-lg font-black mt-1">{Math.abs(remaining)} ر.س</div>
                      </div>
                    </div>

                    {/* Expenses Table */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-slate-700">بنود الفواتير والمصروفات المسجلة للعهدة:</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                              <th className="p-2.5">المورد</th>
                              <th className="p-2.5">البيان</th>
                              <th className="p-2.5">القيمة</th>
                              <th className="p-2.5 font-bold">الإجمالي</th>
                              <th className="p-2.5 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeCustodyExpenses.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-slate-400">
                                  لم يتم تسجيل أي بنود مصروفات لهذه العهدة بعد.
                                </td>
                              </tr>
                            ) : (
                              activeCustodyExpenses.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                  <td className="p-2.5 font-bold">{item.vendor}</td>
                                  <td className="p-2.5 text-slate-800">{item.description}</td>
                                  <td className="p-2.5">{item.amount} ر.س</td>
                                  <td className="p-2.5 font-black text-rose-600">{item.totalAmount} ر.س</td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => deleteCustodyExpense(custody.id, item.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 text-xs">
                  اختر عهدة من القائمة الجانبية لعرض تفاصيلها ومصروفاتها.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 6. BUDGET REQUESTS */}
      {/* ---------------------------------------------------------------- */}
      {activeSubTab === 'budgets' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">طلبات ميزانيات الأنشطة والبرامج</h3>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>تقديم طلب ميزانية جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="p-3">مقدم الطلب</th>
                  <th className="p-3">البرنامج / النشاط</th>
                  <th className="p-3">المبلغ المقدر</th>
                  <th className="p-3">المبررات</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantBudgetRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد طلبات ميزانية مسجلة حالياً.
                    </td>
                  </tr>
                ) : (
                  tenantBudgetRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-slate-900">{req.requesterName}</td>
                      <td className="p-3 text-slate-800">{req.programName}</td>
                      <td className="p-3 font-black text-emerald-700">{req.estimatedAmount} ر.س</td>
                      <td className="p-3 text-slate-500">{req.justification}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status === 'approved' ? 'معتمد (تم تحويله لعهدة)' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {req.status === 'pending' && isFinanceManager && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleUpdateBudgetStatus(req, 'approved')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition"
                            >
                              موافقة
                            </button>
                            <button
                              onClick={() => handleUpdateBudgetStatus(req, 'rejected')}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition"
                            >
                              رفض
                            </button>
                          </div>
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

      {/* ================================================================ */}
      {/* MODALS */}
      {/* ================================================================ */}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">تسجيل سداد رسوم للطالب</h4>
                <p className="text-[11px] text-slate-700 mt-0.5">سداد دفعة مالية وتحديث السجل المالي فورياً</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Info Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{selectedRecord.studentName}</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {selectedRecord.packageLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-700 flex items-center justify-between">
                <span>الحلقة: {selectedRecord.halaqahName}</span>
                <span>الصف: {selectedRecord.grade}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
                <div>
                  <div className="text-[10px] text-slate-700">المطلوب</div>
                  <div className="font-bold text-slate-800">
                    {(selectedRecord.baseTuition - selectedRecord.discountAmount - selectedRecord.scholarshipAmount).toLocaleString()} ر.س
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-700">المسدد سابقاً</div>
                  <div className="font-bold text-emerald-600">
                    {selectedRecord.paidAmount.toLocaleString()} ر.س
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-700">المتبقي حالياً</div>
                  <div className="font-extrabold text-rose-600">
                    {selectedRecord.remainingAmount.toLocaleString()} ر.س
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-bold">المبلغ المراد سداده (ر.س)</label>
                  {selectedRecord.remainingAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedRecord.remainingAmount)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold"
                    >
                      سداد كامل المتبقي ({selectedRecord.remainingAmount} ر.س)
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:border-emerald-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="cash">نقدي</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="online">شبكة مدى / بطاقة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ السداد</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم السند / الإيصال</label>
                <input
                  type="text"
                  value={paymentReceiptNumber}
                  onChange={(e) => setPaymentReceiptNumber(e.target.value)}
                  placeholder="مثال: REC-123456"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ملاحظات السداد (اختياري)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="مثال: سداد الدفعة الأولى للفصل الدراسي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>حفظ السداد واعتماد الدفعة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {viewingPaymentsRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">سجل دفعات الطالب</h4>
                <p className="text-[11px] text-slate-700 mt-0.5">{viewingPaymentsRecord.studentName} — {viewingPaymentsRecord.packageLabel}</p>
              </div>
              <button onClick={() => setViewingPaymentsRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">المبلغ</th>
                    <th className="p-2.5">رقم السند</th>
                    <th className="p-2.5">طريقة الدفع</th>
                    <th className="p-2.5">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!viewingPaymentsRecord.payments || viewingPaymentsRecord.payments.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-700">لا توجد دفعات مسجلة حتى الآن.</td>
                    </tr>
                  ) : (
                    viewingPaymentsRecord.payments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5 text-slate-700 font-mono text-[11px]">{p.date}</td>
                        <td className="p-2.5 font-bold text-emerald-600">{p.amount.toLocaleString()} ر.س</td>
                        <td className="p-2.5 font-mono text-slate-700 text-[11px]">{p.receiptNumber || '—'}</td>
                        <td className="p-2.5 text-slate-600">
                          {p.paymentMethod === 'cash' ? 'نقدي' : p.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : p.paymentMethod === 'online' ? 'إلكتروني' : p.paymentMethod || 'نقدي'}
                        </td>
                        <td className="p-2.5 text-slate-700 text-[11px]">{p.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const rec = viewingPaymentsRecord;
                  setViewingPaymentsRecord(null);
                  setReceiptRecord(rec);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>إصدار وطباعة إيصال السند المعتمد</span>
              </button>
              <button
                onClick={() => setViewingPaymentsRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Modal */}
      {isRevenueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">تسجيل إيراد جديد</h4>
              <button onClick={() => setIsRevenueModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRevenue} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">مصدر الإيراد</label>
                <select
                  value={revSource}
                  onChange={(e) => setRevSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  {availableRevenueSources.map((src, i) => (
                    <option key={i} value={src}>{src}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المبلغ (ر.س)</label>
                <input
                  type="number"
                  value={revAmount}
                  onChange={(e) => setRevAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">التاريخ</label>
                <input
                  type="date"
                  value={revDate}
                  onChange={(e) => setRevDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم المتبرع أو الجهة (اختياري)</label>
                <input
                  type="text"
                  value={revDonor}
                  onChange={(e) => setRevDonor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">ملاحظات</label>
                <textarea
                  value={revNotes}
                  onChange={(e) => setRevNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsRevenueModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  حفظ الإيراد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">تسجيل مصروف عام</h4>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">التصنيف</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  {financeSettings.expenseCategories.map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">البيان / الوصف</label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="مثال: شراء أدوات نظافة"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المبلغ (ر.س)</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الضريبة (ر.س)</label>
                  <input
                    type="number"
                    value={expTax}
                    onChange={(e) => setExpTax(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المستفيد / المورد</label>
                <input
                  type="text"
                  value={expBeneficiary}
                  onChange={(e) => setExpBeneficiary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">التاريخ</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Modal */}
      {isCustodyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">إنشاء عهدة مالية جديدة</h4>
              <button onClick={() => setIsCustodyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustody} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم المسؤول عن العهدة</label>
                <input
                  type="text"
                  value={custodyHolderName}
                  onChange={(e) => setCustodyHolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="مثال: الشيخ أحمد (مشرف الأنشطة)"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الغرض / النشاط المرتبط</label>
                <input
                  type="text"
                  value={custodyPurpose}
                  onChange={(e) => setCustodyPurpose(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="مثال: مسابقة القرآن الكبرى"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المبلغ المرصود (ر.س)</label>
                <input
                  type="number"
                  value={custodyAmount}
                  onChange={(e) => setCustodyAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">ملاحظات</label>
                <textarea
                  value={custodyNotes}
                  onChange={(e) => setCustodyNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsCustodyModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  صرف العهدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Expense Modal */}
      {isCustodyExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">تسجيل فاتورة / بند مصروف للعهدة</h4>
              <button onClick={() => setIsCustodyExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustodyExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم المورد / الجهة</label>
                <input
                  type="text"
                  value={custodyExpVendor}
                  onChange={(e) => setCustodyExpVendor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">بيان المصروف</label>
                <input
                  type="text"
                  value={custodyExpDesc}
                  onChange={(e) => setCustodyExpDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">القيمة (ر.س)</label>
                  <input
                    type="number"
                    value={custodyExpAmount}
                    onChange={(e) => setCustodyExpAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الضريبة (ر.س)</label>
                  <input
                    type="number"
                    value={custodyExpTax}
                    onChange={(e) => setCustodyExpTax(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">التاريخ</label>
                <input
                  type="date"
                  value={custodyExpDate}
                  onChange={(e) => setCustodyExpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsCustodyExpenseModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  إضافة البند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Request Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">طلب ميزانية لبرنامج أو نشاط</h4>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBudgetRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم البرنامج أو النشاط</label>
                <input
                  type="text"
                  value={budgetProgram}
                  onChange={(e) => setBudgetProgram(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المبلغ المقدر (ر.س)</label>
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المبررات والأهداف</label>
                <textarea
                  value={budgetJustification}
                  onChange={(e) => setBudgetJustification(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  إرسال الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Student Payment Receipt Modal */}
      {receiptRecord && (
        <StudentPaymentReceiptModal
          record={receiptRecord}
          tenant={activeTenant}
          footerNote={financeSettings?.financialPolicies?.receiptFooterNote}
          onClose={() => setReceiptRecord(null)}
          onOpenPaymentModal={(rec) => {
            setReceiptRecord(null);
            handleOpenPaymentModal(rec);
          }}
        />
      )}
    </div>
  );
};
