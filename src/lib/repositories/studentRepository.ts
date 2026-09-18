import { apiClient } from '../api/apiClient';
import { Student } from '../../types';

export class StudentRepository {
  static async getAll(tenantId?: string): Promise<Student[]> {
    return apiClient.get<Student[]>('/students', tenantId ? { tenantId } : undefined);
  }

  static async getById(id: string, tenantId?: string): Promise<Student | null> {
    try {
      return await apiClient.get<Student>(`/students/${id}`, tenantId ? { tenantId } : undefined);
    } catch {
      return null;
    }
  }

  static async save(student: Student): Promise<Student> {
    return apiClient.post<Student>('/students', student);
  }

  static async delete(id: string): Promise<boolean> {
    return apiClient.delete(`/students/${id}`);
  }

  static async bulkSave(students: Student[]): Promise<number> {
    const res = await apiClient.post('/students/bulk', { items: students });
    return res.inserted || 0;
  }

  static subscribe(callback: (students: Student[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<Student[]>('students', callback, tenantId ? { tenantId } : undefined);
  }
}
