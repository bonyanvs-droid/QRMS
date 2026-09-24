import { SurahMeta } from '../types';

export interface QuranSurahEntry extends SurahMeta {
  number: number;
  name: string;
  arabicName: string;
  fullNameArabic: string;
  ayahsCount: number;
  ayas: number;
  juz: number;
  startPage?: number;
  endPage?: number;
}

export const ALL_114_SURAHS: QuranSurahEntry[] = [
  { number: 1, name: 'الفاتحة', arabicName: 'الفاتحة', fullNameArabic: 'سورة الفاتحة', ayahsCount: 7, ayas: 7, juz: 1, startPage: 1, endPage: 1 },
  { number: 2, name: 'البقرة', arabicName: 'البقرة', fullNameArabic: 'سورة البقرة', ayahsCount: 286, ayas: 286, juz: 1, startPage: 2, endPage: 49 },
  { number: 3, name: 'آل عمران', arabicName: 'آل عمران', fullNameArabic: 'سورة آل عمران', ayahsCount: 200, ayas: 200, juz: 3, startPage: 50, endPage: 76 },
  { number: 4, name: 'النساء', arabicName: 'النساء', fullNameArabic: 'سورة النساء', ayahsCount: 176, ayas: 176, juz: 4, startPage: 77, endPage: 106 },
  { number: 5, name: 'المائدة', arabicName: 'المائدة', fullNameArabic: 'سورة المائدة', ayahsCount: 120, ayas: 120, juz: 6, startPage: 106, endPage: 127 },
  { number: 6, name: 'الأنعام', arabicName: 'الأنعام', fullNameArabic: 'سورة الأنعام', ayahsCount: 165, ayas: 165, juz: 7, startPage: 128, endPage: 150 },
  { number: 7, name: 'الأعراف', arabicName: 'الأعراف', fullNameArabic: 'سورة الأعراف', ayahsCount: 206, ayas: 206, juz: 8, startPage: 151, endPage: 176 },
  { number: 8, name: 'الأنفال', arabicName: 'الأنفال', fullNameArabic: 'سورة الأنفال', ayahsCount: 75, ayas: 75, juz: 9, startPage: 177, endPage: 186 },
  { number: 9, name: 'التوبة', arabicName: 'التوبة', fullNameArabic: 'سورة التوبة', ayahsCount: 129, ayas: 129, juz: 10, startPage: 187, endPage: 207 },
  { number: 10, name: 'يونس', arabicName: 'يونس', fullNameArabic: 'سورة يونس', ayahsCount: 109, ayas: 109, juz: 11, startPage: 208, endPage: 221 },
  { number: 11, name: 'هود', arabicName: 'هود', fullNameArabic: 'سورة هود', ayahsCount: 123, ayas: 123, juz: 11, startPage: 221, endPage: 235 },
  { number: 12, name: 'يوسف', arabicName: 'يوسف', fullNameArabic: 'سورة يوسف', ayahsCount: 111, ayas: 111, juz: 12, startPage: 235, endPage: 248 },
  { number: 13, name: 'الرعد', arabicName: 'الرعد', fullNameArabic: 'سورة الرعد', ayahsCount: 43, ayas: 43, juz: 13, startPage: 249, endPage: 255 },
  { number: 14, name: 'إبراهيم', arabicName: 'إبراهيم', fullNameArabic: 'سورة إبراهيم', ayahsCount: 52, ayas: 52, juz: 13, startPage: 255, endPage: 261 },
  { number: 15, name: 'الحجر', arabicName: 'الحجر', fullNameArabic: 'سورة الحجر', ayahsCount: 99, ayas: 99, juz: 14, startPage: 262, endPage: 267 },
  { number: 16, name: 'النحل', arabicName: 'النحل', fullNameArabic: 'سورة النحل', ayahsCount: 128, ayas: 128, juz: 14, startPage: 267, endPage: 281 },
  { number: 17, name: 'الإسراء', arabicName: 'الإسراء', fullNameArabic: 'سورة الإسراء', ayahsCount: 111, ayas: 111, juz: 15, startPage: 282, endPage: 293 },
  { number: 18, name: 'الكهف', arabicName: 'الكهف', fullNameArabic: 'سورة الكهف', ayahsCount: 110, ayas: 110, juz: 15, startPage: 293, endPage: 304 },
  { number: 19, name: 'مريم', arabicName: 'مريم', fullNameArabic: 'سورة مريم', ayahsCount: 98, ayas: 98, juz: 16, startPage: 305, endPage: 312 },
  { number: 20, name: 'طه', arabicName: 'طه', fullNameArabic: 'سورة طه', ayahsCount: 135, ayas: 135, juz: 16, startPage: 312, endPage: 321 },
  { number: 21, name: 'الأنبياء', arabicName: 'الأنبياء', fullNameArabic: 'سورة الأنبياء', ayahsCount: 112, ayas: 112, juz: 17, startPage: 322, endPage: 331 },
  { number: 22, name: 'الحج', arabicName: 'الحج', fullNameArabic: 'سورة الحج', ayahsCount: 78, ayas: 78, juz: 17, startPage: 332, endPage: 341 },
  { number: 23, name: 'المؤمنون', arabicName: 'المؤمنون', fullNameArabic: 'سورة المؤمنون', ayahsCount: 118, ayas: 118, juz: 18, startPage: 342, endPage: 349 },
  { number: 24, name: 'النور', arabicName: 'النور', fullNameArabic: 'سورة النور', ayahsCount: 64, ayas: 64, juz: 18, startPage: 350, endPage: 359 },
  { number: 25, name: 'الفرقان', arabicName: 'الفرقان', fullNameArabic: 'سورة الفرقان', ayahsCount: 77, ayas: 77, juz: 18, startPage: 359, endPage: 366 },
  { number: 26, name: 'الشعراء', arabicName: 'الشعراء', fullNameArabic: 'سورة الشعراء', ayahsCount: 227, ayas: 227, juz: 19, startPage: 367, endPage: 376 },
  { number: 27, name: 'النمل', arabicName: 'النمل', fullNameArabic: 'سورة النمل', ayahsCount: 93, ayas: 93, juz: 19, startPage: 377, endPage: 385 },
  { number: 28, name: 'القصص', arabicName: 'القصص', fullNameArabic: 'سورة القصص', ayahsCount: 88, ayas: 88, juz: 20, startPage: 385, endPage: 396 },
  { number: 29, name: 'العنكبوت', arabicName: 'العنكبوت', fullNameArabic: 'سورة العنكبوت', ayahsCount: 69, ayas: 69, juz: 20, startPage: 396, endPage: 404 },
  { number: 30, name: 'الروم', arabicName: 'الروم', fullNameArabic: 'سورة الروم', ayahsCount: 60, ayas: 60, juz: 21, startPage: 404, endPage: 410 },
  { number: 31, name: 'لقمان', arabicName: 'لقمان', fullNameArabic: 'سورة لقمان', ayahsCount: 34, ayas: 34, juz: 21, startPage: 411, endPage: 414 },
  { number: 32, name: 'السجدة', arabicName: 'السجدة', fullNameArabic: 'سورة السجدة', ayahsCount: 30, ayas: 30, juz: 21, startPage: 415, endPage: 417 },
  { number: 33, name: 'الأحزاب', arabicName: 'الأحزاب', fullNameArabic: 'سورة الأحزاب', ayahsCount: 73, ayas: 73, juz: 21, startPage: 418, endPage: 427 },
  { number: 34, name: 'سبأ', arabicName: 'سبأ', fullNameArabic: 'سورة سبأ', ayahsCount: 54, ayas: 54, juz: 22, startPage: 428, endPage: 434 },
  { number: 35, name: 'فاطر', arabicName: 'فاطر', fullNameArabic: 'سورة فاطر', ayahsCount: 45, ayas: 45, juz: 22, startPage: 434, endPage: 440 },
  { number: 36, name: 'يس', arabicName: 'يس', fullNameArabic: 'سورة يس', ayahsCount: 83, ayas: 83, juz: 22, startPage: 440, endPage: 445 },
  { number: 37, name: 'الصافات', arabicName: 'الصافات', fullNameArabic: 'سورة الصافات', ayahsCount: 182, ayas: 182, juz: 23, startPage: 446, endPage: 452 },
  { number: 38, name: 'ص', arabicName: 'ص', fullNameArabic: 'سورة ص', ayahsCount: 88, ayas: 88, juz: 23, startPage: 453, endPage: 458 },
  { number: 39, name: 'الزمر', arabicName: 'الزمر', fullNameArabic: 'سورة الزمر', ayahsCount: 75, ayas: 75, juz: 23, startPage: 458, endPage: 467 },
  { number: 40, name: 'غافر', arabicName: 'غافر', fullNameArabic: 'سورة غافر', ayahsCount: 85, ayas: 85, juz: 24, startPage: 467, endPage: 476 },
  { number: 41, name: 'فصلت', arabicName: 'فصلت', fullNameArabic: 'سورة فصلت', ayahsCount: 54, ayas: 54, juz: 24, startPage: 477, endPage: 482 },
  { number: 42, name: 'الشورى', arabicName: 'الشورى', fullNameArabic: 'سورة الشورى', ayahsCount: 53, ayas: 53, juz: 25, startPage: 483, endPage: 489 },
  { number: 43, name: 'الزخرف', arabicName: 'الزخرف', fullNameArabic: 'سورة الزخرف', ayahsCount: 89, ayas: 89, juz: 25, startPage: 489, endPage: 495 },
  { number: 44, name: 'الدخان', arabicName: 'الدخان', fullNameArabic: 'سورة الدخان', ayahsCount: 59, ayas: 59, juz: 25, startPage: 496, endPage: 498 },
  { number: 45, name: 'الجاثية', arabicName: 'الجاثية', fullNameArabic: 'سورة الجاثية', ayahsCount: 37, ayas: 37, juz: 25, startPage: 499, endPage: 502 },
  { number: 46, name: 'الأحقاف', arabicName: 'الأحقاف', fullNameArabic: 'سورة الأحقاف', ayahsCount: 35, ayas: 35, juz: 26, startPage: 502, endPage: 506 },
  { number: 47, name: 'محمد', arabicName: 'محمد', fullNameArabic: 'سورة محمد', ayahsCount: 38, ayas: 38, juz: 26, startPage: 507, endPage: 510 },
  { number: 48, name: 'الفتح', arabicName: 'الفتح', fullNameArabic: 'سورة الفتح', ayahsCount: 29, ayas: 29, juz: 26, startPage: 511, endPage: 515 },
  { number: 49, name: 'الحجرات', arabicName: 'الحجرات', fullNameArabic: 'سورة الحجرات', ayahsCount: 18, ayas: 18, juz: 26, startPage: 515, endPage: 517 },
  { number: 50, name: 'ق', arabicName: 'ق', fullNameArabic: 'سورة ق', ayahsCount: 45, ayas: 45, juz: 26, startPage: 518, endPage: 520 },
  { number: 51, name: 'الذاريات', arabicName: 'الذاريات', fullNameArabic: 'سورة الذاريات', ayahsCount: 60, ayas: 60, juz: 26, startPage: 520, endPage: 523 },
  { number: 52, name: 'الطور', arabicName: 'الطور', fullNameArabic: 'سورة الطور', ayahsCount: 49, ayas: 49, juz: 27, startPage: 523, endPage: 525 },
  { number: 53, name: 'النجم', arabicName: 'النجم', fullNameArabic: 'سورة النجم', ayahsCount: 62, ayas: 62, juz: 27, startPage: 526, endPage: 528 },
  { number: 54, name: 'القمر', arabicName: 'القمر', fullNameArabic: 'سورة القمر', ayahsCount: 55, ayas: 55, juz: 27, startPage: 528, endPage: 531 },
  { number: 55, name: 'الرحمن', arabicName: 'الرحمن', fullNameArabic: 'سورة الرحمن', ayahsCount: 78, ayas: 78, juz: 27, startPage: 531, endPage: 534 },
  { number: 56, name: 'الواقعة', arabicName: 'الواقعة', fullNameArabic: 'سورة الواقعة', ayahsCount: 96, ayas: 96, juz: 27, startPage: 534, endPage: 537 },
  { number: 57, name: 'الحديد', arabicName: 'الحديد', fullNameArabic: 'سورة الحديد', ayahsCount: 29, ayas: 29, juz: 27, startPage: 537, endPage: 541 },
  { number: 58, name: 'المجادلة', arabicName: 'المجادلة', fullNameArabic: 'سورة المجادلة', ayahsCount: 22, ayas: 22, juz: 28, startPage: 542, endPage: 545 },
  { number: 59, name: 'الحشر', arabicName: 'الحشر', fullNameArabic: 'سورة الحشر', ayahsCount: 24, ayas: 24, juz: 28, startPage: 545, endPage: 548 },
  { number: 60, name: 'الممتحنة', arabicName: 'الممتحنة', fullNameArabic: 'سورة الممتحنة', ayahsCount: 13, ayas: 13, juz: 28, startPage: 549, endPage: 551 },
  { number: 61, name: 'الصف', arabicName: 'الصف', fullNameArabic: 'سورة الصف', ayahsCount: 14, ayas: 14, juz: 28, startPage: 551, endPage: 552 },
  { number: 62, name: 'الجمعة', arabicName: 'الجمعة', fullNameArabic: 'سورة الجمعة', ayahsCount: 11, ayas: 11, juz: 28, startPage: 553, endPage: 554 },
  { number: 63, name: 'المنافقون', arabicName: 'المنافقون', fullNameArabic: 'سورة المنافقون', ayahsCount: 11, ayas: 11, juz: 28, startPage: 554, endPage: 555 },
  { number: 64, name: 'التغابن', arabicName: 'التغابن', fullNameArabic: 'سورة التغابن', ayahsCount: 18, ayas: 18, juz: 28, startPage: 556, endPage: 557 },
  { number: 65, name: 'الطلاق', arabicName: 'الطلاق', fullNameArabic: 'سورة الطلاق', ayahsCount: 12, ayas: 12, juz: 28, startPage: 558, endPage: 559 },
  { number: 66, name: 'التحريم', arabicName: 'التحريم', fullNameArabic: 'سورة التحريم', ayahsCount: 12, ayas: 12, juz: 28, startPage: 560, endPage: 561 },
  { number: 67, name: 'الملك', arabicName: 'الملك', fullNameArabic: 'سورة الملك', ayahsCount: 30, ayas: 30, juz: 29, startPage: 562, endPage: 564 },
  { number: 68, name: 'القلم', arabicName: 'القلم', fullNameArabic: 'سورة القلم', ayahsCount: 52, ayas: 52, juz: 29, startPage: 564, endPage: 566 },
  { number: 69, name: 'الحاقة', arabicName: 'الحاقة', fullNameArabic: 'سورة الحاقة', ayahsCount: 52, ayas: 52, juz: 29, startPage: 566, endPage: 568 },
  { number: 70, name: 'المعارج', arabicName: 'المعارج', fullNameArabic: 'سورة المعارج', ayahsCount: 44, ayas: 44, juz: 29, startPage: 568, endPage: 570 },
  { number: 71, name: 'نوح', arabicName: 'نوح', fullNameArabic: 'سورة نوح', ayahsCount: 28, ayas: 28, juz: 29, startPage: 570, endPage: 571 },
  { number: 72, name: 'الجن', arabicName: 'الجن', fullNameArabic: 'سورة الجن', ayahsCount: 28, ayas: 28, juz: 29, startPage: 572, endPage: 573 },
  { number: 73, name: 'المزمل', arabicName: 'المزمل', fullNameArabic: 'سورة المزمل', ayahsCount: 20, ayas: 20, juz: 29, startPage: 574, endPage: 575 },
  { number: 74, name: 'المدثر', arabicName: 'المدثر', fullNameArabic: 'سورة المدثر', ayahsCount: 56, ayas: 56, juz: 29, startPage: 575, endPage: 577 },
  { number: 75, name: 'القيامة', arabicName: 'القيامة', fullNameArabic: 'سورة القيامة', ayahsCount: 40, ayas: 40, juz: 29, startPage: 577, endPage: 578 },
  { number: 76, name: 'الإنسان', arabicName: 'الإنسان', fullNameArabic: 'سورة الإنسان', ayahsCount: 31, ayas: 31, juz: 29, startPage: 578, endPage: 580 },
  { number: 77, name: 'المرسلات', arabicName: 'المرسلات', fullNameArabic: 'سورة المرسلات', ayahsCount: 50, ayas: 50, juz: 29, startPage: 580, endPage: 581 },
  { number: 78, name: 'النبأ', arabicName: 'النبأ', fullNameArabic: 'سورة النبأ', ayahsCount: 40, ayas: 40, juz: 30, startPage: 582, endPage: 583 },
  { number: 79, name: 'النازعات', arabicName: 'النازعات', fullNameArabic: 'سورة النازعات', ayahsCount: 46, ayas: 46, juz: 30, startPage: 583, endPage: 584 },
  { number: 80, name: 'عبس', arabicName: 'عبس', fullNameArabic: 'سورة عبس', ayahsCount: 42, ayas: 42, juz: 30, startPage: 585, endPage: 585 },
  { number: 81, name: 'التكوير', arabicName: 'التكوير', fullNameArabic: 'سورة التكوير', ayahsCount: 29, ayas: 29, juz: 30, startPage: 586, endPage: 586 },
  { number: 82, name: 'الانفطار', arabicName: 'الانفطار', fullNameArabic: 'سورة الانفطار', ayahsCount: 19, ayas: 19, juz: 30, startPage: 587, endPage: 587 },
  { number: 83, name: 'المطففين', arabicName: 'المطففين', fullNameArabic: 'سورة المطففين', ayahsCount: 36, ayas: 36, juz: 30, startPage: 587, endPage: 589 },
  { number: 84, name: 'الانشقاق', arabicName: 'الانشقاق', fullNameArabic: 'سورة الانشقاق', ayahsCount: 25, ayas: 25, juz: 30, startPage: 589, endPage: 589 },
  { number: 85, name: 'البروج', arabicName: 'البروج', fullNameArabic: 'سورة البروج', ayahsCount: 22, ayas: 22, juz: 30, startPage: 590, endPage: 590 },
  { number: 86, name: 'الطارق', arabicName: 'الطارق', fullNameArabic: 'سورة الطارق', ayahsCount: 17, ayas: 17, juz: 30, startPage: 591, endPage: 591 },
  { number: 87, name: 'الأعلى', arabicName: 'الأعلى', fullNameArabic: 'سورة الأعلى', ayahsCount: 19, ayas: 19, juz: 30, startPage: 591, endPage: 592 },
  { number: 88, name: 'الغاشية', arabicName: 'الغاشية', fullNameArabic: 'سورة الغاشية', ayahsCount: 26, ayas: 26, juz: 30, startPage: 592, endPage: 592 },
  { number: 89, name: 'الفجر', arabicName: 'الفجر', fullNameArabic: 'سورة الفجر', ayahsCount: 30, ayas: 30, juz: 30, startPage: 593, endPage: 594 },
  { number: 90, name: 'البلد', arabicName: 'البلد', fullNameArabic: 'سورة البلد', ayahsCount: 20, ayas: 20, juz: 30, startPage: 594, endPage: 594 },
  { number: 91, name: 'الشمس', arabicName: 'الشمس', fullNameArabic: 'سورة الشمس', ayahsCount: 15, ayas: 15, juz: 30, startPage: 595, endPage: 595 },
  { number: 92, name: 'الليل', arabicName: 'الليل', fullNameArabic: 'سورة الليل', ayahsCount: 21, ayas: 21, juz: 30, startPage: 595, endPage: 596 },
  { number: 93, name: 'الضحى', arabicName: 'الضحى', fullNameArabic: 'سورة الضحى', ayahsCount: 11, ayas: 11, juz: 30, startPage: 596, endPage: 596 },
  { number: 94, name: 'الشرح', arabicName: 'الشرح', fullNameArabic: 'سورة الشرح', ayahsCount: 8, ayas: 8, juz: 30, startPage: 596, endPage: 596 },
  { number: 95, name: 'التين', arabicName: 'التين', fullNameArabic: 'سورة التين', ayahsCount: 8, ayas: 8, juz: 30, startPage: 597, endPage: 597 },
  { number: 96, name: 'العلق', arabicName: 'العلق', fullNameArabic: 'سورة العلق', ayahsCount: 19, ayas: 19, juz: 30, startPage: 597, endPage: 597 },
  { number: 97, name: 'القدر', arabicName: 'القدر', fullNameArabic: 'سورة القدر', ayahsCount: 5, ayas: 5, juz: 30, startPage: 598, endPage: 598 },
  { number: 98, name: 'البينة', arabicName: 'البينة', fullNameArabic: 'سورة البينة', ayahsCount: 8, ayas: 8, juz: 30, startPage: 598, endPage: 599 },
  { number: 99, name: 'الزلزلة', arabicName: 'الزلزلة', fullNameArabic: 'سورة الزلزلة', ayahsCount: 8, ayas: 8, juz: 30, startPage: 599, endPage: 599 },
  { number: 100, name: 'العاديات', arabicName: 'العاديات', fullNameArabic: 'سورة العاديات', ayahsCount: 11, ayas: 11, juz: 30, startPage: 599, endPage: 600 },
  { number: 101, name: 'القارعة', arabicName: 'القارعة', fullNameArabic: 'سورة القارعة', ayahsCount: 11, ayas: 11, juz: 30, startPage: 600, endPage: 600 },
  { number: 102, name: 'التكاثر', arabicName: 'التكاثر', fullNameArabic: 'سورة التكاثر', ayahsCount: 8, ayas: 8, juz: 30, startPage: 600, endPage: 600 },
  { number: 103, name: 'العصر', arabicName: 'العصر', fullNameArabic: 'سورة العصر', ayahsCount: 3, ayas: 3, juz: 30, startPage: 601, endPage: 601 },
  { number: 104, name: 'الهمزة', arabicName: 'الهمزة', fullNameArabic: 'سورة الهمزة', ayahsCount: 9, ayas: 9, juz: 30, startPage: 601, endPage: 601 },
  { number: 105, name: 'الفيل', arabicName: 'الفيل', fullNameArabic: 'سورة الفيل', ayahsCount: 5, ayas: 5, juz: 30, startPage: 601, endPage: 601 },
  { number: 106, name: 'قريش', arabicName: 'قريش', fullNameArabic: 'سورة قريش', ayahsCount: 4, ayas: 4, juz: 30, startPage: 602, endPage: 602 },
  { number: 107, name: 'الماعون', arabicName: 'الماعون', fullNameArabic: 'سورة الماعون', ayahsCount: 7, ayas: 7, juz: 30, startPage: 602, endPage: 602 },
  { number: 108, name: 'الكوثر', arabicName: 'الكوثر', fullNameArabic: 'سورة الكوثر', ayahsCount: 3, ayas: 3, juz: 30, startPage: 602, endPage: 602 },
  { number: 109, name: 'الكافرون', arabicName: 'الكافرون', fullNameArabic: 'سورة الكافرون', ayahsCount: 6, ayas: 6, juz: 30, startPage: 603, endPage: 603 },
  { number: 110, name: 'النصر', arabicName: 'النصر', fullNameArabic: 'سورة النصر', ayahsCount: 3, ayas: 3, juz: 30, startPage: 603, endPage: 603 },
  { number: 111, name: 'المسد', arabicName: 'المسد', fullNameArabic: 'سورة المسد', ayahsCount: 5, ayas: 5, juz: 30, startPage: 603, endPage: 603 },
  { number: 112, name: 'الإخلاص', arabicName: 'الإخلاص', fullNameArabic: 'سورة الإخلاص', ayahsCount: 4, ayas: 4, juz: 30, startPage: 604, endPage: 604 },
  { number: 113, name: 'الفلق', arabicName: 'الفلق', fullNameArabic: 'سورة الفلق', ayahsCount: 5, ayas: 5, juz: 30, startPage: 604, endPage: 604 },
  { number: 114, name: 'الناس', arabicName: 'الناس', fullNameArabic: 'سورة الناس', ayahsCount: 6, ayas: 6, juz: 30, startPage: 604, endPage: 604 },
];

