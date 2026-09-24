import { apiClient } from '../api/apiClient';
import { DailySessionRecord } from '../../types';

export class DailyRecordRepository {
  static async getAll(tenantId?: string): Promise<DailySessionRecord[]> {
    return apiClient.get<DailySessionRecord[]>('/daily_session_records', tenantId ? { tenantId } : undefined);
  }

  static async getById(id: string, tenantId?: string): Promise<DailySessionRecord | null> {
    try {
      return await apiClient.get<DailySessionRecord>(`/daily_session_records/${id}`, tenantId ? { tenantId } : undefined);
    } catch {
      return null;
    }
  }

  static async save(record: DailySessionRecord): Promise<DailySessionRecord> {
    return apiClient.post<DailySessionRecord>('/daily_session_records', record);
  }

  static async delete(id: string): Promise<boolean> {
    return apiClient.delete(`/daily_session_records/${id}`);
  }

  static async bulkSave(records: DailySessionRecord[]): Promise<number> {
    const res = await apiClient.post('/daily_session_records/bulk', { items: records });
    return res.inserted || 0;
  }

  static subscribe(callback: (records: DailySessionRecord[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<DailySessionRecord[]>('daily_session_records', callback, tenantId ? { tenantId } : undefined);
  }
}
