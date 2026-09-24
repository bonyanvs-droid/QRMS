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
import {
  getSurahsInRangeByDirection,
  getSurahsByDirection,
  getSurahAyahsCount,
  getSurahArabicName,
} from '../../utils/quranMetadata';

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
        let currentChunk: Ayah[] = [];

        for (let i = 0; i < verses.length; i++) {
          const v = verses[i];
          currentChunk.push(v);

          const isLast = i === verses.length - 1;
          const nextV = !isLast ? verses[i + 1] : null;
          const isSurahBoundary = nextV && nextV.surahNumber !== v.surahNumber;

          if (currentChunk.length >= chunkSize || isSurahBoundary || isLast) {
            const first = currentChunk[0];
            const last = currentChunk[currentChunk.length - 1];
            units.push({
              type: 'ayah',
              start: { surahNumber: first.surahNumber, ayahNumber: first.ayahNumber, globalIndex: first.globalIndex },
              end: { surahNumber: last.surahNumber, ayahNumber: last.ayahNumber, globalIndex: last.globalIndex },
              totalAyahs: currentChunk.length,
              displayLabel:
                first.globalIndex === last.globalIndex
                  ? formatQuranPosition(first, { withPrefix: true })
                  : formatQuranRange(first, last, { includeSurahWord: true }),
              pageStart: first.pageNumber,
              pageEnd: last.pageNumber,
            });
            currentChunk = [];
          }
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
    initialMemorizedVerses: Ayah[] = [],
    revisionDirection: 'forward' | 'backward' = 'backward',
    revisionUnitKind: 'page' | 'surah' = 'page',
    revisionUnitsPerWindow?: number,
    autoMinorRevisionMode = true,
    cycleAnchorSurah?: number
  ): Promise<PlanningUnit[]> {
    const surahs = getSurahsInRangeByDirection(start.surahNumber, end.surahNumber, direction);
    if (!surahs || surahs.length === 0) return [];

    const units: PlanningUnit[] = [];

    // Track all unique verses memorized so far in chronological learning sequence.
    // Auto Minor Revision: seeded with the student's prior memorization so the rolling
    // window rotates across prior + new memorization as one pool.
    const memorizedVersesAccumulator: Ayah[] = [...initialMemorizedVerses];
    // Verses of the surah currently in its memorization/consolidation phase are
    // staged here and only join the revision pool AFTER the surah's
    // consolidation cycle completes — an incomplete (or still-consolidating)
    // surah is never revision-eligible.
    const pendingEligibleVerses: Ayah[] = [];
    const stageVerseForEligibility = (v: Ayah | undefined | null): void => {
      if (!v) return;
      const exists =
        memorizedVersesAccumulator.some(
          (mv) => mv.surahNumber === v.surahNumber && mv.ayahNumber === v.ayahNumber
        ) ||
        pendingEligibleVerses.some(
          (mv) => mv.surahNumber === v.surahNumber && mv.ayahNumber === v.ayahNumber
        );
      if (!exists) pendingEligibleVerses.push(v);
    };
    // Offset 0 always targets the first revision window in the resolved
    // revision direction — 'backward' walks the pool newest → oldest.
    let revisionWindowOffset = 0;
    // Auto Minor Revision: when a surah finishes memorization + consolidation
    // and becomes eligible, the minor cycle restarts anchored at that newest
    // eligible unit (recent memorization is revised promptly, not whenever a
    // stale offset happens to reach it). Manual revision never gets this
    // anchor — the user's configured cycle stays stable when the pool grows.
    let pendingCycleAnchor: number | undefined =
      autoMinorRevisionMode ? cycleAnchorSurah : undefined;

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

        // Stage newly memorized verses up to currEndAyah — they stay out of the
        // revision pool until this surah's consolidation cycle completes.
        for (let a = 1; a <= currEndAyah; a++) {
          const v = (await this.provider.getAyah(surahEntry.number, a)) ||
            surahVerses.find((sv) => sv.ayahNumber === a);
          stageVerseForEligibility(v);
        }

        // Compute dynamic rolling revision info
        const revisionInfo = this.computeRollingRevision(
          memorizedVersesAccumulator,
          revisionDailyPages,
          revisionWindowOffset,
          revisionDirection,
          revisionUnitKind,
          revisionUnitsPerWindow,
          pendingCycleAnchor
        );
        pendingCycleAnchor = undefined;
        revisionWindowOffset = revisionInfo.nextOffset;

        const totalAyahs = currEndAyah;
        // CRITICAL BUSINESS RULE (قاعدة التنسيق القرآني الأنيق - لا تحذف):
        // عدم كتابة رقم الآية الأخيرة إذا وصلت السورة لنهايتها، وكتابة "كاملة" بدلاً من ذلك
        const isSurahComplete = currEndAyah === surahEntry.ayahsCount;
        const displayLabel = isSurahComplete
          ? `سورة ${surahEntry.arabicName} كاملة`
          : `${surahEntry.arabicName} 1 - ${currEndAyah}`;

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

        // Ensure all verses of this completed surah are staged for eligibility
        for (let a = 1; a <= surahEntry.ayahsCount; a++) {
          const v = (await this.provider.getAyah(surahEntry.number, a)) ||
            surahVerses.find((sv) => sv.ayahNumber === a);
          stageVerseForEligibility(v);
        }

        for (let c = 1; c <= consolidationDays; c++) {
          const revisionInfo = this.computeRollingRevision(
            memorizedVersesAccumulator,
            revisionDailyPages,
            revisionWindowOffset,
            revisionDirection,
            revisionUnitKind,
            revisionUnitsPerWindow,
            pendingCycleAnchor
          );
          pendingCycleAnchor = undefined;
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

      // Surah memorization + its consolidation cycle are done → its verses are
      // now revision-eligible and join the rolling pool in learning order.
      if (pendingEligibleVerses.length > 0) {
        memorizedVersesAccumulator.push(...pendingEligibleVerses.splice(0));
        // Auto Minor: the just-eligible surah anchors the next revision window
        // — the cycle rebuilds from the newest eligible content rather than
        // continuing from a stale offset that reaches it days later.
        if (autoMinorRevisionMode) pendingCycleAnchor = surahEntry.number;
      }
    }

    return units;
  }

  /**
   * Returns all verses of surahs that are FULLY memorized before the given
   * position in the governed learning order — the canonical revision seed.
   *
   * Eligibility rule: the current INCOMPLETE surah is intentionally excluded;
   * it only becomes revision-eligible once the whole surah is confirmed
   * memorized. For backward plans the governed order is
   * [الفاتحة، الناس، الفلق، …] so Al-Fatihah is correctly included whenever
   * the student has progressed past it.
   */
  async getCompletedMemorizedVerses(
    upToPosition: QuranPosition,
    direction: 'forward' | 'backward'
  ): Promise<Ayah[]> {
    const ordered = getSurahsByDirection(direction);
    const idx = ordered.findIndex((s) => s.number === upToPosition.surahNumber);
    if (idx === -1) return [];

    // If at the beginning of the plan (e.g. Ayah 0 or 1 of the initial surah),
    // do not falsely claim previous surahs (such as Al-Fatihah when starting at An-Nas) were memorized.
    if (upToPosition.ayahNumber <= 0 && idx <= 1) {
      return [];
    }

    const ayahCount = ordered[idx].ayahsCount || getSurahAyahsCount(upToPosition.surahNumber);
    // Include the current surah only when it is fully memorized
    const completeCount = upToPosition.ayahNumber >= ayahCount ? idx + 1 : idx;

    const verses: Ayah[] = [];
    for (const s of ordered.slice(0, completeCount)) {
      const count = s.ayahsCount || getSurahAyahsCount(s.number);
      for (let a = 1; a <= count; a++) {
        const v = await this.provider.getAyah(s.number, a);
        if (v) verses.push(v);
      }
    }
    return verses;
  }

  /**
   * Calculates the rolling revision window across accumulated memorized verses.
   * If accumulated memorized amount is smaller than the daily revision limit (e.g. 1 page),
   * it reviews the total memorized so far. Once larger, it rolls sequentially across
   * the window units (pages by default, or whole surahs for 'surahs' mode).
   *
   * `revisionDirection` is independent of the memorization direction:
   *  - 'forward'  → the window advances in learning order (oldest → newest)
   *  - 'backward' → the window reviews the newest memorized content first
   *                 and rolls back toward the oldest.
   */
  computeRollingRevision(
    memorizedVerses: Ayah[],
    revisionDailyPages: number,
    currentOffset: number,
    revisionDirection: 'forward' | 'backward' = 'forward',
    unitKind: 'page' | 'surah' = 'page',
    unitsPerWindow?: number,
    restartAtSurah?: number
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

    // Extract unique window units in learning (insertion) order — page numbers
    // for page-mode windows, surah numbers for surah-mode windows.
    const learningOrderedKeys: number[] = [];
    for (const v of memorizedVerses) {
      const key = unitKind === 'surah' ? v.surahNumber : v.pageNumber;
      if (!learningOrderedKeys.includes(key)) {
        learningOrderedKeys.push(key);
      }
    }

    // Independent revision direction: 'backward' walks the pool newest → oldest.
    const orderedKeys =
      revisionDirection === 'backward' ? [...learningOrderedKeys].reverse() : learningOrderedKeys;

    const targetUnitCount = Math.max(1, Math.round(unitsPerWindow ?? revisionDailyPages));

    // Case 1: Total memorized is within or equal to the daily limit (e.g. <= 1 page or few verses)
    if (orderedKeys.length <= targetUnitCount) {
      const labelOrdered = this.orderVersesByRevisionTraversal(
        memorizedVerses,
        orderedKeys,
        unitKind,
        revisionDirection
      );
      const displayLabel = this.buildRevisionDisplayLabel(labelOrdered, unitKind);

      const allPages = memorizedVerses.map((v) => v.pageNumber);
      return {
        displayLabel,
        pageStart: Math.min(...allPages),
        pageEnd: Math.max(...allPages),
        nextOffset: 0,
      };
    }

    // Case 2: Total memorized exceeds daily revision limit -> rolling window across units
    let safeOffset = currentOffset % orderedKeys.length;
    // Auto Minor cycle rebuild: when the eligible pool just gained a surah, the
    // window restarts anchored at that surah's first traversal position —
    // newest eligible content is revised promptly per the revision direction.
    if (restartAtSurah !== undefined) {
      const anchored = this.resolveRevisionAnchorIndex(
        orderedKeys,
        memorizedVerses,
        restartAtSurah,
        unitKind
      );
      if (anchored >= 0) safeOffset = anchored;
    }
    // Cycle boundary rule: a daily window NEVER crosses the end of the
    // revision cycle — it takes only what remains of the current cycle, and
    // the next working day starts a new cycle from its beginning.
    const remainingInCycle = orderedKeys.length - safeOffset;
    const take = Math.min(targetUnitCount, remainingInCycle);
    const windowKeys: number[] = [];
    for (let i = 0; i < take; i++) {
      windowKeys.push(orderedKeys[safeOffset + i]);
    }

    // Find verses matching these window units to format detailed label
    const windowKeySet = new Set(windowKeys);
    const windowVerses = memorizedVerses.filter((v) =>
      windowKeySet.has(unitKind === 'surah' ? v.surahNumber : v.pageNumber)
    );
    // Order the window's verses along the actual revision traversal
    // (windowKeys sequence, then surah learning rank, then ayah) so the
    // displayed range always reads in the resolved revision direction.
    const traversalOrdered = this.orderVersesByRevisionTraversal(
      windowVerses,
      windowKeys,
      unitKind,
      revisionDirection
    );
    const displayLabel = this.buildRevisionDisplayLabel(traversalOrdered, unitKind);

    const windowPages = windowVerses.map((v) => v.pageNumber);
    const minPage = Math.min(...windowPages);
    const maxPage = Math.max(...windowPages);
    // Reaching the cycle end rolls nextOffset to 0 → the next day opens a new
    // cycle at its start; the window itself never wraps mid-day.
    const nextOffset = (safeOffset + take) % orderedKeys.length;

    return {
      displayLabel,
      pageStart: minPage,
      pageEnd: maxPage,
      nextOffset,
    };
  }

  /**
   * Orders pool verses along the actual revision traversal for label
   * rendering: window/pool unit sequence first, then surah learning rank
   * (newest-first under 'backward', oldest-first under 'forward'), then ayah
   * order inside each surah (memorization inside a surah is always 1 → N).
   */
  private orderVersesByRevisionTraversal(
    verses: Ayah[],
    keySequence: number[],
    unitKind: 'page' | 'surah',
    revisionDirection: 'forward' | 'backward'
  ): Ayah[] {
    const keyOrder = new Map<number, number>();
    keySequence.forEach((k, i) => {
      if (!keyOrder.has(k)) keyOrder.set(k, i);
    });
    const surahLearnRank = new Map<number, number>();
    verses.forEach((v, i) => {
      if (!surahLearnRank.has(v.surahNumber)) surahLearnRank.set(v.surahNumber, i);
    });
    const keyOf = (v: Ayah): number => (unitKind === 'surah' ? v.surahNumber : v.pageNumber);
    return [...verses].sort((a, b) => {
      const keyDiff = (keyOrder.get(keyOf(a)) ?? 0) - (keyOrder.get(keyOf(b)) ?? 0);
      if (keyDiff !== 0) return keyDiff;
      const rankDiff = (surahLearnRank.get(a.surahNumber) ?? 0) - (surahLearnRank.get(b.surahNumber) ?? 0);
      if (rankDiff !== 0) return revisionDirection === 'backward' ? -rankDiff : rankDiff;
      return a.ayahNumber - b.ayahNumber;
    });
  }

  /**
   * Renders the revision window label.
   * - 'surah' windows are discrete complete surahs → each surah gets its own
   *   ayah-range segment joined by ' + ' ("الكافرون (1 - 6) + النصر (1 - 3)")
   *   so a 2-surah window never looks like one contiguous ayah range.
   * - 'page' windows are physically contiguous mushaf page content → the
   *   "من X إلى Y" range label is truthful there.
   */
  /**
   * CRITICAL BUSINESS RULE (قاعدة التنسيق القرآني الأنيق - لا تحذف):
   * عدم كتابة رقم الآية الأخيرة إذا كان النطاق يغطي السورة كاملة حتى آخر آية.
   * - إذا كانت سورة واحدة كاملة من الآية 1 حتى آخر آية: تُكتب "سورة [الاسم] كاملة".
   * - إذا كانت مجموعة سور كاملة (من الآية 1 في سورة البداية حتى آخر آية في سورة النهاية): تُكتب "من سورة [الأولى] إلى سورة [الأخيرة]".
   * - إذا كانت السورة من آية معينة حتى آخر آية: تُكتب "من آية (X) إلى نهاية السورة".
   */
  private buildRevisionDisplayLabel(orderedVerses: Ayah[], unitKind: 'page' | 'surah'): string {
    const firstVerse = orderedVerses[0];
    const lastVerse = orderedVerses[orderedVerses.length - 1];
    if (!firstVerse || !lastVerse) return 'مراجعة: ما تم حفظه';

    if (unitKind === 'surah') {
      const segments: string[] = [];
      let runStart: Ayah = firstVerse;
      let prev: Ayah = firstVerse;
      const flush = () => {
        const name = getSurahArabicName(runStart.surahNumber);
        const sTotal = getSurahAyahsCount(runStart.surahNumber);
        if (runStart.ayahNumber === 1 && prev.ayahNumber === sTotal) {
          segments.push(`سورة ${name} كاملة`);
        } else if (runStart.ayahNumber === prev.ayahNumber) {
          segments.push(`${name} (${runStart.ayahNumber})`);
        } else if (prev.ayahNumber === sTotal) {
          segments.push(`${name} (${runStart.ayahNumber} - نهاية السورة)`);
        } else {
          segments.push(`${name} (${runStart.ayahNumber} - ${prev.ayahNumber})`);
        }
      };
      for (const v of orderedVerses) {
        if (v.surahNumber !== runStart.surahNumber) {
          flush();
          runStart = v;
        }
        prev = v;
      }
      flush();
      return `مراجعة: ${segments.join(' + ')}`;
    }

    if (firstVerse.surahNumber === lastVerse.surahNumber) {
      const sName = getSurahArabicName(firstVerse.surahNumber);
      const sTotal = getSurahAyahsCount(firstVerse.surahNumber);
      if (firstVerse.ayahNumber === 1 && lastVerse.ayahNumber === sTotal) {
        return `مراجعة: سورة ${sName} كاملة`;
      }
      if (firstVerse.ayahNumber === lastVerse.ayahNumber) {
        return `مراجعة: ${sName} (${firstVerse.ayahNumber})`;
      }
      if (lastVerse.ayahNumber === sTotal) {
        return `مراجعة: ${sName} (${firstVerse.ayahNumber} - نهاية السورة)`;
      }
      return `مراجعة: ${sName} (${firstVerse.ayahNumber} - ${lastVerse.ayahNumber})`;
    }

    const s1Name = getSurahArabicName(firstVerse.surahNumber);
    const s2Name = getSurahArabicName(lastVerse.surahNumber);
    const s1Total = getSurahAyahsCount(firstVerse.surahNumber);
    const s2Total = getSurahAyahsCount(lastVerse.surahNumber);

    const s1IsFullOrStart = firstVerse.ayahNumber === 1;
    const s2IsFullOrEnd = lastVerse.ayahNumber === s2Total;

    if (s1IsFullOrStart && s2IsFullOrEnd) {
      return `مراجعة: من سورة ${s1Name} إلى سورة ${s2Name}`;
    }
    if (s1IsFullOrStart && !s2IsFullOrEnd) {
      return `مراجعة: من سورة ${s1Name} إلى ${s2Name} (${lastVerse.ayahNumber})`;
    }
    if (!s1IsFullOrStart && s2IsFullOrEnd) {
      return `مراجعة: من ${s1Name} (${firstVerse.ayahNumber}) إلى سورة ${s2Name}`;
    }
    return `مراجعة: من ${s1Name} (${firstVerse.ayahNumber}) إلى ${s2Name} (${lastVerse.ayahNumber})`;
  }

  /**
   * Resolves the traversal index where the newly-eligible surah's content
   * begins — surah key for 'surah' windows, its first page key for 'page'
   * windows. Returns -1 when the surah is not present in the pool.
   */
  private resolveRevisionAnchorIndex(
    orderedKeys: number[],
    memorizedVerses: Ayah[],
    surahNumber: number,
    unitKind: 'page' | 'surah'
  ): number {
    if (unitKind === 'surah') return orderedKeys.indexOf(surahNumber);
    const surahPages = new Set(
      memorizedVerses
        .filter((v) => v.surahNumber === surahNumber)
        .map((v) => v.pageNumber)
    );
    return orderedKeys.findIndex((k) => surahPages.has(k));
  }
}