/**
 * Normalizes Arabic text for flexible matching (removes tashkeel, standardizes hamza, alef, teh marbuta)
 */
export function normalizeSurahSearchText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^سورة\s+/, '')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Finds a Surah's canonical metadata by number or name
 */
export function findSurahMetadata(identifier: string | number | undefined | null): QuranSurahEntry | undefined {
  if (identifier === undefined || identifier === null || identifier === '') {
    return undefined;
  }

  if (typeof identifier === 'number') {
    return ALL_114_SURAHS.find((s) => s.number === identifier);
  }

  const num = parseInt(String(identifier), 10);
  if (!isNaN(num) && num >= 1 && num <= 114) {
    const byNum = ALL_114_SURAHS.find((s) => s.number === num);
    if (byNum) return byNum;
  }

  const cleanInput = normalizeSurahSearchText(String(identifier));
  if (!cleanInput) return undefined;

  // Exact match first
  const exact = ALL_114_SURAHS.find((s) => normalizeSurahSearchText(s.name) === cleanInput);
  if (exact) return exact;

  // Prefix / contains match
  return ALL_114_SURAHS.find((s) => {
    const sClean = normalizeSurahSearchText(s.name);
    return sClean.includes(cleanInput) || cleanInput.includes(sClean);
  });
}

