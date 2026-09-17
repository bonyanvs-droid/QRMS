import { BundledQuranProvider } from '../providers/BundledQuranProvider';
import { RangeCalculator } from '../services/rangeCalculator';
import { QuranSyncService } from '../services/syncService';
import { IntegrationConfigManager } from '../config/integrationConfig';

async function runValidation() {
  console.log('====================================================');
  console.log('  QURAN DATA FOUNDATION - COMPREHENSIVE VALIDATION');
  console.log('====================================================\n');

  const provider = new BundledQuranProvider();
  const rangeCalc = new RangeCalculator(provider);
  const syncService = new QuranSyncService(provider);
  const integrationManager = new IntegrationConfigManager('development');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failedTests++;
    }
  }

  // 1. Surahs Validation
  console.log('\n--- 1. فحص السور (114 سورة) ---');
  const surahs = await provider.getSurahs();
  assert(surahs.length === 114, 'عدد السور يساوي 114 بدقة', `العدد المسترجع: ${surahs.length}`);
  assert(surahs[0].surahNumber === 1 && surahs[0].arabicName === 'الفاتحة', 'السورة الأولى هي الفاتحة');
  assert(surahs[113].surahNumber === 114 && surahs[113].arabicName === 'الناس', 'السورة 114 هي الناس');

  let surahsOrdered = true;
  for (let i = 0; i < surahs.length; i++) {
    if (surahs[i].surahNumber !== i + 1) {
      surahsOrdered = false;
      break;
    }
  }
  assert(surahsOrdered, 'تسلسل أرقام السور تصاعدي تام من 1 إلى 114');

  // 2. Ayahs Total and Continuity
  console.log('\n--- 2. فحص الآيات والتسلسل والشمول (6236 آية) ---');
  let totalCalculatedAyahs = 0;
  for (const s of surahs) totalCalculatedAyahs += s.ayahCount;
  assert(totalCalculatedAyahs === 6236, 'مجموع آيات سور القرآن يساوي 6236 آية بدقة');

  const integrity = await syncService.verifyIntegrity();
  assert(integrity.isHealthy, 'تقرير السلامة الهيكلية للقرآن (Integrity Report) مكتمل وسليم 100%');
  assert(integrity.indexContinuityValid, 'تسلسل المؤشر العام (Global Index) متصل من 1 إلى 6236 بدون فجوات أو تكرار');
  assert(integrity.pagesCount === 604, 'عدد صفحات مصحف المدينة يساوي 604 صفحات بدقة');

  // 3. Boundary Cases Verification
  console.log('\n--- 3. فحص نقاط الحدود المعتمدة (Boundary Cases) ---');
  // Al-Fatihah
  const f1 = await provider.getAyah(1, 1);
  const f7 = await provider.getAyah(1, 7);
  assert(!!f1 && f1.globalIndex === 1 && f1.pageNumber === 1, 'الفاتحة 1: المؤشر العام 1، الصفحة 1');
  assert(!!f7 && f7.globalIndex === 7 && f7.pageNumber === 1, 'الفاتحة 7: المؤشر العام 7، الصفحة 1');

  // An-Nas
  const n1 = await provider.getAyah(114, 1);
  const n6 = await provider.getAyah(114, 6);
  assert(!!n1 && n1.globalIndex === 6231 && n1.pageNumber === 604, 'الناس 1: المؤشر العام 6231، الصفحة 604');
  assert(!!n6 && n6.globalIndex === 6236 && n6.pageNumber === 604, 'الناس 6: المؤشر العام 6236، الصفحة 604');

  // Al-Fil
  const fil1 = await provider.getAyah(105, 1);
  const fil5 = await provider.getAyah(105, 5);
  assert(!!fil1 && fil1.globalIndex === 6189 && fil1.pageNumber === 601, 'الفيل 1: المؤشر العام 6189، الصفحة 601');
  assert(!!fil5 && fil5.globalIndex === 6193 && fil5.pageNumber === 601, 'الفيل 5: المؤشر العام 6193، الصفحة 601');

  // Ad-Duha
  const duha1 = await provider.getAyah(93, 1);
  const duha11 = await provider.getAyah(93, 11);
  assert(!!duha1 && duha1.globalIndex === 6080 && duha1.pageNumber === 596, 'الضحى 1: المؤشر العام 6080، الصفحة 596');
  assert(!!duha11 && duha11.globalIndex === 6090 && duha11.pageNumber === 596, 'الضحى 11: المؤشر العام 6090، الصفحة 596');

  // Al-Ghashiyah
  const ghash1 = await provider.getAyah(88, 1);
  const ghash26 = await provider.getAyah(88, 26);
  assert(!!ghash1 && ghash1.globalIndex === 5968 && ghash1.pageNumber === 592, 'الغاشية 1: المؤشر العام 5968، الصفحة 592');
  assert(!!ghash26 && ghash26.globalIndex === 5993 && ghash26.pageNumber === 592, 'الغاشية 26: المؤشر العام 5993، الصفحة 592');

  // Al-Ahqaf
  const ahqaf1 = await provider.getAyah(46, 1);
  const ahqaf35 = await provider.getAyah(46, 35);
  assert(!!ahqaf1 && ahqaf1.globalIndex === 4511 && ahqaf1.pageNumber === 502, 'الأحقاف 1: المؤشر العام 4511، الصفحة 502');
  assert(!!ahqaf35 && ahqaf35.globalIndex === 4545 && ahqaf35.pageNumber === 506, 'الأحقاف 35: المؤشر العام 4545، الصفحة 506');

  // 4. Cross-Surah Transitions and Range Metrics
  console.log('\n--- 4. اختبارات الانتقال وحساب النطاقات متعددة السور ---');

  // Case A: Al-Fil 1 to An-Nas 6 (Forward)
  const rangeFilToNas = await rangeCalc.getMetrics(
    { surahNumber: 105, ayahNumber: 1 },
    { surahNumber: 114, ayahNumber: 6 }
  );
  assert(
    rangeFilToNas.ayahCount === 48,
    'حساب النطاق من الفيل 1 إلى الناس 6: 48 آية',
    `المحسوب: ${rangeFilToNas.ayahCount}`
  );
  assert(
    rangeFilToNas.surahsInvolved.length === 10,
    'عدد السور المشمولة بين الفيل والناس: 10 سور'
  );
  assert(
    rangeFilToNas.startPage === 601 && rangeFilToNas.endPage === 604,
    'الصفحات بين الفيل والناس: من 601 إلى 604'
  );

  // Case B: An-Nas 1 to Al-Fil 5 (Reverse direction for memorization)
  const rangeNasToFilReverse = await rangeCalc.getMetrics(
    { surahNumber: 114, ayahNumber: 1 },
    { surahNumber: 105, ayahNumber: 5 }
  );
  assert(
    rangeNasToFilReverse.direction === 'reverse',
    'التعرف على اتجاه الحفظ العكسي (من الناس صعودًا إلى الفيل)'
  );
  assert(
    rangeNasToFilReverse.ayahCount === 39,
    'حساب الآيات بين الناس 1 والفيل 5: 39 آية (المؤشر 6231 إلى 6193)',
    `المحسوب: ${rangeNasToFilReverse.ayahCount}`
  );

  // Full Surahs reverse: An-Nas 6 to Al-Fil 1
  const rangeNasToFilFull = await rangeCalc.getMetrics(
    { surahNumber: 114, ayahNumber: 6 },
    { surahNumber: 105, ayahNumber: 1 }
  );
  assert(
    rangeNasToFilFull.ayahCount === 48,
    'حساب النطاق الكامل من الناس 6 إلى الفيل 1: 48 آية',
    `المحسوب: ${rangeNasToFilFull.ayahCount}`
  );

  // Case C: Ash-Sharh 1 to Ad-Duha 11
  const rangeSharhToDuha = await rangeCalc.getMetrics(
    { surahNumber: 94, ayahNumber: 1 },
    { surahNumber: 93, ayahNumber: 11 }
  );
  assert(
    rangeSharhToDuha.ayahCount === 2,
    'حساب الآيات بين الشرح 1 والضحى 11: آيتان متجاورتان مباشرة على حد السورة',
    `المحسوب: ${rangeSharhToDuha.ayahCount}`
  );

  // Case D: An-Nas 1 to Al-Ahqaf 35 (Spans many Juzs)
  const rangeNasToAhqaf = await rangeCalc.getMetrics(
    { surahNumber: 114, ayahNumber: 1 },
    { surahNumber: 46, ayahNumber: 35 }
  );
  assert(
    rangeNasToAhqaf.ayahCount === 1687,
    'حساب النطاق من الناس 1 إلى الأحقاف 35: 1687 آية',
    `المحسوب: ${rangeNasToAhqaf.ayahCount}`
  );
  assert(
    rangeNasToAhqaf.startPage === 506 && rangeNasToAhqaf.endPage === 604,
    'النطاق يمتد من الصفحة 506 إلى 604 (99 صفحة كاملة)'
  );

  // 5. Page and Juz Transitions
  console.log('\n--- 5. اختبارات الانتقال بين الصفحات والأجزاء ---');
  const page1 = await provider.getPage(1);
  const page2 = await provider.getPage(2);
  assert(page1.length === 7, 'الصفحة 1 تحتوي سورة الفاتحة كاملة (7 آيات)');
  assert(page2.length === 5 && page2[0].surahNumber === 2 && page2[0].ayahNumber === 1, 'الصفحة 2 تبدأ بسورة البقرة 1');

  const juz29 = await provider.getJuz(29);
  const juz30 = await provider.getJuz(30);
  assert(juz29.length === 431, 'الجزء 29 يحتوي 431 آية');
  assert(juz30.length === 564, 'الجزء 30 (عم) يحتوي 564 آية');

  // 6. Planning Units Partitioning
  console.log('\n--- 6. اختبارات تقسيم وحدات التخطيط (Planning Units) ---');
  const pageUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 105, ayahNumber: 1 },
    { surahNumber: 114, ayahNumber: 6 },
    'page'
  );
  assert(pageUnits.length === 4, 'تقسيم نطاق الفيل-الناس بوحدة (Page) يعطي 4 وحدات صفحات (601، 602، 603، 604)');

  const halfPageUnits = await rangeCalc.partitionRangeIntoUnits(
    { surahNumber: 103, ayahNumber: 1 },
    { surahNumber: 105, ayahNumber: 5 },
    'half_page'
  );
  assert(halfPageUnits.length === 2, 'تقسيم الصفحة 601 بوحدة (Half-Page) يفرز نصفي الصفحة الأول والثاني بدقة (2 وحدات)');

  // 7. Integration & Connection Test
  console.log('\n--- 7. اختبار الاتصال وإدارة التكاملات ---');
  const connTest = await integrationManager.testConnection('bundled');
  assert(connTest.success, 'نجاح اختبار الاتصال بالمزود المحلي المدمج (Bundled Provider)');
  assert(connTest.latencyMs < 50, `سرعة استجابة المزود المحلي: ${connTest.latencyMs}ms`);

  console.log('\n====================================================');
  console.log(`  نتائج الاختبارات: ${passedTests} ناجح / ${failedTests} فاشل`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
