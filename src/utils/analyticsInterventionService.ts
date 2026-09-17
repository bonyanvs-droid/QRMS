import {
  Student,
  DailySessionRecord,
  SpellingLesson,
  AcademicYearConfig,
  RemedialActionPlan,
  RiskLevel,
  InterventionCategory,
} from '../types';
import { evaluateStudentStatus, getSurahIndexInJuzAmma } from './statusCalculator';

export interface EarlyWarningRiskAnalysis {
  student: Student;
  riskLevel: RiskLevel;
  primaryCategory: InterventionCategory;
  flags: string[];
  diagnosticSummary: string;
  recommendedPedagogicalAction: string;
  parentGuidanceAdvice: string;
  metrics: {
    spellingMastery: number;
    attendanceRate: number;
    differenceFromPlan: number;
    consecutiveAbsences: number;
  };
}

/**
 * Scans all students and detects early signs of academic or behavioral lag before they compound
 */
export function analyzeStudentsForEarlyWarning(
  students: Student[],
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
): EarlyWarningRiskAnalysis[] {
  const results: EarlyWarningRiskAnalysis[] = [];

  for (const student of students) {
    const studentRecords = records
      .filter((r) => r.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);
    const flags: string[] = [];

    // 1. Check spelling stagnation / low mastery
    const spellingRecords = studentRecords.filter((r) => r.spelling);
    const lowSpellingAttempts = spellingRecords.slice(0, 3).filter((r) => (r.spelling?.finalScore || 0) < 80).length;
    const isSpellingLagging = evalResult.differenceFromPlan <= -1 || evalResult.spellingMasteryRate < 80;

    if (evalResult.spellingMasteryRate < 75) {
      flags.push(`نسبة إتقان الهجاء حرجة (${evalResult.spellingMasteryRate}%) أقل من معيار الإتقان`);
    } else if (evalResult.spellingMasteryRate < 85) {
      flags.push(`نسبة إتقان الهجاء (${evalResult.spellingMasteryRate}%) تحتاج تثبيتاً ومتابعة`);
    }

    if (evalResult.differenceFromPlan <= -2) {
      flags.push(`متأخر عن الخطة التشغيلية بـ ${Math.abs(evalResult.differenceFromPlan)} دروس هجاء`);
    }

    if (student.status === 'not_moved_yet') {
      flags.push('قرار المعلم بتثبيت الدرس الحالي وعدم الانتقال لحين تمكين المهارة');
    }

    // 2. Attendance drop
    let consecutiveAbsences = 0;
    for (const r of studentRecords) {
      if (r.attendance === 'absent') {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    if (consecutiveAbsences >= 2) {
      flags.push(`غياب متتابع لـ ${consecutiveAbsences} جلسات دون عذر`);
    }
    if (evalResult.attendanceRate < 75) {
      flags.push(`معدل الحضور العام منخفض (${evalResult.attendanceRate}%)`);
    }

    // 3. Memorization vs Target
    const minSurahForGrade =
      student.grade === 'تمهيدي'
        ? academicConfig.gradeTargets.tamheedi.minSurah
        : student.grade === 'صف أول'
        ? academicConfig.gradeTargets.grade1.minSurah
        : academicConfig.gradeTargets.grade2.minSurah;

    const minSurahIdx = getSurahIndexInJuzAmma(minSurahForGrade);
    const currentSurahIdx = getSurahIndexInJuzAmma(student.currentSurah);
    const isMemorizationBehind = currentSurahIdx < minSurahIdx - 2;

    if (isMemorizationBehind) {
      flags.push(`الموضع القرآني (سورة ${student.currentSurah}) متأخر عن الحد الأدنى للصف (${minSurahForGrade})`);
    }

    // Determine Risk Level & Primary Category
    let riskLevel: RiskLevel = 'low';
    let primaryCategory: InterventionCategory = 'spelling_stagnation';

    if (flags.length === 0 && evalResult.status !== 'lagging' && evalResult.status !== 'needs_support') {
      continue; // Student is healthy, no intervention needed
    }

    if (
      evalResult.spellingMasteryRate < 70 ||
      evalResult.differenceFromPlan <= -2 ||
      consecutiveAbsences >= 3 ||
      evalResult.attendanceRate < 70
    ) {
      riskLevel = 'high';
    } else if (
      evalResult.spellingMasteryRate < 82 ||
      evalResult.differenceFromPlan === -1 ||
      consecutiveAbsences >= 2 ||
      evalResult.attendanceRate < 85 ||
      student.status === 'not_moved_yet'
    ) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Select primary category
    if (consecutiveAbsences >= 2 || evalResult.attendanceRate < 75) {
      primaryCategory = 'attendance_drop';
    } else if (evalResult.spellingMasteryRate < 80 || lowSpellingAttempts >= 2) {
      primaryCategory = 'pronunciation_struggle';
    } else if (evalResult.differenceFromPlan <= -1) {
      primaryCategory = 'spelling_stagnation';
    } else {
      primaryCategory = 'memorization_lag';
    }

    // Build Pedagogical Actions & Parent Guidance
    let diagnosticSummary = '';
    let recommendedPedagogicalAction = '';
    let parentGuidanceAdvice = '';

    switch (primaryCategory) {
      case 'pronunciation_struggle':
        diagnosticSummary = `يواجه الطالب صعوبة في التمييز الصوتي ومخارج الحروف في الدرس الحالي، مما يؤدي إلى تكرار الخطأ وتدني نسبة الإتقان (${evalResult.spellingMasteryRate}%).`;
        recommendedPedagogicalAction =
          'إفراد الطالب بـ 5 دقائق تدريب صوتي حركي يومياً، واستخدام الترديد الفردي البطيء مع التركيز على مقاطع الكلمة المفككة قبل تجميعها.';
        parentGuidanceAdvice =
          'تدريب الطالب لمدة 5 دقائق يومياً في المنزل على نطق الكلمات الثلاثية بالحركات بصوت مسموع مع التشجيع المستمر والثناء على جهده.';
        break;

      case 'spelling_stagnation':
        diagnosticSummary = `تأخر الطالب عن وتيرة الخطة المقررة (${Math.abs(evalResult.differenceFromPlan)} دروس)، ويحتاج إلى تسريع ضبط التهجئة والانتقال.`;
        recommendedPedagogicalAction =
          'تقسيم درس الهجاء إلى مرحلتين خلال الجلسة الواحدة، ومرافقة الطالب مع قرين متقدم لتحفيزه أثناء المراجعة الجماعية.';
        parentGuidanceAdvice =
          'مراجعة بطاقة الهجاء الأسبوعية مع الطالب لمدة 7 دقائق بعد صلاة المغرب مع تفادي الضغط والتأكيد على روح التنافس الإيجابي.';
        break;

      case 'attendance_drop':
        diagnosticSummary = `الانقطاع المتكرر عن الجلسات (${consecutiveAbsences > 0 ? `${consecutiveAbsences} غيابات متتالية` : `نسبة حضور ${evalResult.attendanceRate}%`}) يقطع تسلسل اكتساب المهارة القرآني.`;
        recommendedPedagogicalAction =
          'التواصل الهاتفي الودي المباشر مع ولي الأمر لمعرفة سبب الغياب، وإجراء جلسة تعويضية قصيرة مدتها 10 دقائق لردم الفجوة.';
        parentGuidanceAdvice =
          'نلتمس منكم الحرص البالغ على انتظام حضور الطالب؛ فالحلقات تراكمية وكل جلسة تبني على سابقتها لحمايته من التراجع.';
        break;

      case 'memorization_lag':
      default:
        diagnosticSummary = `الفارق بين المحفوظ الفعلي (سورة ${student.currentSurah}) والمستهدف المرحلي ينم عن ضعف وتيرة التكرار المنزلي.`;
        recommendedPedagogicalAction =
          'تثبيت نصف صفحة فقط كحد أدنى متقن وتكثيف الاستماع اليومي لقارئ متقن (مثل المصحف المعلم) داخل الحلقة.';
        parentGuidanceAdvice =
          'تشغيل المصحف المعلم للآيات المقررة أثناء التنقل بالسيارة أو في المنزل لمدة 10 دقائق لتثبيت نغمة الآيات وترسيخ الحفظ.';
        break;
    }

    results.push({
      student,
      riskLevel,
      primaryCategory,
      flags,
      diagnosticSummary,
      recommendedPedagogicalAction,
      parentGuidanceAdvice,
      metrics: {
        spellingMastery: evalResult.spellingMasteryRate,
        attendanceRate: evalResult.attendanceRate,
        differenceFromPlan: evalResult.differenceFromPlan,
        consecutiveAbsences,
      },
    });
  }

  // Sort by risk severity (high -> medium -> low)
  return results.sort((a, b) => {
    const score = { high: 3, medium: 2, low: 1 };
    return score[b.riskLevel] - score[a.riskLevel];
  });
}

/**
 * Creates or updates a formal remedial plan object from an analysis
 */
export function createRemedialPlanFromAnalysis(
  analysis: EarlyWarningRiskAnalysis,
  teacherId: string,
  halaqahId: string
): RemedialActionPlan {
  const categoryTitles: Record<InterventionCategory, string> = {
    spelling_stagnation: 'خطة استدراك وتمكين الهجاء القرآني',
    pronunciation_struggle: 'خطة تقويم مخارج الحروف والتمييز الصوتي',
    attendance_drop: 'خطة معالجة الغياب وإعادة الانتظام',
    memorization_lag: 'خطة مساندة الحفظ وسد الفجوة المرحلية',
  };

  const now = new Date().toISOString();

  return {
    id: `plan_${analysis.student.id}_${Date.now()}`,
    studentId: analysis.student.id,
    studentName: analysis.student.fullName,
    halaqahId,
    teacherId,
    riskLevel: analysis.riskLevel,
    category: analysis.primaryCategory,
    title: categoryTitles[analysis.primaryCategory],
    diagnosticSummary: analysis.diagnosticSummary,
    recommendedAction: analysis.recommendedPedagogicalAction,
    parentGuidance: analysis.parentGuidanceAdvice,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Formats a constructive, encouraging message for the parent regarding the intervention
 */
export function generateInterventionParentMessage(
  plan: RemedialActionPlan,
  teacherName: string
): string {
  return `السلام عليكم ورحمة الله وبركاته،
ولي أمر الطالب الكريم: *«${plan.studentName}»* 🌸
حرصاً من مجمع الغزاوي القرآني على تمكين ابننا وتحقيق أعلى درجات الاستفادة والإتقان، نود مشاركتكم هذه الخطة التربوية المساندة:

📋 *الملاحظة التربوية:*
${plan.diagnosticSummary}

🌿 *دور الأسرة المعين بالمنزل (بضع دقائق يومياً):*
${plan.parentGuidance}

معلم الحلقة: *${teacherName}*
إدارة مجمع الغزاوي القرآني بجدة 🌿`;
}
