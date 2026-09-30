import {
  AcademicYearConfig,
  DailySessionRecord,
  SpellingLesson,
  Student,
  StudentGrade,
  StudentStatus,
} from '../types';
import { SURAHS_LIST } from '../data/initialData';
import { findSurahMetadata } from './quranMetadata';

// Order of Surahs in descending chronological memorization order for Juz Amma:
// 114 (الناس), 113 (الفلق), 112 (الإخلاص) ... 88 (الغاشية) ... 78 (النبأ)
// Rank increases as the student descends: الناس=1, الغاشية=27, النبأ=37, and
// continues past Juz Amma for surahs below 78. 'Al-Maa'un'-style English names
// resolve through findSurahMetadata.
export function getSurahIndexInJuzAmma(surahName: string): number {
  const meta = findSurahMetadata(surahName);
  if (!meta || meta.number === 1) return 0;
  return 115 - meta.number;
}

export function getSurahMeta(surahName: string) {
  return SURAHS_LIST.find((s) => s.name === surahName) || SURAHS_LIST[1];
}

// Compare two surahs in the learning trajectory (returns positive if s1 is further ahead than s2)
export function compareSurahProgress(s1Name: string, s2Name: string): number {
  const i1 = getSurahIndexInJuzAmma(s1Name);
  const i2 = getSurahIndexInJuzAmma(s2Name);
  return i1 - i2;
}

// Expected spelling lesson number for a given week in the 12-week operational semester (weeks 3 to 14)
export function getExpectedSpellingLessonForWeek(weekNumber: number, totalLessons = 12): number {
  // Operational weeks 3 to 14 map to lessons 1 to 12
  const operationalWeekIndex = Math.max(1, weekNumber - 2);
  return Math.min(operationalWeekIndex, totalLessons);
}

export interface StudentStatusEvalOptions {
  /** false when the student's halaqah doesn't run the spelling track — spelling
   *  signals (lesson gap, mastery) then never degrade or elevate the status. */
  spellingEnabled?: boolean;
  /** Shared plan-health state (utils/planHealth) — 'at_risk'/'deficient' plans
   *  floor the status at needs_support, matching the supervisor radar. */
  planHealth?: 'none' | 'reached' | 'deficient' | 'at_risk' | 'healthy';
  /** Pre-filtered session records for this student (skips O(n) filter per call). */
  studentRecords?: DailySessionRecord[];
}

