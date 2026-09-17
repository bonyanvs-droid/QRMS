import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { isCurrentSessionDemo } from './demoGuard';
import {
  AcademicYearConfig,
  DailySessionRecord,
  EducationalPlanWeek,
  Halaqah,
  ArchivedHalaqah,
  ReportLog,
  SpellingLesson,
  Student,
  Teacher,
  User,
  AuditLog,
  StudentBadge,
  RemedialActionPlan,
  MosqueComplexTenant,
  AcademicTermArchive,
  EducationalStage,
  RegistrationRequest,
  AdmissionStatus,
  StudentFinancialRecord,
  PaymentTransaction,
  PaymentStatus,
  AssociationNomination,
  NominationStatus,
  EmergencySupportSession,
  TrackDefinition,
  TrackNomination,
  TrackNominationStatus,
  AttendanceRecord,
  Organization,
  Meeting,
  SeasonalProgram,
  SeasonalActivity,
  SeasonalParticipation,
} from '../types';
import { StudentQuranPlan } from '../quran/types/plan';
import { normalizeStudentQuranPlan } from '../quran/utils/planNormalizer';
import { StageQuranConfig, DEFAULT_STAGE_CONFIGS } from '../quran/models/stageConfig';
import { recordAuditLog, sanitizeFirestoreData } from './auditService';
import {
  INITIAL_ACADEMIC_YEAR,
  INITIAL_SPELLING_LESSONS,
  INITIAL_EDUCATIONAL_PLAN,
  INITIAL_BADGES,
  INITIAL_REMEDIAL_PLANS,
  INITIAL_TENANTS,
  INITIAL_STAGES,
  INITIAL_ARCHIVES,
  INITIAL_ORGANIZATIONS,
} from '../data/initialData';
import {
  COMPREHENSIVE_HALAQAHS,
  COMPREHENSIVE_TEACHERS,
  COMPREHENSIVE_USERS,
  ALL_COMPREHENSIVE_STUDENTS,
  COMPREHENSIVE_SESSION_RECORDS,
} from '../data/multiStageRoster';

/**
 * Native SHA-256 password hashing.
 * Passwords are NEVER stored as plain text in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial default Admin credentials (hashed immediately)
const DEFAULT_ADMIN_PHONE = '0569990593';
const DEFAULT_ADMIN_NAME = 'د. نور إبراهيم محمد يوسف';

export interface DatabaseState {
  isInitialized: boolean;
  isSyncing: boolean;
  isOffline: boolean;
}

/**
 * Seeds and synchronizes all Educational Stages, Halaqahs (strictly linked to stageId),
 * Teachers, Users, and Students into Firestore.
 */
export async function seedAllStagesAndHalaqahsToFirestore(_force = false): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'تم إيقاف التعبئة التلقائية للبيانات حفاظاً على تصفير قاعدة البيانات.',
  };
}

/**
 * Ensures Firestore database health and retroactively synchronizes any historical
 * tenants into platform_users with their proper campus_admin credentials.
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    const healthRef = doc(db, '_health', 'status');
    const healthSnap = await getDoc(healthRef);
    if (!healthSnap.exists()) {
      await setDoc(healthRef, {
        status: 'active',
        initializedAt: new Date().toISOString(),
        source: 'cloud_firestore',
      });
    }
    // Retroactive synchronization for all tenants into platform_users
    await syncAllTenantsAdminUsers();
  } catch (err) {
    console.warn('[Firestore] Health check / tenant admin sync notice:', err);
  }
}

/**
 * Retroactively checks all tenants in the tenants collection and guarantees that each
 * tenant has its corresponding campus_admin account saved in platform_users.
 */
export async function syncAllTenantsAdminUsers(): Promise<void> {
  try {
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    if (tenantsSnap.empty) return;

    for (const tDoc of tenantsSnap.docs) {
      const tenant = { id: tDoc.id, ...tDoc.data() } as MosqueComplexTenant;
      const phone = tenant.contactPhone || (tenant as any).supervisorPhone || (tenant as any).phone || '';
      const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
      const defaultAdminPass = 'Admin@123456';

      // 1. Check if an admin user already exists for this tenant in platform_users
      const qTenant = query(
        collection(db, 'platform_users'),
        where('tenantId', '==', tenant.id),
        where('role', '==', 'campus_admin')
      );
      const snapTenant = await getDocs(qTenant);

      if (!snapTenant.empty) {
        // Update user record if needed (keep credentials up to date)
        const existingAdminDoc = snapTenant.docs[0];
        const existingData = existingAdminDoc.data();
        const needsUpdate =
          existingData.name !== (tenant.supervisorName || `مدير ${tenant.name}`) ||
          (phone && existingData.phone !== phone) ||
          existingData.isActive !== (tenant.isActive !== false);

        if (needsUpdate) {
          await setDoc(
            doc(db, 'platform_users', existingAdminDoc.id),
            sanitizeFirestoreData({
              name: tenant.supervisorName || `مدير ${tenant.name}`,
              fullName: tenant.supervisorName || `مدير ${tenant.name}`,
              phone: phone || existingData.phone || '',
              loginIdentifier: cleanPhone || existingData.loginIdentifier || phone,
              email: tenant.email || existingData.email || undefined,
              organizationId: tenant.organizationId || existingData.organizationId || null,
              isActive: tenant.isActive !== false,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        }
      } else {
        // Create the missing campus_admin document directly in platform_users
        const adminDocId = `usr_adm_${tenant.id}`;
        const passwordHash = await hashPassword(defaultAdminPass);

        await setDoc(
          doc(db, 'platform_users', adminDocId),
          sanitizeFirestoreData({
            id: adminDocId,
            name: tenant.supervisorName || `مدير ${tenant.name}`,
            fullName: tenant.supervisorName || `مدير ${tenant.name}`,
            phone: phone || '',
            loginIdentifier: cleanPhone || phone || `admin_${tenant.id}`,
            email: tenant.email || undefined,
            role: 'campus_admin',
            staffRole: 'supervisor',
            tenantId: tenant.id,
            organizationId: tenant.organizationId || null,
            passwordHash,
            isActive: tenant.isActive !== false,
            mustChangePassword: false,
            customPermissions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.warn('Notice syncing tenant administrators into platform_users:', err);
  }
}

// -------------------------------------------------------------
// Real-time Listeners (Reactive Multi-Device Synchronization)
// -------------------------------------------------------------

export function subscribeToUsers(
  tenantIdOrCallback: string | ((users: User[]) => void),
  optionalCallback?: (users: User[]) => void
): Unsubscribe {
  let tenantId: string | undefined;
  let callback: (users: User[]) => void;
  if (typeof tenantIdOrCallback === 'function') {
    callback = tenantIdOrCallback;
  } else {
    tenantId = tenantIdOrCallback;
    callback = optionalCallback || (() => {});
  }
  const q = tenantId
    ? query(collection(db, 'platform_users'), where('tenantId', '==', tenantId))
    : collection(db, 'platform_users');

  return onSnapshot(q as any, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        id: docSnap.id,
        name: data.fullName || data.name || '',
        fullName: data.fullName || data.name || '',
        phone: data.phone || '',
        nationalId: data.nationalId,
        loginIdentifier: data.loginIdentifier || data.nationalId || data.phone || docSnap.id,
        email: data.email,
        role: data.role || 'teacher',
        password: data.passwordHash || data.password,
        passwordHash: data.passwordHash,
        halaqahId: data.halaqahId,
        studentId: data.studentId,
        teacherId: data.teacherId,
        studentIds: data.studentIds,
        tenantId: data.tenantId,
        organizationId: data.organizationId,
        supervisionMode: data.supervisionMode,
        isActive: data.isActive ?? true,
        staffRole: data.staffRole,
        isArchived: data.isArchived ?? false,
        teacherArchived: data.teacherArchived ?? false,
        supervisorArchived: data.supervisorArchived ?? false,
        archivedAt: data.archivedAt,
        archivedBy: data.archivedBy,
        archiveReason: data.archiveReason,
        permissionMode: data.permissionMode,
        mustChangePassword: data.mustChangePassword ?? false,
        supervisorScope: data.supervisorScope,
        customPermissions: data.customPermissions,
        assignedStageIds: data.assignedStageIds,
        assignedHalaqahIds: data.assignedHalaqahIds,
        isAllHalaqahs: data.isAllHalaqahs ?? false,
        delegations: data.delegations,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    callback(users);
  }, (err) => {
    console.warn('Platform users subscription notice:', err.message);
  });
}

export function subscribeToHalaqahs(
  tenantIdOrCallback: string | ((halaqahs: Halaqah[]) => void),
  optionalCallback?: (halaqahs: Halaqah[]) => void
): Unsubscribe {
  let tenantId: string | undefined;
  let callback: (halaqahs: Halaqah[]) => void;

  if (typeof tenantIdOrCallback === 'function') {
    callback = tenantIdOrCallback;
  } else {
    tenantId = tenantIdOrCallback;
    callback = optionalCallback || (() => {});
  }

  // Subscribe to halaqahs collection with real-time updates
  const colRef = collection(db, 'halaqahs');

  return onSnapshot(colRef, (snapshot) => {
    const halaqahs: Halaqah[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Halaqah, 'id'>;
      const h: Halaqah = { id: docSnap.id, ...data };
      if (!tenantId) {
        halaqahs.push(h);
      } else {
        // Match explicit tenant or fallback equivalent IDs (ghazzawi vs tenant_ghazzawi or empty tenant)
        const docTenant = h.tenantId;
        if (!docTenant || docTenant === tenantId || (tenantId === 'ghazzawi' && (docTenant === 'tenant_ghazzawi' || docTenant === 'ghazzawi'))) {
          halaqahs.push(h);
        } else if (tenantId === 'tenant_ghazzawi' && (docTenant === 'ghazzawi' || docTenant === 'tenant_ghazzawi')) {
          halaqahs.push(h);
        } else if (docTenant === tenantId) {
          halaqahs.push(h);
        }
      }
    });
    callback(halaqahs);
  }, (err) => {
    console.warn('Halaqahs subscription notice:', err.message);
  });
}

export function subscribeToStudents(
  userRole: string,
  halaqahId?: string,
  callback?: (students: Student[]) => void,
  tenantId?: string
): Unsubscribe {
  const colRef = collection(db, 'students');

  return onSnapshot(colRef, (snapshot) => {
    const students: Student[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Student, 'id'>;
      const s: Student = { id: docSnap.id, ...data };

      let matchTenant = true;
      if (tenantId && tenantId !== 'all') {
        const docTenant = s.tenantId;
        if (docTenant) {
          if (tenantId === 'ghazzawi' || tenantId === 'tenant_ghazzawi') {
            matchTenant = docTenant === 'ghazzawi' || docTenant === 'tenant_ghazzawi';
          } else {
            matchTenant = docTenant === tenantId;
          }
        }
      }

      let matchRole = true;
      if (userRole === 'teacher' && halaqahId) {
        matchRole = s.halaqahId === halaqahId;
      }

      if (matchTenant && matchRole) {
        students.push(s);
      }
    });

    students.sort((a, b) => (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '', 'ar'));
    if (callback) callback(students);
  }, (err) => {
    console.warn('Students subscription notice:', err.message);
  });
}

export function subscribeToDailyRecords(
  userRole: string,
  halaqahId?: string,
  callback?: (records: DailySessionRecord[]) => void,
  tenantId?: string
): Unsubscribe {
  const colRef = collection(db, 'daily_records');

  return onSnapshot(colRef, (snapshot) => {
    const records: DailySessionRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<DailySessionRecord, 'id'>;
      const r: DailySessionRecord = { id: docSnap.id, ...data };

      let matchTenant = true;
      if (tenantId && tenantId !== 'all') {
        const docTenant = r.tenantId;
        if (docTenant) {
          if (tenantId === 'ghazzawi' || tenantId === 'tenant_ghazzawi') {
            matchTenant = docTenant === 'ghazzawi' || docTenant === 'tenant_ghazzawi';
          } else {
            matchTenant = docTenant === tenantId;
          }
        }
      }

      let matchRole = true;
      if (userRole === 'teacher' && halaqahId) {
        matchRole = r.halaqahId === halaqahId;
      }

      if (matchTenant && matchRole) {
        records.push(r);
      }
    });

    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (callback) callback(records);
  }, (err) => {
    console.warn('Daily records subscription notice:', err.message);
  });
}

export function subscribeToSpellingLessons(callback: (lessons: SpellingLesson[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'spelling_lessons'), orderBy('lessonNumber', 'asc')), (snapshot) => {
    const lessons: SpellingLesson[] = [];
    snapshot.forEach((doc) => {
      lessons.push({ id: doc.id, ...(doc.data() as Omit<SpellingLesson, 'id'>) });
    });
    callback(lessons);
  }, (err) => {
    console.warn('Spelling lessons subscription notice:', err.message);
  });
}

export function subscribeToEducationalPlan(callback: (plan: EducationalPlanWeek[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'educational_plan'), orderBy('weekNumber', 'asc')), (snapshot) => {
    const plan: EducationalPlanWeek[] = [];
    snapshot.forEach((doc) => {
      plan.push({ id: doc.id, ...(doc.data() as Omit<EducationalPlanWeek, 'id'>) });
    });
    callback(plan);
  }, (err) => {
    console.warn('Educational plan subscription notice:', err.message);
  });
}

export function subscribeToSeasonalPrograms(callback: (programs: SeasonalProgram[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'seasonal_programs'), (snapshot) => {
    const list: SeasonalProgram[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...(doc.data() as Omit<SeasonalProgram, 'id'>) });
    });
    callback(list);
  }, (err) => {
    console.warn('Seasonal programs subscription notice:', err.message);
  });
}

