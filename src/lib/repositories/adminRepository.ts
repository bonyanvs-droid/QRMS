import { apiClient } from '../api/apiClient';
import {
  RegistrationRequest,
  TrackDefinition,
  TrackNomination,
  AssociationNomination,
  StudentBadge,
  StudentPointRule,
  StudentPointTransaction,
  RemedialActionPlan,
  Meeting,
  AttendanceRecord,
  TenantPrayerTimesDocument,
  FrontendConfig,
  AuditLog,
  ReportLog,
  EmergencySupportSession,
  Organization,
} from '../../types';

export class AdminRepository {
  // Organizations
  static async getOrganizations(): Promise<Organization[]> {
    return apiClient.get<Organization[]>('/organizations');
  }

  static async saveOrganization(org: Organization): Promise<Organization> {
    return apiClient.post<Organization>('/organizations', org);
  }

  static subscribeOrganizations(callback: (orgs: Organization[]) => void): () => void {
    return apiClient.subscribe<Organization[]>('organizations', callback);
  }

  // Registration Requests
  static async getRegistrationRequests(tenantId?: string): Promise<RegistrationRequest[]> {
    return apiClient.get<RegistrationRequest[]>('/registration_requests', tenantId ? { tenantId } : undefined);
  }

  static async saveRegistrationRequest(req: RegistrationRequest): Promise<RegistrationRequest> {
    return apiClient.post<RegistrationRequest>('/registration_requests', req);
  }

  static async deleteRegistrationRequest(id: string): Promise<boolean> {
    return apiClient.delete(`/registration_requests/${id}`);
  }

