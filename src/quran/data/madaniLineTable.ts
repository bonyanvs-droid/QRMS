/**
 * Authoritative Madani Mushaf 15-Line Layout Mapping Table
 * (مصحف المدينة النبوية - مجمع الملك فهد لطباعة المصحف الشريف - 15 سطرًا)
 * 
 * Provides line-level metrics, line counts, and line mapping for all 604 pages and 6236 ayahs.
 * Supports smart line partitioning:
 * - Single ayah spanning multiple lines is partitioned smoothly across lines.
 * - Single line containing multiple short ayahs groups those ayahs into 1 single line unit.
 */

import { QuranPosition, Ayah } from '../types';
import { QURAN_SURAHS } from './quranMeta';
import quranLinesData from './quranLines.json';

interface QuranLinesDataset {
  ayahLineSpans: Record<string, [number, number, number][]>;
}

// Authoritative KFGQPC Madani 15-line layout: "s:a" -> [[page, startLine, endLine]]
const AYAH_LINE_SPANS: Record<string, [number, number, number][]> =
  (quranLinesData as unknown as QuranLinesDataset).ayahLineSpans;

const surahNameMap = new Map<number, string>(
  QURAN_SURAHS.map((s) => [s.surahNumber, s.arabicName])
);
const surahAyahCountMap = new Map<number, number>(
  QURAN_SURAHS.map((s) => [s.surahNumber, s.ayahCount])
);

function surahAyahSpanLabel(surahNumber: number, startAyah: number, endAyah: number): string {
  const name = surahNameMap.get(surahNumber) || `السورة ${surahNumber}`;
  const count = surahAyahCountMap.get(surahNumber) || endAyah;
  if (startAyah <= 1 && endAyah >= count) return `سورة ${name} كاملة`;
  if (startAyah === endAyah) return `سورة ${name} (آية ${startAyah})`;
  return `سورة ${name} (الآيات ${startAyah} - ${endAyah >= count ? 'إلى آخرها' : endAyah})`;
}

export function getSurahArabicName(surahNumber: number): string {
  return surahNameMap.get(surahNumber) || `السورة ${surahNumber}`;
}

export interface AyahLineSpan {
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  startLine: number; // 1 to 15
  endLine: number;   // 1 to 15
  lineCount: number; // calculated lines in standard Madani Mushaf
}

/**
 * Standard Madani line density model:
 * Standard Madani Mushaf has 15 lines per page (except pages 1 & 2 which have 7 and 8 lines).
 * Total lines in Quran = ~8,460 lines.
 */

// Known special multi-line long ayahs (surah:ayah -> approximate lines in 15-line Madani mushaf)
// Ayah of Debt (2:282) = 15 lines (full page 48)
// Ayah of Kursi (2:255) = ~6.5 lines (page 42)
// Ayah 2:283 = ~7 lines (page 49)
// Surah Al-Fatihah = 7 lines on Page 1 (1 line per ayah / header)
// Short surahs (114, 113, 112, 111, 110, 109, 108) = 1 to 3 lines per surah, 2-3 ayahs per line.

/** Distinct physical lines an ayah occupies: ["592:5","592:6",...] */
function ayahLineKeys(surahNumber: number, ayahNumber: number): string[] {
  const segments = AYAH_LINE_SPANS[`${surahNumber}:${ayahNumber}`];
  if (!segments || segments.length === 0) return [];
  const keys: string[] = [];
  for (const [page, start, end] of segments) {
    for (let l = start; l <= end; l++) keys.push(`${page}:${l}`);
  }
  return keys;
}

/**
 * Real line weight of an Ayah in the 15-line Madani Mushaf, read from the
 * bundled authoritative layout table (quranLines.json). Falls back to a
 * character-density estimate only if the ayah is missing from the table.
 */
export function estimateAyahLineWeight(ayah: {
  surahNumber: number;
  ayahNumber: number;
  cleanText?: string;
  text?: string;
  pageNumber: number;
}): number {
  const keys = ayahLineKeys(ayah.surahNumber, ayah.ayahNumber);
  if (keys.length > 0) return keys.length;

  const text = ayah.cleanText || ayah.text || '';
  const charCount = text.replace(/\s+/g, '').length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.4, Math.round((wordCount / 8.6 + charCount / 400) * 10) / 10);
}

/**
 * Intelligent Line-Based Range Partitioner:
 * Groups verses or splits long verses into daily chunks of exact lines target.
 */
export interface LinePartitionChunk {
  start: QuranPosition;
  end: QuranPosition;
  totalAyahs: number;
  estimatedLines: number;
  displayLabel: string;
  pageStart: number;
  pageEnd: number;
}

