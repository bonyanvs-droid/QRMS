import { apiClient } from '../api/apiClient';
import { MosqueComplexTenant, EducationalStage, AcademicYearConfig } from '../../types';

export function normalizeAcademicYearConfig(raw: any): AcademicYearConfig {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }
  const cleanDate = (d: any, defaultVal: string = ''): string => {
    if (typeof d === 'string' && d.trim() !== '' && d !== '{}') {
      return d;
    }
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return defaultVal;
  };
  const cleanNum = (n: any, defaultVal: number): number => {
    const num = Number(n);
    return isNaN(num) ? defaultVal : num;
  };

  return {
    ...raw,
    name: raw.name || 'العام الدراسي 1448 هـ',
    semester: raw.semester || 'الفصل الدراسي الأول',
    startDate: cleanDate(raw.startDate, '2026-08-15'),
    endDate: cleanDate(raw.endDate, '2026-11-15'),
    operationalStartWeek: cleanNum(raw.operationalStartWeek, 3),
    operationalEndWeek: cleanNum(raw.operationalEndWeek, 14),
    totalWeeks: cleanNum(raw.totalWeeks, 12),
    currentWeek: cleanNum(raw.currentWeek, 5),
    spellingPassingThreshold: cleanNum(raw.spellingPassingThreshold, 85),
    manualWeekOverride: !!raw.manualWeekOverride,
  };
}

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
    const years = await apiClient.get<AcademicYearConfig[]>('/academic_years');
    return (years || []).map(normalizeAcademicYearConfig);
  }

  static async saveAcademicYear(year: AcademicYearConfig): Promise<AcademicYearConfig> {
    const saved = await apiClient.post<AcademicYearConfig>('/academic_years', year);
    return normalizeAcademicYearConfig(saved);
  }

  static subscribeAcademicYears(callback: (years: AcademicYearConfig[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<AcademicYearConfig[]>('academic_years', (years) => {
      const normalized = (years || []).map(normalizeAcademicYearConfig);
      callback(normalized);
    }, { tenantId });
  }
}
