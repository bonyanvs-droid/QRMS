import { IQuranDataProvider } from './IQuranDataProvider';
import {
  Surah,
  Ayah,
  QuranPosition,
  QuranRangeMetrics,
  MushafProfile,
  SyncStatus,
} from '../types';
import { MADANI_MUSHAF_15_LINES_PROFILE } from '../models/MushafProfile';
import quranRawData from '../data/quranData.json';
import { getSurahsInRangeByDirection } from '../../utils/quranMetadata';

interface QuranDatasetStructure {
  version: string;
  source: string;
  riwayah: string;
  totalSurahs: number;
  totalAyahs: number;
  surahs: Surah[];
  ayahs: Ayah[];
}

/**
 * Bundled Offline-First Quran Provider
 *
 * Provides immediate, zero-latency, 100% offline access to all 114 Surahs
 * and 6236 verses of the Holy Quran with standard Madani pagination.
 */
export class BundledQuranProvider implements IQuranDataProvider {
  readonly providerId = 'bundled';
  readonly providerName = 'المصدر المحلي المدمج (تنزيل / مصحف المدينة)';

  private readonly surahs: Surah[];
  private readonly ayahs: Ayah[];
  private readonly surahMap = new Map<number, Surah>();
  private readonly ayahByGlobalIndexMap = new Map<number, Ayah>();
  private readonly ayahBySurahAndAyahMap = new Map<string, Ayah>();
  private readonly pageMap = new Map<number, Ayah[]>();
  private readonly juzMap = new Map<number, Ayah[]>();
  private readonly hizbMap = new Map<number, Ayah[]>();
  private readonly quarterMap = new Map<number, Ayah[]>();
  private readonly syncMetadata: SyncStatus;

  constructor() {
    const dataset = quranRawData as unknown as QuranDatasetStructure;
    this.surahs = dataset.surahs;
    this.ayahs = dataset.ayahs;

    // Build indexing structures for O(1) lookups and normalize aliases
    for (const surah of this.surahs) {
      surah.number = surah.surahNumber;
      surah.nameArabic = surah.arabicName;
      surah.totalAyahs = surah.ayahCount;
      this.surahMap.set(surah.surahNumber, surah);
    }

    for (const ayah of this.ayahs) {
      this.ayahByGlobalIndexMap.set(ayah.globalIndex, ayah);
      this.ayahBySurahAndAyahMap.set(`${ayah.surahNumber}:${ayah.ayahNumber}`, ayah);

      // Page index
      const pageList = this.pageMap.get(ayah.pageNumber) || [];
      pageList.push(ayah);
      this.pageMap.set(ayah.pageNumber, pageList);

      // Juz index
      const juzList = this.juzMap.get(ayah.juzNumber) || [];
      juzList.push(ayah);
      this.juzMap.set(ayah.juzNumber, juzList);

      // Hizb index
      const hizbList = this.hizbMap.get(ayah.hizbNumber) || [];
      hizbList.push(ayah);
      this.hizbMap.set(ayah.hizbNumber, hizbList);

      // Quarter index
      const quarterList = this.quarterMap.get(ayah.quarter) || [];
      quarterList.push(ayah);
      this.quarterMap.set(ayah.quarter, quarterList);
    }

    this.syncMetadata = {
      source: dataset.source,
      lastSync: new Date().toISOString(),
      dataVersion: dataset.version,
      status: 'synced',
      syncedItemCount: this.ayahs.length,
      totalItemCount: 6236,
      errors: [],
    };
  }

  async getSurahs(): Promise<Surah[]> {
    return this.surahs;
  }

  getAllSurahs(): Surah[] {
    return this.surahs;
  }

  async getSurah(surahNumber: number): Promise<Surah | null> {
    return this.surahMap.get(surahNumber) || null;
  }

  async getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah | null> {
    return this.ayahBySurahAndAyahMap.get(`${surahNumber}:${ayahNumber}`) || null;
  }

  async getAyahByGlobalIndex(globalIndex: number): Promise<Ayah | null> {
    return this.ayahByGlobalIndexMap.get(globalIndex) || null;
  }

  private resolveGlobalIndex(pos: QuranPosition): number | null {
    if (pos.globalIndex && pos.globalIndex >= 1 && pos.globalIndex <= 6236) {
      return pos.globalIndex;
    }
    const ayah = this.ayahBySurahAndAyahMap.get(`${pos.surahNumber}:${pos.ayahNumber}`);
    return ayah ? ayah.globalIndex : null;
  }