export function subscribeToSeasonalActivities(callback: (activities: SeasonalActivity[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'seasonal_activities'), (snapshot) => {
    const list: SeasonalActivity[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...(doc.data() as Omit<SeasonalActivity, 'id'>) });
    });
    callback(list);
  }, (err) => {
    console.warn('Seasonal activities subscription notice:', err.message);
  });
}

export function subscribeToSeasonalParticipations(callback: (participations: SeasonalParticipation[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'seasonal_participations'), (snapshot) => {
    const list: SeasonalParticipation[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...(doc.data() as Omit<SeasonalParticipation, 'id'>) });
    });
    callback(list);
  }, (err) => {
    console.warn('Seasonal participations subscription notice:', err.message);
  });
}

export function subscribeToAcademicConfig(callback: (config: AcademicYearConfig) => void): Unsubscribe {
  return onSnapshot(doc(db, 'academic_years', INITIAL_ACADEMIC_YEAR.id), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...(docSnap.data() as Omit<AcademicYearConfig, 'id'>) });
    }
  }, (err) => {
    console.warn('Academic config subscription notice:', err.message);
  });
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
    const logs: AuditLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...(doc.data() as Omit<AuditLog, 'id'>) });
    });
    callback(logs);
  }, (err) => {
    console.warn('Audit logs subscription notice:', err.message);
  });
}

export function subscribeToReportLogs(callback: (logs: ReportLog[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'report_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
    const logs: ReportLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...(doc.data() as Omit<ReportLog, 'id'>) });
    });
    callback(logs);
  }, (err) => {
    console.warn('Report logs subscription notice:', err.message);
  });
}

export function subscribeToBadges(
  arg1: string | ((badges: StudentBadge[]) => void),
  arg2?: string | ((badges: StudentBadge[]) => void)
): Unsubscribe {
  let tenantId: string | undefined;
  let callback: (badges: StudentBadge[]) => void = () => {};

  if (typeof arg1 === 'function') {
    callback = arg1;
    if (typeof arg2 === 'string') tenantId = arg2;
  } else if (typeof arg1 === 'string') {
    tenantId = arg1;
    if (typeof arg2 === 'function') callback = arg2;
  }

  const q = tenantId
    ? query(collection(db, 'badges'), where('tenantId', '==', tenantId), orderBy('awardedAt', 'desc'))
    : query(collection(db, 'badges'), orderBy('awardedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const badges: StudentBadge[] = [];
    snapshot.forEach((doc) => {
      badges.push({ id: doc.id, ...(doc.data() as Omit<StudentBadge, 'id'>) });
    });
    callback(badges);
  }, (err) => {
    console.warn('Badges subscription notice:', err.message);
  });
}

export function subscribeToRemedialPlans(
  userRole: string,
  halaqahId?: string,
  callback?: (plans: RemedialActionPlan[]) => void,
  tenantId?: string
): Unsubscribe {
  const constraints: any[] = [];
  if (tenantId) {
    constraints.push(where('tenantId', '==', tenantId));
  }
  if (userRole === 'teacher' && halaqahId) {
    constraints.push(where('halaqahId', '==', halaqahId));
  }
  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, 'remedial_plans'), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const plans: RemedialActionPlan[] = [];
    snapshot.forEach((doc) => {
      plans.push({ id: doc.id, ...(doc.data() as Omit<RemedialActionPlan, 'id'>) });
    });
    if (callback) callback(plans);
  }, (err) => {
    console.warn('Remedial plans subscription notice:', err.message);
  });
}

// -------------------------------------------------------------
// P4: Admissions & Registration Subscriptions
// -------------------------------------------------------------
export function subscribeToAdmissions(
  tenantId: string,
  callback: (requests: RegistrationRequest[]) => void
): Unsubscribe {
  const colRef = collection(db, 'registration_requests');

  return onSnapshot(colRef, (snapshot) => {
    const requests: RegistrationRequest[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<RegistrationRequest, 'id'>;
      const r: RegistrationRequest = { id: docSnap.id, ...data };
      if (!tenantId || tenantId === 'all') {
        requests.push(r);
      } else {
        const docTenant = r.tenantId;
        if (!docTenant || docTenant === tenantId ||
           ((tenantId === 'ghazzawi' || tenantId === 'tenant_ghazzawi') && (docTenant === 'ghazzawi' || docTenant === 'tenant_ghazzawi'))) {
          requests.push(r);
        }
      }
    });
    // Sort client-side by createdAt desc
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(requests);
  }, (err) => {
    console.warn('Admissions subscription notice:', err.message);
  });
}

// -------------------------------------------------------------
// P5: Financial Records Subscriptions
// -------------------------------------------------------------
export function subscribeToFinancialRecords(
  tenantId: string,
  callback: (records: StudentFinancialRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'financial_records'),
    where('tenantId', '==', tenantId)
  );

  return onSnapshot(q, (snapshot) => {
    const records: StudentFinancialRecord[] = [];
    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...(doc.data() as Omit<StudentFinancialRecord, 'id'>) });
    });
    callback(records);
  }, (err) => {
    console.warn('Financial records subscription notice:', err.message);
  });
}

// -------------------------------------------------------------
// P6: Association Nominations Subscriptions
// -------------------------------------------------------------
export function subscribeToNominations(
  tenantId: string,
  callback: (noms: AssociationNomination[]) => void,
  halaqahId?: string
): Unsubscribe {
  const colRef = collection(db, 'association_nominations');

  return onSnapshot(colRef, (snapshot) => {
    const noms: AssociationNomination[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<AssociationNomination, 'id'>;
      const n: AssociationNomination = { id: docSnap.id, ...data };
      let matchTenant = true;
      if (tenantId && tenantId !== 'all') {
        const docTenant = n.tenantId;
        if (docTenant) {
          if (tenantId === 'ghazzawi' || tenantId === 'tenant_ghazzawi') {
            matchTenant = docTenant === 'ghazzawi' || docTenant === 'tenant_ghazzawi';
          } else {
            matchTenant = docTenant === tenantId;
          }
        }
      }
      let matchHalaqah = true;
      if (halaqahId) {
        matchHalaqah = n.halaqahId === halaqahId;
      }
      if (matchTenant && matchHalaqah) {
        noms.push(n);
      }
    });
    callback(noms);
  }, (err) => {
    console.warn('Nominations subscription notice:', err.message);
  });
}

