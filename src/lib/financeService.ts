import {
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
  FinanceSettingsData,
} from '../types';
import { FinanceRepository } from './repositories/financeRepository';

export type Unsubscribe = () => void;

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
  return FinanceRepository.subscribeFinanceSettings((settings) => {
    callback(settings || { tenantId, ...DEFAULT_FINANCE_SETTINGS });
  }, tenantId);
}

export async function saveFinanceSettings(settings: FinanceSettingsData): Promise<void> {
  await FinanceRepository.saveFinanceSettings(settings);
}

// ----------------------------------------------------
// 2. Revenues
// ----------------------------------------------------
export function subscribeToRevenues(
  tenantId: string,
  callback: (items: RevenueItem[]) => void
): Unsubscribe {
  return FinanceRepository.subscribeRevenues((items) => {
    const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(sorted);
  }, tenantId);
}

export async function saveRevenueItem(item: RevenueItem): Promise<void> {
  await FinanceRepository.saveRevenue(item);
}

export async function deleteRevenueItem(id: string): Promise<void> {
  await FinanceRepository.deleteRevenue(id);
}

// ----------------------------------------------------
// 3. Expenses
// ----------------------------------------------------
export function subscribeToExpenses(
  tenantId: string,
  callback: (items: ExpenseItem[]) => void
): Unsubscribe {
  return FinanceRepository.subscribeExpenses((items) => {
    const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(sorted);
  }, tenantId);
}

export async function saveExpenseItem(item: ExpenseItem): Promise<void> {
  await FinanceRepository.saveExpense(item);
}

export async function deleteExpenseItem(id: string): Promise<void> {
  await FinanceRepository.deleteExpense(id);
}

// ----------------------------------------------------
// 4. Custodies & Custody Expenses
// ----------------------------------------------------
export function subscribeToCustodies(
  tenantId: string,
  callback: (items: Custody[]) => void
): Unsubscribe {
  return FinanceRepository.subscribeCustodies((items) => {
    const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(sorted);
  }, tenantId);
}

export async function saveCustody(custody: Custody): Promise<void> {
  await FinanceRepository.saveCustody(custody);
}

export async function deleteCustody(id: string): Promise<void> {
  await FinanceRepository.deleteCustody(id);
}

export function subscribeToCustodyExpenses(
  custodyId: string,
  callback: (items: CustodyExpenseItem[]) => void
): Unsubscribe {
  return FinanceRepository.subscribeCustodyExpenses((items) => {
    const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(sorted);
  }, custodyId);
}

export async function saveCustodyExpenseItem(item: CustodyExpenseItem): Promise<void> {
  await FinanceRepository.saveCustodyExpense(item);
}

export async function deleteCustodyExpenseItem(_custodyId: string, itemId: string): Promise<void> {
  await FinanceRepository.deleteCustodyExpense(itemId);
}

// ----------------------------------------------------
// 5. Budget Requests
// ----------------------------------------------------
export function subscribeToBudgetRequests(
  tenantId: string,
  callback: (items: BudgetRequest[]) => void
): Unsubscribe {
  return FinanceRepository.subscribeBudgetRequests((items) => {
    const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(sorted);
  }, tenantId);
}

export async function saveBudgetRequest(req: BudgetRequest): Promise<void> {
  await FinanceRepository.saveBudgetRequest(req);
}

export async function deleteBudgetRequest(id: string): Promise<void> {
  await FinanceRepository.deleteBudgetRequest(id);
}
