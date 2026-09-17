import { User, MosqueComplexTenant, EducationalStage, Halaqah, Student } from '../types';
import { getAcademicOutcome } from '../quran/services/outcomeService';

export interface ResolvedIdentity {
  // الهوية الرسمية الأساسية للمجمع (تظهر دائمًا)
  mosqueName: string;
  mosqueLogoUrl: string;

  // هوية المرحلة السياقية (تظهر فقط عند تحقق السياق أو النطاق الحصري للمستخدم)
  stage: EducationalStage | null;
  stageName: string | null;
  stageLogoUrl: string | null;
  shouldShowStageLogo: boolean;
  stageScopeReason: 'explicit_context' | 'exclusive_user_scope' | 'none';

  // المخرج القرآني المحسوب وفق النطاق المعتمد (لا يُفرض مخرج مرحلة صغرى على المجمع متعدد المراحل)
  resolvedOutcome: string | null;
}

/**
 * تحديد الهوية البصرية المناسبة بناءً على:
 * 1. هوية المجمع الأساسية (دائماً الشعار الرسمي)
 * 2. السياق الحالي (explicitStageId إن وجد)
 * 3. نطاق عمل المستخدم (إذا كان معلماً أو مشرفاً لمرحلة واحدة حصرية)
 * لا يعتمد على أسماء ثابتة (Hardcoded) مطلقاً بل على البيانات المسجلة.
 */
export function resolveContextIdentity(params: {
  currentUser?: User | null;
  activeTenant?: MosqueComplexTenant | null;
  stages: EducationalStage[];
  halaqahs?: Halaqah[];
  students?: Student[];
  explicitStageId?: string | null;
  mosqueLogoUrlFallback?: string | null;
}): ResolvedIdentity {
  const {
    currentUser,
    activeTenant,
    stages = [],
    halaqahs = [],
    students = [],
    explicitStageId,
    mosqueLogoUrlFallback,
  } = params;

  // 1. هوية المجمع الأساسية (الافتراضية والرسمية للمنظومة)
  const mosqueName = activeTenant?.name || 'مجمع مسجد الغزاوي القرآني';
  const mosqueLogoUrl =
    mosqueLogoUrlFallback || activeTenant?.logoUrl || '/mosque-logo.jpeg';

  // 2. استنتاج هوية المرحلة التعليمية إن وجدت وكانت مؤهلة للعرض
  let resolvedStage: EducationalStage | null = null;
  let stageScopeReason: 'explicit_context' | 'exclusive_user_scope' | 'none' = 'none';

  // أ. الأولوية الأولى: وجود سياق صريح للمرحلة (مثل تصفح مرحلة معينة، أو شهادة طالب بمرحلة معينة)
  if (explicitStageId) {
    const found = stages.find((s) => s.id === explicitStageId && s.isActive);
    if (found && found.logoUrl && found.isLogoActive !== false) {
      resolvedStage = found;
      stageScopeReason = 'explicit_context';
    }
  }

  // ب. إذا لم يوجد سياق صريح، نفحص نطاق المستخدم (User Scope)
  if (!resolvedStage && currentUser) {
    const tenantId = activeTenant?.id;

    // حالة الطالب: مرتبط بمرحلته الدراسية
    if (currentUser.role === 'student') {
      const studentRecord = students.find(
        (s) => s.id === currentUser.id || (currentUser.studentId && s.id === currentUser.studentId)
      );
      const studentStageId = studentRecord?.stageId;
      if (studentStageId) {
        const found = stages.find((s) => s.id === studentStageId && s.isActive);
        if (found && found.logoUrl && found.isLogoActive !== false) {
          resolvedStage = found;
          stageScopeReason = 'exclusive_user_scope';
        }
      }
    }

    // حالة المعلم: فحص حلقات المعلم
    // يظهر شعار المرحلة فقط إذا كان المعلم يُدرّس في مرحلة واحدة حصرية
    else if (currentUser.role === 'teacher') {
      const teacherHalaqahs = halaqahs.filter(
        (h) =>
          (h.teacherId === currentUser.id || h.teacherName === currentUser.name) &&
          (!h.tenantId || !tenantId || h.tenantId === tenantId) &&
          h.isActive !== false
      );

      const uniqueStageIds = Array.from(
        new Set(teacherHalaqahs.map((h) => h.stageId).filter(Boolean) as string[])
      );

      if (uniqueStageIds.length === 1) {
        const found = stages.find((s) => s.id === uniqueStageIds[0] && s.isActive);
        if (found && found.logoUrl && found.isLogoActive !== false) {
          resolvedStage = found;
          stageScopeReason = 'exclusive_user_scope';
        }
      }
      // إذا كان يدرّس حلقات في أكثر من مرحلة (مثل أشبال وبراعم معاً)، يبقى resolvedStage فارغاً ولا يظهر شعار مرحلة عشوائي
    }

    // حالة المشرف: فحص نطاق إشراف المشرف (Supervisor Scope)
    // يظهر شعار المرحلة فقط إذا كان مشرفاً مخصصاً لمرحلة واحدة حصرية
    else if (currentUser.role === 'supervisor') {
      const scopeStageIds = currentUser.supervisorScope?.stageIds?.filter(Boolean) || [];

      if (scopeStageIds.length === 1) {
        const found = stages.find((s) => s.id === scopeStageIds[0] && s.isActive);
        if (found && found.logoUrl && found.isLogoActive !== false) {
          resolvedStage = found;
          stageScopeReason = 'exclusive_user_scope';
        }
      }
      // إذا كان مشرفاً عاماً أو يشرف على عدة مراحل، لا يُعرض شعار مرحلة عشوائي
    }

    // مدير المجمع (campus_admin / admin) ومدير المنصة (system_admin):
    // نطاقهم يشمل المجمع ككل، لذلك لا يظهر شعار مرحلة افتراضياً ويظهر شعار المجمع فقط
  }

  const shouldShowStageLogo =
    resolvedStage !== null &&
    Boolean(resolvedStage.logoUrl) &&
    resolvedStage.isLogoActive !== false;

  // استنتاج المخرج القرآني المعتمد:
  // - إذا كان للمستخدم مرحلة حصرية (exclusive_user_scope أو explicit_context): يُعرض مخرج هذه المرحلة
  // - إذا كان المستخدم متعدد المراحل أو مدير مجمع: يُعرض المخرج العام للمجمع إن وجد، وإلا null (بدون فرض مخرج البراعم)
  let resolvedOutcome: string | null = null;
  if (resolvedStage) {
    resolvedOutcome = getAcademicOutcome({
      tenant: activeTenant,
      stage: resolvedStage,
    });
  } else if (activeTenant?.referenceOutcome && activeTenant?.referenceOutcome.trim().length > 0) {
    resolvedOutcome = activeTenant?.referenceOutcome.trim();
  }

  return {
    mosqueName,
    mosqueLogoUrl,
    stage: resolvedStage,
    stageName: resolvedStage?.name || null,
    stageLogoUrl: shouldShowStageLogo ? resolvedStage!.logoUrl! : null,
    shouldShowStageLogo,
    stageScopeReason,
    resolvedOutcome,
  };
}