// -------------------------------------------------------------
// P8: Track Definitions & Track Nominations Subscriptions
// -------------------------------------------------------------
export function subscribeToTrackDefinitions(
  tenantId: string,
  callback: (tracks: TrackDefinition[]) => void
): Unsubscribe {
  const q = query(collection(db, 'track_definitions'));
  return onSnapshot(q, (snapshot) => {
    const tracks: TrackDefinition[] = [];
    snapshot.forEach((doc) => {
      tracks.push({ id: doc.id, ...(doc.data() as Omit<TrackDefinition, 'id'>) });
    });
    // Filter tracks matching tenant or global (tenantId undefined or empty or equal)
    const filtered = tracks.filter((t) => !t.tenantId || t.tenantId === tenantId);
    callback(filtered);
  }, (err) => {
    console.warn('Track definitions subscription notice:', err.message);
  });
}

export function subscribeToTrackNominations(
  tenantId: string,
  callback: (noms: TrackNomination[]) => void,
  halaqahId?: string
): Unsubscribe {
  const colRef = collection(db, 'track_nominations');

  return onSnapshot(colRef, (snapshot) => {
    const noms: TrackNomination[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<TrackNomination, 'id'>;
      const n: TrackNomination = { id: docSnap.id, ...data };
      let matchTenant = true;
      if (tenantId && tenantId !== 'all') {
        const docTenant = n.tenantId;
        if (docTenant) {
          if (tenantId === 'ghazzawi' || tenantId === 'tenant_ghazzawi') {
            matchTenant = docTenant === 'ghazzawi' || docTenant === 'tenant_ghazzawi';
          } else {
            matchTenant = docTenant === tenantId;
          }
        }
      }
      let matchHalaqah = true;
      if (halaqahId) {
        matchHalaqah = n.halaqahId === halaqahId;
      }
      if (matchTenant && matchHalaqah) {
        noms.push(n);
      }
    });
    callback(noms);
  }, (err) => {
    console.warn('Track nominations subscription notice:', err.message);
  });
}

// -------------------------------------------------------------
// P7: Emergency Support Sessions Subscriptions
// -------------------------------------------------------------
export function subscribeToSupportSessions(
  tenantId: string,
  callback: (sessions: EmergencySupportSession[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'support_sessions'),
    where('tenantId', '==', tenantId),
    where('isActive', '==', true)
  );

  return onSnapshot(q, (snapshot) => {
    const sessions: EmergencySupportSession[] = [];
    const now = new Date().toISOString();
    snapshot.forEach((doc) => {
      const data = doc.data() as Omit<EmergencySupportSession, 'id'>;
      if (data.expiresAt > now) {
        sessions.push({ id: doc.id, ...data });
      }
    });
    callback(sessions);
  }, (err) => {
    console.warn('Support sessions subscription notice:', err.message);
  });
}

export function subscribeToTenants(callback: (tenants: MosqueComplexTenant[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'tenants'), (snapshot) => {
    const tenants: MosqueComplexTenant[] = [];
    snapshot.forEach((doc) => {
      tenants.push({ id: doc.id, ...(doc.data() as Omit<MosqueComplexTenant, 'id'>) });
    });
    callback(tenants);
  }, (err) => {
    console.warn('Tenants subscription notice:', err.message);
  });
}

export function subscribeToStages(callback: (stages: EducationalStage[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'educational_stages'), orderBy('order', 'asc')), (snapshot) => {
    const stages: EducationalStage[] = [];
    snapshot.forEach((doc) => {
      stages.push({ id: doc.id, ...(doc.data() as Omit<EducationalStage, 'id'>) });
    });
    callback(stages);
  }, (err) => {
    console.warn('Stages subscription notice:', err.message);
  });
}

export function subscribeToArchives(callback: (archives: AcademicTermArchive[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'academic_archives'), orderBy('archivedAt', 'desc')), (snapshot) => {
    const archives: AcademicTermArchive[] = [];
    snapshot.forEach((doc) => {
      archives.push({ id: doc.id, ...(doc.data() as Omit<AcademicTermArchive, 'id'>) });
    });
    callback(archives);
  }, (err) => {
    console.warn('Archives subscription notice:', err.message);
  });
}

export function subscribeToOrganizations(callback: (orgs: Organization[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'organizations'), (snapshot) => {
    const orgs: Organization[] = [];
    snapshot.forEach((doc) => {
      orgs.push({ id: doc.id, ...(doc.data() as Omit<Organization, 'id'>) });
    });
    if (orgs.length === 0) {
      callback(INITIAL_ORGANIZATIONS);
      return;
    }
    callback(orgs);
  }, (err) => {
    console.warn('Organizations subscription notice:', err.message);
    callback(INITIAL_ORGANIZATIONS);
  });
}

// -------------------------------------------------------------
// Mutation Operations (With Audit Logging and Offline Support)
// -------------------------------------------------------------

export async function saveStudent(student: Student, actor: { id: string; name: string; role: any }): Promise<void> {
  const ref = doc(db, 'students', student.id);
  const existing = await getDoc(ref);
  const isNew = !existing.exists();

  await setDoc(ref, sanitizeFirestoreData({
    ...student,
    updatedAt: new Date().toISOString(),
    ...(isNew ? { createdAt: new Date().toISOString() } : {}),
  }));

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'student',
    entityId: student.id,
    entityName: student.fullName,
    previousValue: isNew ? null : (existing.data() || null),
    newValue: student,
  });
}

export async function deleteStudent(studentId: string, actor: { id: string; name: string; role: any }): Promise<void> {
  const ref = doc(db, 'students', studentId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data();
    await deleteDoc(ref);
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'student',
      entityId: studentId,
      entityName: data.fullName,
      previousValue: data,
    });
  }
}

export async function saveHalaqah(halaqah: Halaqah, actor: { id: string; name: string; role: any }): Promise<void> {
  const ref = doc(db, 'halaqahs', halaqah.id);
  const existing = await getDoc(ref);
  const isNew = !existing.exists();

  await setDoc(ref, sanitizeFirestoreData({
    ...halaqah,
    updatedAt: new Date().toISOString(),
    ...(isNew ? { createdAt: new Date().toISOString() } : {}),
  }));

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'halaqah',
    entityId: halaqah.id,
    entityName: halaqah.name,
    previousValue: isNew ? null : (existing.data() || null),
    newValue: halaqah,
  });
}

export async function archiveHalaqah(
  halaqah: Halaqah,
  actor: { id: string; name: string; role: any },
  reason?: string
): Promise<void> {
  const archivePayload: ArchivedHalaqah = {
    ...halaqah,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: actor.name || 'مدير النظام',
    archiveReason: reason || 'أرشفة يدوية تحسباً للخطأ',
  };

  // 1. Save to archived_halaqahs collection
  await setDoc(doc(db, 'archived_halaqahs', halaqah.id), sanitizeFirestoreData(archivePayload), { merge: true });

  // 2. Delete from active halaqahs collection
  await deleteDoc(doc(db, 'halaqahs', halaqah.id)).catch(() => {});

  // 3. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'halaqah',
    entityId: halaqah.id,
    entityName: halaqah.name,
    previousValue: halaqah,
    newValue: archivePayload,
    notes: `تمت أرشفة الحلقة [${halaqah.name}] وتخزينها في الأرشيف لحفظ البيانات وإمكانية استعادتها لاحقاً`,
  });
}

export async function deleteHalaqah(
  halaqahId: string,
  actor: { id: string; name: string; role: any },
  halaqahDataFallback?: Halaqah
): Promise<void> {
  const ref = doc(db, 'halaqahs', halaqahId);
  const existing = await getDoc(ref);
  const data = existing.exists() ? (existing.data() as Halaqah) : halaqahDataFallback;

  if (data) {
    await archiveHalaqah(data, actor, 'أرشفة يدوية عند الحذف تحسباً للخطأ');
  } else {
    await deleteDoc(ref);
  }
}

export async function restoreHalaqah(
  archivedHalaqah: ArchivedHalaqah,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const restoredPayload: Halaqah = {
    ...archivedHalaqah,
    isArchived: false,
    isActive: true,
  };
  delete (restoredPayload as any).archivedAt;
  delete (restoredPayload as any).archivedBy;
  delete (restoredPayload as any).archiveReason;

  // 1. Restore to active halaqahs
  await setDoc(doc(db, 'halaqahs', archivedHalaqah.id), sanitizeFirestoreData(restoredPayload), { merge: true });

  // 2. Delete from archived_halaqahs
  await deleteDoc(doc(db, 'archived_halaqahs', archivedHalaqah.id)).catch(() => {});

  // 3. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'create',
    entityType: 'halaqah',
    entityId: archivedHalaqah.id,
    entityName: archivedHalaqah.name,
    previousValue: archivedHalaqah,
    newValue: restoredPayload,
    notes: `تمت استعادة الحلقة [${archivedHalaqah.name}] من الأرشيف بنجاح وإعادتها للخدمة`,
  });
}

export async function permanentlyDeleteArchivedHalaqah(
  halaqahId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  await deleteDoc(doc(db, 'archived_halaqahs', halaqahId));
  await deleteDoc(doc(db, 'halaqahs', halaqahId)).catch(() => {});
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'halaqah',
    entityId: halaqahId,
    entityName: halaqahId,
    notes: `حذف نهائي للحلقة المؤرشفة [${halaqahId}]`,
  });
}

