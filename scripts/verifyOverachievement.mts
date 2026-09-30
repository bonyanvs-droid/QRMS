// Verifies: an over-achievement (actual end beyond the planned endpoint)
// is stored in actualAchieved, advances currentPosition, and reshapes the
// next milestone — and survives a second save of the same day.
import { PlanRecalculationService } from '../src/quran/services/recalculationService';
import { BundledQuranProvider } from '../src/quran/providers/BundledQuranProvider';

const provider = new BundledQuranProvider();
const svc = new PlanRecalculationService(provider);

const mkUnit = (a1: number, a2: number, label: string) => ({
  type: 'ayah' as any,
  start: { surahNumber: 1, ayahNumber: a1, surahName: 'الفاتحة' },
  end: { surahNumber: 1, ayahNumber: a2, surahName: 'الفاتحة' },
  totalAyahs: a2 - a1 + 1,
  displayLabel: label,
});

const mkDay = (id: string, date: string, a1: number, a2: number, idx: number) => ({
  id, date, dayOfWeek: 1, dayName: 'يوم', weekNumber: 1, monthNumber: 1,
  itemIndex: idx, planType: 'memorization' as const, unitType: 'ayah' as any,
  targetUnit: mkUnit(a1, a2, `الفاتحة ${a1}-${a2}`),
  isHistorical: false, isLocked: false, status: 'pending' as const,
});

const buildPlan = (): any => ({
  id: 'plan_test', studentId: 'std_test', planType: 'memorization',
  startDate: '2026-09-29', endDate: '2026-10-05',
  targetStart: { surahNumber: 1, ayahNumber: 1 },
  targetEnd: { surahNumber: 1, ayahNumber: 7 },
  direction: 'forward', unitType: 'ayah', dailyAmount: 3,
  currentPosition: { surahNumber: 1, ayahNumber: 1 },
  recalculationHistory: [],
  originalTarget: {
    displayTarget: 'الفاتحة كاملة',
    totalAyahs: 7,
    totalUnits: 7,
  },
  generatedPlan: {
    dailyPlans: [
      mkDay('d1', '2026-09-29', 1, 3, 1),
      mkDay('d2', '2026-09-30', 4, 6, 2),
      mkDay('d3', '2026-10-01', 7, 7, 3),
    ],
  },
});

let failures = 0;
const check = (label: string, cond: boolean, detail: any) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}  →  ${JSON.stringify(detail)}`);
  if (!cond) failures++;
};

// ── Save 1: planned 1-3, teacher records actual 1-5 ──────────────────────────
const p1 = await svc.recordDailyAchievement({
  plan: buildPlan(),
  dayDate: '2026-09-29',
  status: 'completed',
  actualEndPosition: { surahNumber: 1, ayahNumber: 5, surahName: 'الفاتحة' },
  recordedBy: 'teacher_test',
  evaluation: 'excellent',
});

const d1 = p1.generatedPlan.dailyPlans[0];
check('actualAchieved.end = ayah 5', d1.actualAchieved?.unit?.end?.ayahNumber === 5, d1.actualAchieved?.unit?.end);
check('currentPosition = ayah 5', p1.currentPosition?.ayahNumber === 5, p1.currentPosition);
const d2 = p1.generatedPlan.dailyPlans[1];
console.log('   d2 unit:', JSON.stringify(d2.targetUnit));
check('next milestone reaches ayah 7', d2.targetUnit?.end?.ayahNumber === 7, d2.targetUnit?.end);

// ── Save 2 (re-edit same day, still ends at 5) — must NOT regress to 3 ──────
const p2 = await svc.recordDailyAchievement({
  plan: p1,
  dayDate: '2026-09-29',
  status: 'completed',
  actualEndPosition: { surahNumber: 1, ayahNumber: 5, surahName: 'الفاتحة' },
  recordedBy: 'teacher_test',
  evaluation: 'excellent',
});

const d1b = p2.generatedPlan.dailyPlans[0];
check('re-save keeps actualAchieved.end = 5', d1b.actualAchieved?.unit?.end?.ayahNumber === 5, d1b.actualAchieved?.unit?.end);
check('re-save keeps currentPosition = 5', p2.currentPosition?.ayahNumber === 5, p2.currentPosition);
check('re-save keeps next milestone end = 7', p2.generatedPlan.dailyPlans[1].targetUnit?.end?.ayahNumber === 7, p2.generatedPlan.dailyPlans[1].targetUnit?.end);

// ── Save 3: teacher corrects DOWN to ayah 4 — plan must follow ───────────────
const p3 = await svc.recordDailyAchievement({
  plan: p2,
  dayDate: '2026-09-29',
  status: 'completed',
  actualEndPosition: { surahNumber: 1, ayahNumber: 4, surahName: 'الفاتحة' },
  recordedBy: 'teacher_test',
});

check('corrected-down actualAchieved.end = 4', p3.generatedPlan.dailyPlans[0].actualAchieved?.unit?.end?.ayahNumber === 4, p3.generatedPlan.dailyPlans[0].actualAchieved?.unit?.end);
check('corrected-down currentPosition = 4', p3.currentPosition?.ayahNumber === 4, p3.currentPosition);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
