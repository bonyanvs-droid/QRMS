import {
  AcademicYearConfig,
  DailySessionRecord,
  SpellingLesson,
  Student,
  StudentGrade,
  StudentStatus,
} from '../types';
import { SURAHS_LIST } from '../data/initialData';

// Order of Surahs in descending chronological memorization order for Juz Amma:
// 114 (الناس), 113 (الفلق), 112 (الإخلاص) ... 88 (الغاشية) ... 78 (النبأ)
export function getSurahIndexInJuzAmma(surahName: string): number {
  if (surahName === 'الفاتحة') return 0;
  const found = SURAHS_LIST.find((s) => s.name === surahName);
  if (!found) return 0;
  // Let's rank from 114 (index 1) to 78 (index 37)
  const ammaList = SURAHS_LIST.filter((s) => s.number !== 1);
  const idx = ammaList.findIndex((s) => s.name === surahName);
  return idx >= 0 ? idx + 1 : 0;
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

// Dynamic status calculation separating Quantity, Quality, Time, and Status
export function evaluateStudentStatus(
  student: Student,
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
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
  reason: string;
} {
  const studentRecords = records.filter((r) => r.studentId === student.id);
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

  // Attendance rate
  const totalDays = studentRecords.length;
  const presentDays = studentRecords.filter((r) => r.attendance === 'present').length;
  const totalAbsentDays = Math.max(0, totalDays - presentDays);
  const totalAttendedDays = presentDays;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

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
      reason: 'قرار المعلم بتثبيت الطالب لتمكين المهارة قبل الانتقال',
    };
  }

  // Advanced: Exceeded minimum Quran target OR notably ahead in spelling with evaluated high score (>=90%)
  if (isAdvancedQuran || (differenceFromPlan >= 1 && hasSpellingEvaluation && spellingMasteryRate >= 90)) {
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
      reason: isAdvancedQuran
        ? `تجاوز الحد الأدنى المقرر للصف (${minSurahForGrade}) ووصل إلى سورة ${student.currentSurah}`
        : `متقدم عن الخطة الزمنية في الهجاء ومتقن بدرجة ${spellingMasteryRate}%`,
    };
  }

  // Lagging: Behind plan by 2 or more lessons OR evaluated severely low mastery (<70) OR excessive absences
  if (
    differenceFromPlan <= -2 ||
    (hasSpellingEvaluation && differenceFromPlan < 0 && spellingMasteryRate < 70) ||
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
      reason:
        differenceFromPlan <= -2
          ? `متأخر عن الخطة بـ ${Math.abs(differenceFromPlan)} دروس (الأسبوع ${currentWeek}: المتوقع الدرس ${expectedLessonNum})`
          : attendanceRate < 70
          ? `نسبة الحضور منخفضة (${attendanceRate}%)`
          : `درجة الإتقان تحتاج تدخلاً (${spellingMasteryRate}%)`,
    };
  }

  // Needs Support: Behind by 1 lesson OR evaluated score is below passing threshold (70-84%)
  if (
    differenceFromPlan === -1 ||
    (hasSpellingEvaluation && spellingMasteryRate < academicConfig.spellingPassingThreshold)
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
      reason:
        hasSpellingEvaluation && spellingMasteryRate < academicConfig.spellingPassingThreshold
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
    reason: hasSpellingEvaluation
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

  students.forEach((student) => {
    const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);
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