export function subscribeToArchivedHalaqahs(
  tenantId: string | undefined,
  callback: (archived: ArchivedHalaqah[]) => void
): Unsubscribe {
  const colRef = collection(db, 'archived_halaqahs');
  const q = tenantId ? query(colRef, where('tenantId', '==', tenantId)) : colRef;
  return onSnapshot(
    q,
    (snapshot) => {
      const archived: ArchivedHalaqah[] = [];
      snapshot.forEach((d) => {
        archived.push({ id: d.id, ...(d.data() as Omit<ArchivedHalaqah, 'id'>) });
      });
      callback(archived);
    },
    (err) => {
      console.warn('Notice subscribing to archived_halaqahs:', err);
      callback([]);
    }
  );
}

export function subscribeToArchivedUsers(
  tenantId: string | undefined,
  callback: (archived: User[]) => void
): Unsubscribe {
  const colRef = collection(db, 'archived_users');
  const q = tenantId ? query(colRef, where('tenantId', '==', tenantId)) : colRef;
  return onSnapshot(
    q,
    (snapshot) => {
      const archived: User[] = [];
      snapshot.forEach((d) => {
        archived.push({ id: d.id, ...(d.data() as User) });
      });
      callback(archived);
    },
    (err) => {
      console.warn('Notice subscribing to archived_users:', err);
      callback([]);
    }
  );
}

export function subscribeToArchivedTeachers(
  tenantId: string | undefined,
  callback: (archived: Teacher[]) => void
): Unsubscribe {
  const colRef = collection(db, 'archived_teachers');
  const q = tenantId ? query(colRef, where('tenantId', '==', tenantId)) : colRef;
  return onSnapshot(
    q,
    (snapshot) => {
      const archived: Teacher[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Teacher;
        // Strict isolation: absolutely no supervisors in teachers archive
        if (data.staffRole === 'supervisor' || (data as any).role === 'supervisor' || data.archiveType === 'supervisor' || data.supervisorArchived || d.id.startsWith('usr_sup_')) {
          return;
        }
        archived.push({ id: d.id, ...data, isArchived: true, teacherArchived: true, archiveType: 'teacher' });
      });
      callback(archived);
    },
    (err) => {
      console.warn('Notice subscribing to archived_teachers:', err);
      callback([]);
    }
  );
}

export function subscribeToArchivedSupervisors(
  tenantId: string | undefined,
  callback: (archived: User[]) => void
): Unsubscribe {
  const colRef = collection(db, 'archived_supervisors');
  const q = tenantId ? query(colRef, where('tenantId', '==', tenantId)) : colRef;
  return onSnapshot(
    q,
    (snapshot) => {
      const archived: User[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as User;
        // Strict isolation: absolutely no teachers in supervisors archive
        if (data.role === 'teacher' || data.staffRole === 'teacher' || data.archiveType === 'teacher' || data.teacherArchived || d.id.startsWith('usr_teacher_')) {
          return;
        }
        archived.push({ id: d.id, ...data, isArchived: true, supervisorArchived: true, archiveType: 'supervisor' });
      });
      callback(archived);
    },
    (err) => {
      console.warn('Notice subscribing to archived_supervisors:', err);
      callback([]);
    }
  );
}

export async function saveUser(
  user: Omit<User, 'password'> & { plainPassword?: string },
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'platform_users', user.id);
  const existing = await getDoc(ref);
  const isNew = !existing.exists();

  const updatePayload: Record<string, any> = {
    id: user.id,
    name: user.name,
    fullName: user.fullName || user.name,
    phone: user.phone || '',
    role: user.role,
    isActive: user.isActive !== false,
    halaqahId: user.halaqahId || null,
    tenantId: user.tenantId || null,
    updatedAt: new Date().toISOString(),
  };

  if (user.nationalId) updatePayload.nationalId = user.nationalId;
  if (user.loginIdentifier) {
    updatePayload.loginIdentifier = user.loginIdentifier;
  } else if (user.role === 'student' && user.nationalId) {
    updatePayload.loginIdentifier = user.nationalId;
  } else if (user.phone) {
    updatePayload.loginIdentifier = user.phone;
  } else {
    updatePayload.loginIdentifier = user.id;
  }

  if (user.email) updatePayload.email = user.email;
  if (user.studentId) updatePayload.studentId = user.studentId;
  if (user.teacherId) updatePayload.teacherId = user.teacherId;
  if (user.studentIds) updatePayload.studentIds = user.studentIds;
  if (user.supervisorScope) updatePayload.supervisorScope = user.supervisorScope;
  if (user.customPermissions) updatePayload.customPermissions = user.customPermissions;
  if (user.assignedStageIds) updatePayload.assignedStageIds = user.assignedStageIds;
  if (user.assignedHalaqahIds) updatePayload.assignedHalaqahIds = user.assignedHalaqahIds;
  if (user.isAllHalaqahs !== undefined) updatePayload.isAllHalaqahs = user.isAllHalaqahs;
  if (user.delegations) updatePayload.delegations = user.delegations;

  if (user.staffRole) updatePayload.staffRole = user.staffRole;
  if (user.isArchived !== undefined) updatePayload.isArchived = user.isArchived;
  if (user.teacherArchived !== undefined) updatePayload.teacherArchived = user.teacherArchived;
  if (user.supervisorArchived !== undefined) updatePayload.supervisorArchived = user.supervisorArchived;
  if (user.archivedAt) updatePayload.archivedAt = user.archivedAt;
  if (user.archivedBy) updatePayload.archivedBy = user.archivedBy;
  if (user.archiveReason) updatePayload.archiveReason = user.archiveReason;
  if (user.permissionMode) updatePayload.permissionMode = user.permissionMode;

  if (user.mustChangePassword !== undefined) {
    updatePayload.mustChangePassword = user.mustChangePassword;
  }

  if (user.plainPassword) {
    updatePayload.passwordHash = await hashPassword(user.plainPassword);
  }

  if (isNew) {
    updatePayload.createdAt = new Date().toISOString();
    if (!updatePayload.passwordHash) {
      updatePayload.passwordHash = await hashPassword('Admin@123456');
      updatePayload.mustChangePassword = true;
    }
    await setDoc(ref, sanitizeFirestoreData(updatePayload), { merge: true });
  } else {
    await setDoc(ref, sanitizeFirestoreData(updatePayload), { merge: true });
  }

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'auth',
    entityId: user.id,
    entityName: user.name,
    previousValue: isNew ? null : (existing.data() || null),
    newValue: updatePayload,
  });
}

export async function archiveUser(
  user: User,
  actor: { id: string; name: string; role: any },
  reason?: string
): Promise<void> {
  const archivePayload: Record<string, any> = {
    ...user,
    isActive: user.isActive ?? false,
    isArchived: user.isArchived ?? true,
    teacherArchived: user.teacherArchived ?? false,
    supervisorArchived: user.supervisorArchived ?? false,
    archivedAt: user.archivedAt || new Date().toISOString(),
    archivedBy: user.archivedBy || actor.name || 'مدير النظام',
    archiveReason: reason || user.archiveReason || 'أرشفة يدوية تحسباً للخطأ',
    updatedAt: new Date().toISOString(),
  };

  // 1. Save to archived_users collection
  await setDoc(doc(db, 'archived_users', user.id), sanitizeFirestoreData(archivePayload), { merge: true });

  // 2. Mark as archived in platform_users using setDoc with merge so it never fails if document was not yet created
  await setDoc(doc(db, 'platform_users', user.id), sanitizeFirestoreData({
    id: user.id,
    name: user.name,
    fullName: user.fullName || user.name,
    phone: user.phone || '',
    role: user.role,
    staffRole: user.staffRole,
    tenantId: user.tenantId || null,
    isActive: archivePayload.isActive,
    isArchived: archivePayload.isArchived,
    teacherArchived: archivePayload.teacherArchived,
    supervisorArchived: archivePayload.supervisorArchived,
    archivedAt: archivePayload.archivedAt,
    archivedBy: archivePayload.archivedBy,
    archiveReason: archivePayload.archiveReason,
    updatedAt: archivePayload.updatedAt,
  }), { merge: true });

  // 3. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'auth',
    entityId: user.id,
    entityName: user.name,
    previousValue: user,
    newValue: archivePayload,
    notes: `تمت أرشفة المستخدم [${user.name}] (${user.role}) ونقله للأرشيف لحفظ البيانات`,
  });
}

export async function restoreUser(
  userId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'platform_users', userId);
  await setDoc(ref, {
    isActive: true,
    isArchived: false,
    teacherArchived: false,
    supervisorArchived: false,
    archivedAt: deleteField(),
    archivedBy: deleteField(),
    archiveReason: deleteField(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Remove from archived_users
  await deleteDoc(doc(db, 'archived_users', userId)).catch(() => {});

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'auth',
    entityId: userId,
    entityName: userId,
    previousValue: null,
    newValue: { isActive: true, isArchived: false },
    notes: `تمت استعادة المستخدم [${userId}] من الأرشيف بنجاح وإعادة تفعيل حسابه`,
  });
}

export async function permanentlyDeleteUser(
  userId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'platform_users', userId);
  const existing = await getDoc(ref);
  const data = existing.data();
  await deleteDoc(ref).catch(() => {});
  await deleteDoc(doc(db, 'archived_users', userId)).catch(() => {});

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'auth',
    entityId: userId,
    entityName: data?.name || userId,
    notes: `تم حذف المستخدم [${userId}] نهائياً من النظام بعد تأكيد الإدارة`,
  });
}

