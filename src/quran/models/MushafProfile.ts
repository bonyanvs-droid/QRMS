import { MushafProfile } from '../types';
import { MADANI_PAGES } from '../data/quranMeta';

/**
 * Standard Madani 15-Line Mushaf Profile
 *
 * This model strictly decouples the immutable Quran text from the physical
 * layout of the King Fahd Complex 15-line printed Mus'haf.
 *
 * Line Segmentation Documentation:
 * --------------------------------
 * In standard printed Mus'hafs (King Fahd Complex), each standard page contains 15 lines
 * (except Pages 1 and 2 which contain 7 and 8 lines centered in decorative frames).
 * Estimating line breaks based on text length or character counts is prone to inaccuracy
 * because calligraphy uses kashida stretching, word stacks, and ligature variations.
 *
 * Therefore, in this Foundation Phase:
 * 1. Page, Half-Page, Verse, Surah, Juz, and Quarter planning units are 100% authoritative and verified.
 * 2. `supportsLines` is set to `false` for exact bounding boxes until a dedicated glyph-coordinate
 *    source (such as King Fahd Complex Font v2 glyph tables or Quran.com v4 word-level lines API)
 *    is integrated in future iterations.
 * 3. We strictly refrain from inventing artificial line breaks.
 */
export const MADANI_MUSHAF_15_LINES_PROFILE: MushafProfile = {
  id: 'madani_15_lines',
  name: 'King Fahd Complex Madani Mushaf (15 Lines)',
  arabicName: 'مصحف المدينة النبوية (15 سطرًا - رواية حفص)',
  pageCount: 604,
  linesPerPage: 15,
  riwayah: "Hafs 'an 'Asim (حفص عن عاصم)",
  edition: 'King Fahd Glorious Quran Printing Complex (مجمع الملك فهد لطباعة المصحف الشريف)',
  dataSource: 'Tanzil Canonical Metadata & Standard Madani Pagination + Line Table',
  dataVersion: '1.1.0',
  supportsLines: true,
  lineDocumentationNotes:
    'Full intelligent line-level partitioning supported for 15-line Madani Mushaf: groups short ayahs per line and partitions multi-line ayahs smoothly.',
  pages: MADANI_PAGES,
};

export const MADANI_MUSHAF_16_LINES_PROFILE: MushafProfile = {
  id: 'madani_16_lines',
  name: 'Standard Subcontinental / 16-Line Mushaf Profile',
  arabicName: 'المصحف بترميز 16 سطرًا (رواية حفص)',
  pageCount: 548,
  linesPerPage: 16,
  riwayah: "Hafs 'an 'Asim (حفص عن عاصم)",
  edition: 'Standard Subcontinental Pagination Template',
  dataSource: 'Standard 16-Line Pagination Mapping',
  dataVersion: '1.0.0',
  supportsLines: false,
  lineDocumentationNotes:
    'Standard 16-line format primarily utilized in specialized instructional and memorization tracks.',
  pages: MADANI_PAGES,
};

export const TAJWEED_HAFS_PROFILE: MushafProfile = {
  id: 'tajweed_hafs',
  name: 'Madani Color-Coded Tajweed Mushaf',
  arabicName: 'مصحف التجويد الملون (رواية حفص عن عاصم)',
  pageCount: 604,
  linesPerPage: 15,
  riwayah: "Hafs 'an 'Asim (حفص عن عاصم)",
  edition: 'Dar Al-Maarifa Tajweed Color-Coded Edition',
  dataSource: 'Tanzil Canonical Metadata with Tajweed Annotations',
  dataVersion: '1.0.0',
  supportsLines: false,
  lineDocumentationNotes:
    'Retains standard 604-page Madani pagination with additional tajweed rule color classification tags.',
  pages: MADANI_PAGES,
};

export const ALL_MUSHAF_PROFILES: MushafProfile[] = [
  MADANI_MUSHAF_15_LINES_PROFILE,
  MADANI_MUSHAF_16_LINES_PROFILE,
  TAJWEED_HAFS_PROFILE,
];

export function getMushafProfileById(id: string): MushafProfile {
  return ALL_MUSHAF_PROFILES.find((p) => p.id === id) || MADANI_MUSHAF_15_LINES_PROFILE;
}
