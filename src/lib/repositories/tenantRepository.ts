import { apiClient } from '../api/apiClient';
import { MosqueComplexTenant, EducationalStage, AcademicYearConfig } from '../../types';

export class TenantRepository {
  static async getTenants(): Promise<MosqueComplexTenant[]> {
    return apiClient.get<MosqueComplexTenant[]>('/tenants');
  }

  static async getTenantById(id: string): Promise<MosqueComplexTenant | null> {
    try {
      return await apiClient.get<MosqueComplexTenant>(`/tenants/${id}`);
    } catch {
      return null;
    }
  }

  static async saveTenant(tenant: MosqueComplexTenant): Promise<MosqueComplexTenant> {
    return apiClient.post<MosqueComplexTenant>('/tenants', tenant);
  }

  static async deleteTenant(id: string): Promise<boolean> {
    return apiClient.delete(`/tenants/${id}`);
  }

  static subscribeTenants(callback: (tenants: MosqueComplexTenant[]) => void): () => void {
    return apiClient.subscribe<MosqueComplexTenant[]>('tenants', callback);
  }

  static async getStages(): Promise<EducationalStage[]> {
    return apiClient.get<EducationalStage[]>('/stages');
  }

  static async saveStage(stage: EducationalStage): Promise<EducationalStage> {
    return apiClient.post<EducationalStage>('/stages', stage);
  }

  static subscribeStages(callback: (stages: EducationalStage[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<EducationalStage[]>('stages', callback, { tenantId });
  }

  static async getAcademicYears(): Promise<AcademicYearConfig[]> {
    return apiClient.get<AcademicYearConfig[]>('/academic_years');
  }

  static async saveAcademicYear(year: AcademicYearConfig): Promise<AcademicYearConfig> {
    return apiClient.post<AcademicYearConfig>('/academic_years', year);
  }

  static subscribeAcademicYears(callback: (years: AcademicYearConfig[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<AcademicYearConfig[]>('academic_years', callback, { tenantId });
  }
}
