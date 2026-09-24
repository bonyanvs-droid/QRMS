import { IQuranDataProvider } from './IQuranDataProvider';
import {
  Surah,
  Ayah,
  QuranPosition,
  QuranRangeMetrics,
  MushafProfile,
  SyncStatus,
} from '../types';

/**
 * Fallback Quran Data Provider
 *
 * Implements a resilient failover pattern: attempts operations on the Primary
 * provider first. If the Primary encounters network failures, timeouts, or errors,
 * it seamlessly delegates the call to the Fallback provider (typically the Bundled
 * offline provider) and logs diagnostics.
 */
export class FallbackQuranProvider implements IQuranDataProvider {
  readonly providerId = 'fallback_orchestrator';
  readonly providerName: string;

  constructor(
    private readonly primary: IQuranDataProvider,
    private readonly fallback: IQuranDataProvider
  ) {
    this.providerName = `${primary.providerName} (مع بديل: ${fallback.providerName})`;
  }

  private async executeWithFallback<T>(
    operationName: string,
    primaryOp: () => Promise<T>,
    fallbackOp: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryOp();
    } catch (err) {
      console.warn(
        `[QuranProvider Failover] Primary (${this.primary.providerName}) failed for '${operationName}'. Switching to Fallback (${this.fallback.providerName}):`,
        err
      );
      return await fallbackOp();
    }
  }

  async getSurahs(): Promise<Surah[]> {
    return this.executeWithFallback(
      'getSurahs',
      () => this.primary.getSurahs(),
      () => this.fallback.getSurahs()
    );
  }

  async getSurah(surahNumber: number): Promise<Surah | null> {
    return this.executeWithFallback(
      `getSurah(${surahNumber})`,
      () => this.primary.getSurah(surahNumber),
      () => this.fallback.getSurah(surahNumber)
    );
  }

  async getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah | null> {
    return this.executeWithFallback(
      `getAyah(${surahNumber}:${ayahNumber})`,
      async () => {
        const result = await this.primary.getAyah(surahNumber, ayahNumber);
        if (!result) throw new Error('Empty result from primary');
        return result;
      },
      () => this.fallback.getAyah(surahNumber, ayahNumber)
    );
  }

  async getAyahByGlobalIndex(globalIndex: number): Promise<Ayah | null> {
    return this.executeWithFallback(
      `getAyahByGlobalIndex(${globalIndex})`,
      async () => {
        const result = await this.primary.getAyahByGlobalIndex(globalIndex);
        if (!result) throw new Error('Empty result from primary');
        return result;
      },
      () => this.fallback.getAyahByGlobalIndex(globalIndex)
    );
  }

  async getAyahsInRange(start: QuranPosition, end: QuranPosition): Promise<Ayah[]> {
    return this.executeWithFallback(
      'getAyahsInRange',
      async () => {
        const res = await this.primary.getAyahsInRange(start, end);
        if (res.length === 0) throw new Error('Zero verses returned from primary range');
        return res;
      },
      () => this.fallback.getAyahsInRange(start, end)
    );
  }

  async getPage(pageNumber: number): Promise<Ayah[]> {
    return this.executeWithFallback(
      `getPage(${pageNumber})`,
      () => this.primary.getPage(pageNumber),
      () => this.fallback.getPage(pageNumber)
    );
  }

  async getJuz(juzNumber: number): Promise<Ayah[]> {
    return this.executeWithFallback(
      `getJuz(${juzNumber})`,
      () => this.primary.getJuz(juzNumber),
      () => this.fallback.getJuz(juzNumber)
    );
  }

  async getHizb(hizbNumber: number): Promise<Ayah[]> {
    return this.executeWithFallback(
      `getHizb(${hizbNumber})`,
      () => this.primary.getHizb(hizbNumber),
      () => this.fallback.getHizb(hizbNumber)
    );
  }

  async getQuarter(quarterNumber: number): Promise<Ayah[]> {
    return this.executeWithFallback(
      `getQuarter(${quarterNumber})`,
      () => this.primary.getQuarter(quarterNumber),
      () => this.fallback.getQuarter(quarterNumber)
    );
  }

  async searchAyahs(query: string, limit = 20): Promise<Ayah[]> {
    return this.executeWithFallback(
      `searchAyahs(${query})`,
      () => this.primary.searchAyahs(query, limit),
      () => this.fallback.searchAyahs(query, limit)
    );
  }

  async resolveRangeMetrics(start: QuranPosition, end: QuranPosition): Promise<QuranRangeMetrics> {
    return this.executeWithFallback(
      'resolveRangeMetrics',
      async () => {
        const metrics = await this.primary.resolveRangeMetrics(start, end);
        if (metrics.ayahCount === 0) throw new Error('Unresolved metrics from primary');
        return metrics;
      },
      () => this.fallback.resolveRangeMetrics(start, end)
    );
  }

  getMushafProfile(): MushafProfile {
    return this.primary.getMushafProfile() || this.fallback.getMushafProfile();
  }

  async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
    sampleAyahFetched?: string;
  }> {
    const primaryTest = await this.primary.testConnection();
    if (primaryTest.success) {
      return {
        ...primaryTest,
        message: `الأساسي (${this.primary.providerName}) متصل بنجاح، والبديل (${this.fallback.providerName}) جاهز للطوارئ.`,
      };
    }

    const fallbackTest = await this.fallback.testConnection();
    return {
      success: fallbackTest.success,
      latencyMs: fallbackTest.latencyMs,
      message: `تنبيه: فشل المزود الأساسي (${this.primary.providerName}). تم تفعيل المزود البديل (${this.fallback.providerName}) بنجاح. سبب فشل الأساسي: ${primaryTest.message}`,
      sampleAyahFetched: fallbackTest.sampleAyahFetched,
    };
  }

  getSyncStatus(): SyncStatus {
    const p = this.primary.getSyncStatus();
    if (p.status === 'error') {
      return this.fallback.getSyncStatus();
    }
    return p;
  }
}
