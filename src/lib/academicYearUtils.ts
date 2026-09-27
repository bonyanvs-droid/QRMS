import { AcademicYearConfig, AcademicTerm, OfficialHoliday } from '../types';

/**
 * Generates the standard default 3 terms for Saudi Quranic centers & schools.
 */
export function generateDefaultAcademicTerms(): AcademicTerm[] {
  return [
    {
      id: 'term_1',
      termNumber: 1,
      name: 'الفصل الدراسي الأول',
      isCurrent: true,
      isArchived: false,
      startDate: '2026-08-16',
      endDate: '2026-11-12',
      operationalStartWeek: 3,
      operationalEndWeek: 14,
      totalWeeks: 12,
      currentWeek: 6,
      manualWeekOverride: false,
      spellingPassingThreshold: 85,
      officialHolidays: [
        {
          id: 'hol_national_day_t1',
          name: 'إجازة اليوم الوطني السعودي 🇸🇦',
          startDate: '2026-09-22',
          endDate: '2026-09-23',
        },
        {
          id: 'hol_extended_1_t1',
          name: 'إجازة نهاية أسبوع مطولة (1)',
          startDate: '2026-10-15',
          endDate: '2026-10-18',
        },
      ],
      gradeTargets: {
        tamheedi: { minSurah: 'الفيل', label: 'المخرج القرآني للتمهيدي: من الناس إلى الفيل' },
        grade1: { minSurah: 'الضحى', label: 'المخرج القرآني للصف الأول: من الناس إلى الضحى' },
        grade2: { minSurah: 'الغاشية', label: 'المخرج القرآني للصف الثاني: من الناس إلى الغاشية' },
        baraem: { minSurah: 'الغاشية', label: 'مرحلة البراعم: إتقان حتى سورة الغاشية' },
        ashbal: { minSurah: 'الملك', label: 'مرحلة الأشبال: ترتيل حتى سورة الملك' },
        fityan: { minSurah: 'الكهف', label: 'مرحلة الفتيان: حفظ حتى سورة الكهف' },
        motawassit: { minSurah: 'يس', label: 'مرحلة المتوسطة: حفظ حتى سورة يس' },
        thanawi: { minSurah: 'البقرة', label: 'مرحلة الثانوية: ضبط وتثبيت سورة البقرة' },
        jamiyeen: { minSurah: 'الناس', label: 'مرحلة الجامعيين: مراجعة وإتقان تراكمي' },
      },
      outcomeText: 'تأسيس الهجاء القرآني المطور وحفظ المفصل من الناس إلى الغاشية والآداب النبوية.',
      notes: 'الفصل الافتتاحي للعام الأكاديمي، التركيز على تشخيص الطلاب وتوزيع الحلقات وبناء المسار التعليمي.',
    },
    {
      id: 'term_2',
      termNumber: 2,
      name: 'الفصل الدراسي الثاني',
      isCurrent: false,
      isArchived: false,
      startDate: '2026-11-22',
      endDate: '2027-02-18',
      operationalStartWeek: 3,
      operationalEndWeek: 14,
      totalWeeks: 12,
      currentWeek: 3,
      manualWeekOverride: false,
      spellingPassingThreshold: 85,
      officialHolidays: [
        {
          id: 'hol_extended_t2_1',
          name: 'إجازة نهاية أسبوع مطولة',
          startDate: '2026-12-17',
          endDate: '2026-12-20',
        },
        {
          id: 'hol_founding_day_t2',
          name: 'إجازة يوم التأسيس السعودي 🇸🇦',
          startDate: '2027-02-21',
          endDate: '2027-02-22',
        },
      ],
      gradeTargets: {
        tamheedi: { minSurah: 'الهمزة', label: 'المخرج القرآني للتمهيدي: من الناس إلى الهمزة' },
        grade1: { minSurah: 'الشمس', label: 'المخرج القرآني للصف الأول: من الناس إلى الشمس' },
        grade2: { minSurah: 'الطارق', label: 'المخرج القرآني للصف الثاني: من الناس إلى الطارق' },
        baraem: { minSurah: 'الطارق', label: 'مرحلة البراعم: حتى سورة الطارق' },
        ashbal: { minSurah: 'التحريم', label: 'مرحلة الأشبال: ترتيل حتى سورة التحريم' },
        fityan: { minSurah: 'الإسراء', label: 'مرحلة الفتيان: حفظ حتى سورة الإسراء' },
        motawassit: { minSurah: 'النور', label: 'مرحلة المتوسطة: حفظ حتى سورة النور' },
        thanawi: { minSurah: 'آل عمران', label: 'مرحلة الثانوية: ضبط وتثبيت سورة آل عمران' },
        jamiyeen: { minSurah: 'الناس', label: 'مرحلة الجامعيين: مسار الأجزاء والإجازة' },
      },
      outcomeText: 'تعميق تمكين التلاوة وضبط مخارج الحروف وحفظ جزء عم كاملاً والتجويد العملي.',
      notes: 'فصل التمكين وترسيخ المحفوظات السابقة وتأهيل الطلاب للمسابقات القرآنية.',
    },
    {
      id: 'term_3',
      termNumber: 3,
      name: 'الفصل الدراسي الثالث',
      isCurrent: false,
      isArchived: false,
      startDate: '2027-02-28',
      endDate: '2027-06-03',
      operationalStartWeek: 3,
      operationalEndWeek: 14,
      totalWeeks: 12,
      currentWeek: 3,
      manualWeekOverride: false,
      spellingPassingThreshold: 85,
      officialHolidays: [
        {
          id: 'hol_eid_fitr_t3',
          name: 'إجازة عيد الفطر المبارك 🌙',
          startDate: '2027-03-24',
          endDate: '2027-04-06',
        },
        {
          id: 'hol_extended_t3',
          name: 'إجازة نهاية أسبوع مطولة',
          startDate: '2027-05-13',
          endDate: '2027-05-16',
        },
      ],
      gradeTargets: {
        tamheedi: { minSurah: 'العصر', label: 'المخرج القرآني للتمهيدي: من الناس إلى العصر' },
        grade1: { minSurah: 'البلد', label: 'المخرج القرآني للصف الأول: من الناس إلى البلد' },
        grade2: { minSurah: 'البروج', label: 'المخرج القرآني للصف الثاني: من الناس إلى البروج' },
        baraem: { minSurah: 'البروج', label: 'مرحلة البراعم: حتى سورة البروج' },
        ashbal: { minSurah: 'الحديد', label: 'مرحلة الأشبال: ترتيل حتى سورة الحديد' },
        fityan: { minSurah: 'يوسف', label: 'مرحلة الفتيان: حفظ حتى سورة يوسف' },
        motawassit: { minSurah: 'الفرقان', label: 'مرحلة المتوسطة: حفظ حتى سورة الفرقان' },
        thanawi: { minSurah: 'النساء', label: 'مرحلة الثانوية: ضبط وتثبيت سورة النساء' },
        jamiyeen: { minSurah: 'الناس', label: 'مرحلة الجامعيين: ختم وتثبيت السند' },
      },
      outcomeText: 'الحفظ التراكمي الشامل، الاختبارات المركزية للمجمع، والتتويج في الحفل الختامي.',
      notes: 'الفصل الختامي للعام الدراسي، الاختبارات السنوية المركزية وإعداد تقارير التخرج والتكريم.',
    },
  ];
}

