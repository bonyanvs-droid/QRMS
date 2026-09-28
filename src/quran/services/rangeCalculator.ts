import {
  QuranPosition,
  PlanningUnitType,
  PlanningUnit,
  QuranRangeMetrics,
  Ayah,
  LINES_PER_UNIT,
  RevisionUnitKind,
} from '../types';
import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import { formatQuranPosition, formatQuranRange } from '../utils/positionFormatter';
import { partitionVersesByLines } from '../data/madaniLineTable';
import {
  getSurahsInRangeByDirection,
  getSurahsByDirection,
  getSurahAyahsCount,
  getSurahArabicName,
  formatSurahAyahSpan,
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

    // Atomic unit is always the physical Madani line. Page-derived units are
    // just multiples of it: page = 15 lines, half = 8, third = 5,
    // quarter_page = 4, rub = 2. `amount` multiplies the unit (2 pages = 30 lines).
    const linesPerUnit = LINES_PER_UNIT[unitType];
    if (linesPerUnit !== undefined) {
      const lineChunks = partitionVersesByLines(verses, Math.max(1, amount) * linesPerUnit);
      for (const lc of lineChunks) {
        units.push({
          type: unitType,
          start: lc.start,
          end: lc.end,
          totalAyahs: lc.totalAyahs,
          displayLabel: lc.displayLabel,
          pageStart: lc.pageStart,
          pageEnd: lc.pageEnd,
          estimatedLines: lc.estimatedLines,
        });
      }
      return units;
    }

    switch (unitType) {
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
    revisionUnitKind: RevisionUnitKind = 'page',
    revisionUnitsPerWindow?: number,
    autoMinorRevisionMode = true,
    cycleAnchorSurah?: number,
    // Recalculation resumes with a just-completed surah already inside the
    // seed pool — its consolidation days count as its first turn, so the
    // rebuilt cycle skips it on the first window (same consumed-anchor
    // semantics as a mid-plan eligibility event).
    skipCycleAnchorSurah = false,
    outRevisionState?: { memorizedPool: Ayah[]; revisionWindowOffset: number }
  ): Promise<PlanningUnit[]> {
    const surahs = getSurahsInRangeByDirection(start.surahNumber, end.surahNumber, direction);
    if (!surahs || surahs.length === 0) return [];

    const units: PlanningUnit[] = [];

    // Track all unique verses memorized so far in chronological learning sequence.
    // Auto Minor Revision: seeded with the student's prior memorization so the rolling
    // window rotates across prior + new memorization as one pool.
    // The FIRST partitioned surah is still in this plan's memorization/
    // consolidation phase — its verses are excluded from the seed so the
    // staging/eligibility pipeline owns its lifecycle. This keeps
    // recalculation identical to fresh generation: a just-completed surah
    // joins the pool only after its consolidation days, never early.
    const firstSurahNo = surahs[0].number;
    const memorizedVersesAccumulator: Ayah[] = initialMemorizedVerses.filter(
      (v) => v.surahNumber !== firstSurahNo
    );
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
    // Auto Minor Revision (backward only): when a surah finishes memorization
    // + consolidation and becomes eligible, the minor cycle is rebuilt
    // anchored at it — newest eligible content takes priority in order. Its
    // consolidation days count as its first revision turn, so the next window
    // starts right after it (pendingAnchorSkip). Forward mode never rebuilds:
    // the surah simply waits its turn at the end of the traversal order.
    // Manual revision never gets this anchor — the user's configured cycle
    // stays stable.
    let pendingCycleAnchor: number | undefined =
      autoMinorRevisionMode ? cycleAnchorSurah : undefined;
    let pendingAnchorSkip = skipCycleAnchorSurah;

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
      } else if (LINES_PER_UNIT[unitType] !== undefined) {
        // Atomic unit is always the real Madani line: page = 15 lines,
        // half = 8, third = 5, quarter_page = 4, rub = 2. Daily amount
        // multiplies the unit (2 pages/day = 30 lines, etc.).
        const targetLinesPerDay = Math.max(1, dailyAmount) * (LINES_PER_UNIT[unitType] as number);
        const lineChunks = partitionVersesByLines(surahVerses, targetLinesPerDay);
        for (const lc of lineChunks) {
          endAyahCheckpoints.push(lc.end.ayahNumber);
        }
        if (endAyahCheckpoints.length === 0 || endAyahCheckpoints[endAyahCheckpoints.length - 1] < surahEndAyah) {
          endAyahCheckpoints.push(surahEndAyah);
        }
      } else if (
        unitType === 'quarter' ||
        unitType === 'hizb' ||
        unitType === 'juz'
      ) {
        // Structural units (quarter / hizb / juz): checkpoint at every real
        // mushaf boundary inside the surah, then group `dailyAmount` units/day.
        const field = unitType === 'quarter' ? 'quarter' : unitType === 'hizb' ? 'hizbNumber' : 'juzNumber';
        const boundaries: number[] = [];
        let prev = surahVerses[0]?.[field];
        for (const v of surahVerses) {
          if (v[field] !== prev) {
            boundaries.push(v.ayahNumber - 1);
            prev = v[field];
          }
        }
        boundaries.push(surahEndAyah);
        const step = Math.max(1, Math.round(dailyAmount));
        for (let b = step - 1; b < boundaries.length; b += step) {
          endAyahCheckpoints.push(boundaries[b]);
        }
        if (endAyahCheckpoints.length === 0 || endAyahCheckpoints[endAyahCheckpoints.length - 1] < surahEndAyah) {
          endAyahCheckpoints.push(surahEndAyah);
        }
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
          pendingCycleAnchor,
          pendingAnchorSkip
        );
        pendingCycleAnchor = undefined;
        pendingAnchorSkip = false;
        revisionWindowOffset = revisionInfo.nextOffset;

        const totalAyahs = currEndAyah;
        const displayLabel = formatSurahAyahSpan(surahEntry.number, 1, currEndAyah);

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
            pendingCycleAnchor,
            pendingAnchorSkip
          );
          pendingCycleAnchor = undefined;
          pendingAnchorSkip = false;
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
      // now revision-eligible. Auto Minor only: the revision pool is exactly
      // the memorized+consolidated set. A manually configured pool stays the
      // chosen range — fully separate from memorization progress.
      if (pendingEligibleVerses.length > 0) {
        if (autoMinorRevisionMode) {
          memorizedVersesAccumulator.push(...pendingEligibleVerses.splice(0));
          // Backward revision rebuilds the cycle anchored at the newest
          // eligible surah (priority to fresh memorization). Its consolidation
          // days already counted as its first turn → the next window starts
          // after it. With no consolidation configured it was never revised →
          // anchor directly at it (no skip).
          if (revisionDirection === 'backward') {
            pendingCycleAnchor = surahEntry.number;
            pendingAnchorSkip = consolidationDays > 0;
          }
        } else {
          pendingEligibleVerses.length = 0;
        }
      }
    }

    if (outRevisionState) {
      outRevisionState.memorizedPool = memorizedVersesAccumulator;
      outRevisionState.revisionWindowOffset = revisionWindowOffset;
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
    unitKind: RevisionUnitKind = 'page',
    unitsPerWindow?: number,
    restartAtSurah?: number,
    // When a newly eligible surah anchors the cycle in backward mode, its
    // consolidation days already counted as its first revision turn — the
    // rebuild keeps it first in order but the next window starts after it.
    skipAnchoredSurah = false
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

    // Line-atomic revision units: page = 15 real lines, half = 8, third = 5,
    // quarter_page = 4, rub = 2 — the same normalization as memorization.
    const linesPerUnit = LINES_PER_UNIT[unitKind];
    if (linesPerUnit !== undefined) {
      const unitsCount = Math.max(1, Math.round(unitsPerWindow ?? revisionDailyPages ?? 1));
      const targetLines = unitsCount * linesPerUnit;
      // Revision windows are contiguous spans — they may cross surah
      // boundaries exactly like a real mushaf page does.
      const lineChunks = partitionVersesByLines(memorizedVerses, targetLines, { crossSurah: true });
      if (lineChunks.length === 0) {
        return { displayLabel: 'مراجعة: ما تم حفظه', nextOffset: 0 };
      }
      const orderedChunks = revisionDirection === 'backward' ? [...lineChunks].reverse() : lineChunks;
      let safeOffset = currentOffset % orderedChunks.length;
      if (restartAtSurah !== undefined) {
        const anchorVerse = memorizedVerses.find((v) => v.surahNumber === restartAtSurah);
        if (anchorVerse) {
          const anchored = orderedChunks.findIndex(
            (c) => anchorVerse.globalIndex >= c.start.globalIndex && anchorVerse.globalIndex <= c.end.globalIndex
          );
          if (anchored >= 0) {
            safeOffset = anchored;
            if (skipAnchoredSurah) {
              // Chunks are contiguous spans: a chunk holds verses of the
              // anchored surah when its number lies inside [start,end] surahs.
              while (
                safeOffset < orderedChunks.length &&
                orderedChunks[safeOffset].start.surahNumber <= restartAtSurah &&
                restartAtSurah <= orderedChunks[safeOffset].end.surahNumber
              ) {
                safeOffset++;
              }
              if (safeOffset >= orderedChunks.length) safeOffset = 0;
            }
          }
        }
      }
      const chosen = orderedChunks[safeOffset];
      return {
        displayLabel: `مراجعة: ${chosen.displayLabel}`,
        pageStart: chosen.pageStart,
        pageEnd: chosen.pageEnd,
        nextOffset: (safeOffset + 1) % orderedChunks.length,
      };
    }

    // Structural revision units: real mushaf boundaries for quarter/hizb/juz,
    // whole surahs for 'surah'.
    const structuralKeyOf = (v: Ayah): number =>
      unitKind === 'surah' ? v.surahNumber
        : unitKind === 'quarter' ? v.quarter
        : unitKind === 'hizb' ? v.hizbNumber
        : unitKind === 'juz' ? v.juzNumber
        : v.surahNumber;

    // Extract unique window units in learning (insertion) order — page numbers
    // for page-mode windows, surah numbers for surah-mode windows.
    const learningOrderedKeys: number[] = [];
    for (const v of memorizedVerses) {
      const key = structuralKeyOf(v);
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
      if (anchored >= 0) {
        safeOffset = anchored;
        if (skipAnchoredSurah) {
          // The anchored surah's consolidation served as its first turn —
          // advance past every unit key it still occupies.
          while (
            safeOffset < orderedKeys.length &&
            memorizedVerses.some(
              (v) => v.surahNumber === restartAtSurah && structuralKeyOf(v) === orderedKeys[safeOffset]
            )
          ) {
            safeOffset++;
          }
          if (safeOffset >= orderedKeys.length) safeOffset = 0;
        }
      }
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
      windowKeySet.has(structuralKeyOf(v))
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
    unitKind: RevisionUnitKind,
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
    const keyOf = (v: Ayah): number =>
      unitKind === 'quarter' ? v.quarter
        : unitKind === 'hizb' ? v.hizbNumber
        : unitKind === 'juz' ? v.juzNumber
        : v.surahNumber;
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
  private buildRevisionDisplayLabel(orderedVerses: Ayah[], unitKind: RevisionUnitKind): string {
    const firstVerse = orderedVerses[0];
    const lastVerse = orderedVerses[orderedVerses.length - 1];
    if (!firstVerse || !lastVerse) return 'مراجعة: ما تم حفظه';

    if (unitKind === 'surah') {
      const segments: string[] = [];
      let runStart: Ayah = firstVerse;
      let prev: Ayah = firstVerse;
      const flush = () => {
        segments.push(formatSurahAyahSpan(runStart.surahNumber, runStart.ayahNumber, prev.ayahNumber));
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
      return `مراجعة: ${formatSurahAyahSpan(firstVerse.surahNumber, firstVerse.ayahNumber, lastVerse.ayahNumber)}`;
    }
    const endIsSurahTail = lastVerse.ayahNumber >= getSurahAyahsCount(lastVerse.surahNumber);
    const endPart = endIsSurahTail
      ? `سورة ${getSurahArabicName(lastVerse.surahNumber)} إلى آخرها`
      : `سورة ${getSurahArabicName(lastVerse.surahNumber)} (${lastVerse.ayahNumber})`;
    return `مراجعة: من سورة ${getSurahArabicName(firstVerse.surahNumber)} (${firstVerse.ayahNumber}) إلى ${endPart}`;
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
    unitKind: RevisionUnitKind
  ): number {
    if (unitKind === 'surah') return orderedKeys.indexOf(surahNumber);
    const anchorVerse = memorizedVerses.find((v) => v.surahNumber === surahNumber);
    if (!anchorVerse) return -1;
    const anchorKey =
      unitKind === 'quarter' ? anchorVerse.quarter
        : unitKind === 'hizb' ? anchorVerse.hizbNumber
        : unitKind === 'juz' ? anchorVerse.juzNumber
        : anchorVerse.surahNumber;
    return orderedKeys.findIndex((k) => k === anchorKey);
  }
}
