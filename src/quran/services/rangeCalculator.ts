import {
  QuranPosition,
  PlanningUnitType,
  PlanningUnit,
  QuranRangeMetrics,
  Ayah,
} from '../types';
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { formatQuranPosition, formatQuranRange } from '../utils/positionFormatter';
import { partitionVersesByLines } from '../data/madaniLineTable';
import { getSurahsInRangeByDirection, getSurahArabicName } from '../../utils/quranMetadata';

/**
 * Range and Planning Unit Calculator
 *
 * Provides purely mathematical and structural calculations over Quran coordinates.
 * Completely decoupled from specific student rosters, stages, or educational curricula.
 */
export class RangeCalculator {
  constructor(private readonly provider: IQuranDataProvider) {}

  /**
   * Calculates metrics for any range in the Quran.
   */
  async getMetrics(start: QuranPosition, end: QuranPosition): Promise<QuranRangeMetrics> {
    return this.provider.resolveRangeMetrics(start, end);
  }

  /**
   * Retrieves all verses in the given range.
   */
  async getVersesInRange(
    start: QuranPosition,
    end: QuranPosition,
    direction?: 'forward' | 'backward'
  ): Promise<Ayah[]> {
    return this.provider.getAyahsInRange(start, end, direction);
  }

  /**
   * Partitions an arbitrary Quran range into structured Planning Units
   * (Ayah, Verse Range, Page, Half Page, Surah, Juz, Hizb, Quarter).
   *
   * Note on Half-Pages:
   * A half-page is derived reliably by dividing the ordered verses of a specific page
   * into two halves (Part 1 and Part 2) based on median verse index.
   */
  async partitionRangeIntoUnits(
    start: QuranPosition,
    end: QuranPosition,
    unitType: PlanningUnitType,
    amount = 1,
    direction?: 'forward' | 'backward'
  ): Promise<PlanningUnit[]> {
    const verses = await this.provider.getAyahsInRange(start, end, direction);
    if (verses.length === 0) return [];

    const units: PlanningUnit[] = [];

    switch (unitType) {
      case 'line': {
        const lineChunks = partitionVersesByLines(verses, amount);
        for (const lc of lineChunks) {
          units.push({
            type: 'line',
            start: lc.start,
            end: lc.end,
            totalAyahs: lc.totalAyahs,
            displayLabel: lc.displayLabel,
            pageStart: lc.pageStart,
            pageEnd: lc.pageEnd,
            estimatedLines: lc.estimatedLines,
          });
        }
        break;
      }

      case 'quarter_page': {
        // Group by page, then split into 4 quarters
        const pagesMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = pagesMap.get(v.pageNumber) || [];
          list.push(v);
          pagesMap.set(v.pageNumber, list);
        }

        for (const [pageNum, pageVerses] of pagesMap.entries()) {
          const qSize = Math.max(1, Math.ceil(pageVerses.length / 4));
          for (let q = 0; q < pageVerses.length; q += qSize) {
            const qChunk = pageVerses.slice(q, q + qSize);
            const first = qChunk[0];
            const last = qChunk[qChunk.length - 1];
            const qNum = Math.floor(q / qSize) + 1;
            units.push({
              type: 'quarter_page',
              start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
              end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
              totalAyahs: qChunk.length,
              displayLabel: `صفحة ${pageNum} (الربع ${qNum})`,
              pageStart: pageNum,
              pageEnd: pageNum,
            });
          }
        }
        break;
      }

      case 'ayah': {
        const chunkSize = Math.max(1, amount);
        for (let i = 0; i < verses.length; i += chunkSize) {
          const chunk = verses.slice(i, i + chunkSize);
          const first = chunk[0];
          const last = chunk[chunk.length - 1];
          units.push({
            type: 'ayah',
            start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
            end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
            totalAyahs: chunk.length,
            displayLabel:
              first.globalIndex === last.globalIndex
                ? formatQuranPosition(first, { withPrefix: true })
                : formatQuranRange(first, last, { includeSurahWord: true }),
            pageStart: first.pageNumber,
            pageEnd: last.pageNumber,
          });
        }
        break;
      }

      case 'page': {
        // Group by page
        const pagesMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = pagesMap.get(v.pageNumber) || [];
          list.push(v);
          pagesMap.set(v.pageNumber, list);
        }

        const pageEntries = Array.from(pagesMap.entries());
        const chunkSize = Math.max(1, amount);

        for (let i = 0; i < pageEntries.length; i += chunkSize) {
          const chunk = pageEntries.slice(i, i + chunkSize);
          const allChunkVerses = chunk.flatMap(([, vList]) => vList);
          const first = allChunkVerses[0];
          const last = allChunkVerses[allChunkVerses.length - 1];
          const pageNumbers = chunk.map(([pNum]) => pNum);

          const displayLabel =
            pageNumbers.length === 1
              ? `صفحة ${pageNumbers[0]}`
              : `صفحة ${pageNumbers[0]} - ${pageNumbers[pageNumbers.length - 1]} (${pageNumbers.length} صفحات)`;

          units.push({
            type: 'page',
            start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
            end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
            totalAyahs: allChunkVerses.length,
            displayLabel,
            pageStart: Math.min(...pageNumbers),
            pageEnd: Math.max(...pageNumbers),
          });
        }
        break;
      }