// -------------------------------------------------------------
// Teachers Dedicated Archive Operations (Isolated)
// -------------------------------------------------------------
export async function archiveTeacherInDb(
  teacher: Teacher,
  actor: { id: string; name: string; role: any },
  reason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const archivePayload: Record<string, any> = {
    ...teacher,
    isActive: false,
    isArchived: true,
    teacherArchived: true,
    supervisorArchived: false,
    archiveType: 'teacher',
    staffRole: 'teacher',
    archivedAt: teacher.archivedAt || nowIso,
    archivedBy: teacher.archivedBy || actor.name || 'مدير النظام',
    archiveReason: reason || teacher.archiveReason || 'أرشفة المعلم تحسباً للخطأ',
    updatedAt: nowIso,
  };

  // 1. Save to archived_teachers collection
  await setDoc(doc(db, 'archived_teachers', teacher.id), sanitizeFirestoreData(archivePayload), { merge: true });

  // 2. Remove from archived_supervisors if it was ever there mistakenly
  await deleteDoc(doc(db, 'archived_supervisors', teacher.id)).catch(() => {});

  // 3. Mark as archived in platform_users
  await setDoc(doc(db, 'platform_users', teacher.id), sanitizeFirestoreData({
    id: teacher.id,
    name: teacher.name,
    fullName: teacher.name,
    phone: teacher.phone || '',
    role: 'teacher',
    staffRole: 'teacher',
    tenantId: teacher.tenantId || null,
    isActive: false,
    isArchived: true,
    teacherArchived: true,
    supervisorArchived: false,
    archiveType: 'teacher',
    archivedAt: archivePayload.archivedAt,
    archivedBy: archivePayload.archivedBy,
    archiveReason: archivePayload.archiveReason,
    updatedAt: nowIso,
  }), { merge: true });

  // 4. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'auth',
    entityId: teacher.id,
    entityName: teacher.name,
    previousValue: teacher,
    newValue: archivePayload,
    notes: `تمت أرشفة المعلم [${teacher.name}] ونقله لأرشيف المعلمين المستقل`,
  });
}

export async function restoreTeacherFromDb(
  teacherId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const nowIso = new Date().toISOString();
  // 1. Remove from archived_teachers collection
  await deleteDoc(doc(db, 'archived_teachers', teacherId)).catch(() => {});
  await deleteDoc(doc(db, 'archived_users', teacherId)).catch(() => {});

  // 2. Update platform_users
  await setDoc(doc(db, 'platform_users', teacherId), sanitizeFirestoreData({
    isActive: true,
    isArchived: false,
    teacherArchived: false,
    supervisorArchived: false,
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    archiveType: null,
    updatedAt: nowIso,
  }), { merge: true });

  // 3. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'auth',
    entityId: teacherId,
    entityName: teacherId,
    previousValue: null,
    newValue: { isActive: true, isArchived: false, teacherArchived: false },
    notes: `تمت استعادة المعلم [${teacherId}] من أرشيف المعلمين وإعادة تفعيله`,
  });
}

export async function permanentlyDeleteTeacherFromDb(
  teacherId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  await deleteDoc(doc(db, 'archived_teachers', teacherId)).catch(() => {});
  await deleteDoc(doc(db, 'archived_users', teacherId)).catch(() => {});
  await deleteDoc(doc(db, 'platform_users', teacherId)).catch(() => {});

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'auth',
    entityId: teacherId,
    entityName: teacherId,
    notes: `تم حذف المعلم [${teacherId}] نهائياً من النظام وأرشيف المعلمين`,
  });
}

// -------------------------------------------------------------
// Supervisors Dedicated Archive Operations (Isolated)
// -------------------------------------------------------------
export async function archiveSupervisorInDb(
  supervisor: User,
  actor: { id: string; name: string; role: any },
  reason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const archivePayload: Record<string, any> = {
    ...supervisor,
    role: 'supervisor',
    staffRole: 'supervisor',
    isActive: false,
    isArchived: true,
    supervisorArchived: true,
    teacherArchived: false,
    archiveType: 'supervisor',
    archivedAt: supervisor.archivedAt || nowIso,
    archivedBy: supervisor.archivedBy || actor.name || 'مدير النظام',
    archiveReason: reason || supervisor.archiveReason || 'أرشفة المشرف تحسباً للخطأ',
    updatedAt: nowIso,
  };

  // 1. Save to archived_supervisors collection
  await setDoc(doc(db, 'archived_supervisors', supervisor.id), sanitizeFirestoreData(archivePayload), { merge: true });

  // 2. Remove from archived_teachers if it was ever there mistakenly
  await deleteDoc(doc(db, 'archived_teachers', supervisor.id)).catch(() => {});

  // 3. Mark as archived in platform_users
  await setDoc(doc(db, 'platform_users', supervisor.id), sanitizeFirestoreData({
    id: supervisor.id,
    name: supervisor.name,
    fullName: supervisor.fullName || supervisor.name,
    phone: supervisor.phone || '',
    role: 'supervisor',
    staffRole: 'supervisor',
    tenantId: supervisor.tenantId || null,
    isActive: false,
    isArchived: true,
    supervisorArchived: true,
    teacherArchived: false,
    archiveType: 'supervisor',
    archivedAt: archivePayload.archivedAt,
    archivedBy: archivePayload.archivedBy,
    archiveReason: archivePayload.archiveReason,
    updatedAt: nowIso,
  }), { merge: true });

  // 4. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'auth',
    entityId: supervisor.id,
    entityName: supervisor.name,
    previousValue: supervisor,
    newValue: archivePayload,
    notes: `تمت أرشفة المشرف [${supervisor.name}] ونقله لأرشيف المشرفين المستقل`,
  });
}

export async function restoreSupervisorFromDb(
  supervisorId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const nowIso = new Date().toISOString();
  // 1. Remove from archived_supervisors collection
  await deleteDoc(doc(db, 'archived_supervisors', supervisorId)).catch(() => {});
  await deleteDoc(doc(db, 'archived_users', supervisorId)).catch(() => {});

  // 2. Update platform_users
  await setDoc(doc(db, 'platform_users', supervisorId), sanitizeFirestoreData({
    isActive: true,
    isArchived: false,
    supervisorArchived: false,
    teacherArchived: false,
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    archiveType: null,
    updatedAt: nowIso,
  }), { merge: true });

  // 3. Record audit log
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'auth',
    entityId: supervisorId,
    entityName: supervisorId,
    previousValue: null,
    newValue: { isActive: true, isArchived: false, supervisorArchived: false },
    notes: `تمت استعادة المشرف [${supervisorId}] من أرشيف المشرفين وإعادة تفعيله`,
  });
}

export async function permanentlyDeleteSupervisorFromDb(
  supervisorId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  await deleteDoc(doc(db, 'archived_supervisors', supervisorId)).catch(() => {});
  await deleteDoc(doc(db, 'archived_users', supervisorId)).catch(() => {});
  await deleteDoc(doc(db, 'platform_users', supervisorId)).catch(() => {});

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'auth',
    entityId: supervisorId,
    entityName: supervisorId,
    notes: `تم حذف المشرف [${supervisorId}] نهائياً من النظام وأرشيف المشرفين`,
  });
}

export async function deleteUser(
  userId: string,
  actor: { id: string; name: string; role: any },
  userDataFallback?: User
): Promise<void> {
  const ref = doc(db, 'platform_users', userId);
  const existing = await getDoc(ref);
  const data = existing.exists() ? (existing.data() as User) : userDataFallback;
  if (data) {
    await archiveUser(data, actor, 'أرشفة المستخدم عند الحذف تحسباً للخطأ');
  } else {
    await permanentlyDeleteUser(userId, actor);
  }
}

export async function saveDailySessionRecord(
  record: DailySessionRecord,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'daily_records', record.id);
  const existing = await getDoc(ref);
  const isNew = !existing.exists();

  await setDoc(ref, sanitizeFirestoreData({
    ...record,
    updatedAt: new Date().toISOString(),
    ...(isNew ? { createdAt: new Date().toISOString() } : {}),
  }));

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'session_record',
    entityId: record.id,
    entityName: `سجل طالب ${record.studentId} - ${record.date}`,
    previousValue: isNew ? null : (existing.data() || null),
    newValue: record,
  });
}

export async function saveBulkAttendance(
  records: DailySessionRecord[],
  actor: { id: string; name: string; role: any }
): Promise<void> {
  for (const rec of records) {
    const ref = doc(db, 'daily_records', rec.id);
    await setDoc(ref, sanitizeFirestoreData({
      ...rec,
      updatedAt: new Date().toISOString(),
      createdAt: rec.createdAt || new Date().toISOString(),
    }));
  }

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'bulk_attendance',
    entityType: 'session_record',
    entityId: `bulk_${records[0]?.date || 'date'}`,
    entityName: `رصد حضور جماعي (${records.length} طالب)`,
    newValue: { count: records.length, date: records[0]?.date },
  });
}

export async function saveSpellingLesson(
  lesson: SpellingLesson,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'spelling_lessons', lesson.id);
  const cleanLesson = sanitizeFirestoreData(lesson);
  await setDoc(ref, cleanLesson, { merge: true });
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'lesson',
    entityId: lesson.id,
    entityName: `الدرس ${lesson.lessonNumber}: ${lesson.title}`,
    newValue: cleanLesson,
  });
}

export async function deleteSpellingLesson(
  lessonId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'spelling_lessons', lessonId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data();
    await deleteDoc(ref);
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'lesson',
      entityId: lessonId,
      entityName: data.title,
    });
  }
}

export async function saveEducationalPlanWeek(
  week: EducationalPlanWeek,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'educational_plan', week.id);
  await setDoc(ref, sanitizeFirestoreData(week), { merge: true });
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'plan',
    entityId: week.id,
    entityName: `الأسبوع ${week.weekNumber}: ${week.educationalGoal || week.motto}`,
    newValue: week,
  });
}

