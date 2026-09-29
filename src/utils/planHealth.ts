import { AcademicYearConfig, Student } from '../types';
import { StudentQuranPlan } from '../quran/types/plan';
import { findStageConfigForStudent, StageQuranConfig } from '../quran/models/stageConfig';
import {
  planEndCoversTarget,
  resolveStudentGradeTargetPosition,
} from '../quran/services/studentPlanBridge';

// Shared plan-health semantics — used by supervisor radar AND teacher roster so
// both screens agree on whether a student's plan actually reaches his grade target.
export type PlanHealthState = 'none' | 'reached' | 'deficient' | 'at_risk' | 'healthy';

export interface PlanHealth {
  plan?: StudentQuranPlan;
  state: PlanHealthState;
  isAtRisk?: boolean;
  targetDeficient?: boolean;
  reachedTarget?: boolean;
  passedGradeTarget?: boolean;
}

export function planHealthFor(
  student: Student,
  quranPlans: StudentQuranPlan[],
  academicConfig: AcademicYearConfig,
  quranStageConfigs: StageQuranConfig[]
): PlanHealth {
  const plan = quranPlans.find(
    (p) =>
      p.studentId === student.id &&
      (p.status === 'active' ||
        p.status === 'at_risk' ||
        p.status === 'paused' ||
        p.status === 'completed')
  );
  if (!plan) {
    return { plan: undefined, state: 'none' };
  }

  const pos = plan.currentPosition;
  const tEnd = plan.targetEnd ?? plan.originalTarget?.targetEnd;
  const dir = plan.direction || 'backward';
  const covers = (end: typeof pos, req: typeof pos) =>
    !!end && !!req && planEndCoversTarget(end, req, dir);
  const passedTarget = covers(pos, tEnd);
  const reachedTarget = plan.status === 'completed' || passedTarget;
  const isAtRisk =
    plan.status === 'at_risk' || plan.targetAtRiskDiagnostic?.isAtRisk === true;
  const gradeTarget = resolveStudentGradeTargetPosition(
    student,
    academicConfig,
    findStageConfigForStudent(student, quranStageConfigs)
  );
  const targetDeficient = !planEndCoversTarget(tEnd, gradeTarget ?? undefined, dir);
  const passedGradeTarget = covers(pos, gradeTarget ?? undefined);

  // Achievement trumps everything: once the position passed the grade
  // target the plan's endpoint no longer matters.
  const state: PlanHealthState = passedGradeTarget
    ? 'reached'
    : targetDeficient
    ? 'deficient'
    : isAtRisk
    ? 'at_risk'
    : reachedTarget
    ? 'reached'
    : 'healthy';
  return { plan, state, isAtRisk, targetDeficient, reachedTarget, passedGradeTarget };
}
