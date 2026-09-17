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

/**
 * Adapter for the AlQuran.cloud REST API
 * (https://api.alquran.cloud/v1)
 *
 * Implements the Unified IQuranDataProvider interface.
 */
export class AlQuranCloudProvider implements IQuranDataProvider {
  readonly providerId = 'alquran_cloud';
  readonly providerName = 'AlQuran.cloud API';

  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private surahCache: Surah[] | null = null;
  private syncMetadata: SyncStatus;

  constructor(baseUrl = 'https://api.alquran.cloud/v1', timeoutMs = 8000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.syncMetadata = {
      source: 'AlQuran.cloud API',
      lastSync: new Date().toISOString(),
      dataVersion: 'v1',
      status: 'idle',
      syncedItemCount: 0,
      totalItemCount: 6236,
      errors: [],
    };
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async getSurahs(): Promise<Surah[]> {
    if (this.surahCache) return this.surahCache;

    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/surah`);
      if (!res.ok) throw new Error(`AlQuran.cloud error: ${res.status}`);
      const json = await res.json();

      let globalCounter = 1;
      const surahs: Surah[] = (json.data || []).map((s: any) => {
        const start = globalCounter;
        const end = globalCounter + s.numberOfAyahs - 1;
        globalCounter += s.numberOfAyahs;

        return {
          surahNumber: s.number,
          name: s.englishName,
          arabicName: s.name.replace(/^سُورَةُ\s+/, '').trim(),
          fullNameArabic: s.name,
          englishNameTranslation: s.englishNameTranslation,
          ayahCount: s.numberOfAyahs,
          order: s.number,
          revelationType: s.revelationType === 'Meccan' ? 'Meccan' : 'Medinan',
          startAyahGlobalIndex: start,
          endAyahGlobalIndex: end,
          startPage: 1,
          endPage: 604,
        };
      });

      this.surahCache = surahs;
      return surahs;
    } catch (err: any) {
      this.syncMetadata.status = 'error';
      this.syncMetadata.errors.push(err?.message || String(err));
      throw err;
    }
  }

  async getSurah(surahNumber: number): Promise<Surah | null> {
    const surahs = await this.getSurahs();
    return surahs.find((s) => s.surahNumber === surahNumber) || null;
  }

  async getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah | null> {
    try {
      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/ayah/${surahNumber}:${ayahNumber}/quran-uthmani`
      );
      if (!res.ok) return null;
      const json = await res.json();
      const a = json.data;

      return {
        surahNumber,
        ayahNumber,
        globalIndex: a.number,
        text: a.text,
        cleanText: a.text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
        pageNumber: a.page,
        juzNumber: a.juz,
        hizbNumber: Math.ceil(a.hizbQuarter / 4),
        quarter: a.hizbQuarter,
        sajda: Boolean(a.sajda),
      };
    } catch {
      return null;
    }
  }

  async getAyahByGlobalIndex(globalIndex: number): Promise<Ayah | null> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/ayah/${globalIndex}/quran-uthmani`);
      if (!res.ok) return null;
      const json = await res.json();
      const a = json.data;

      return {
        surahNumber: a.surah.number,
        ayahNumber: a.numberInSurah,
        globalIndex: a.number,
        text: a.text,
        cleanText: a.text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
        pageNumber: a.page,
        juzNumber: a.juz,
        hizbNumber: Math.ceil(a.hizbQuarter / 4),
        quarter: a.hizbQuarter,
        sajda: Boolean(a.sajda),
      };
    } catch {
      return null;
    }
  }

  async getAyahsInRange(start: QuranPosition, end: QuranPosition): Promise<Ayah[]> {
    const results: Ayah[] = [];
    if (start.surahNumber === end.surahNumber) {
      const minA = Math.min(start.ayahNumber, end.ayahNumber);
      const maxA = Math.max(start.ayahNumber, end.ayahNumber);
      for (let a = minA; a <= maxA; a++) {
        const ayah = await this.getAyah(start.surahNumber, a);
        if (ayah) results.push(ayah);
      }
    }
    return results;
  }

  async getPage(pageNumber: number): Promise<Ayah[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/page/${pageNumber}/quran-uthmani`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.ayahs || []).map((a: any) => ({
        surahNumber: a.surah.number,
        ayahNumber: a.numberInSurah,
        globalIndex: a.number,
        text: a.text,
        cleanText: a.text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
        pageNumber: a.page,
        juzNumber: a.juz,
        hizbNumber: Math.ceil(a.hizbQuarter / 4),
        quarter: a.hizbQuarter,
        sajda: Boolean(a.sajda),
      }));
    } catch {
      return [];
    }
  }

  async getJuz(juzNumber: number): Promise<Ayah[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.baseUrl}/juz/${juzNumber}/quran-uthmani`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data?.ayahs || []).map((a: any) => ({
        surahNumber: a.surah.number,
        ayahNumber: a.numberInSurah,
        globalIndex: a.number,
        text: a.text,
        cleanText: a.text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
        pageNumber: a.page,
        juzNumber: a.juz,
        hizbNumber: Math.ceil(a.hizbQuarter / 4),
        quarter: a.hizbQuarter,
        sajda: Boolean(a.sajda),
      }));
    } catch {
      return [];
    }
  }

  async getHizb(hizbNumber: number): Promise<Ayah[]> {
    return [];
  }

  async getQuarter(quarterNumber: number): Promise<Ayah[]> {
    return [];
  }

  async searchAyahs(query: string, limit = 20): Promise<Ayah[]> {
    try {
      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/search/${encodeURIComponent(query)}/all/ar`
      );
      if (!res.ok) return [];
      const json = await res.json();
      const matches: Ayah[] = [];
      for (const m of (json.data?.matches || []).slice(0, limit)) {
        matches.push({
          surahNumber: m.surah.number,
          ayahNumber: m.numberInSurah,
          globalIndex: m.number,
          text: m.text,
          cleanText: m.text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
          pageNumber: m.page || 1,
          juzNumber: m.juz || 1,
          hizbNumber: 1,
          quarter: 1,
        });
      }
      return matches;
    } catch {
      return [];
    }
  }

  async resolveRangeMetrics(start: QuranPosition, end: QuranPosition): Promise<QuranRangeMetrics> {
    return {
      start,
      end,
      ayahCount: 0,
      pageCount: 0,
      startPage: 1,
      endPage: 1,
      surahsInvolved: [start.surahNumber],
      direction: 'forward',
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
    try {
      const ayah = await this.getAyah(1, 1);
      const end = performance.now();
      const latencyMs = Math.round((end - start) * 100) / 100;

      if (ayah) {
        return {
          success: true,
          latencyMs,
          message: 'تم الاتصال بنجاح بـ AlQuran.cloud API',
          sampleAyahFetched: `${ayah.text} (1:1)`,
        };
      }
      return {
        success: false,
        latencyMs,
        message: 'فشل استرجاع آية الاختبار من AlQuran.cloud',
      };
    } catch (err: any) {
      const end = performance.now();
      return {
        success: false,
        latencyMs: Math.round((end - start) * 100) / 100,
        message: `تعذر الاتصال بـ AlQuran.cloud: ${err?.message || String(err)}`,
      };
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncMetadata };
  }
}
