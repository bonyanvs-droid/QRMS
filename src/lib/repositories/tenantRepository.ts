import { apiClient } from '../api/apiClient';
import { MosqueComplexTenant, EducationalStage, AcademicYearConfig } from '../../types';
import { syncAcademicConfigWithActiveTerm } from '../academicYearUtils';

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

  const parsedTerms = typeof raw.terms === 'string' ? (() => {
    try { return JSON.parse(raw.terms); } catch { return []; }
  })() : raw.terms;

  const base: AcademicYearConfig = {
    ...raw,
    name: raw.name || 'العام الدراسي 1447-1448 هـ',
    systemType: raw.systemType || raw.system_type || 'three_terms',
    activeTermId: raw.activeTermId || raw.active_term_id || 'term_1',
    terms: Array.isArray(parsedTerms) && parsedTerms.length > 0 ? parsedTerms : undefined,
    semester: raw.semester || 'الفصل الدراسي الأول',
    startDate: cleanDate(raw.startDate || raw.start_date, '2026-08-16'),
    endDate: cleanDate(raw.endDate || raw.end_date, '2026-11-12'),
    operationalStartWeek: cleanNum(raw.operationalStartWeek || raw.operational_start_week, 3),
    operationalEndWeek: cleanNum(raw.operationalEndWeek || raw.operational_end_week, 14),
    totalWeeks: cleanNum(raw.totalWeeks || raw.total_weeks, 12),
    currentWeek: cleanNum(raw.currentWeek || raw.current_week, 6),
    spellingPassingThreshold: cleanNum(raw.spellingPassingThreshold || raw.spelling_passing_threshold, 85),
    manualWeekOverride: !!(raw.manualWeekOverride ?? raw.manual_week_override),
  };

  return syncAcademicConfigWithActiveTerm(base);
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

  static async getTenantStats(idOrSlug: string): Promise<any | null> {
    try {
      return await apiClient.get<any>(`/tenants/${idOrSlug}/stats`);
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