/**
 * Returns the clean Arabic name of a Surah given its number or identifier
 */
export function getSurahArabicName(identifier: string | number | undefined | null): string {
  const meta = findSurahMetadata(identifier);
  return meta ? meta.arabicName || meta.name : '';
}

/**
 * Returns exact Ayahs count for a Surah (defaulting safely to 7 if unknown)
 */
export function getSurahAyahsCount(identifier: string | number | undefined | null): number {
  const meta = findSurahMetadata(identifier);
  return meta?.ayahsCount || meta?.ayas || 7;
}

/**
 * Returns an array of Ayah numbers [1, 2, ..., N] for a given Surah
 */
export function getAyahOptions(identifier: string | number | undefined | null): number[] {
  const count = getSurahAyahsCount(identifier);
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Clamps an Ayah number to be within [1, totalAyahs] of the specified Surah
 */
export function clampAyahNumber(identifier: string | number | undefined | null, ayah: number): number {
  const count = getSurahAyahsCount(identifier);
  if (!ayah || isNaN(ayah) || ayah < 1) return 1;
  if (ayah > count) return count;
  return ayah;
}

/**
 * Formats a clean Quranic position or range label in Arabic
 */
export function formatQuranPositionLabel(surahName: string, ayahNumber?: number): string {
  if (!surahName) return '—';
  const cleanSurah = surahName.replace(/^سورة\s+/, '');
  if (ayahNumber !== undefined && ayahNumber !== null && ayahNumber > 0) {
    return `سورة ${cleanSurah} (آية ${ayahNumber})`;
  }
  return `سورة ${cleanSurah}`;
}

export function formatQuranRangeLabel(
  fromSurah: string,
  fromAyah: number | undefined,
  toSurah: string,
  toAyah: number | undefined
): string {
  const fromClean = fromSurah ? fromSurah.replace(/^سورة\s+/, '') : '';
  const toClean = toSurah ? toSurah.replace(/^سورة\s+/, '') : '';

  if (fromClean === toClean) {
    if (fromAyah && toAyah && fromAyah !== toAyah) {
      return `سورة ${fromClean} (الآيات ${fromAyah} - ${toAyah})`;
    }
    if (fromAyah) {
      return `سورة ${fromClean} (آية ${fromAyah})`;
    }
    return `سورة ${fromClean}`;
  }

  const fromPart = fromAyah ? `${fromClean} (${fromAyah})` : fromClean;
  const toPart = toAyah ? `${toClean} (${toAyah})` : toClean;
  return `من سورة ${fromPart} إلى سورة ${toPart}`;
}

/**
 * Canonical 114 Surahs ordered in Backward Direction (المسار التنازلي التأسيسي المحكم):
 * Starting with Al-Fatihah (1) at the top, followed by An-Nas (114) down to Al-Baqarah (2).
 * Sequence: [1. الفاتحة, 114. الناس, 113. الفلق, ..., 3. آل عمران, 2. البقرة]
 */
export const BACKWARD_114_SURAHS: QuranSurahEntry[] = [
  ALL_114_SURAHS[0], // سورة الفاتحة (1) أولاً
  ...ALL_114_SURAHS.slice(1).reverse(), // من الناس (114) حتى البقرة (2)
];

/**
 * Returns the list of 114 Surahs according to pedagogical direction:
 * - 'forward': 1 (الفاتحة) -> 2 (البقرة) -> ... -> 114 (الناس)
 * - 'backward': 1 (الفاتحة) -> 114 (الناس) -> 113 (الفلق) -> ... -> 2 (البقرة)
 */
export function getSurahsByDirection(direction: 'forward' | 'backward' = 'backward'): QuranSurahEntry[] {
  return direction === 'forward' ? ALL_114_SURAHS : BACKWARD_114_SURAHS;
}

/**
 * Returns the 0-based sequence rank/index (0 to 113) of a Surah in the chosen direction.
 */
export function getSurahSequenceIndex(
  identifier: string | number | undefined | null,
  direction: 'forward' | 'backward' = 'backward'
): number {
  const meta = findSurahMetadata(identifier);
  if (!meta) return 0;
  const list = getSurahsByDirection(direction);
  const idx = list.findIndex((s) => s.number === meta.number);
  return idx !== -1 ? idx : 0;
}

/**
 * Returns an ordered array of Surahs between startSurah and endSurah based on direction.
 */
export function getSurahsInRangeByDirection(
  startIdentifier: string | number,
  endIdentifier: string | number,
  direction: 'forward' | 'backward' = 'backward'
): QuranSurahEntry[] {
  const list = getSurahsByDirection(direction);
  const startMeta = findSurahMetadata(startIdentifier);
  const endMeta = findSurahMetadata(endIdentifier);

  if (!startMeta || !endMeta) return list;

  const startIdx = list.findIndex((s) => s.number === startMeta.number);
  const endIdx = list.findIndex((s) => s.number === endMeta.number);

  if (startIdx === -1 || endIdx === -1) return list;

  if (startIdx <= endIdx) {
    return list.slice(startIdx, endIdx + 1);
  } else {
    return list.slice(endIdx, startIdx + 1).reverse();
  }
}
