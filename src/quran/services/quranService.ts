import { IQuranDataProvider } from '../providers/IQuranDataProvider';
import {
  Surah,
  Ayah,
  QuranPosition,
  QuranRangeMetrics,
  MushafProfile,
  SyncStatus,
} from '../types';
import { IntegrationConfigManager } from '../config/integrationConfig';
import { RangeCalculator } from './rangeCalculator';
import { QuranSyncService, DataIntegrityReport } from './syncService';

/**
 * Universal Quran Service
 *
 * Primary entry point for all Quran data operations across the entire application.
 * Fully decoupled from specific stages, student profiles, or physical storage.
 * Defaults to Offline-First Bundled Provider for instant response and 100% offline reliability.
 */
export class QuranService {
  private static instance: QuranService | null = null;
  private integrationManager: IntegrationConfigManager;
  private rangeCalculator: RangeCalculator;
  private syncService: QuranSyncService;

  private constructor() {
    this.integrationManager = new IntegrationConfigManager('development');
    const provider = this.integrationManager.getActiveProvider();
    this.rangeCalculator = new RangeCalculator(provider);
    this.syncService = new QuranSyncService(provider);
  }

  static getInstance(): QuranService {
    if (!QuranService.instance) {
      QuranService.instance = new QuranService();
    }
    return QuranService.instance;
  }

  getProvider(): IQuranDataProvider {
    return this.integrationManager.getActiveProvider();
  }

  setPrimaryProvider(providerId: string): void {
    this.integrationManager.setPrimaryProvider(providerId);
    const provider = this.integrationManager.getActiveProvider();
    this.rangeCalculator = new RangeCalculator(provider);
    this.syncService = new QuranSyncService(provider);
  }

  getIntegrationManager(): IntegrationConfigManager {
    return this.integrationManager;
  }

  getRangeCalculator(): RangeCalculator {
    return this.rangeCalculator;
  }

  getSyncService(): QuranSyncService {
    return this.syncService;
  }

  async getSurahs(): Promise<Surah[]> {
    return this.getProvider().getSurahs();
  }

  async getSurah(surahNumber: number): Promise<Surah | null> {
    return this.getProvider().getSurah(surahNumber);
  }

  async getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah | null> {
    return this.getProvider().getAyah(surahNumber, ayahNumber);
  }

  async getAyahByGlobalIndex(globalIndex: number): Promise<Ayah | null> {
    return this.getProvider().getAyahByGlobalIndex(globalIndex);
  }

  async getAyahsInRange(start: QuranPosition, end: QuranPosition): Promise<Ayah[]> {
    return this.getProvider().getAyahsInRange(start, end);
  }

  async getPage(pageNumber: number): Promise<Ayah[]> {
    return this.getProvider().getPage(pageNumber);
  }

  async getJuz(juzNumber: number): Promise<Ayah[]> {
    return this.getProvider().getJuz(juzNumber);
  }

  async getHizb(hizbNumber: number): Promise<Ayah[]> {
    return this.getProvider().getHizb(hizbNumber);
  }

  async getQuarter(quarterNumber: number): Promise<Ayah[]> {
    return this.getProvider().getQuarter(quarterNumber);
  }

  async searchAyahs(query: string, limit?: number): Promise<Ayah[]> {
    return this.getProvider().searchAyahs(query, limit);
  }

  async resolveRangeMetrics(start: QuranPosition, end: QuranPosition): Promise<QuranRangeMetrics> {
    return this.getProvider().resolveRangeMetrics(start, end);
  }

  getMushafProfile(): MushafProfile {
    return this.getProvider().getMushafProfile();
  }

  getSyncStatus(): SyncStatus {
    return this.getProvider().getSyncStatus();
  }

  async verifyIntegrity(): Promise<DataIntegrityReport> {
    return this.syncService.verifyIntegrity();
  }
}

/** Default singleton instance */
export const quranService = QuranService.getInstance();