export async function saveBulkEducationalPlanWeeks(
  weeks: EducationalPlanWeek[],
  actor: { id: string; name: string; role: any }
): Promise<void> {
  for (const week of weeks) {
    const ref = doc(db, 'educational_plan', week.id);
    await setDoc(ref, sanitizeFirestoreData(week), { merge: true });
  }
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'plan',
    entityId: `bulk_${Date.now()}`,
    entityName: `تحديث دفعة أسابيع خطة تربوية (${weeks.length} أسبوع)`,
    notes: `تم حفظ/استيراد ${weeks.length} أسبوع للخطة التربوية بنجاح`,
  });
}

export async function deleteEducationalPlanWeek(
  weekId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'educational_plan', weekId);
  await deleteDoc(ref);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'plan',
    entityId: weekId,
    entityName: `أسبوع خطة تربوية: ${weekId}`,
  });
}

export async function deleteBulkEducationalPlanWeeks(
  weekIds: string[],
  actor: { id: string; name: string; role: any }
): Promise<void> {
  if (!weekIds || weekIds.length === 0) return;
  for (const weekId of weekIds) {
    const ref = doc(db, 'educational_plan', weekId);
    await deleteDoc(ref).catch(() => {});
  }
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'plan',
    entityId: `bulk_del_${Date.now()}`,
    entityName: `حذف جماعي لأسابيع الخطة (${weekIds.length} أسبوع)`,
    notes: `تم حذف ${weekIds.length} أسبوع من الخطة بنجاح`,
  });
}

// -------------------------------------------------------------
// SEASONAL PROGRAMS CRUD OPERATIONS
// -------------------------------------------------------------
export async function saveSeasonalProgram(
  program: SeasonalProgram,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'seasonal_programs', program.id);
  const cleanProgram = sanitizeFirestoreData(program);
  await setDoc(ref, cleanProgram, { merge: true });
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'program',
    entityId: program.id,
    entityName: `برنامج موسمي: ${program.title}`,
    newValue: cleanProgram,
  });
}

export async function deleteSeasonalProgram(
  programId: string,
  programTitle: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'seasonal_programs', programId);
  await deleteDoc(ref);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'program',
    entityId: programId,
    entityName: `برنامج موسمي: ${programTitle}`,
  });
}

export async function saveSeasonalActivity(
  activity: SeasonalActivity,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'seasonal_activities', activity.id);
  const cleanActivity = sanitizeFirestoreData(activity);
  await setDoc(ref, cleanActivity, { merge: true });
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'activity',
    entityId: activity.id,
    entityName: `نشاط موسمي: ${activity.title}`,
    newValue: cleanActivity,
  });
}

export async function deleteSeasonalActivity(
  activityId: string,
  activityTitle: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'seasonal_activities', activityId);
  await deleteDoc(ref);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'activity',
    entityId: activityId,
    entityName: `نشاط موسمي: ${activityTitle}`,
  });
}

export async function saveSeasonalParticipation(
  participation: SeasonalParticipation,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'seasonal_participations', participation.id);
  await setDoc(ref, sanitizeFirestoreData(participation), { merge: true });
}

export async function deleteSeasonalParticipation(
  participationId: string
): Promise<void> {
  const ref = doc(db, 'seasonal_participations', participationId);
  await deleteDoc(ref);
}

export async function saveAcademicConfig(
  config: AcademicYearConfig,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'academic_years', config.id);
  const cleanConfig = sanitizeFirestoreData({
    ...config,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(ref, cleanConfig, { merge: true });
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'system',
    entityId: config.id,
    entityName: config.name,
    newValue: cleanConfig,
  });
}

export async function saveReportLog(log: ReportLog): Promise<void> {
  const ref = doc(db, 'report_logs', log.id);
  const cleanLog = sanitizeFirestoreData(log);
  await setDoc(ref, cleanLog, { merge: true });
}

export async function changeUserPassword(
  userId: string,
  newPlainPass: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const newHash = await hashPassword(newPlainPass);
  
  await updateDoc(doc(db, 'platform_users', userId), {
    passwordHash: newHash,
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'password_change',
    entityType: 'auth',
    entityId: userId,
    entityName: `تغيير كلمة مرور للمستخدم ${userId}`,
  });
}

export async function saveBadgeToDb(
  badge: StudentBadge,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'badges', badge.id);
  const cleanBadge = sanitizeFirestoreData(badge);
  await setDoc(ref, cleanBadge, { merge: true });
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'create',
    entityType: 'badge',
    entityId: badge.id,
    entityName: `وسام ${badge.badgeType} للطالب ${badge.studentName}`,
    newValue: cleanBadge,
  });
}

export async function deleteBadgeFromDb(
  badgeId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'badges', badgeId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await deleteDoc(ref);
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'badge',
      entityId: badgeId,
      entityName: `حذف وسام ${data?.badgeType} للطالب ${data?.studentName}`,
      previousValue: data,
    });
  }
}

export async function saveRemedialPlanToDb(
  plan: RemedialActionPlan,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'remedial_plans', plan.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  const payload = sanitizeFirestoreData({
    ...plan,
    updatedAt: new Date().toISOString(),
    ...(isNew ? { createdAt: new Date().toISOString() } : {}),
  });

  await setDoc(ref, payload);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'intervention',
    entityId: plan.id,
    entityName: `خطة تدخل للطالب ${plan.studentName}: ${plan.title}`,
    previousValue: isNew ? null : (snap.data() || null),
    newValue: payload,
  });
}

export async function resolveRemedialPlanInDb(
  planId: string,
  notes: string | undefined,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'remedial_plans', planId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const updatePayload: Record<string, any> = {
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    };
    if (notes) {
      updatePayload.notes = notes;
    }
    await updateDoc(ref, updatePayload);
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'intervention',
      entityId: planId,
      entityName: `إغلاق وتدارك خطة التدخل ${planId}`,
      previousValue: snap.data(),
      newValue: { ...snap.data(), ...updatePayload },
    });
  }
}

export async function saveTenantToDb(
  tenant: MosqueComplexTenant,
  actor: { id: string; name: string; role: any },
  adminPlainPassword?: string
): Promise<void> {
  const ref = doc(db, 'tenants', tenant.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  await setDoc(ref, sanitizeFirestoreData(tenant));

  // Directly synchronize / provision the campus_admin user in platform_users (the source of truth)
  try {
    const phone = tenant.contactPhone || (tenant as any).supervisorPhone || (tenant as any).phone || '';
    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();

    // Query for existing campus_admin for this tenant
    const qAdmin = query(
      collection(db, 'platform_users'),
      where('tenantId', '==', tenant.id),
      where('role', '==', 'campus_admin')
    );
    const snapAdmin = await getDocs(qAdmin);

    const updatePayload: Record<string, any> = {
      name: tenant.supervisorName || `مدير ${tenant.name}`,
      fullName: tenant.supervisorName || `مدير ${tenant.name}`,
      phone: phone || '',
      loginIdentifier: cleanPhone || phone || `admin_${tenant.id}`,
      email: tenant.email || undefined,
      role: 'campus_admin',
      staffRole: 'supervisor',
      tenantId: tenant.id,
      organizationId: tenant.organizationId || null,
      isActive: tenant.isActive !== false,
      updatedAt: new Date().toISOString(),
    };

    if (adminPlainPassword) {
      updatePayload.passwordHash = await hashPassword(adminPlainPassword);
      updatePayload.mustChangePassword = false;
    }

    if (!snapAdmin.empty) {
      // Update existing campus_admin in platform_users
      const existingAdminDoc = snapAdmin.docs[0];
      await setDoc(
        doc(db, 'platform_users', existingAdminDoc.id),
        sanitizeFirestoreData(updatePayload),
        { merge: true }
      );
    } else {
      // Create new campus_admin in platform_users
      const adminDocId = `usr_adm_${tenant.id}`;
      if (!updatePayload.passwordHash) {
        updatePayload.passwordHash = await hashPassword('Admin@123456');
      }
      updatePayload.id = adminDocId;
      updatePayload.createdAt = new Date().toISOString();
      updatePayload.mustChangePassword = false;
      updatePayload.customPermissions = [];

      await setDoc(
        doc(db, 'platform_users', adminDocId),
        sanitizeFirestoreData(updatePayload),
        { merge: true }
      );
    }
  } catch (syncErr) {
    console.warn('Notice synchronizing tenant admin in platform_users:', syncErr);
  }

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'tenant',
    entityId: tenant.id,
    entityName: `مجمع: ${tenant.name}`,
    previousValue: isNew ? null : (snap.data() || null),
    newValue: tenant,
  });
}

