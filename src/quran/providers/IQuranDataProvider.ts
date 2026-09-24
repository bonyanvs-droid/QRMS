import {
  Surah,
  Ayah,
  QuranPosition,
  QuranRangeMetrics,
  MushafProfile,
  SyncStatus,
} from '../types';

/**
 * Unified Quran Data Provider Interface
 *
 * All upstream modules (Planning Engines, Review Engines, UI Components) interact
 * exclusively through this abstraction layer. Upstream code has ZERO knowledge
 * of specific external APIs, URLs, or local storage structures.
 */
export interface IQuranDataProvider {
  /** Unique provider identifier */
  readonly providerId: string;

  /** Human-readable provider name */
  readonly providerName: string;

  /** Retrieve metadata for all 114 Surahs */
  getSurahs(): Promise<Surah[]>;

  /** Synchronous retrieval of surahs if supported by offline/in-memory provider */
  getAllSurahs?(): Surah[];

  /** Retrieve metadata for a specific Surah by its number (1 to 114) */
  getSurah(surahNumber: number): Promise<Surah | null>;

  /** Retrieve a single verse by Surah and Ayah number */
  getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah | null>;

  /** Retrieve a single verse by its continuous sequential global index (1 to 6236) */
  getAyahByGlobalIndex(globalIndex: number): Promise<Ayah | null>;

  /**
   * Retrieve an inclusive range of verses between two arbitrary points in the Quran.
   * Supports both forward (e.g., Al-Baqarah -> An-Nisa) and backward (e.g., Al-Fatihah -> An-Nas -> Al-Baqarah) directions.
   */
  getAyahsInRange(start: QuranPosition, end: QuranPosition, direction?: 'forward' | 'backward'): Promise<Ayah[]>;

  /** Retrieve all verses contained in a specific page (1 to 604) */
  getPage(pageNumber: number): Promise<Ayah[]>;

  /** Retrieve all verses contained in a specific Juz (1 to 30) */
  getJuz(juzNumber: number): Promise<Ayah[]>;

  /** Retrieve all verses contained in a specific Hizb (1 to 60) */
  getHizb(hizbNumber: number): Promise<Ayah[]>;

  /** Retrieve all verses contained in a specific quarter (1 to 240) */
  getQuarter(quarterNumber: number): Promise<Ayah[]>;

  /** Fast text search across verses (supports diacritic and diacritic-free queries) */
  searchAyahs(query: string, limit?: number): Promise<Ayah[]>;

  /**
   * Calculate detailed structural metrics for a given range (verse count, page span, direction)
   * Essential for planning algorithms to evaluate student workloads.
   */
  resolveRangeMetrics(start: QuranPosition, end: QuranPosition): Promise<QuranRangeMetrics>;

  /** Get active Mus'haf profile details (pagination, layout metadata) */
  getMushafProfile(): MushafProfile;

  /** Verify connectivity and responsiveness of this provider */
  testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    message: string;
    sampleAyahFetched?: string;
  }>;

  /** Inspect the current data synchronization and version state */
  getSyncStatus(): SyncStatus;
}