// Dynamic status calculation separating Quantity, Quality, Time, and Status
export function evaluateStudentStatus(
  student: Student,
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig,
  opts: StudentStatusEvalOptions = {}
): {
  status: StudentStatus;
  statusLabel: string;
  isAdvancedQuran: boolean;
  isAdvancedSpelling: boolean;
  expectedLessonNum: number;
  actualLessonNum: number;
  differenceFromPlan: number;
  spellingMasteryRate: number;
  hasSpellingEvaluation: boolean;
  memorizationProgressRate: number;
  attendanceRate: number;
  totalAttendedDays: number;
  totalAbsentDays: number;
  totalLateDays: number;
  reason: string;
} {
  const studentRecords =
    opts.studentRecords ?? records.filter((r) => r.studentId === student.id);
  const spellingOn = opts.spellingEnabled !== false;
  const planFloor = opts.planHealth === 'at_risk' || opts.planHealth === 'deficient';
  const currentWeek = academicConfig.currentWeek;
  const expectedLessonNum = getExpectedSpellingLessonForWeek(currentWeek, spellingLessons.length);

  // Determine actual spelling lesson
  const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);
  const actualLessonNum = currentLesson ? currentLesson.lessonNumber : 1;
  const differenceFromPlan = actualLessonNum - expectedLessonNum;

  // Determine latest spelling evaluation record
  const latestSpellingRecord = studentRecords
    .filter((r) => r.spelling && typeof r.spelling.finalScore === 'number' && r.spelling.finalScore > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // A student is considered evaluated only if an actual session score was logged
  const hasSpellingEvaluation = Boolean(latestSpellingRecord);
  const spellingMasteryRate = latestSpellingRecord ? latestSpellingRecord.spelling!.finalScore : 0;

  // Attendance rate — 'late' counts as attended (arrived, just tardy); only an
  // explicit 'absent' mark lowers the rate. 'excused' stays neutral in neither.
  const totalDays = studentRecords.length;
  const totalLateDays = studentRecords.filter((r) => r.attendance === 'late').length;
  const totalAttendedDays = studentRecords.filter(
    (r) => r.attendance === 'present' || r.attendance === 'late'
  ).length;
  const totalAbsentDays = studentRecords.filter((r) => r.attendance === 'absent').length;
  const attendanceRate = totalDays > 0 ? Math.round((totalAttendedDays / totalDays) * 100) : 100;

  // Quran minimum vs actual comparison
  const minSurahForGrade =
    student.grade === 'تمهيدي'
      ? academicConfig.gradeTargets.tamheedi.minSurah
      : student.grade === 'صف أول'
      ? academicConfig.gradeTargets.grade1.minSurah
      : academicConfig.gradeTargets.grade2.minSurah;

  const targetMinIndex = getSurahIndexInJuzAmma(minSurahForGrade);
  const currentSurahIndex = getSurahIndexInJuzAmma(student.currentSurah);
  const isAdvancedQuran = currentSurahIndex > targetMinIndex;
  const isAdvancedSpelling =
    spellingOn &&
    hasSpellingEvaluation &&
    differenceFromPlan > 0 &&
    spellingMasteryRate >= academicConfig.spellingPassingThreshold;

  // Calculate overall memorization progress percentage towards grade target (can exceed 100%)
  const memorizationProgressRate =
    targetMinIndex > 0 ? Math.round((currentSurahIndex / targetMinIndex) * 100) : 100;

  // Check if teacher explicitly set status to not moved yet
  if (student.status === 'not_moved_yet') {
    return {
      status: 'not_moved_yet',
      statusLabel: 'لم ينتقل بعد (تثبيت)',
      isAdvancedQuran,
      isAdvancedSpelling,
      expectedLessonNum,
      actualLessonNum,
      differenceFromPlan,
      spellingMasteryRate,
      hasSpellingEvaluation,
      memorizationProgressRate,
      attendanceRate,
      totalAttendedDays,
      totalAbsentDays,
      totalLateDays,
      reason: 'قرار المعلم بتثبيت الطالب لتمكين المهارة قبل الانتقال',
    };
  }

  // Advanced: Exceeded minimum Quran target OR notably ahead in spelling with evaluated high score (>=90%)
  // Quran-advanced students are exempt from the plan-health floor (achievement trumps).
  const advancedBySpelling =
    spellingOn && differenceFromPlan >= 1 && hasSpellingEvaluation && spellingMasteryRate >= 90;
  if (isAdvancedQuran || (advancedBySpelling && !planFloor)) {
    return {
      status: 'advanced',
      statusLabel: 'متقدم ⭐',
      isAdvancedQuran,
      isAdvancedSpelling,
      expectedLessonNum,
      actualLessonNum,
      differenceFromPlan,
      spellingMasteryRate,
      hasSpellingEvaluation,
      memorizationProgressRate,
      attendanceRate,
      totalAttendedDays,
      totalAbsentDays,
      totalLateDays,
      reason: isAdvancedQuran
        ? `تجاوز الحد الأدنى المقرر للصف (${minSurahForGrade}) ووصل إلى سورة ${student.currentSurah}`
        : `متقدم عن الخطة الزمنية في الهجاء ومتقن بدرجة ${spellingMasteryRate}%`,
    };
  }

  // Lagging: Behind plan by 2 or more lessons OR evaluated severely low mastery (<70) OR excessive absences
  if (
    (spellingOn && differenceFromPlan <= -2) ||
    (spellingOn && hasSpellingEvaluation && differenceFromPlan < 0 && spellingMasteryRate < 70) ||
    attendanceRate < 70
  ) {
    return {
      status: 'lagging',
      statusLabel: 'متأخر 🔴',
      isAdvancedQuran: false,
      isAdvancedSpelling: false,
      expectedLessonNum,
      actualLessonNum,
      differenceFromPlan,
      spellingMasteryRate,
      hasSpellingEvaluation,
      memorizationProgressRate,
      attendanceRate,
      totalAttendedDays,
      totalAbsentDays,
      totalLateDays,
      reason:
        spellingOn && differenceFromPlan <= -2
          ? `متأخر عن الخطة بـ ${Math.abs(differenceFromPlan)} دروس (الأسبوع ${currentWeek}: المتوقع الدرس ${expectedLessonNum})`
          : attendanceRate < 70
          ? `نسبة الحضور منخفضة (${attendanceRate}%)`
          : `درجة الإتقان تحتاج تدخلاً (${spellingMasteryRate}%)`,
    };
  }

  // Needs Support: Behind by 1 lesson OR evaluated score below passing threshold
  // OR a plan-health floor (at_risk / target-deficient — same radar the supervisor sees)
  if (
    (spellingOn && differenceFromPlan === -1) ||
    (spellingOn && hasSpellingEvaluation && spellingMasteryRate < academicConfig.spellingPassingThreshold) ||
    planFloor
  ) {
    return {
      status: 'needs_support',
      statusLabel: 'يحتاج دعمًا 🟠',
      isAdvancedQuran: false,
      isAdvancedSpelling: false,
      expectedLessonNum,
      actualLessonNum,
      differenceFromPlan,
      spellingMasteryRate,
      hasSpellingEvaluation,
      memorizationProgressRate,
      attendanceRate,
      totalAttendedDays,
      totalAbsentDays,
      totalLateDays,
      reason: planFloor
        ? opts.planHealth === 'deficient'
          ? 'الخطة القرآنية لا تصل لمستهدف الصف — تحتاج مراجعة الخطة'
          : 'إيقاع الخطة القرآنية متعثر — يحتاج متابعة'
        : spellingOn && hasSpellingEvaluation && spellingMasteryRate < academicConfig.spellingPassingThreshold
        ? `درجة الإتقان (${spellingMasteryRate}%) أقل من معيار الاجتياز (${academicConfig.spellingPassingThreshold}%)`
        : `متأخر عن خطة الأسبوع بدرس واحد (مسجل بالدرس ${actualLessonNum} والمتوقع ${expectedLessonNum})`,
    };
  }

  // On Track: Meeting expected pace
  return {
    status: 'on_track',
    statusLabel: 'على الخطة 🔵',
    isAdvancedQuran: false,
    isAdvancedSpelling: false,
    expectedLessonNum,
    actualLessonNum,
    differenceFromPlan,
    spellingMasteryRate,
    hasSpellingEvaluation,
    memorizationProgressRate,
    attendanceRate,
    totalAttendedDays,
    totalAbsentDays,
    totalLateDays,
    reason: !spellingOn
      ? 'التقدم ضمن النطاق المتوقع (لا مسار هجاء لهذه الحلقة)'
      : hasSpellingEvaluation
      ? `مطابق للخطة التشغيلية للأسبوع الحالي مع إتقان معتمد (${spellingMasteryRate}%)`
      : `مسجل بالدرس ${actualLessonNum} المتوقع للأسبوع ${currentWeek} (بانتظار رصد التقييم)`,
  };
}

