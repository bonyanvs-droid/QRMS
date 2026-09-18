import { apiClient } from '../api/apiClient';
import {
  RevenueItem,
  ExpenseItem,
  Custody,
  CustodyExpenseItem,
  BudgetRequest,
  FinanceSettingsData,
  StudentFinancialRecord,
} from '../../types';

export class FinanceRepository {
  static async getRevenues(tenantId?: string): Promise<RevenueItem[]> {
    return apiClient.get<RevenueItem[]>('/finance_revenues', tenantId ? { tenantId } : undefined);
  }

  static async saveRevenue(item: RevenueItem): Promise<RevenueItem> {
    return apiClient.post<RevenueItem>('/finance_revenues', item);
  }

  static async deleteRevenue(id: string): Promise<boolean> {
    return apiClient.delete(`/finance_revenues/${id}`);
  }

  static subscribeRevenues(callback: (items: RevenueItem[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<RevenueItem[]>('finance_revenues', callback, tenantId ? { tenantId } : undefined);
  }

  static async getExpenses(tenantId?: string): Promise<ExpenseItem[]> {
    return apiClient.get<ExpenseItem[]>('/finance_expenses', tenantId ? { tenantId } : undefined);
  }

  static async saveExpense(item: ExpenseItem): Promise<ExpenseItem> {
    return apiClient.post<ExpenseItem>('/finance_expenses', item);
  }

  static async deleteExpense(id: string): Promise<boolean> {
    return apiClient.delete(`/finance_expenses/${id}`);
  }

  static subscribeExpenses(callback: (items: ExpenseItem[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<ExpenseItem[]>('finance_expenses', callback, tenantId ? { tenantId } : undefined);
  }

  static async getCustodies(tenantId?: string): Promise<Custody[]> {
    return apiClient.get<Custody[]>('/finance_custodies', tenantId ? { tenantId } : undefined);
  }

  static async saveCustody(custody: Custody): Promise<Custody> {
    return apiClient.post<Custody>('/finance_custodies', custody);
  }

  static async deleteCustody(id: string): Promise<boolean> {
    return apiClient.delete(`/finance_custodies/${id}`);
  }

  static subscribeCustodies(callback: (items: Custody[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<Custody[]>('finance_custodies', callback, tenantId ? { tenantId } : undefined);
  }

  static async getCustodyExpenses(custodyId?: string): Promise<CustodyExpenseItem[]> {
    return apiClient.get<CustodyExpenseItem[]>('/finance_custody_expenses', custodyId ? { custodyId } : undefined);
  }

  static async saveCustodyExpense(item: CustodyExpenseItem): Promise<CustodyExpenseItem> {
    return apiClient.post<CustodyExpenseItem>('/finance_custody_expenses', item);
  }

  static async deleteCustodyExpense(id: string): Promise<boolean> {
    return apiClient.delete(`/finance_custody_expenses/${id}`);
  }

  static subscribeCustodyExpenses(callback: (items: CustodyExpenseItem[]) => void, custodyId?: string): () => void {
    return apiClient.subscribe<CustodyExpenseItem[]>('finance_custody_expenses', callback, custodyId ? { custodyId } : undefined);
  }

  static async getBudgetRequests(tenantId?: string): Promise<BudgetRequest[]> {
    return apiClient.get<BudgetRequest[]>('/finance_budget_requests', tenantId ? { tenantId } : undefined);
  }

  static async saveBudgetRequest(request: BudgetRequest): Promise<BudgetRequest> {
    return apiClient.post<BudgetRequest>('/finance_budget_requests', request);
  }

  static async deleteBudgetRequest(id: string): Promise<boolean> {
    return apiClient.delete(`/finance_budget_requests/${id}`);
  }

  static subscribeBudgetRequests(callback: (items: BudgetRequest[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<BudgetRequest[]>('finance_budget_requests', callback, tenantId ? { tenantId } : undefined);
  }

  static async getFinanceSettings(tenantId?: string): Promise<FinanceSettingsData | null> {
    try {
      const items = await apiClient.get<FinanceSettingsData[]>('/finance_settings', tenantId ? { tenantId } : undefined);
      return items && items.length > 0 ? items[0] : null;
    } catch {
      return null;
    }
  }

  static async saveFinanceSettings(settings: FinanceSettingsData): Promise<FinanceSettingsData> {
    return apiClient.post<FinanceSettingsData>('/finance_settings', settings);
  }

  static subscribeFinanceSettings(callback: (settings: FinanceSettingsData) => void, tenantId?: string): () => void {
    return apiClient.subscribe<FinanceSettingsData[]>('finance_settings', (items) => {
      if (items && items.length > 0) {
        callback(items[0]);
      }
    }, tenantId ? { tenantId } : undefined);
  }

  static async getFinancialRecords(tenantId?: string): Promise<StudentFinancialRecord[]> {
    return apiClient.get<StudentFinancialRecord[]>('/student_financial_records', tenantId ? { tenantId } : undefined);
  }

  static async saveFinancialRecord(record: StudentFinancialRecord): Promise<StudentFinancialRecord> {
    return apiClient.post<StudentFinancialRecord>('/student_financial_records', record);
  }

  static subscribeFinancialRecords(callback: (records: StudentFinancialRecord[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<StudentFinancialRecord[]>('student_financial_records', callback, tenantId ? { tenantId } : undefined);
  }
}
