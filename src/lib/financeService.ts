import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
  FinanceSettingsData,
} from '../types';
import { sanitizeFirestoreData } from './auditService';
import { isCurrentSessionDemo } from './demoGuard';

// Default initial finance settings
export const DEFAULT_FINANCE_SETTINGS: Omit<FinanceSettingsData, 'tenantId'> = {
  revenueSources: ['تبرعات نقدية', 'دعم خيري', 'أوقاف', 'إيرادات أخرى'],
  expenseCategories: [
    'تشغيل ومرافق',
    'رواتب ومكافآت',
    'برامج وأنشطة',
    'قرطاسية ومطبوعات',
    'جوائز وهدايا',
    'مأكولات ومشروبات',
    'ألعاب ومواد استهلاكية',
    'أخرى',
  ],
  paymentMethods: ['نقدي', 'تحويل بنكي', 'شبكة مدى', 'بطاقة إئتمانية', 'أخرى'],
  defaultTuitionAmount: 2000,
  bankAccounts: [
    {
      id: 'bank_rajhi',
      bankName: 'مصرف الراجحي',
      accountName: 'مجمع الغزاوي القرآني',
      iban: 'SA0000000000000000000000',
      accountNumber: '1234567890',
      isDefault: true,
    },
  ],
  financialPolicies: {
    refundPolicy: 'يحق للمشترك استرداد كامل الرسوم خلال الأسبوع الأول من بدء الفصل الدراسي، ونصف الرسوم خلال الأسبوع الثاني، ولا يحق الاسترداد بعد انقضاء الأسبوعين.',
    exemptionPolicy: 'تمنح الإعفاءات الكلية والجزئية لأبناء الأسر المستحقة والأيتام وفق معايير اللجنة الإدارية والمالية للمجمع.',
    receiptFooterNote: 'سند مالي رسمي معتمد إلكترونياً من إدارة مجمع الغزاوي القرآني.',
    paymentDueDays: 14,
  },
};

// ----------------------------------------------------
// 1. Finance Settings
// ----------------------------------------------------
export function subscribeToFinanceSettings(
  tenantId: string,
  callback: (settings: FinanceSettingsData) => void
): Unsubscribe {
  if (isCurrentSessionDemo()) {
    callback({ tenantId, ...DEFAULT_FINANCE_SETTINGS });
    return () => {};
  }
  const docRef = doc(db, 'finance_settings', tenantId || 'default');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ tenantId, ...(snap.data() as any) });
    } else {
      callback({ tenantId, ...DEFAULT_FINANCE_SETTINGS });
    }
  }, (err) => {
    console.warn('Notice subscribing to finance settings:', (err as any)?.message || err);
    callback({ tenantId, ...DEFAULT_FINANCE_SETTINGS });
  });
}

async function safeWriteFinance(writeFn: () => Promise<void>): Promise<void> {
  if (isCurrentSessionDemo()) return;
  try {
    await writeFn();
  } catch (error: any) {
    console.warn('Finance write error:', error);
    throw error;
  }
}

export async function saveFinanceSettings(settings: FinanceSettingsData): Promise<void> {
  await safeWriteFinance(async () => {
    const docRef = doc(db, 'finance_settings', settings.tenantId || 'default');
    await setDoc(docRef, sanitizeFirestoreData(settings), { merge: true });
  });
}

// ----------------------------------------------------
// 2. Revenues
// ----------------------------------------------------
export function subscribeToRevenues(
  tenantId: string,
  callback: (items: RevenueItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'revenues'), where('tenantId', '==', tenantId || 'default'));
  return onSnapshot(q, (snapshot) => {
    const list: RevenueItem[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(list);
  }, (err) => {
    console.warn('Notice subscribing to revenues:', (err as any)?.message || err);
    callback([]);
  });
}

export async function saveRevenueItem(item: RevenueItem): Promise<void> {
  await safeWriteFinance(async () => {
    const docRef = doc(db, 'revenues', item.id);
    await setDoc(docRef, sanitizeFirestoreData(item), { merge: true });
  });
}