      case 'half_page': {
        // Group by page, then split each page into top and bottom halves
        const pagesMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = pagesMap.get(v.pageNumber) || [];
          list.push(v);
          pagesMap.set(v.pageNumber, list);
        }

        for (const [pageNum, pageVerses] of pagesMap.entries()) {
          if (pageVerses.length <= 1) {
            const only = pageVerses[0];
            units.push({
              type: 'half_page',
              start: { surahNumber: only.surahNumber, ayahNumber: only.ayahNumber, globalIndex: only.globalIndex },
              end: { surahNumber: only.surahNumber, ayahNumber: only.ayahNumber, globalIndex: only.globalIndex },
              totalAyahs: 1,
              displayLabel: `صفحة ${pageNum} (كاملة)`,
              pageStart: pageNum,
              pageEnd: pageNum,
            });
          } else {
            const mid = Math.ceil(pageVerses.length / 2);
            const firstHalf = pageVerses.slice(0, mid);
            const secondHalf = pageVerses.slice(mid);

            const f1 = firstHalf[0];
            const l1 = firstHalf[firstHalf.length - 1];
            units.push({
              type: 'half_page',
              start: { surahNumber: f1.surahNumber, ayahNumber: f1.ayahNumber, globalIndex: f1.globalIndex },
              end: { surahNumber: l1.surahNumber, ayahNumber: l1.ayahNumber, globalIndex: l1.globalIndex },
              totalAyahs: firstHalf.length,
              displayLabel: `صفحة ${pageNum} (النصف الأول)`,
              pageStart: pageNum,
              pageEnd: pageNum,
            });

            if (secondHalf.length > 0) {
              const f2 = secondHalf[0];
              const l2 = secondHalf[secondHalf.length - 1];
              units.push({
                type: 'half_page',
                start: { surahNumber: f2.surahNumber, ayahNumber: f2.ayahNumber, globalIndex: f2.globalIndex },
                end: { surahNumber: l2.surahNumber, ayahNumber: l2.ayahNumber, globalIndex: l2.globalIndex },
                totalAyahs: secondHalf.length,
                displayLabel: `صفحة ${pageNum} (النصف الثاني)`,
                pageStart: pageNum,
                pageEnd: pageNum,
              });
            }
          }
        }
        break;
      }

      case 'surah': {
        const surahsMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = surahsMap.get(v.surahNumber) || [];
          list.push(v);
          surahsMap.set(v.surahNumber, list);
        }

        const surahEntries = Array.from(surahsMap.entries());
        const chunkSize = Math.max(1, amount);

        for (let i = 0; i < surahEntries.length; i += chunkSize) {
          const chunk = surahEntries.slice(i, i + chunkSize);
          const allChunkVerses = chunk.flatMap(([, vList]) => vList);
          const first = allChunkVerses[0];
          const last = allChunkVerses[allChunkVerses.length - 1];
          const surahNumbers = chunk.map(([sNum]) => sNum);

          // Build arabic surah names if available
          const surahNames = await Promise.all(
            surahNumbers.map(async (sNum) => {
              const sObj = await this.provider.getSurah(sNum);
              return sObj ? `سورة ${sObj.arabicName}` : `سورة ${sNum}`;
            })
          );

          units.push({
            type: 'surah',
            start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
            end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
            totalAyahs: allChunkVerses.length,
            displayLabel: surahNames.join(' + '),
            pageStart: first.pageNumber,
            pageEnd: last.pageNumber,
          });
        }
        break;
      }

      case 'juz': {
        const juzMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = juzMap.get(v.juzNumber) || [];
          list.push(v);
          juzMap.set(v.juzNumber, list);
        }

        const juzEntries = Array.from(juzMap.entries());
        const chunkSize = Math.max(1, amount);

        for (let i = 0; i < juzEntries.length; i += chunkSize) {
          const chunk = juzEntries.slice(i, i + chunkSize);
          const allChunkVerses = chunk.flatMap(([, vList]) => vList);
          const first = allChunkVerses[0];
          const last = allChunkVerses[allChunkVerses.length - 1];
          const juzNumbers = chunk.map(([jNum]) => jNum);

          const displayLabel =
            juzNumbers.length === 1
              ? `الجزء ${juzNumbers[0]}`
              : `الأجزاء ${juzNumbers[0]} - ${juzNumbers[juzNumbers.length - 1]}`;

          units.push({
            type: 'juz',
            start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
            end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
            totalAyahs: allChunkVerses.length,
            displayLabel,
            pageStart: first.pageNumber,
            pageEnd: last.pageNumber,
          });
        }
        break;
      }

      case 'hizb': {
        const hizbMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = hizbMap.get(v.hizbNumber) || [];
          list.push(v);
          hizbMap.set(v.hizbNumber, list);
        }

        const hizbEntries = Array.from(hizbMap.entries());
        const chunkSize = Math.max(1, amount);

        for (let i = 0; i < hizbEntries.length; i += chunkSize) {
          const chunk = hizbEntries.slice(i, i + chunkSize);
          const allChunkVerses = chunk.flatMap(([, vList]) => vList);
          const first = allChunkVerses[0];
          const last = allChunkVerses[allChunkVerses.length - 1];
          const hizbNumbers = chunk.map(([hNum]) => hNum);

          const displayLabel =
            hizbNumbers.length === 1
              ? `الحزب ${hizbNumbers[0]}`
              : `الأحزاب ${hizbNumbers[0]} - ${hizbNumbers[hizbNumbers.length - 1]}`;

          units.push({
            type: 'hizb',
            start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
            end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
            totalAyahs: allChunkVerses.length,
            displayLabel,
            pageStart: first.pageNumber,
            pageEnd: last.pageNumber,
          });
        }
        break;
      }

      case 'quarter': {
        const quartersMap = new Map<number, Ayah[]>();
        for (const v of verses) {
          const list = quartersMap.get(v.quarter) || [];
          list.push(v);
          quartersMap.set(v.quarter, list);
        }

        const quarterEntries = Array.from(quartersMap.entries());
        const chunkSize = Math.max(1, amount);

        for (let i = 0; i < quarterEntries.length; i += chunkSize) {
          const chunk = quarterEntries.slice(i, i + chunkSize);
          const allChunkVerses = chunk.flatMap(([, vList]) => vList);
          const first = allChunkVerses[0];
          const last = allChunkVerses[allChunkVerses.length - 1];
          const quarterNumbers = chunk.map(([qNum]) => qNum);

          const displayLabel =
            quarterNumbers.length === 1
              ? `الربع ${quarterNumbers[0]}`
              : `الأرباع ${quarterNumbers[0]} - ${quarterNumbers[quarterNumbers.length - 1]}`;

          units.push({
            type: 'quarter',
            start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
            end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
            totalAyahs: allChunkVerses.length,
            displayLabel,
            pageStart: first.pageNumber,
            pageEnd: last.pageNumber,
          });
        }
        break;
      }

      default: {
        // Default to single full range
        const first = verses[0];
        const last = verses[verses.length - 1];
        units.push({
          type: 'verse_range',
          start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
          end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
          totalAyahs: verses.length,
          displayLabel: formatQuranRange(first, last, { includeSurahWord: true }),
          pageStart: first.pageNumber,
          pageEnd: last.pageNumber,
        });
      }
    }

    return units;
  }

  /**
   * Partitions range surah-by-surah with cumulative memorization and automatic 3-day consolidation cycles,
   * along with dynamic rolling revision covering accumulated memorized verses up to the daily revision limit.
   *
   * Pedagogical Rules:
   * 1. Cumulative Memorization: Daily memorization assignment always begins at Ayah 1 of the current Surah.
   * 2. Strict Surah Boundaries: A day's plan unit NEVER crosses between two Surahs.
   * 3. 3-Day Consolidation Cycle: When a Surah completes, 3 consecutive full-surah consolidation units are inserted.
   * 4. Sequential Flow: The next Surah starts on the next day after consolidation.
   * 5. Rolling Revision Cycle:
   *    When a student starts new memorization without prior background, revision starts by reviewing
   *    the accumulated memorized verses (e.g. Day 1 reviews Day 1, Day 2 reviews Days 1-2) until
   *    reaching the designated revision capacity (e.g. 1 page), after which it rolls across the memorized scope.
   */
  async partitionSurahsWithCumulativePaceAndConsolidation(
    start: QuranPosition,
    end: QuranPosition,
    unitType: PlanningUnitType,
    dailyAmount = 1,
    direction: 'forward' | 'backward' = 'backward',
    consolidationDays = 3,
    revisionDailyPages = 1,
    initialMemorizedVerses: Ayah[] = []
  ): Promise<PlanningUnit[]> {
    const surahs = getSurahsInRangeByDirection(start.surahNumber, end.surahNumber, direction);
    if (!surahs || surahs.length === 0) return [];

    const units: PlanningUnit[] = [];

    // Track all unique verses memorized so far in chronological learning sequence.
    // Auto Minor Revision: seeded with the student's prior memorization so the rolling
    // window rotates across prior + new memorization as one pool.
    const memorizedVersesAccumulator: Ayah[] = [...initialMemorizedVerses];
    let revisionWindowOffset = 0;
    if (initialMemorizedVerses.length > 0) {
      // Start the window at the most recently memorized pages (nearest to plan start)
      const seedPageCount = new Set(initialMemorizedVerses.map((v) => v.pageNumber)).size;
      revisionWindowOffset = Math.max(
        0,
        seedPageCount - Math.max(1, Math.round(revisionDailyPages))
      );
    }

    for (let sIdx = 0; sIdx < surahs.length; sIdx++) {
      const surahEntry = surahs[sIdx];
      const isFirstSurah = sIdx === 0;
      const isLastSurah = sIdx === surahs.length - 1;

      const surahStartAyah = isFirstSurah ? start.ayahNumber : 1;
      const surahEndAyah = isLastSurah ? end.ayahNumber : surahEntry.ayahsCount;

      // Get verses for this specific Surah
      const surahVerses: Ayah[] = [];
      for (let a = surahStartAyah; a <= surahEndAyah; a++) {
        const v = await this.provider.getAyah(surahEntry.number, a);
        if (v) surahVerses.push(v);
      }

      if (surahVerses.length === 0) continue;

      let endAyahCheckpoints: number[] = [];

      if (unitType === 'ayah') {
        const step = Math.max(1, dailyAmount);
        for (let a = surahStartAyah + step - 1; a < surahEndAyah; a += step) {
          endAyahCheckpoints.push(a);
        }
        endAyahCheckpoints.push(surahEndAyah);
      } else if (unitType === 'line') {
        const lineChunks = partitionVersesByLines(surahVerses, Math.max(1, dailyAmount));
        for (const lc of lineChunks) {
          endAyahCheckpoints.push(lc.end.ayahNumber);
        }
        if (endAyahCheckpoints.length === 0 || endAyahCheckpoints[endAyahCheckpoints.length - 1] < surahEndAyah) {
          endAyahCheckpoints.push(surahEndAyah);
        }
      } else if (unitType === 'half_page' || unitType === 'page' || unitType === 'quarter_page') {
        const pagesMap = new Map<number, Ayah[]>();
        for (const v of surahVerses) {
          const list = pagesMap.get(v.pageNumber) || [];
          list.push(v);
          pagesMap.set(v.pageNumber, list);
        }

        if (unitType === 'half_page') {
          for (const [, pVerses] of pagesMap.entries()) {
            if (pVerses.length <= 1) {
              endAyahCheckpoints.push(pVerses[0].ayahNumber);
            } else {
              const mid = Math.ceil(pVerses.length / 2);
              endAyahCheckpoints.push(pVerses[mid - 1].ayahNumber);
              endAyahCheckpoints.push(pVerses[pVerses.length - 1].ayahNumber);
            }
          }
        } else {
          for (const [, pVerses] of pagesMap.entries()) {
            endAyahCheckpoints.push(pVerses[pVerses.length - 1].ayahNumber);
          }
        }
        if (endAyahCheckpoints.length === 0 || endAyahCheckpoints[endAyahCheckpoints.length - 1] < surahEndAyah) {
          endAyahCheckpoints.push(surahEndAyah);
        }
      } else {
        endAyahCheckpoints.push(surahEndAyah);
      }

      endAyahCheckpoints = Array.from(new Set(endAyahCheckpoints)).sort((a, b) => a - b);
      if (endAyahCheckpoints[endAyahCheckpoints.length - 1] !== surahEndAyah) {
        endAyahCheckpoints.push(surahEndAyah);
      }

      // 1. Progressive Cumulative Memorization Days: starting from Ayah 1 of the current Surah
      for (const currEndAyah of endAyahCheckpoints) {
        const firstVerse = (await this.provider.getAyah(surahEntry.number, 1)) || surahVerses[0];
        const lastVerse = (await this.provider.getAyah(surahEntry.number, currEndAyah)) || surahVerses[surahVerses.length - 1];

        // Accumulate newly memorized verses up to currEndAyah
        for (let a = 1; a <= currEndAyah; a++) {
          const exists = memorizedVersesAccumulator.some(
            (mv) => mv.surahNumber === surahEntry.number && mv.ayahNumber === a
          );
          if (!exists) {
            const v = (await this.provider.getAyah(surahEntry.number, a)) ||
              surahVerses.find((sv) => sv.ayahNumber === a);
            if (v) memorizedVersesAccumulator.push(v);
          }
        }

        // Compute dynamic rolling revision info
        const revisionInfo = this.computeRollingRevision(
          memorizedVersesAccumulator,
          revisionDailyPages,
          revisionWindowOffset
        );
        revisionWindowOffset = revisionInfo.nextOffset;

        const totalAyahs = currEndAyah;
        const displayLabel = `${surahEntry.arabicName} 1 - ${currEndAyah}`;

        units.push({
          type: unitType,
          start: { surahNumber: surahEntry.number, ayahNumber: 1, globalIndex: firstVerse.globalIndex },
          end: { surahNumber: surahEntry.number, ayahNumber: currEndAyah, globalIndex: lastVerse.globalIndex },
          totalAyahs,
          displayLabel,
          pageStart: firstVerse.pageNumber,
          pageEnd: lastVerse.pageNumber,
          isConsolidation: false,
          revisionPages: revisionDailyPages,
          revisionDisplay: revisionInfo.displayLabel,
          revisionPageStart: revisionInfo.pageStart,
          revisionPageEnd: revisionInfo.pageEnd,
        });
      }

      // 2. 3-Day Consolidation Cycle upon Surah completion
      if (consolidationDays > 0) {
        const firstVerse = (await this.provider.getAyah(surahEntry.number, 1)) || surahVerses[0];
        const lastVerse = (await this.provider.getAyah(surahEntry.number, surahEntry.ayahsCount)) || surahVerses[surahVerses.length - 1];

        // Ensure all verses of this completed surah are in accumulator
        for (let a = 1; a <= surahEntry.ayahsCount; a++) {
          const exists = memorizedVersesAccumulator.some(
            (mv) => mv.surahNumber === surahEntry.number && mv.ayahNumber === a
          );
          if (!exists) {
            const v = (await this.provider.getAyah(surahEntry.number, a)) ||
              surahVerses.find((sv) => sv.ayahNumber === a);
            if (v) memorizedVersesAccumulator.push(v);
          }
        }

        for (let c = 1; c <= consolidationDays; c++) {
          const revisionInfo = this.computeRollingRevision(
            memorizedVersesAccumulator,
            revisionDailyPages,
            revisionWindowOffset
          );
          revisionWindowOffset = revisionInfo.nextOffset;

          units.push({
            type: unitType,
            start: { surahNumber: surahEntry.number, ayahNumber: 1, globalIndex: firstVerse.globalIndex },
            end: { surahNumber: surahEntry.number, ayahNumber: surahEntry.ayahsCount, globalIndex: lastVerse.globalIndex },
            totalAyahs: surahEntry.ayahsCount,
            displayLabel: `تثبيت سورة ${surahEntry.arabicName} كاملة (1 - ${surahEntry.ayahsCount}) [اليوم ${c}/${consolidationDays}]`,
            pageStart: firstVerse.pageNumber,
            pageEnd: lastVerse.pageNumber,
            isConsolidation: true,
            consolidationDayIndex: c,
            consolidationSurahNumber: surahEntry.number,
            revisionPages: revisionDailyPages,
            revisionDisplay: revisionInfo.displayLabel,
            revisionPageStart: revisionInfo.pageStart,
            revisionPageEnd: revisionInfo.pageEnd,
          });
        }
      }
    }

    return units;
  }

  /**
   * Calculates the rolling revision window across accumulated memorized verses.
   * If accumulated memorized amount is smaller than the daily revision limit (e.g. 1 page),
   * it reviews the total memorized so far. Once larger, it rolls sequentially across pages.
   */
  computeRollingRevision(
    memorizedVerses: Ayah[],
    revisionDailyPages: number,
    currentOffset: number
  ): {
    displayLabel: string;
    pageStart?: number;
    pageEnd?: number;
    nextOffset: number;
  } {
    if (memorizedVerses.length === 0) {
      return {
        displayLabel: 'مراجعة: ما تم حفظه',
        nextOffset: 0,
      };
    }

    // Extract unique pages represented in the memorized verses (ordered by learning order)
    const uniquePages: number[] = [];
    for (const v of memorizedVerses) {
      if (!uniquePages.includes(v.pageNumber)) {
        uniquePages.push(v.pageNumber);
      }
    }

    const targetPageCount = Math.max(1, Math.round(revisionDailyPages));

    // Case 1: Total memorized is within or equal to the daily limit (e.g. <= 1 page or few verses)
    if (uniquePages.length <= targetPageCount) {
      const firstSurah = memorizedVerses[0];
      const lastSurah = memorizedVerses[memorizedVerses.length - 1];

      let displayLabel = '';
      if (firstSurah.surahNumber === lastSurah.surahNumber) {
        const surahName = getSurahArabicName(firstSurah.surahNumber);
        if (firstSurah.ayahNumber === lastSurah.ayahNumber) {
          displayLabel = `مراجعة: ${surahName} (${firstSurah.ayahNumber})`;
        } else {
          displayLabel = `مراجعة: ${surahName} (${firstSurah.ayahNumber} - ${lastSurah.ayahNumber})`;
        }
      } else {
        const startName = getSurahArabicName(firstSurah.surahNumber);
        const endName = getSurahArabicName(lastSurah.surahNumber);
        displayLabel = `مراجعة: من ${startName} (${firstSurah.ayahNumber}) إلى ${endName} (${lastSurah.ayahNumber})`;
      }

      return {
        displayLabel,
        pageStart: uniquePages[0],
        pageEnd: uniquePages[uniquePages.length - 1],
        nextOffset: 0,
      };
    }

    // Case 2: Total memorized exceeds daily revision limit -> rolling window across uniquePages
    const safeOffset = currentOffset % uniquePages.length;
    const windowPages: number[] = [];
    for (let i = 0; i < targetPageCount; i++) {
      const pIdx = (safeOffset + i) % uniquePages.length;
      windowPages.push(uniquePages[pIdx]);
    }

    // Find verses matching these window pages to format detailed label
    const windowVerses = memorizedVerses.filter((v) => windowPages.includes(v.pageNumber));
    const firstVerse = windowVerses[0] || memorizedVerses[0];
    const lastVerse = windowVerses[windowVerses.length - 1] || memorizedVerses[memorizedVerses.length - 1];

    let displayLabel = '';
    if (firstVerse.surahNumber === lastVerse.surahNumber) {
      const sName = getSurahArabicName(firstVerse.surahNumber);
      if (firstVerse.ayahNumber === lastVerse.ayahNumber) {
        displayLabel = `مراجعة: ${sName} (${firstVerse.ayahNumber})`;
      } else {
        displayLabel = `مراجعة: ${sName} (${firstVerse.ayahNumber} - ${lastVerse.ayahNumber})`;
      }
    } else {
      const sStart = getSurahArabicName(firstVerse.surahNumber);
      const sEnd = getSurahArabicName(lastVerse.surahNumber);
      displayLabel = `مراجعة: من ${sStart} (${firstVerse.ayahNumber}) إلى ${sEnd} (${lastVerse.ayahNumber})`;
    }

    const minPage = Math.min(...windowPages);
    const maxPage = Math.max(...windowPages);
    const nextOffset = (safeOffset + targetPageCount) % uniquePages.length;

    return {
      displayLabel,
      pageStart: minPage,
      pageEnd: maxPage,
      nextOffset,
    };
  }
}