/**
 * Synchronizes the top-level compatibility properties of AcademicYearConfig
 * with the currently active term.
 */
export function syncAcademicConfigWithActiveTerm(
  config: AcademicYearConfig,
  forcedActiveTermId?: string
): AcademicYearConfig {
  const terms = Array.isArray(config.terms) && config.terms.length > 0
    ? [...config.terms]
    : generateDefaultAcademicTerms();

  const activeTermId = forcedActiveTermId || config.activeTermId || terms.find((t) => t.isCurrent)?.id || terms[0].id;

  // Mark flags accurately
  const updatedTerms = terms.map((t) => ({
    ...t,
    isCurrent: t.id === activeTermId,
  }));

  const activeTerm = updatedTerms.find((t) => t.id === activeTermId) || updatedTerms[0];

  return {
    ...config,
    systemType: config.systemType || 'three_terms',
    activeTermId: activeTerm.id,
    terms: updatedTerms,
    // Top-level mirrors for 100% backward compatibility
    semester: activeTerm.name,
    currentTerm: activeTerm.name,
    startDate: activeTerm.startDate,
    endDate: activeTerm.endDate,
    operationalStartWeek: activeTerm.operationalStartWeek,
    operationalEndWeek: activeTerm.operationalEndWeek,
    totalWeeks: activeTerm.totalWeeks,
    currentWeek: activeTerm.currentWeek,
    manualWeekOverride: activeTerm.manualWeekOverride,
    officialHolidays: activeTerm.officialHolidays || [],
    spellingPassingThreshold: activeTerm.spellingPassingThreshold ?? config.spellingPassingThreshold ?? 85,
    gradeTargets: {
      ...config.gradeTargets,
      ...activeTerm.gradeTargets,
    },
  };
}
