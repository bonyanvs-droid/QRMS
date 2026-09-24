import { apiClient } from '../api/apiClient';
import { User } from '../../types';

export class UserRepository {
  static async getAll(tenantId?: string): Promise<User[]> {
    return apiClient.get<User[]>('/users', tenantId ? { tenantId } : undefined);
  }

  static async getById(id: string, tenantId?: string): Promise<User | null> {
    try {
      return await apiClient.get<User>(`/users/${id}`, tenantId ? { tenantId } : undefined);
    } catch {
      return null;
    }
  }

  static async save(user: User): Promise<User> {
    return apiClient.post<User>('/users', user);
  }

  static async delete(id: string): Promise<boolean> {
    return apiClient.delete(`/users/${id}`);
  }

  static subscribe(callback: (users: User[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<User[]>('users', callback, tenantId ? { tenantId } : undefined);
  }
}
