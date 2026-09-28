/**
 * Preview script: prints real Madani line partitioning for sample ranges.
 * Run: npx tsx scripts/previewLinePlan.mts
 */
import { partitionVersesByLines } from '../src/quran/data/madaniLineTable';
import quranData from '../src/quran/data/quranData.json';

const ayahMap = new Map<string, any>();
for (const a of (quranData as any).ayahs) ayahMap.set(`${a.surahNumber}:${a.ayahNumber}`, a);

function verses(surah: number, from: number, to: number): any[] {
  const out: any[] = [];
  for (let a = from; a <= to; a++) {
    const v = ayahMap.get(`${surah}:${a}`);
    if (v) out.push(v);
  }
  return out;
}

function show(title: string, list: any[], linesPerDay: number) {
  console.log(`\n=== ${title} — ${linesPerDay} أسطر/يوم ===`);
  const chunks = partitionVersesByLines(list, linesPerDay);
  chunks.forEach((c, i) =>
    console.log(`حصة ${i + 1}: ${c.displayLabel}  [${c.estimatedLines} سطر · ص${c.pageStart}-${c.pageEnd}]`)
  );
}

// Backward plan start: Al-Ghashiyah 88 (memorized fully, ayahs 1→26 inside surah)
show('الغاشية (88) — كما في خطة العكسي', verses(88, 1, 26), 3);
show('الأعلى (87)', verses(87, 1, 19), 3);
show('الفاتحة (1) — حدود الاتجاه العكسي', verses(1, 1, 7), 3);

// Forward plan: Al-Baqarah start
show('البقرة (2) أول 20 آية — الاتجاه الطردي', verses(2, 1, 20), 5);
show('الناس+الفلق+الإخلاص — نهاية المصحف طردياً', [...verses(114, 1, 6), ...verses(113, 1, 5), ...verses(112, 1, 4)], 3);

// Revision window: 15 lines over a memorized pool (must equal ~1 page)
show('مخزون مراجعة 15 سطر — البقرة 1-35', verses(2, 1, 35), 15);