export async function deleteRevenueItem(id: string): Promise<void> {
  await safeWriteFinance(async () => {
    await deleteDoc(doc(db, 'revenues', id));
  });
}

// ----------------------------------------------------
// 3. Expenses
// ----------------------------------------------------
export function subscribeToExpenses(
  tenantId: string,
  callback: (items: ExpenseItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'expenses'), where('tenantId', '==', tenantId || 'default'));
  return onSnapshot(q, (snapshot) => {
    const list: ExpenseItem[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(list);
  }, (err) => {
    console.warn('Notice subscribing to expenses:', (err as any)?.message || err);
    callback([]);
  });
}

export async function saveExpenseItem(item: ExpenseItem): Promise<void> {
  await safeWriteFinance(async () => {
    const docRef = doc(db, 'expenses', item.id);
    await setDoc(docRef, sanitizeFirestoreData(item), { merge: true });
  });
}

export async function deleteExpenseItem(id: string): Promise<void> {
  await safeWriteFinance(async () => {
    await deleteDoc(doc(db, 'expenses', id));
  });
}

// ----------------------------------------------------
// 4. Custodies & Custody Expenses
// ----------------------------------------------------
export function subscribeToCustodies(
  tenantId: string,
  callback: (items: Custody[]) => void
): Unsubscribe {
  const q = query(collection(db, 'custodies'), where('tenantId', '==', tenantId || 'default'));
  return onSnapshot(q, (snapshot) => {
    const list: Custody[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.warn('Notice subscribing to custodies:', (err as any)?.message || err);
    callback([]);
  });
}

export async function saveCustody(custody: Custody): Promise<void> {
  await safeWriteFinance(async () => {
    const docRef = doc(db, 'custodies', custody.id);
    await setDoc(docRef, sanitizeFirestoreData(custody), { merge: true });
  });
}

export async function deleteCustody(id: string): Promise<void> {
  await safeWriteFinance(async () => {
    await deleteDoc(doc(db, 'custodies', id));
  });
}

export function subscribeToCustodyExpenses(
  custodyId: string,
  callback: (items: CustodyExpenseItem[]) => void
): Unsubscribe {
  const q = query(collection(db, `custodies/${custodyId}/expenses`));
  return onSnapshot(q, (snapshot) => {
    const list: CustodyExpenseItem[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(list);
  }, (err) => {
    console.warn('Notice subscribing to custody expenses:', (err as any)?.message || err);
    callback([]);
  });
}

export async function saveCustodyExpenseItem(item: CustodyExpenseItem): Promise<void> {
  await safeWriteFinance(async () => {
    const docRef = doc(db, `custodies/${item.custodyId}/expenses`, item.id);
    await setDoc(docRef, sanitizeFirestoreData(item), { merge: true });
  });
}

export async function deleteCustodyExpenseItem(custodyId: string, itemId: string): Promise<void> {
  await safeWriteFinance(async () => {
    await deleteDoc(doc(db, `custodies/${custodyId}/expenses`, itemId));
  });
}

// ----------------------------------------------------
// 5. Budget Requests
// ----------------------------------------------------
export function subscribeToBudgetRequests(
  tenantId: string,
  callback: (items: BudgetRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, 'budget_requests'), where('tenantId', '==', tenantId || 'default'));
  return onSnapshot(q, (snapshot) => {
    const list: BudgetRequest[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.warn('Notice subscribing to budget requests:', (err as any)?.message || err);
    callback([]);
  });
}

export async function saveBudgetRequest(req: BudgetRequest): Promise<void> {
  await safeWriteFinance(async () => {
    const docRef = doc(db, 'budget_requests', req.id);
    await setDoc(docRef, sanitizeFirestoreData(req), { merge: true });
  });
}

export async function deleteBudgetRequest(id: string): Promise<void> {
  await safeWriteFinance(async () => {
    await deleteDoc(doc(db, 'budget_requests', id));
  });
}