export async function updateTenantAdminPasswordInDb(
  tenantId: string,
  newPlainPassword: string,
  actor: { id: string; name: string; role: any }
): Promise<boolean> {
  try {
    const cleanPass = newPlainPassword.trim();
    if (!cleanPass) return false;

    const newHash = await hashPassword(cleanPass);
    const qAdmin = query(
      collection(db, 'platform_users'),
      where('tenantId', '==', tenantId),
      where('role', '==', 'campus_admin')
    );
    const snapAdmin = await getDocs(qAdmin);

    if (!snapAdmin.empty) {
      for (const adminDoc of snapAdmin.docs) {
        await updateDoc(doc(db, 'platform_users', adminDoc.id), {
          passwordHash: newHash,
          mustChangePassword: false,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      // Create admin document if missing
      const adminDocId = `usr_adm_${tenantId}`;
      await setDoc(
        doc(db, 'platform_users', adminDocId),
        sanitizeFirestoreData({
          id: adminDocId,
          role: 'campus_admin',
          staffRole: 'supervisor',
          tenantId: tenantId,
          passwordHash: newHash,
          isActive: true,
          mustChangePassword: false,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    }

    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'password_change',
      entityType: 'auth',
      entityId: `adm_${tenantId}`,
      entityName: `تحديث كلمة مرور مدير المجمع (${tenantId}) في جدول المصادقة الرئيسي`,
    });

    return true;
  } catch (err) {
    console.error('Failed to update tenant admin password in db:', err);
    return false;
  }
}

export async function deleteTenantFromDb(
  tenantId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  if (tenantId === 'al-furqan') {
    throw new Error('لا يمكن حذف مجمع الفرقان النموذجي التجريبي حمايةً لمنصة التجربة.');
  }
  const ref = doc(db, 'tenants', tenantId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;

  await deleteDoc(ref);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'tenant',
    entityId: tenantId,
    entityName: `مجمع: ${data?.name || tenantId}`,
    previousValue: data,
    newValue: null,
  });
}

export async function saveStageToDb(
  stage: EducationalStage,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'educational_stages', stage.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  await setDoc(ref, sanitizeFirestoreData(stage));
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'stage',
    entityId: stage.id,
    entityName: `المرحلة: ${stage.name}`,
    previousValue: isNew ? null : (snap.data() || null),
    newValue: stage,
  });
}

export async function deleteStageFromDb(
  stageId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'educational_stages', stageId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;

  await deleteDoc(ref);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'delete',
    entityType: 'stage',
    entityId: stageId,
    entityName: `حذف المرحلة: ${data?.name || stageId}`,
    previousValue: data,
    newValue: null,
  });
}

export async function saveArchiveToDb(
  archive: AcademicTermArchive,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'academic_archives', archive.id);
  await setDoc(ref, archive);
  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'archive_term',
    entityType: 'archive',
    entityId: archive.id,
    entityName: `أرشيف ${archive.academicYear} - ${archive.termName}`,
    newValue: {
      id: archive.id,
      academicYear: archive.academicYear,
      termName: archive.termName,
      totalStudents: archive.totalStudents,
      overallMasteryRate: archive.overallMasteryRate,
    },
    notes: `أرشفة فترية شاملة وإغلاق الفصل للمجمع: ${archive.tenantName}`,
  });
}

export async function saveOrganizationToDb(
  org: Organization,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'organizations', org.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  await setDoc(ref, sanitizeFirestoreData({
    ...org,
    updatedAt: new Date().toISOString(),
    ...(isNew ? { createdAt: new Date().toISOString() } : {}),
  }));

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: isNew ? 'create' : 'update',
    entityType: 'organization' as any,
    entityId: org.id,
    entityName: `الجمعية/المؤسسة: ${org.name}`,
    previousValue: isNew ? null : (snap.data() || null),
    newValue: org,
  });
}

export async function deleteOrganizationFromDb(
  orgId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'organizations', orgId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await deleteDoc(ref);
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'organization' as any,
      entityId: orgId,
      entityName: (data as any)?.name || orgId,
      previousValue: data,
    });
  }
}

// -------------------------------------------------------------
// Universal Quran Planning Engine Persistence & Subscriptions
// -------------------------------------------------------------
// P2: Quran Engine Cloud Firestore Subscriptions & Storage
// (Firestore Cloud Database = Sole Source of Truth)
// -------------------------------------------------------------

export const LOCAL_STORAGE_KEY_QURAN_PLANS = 'quran_engine_student_plans_v1';
export const LOCAL_STORAGE_KEY_STAGE_CONFIGS = 'quran_engine_stage_configs_v1';

export function subscribeToQuranPlans(callback: (plans: StudentQuranPlan[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'quran_plans'),
    (snapshot) => {
      const plans: StudentQuranPlan[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (
          data &&
          data.generatedPlan &&
          Array.isArray(data.generatedPlan.dailyPlans) &&
          data.generatedPlan.dailyPlans.length > 0
        ) {
          plans.push({ id: docSnap.id, ...(data as Omit<StudentQuranPlan, 'id'>) });
        }
      });
      callback(plans);
    },
    (err) => {
      console.warn('Quran plans subscription notice:', err.message);
      callback([]);
    }
  );
}

export async function saveQuranPlanToDb(
  plan: StudentQuranPlan,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  // Persist directly to Firestore (Sole source of truth)
  const ref = doc(db, 'quran_plans', plan.id);
  const cleanPlan = sanitizeFirestoreData(plan);
  await setDoc(ref, cleanPlan, { merge: true });

  // Record audit log
  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'quran_plan' as any,
      entityId: plan.id,
      entityName: `خطة قرآنية للطالب: ${plan.studentId}`,
      newValue: {
        id: plan.id,
        studentId: plan.studentId,
        planType: plan.planType,
        planVersion: plan.planVersion,
        status: plan.status,
      },
    });
  }
}

export async function getQuranPlansForStudentFromDb(studentId: string): Promise<StudentQuranPlan[]> {
  try {
    const q = query(collection(db, 'quran_plans'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const plans: StudentQuranPlan[] = [];
    snap.forEach((docSnap) => {
      plans.push(normalizeStudentQuranPlan({ id: docSnap.id, ...(docSnap.data() as any) }));
    });
    return plans;
  } catch (err) {
    console.warn('Firestore query for student plans notice:', err);
    return [];
  }
}

export async function deleteQuranPlanFromDb(
  planId: string,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'quran_plans', planId);
  await deleteDoc(ref);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'quran_plan' as any,
      entityId: planId,
      entityName: `حذف خطة قرآنية: ${planId}`,
    });
  }
}

export function subscribeToQuranStageConfigs(callback: (configs: StageQuranConfig[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'quran_stage_configs'),
    (snapshot) => {
      const configs: StageQuranConfig[] = [];
      snapshot.forEach((docSnap) => {
        configs.push({ id: docSnap.id, ...(docSnap.data() as Omit<StageQuranConfig, 'id'>) });
      });
      if (configs.length === 0) {
        callback(DEFAULT_STAGE_CONFIGS);
        return;
      }
      callback(configs);
    },
    (err) => {
      console.warn('Quran stage configs subscription notice:', err.message);
      callback(DEFAULT_STAGE_CONFIGS);
    }
  );
}

export async function saveQuranStageConfigToDb(
  config: StageQuranConfig,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'quran_stage_configs', config.id);
  const cleanConfig = sanitizeFirestoreData(config);
  await setDoc(ref, cleanConfig, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'stage_config' as any,
      entityId: config.id,
      entityName: `قالب خطة مرحلة: ${config.name}`,
      newValue: cleanConfig,
    });
  }
}

export async function deleteQuranStageConfigFromDb(
  configId: string,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'quran_stage_configs', configId);
  await deleteDoc(ref);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'stage_config' as any,
      entityId: configId,
      entityName: `حذف قالب خطة مرحلة: ${configId}`,
    });
  }
}

export async function resetQuranStageConfigsInDb(
  actor?: { id: string; name: string; role: any }
): Promise<StageQuranConfig[]> {
  for (const cfg of DEFAULT_STAGE_CONFIGS) {
    const ref = doc(db, 'quran_stage_configs', cfg.id);
    await setDoc(ref, sanitizeFirestoreData(cfg), { merge: true });
  }

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'stage_config' as any,
      entityId: 'reset_default_configs',
      entityName: 'استعادة قوالب المراحل الافتراضية',
    });
  }

  return DEFAULT_STAGE_CONFIGS;
}

// -------------------------------------------------------------
// P4: Admissions & Registration Mutations
// -------------------------------------------------------------

export async function saveAdmissionsRequest(
  request: RegistrationRequest,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'registration_requests', request.id);
  const cleanRequest = sanitizeFirestoreData({
    ...request,
    updatedAt: new Date().toISOString(),
    createdAt: request.createdAt || new Date().toISOString(),
  });
  await setDoc(ref, cleanRequest, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'create',
      entityType: 'registration_request' as any,
      entityId: request.id,
      entityName: request.studentName,
      newValue: cleanRequest,
    });
  }
}

export async function updateAdmissionsStatus(
  requestId: string,
  status: AdmissionStatus,
  extras?: Partial<RegistrationRequest>,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'registration_requests', requestId);
  const snap = await getDoc(ref);
  const previousValue = snap.exists() ? snap.data() : null;

  const cleanUpdates = sanitizeFirestoreData({
    status,
    ...extras,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(ref, cleanUpdates);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'registration_request' as any,
      entityId: requestId,
      entityName: previousValue?.studentName || requestId,
      previousValue,
      newValue: { status, ...extras },
    });
  }
}

// -------------------------------------------------------------
// P5: Financial Records Mutations
// -------------------------------------------------------------

export async function saveFinancialRecord(
  record: StudentFinancialRecord,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'financial_records', record.id);
  const isNew = !(await getDoc(ref)).exists();

  const cleanRecord = sanitizeFirestoreData({
    ...record,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  });
  await setDoc(ref, cleanRecord, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: isNew ? 'create' : 'update',
      entityType: 'financial_record' as any,
      entityId: record.id,
      entityName: record.studentName,
      newValue: cleanRecord,
    });
  }
}

export async function recordFinancialPayment(
  recordId: string,
  payment: PaymentTransaction,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'financial_records', recordId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const current = snap.data() as StudentFinancialRecord;
  const payments = current.payments ? [...current.payments, payment] : [payment];
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const netDue = (current.baseTuition || 0) - (current.discountAmount || 0);
  const remainingAmount = Math.max(0, netDue - paidAmount);
  const status: PaymentStatus = current.isExempt ? 'exempted' : remainingAmount === 0 ? 'fully_paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid';

  const cleanUpdates = sanitizeFirestoreData({
    payments,
    paidAmount,
    remainingAmount,
    status,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(ref, cleanUpdates);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'financial_record' as any,
      entityId: recordId,
      entityName: current.studentName,
      previousValue: { paidAmount: current.paidAmount, remainingAmount: current.remainingAmount },
      newValue: { paidAmount, remainingAmount, payment },
    });
  }
}