  static subscribeRegistrationRequests(callback: (requests: RegistrationRequest[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<RegistrationRequest[]>('registration_requests', callback, tenantId ? { tenantId } : undefined);
  }

  // Track Definitions
  static async getTrackDefinitions(tenantId?: string): Promise<TrackDefinition[]> {
    return apiClient.get<TrackDefinition[]>('/track_definitions', tenantId ? { tenantId } : undefined);
  }

  static async saveTrackDefinition(track: TrackDefinition): Promise<TrackDefinition> {
    return apiClient.post<TrackDefinition>('/track_definitions', track);
  }

  static async deleteTrackDefinition(id: string): Promise<boolean> {
    return apiClient.delete(`/track_definitions/${id}`);
  }

  static subscribeTrackDefinitions(callback: (tracks: TrackDefinition[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<TrackDefinition[]>('track_definitions', callback, tenantId ? { tenantId } : undefined);
  }

  // Track Nominations
  static async getTrackNominations(tenantId?: string): Promise<TrackNomination[]> {
    return apiClient.get<TrackNomination[]>('/track_nominations', tenantId ? { tenantId } : undefined);
  }

  static async saveTrackNomination(nomination: TrackNomination): Promise<TrackNomination> {
    return apiClient.post<TrackNomination>('/track_nominations', nomination);
  }

  static subscribeTrackNominations(callback: (nominations: TrackNomination[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<TrackNomination[]>('track_nominations', callback, tenantId ? { tenantId } : undefined);
  }

  // Association Nominations
  static async getAssociationNominations(tenantId?: string): Promise<AssociationNomination[]> {
    return apiClient.get<AssociationNomination[]>('/association_nominations', tenantId ? { tenantId } : undefined);
  }

  static async saveAssociationNomination(nomination: AssociationNomination): Promise<AssociationNomination> {
    return apiClient.post<AssociationNomination>('/association_nominations', nomination);
  }

  static subscribeAssociationNominations(callback: (nominations: AssociationNomination[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<AssociationNomination[]>('association_nominations', callback, tenantId ? { tenantId } : undefined);
  }

  // Badges
  static async getBadges(tenantId?: string): Promise<StudentBadge[]> {
    return apiClient.get<StudentBadge[]>('/student_badges', tenantId ? { tenantId } : undefined);
  }

  static async saveBadge(badge: StudentBadge): Promise<StudentBadge> {
    return apiClient.post<StudentBadge>('/student_badges', badge);
  }

  static async deleteBadge(id: string): Promise<boolean> {
    return apiClient.delete(`/student_badges/${id}`);
  }

  static subscribeBadges(callback: (badges: StudentBadge[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<StudentBadge[]>('student_badges', callback, tenantId ? { tenantId } : undefined);
  }

  // Point Rules
  static async getPointRules(tenantId?: string): Promise<StudentPointRule[]> {
    return apiClient.get<StudentPointRule[]>('/student_point_rules', tenantId ? { tenantId } : undefined);
  }

  static async savePointRule(rule: StudentPointRule): Promise<StudentPointRule> {
    return apiClient.post<StudentPointRule>('/student_point_rules', rule);
  }

  static subscribePointRules(callback: (rules: StudentPointRule[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<StudentPointRule[]>('student_point_rules', callback, tenantId ? { tenantId } : undefined);
  }

  // Points Transactions
  static async getPointTransactions(tenantId?: string): Promise<StudentPointTransaction[]> {
    return apiClient.get<StudentPointTransaction[]>('/student_points', tenantId ? { tenantId } : undefined);
  }

  static async savePointTransaction(tx: StudentPointTransaction): Promise<StudentPointTransaction> {
    return apiClient.post<StudentPointTransaction>('/student_points', tx);
  }

  static subscribePointTransactions(callback: (txs: StudentPointTransaction[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<StudentPointTransaction[]>('student_points', callback, tenantId ? { tenantId } : undefined);
  }

  // Remedial Plans
  static async getRemedialPlans(tenantId?: string): Promise<RemedialActionPlan[]> {
    return apiClient.get<RemedialActionPlan[]>('/remedial_plans', tenantId ? { tenantId } : undefined);
  }

  static async saveRemedialPlan(plan: RemedialActionPlan): Promise<RemedialActionPlan> {
    return apiClient.post<RemedialActionPlan>('/remedial_plans', plan);
  }

  static subscribeRemedialPlans(callback: (plans: RemedialActionPlan[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<RemedialActionPlan[]>('remedial_plans', callback, tenantId ? { tenantId } : undefined);
  }

  // Meetings
  static async getMeetings(tenantId?: string): Promise<Meeting[]> {
    return apiClient.get<Meeting[]>('/meetings', tenantId ? { tenantId } : undefined);
  }

  static async saveMeeting(meeting: Meeting): Promise<Meeting> {
    return apiClient.post<Meeting>('/meetings', meeting);
  }

  static async deleteMeeting(id: string): Promise<boolean> {
    return apiClient.delete(`/meetings/${id}`);
  }

  static subscribeMeetings(callback: (meetings: Meeting[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<Meeting[]>('meetings', callback, tenantId ? { tenantId } : undefined);
  }

  // Staff Attendance
  static async getStaffAttendance(tenantId?: string): Promise<AttendanceRecord[]> {
    return apiClient.get<AttendanceRecord[]>('/staff_attendance', tenantId ? { tenantId } : undefined);
  }

  static async saveStaffAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
    return apiClient.post<AttendanceRecord>('/staff_attendance', record);
  }

  static async deleteStaffAttendance(id: string): Promise<boolean> {
    return apiClient.delete(`/staff_attendance/${id}`);
  }

  static subscribeStaffAttendance(callback: (records: AttendanceRecord[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<AttendanceRecord[]>('staff_attendance', callback, tenantId ? { tenantId } : undefined);
  }

  // Prayer Times
  static async getPrayerTimes(tenantId?: string): Promise<TenantPrayerTimesDocument | null> {
    try {
      const items = await apiClient.get<TenantPrayerTimesDocument[]>('/prayer_times', tenantId ? { tenantId } : undefined);
      return items && items.length > 0 ? items[0] : null;
    } catch {
      return null;
    }
  }

  static async savePrayerTimes(doc: TenantPrayerTimesDocument): Promise<TenantPrayerTimesDocument> {
    return apiClient.post<TenantPrayerTimesDocument>('/prayer_times', doc);
  }

  static subscribePrayerTimes(callback: (doc: TenantPrayerTimesDocument) => void, tenantId?: string): () => void {
    return apiClient.subscribe<TenantPrayerTimesDocument[]>('prayer_times', (items) => {
      if (items && items.length > 0) {
        callback(items[0]);
      }
    }, tenantId ? { tenantId } : undefined);
  }

  // Frontend Configs
  static async getFrontendConfig(configId: string): Promise<FrontendConfig | null> {
    try {
      return await apiClient.get<FrontendConfig>(`/frontend_configs/${configId}`);
    } catch {
      return null;
    }
  }

  static async saveFrontendConfig(configId: string, config: Partial<FrontendConfig>): Promise<FrontendConfig> {
    return apiClient.post<FrontendConfig>('/frontend_configs', { ...config, id: configId });
  }

  // Audit Logs
  static async getAuditLogs(tenantId?: string): Promise<AuditLog[]> {
    return apiClient.get<AuditLog[]>('/audit_logs', tenantId ? { tenantId } : undefined);
  }

  static async saveAuditLog(log: AuditLog): Promise<AuditLog> {
    return apiClient.post<AuditLog>('/audit_logs', log);
  }

  static subscribeAuditLogs(callback: (logs: AuditLog[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<AuditLog[]>('audit_logs', callback, tenantId ? { tenantId } : undefined);
  }

  // Report Logs
  static async getReportLogs(tenantId?: string): Promise<ReportLog[]> {
    return apiClient.get<ReportLog[]>('/report_logs', tenantId ? { tenantId } : undefined);
  }

  static async saveReportLog(log: ReportLog): Promise<ReportLog> {
    return apiClient.post<ReportLog>('/report_logs', log);
  }

  static subscribeReportLogs(callback: (logs: ReportLog[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<ReportLog[]>('report_logs', callback, tenantId ? { tenantId } : undefined);
  }

  // Support Sessions
  static async getSupportSessions(tenantId?: string): Promise<EmergencySupportSession[]> {
    return apiClient.get<EmergencySupportSession[]>('/support_sessions', tenantId ? { tenantId } : undefined);
  }

  static async saveSupportSession(session: EmergencySupportSession): Promise<EmergencySupportSession> {
    return apiClient.post<EmergencySupportSession>('/support_sessions', session);
  }

  static subscribeSupportSessions(callback: (sessions: EmergencySupportSession[]) => void, tenantId?: string): () => void {
    return apiClient.subscribe<EmergencySupportSession[]>('support_sessions', callback, tenantId ? { tenantId } : undefined);
  }
}
