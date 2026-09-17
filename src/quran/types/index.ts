/**
 * Core Quran Data Model and Planning Unit Definitions
 * Designed for Universal Scalability across all stages and curricula.
 */

export interface Surah {
  surahNumber: number;            // 1 to 114
  number?: number;                // Convenient alias
  name: string;                   // English transliteration, e.g., 'Al-Faatiha'
  arabicName: string;             // Standard Arabic name without prefix, e.g., 'الفاتحة'
  nameArabic?: string;            // Convenient alias
  fullNameArabic: string;         // Canonical Arabic name with diacritics, e.g., 'سُورَةُ ٱلْفَاتِحَةِ'
  englishNameTranslation: string; // Meaning in English, e.g., 'The Opening'
  ayahCount: number;              // Total number of verses
  totalAyahs?: number;            // Convenient alias
  order: number;                  // Mus'haf sequential order (1 to 114)
  revelationType: 'Meccan' | 'Medinan';
  startAyahGlobalIndex: number;   // 1-based global Ayah index where this surah begins (1 to 6236)
  endAyahGlobalIndex: number;     // 1-based global Ayah index where this surah ends
  startPage: number;              // Start page in standard Madani Mushaf (1 to 604)
  endPage: number;                // End page in standard Madani Mushaf (1 to 604)
}

export interface Ayah {
  surahNumber: number;            // 1 to 114
  ayahNumber: number;             // 1 to N within the surah
  globalIndex: number;            // 1 to 6236 continuous sequential global index
  text: string;                   // Full Arabic Uthmani text with diacritics
  cleanText: string;              // Diacritic-free normalized text for instant search
  pageNumber: number;             // 1 to 604 in standard Madani Mushaf
  juzNumber: number;              // 1 to 30
  hizbNumber: number;             // 1 to 60
  quarter: number;                // 1 to 240 (Hizb quarter)
  sajda?: boolean;                // Prostration indicator
  metadata?: Record<string, unknown>; // Extensible container for future additions (e.g., word count, tajweed markers)
}

export interface QuranPosition {
  surahNumber: number;
  ayahNumber: number;
  globalIndex?: number;
  surahName?: string;
  pageNumber?: number;
}

export type PlanningUnitType =
  | 'line'
  | 'ayah'
  | 'verse_range'
  | 'quarter_page'
  | 'half_page'
  | 'page'
  | 'quarter'
  | 'hizb'
  | 'juz'
  | 'surah';

export interface PlanningUnit {
  type: PlanningUnitType;
  start: QuranPosition;
  end: QuranPosition;
  totalAyahs: number;
  displayLabel: string;
  pageStart?: number;
  pageEnd?: number;
  estimatedLines?: number;
  isConsolidation?: boolean;
  consolidationDayIndex?: number; // 1, 2, 3
  consolidationSurahNumber?: number;
  revisionPages?: number;
  revisionDisplay?: string;
  revisionPageStart?: number;
  revisionPageEnd?: number;
}

export interface QuranRangeMetrics {
  start: QuranPosition;
  end: QuranPosition;
  ayahCount: number;
  pageCount: number;
  startPage: number;
  endPage: number;
  surahsInvolved: number[];
  direction: 'forward' | 'reverse'; // 'forward' = Fatihah -> Nas; 'reverse' = Nas -> Fatihah
}

export interface PageDefinition {
  pageNumber: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startGlobalIndex: number;
  endGlobalIndex: number;
  totalAyahs: number;
}

export interface JuzDefinition {
  juzNumber: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startGlobalIndex: number;
  endGlobalIndex: number;
  startPage: number;
  endPage: number;
  totalAyahs: number;
}

export interface QuarterDefinition {
  quarterNumber: number;          // 1 to 240
  hizbNumber: number;             // 1 to 60
  quarterInHizb: number;          // 1 to 4
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  startGlobalIndex: number;
  endGlobalIndex: number;
  startPage: number;
  endPage: number;
  totalAyahs: number;
}

/**
 * Mushaf Layout Profile
 * Decouples the immutable Quran text from specific print layouts, line distributions, and pagination.
 */
export interface MushafProfile {
  id: string;
  name: string;
  arabicName: string;
  nameArabic?: string; // Compatibility alias
  descriptionArabic?: string; // Compatibility alias
  pageCount: number;              // E.g., 604 for standard Madani
  totalPages?: number;            // Compatibility alias
  linesPerPage: number | null;    // E.g., 15 for standard 15-line Madani; null if dynamic
  riwayah: string;                // E.g., "Hafs 'an 'Asim"
  edition: string;                // E.g., "King Fahd Glorious Quran Printing Complex"
  dataSource: string;             // E.g., "Tanzil / Canonical Metadata"
  dataVersion: string;
  supportsLines: boolean;         // Explicit flag indicating whether line-level coordinates are reliably available
  lineDocumentationNotes: string; // Explanatory documentation regarding line distribution availability
  juzToPageMap?: Record<number, number>; // Compatibility map
  orthography?: string; // Compatibility text
  pages: PageDefinition[];
}

export interface SyncStatus {
  source: string;
  lastSync: string;
  dataVersion: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  syncedItemCount: number;
  totalItemCount: number;
  errors: string[];
}

export type { IQuranDataProvider } from '../providers/IQuranDataProvider';