// -------------------------------------------------------------
// P6: Association Nominations Mutations
// -------------------------------------------------------------

export async function saveAssociationNomination(
  nomination: AssociationNomination,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'association_nominations', nomination.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  const cleanNomination = sanitizeFirestoreData({
    ...nomination,
    createdAt: nomination.createdAt || new Date().toISOString(),
  });
  await setDoc(ref, cleanNomination, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: isNew ? 'create' : 'update',
      entityType: 'association_nomination' as any,
      entityId: nomination.id,
      entityName: nomination.studentName,
      newValue: cleanNomination,
    });
  }
}

export async function updateNominationStatus(
  nominationId: string,
  status: NominationStatus,
  extras?: Partial<AssociationNomination>,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'association_nominations', nominationId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : null;

  const cleanUpdates = sanitizeFirestoreData({
    supervisorStatus: status,
    ...extras,
  });
  await updateDoc(ref, cleanUpdates);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'association_nomination' as any,
      entityId: nominationId,
      entityName: prev?.studentName || nominationId,
      previousValue: prev,
      newValue: { supervisorStatus: status, ...extras },
    });
  }
}

// -------------------------------------------------------------
// P7: Emergency Support Sessions Mutations
// -------------------------------------------------------------

export async function startSupportSession(
  session: EmergencySupportSession,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'support_sessions', session.id);
  const cleanSession = sanitizeFirestoreData({
    ...session,
    createdAt: new Date().toISOString(),
    isActive: true,
  });
  await setDoc(ref, cleanSession, { merge: true });

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'create',
    entityType: 'support_session' as any,
    entityId: session.id,
    entityName: `جلسة دعم فني طارئة للمجمع ${session.tenantId}`,
    newValue: cleanSession,
  });
}

export async function endSupportSession(
  sessionId: string,
  actor: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'support_sessions', sessionId);
  await updateDoc(ref, {
    isActive: false,
    endedAt: new Date().toISOString(),
  });

  await recordAuditLog({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: 'update',
    entityType: 'support_session' as any,
    entityId: sessionId,
    entityName: `إنهاء جلسة دعم فني: ${sessionId}`,
    newValue: { isActive: false },
  });
}

// -------------------------------------------------------------
// P8: Track Definitions & Track Nominations Mutations
// -------------------------------------------------------------

export async function saveTrackDefinition(
  track: TrackDefinition,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'track_definitions', track.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  const cleanTrack = sanitizeFirestoreData({
    ...track,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(ref, cleanTrack, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: isNew ? 'create' : 'update',
      entityType: 'track_definition' as any,
      entityId: track.id,
      entityName: track.name,
      newValue: cleanTrack,
    });
  }
}

export async function deleteTrackDefinition(
  trackId: string,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'track_definitions', trackId);
  const snap = await getDoc(ref);
  const existingName = snap.exists() ? ((snap.data() as any)?.name || trackId) : trackId;
  await deleteDoc(ref);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'track_definition' as any,
      entityId: trackId,
      entityName: existingName,
      newValue: { deleted: true },
    });
  }
}

export async function deleteAllTrackDefinitions(
  tenantId?: string,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const colRef = collection(db, 'track_definitions');
  const snap = await getDocs(colRef);
  const batch = writeBatch(db);
  let count = 0;
  snap.forEach((d) => {
    const data = d.data() as TrackDefinition;
    if (!tenantId || !data.tenantId || data.tenantId === tenantId) {
      batch.delete(d.ref);
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
  }

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'track_definition' as any,
      entityId: 'all_tracks',
      entityName: 'جميع المسارات التعليمية',
      newValue: { deletedAll: true, count },
    });
  }
}

export async function saveTrackNomination(
  nomination: TrackNomination,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'track_nominations', nomination.id);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  const cleanNomination = sanitizeFirestoreData({
    ...nomination,
    createdAt: nomination.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await setDoc(ref, cleanNomination, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: isNew ? 'create' : 'update',
      entityType: 'track_nomination' as any,
      entityId: nomination.id,
      entityName: nomination.studentName,
      newValue: cleanNomination,
    });
  }
}

export async function updateTrackNominationStatus(
  nominationId: string,
  status: TrackNominationStatus,
  extras?: Partial<TrackNomination>,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'track_nominations', nominationId);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : null;

  const updatePayload: any = {
    status,
    updatedAt: new Date().toISOString(),
    ...extras,
  };

  await updateDoc(ref, updatePayload);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'track_nomination' as any,
      entityId: nominationId,
      entityName: prev?.studentName || nominationId,
      previousValue: prev,
      newValue: updatePayload,
    });
  }
}

export function subscribeToStaffAttendance(
  tenantId: string,
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, 'staff_attendance'), where('tenantId', '==', tenantId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: AttendanceRecord[] = [];
      const seen = new Set<string>();
      const duplicatesToDelete: string[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<AttendanceRecord, 'id'>;
        // Extract normalized YYYY-MM-DD date
        const recordDate = data.date || (data.timestamp ? data.timestamp.slice(0, 10) : '');
        // Unique identity of attendance per day: tenantId + userId + date
        const key = recordDate 
          ? `${data.tenantId || tenantId}_${data.userId}_${recordDate}`
          : `${data.tenantId || tenantId}_${data.userId}_doc_${docSnap.id}`;

        if (seen.has(key)) {
          // Already have a record for this user on this specific date, mark duplicate document
          duplicatesToDelete.push(docSnap.id);
        } else {
          seen.add(key);
          records.push({
            id: docSnap.id,
            ...data,
            date: recordDate || new Date().toISOString().slice(0, 10),
          });
        }
      });

      // Silently clean up redundant duplicate documents in the background
      if (duplicatesToDelete.length > 0) {
        duplicatesToDelete.forEach((dupId) => {
          deleteStaffAttendanceRecord(dupId).catch((err) =>
            console.warn('Notice cleaning duplicate attendance document:', dupId, err)
          );
        });
      }

      callback(records);
    },
    (error) => {
      console.warn('Notice subscribing to staff attendance:', (error as any)?.message || error);
      callback([]);
    }
  );
}

export async function deleteStaffAttendanceRecord(recordId: string): Promise<void> {
  const ref = doc(db, 'staff_attendance', recordId);
  await deleteDoc(ref);
}

export async function saveStaffAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
  const ref = doc(db, 'staff_attendance', record.id);
  const snap = await getDoc(ref);
  
  if (snap.exists()) {
    // If it already exists, do NOT overwrite it! 
    // This preserves the earliest check-in time of the day and prevents duplicates.
    return snap.data() as AttendanceRecord;
  }

  // Ensure no fields have undefined values, as Firestore setDoc rejects undefined
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const cleanSubObj: Record<string, any> = {};
        for (const [subKey, subVal] of Object.entries(value)) {
          if (subVal !== undefined) {
            cleanSubObj[subKey] = subVal;
          }
        }
        cleanData[key] = cleanSubObj;
      } else {
        cleanData[key] = value;
      }
    }
  }
  await setDoc(ref, cleanData, { merge: true });
  return record;
}

// -------------------------------------------------------------
// P10: MEETINGS & OFFICIAL MINUTES DATABASE OPERATIONS
// -------------------------------------------------------------

export function subscribeToMeetings(
  tenantIdOrCallback: string | ((meetings: Meeting[]) => void),
  optionalCallback?: (meetings: Meeting[]) => void
): Unsubscribe {
  let tenantId: string | undefined;
  let callback: (meetings: Meeting[]) => void;

  if (typeof tenantIdOrCallback === 'function') {
    callback = tenantIdOrCallback;
  } else {
    tenantId = tenantIdOrCallback;
    callback = optionalCallback || (() => {});
  }

  const q = tenantId
    ? query(collection(db, 'meetings'), where('tenantId', '==', tenantId))
    : collection(db, 'meetings');

  return onSnapshot(
    q as any,
    (snapshot) => {
      const meetings: Meeting[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        meetings.push({
          id: docSnap.id,
          ...data,
        } as Meeting);
      });
      callback(meetings);
    },
    (error) => {
      console.warn('Notice subscribing to meetings:', (error as any)?.message || error);
      callback([]);
    }
  );
}

export async function saveMeetingToDb(
  meeting: Meeting,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'meetings', meeting.id);
  const cleanData = sanitizeFirestoreData(meeting);
  await setDoc(ref, cleanData, { merge: true });

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'create',
      entityType: 'program',
      entityId: meeting.id,
      entityName: `تسجيل اجتماع: ${meeting.title}`,
      newValue: cleanData,
      notes: `حالة الاجتماع: ${meeting.status}`,
    });
  }
}

export async function updateMeetingInDb(
  id: string,
  updates: Partial<Meeting>,
  actor?: { id: string; name: string; role: any },
  actionLabel: string = 'تعديل اجتماع'
): Promise<void> {
  const ref = doc(db, 'meetings', id);
  const cleanUpdates = sanitizeFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(ref, cleanUpdates);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'update',
      entityType: 'program',
      entityId: id,
      entityName: `${actionLabel} (${updates.title || id})`,
      newValue: cleanUpdates,
      notes: updates.status ? `الحالة: ${updates.status}` : undefined,
    });
  }
}

export async function deleteMeetingFromDb(
  id: string,
  actor?: { id: string; name: string; role: any }
): Promise<void> {
  const ref = doc(db, 'meetings', id);
  await deleteDoc(ref);

  if (actor) {
    await recordAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'delete',
      entityType: 'program',
      entityId: id,
      entityName: `حذف سجل الاجتماع ${id}`,
    });
  }
}