export function partitionVersesByLines(
  verses: Ayah[],
  linesPerDay: number = 1,
  options?: { crossSurah?: boolean }
): LinePartitionChunk[] {
  if (verses.length === 0) return [];

  const chunks: LinePartitionChunk[] = [];
  let currentGroup: Ayah[] = [];
  // Distinct physical lines occupied by the group. Two ayahs may share a line
  // (e.g. Al-Ghashiyah 1-2 both sit on line 5 of page 592), so we accumulate a
  // union of "page:line" keys rather than summing per-ayah weights.
  let groupLineKeys = new Set<string>();
  const targetLines = Math.max(1, linesPerDay);
  // Max lines a chunk may exceed the target to complete a surah tail.
  const MAX_OVERFLOW_LINES = 2;

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const vLines = ayahLineKeys(v.surahNumber, v.ayahNumber);
    const weight = vLines.length > 0 ? vLines.length : estimateAyahLineWeight(v);

    // If single ayah is significantly longer than the target (e.g. Ayah is 3 lines and target is 1 line)
    if (weight >= targetLines * 1.8 && currentGroup.length === 0) {
      // Split the multi-line ayah into sub-day units (e.g. 3 lines -> 3 days for that single ayah)
      const subDays = Math.max(2, Math.round(weight / targetLines));
      for (let part = 1; part <= subDays; part++) {
        chunks.push({
          start: { surahNumber: v.surahNumber, ayahNumber: v.ayahNumber, globalIndex: v.globalIndex },
          end: { surahNumber: v.surahNumber, ayahNumber: v.ayahNumber, globalIndex: v.globalIndex },
          totalAyahs: 1,
          estimatedLines: targetLines,
          displayLabel: `سورة ${getSurahArabicName(v.surahNumber)} (آية ${v.ayahNumber} - جزء ${part} من ${subDays})`,
          pageStart: v.pageNumber,
          pageEnd: v.pageNumber,
        });
      }
      continue;
    }

    currentGroup.push(v);
    for (const k of vLines) groupLineKeys.add(k);
    if (vLines.length === 0) {
      // Missing layout data — approximate via estimated weight on a private key space
      const est = estimateAyahLineWeight(v);
      for (let f = 0; f < est; f++) groupLineKeys.add(`est:${v.globalIndex}:${f}`);
    }
    const accumulatedLines = groupLineKeys.size;

    // Surah boundary protection: if the next verse belongs to a DIFFERENT surah,
    // snap and close the current chunk at the end of the surah!
    const nextVerse = i < verses.length - 1 ? verses[i + 1] : null;
    const isSurahBoundary =
      !options?.crossSurah && nextVerse && nextVerse.surahNumber !== v.surahNumber;

    // Check if we reached the line threshold, surah boundary, or at the last verse.
    const isLast = i === verses.length - 1;
    let reachedThreshold = accumulatedLines >= targetLines;

    // Surah-completion overflow (MakeenCore rule): if the threshold was just
    // reached but the remaining same-surah tail needs at most
    // MAX_OVERFLOW_LINES additional lines, absorb it instead of leaving a
    // weak tail chunk (e.g. a final 1-line day for Al-Ghashiyah 25-26).
    // Skipped for crossSurah (revision windows) — there is no weak tail when
    // the window simply continues into the next surah like a real page.
    if (reachedThreshold && !isSurahBoundary && !isLast && !options?.crossSurah) {
      const tailKeys = new Set(groupLineKeys);
      let j = i + 1;
      while (j < verses.length && verses[j].surahNumber === v.surahNumber) {
        for (const k of ayahLineKeys(verses[j].surahNumber, verses[j].ayahNumber)) {
          tailKeys.add(k);
        }
        j++;
      }
      if (tailKeys.size - groupLineKeys.size <= MAX_OVERFLOW_LINES) {
        reachedThreshold = false; // keep accumulating — the tail merges into today
      }
    }

    if (reachedThreshold || isSurahBoundary || isLast) {
      const first = currentGroup[0];
      const last = currentGroup[currentGroup.length - 1];
      
      let displayLabel = '';
      if (first.surahNumber === last.surahNumber) {
        displayLabel = surahAyahSpanLabel(first.surahNumber, first.ayahNumber, last.ayahNumber);
      } else {
        const endCount = surahAyahCountMap.get(last.surahNumber) || last.ayahNumber;
        const endPart =
          last.ayahNumber >= endCount
            ? `سورة ${getSurahArabicName(last.surahNumber)} إلى آخرها`
            : `سورة ${getSurahArabicName(last.surahNumber)} (${last.ayahNumber})`;
        displayLabel = `من سورة ${getSurahArabicName(first.surahNumber)} (${first.ayahNumber}) إلى ${endPart}`;
      }
      // Explainable capacity: surface why the chunk exceeded the requested target.
      if (accumulatedLines > targetLines) {
        displayLabel += options?.crossSurah
          ? ` (+${accumulatedLines - targetLines} سطر — لسلامة الآية)`
          : ` (+${accumulatedLines - targetLines} سطر — لسلامة الآية/إتمام السورة)`;
      }

      chunks.push({
        start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
        end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
        totalAyahs: currentGroup.length,
        estimatedLines: accumulatedLines,
        displayLabel,
        pageStart: first.pageNumber,
        pageEnd: last.pageNumber,
      });

      currentGroup = [];
      groupLineKeys = new Set();
    }
  }

  return chunks;
}
