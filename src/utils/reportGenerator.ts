import {
  AcademicYearConfig,
  DailySessionRecord,
  EducationalPlanWeek,
  Halaqah,
  SpellingLesson,
  Student,
  Teacher,
} from '../types';
import { evaluateStudentStatus } from './statusCalculator';

export function generateParentWeeklyReport(
  student: Student,
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  halaqahs: Halaqah[],
  teachers: Teacher[],
  academicConfig: AcademicYearConfig,
  options?: { tenantName?: string }
): string {
  const halaqah = halaqahs.find((h) => h.id === student.halaqahId);
  const teacher = teachers.find((t) => t.id === student.teacherId);
  const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);
  const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);

  const studentRecords = records.filter(
    (r) => r.studentId === student.id && r.weekNumber === academicConfig.currentWeek
  );

  const latestMem = studentRecords.find((r) => r.memorization);
  const latestRev = studentRecords.find((r) => r.revision);

  const memText = latestMem?.memorization
    ? `من سورة ${latestMem.memorization.surahFrom} (${latestMem.memorization.ayahFrom}) إلى ${latestMem.memorization.surahTo} (${latestMem.memorization.ayahTo}) بإتقان ${latestMem.memorization.score}%`
    : `سورة ${student.currentSurah} - آية ${student.currentAyah}`;

  const revText = latestRev?.revision
    ? `من سورة ${latestRev.revision.surahFrom} إلى ${latestRev.revision.surahTo} (${latestRev.revision.type}) بإتقان ${latestRev.revision.score}%`
    : `مراجعة قصار السور السابقة`;

  const statusEmoji =
    evalResult.status === 'advanced'
      ? '⭐ متقدم متميز'
      : evalResult.status === 'on_track'
      ? '🟢 على الخطة المقررة'
      : evalResult.status === 'not_moved_yet'
      ? '🔵 قيد التثبيت والتمكين'
      : evalResult.status === 'needs_support'
      ? '🟠 يحتاج متابعة منزلية'
      : '🔴 متأخر ويحتاج تكثيف الحضور';

  const tenantName = options?.tenantName || 'مجمع حلقات جامع الغزاوي';

  return `🕌 *${tenantName} – منصة الحلقات القرآنية*
السلام عليكم ورحمة الله وبركاته،
المكرم ولي أمر الطالب: *${student.fullName}* حفظه الله
الصف: *${student.grade}* | ${halaqah?.name || 'الحلقة القرآنية'}
المعلم المشرف: *${teacher?.name || 'معلم الحلقة'}*

نشارككم التقرير الأسبوعي لإنجاز ابنكم في الأسبوع التشغيلي (*${academicConfig.currentWeek}*):

📖 *الهجاء القرآني:*
الدرس الحالي: ${currentLesson ? `الدرس ${currentLesson.lessonNumber}: ${currentLesson.title}` : 'مسار الهجاء'}
درجة الإتقان: ${evalResult.spellingMasteryRate}%

✨ *الحفظ القرآني:*
الموضع المنجز: ${memText}
الحد الأدنى المستهدف: سورة ${student.minimumTargetSurah} ${student.personalTargetSurah ? `| الهدف الشخصي: سورة ${student.personalTargetSurah}` : ''}

🔄 *المراجعة والتثبيت:*
${revText}

📊 *الحضور والانتظام:*
نسبة الحضور: ${evalResult.attendanceRate}% (${evalResult.attendanceRate >= 90 ? 'ممتاز' : 'يحتاج مواظبة'})

🎯 *الحالة العامة:* ${statusEmoji}

💡 *توصية المعلم:*
${student.notes || 'الاستمرار في المراجعة المنزلية اليومية لمدة 10 دقائق لترسيخ الهجاء والحفظ.'}

نسأل الله تعالى أن يجعله من أهل القرآن وخاصته.
_منصة الحلقات القرآنية – ${tenantName}_`;
}

export function generateParentMonthlyReport(
  student: Student,
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig,
  options?: { academicOutcome?: string; tenantName?: string }
): string {
  const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);
  const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);
  const outcome = options?.academicOutcome || '«متقنٌ لهجاء القرآن وحفظه إلى الغاشية»';
  const tenantName = options?.tenantName || 'مجمع حلقات جامع الغزاوي';

  return `🕌 *${tenantName} – التقرير الشهري للطلاب*
السلام عليكم ورحمة الله وبركاته،
ولي أمر الطالب: *${student.fullName}*
المخرج القرآني المرجعي: ${outcome}

ملخص التقدم خلال الشهر المنصرم:
🌟 متوسط إتقان الهجاء القرآني: ${evalResult.spellingMasteryRate}% (الدرس ${currentLesson?.lessonNumber || 1})
📖 المحفوظ الحالي: سورة ${student.currentSurah} (آية ${student.currentAyah})
🎯 نسبة تحقيق المستهدف: ${evalResult.memorizationProgressRate}%
📈 الاتجاه الزمني: ${evalResult.statusLabel}
⚡ نسبة المواظبة والحضور: ${evalResult.attendanceRate}%

التوصية التربوية والقرآنية:
${evalResult.reason}

شاكرين لكم عظيم اهتمامكم وتكاملكم مع المسجد.`;
}

