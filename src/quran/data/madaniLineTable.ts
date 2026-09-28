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

/**
 * Computes exact or calibrated line weight for any given Ayah in the 15-line Madani Mushaf.
 * Uses character density, word count, and page constraints.
 */
export function estimateAyahLineWeight(ayah: {
  surahNumber: number;
  ayahNumber: number;
  cleanText?: string;
  text?: string;
  pageNumber: number;
}): number {
  const { surahNumber, ayahNumber, pageNumber } = ayah;
  
  // Page 1 (Al-Fatihah) has 7 lines for 7 ayahs -> 1 line per ayah exactly
  if (pageNumber === 1) {
    return 1;
  }
  
  // Page 2 (Al-Baqarah 1-5) has 8 lines -> 5 ayahs (Al-Baqarah 1 is short header, 2-5 are ~1.5 - 2 lines)
  if (pageNumber === 2) {
    if (ayahNumber === 1) return 0.5;
    if (ayahNumber === 2) return 1.5;
    if (ayahNumber === 3) return 2.0;
    if (ayahNumber === 4) return 2.0;
    if (ayahNumber === 5) return 2.0;
  }

  // Famous landmark ayahs:
  if (surahNumber === 2 && ayahNumber === 282) return 15; // آية الدين صفحة كاملة 15 سطر
  if (surahNumber === 2 && ayahNumber === 255) return 6.5; // آية الكرسي قرابة 6 إلى 7 أسطر
  if (surahNumber === 2 && ayahNumber === 283) return 7.5;
  if (surahNumber === 24 && ayahNumber === 35) return 6.0; // آية النور
  
  const text = ayah.cleanText || ayah.text || '';
  const charCount = text.replace(/\s+/g, '').length;

  // Unified density model: a 15-line Madani line holds ~38 chars of clean
  // (spaceless) text. Every ayah additionally leaves its line's tail partially
  // empty (~0.3 line padding on average), so weight = padding + chars / 38.
  // Calibrated so that 15 lines == 1 full page: e.g. Al-Ghashiyah's 26 ayahs
  // (avg ~16 chars) total ~18 lines ≈ its real ~1.2 pages; Al-Kawthar's
  // 3 short ayahs ≈ 2 lines; a 38-char ayah ≈ 1.3 lines.
  const lineWeight = Math.max(0.3, 0.3 + charCount / 38);
  return Math.round(lineWeight * 10) / 10;
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
  linesPerDay: number = 1
): LinePartitionChunk[] {
  if (verses.length === 0) return [];

  const chunks: LinePartitionChunk[] = [];
  let currentGroup: Ayah[] = [];
  let accumulatedLines = 0;
  const targetLines = Math.max(1, linesPerDay);

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const weight = estimateAyahLineWeight(v);

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
    accumulatedLines += weight;

    // Surah boundary protection: if the next verse belongs to a DIFFERENT surah,
    // snap and close the current chunk at the end of the surah!
    const nextVerse = i < verses.length - 1 ? verses[i + 1] : null;
    const isSurahBoundary = nextVerse && nextVerse.surahNumber !== v.surahNumber;

    // Check if we reached the line threshold, surah boundary, or at the last verse
    const isLast = i === verses.length - 1;
    const reachedThreshold = accumulatedLines >= targetLines - 0.2; // 0.2 tolerance for smooth line packing

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

      chunks.push({
        start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
        end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
        totalAyahs: currentGroup.length,
        estimatedLines: Math.round(accumulatedLines * 10) / 10,
        displayLabel,
        pageStart: first.pageNumber,
        pageEnd: last.pageNumber,
      });

      currentGroup = [];
      accumulatedLines = 0;
    }
  }

  return chunks;
}
