import { Meeting, User, Halaqah } from '../types';

/**
 * Checks if a supervisor has supervisory authority over a given user (e.g. Teacher or subordinate).
 */
export function isSupervisorResponsibleForUser(
  supervisor: User,
  targetUser: User | null,
  halaqahs: Halaqah[]
): boolean {
  if (!targetUser) return false;
  if (supervisor.id === targetUser.id) return true;
  if (supervisor.role !== 'supervisor') return false;

  // Strict tenant isolation: cannot supervise across different tenants
  if (supervisor.tenantId && targetUser.tenantId && supervisor.tenantId !== targetUser.tenantId) {
    return false;
  }

  // General supervisor supervises all staff/teachers in the same tenant
  const scopeType = supervisor.supervisorScope?.type;
  if (!scopeType || scopeType === 'general_supervisor') {
    return true;
  }

  // Determine target user's associated halaqahs
  const targetHalaqahIds = [
    targetUser.halaqahId,
    ...(targetUser.assignedHalaqahIds || []),
  ].filter(Boolean) as string[];

  // Halaqahs where targetUser is the primary teacher or an assistant teacher
  const userHalaqahs = halaqahs.filter(
    (h) =>
      targetHalaqahIds.includes(h.id) ||
      h.teacherId === targetUser.id ||
      (targetUser.teacherId && h.teacherId === targetUser.teacherId) ||
      h.assistantTeachers?.some(
        (at) =>
          at.id === targetUser.id ||
          (targetUser.teacherId && at.id === targetUser.teacherId)
      )
  );

  const targetStageIds = Array.from(
    new Set([
      ...(targetUser.assignedStageIds || []),
      ...userHalaqahs.map((h) => h.stageId).filter(Boolean),
    ])
  ) as string[];

  const userHalaqahIds = Array.from(
    new Set([...targetHalaqahIds, ...userHalaqahs.map((h) => h.id)])
  );

  // Supervisor's authorized scope
  const supervisorHalaqahIds = [
    ...(supervisor.supervisorScope?.halaqahIds || []),
    ...(supervisor.assignedHalaqahIds || []),
  ].filter(Boolean) as string[];

  const supervisorStageIds = [
    ...(supervisor.supervisorScope?.stageIds || []),
    ...(supervisor.assignedStageIds || []),
  ].filter(Boolean) as string[];

  // 1. Check direct halaqah assignment overlap
  if (supervisorHalaqahIds.length > 0) {
    const hasHalaqahMatch = userHalaqahIds.some((hId) => supervisorHalaqahIds.includes(hId));
    if (hasHalaqahMatch) return true;
  }

  // 2. Check stage assignment overlap
  if (supervisorStageIds.length > 0) {
    const hasStageMatch = targetStageIds.some((sId) => supervisorStageIds.includes(sId));
    if (hasStageMatch) return true;
  }

  // 3. Track-based supervisor (quran, spelling, educational, admissions) with no restricting halaqah/stage
  if (
    ['quran_supervisor', 'spelling_supervisor', 'educational_supervisor', 'admissions_supervisor'].includes(
      scopeType
    )
  ) {
    if (supervisorHalaqahIds.length === 0 && supervisorStageIds.length === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether a user can view a specific meeting based on:
 * 1. Tenant Isolation
 * 2. Direct Participation (Creator, Attendee/Invited)
 * 3. Administrative Scope (System Admin, Campus Admin, Admin, Charity Supervisor)
 * 4. Supervisory Hierarchy (Supervisor responsible for creator or any attendee)
 */
export function canUserViewMeeting(
  meeting: Meeting,
  user: User | null,
  halaqahs: Halaqah[],
  allUsers: User[]
): boolean {
  if (!user || !user.isActive) return false;

  // Global System Admin can view all
  if (user.role === 'system_admin') return true;

  // 1. Strict Tenant Isolation
  if (user.tenantId && meeting.tenantId && user.tenantId !== meeting.tenantId) {
    return false;
  }

  // 2. Direct Participation
  // Creator
  if (meeting.createdBy === user.id) return true;
  if (user.teacherId && meeting.createdBy === user.teacherId) return true;

  // Attendee / Invited
  const isAttendee = meeting.attendees.some(
    (a) => a.userId === user.id || (user.teacherId && a.userId === user.teacherId)
  );
  if (isAttendee) return true;

  // 3. Administrative Scope (Campus Admin / Admin / Charity Supervisor of the tenant)
  if (['campus_admin', 'admin', 'charity_supervisor'].includes(user.role)) {
    return true;
  }

  // 4. Supervisory Hierarchy
  if (user.role === 'supervisor') {
    // Check if supervisor is responsible for the creator
    const creatorUser = allUsers.find(
      (u) => u.id === meeting.createdBy || (u.teacherId && u.teacherId === meeting.createdBy)
    );
    if (creatorUser && isSupervisorResponsibleForUser(user, creatorUser, halaqahs)) {
      return true;
    }

    // Check if supervisor is responsible for any attendee in the meeting
    for (const att of meeting.attendees) {
      const attUser = allUsers.find(
        (u) => u.id === att.userId || (u.teacherId && u.teacherId === att.userId)
      );
      if (attUser && isSupervisorResponsibleForUser(user, attUser, halaqahs)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filters a list of meetings according to user visibility permissions.
 */
export function filterMeetingsForUser(
  meetings: Meeting[],
  user: User | null,
  halaqahs: Halaqah[],
  allUsers: User[]
): Meeting[] {
  if (!user) return [];
  return meetings.filter((m) => canUserViewMeeting(m, user, halaqahs, allUsers));
}

/**
 * Determines whether a user can manage (edit/cancel/record minutes) a meeting.
 */
export function canUserManageMeeting(
  meeting: Meeting,
  user: User | null
): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'system_admin') return true;

  // Must belong to the same tenant
  if (user.tenantId && meeting.tenantId && user.tenantId !== meeting.tenantId) {
    return false;
  }

  // Campus Admin & Admin can manage all meetings within the tenant
  if (['campus_admin', 'admin'].includes(user.role)) {
    return true;
  }

  // Creator can manage their meeting
  if (meeting.createdBy === user.id || (user.teacherId && meeting.createdBy === user.teacherId)) {
    return true;
  }

  return false;
}

/**
 * Determines if a user can complete/finalize minutes for a meeting.
 */
export function canUserCompleteMeeting(
  meeting: Meeting,
  user: User | null
): boolean {
  return canUserManageMeeting(meeting, user);
}
