import { QuranPosition } from '../types';

export const SURAH_NAMES_BY_NUMBER: Record<number, string> = {
  1: 'الفاتحة',
  2: 'البقرة',
  3: 'آل عمران',
  4: 'النساء',
  5: 'المائدة',
  6: 'الأنعام',
  7: 'الأعراف',
  8: 'الأنفال',
  9: 'التوبة',
  10: 'يونس',
  11: 'هود',
  12: 'يوسف',
  13: 'الرعد',
  14: 'إبراهيم',
  15: 'الحجر',
  16: 'النحل',
  17: 'الإسراء',
  18: 'الكهف',
  19: 'مريم',
  20: 'طه',
  21: 'الأنبياء',
  22: 'الحج',
  23: 'المؤمنون',
  24: 'النور',
  25: 'الفرقان',
  26: 'الشعراء',
  27: 'النمل',
  28: 'القصص',
  29: 'العنكبوت',
  30: 'الروم',
  31: 'لقمان',
  32: 'السجدة',
  33: 'الأحزاب',
  34: 'سبأ',
  35: 'فاطر',
  36: 'يس',
  37: 'الصافات',
  38: 'ص',
  39: 'الزمر',
  40: 'غافر',
  41: 'فصلت',
  42: 'الشورى',
  43: 'الزخرف',
  44: 'الدخان',
  45: 'الجاثية',
  46: 'الأحقاف',
  47: 'محمد',
  48: 'الفتح',
  49: 'الحجرات',
  50: 'ق',
  51: 'الذاريات',
  52: 'الطور',
  53: 'النجم',
  54: 'القمر',
  55: 'الرحمن',
  56: 'الواقعة',
  57: 'الحديد',
  58: 'المجادلة',
  59: 'الحشر',
  60: 'الممتحنة',
  61: 'الصف',
  62: 'الجمعة',
  63: 'المنافقون',
  64: 'التغابن',
  65: 'الطلاق',
  66: 'التحريم',
  67: 'الملك',
  68: 'القلم',
  69: 'الحاقة',
  70: 'المعارج',
  71: 'نوح',
  72: 'الجن',
  73: 'المزمل',
  74: 'المدثر',
  75: 'القيامة',
  76: 'الإنسان',
  77: 'المرسلات',
  78: 'النبأ',
  79: 'النازعات',
  80: 'عبس',
  81: 'التكوير',
  82: 'الانفطار',
  83: 'المطففين',
  84: 'الانشقاق',
  85: 'البروج',
  86: 'الطارق',
  87: 'الأعلى',
  88: 'الغاشية',
  89: 'الفجر',
  90: 'البلد',
  91: 'الشمس',
  92: 'الليل',
  93: 'الضحى',
  94: 'الشرح',
  95: 'التين',
  96: 'العلق',
  97: 'القدر',
  98: 'البينة',
  99: 'الزلزلة',
  100: 'العاديات',
  101: 'القارعة',
  102: 'التكاثر',
  103: 'العصر',
  104: 'الهمزة',
  105: 'الفيل',
  106: 'قريش',
  107: 'الماعون',
  108: 'الكوثر',
  109: 'الكافرون',
  110: 'النصر',
  111: 'المسد',
  112: 'الإخلاص',
  113: 'الفلق',
  114: 'الناس',
};

export class QuranPositionFormatter {
  /**
   * Resolves a clean Surah name from either a number or raw string
   */
  static getSurahName(surah: number | string): string {
    if (typeof surah === 'number') {
      return SURAH_NAMES_BY_NUMBER[surah] || `سورة ${surah}`;
    }
    const parsed = parseInt(surah, 10);
    if (!isNaN(parsed) && SURAH_NAMES_BY_NUMBER[parsed]) {
      return SURAH_NAMES_BY_NUMBER[parsed];
    }
    return surah.startsWith('سورة') ? surah : `سورة ${surah}`;
  }

  /**
   * Formats a single position (e.g. "سورة الفاتحة - آية 1")
   */
  static formatPosition(pos?: Partial<QuranPosition> | null): string {
    if (!pos) return 'لم يُحدد الموضع';
    const rawSurah = (pos as any).surahName || (pos as any).surahNumber || (pos as any).surah || 1;
    const surahName = this.getSurahName(rawSurah);
    const ayah = pos.ayahNumber || (pos as any).ayah;
    if (ayah) {
      return `${surahName} (الآية ${ayah})`;
    }
    return surahName;
  }

  /**
   * Formats a range between start and end positions
   */
  static formatRange(
    start?: Partial<QuranPosition> | null,
    end?: Partial<QuranPosition> | null
  ): string {
    if (!start && !end) return 'غير محدد';
    if (!end) return this.formatPosition(start);
    if (!start) return this.formatPosition(end);

    const startRaw = (start as any).surahName || (start as any).surahNumber || (start as any).surah || 1;
    const endRaw = (end as any).surahName || (end as any).surahNumber || (end as any).surah || 1;
    const startSurah = this.getSurahName(startRaw);
    const endSurah = this.getSurahName(endRaw);

    const startAyah = start.ayahNumber || (start as any).ayah;
    const endAyah = end.ayahNumber || (end as any).ayah;

    if (startSurah === endSurah) {
      if (startAyah && endAyah) {
        if (startAyah === endAyah) {
          return `${startSurah} (آية ${startAyah})`;
        }
        return `${startSurah} (من آية ${startAyah} إلى ${endAyah})`;
      }
      return startSurah;
    }

    const startText = startAyah ? `${startSurah} (آية ${startAyah})` : startSurah;
    const endText = endAyah ? `${endSurah} (آية ${endAyah})` : endSurah;
    return `من ${startText} إلى ${endText}`;
  }
}

export function formatQuranPosition(
  pos?: Partial<QuranPosition> | any | null,
  options?: { withPrefix?: boolean }
): string {
  if (!pos) return 'لم يُحدد الموضع';
  if (typeof pos === 'string') return pos;
  return QuranPositionFormatter.formatPosition(pos);
}

export function formatQuranRange(
  start?: Partial<QuranPosition> | any | null,
  end?: Partial<QuranPosition> | any | null,
  options?: { includeSurahWord?: boolean }
): string {
  if (!start && !end) return 'غير محدد';
  if (typeof start === 'string' && !end) return start;
  return QuranPositionFormatter.formatRange(start, end);
}

export function formatQuranTextExpression(
  textOrStart?: Partial<QuranPosition> | string | any | null,
  endOrOptions?: Partial<QuranPosition> | any | null,
  options?: any
): string {
  if (!textOrStart) return '';
  if (typeof textOrStart === 'string') return textOrStart;
  return QuranPositionFormatter.formatRange(textOrStart, endOrOptions);
}

export function getSurahArabicName(surah: number | string): string {
  return QuranPositionFormatter.getSurahName(surah);
}