// Global analytics aggregated metrics for Public and Admin views
export function calculateAggregateMetrics(
  students: Student[],
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
) {
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      spellingAvgMastery: 0,
      spellingOnTrackPct: 0,
      spellingAdvancedPct: 0,
      spellingLaggingPct: 0,
      spellingAvgLesson: 1,
      quranAvgProgress: 0,
      quranMinTargetAchievedPct: 0,
      quranAdvancedPct: 0,
      quranNeedsSupportPct: 0,
      overallAttendancePct: 100,
      statusCounts: { advanced: 0, on_track: 0, needs_support: 0, lagging: 0, not_moved_yet: 0 },
    };
  }

  let totalSpellingScore = 0;
  let evaluatedSpellingCount = 0;
  let totalLessonNumbers = 0;
  let advancedCount = 0;
  let onTrackCount = 0;
  let needsSupportCount = 0;
  let laggingCount = 0;
  let notMovedYetCount = 0;
  let achievedMinQuranCount = 0;

  // Index records once — O(m) — instead of filtering the whole list per student
  const recordsByStudent = new Map<string, DailySessionRecord[]>();
  for (const r of records) {
    const arr = recordsByStudent.get(r.studentId);
    if (arr) arr.push(r);
    else recordsByStudent.set(r.studentId, [r]);
  }

  students.forEach((student) => {
    const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig, {
      studentRecords: recordsByStudent.get(student.id) ?? [],
    });
    if (evalResult.hasSpellingEvaluation) {
      totalSpellingScore += evalResult.spellingMasteryRate;
      evaluatedSpellingCount++;
    }
    totalLessonNumbers += evalResult.actualLessonNum;

    if (evalResult.status === 'advanced') advancedCount++;
    else if (evalResult.status === 'on_track') onTrackCount++;
    else if (evalResult.status === 'needs_support') needsSupportCount++;
    else if (evalResult.status === 'lagging') laggingCount++;
    else if (evalResult.status === 'not_moved_yet') notMovedYetCount++;

    if (evalResult.memorizationProgressRate >= 100) achievedMinQuranCount++;
  });

  const totalSessions = records.length;
  const totalPresent = records.filter((r) => r.attendance === 'present').length;
  const overallAttendancePct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 94;

  return {
    totalStudents,
    spellingAvgMastery:
      evaluatedSpellingCount > 0
        ? Math.round((totalSpellingScore / evaluatedSpellingCount) * 10) / 10
        : 0,
    spellingEvaluatedCount: evaluatedSpellingCount,
    spellingAvgLesson: Math.round((totalLessonNumbers / totalStudents) * 10) / 10,
    spellingOnTrackPct: Math.round(((onTrackCount + notMovedYetCount) / totalStudents) * 100),
    spellingAdvancedPct: Math.round((advancedCount / totalStudents) * 100),
    spellingLaggingPct: Math.round(((needsSupportCount + laggingCount) / totalStudents) * 100),
    quranAvgProgress: Math.round((achievedMinQuranCount / totalStudents) * 100),
    quranMinTargetAchievedPct: Math.round((achievedMinQuranCount / totalStudents) * 100),
    quranAdvancedPct: Math.round((advancedCount / totalStudents) * 100),
    quranNeedsSupportPct: Math.round(((needsSupportCount + laggingCount) / totalStudents) * 100),
    overallAttendancePct,
    statusCounts: {
      advanced: advancedCount,
      on_track: onTrackCount,
      needs_support: needsSupportCount,
      lagging: laggingCount,
      not_moved_yet: notMovedYetCount,
    },
  };
}
