import { apiClient } from '../api/apiClient';
import {
  EducationalPlanWeek,
  SpellingLesson,
  SeasonalProgram,
  SeasonalActivity,
  SeasonalParticipation,
  AcademicTermArchive,
} from '../../types';
import { StudentQuranPlan } from '../../quran/types/plan';
import { StageQuranConfig } from '../../quran/models/stageConfig';

export function sanitizeEducationalPlanWeek(w: any): EducationalPlanWeek {
  if (!w || typeof w !== 'object') {
    return w;
  }
  const sanitizeDate = (val: any): string => {
    if (typeof val === 'string' && val.trim() !== '' && val !== '{}') return val;
    if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().split('T')[0];
    return '';
  };
  return {
    ...w,
    startDate: sanitizeDate(w.startDate),
    endDate: sanitizeDate(w.endDate),
    budget: typeof w.budget === 'string' && !isNaN(Number(w.budget)) ? Number(w.budget) : (typeof w.budget === 'number' ? w.budget : 0),
    overallProjectBudget: typeof w.overallProjectBudget === 'string' && !isNaN(Number(w.overallProjectBudget)) ? Number(w.overallProjectBudget) : (typeof w.overallProjectBudget === 'number' ? w.overallProjectBudget : 0),
  };
}

export class AcademicRepository {
  static async getEducationalPlans(tenantId?: string): Promise<EducationalPlanWeek[]> {
    const plans = await apiClient.get<EducationalPlanWeek[]>('/educational_plan_weeks', tenantId ? { tenantId } : undefined);
    return (plans || []).map(sanitizeEducationalPlanWeek);
  }

  static async saveEducationalPlan(plan: EducationalPlanWeek): Promise<EducationalPlanWeek> {
    const saved = await apiClient.post<EducationalPlanWeek>('/educational_plan_weeks', plan);
    return sanitizeEducationalPlanWeek(saved);
  }

  static subscribeEducationalPlans(callback: (plans: EducationalPlanWeek[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<EducationalPlanWeek[]>('educational_plan_weeks', (plans) => {
      const sanitized = (plans || []).map(sanitizeEducationalPlanWeek);
      callback(sanitized);
    }, tenantId ? { tenantId } : undefined);
  }

  static async getSpellingLessons(stageId?: string): Promise<SpellingLesson[]> {
    return apiClient.get<SpellingLesson[]>('/spelling_lessons', stageId ? { stageId } : undefined);
  }

  static async saveSpellingLesson(lesson: SpellingLesson): Promise<SpellingLesson> {
    return apiClient.post<SpellingLesson>('/spelling_lessons', lesson);
  }

  static subscribeSpellingLessons(callback: (lessons: SpellingLesson[]) => void, stageId?: string): () => void {
    return apiClient.subscribe<SpellingLesson[]>('spelling_lessons', callback, stageId ? { stageId } : undefined);
  }

  static async getQuranPlans(tenantId?: string): Promise<StudentQuranPlan[]> {
    return apiClient.get<StudentQuranPlan[]>('/quran_plans', tenantId ? { tenantId } : undefined);
  }

  static async saveQuranPlan(plan: StudentQuranPlan): Promise<StudentQuranPlan> {
    return apiClient.post<StudentQuranPlan>('/quran_plans', plan);
  }

  static subscribeQuranPlans(callback: (plans: StudentQuranPlan[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<StudentQuranPlan[]>('quran_plans', callback, tenantId ? { tenantId } : undefined);
  }

  static async getStageQuranConfigs(): Promise<StageQuranConfig[]> {
    return apiClient.get<StageQuranConfig[]>('/quran_stage_configs');
  }

  static async saveStageQuranConfig(config: StageQuranConfig): Promise<StageQuranConfig> {
    return apiClient.post<StageQuranConfig>('/quran_stage_configs', config);
  }

  static subscribeStageQuranConfigs(callback: (configs: StageQuranConfig[]) => void): () => void {
    return apiClient.subscribe<StageQuranConfig[]>('quran_stage_configs', callback);
  }

  static async getSeasonalPrograms(tenantId?: string): Promise<SeasonalProgram[]> {
    return apiClient.get<SeasonalProgram[]>('/seasonal_programs', tenantId ? { tenantId } : undefined);
  }

  static async saveSeasonalProgram(program: SeasonalProgram): Promise<SeasonalProgram> {
    return apiClient.post<SeasonalProgram>('/seasonal_programs', program);
  }

  static async deleteSeasonalProgram(id: string): Promise<boolean> {
    return apiClient.delete(`/seasonal_programs/${id}`);
  }

  static subscribeSeasonalPrograms(callback: (programs: SeasonalProgram[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<SeasonalProgram[]>('seasonal_programs', callback, tenantId ? { tenantId } : undefined);
  }

  static async getSeasonalActivities(tenantId?: string): Promise<SeasonalActivity[]> {
    return apiClient.get<SeasonalActivity[]>('/seasonal_activities', tenantId ? { tenantId } : undefined);
  }

  static async saveSeasonalActivity(activity: SeasonalActivity): Promise<SeasonalActivity> {
    return apiClient.post<SeasonalActivity>('/seasonal_activities', activity);
  }

  static async deleteSeasonalActivity(id: string): Promise<boolean> {
    return apiClient.delete(`/seasonal_activities/${id}`);
  }

  static subscribeSeasonalActivities(callback: (activities: SeasonalActivity[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<SeasonalActivity[]>('seasonal_activities', callback, tenantId ? { tenantId } : undefined);
  }

  static async getSeasonalParticipations(tenantId?: string): Promise<SeasonalParticipation[]> {
    return apiClient.get<SeasonalParticipation[]>('/seasonal_participations', tenantId ? { tenantId } : undefined);
  }

  static async saveSeasonalParticipation(participation: SeasonalParticipation): Promise<SeasonalParticipation> {
    return apiClient.post<SeasonalParticipation>('/seasonal_participations', participation);
  }

  static async deleteSeasonalParticipation(id: string): Promise<boolean> {
    return apiClient.delete(`/seasonal_participations/${id}`);
  }

  static subscribeSeasonalParticipations(callback: (participations: SeasonalParticipation[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<SeasonalParticipation[]>('seasonal_participations', callback, tenantId ? { tenantId } : undefined);
  }

  static async getArchives(tenantId?: string): Promise<AcademicTermArchive[]> {
    return apiClient.get<AcademicTermArchive[]>('/academic_archives', tenantId ? { tenantId } : undefined);
  }

  static async saveArchive(archive: AcademicTermArchive): Promise<AcademicTermArchive> {
    return apiClient.post<AcademicTermArchive>('/academic_archives', archive);
  }

  static subscribeArchives(callback: (archives: AcademicTermArchive[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<AcademicTermArchive[]>('academic_archives', callback, tenantId ? { tenantId } : undefined);
  }
}