  async getAyahsInRange(
    start: QuranPosition,
    end: QuranPosition,
    direction?: 'forward' | 'backward'
  ): Promise<Ayah[]> {
    const startIndex = this.resolveGlobalIndex(start);
    const endIndex = this.resolveGlobalIndex(end);

    if (startIndex === null || endIndex === null) {
      return [];
    }

    // Determine direction: explicit or auto-detected based on start/end surah positions
    const effectiveDirection: 'forward' | 'backward' =
      direction ||
      (start.surahNumber === 1 && end.surahNumber > 1 && (end.surahNumber >= 78 || end.surahNumber === 114)
        ? 'backward'
        : start.surahNumber > end.surahNumber
        ? 'backward'
        : 'forward');

    const result: Ayah[] = [];

    if (effectiveDirection === 'backward') {
      // Governed backward sequence: Al-Fatihah (1) first, then An-Nas (114) down to Al-Baqarah (2)
      const surahsToTraverse = getSurahsInRangeByDirection(
        start.surahNumber,
        end.surahNumber,
        'backward'
      );

      for (let i = 0; i < surahsToTraverse.length; i++) {
        const surahEntry = surahsToTraverse[i];
        const s = surahEntry.number;
        const isFirstSurah = i === 0;
        const isLastSurah = i === surahsToTraverse.length - 1;

        const aStart = isFirstSurah ? start.ayahNumber : 1;
        const aEnd = isLastSurah ? end.ayahNumber : surahEntry.ayahsCount;

        for (let a = aStart; a <= aEnd; a++) {
          const ayah = this.ayahBySurahAndAyahMap.get(`${s}:${a}`);
          if (ayah) result.push(ayah);
        }
      }
      return result;
    }

    // Forward order (e.g. Al-Fatihah -> An-Nas)
    const minIdx = Math.min(startIndex, endIndex);
    const maxIdx = Math.max(startIndex, endIndex);

    if (startIndex <= endIndex) {
      for (let i = minIdx; i <= maxIdx; i++) {
        const a = this.ayahByGlobalIndexMap.get(i);
        if (a) result.push(a);
      }
    } else {
      for (let i = maxIdx; i >= minIdx; i--) {
        const a = this.ayahByGlobalIndexMap.get(i);
        if (a) result.push(a);
      }
    }

    return result;
  }

  async getPage(pageNumber: number): Promise<Ayah[]> {
    return this.pageMap.get(pageNumber) || [];
  }

  async getJuz(juzNumber: number): Promise<Ayah[]> {
    return this.juzMap.get(juzNumber) || [];
  }

  async getHizb(hizbNumber: number): Promise<Ayah[]> {
    return this.hizbMap.get(hizbNumber) || [];
  }

  async getQuarter(quarterNumber: number): Promise<Ayah[]> {
    return this.quarterMap.get(quarterNumber) || [];
  }

  async searchAyahs(query: string, limit = 20): Promise<Ayah[]> {
    const normalized = query
      .trim()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه');

    if (!normalized) return [];

    const matches: Ayah[] = [];
    for (const ayah of this.ayahs) {
      if (ayah.cleanText.includes(normalized) || ayah.text.includes(query.trim())) {
        matches.push(ayah);
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  async resolveRangeMetrics(start: QuranPosition, end: QuranPosition): Promise<QuranRangeMetrics> {
    const startIndex = this.resolveGlobalIndex(start);
    const endIndex = this.resolveGlobalIndex(end);

    if (startIndex === null || endIndex === null) {
      throw new Error(`Invalid Quran coordinates: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
    }

    const direction: 'forward' | 'reverse' = startIndex <= endIndex ? 'forward' : 'reverse';
    const minIdx = Math.min(startIndex, endIndex);
    const maxIdx = Math.max(startIndex, endIndex);

    const startAyah = this.ayahByGlobalIndexMap.get(minIdx)!;
    const endAyah = this.ayahByGlobalIndexMap.get(maxIdx)!;

    const ayahCount = maxIdx - minIdx + 1;
    const startPage = startAyah.pageNumber;
    const endPage = endAyah.pageNumber;
    const pageCount = endPage - startPage + 1;

    // Collect distinct surahs in range
    const surahSet = new Set<number>();
    for (let i = minIdx; i <= maxIdx; i++) {
      const a = this.ayahByGlobalIndexMap.get(i);
      if (a) surahSet.add(a.surahNumber);
    }

    return {
      start: {
        surahNumber: startAyah.surahNumber,
        ayahNumber: startAyah.ayahNumber,
        globalIndex: startAyah.globalIndex,
      },
      end: {
        surahNumber: endAyah.surahNumber,
        ayahNumber: endAyah.ayahNumber,
        globalIndex: endAyah.globalIndex,
      },
      ayahCount,
      pageCount,
      startPage,
      endPage,
      surahsInvolved: Array.from(surahSet).sort((a, b) => a - b),
      direction,
    };
  }

  getMushafProfile(): MushafProfile {
    return MADANI_MUSHAF_15_LINES_PROFILE;
  }

  async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
    sampleAyahFetched?: string;
  }> {
    const start = performance.now();
    const ayah = await this.getAyah(1, 1);
    const end = performance.now();

    return {
      success: !!ayah,
      latencyMs: Math.round((end - start) * 100) / 100,
      message: 'المصدر المحلي المدمج يعمل بكفاءة وسرعة فائقة (0ms تقريبًا، دون الحاجة لشبكة)',
      sampleAyahFetched: ayah ? `${ayah.text} (الفاتحة: 1)` : undefined,
    };
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncMetadata };
  }
}
