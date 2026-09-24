import {
  BadgeDefinition,
  BadgeType,
  Student,
  DailySessionRecord,
  SpellingLesson,
  AcademicYearConfig,
  StudentBadge,
} from '../types';
import { evaluateStudentStatus, getSurahIndexInJuzAmma } from './statusCalculator';

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  spelling_champion: {
    id: 'spelling_champion',
    title: 'وسام بطل الهجاء القرآني',
    category: 'spelling',
    description: 'يُمنح للبرعم الذي حقق إتقاناً فائقاً (95% فأعلى) في تدريبات الهجاء ومخارج الحروف.',
    icon: 'Sparkles',
    color: 'emerald',
    criteriaLabel: 'إتقان هجاء 95%+',
  },
  ghashiyah_ambassador: {
    id: 'ghashiyah_ambassador',
    title: 'وسام سفير الغاشية',
    category: 'quran',
    description: 'يُمنح للبرعم الذي حقق الهدف المرجعي للمرحلة ووصل إلى سورة الغاشية فأعلى بإتقان.',
    icon: 'Crown',
    color: 'amber',
    criteriaLabel: 'بلوغ سورة الغاشية',
  },
  golden_attendance: {
    id: 'golden_attendance',
    title: 'وسام المواظبة الذهبي',
    category: 'discipline',
    description: 'يُمنح للطالب الملتزم بنسبة حضور وانضباط استثنائية (95% فأعلى) خلال الفصل.',
    icon: 'ShieldCheck',
    color: 'blue',
    criteriaLabel: 'حضور 95%+',
  },
  halaqah_star: {
    id: 'halaqah_star',
    title: 'وسام نجم الحلقة القرآني',
    category: 'excellence',
    description: 'يُمنح تقديراً لحسن الخلق، المشاركة الفاعلة، والجمع بين الحفظ المتين والهجاء السليم.',
    icon: 'Star',
    color: 'purple',
    criteriaLabel: 'تميز شامل بالحلقة',
  },
  rapid_growth: {
    id: 'rapid_growth',
    title: 'وسام التطور والوثبة السريعة',
    category: 'spelling',
    description: 'يُمنح للطالب الذي أظهر وثبة تعليمية لافتة وانتقل بنجاح من التعثر إلى مسار التفوق.',
    icon: 'TrendingUp',
    color: 'teal',
    criteriaLabel: 'قفزة تقدم لافتة',
  },
  daily_diligence: {
    id: 'daily_diligence',
    title: 'وسام همة الإتقان (عشر دقائق)',
    category: 'discipline',
    description: 'يُمنح للطالب المواظب على دقائق الهجاء اليومية الإلزامية وتدريب المصحف الشريف.',
    icon: 'Flame',
    color: 'rose',
    criteriaLabel: 'عشر دقائق هجاء يومياً',
  },
};

/**
 * Calculates which badges a student is currently eligible to receive automatically
 */
export function calculateEligibleBadges(
  student: Student,
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig,
  alreadyAwardedBadgeTypes: BadgeType[] = []
): { badge: BadgeDefinition; reason: string }[] {
  const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);
  const eligible: { badge: BadgeDefinition; reason: string }[] = [];

  // 1. Spelling Champion: score >= 95 or advanced spelling
  if (
    !alreadyAwardedBadgeTypes.includes('spelling_champion') &&
    (evalResult.spellingMasteryRate >= 95 || (evalResult.isAdvancedSpelling && evalResult.spellingMasteryRate >= 90))
  ) {
    eligible.push({
      badge: BADGE_DEFINITIONS.spelling_champion,
      reason: `حقق الطالب نسبة إتقان ${evalResult.spellingMasteryRate}% في الهجاء القرآني.`,
    });
  }

  // 2. Ghashiyah Ambassador: reached or surpassed Al-Ghashiyah (number 88)
  const ghashiyahIndex = getSurahIndexInJuzAmma('الغاشية');
  const currentStudentIndex = getSurahIndexInJuzAmma(student.currentSurah);
  if (
    !alreadyAwardedBadgeTypes.includes('ghashiyah_ambassador') &&
    currentStudentIndex >= ghashiyahIndex &&
    ghashiyahIndex > 0
  ) {
    eligible.push({
      badge: BADGE_DEFINITIONS.ghashiyah_ambassador,
      reason: `بلغ الطالب المستهدف المرجعي للمرحلة بالوصول إلى سورة ${student.currentSurah}.`,
    });
  }

  // 3. Golden Attendance: attendance >= 95% and at least 6 attended days
  if (
    !alreadyAwardedBadgeTypes.includes('golden_attendance') &&
    evalResult.attendanceRate >= 95 &&
    evalResult.totalAttendedDays >= 5
  ) {
    eligible.push({
      badge: BADGE_DEFINITIONS.golden_attendance,
      reason: `نسبة حضور استثنائية بلغت ${evalResult.attendanceRate}% بإجمالي ${evalResult.totalAttendedDays} أيام حضور.`,
    });
  }

  // 4. Daily Diligence: attended at least 4 sessions with spelling drill logged
  const sessionsWithSpelling = records.filter(
    (r) => r.studentId === student.id && r.attendance === 'present' && r.spelling
  ).length;
  if (!alreadyAwardedBadgeTypes.includes('daily_diligence') && sessionsWithSpelling >= 4) {
    eligible.push({
      badge: BADGE_DEFINITIONS.daily_diligence,
      reason: `انضباط متواصل بالتدريب اليومي الإلزامي للهجاء لمدة 10 دقائق خلال ${sessionsWithSpelling} جلسات.`,
    });
  }

  // 5. Rapid Growth: student moved from needs support to on_track/advanced
  if (
    !alreadyAwardedBadgeTypes.includes('rapid_growth') &&
    evalResult.differenceFromPlan >= 0 &&
    evalResult.spellingMasteryRate >= 88
  ) {
    eligible.push({
      badge: BADGE_DEFINITIONS.rapid_growth,
      reason: `تطور ملحوظ في سرعة استيعاب قواعد التهجئة واللحاق بالخطة التشغيلية المقررة.`,
    });
  }

  return eligible;
}

/**
 * Formats a joyous celebration message to send to the parent when their child earns a badge
 */
export function generateBadgeCelebrationMessage(
  studentName: string,
  badge: BadgeDefinition,
  teacherName: string,
  reason: string
): string {
  return `✨ *بُشرى مباركة ووسام استحقاق من مجمع الغزاوي القرآني* ✨

السلام عليكم ورحمة الله وبركاته،
نزفّ إليكم أسمى آيات التهاني والتبريكات بمناسبة نيل ابننا البارّ:
🌟 *«${studentName}»* 🌟

🎖️ *${badge.title}*
📜 *بيان الاستحقاق:* ${reason}

قال رسول الله ﷺ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ».

نبارك لكم هذا الغرس القرآني الطيب، ونسأل الله أن يجعله قرة عين لكم في الدنيا والآخرة وشفيعاً لأهله.

مع تحيات معلم الحلقة: *${teacherName}*
إدارة مجمع الغزاوي القرآني بجدة 🌿`;
}