export function generateTeacherWeeklyReport(
  teacher: Teacher,
  students: Student[],
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig
): string {
  const myStudents = students.filter((s) => s.teacherId === teacher.id);
  const evals = myStudents.map((s) => ({
    student: s,
    eval: evaluateStudentStatus(s, records, spellingLessons, academicConfig),
  }));

  const advanced = evals.filter((e) => e.eval.status === 'advanced');
  const onTrack = evals.filter((e) => e.eval.status === 'on_track' || e.eval.status === 'not_moved_yet');
  const needsSupport = evals.filter((e) => e.eval.status === 'needs_support');
  const lagging = evals.filter((e) => e.eval.status === 'lagging');

  const avgSpelling =
    evals.length > 0
      ? Math.round(evals.reduce((acc, curr) => acc + curr.eval.spellingMasteryRate, 0) / evals.length)
      : 0;

  return `📋 *تقرير المعلم الأسبوعي – مسجد الغزاوي*
المعلم: *${teacher.name}* | ${teacher.halaqahName}
الأسبوع التشغيلي: *${academicConfig.currentWeek}* (من 12 أسبوعاً)

📊 *مؤشرات الحلقة:*
• إجمالي عدد الطلاب: ${myStudents.length}
• متوسط إتقان الهجاء: ${avgSpelling}%
• الطلاب المتقدمون ⭐ (${advanced.length}): ${advanced.map((a) => a.student.fullName.split(' ')[0]).join('، ') || 'لا يوجد'}
• الطلاب على الخطة 🟢 (${onTrack.length}): ${onTrack.map((o) => o.student.fullName.split(' ')[0]).join('، ') || 'لا يوجد'}
• يحتاجون دعماً 🟠 (${needsSupport.length}): ${needsSupport.map((n) => n.student.fullName.split(' ')[0]).join('، ') || 'لا يوجد'}
• متأخرون 🔴 (${lagging.length}): ${lagging.map((l) => l.student.fullName.split(' ')[0]).join('، ') || 'لا يوجد'}

🔔 *تنبيهات التدخل السريع:*
${
  needsSupport.length + lagging.length > 0
    ? `يرجى التركيز في يوم الهجاء والـ 10 دقائق اليومية على: ${[...needsSupport, ...lagging]
        .map((x) => `${x.student.fullName} (${x.eval.reason})`)
        .join(' | ')}`
    : 'الحلقة تسير بوتيرة ممتازة دون حالات تعثر حرجة.'
}

بارك الله في جهودكم ونفع بكم.`;
}

export function generateGeneralParentsGroupReport(
  academicConfig: AcademicYearConfig,
  currentWeekPlan: EducationalPlanWeek | undefined,
  metrics: {
    totalStudents: number;
    spellingAvgMastery: number;
    spellingOnTrackPct: number;
    spellingAdvancedPct: number;
    overallAttendancePct: number;
  },
  options?: { academicOutcome?: string; tenantName?: string }
): string {
  const outcome = options?.academicOutcome || '«متقنٌ لهجاء القرآن وحفظه إلى الغاشية»';
  const tenantName = options?.tenantName || 'مسجد الغزاوي بمدينة جدة';

  return `🌿 *${outcome}* 🌿
🕌 *منصة الحلقات القرآنية – ${tenantName}*

أولياء الأمور الكرام، السلام عليكم ورحمة الله وبركاته..
نشارككم بإعتزاز إنجاز أبنائنا الطلاب المباركين في ختام الأسبوع التشغيلي (*${academicConfig.currentWeek}*):

📊 *حصاد الأسبوع الإجمالي:*
📖 متوسط إتقان الهجاء القرآني: *${metrics.spellingAvgMastery}%*
🎯 نسبة الطلاب الملتزمين بالخطة والمتقدمين: *${metrics.spellingOnTrackPct + metrics.spellingAdvancedPct}%*
⭐ نسبة الطلاب المتقدمين عن أهدافهم: *${metrics.spellingAdvancedPct}%*
✨ نسبة الحضور والمواظبة: *${metrics.overallAttendancePct}%*

🌱 *الخطة التربوية للأسبوع:*
${currentWeekPlan ? `الهدف: ${currentWeekPlan.educationalGoal}\nالشعار: ${currentWeekPlan.motto}\nالنشاط المنفذ: ${currentWeekPlan.activity}` : 'تم تنفيذ الأنشطة التربوية المعتمدة بنجاح.'}

نسأل الله تعالى أن يبارك في أبنائنا، وأن يجزيهم ووالديهم ومعلميهم خير الجزاء.
_إدارة المجمع القرآني – ${tenantName}_`;
}

export function generatePrepWeekAnnouncement(
  nextWeekNumber: number,
  nextWeekPlan: EducationalPlanWeek | undefined,
  options?: { targetSurah?: string; tenantName?: string }
): string {
  const target = options?.targetSurah || 'المقرر المستهدف';
  const tenantName = options?.tenantName || 'مجمع حلقات جامع الغزاوي بجدة';

  return `📢 *رسالة تحضيرية للأسبوع القادم (${nextWeekNumber})*
🕌 *${tenantName}*

أولياء الأمور الكرام ومعلمي الحلقات الأفاضل،
نستعد معاً لانطلاق الأسبوع التشغيلي (*${nextWeekNumber}*) بحول الله تعالى:

🎯 *الهدف التربوي:* ${nextWeekPlan?.educationalGoal || 'تعزيز الإتقان القرآني وتثبيت المهارات'}
🌟 *شعار الأسبوع:* ${nextWeekPlan?.motto || '«همتي في قرآني»'}
🎨 *النشاط المخطط:* ${nextWeekPlan?.activity || 'ورش تفاعلية وتسميع متميز'}
📖 *التركيز القرآني:* إتمام دروس الهجاء المجدولة ومواصلة الحفظ نحو ${target}.

نرجو حث الأبناء على الحضور المبكر وتجهيز المصاحف ودفاتر الهجاء.`;
}

// Generates direct WhatsApp click URL
export function createWhatsAppUrl(phone: string, text: string): string {
  // Format Saudi phone: 05xxxxxxx -> 9665xxxxxxx
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('05')) {
    cleanPhone = '966' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('966') && cleanPhone.startsWith('5')) {
    cleanPhone = '966' + cleanPhone;
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}
