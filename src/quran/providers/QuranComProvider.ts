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

interface QuranComChapter {
  id: number;
  name_arabic: string;
  name_simple: string;
  verses_count: number;
  revelation_place: string;
}

/**
 * Adapter for the official Quran.com v4 REST API
 * (https://api.quran.com/api/v4)
 *
 * Implements the Unified IQuranDataProvider interface.
 */
export class QuranComProvider implements IQuranDataProvider {
  readonly providerId = 'quran_com';
  readonly providerName = 'Quran.com v4 API';

  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private surahCache: Surah[] | null = null;
  private syncMetadata: SyncStatus;

  constructor(baseUrl = 'https://api.quran.com/api/v4', timeoutMs = 8000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.syncMetadata = {
      source: 'Quran.com v4 API',
      lastSync: new Date().toISOString(),
      dataVersion: 'v4.0',
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
      const res = await this.fetchWithTimeout(`${this.baseUrl}/chapters?language=ar`);
      if (!res.ok) throw new Error(`Quran.com API error: ${res.status}`);
      const data = await res.json();

      let globalIndex = 1;
      const surahs: Surah[] = (data.chapters as QuranComChapter[]).map((c) => {
        const start = globalIndex;
        const end = globalIndex + c.verses_count - 1;
        globalIndex += c.verses_count;

        return {
          surahNumber: c.id,
          name: c.name_simple,
          arabicName: c.name_arabic,
          fullNameArabic: `سورة ${c.name_arabic}`,
          englishNameTranslation: c.name_simple,
          ayahCount: c.verses_count,
          order: c.id,
          revelationType: c.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
          startAyahGlobalIndex: start,
          endAyahGlobalIndex: end,
          startPage: 1, // Fallback default; Madani profile provides exact pages
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
    const verseKey = `${surahNumber}:${ayahNumber}`;
    try {
      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/verses/by_key/${verseKey}?words=false&fields=text_uthmani,page_number,juz_number,hizb_number,rub_el_hizb_number`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const v = data.verse;

      return {
        surahNumber,
        ayahNumber,
        globalIndex: v.id,
        text: v.text_uthmani,
        cleanText: v.text_uthmani.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
        pageNumber: v.page_number,
        juzNumber: v.juz_number,
        hizbNumber: v.hizb_number,
        quarter: v.rub_el_hizb_number,
      };
    } catch {
      return null;
    }
  }

  async getAyahByGlobalIndex(globalIndex: number): Promise<Ayah | null> {
    // Upstream fallback / calculation by page or bundled index
    return null;
  }

  async getAyahsInRange(start: QuranPosition, end: QuranPosition): Promise<Ayah[]> {
    const results: Ayah[] = [];
    if (start.surahNumber === end.surahNumber) {
      const minAyah = Math.min(start.ayahNumber, end.ayahNumber);
      const maxAyah = Math.max(start.ayahNumber, end.ayahNumber);
      for (let a = minAyah; a <= maxAyah; a++) {
        const verse = await this.getAyah(start.surahNumber, a);
        if (verse) results.push(verse);
      }
    }
    return results;
  }

  async getPage(pageNumber: number): Promise<Ayah[]> {
    try {
      const res = await this.fetchWithTimeout(
        `${this.baseUrl}/verses/by_page/${pageNumber}?words=false&fields=text_uthmani,page_number,juz_number`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.verses || []).map((v: any) => {
        const [s, a] = v.verse_key.split(':').map(Number);
        return {
          surahNumber: s,
          ayahNumber: a,
          globalIndex: v.id,
          text: v.text_uthmani,
          cleanText: v.text_uthmani.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
          pageNumber: v.page_number,
          juzNumber: v.juz_number,
          hizbNumber: v.hizb_number || 1,
          quarter: v.rub_el_hizb_number || 1,
        };
      });
    } catch {
      return [];
    }
  }

  async getJuz(juzNumber: number): Promise<Ayah[]> {
    return [];
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
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&size=${limit}&language=ar`
      );
      if (!res.ok) return [];
      const data = await res.json();
      const results: Ayah[] = [];
      for (const item of data.search?.results || []) {
        const [s, a] = item.verse_key.split(':').map(Number);
        results.push({
          surahNumber: s,
          ayahNumber: a,
          globalIndex: item.verse_id,
          text: item.text,
          cleanText: item.text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''),
          pageNumber: item.page_number || 1,
          juzNumber: item.juz_number || 1,
          hizbNumber: 1,
          quarter: 1,
        });
      }
      return results;
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
          message: 'تم الاتصال بنجاح بـ Quran.com v4 API',
          sampleAyahFetched: `${ayah.text} (1:1)`,
        };
      }
      return {
        success: false,
        latencyMs,
        message: 'فشل استرجاع آية الاختبار من Quran.com',
      };
    } catch (err: any) {
      const end = performance.now();
      return {
        success: false,
        latencyMs: Math.round((end - start) * 100) / 100,
        message: `تعذر الاتصال بـ Quran.com: ${err?.message || String(err)}`,
      };
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncMetadata };
  }
}
