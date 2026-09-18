import { apiClient } from '../api/apiClient';
import { Halaqah } from '../../types';

export class HalaqahRepository {
  static async getAll(tenantId?: string): Promise<Halaqah[]> {
    return apiClient.get<Halaqah[]>('/halaqahs', tenantId ? { tenantId } : undefined);
  }

  static async getById(id: string, tenantId?: string): Promise<Halaqah | null> {
    try {
      return await apiClient.get<Halaqah>(`/halaqahs/${id}`, tenantId ? { tenantId } : undefined);
    } catch {
      return null;
    }
  }

  static async save(halaqah: Halaqah): Promise<Halaqah> {
    return apiClient.post<Halaqah>('/halaqahs', halaqah);
  }

  static async delete(id: string): Promise<boolean> {
    return apiClient.delete(`/halaqahs/${id}`);
  }

  static subscribe(callback: (halaqahs: Halaqah[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<Halaqah[]>('halaqahs', callback, tenantId ? { tenantId } : undefined);
  }
}
