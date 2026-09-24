import {
  TrackDefinition,
  DailySessionRecord,
  Halaqah,
  User,
  SupervisorScope,
  TrackNomination,
} from '../types';

// -------------------------------------------------------------
// DEFAULT BUILT-IN TRACK PROVIDERS (100% Core Preserved)
// -------------------------------------------------------------
export const BUILT_IN_TRACKS: TrackDefinition[] = [
  {
    id: 'track_quran',
    code: 'QURAN',
    name: 'مسار القرآن الكريم (الحفظ والمراجعة)',
    shortName: 'القرآن الكريم',
    description: 'حفظ كتاب الله ومراجعته القريبة والبعيدة مع محرك الجدولة القرآني الذكي والحصص اليومية',
    icon: 'BookOpen',
    colorScheme: 'emerald',
    isActive: true,
    order: 1,
    nominationConfig: {
      requiresInternalExam: true,
      passingScore: 90,
      rubricItems: [
        { id: 'memorization_retention', label: 'جودة الحفظ وعدم التردد أو التعتعة', maxScore: 50 },
        { id: 'tajweed_makhaarij', label: 'أحكام التجويد ومخارج وصفات الحروف', maxScore: 30 },
        { id: 'waqf_voice', label: 'حسن الوقف والابتداء والترتيل والأداء', maxScore: 20 },
      ],
      branchesOrLevels: [
        'جزء عم كاملاً (30)',
        'جزء تبارك كاملاً (29)',
        'الأجزاء الثلاثة الأخيرة (28-30)',
        'خمسة أجزاء متتالية',
        'عشرة أجزاء متتالية',
        'المصحف الشريف كاملاً',
      ],
    },
  },
  {
    id: 'track_spelling',
    code: 'SPELLING',
    name: 'مسار الهجاء القرآني المطور',
    shortName: 'الهجاء القرآني',
    description: 'التأسيس القرآني وتجريد الحروف وضبط الحركات وقواعد التهجي وبنك الدروس التفاعلي',
    icon: 'Sparkles',
    colorScheme: 'amber',
    isActive: true,
    order: 2,
    nominationConfig: {
      requiresInternalExam: true,
      passingScore: 85,
      rubricItems: [
        { id: 'spelling_accuracy', label: 'التهجي الحرفي وضبط الحركات وتجريد الأصوات', maxScore: 50 },
        { id: 'reading_speed', label: 'سرعة القراءة والتمييز بين أشكال ومواضع الحروف', maxScore: 30 },
        { id: 'mushaf_fluency', label: 'الطلاقة وحسن التطبيق العملي المباشر من المصحف', maxScore: 20 },
      ],
      branchesOrLevels: [
        'إتمام المستوى الأول: الحروف الهجائية والحركات الثلاث',
        'إتمام المستوى الثاني: المدود الطبيعية والتنوين',
        'إتمام المستوى الثالث: السكون والشدة والتضعيف',
        'إتمام القاعدة النورانية/البغدادية كاملة والتأهل للمصحف',
      ],
    },
  },
  {
    id: 'track_virtues',
    code: 'VIRTUES',
    name: 'مسار القيم والبرنامج التربوي',
    shortName: 'القيم والتربية',
    description: 'غرس القيم والآداب القرآنية الأسبوعية والمشاريع السلوكية وشعارات الأسابيع',
    icon: 'Award',
    colorScheme: 'purple',
    isActive: true,
    order: 3,
    nominationConfig: {
      requiresInternalExam: false,
      passingScore: 80,
      rubricItems: [
        { id: 'virtues_commitment', label: 'الالتزام السلوكي وتمثل خلق القرآن', maxScore: 50 },
        { id: 'weekly_activities', label: 'المشاركة الفاعلة في الأنشطة الأسبوعية المعتمدة', maxScore: 30 },
        { id: 'etiquette_respect', label: 'آداب طالب العلم والتعاون مع الزملاء والمعلم', maxScore: 20 },
      ],
      branchesOrLevels: [
        'وسام التميز السلوكي الفصلي',
        'جائزة سفير الأخلاق القرآنية',
        'إتمام مشروع الآداب الرمضانية',
      ],
    },
  },
  {
    id: 'track_tilawah',
    code: 'TILAWAH',
    name: 'مسار التلاوة والترتيل المتصل',
    shortName: 'التلاوة والترتيل',
    description: 'إتقان التلاوة وضبط الأداء القرآني وأحكام الوقف والابتداء برواية حفص عن عاصم',
    icon: 'BookCheck',
    colorScheme: 'indigo',
    isActive: true,
    order: 4,
    nominationConfig: {
      requiresInternalExam: true,
      passingScore: 85,
      rubricItems: [
        { id: 'tilawah_tajweed', label: 'تطبيق أحكام التجويد العملية', maxScore: 40 },
        { id: 'tilawah_fluency', label: 'الطلاقة وحسن الوقف والابتداء', maxScore: 40 },
        { id: 'tilawah_makhaarij', label: 'ضبط مخارج الحروف وصفاتها', maxScore: 20 },
      ],
      branchesOrLevels: [
        'تلاوة جزء عم كاملاً برواية حفص',
        'تلاوة سورتي البقرة وآل عمران',
        'تلاوة الأجزاء الخمسة الأخيرة (26-30)',
        'تلاوة نصف القرآن الأول (من الفاتحة للكهف)',
        'ختمة تلاوة كاملة مجودة للمصحف',
      ],
    },
  },
];

// -------------------------------------------------------------
// BACKWARD COMPATIBILITY ADAPTER (Legacy Data Adapter)
// -------------------------------------------------------------
export interface StudentTrackActivity {
  hasData: boolean;
  data: any;
  title: string;
  summaryText: string;
}

export function getStudentTrackActivity(
  record: DailySessionRecord | undefined,
  trackId: string
): StudentTrackActivity {
  if (!record) {
    return { hasData: false, data: null, title: '', summaryText: 'لا توجد بيانات' };
  }

  // 1. مسار القرآن الكريم (قراءة من الحقول القديمة 100%)
  if (trackId === 'track_quran') {
    const hasData = !!(record.memorization || record.revision);
    const memText = record.memorization
      ? `حفظ: ${record.memorization.surahFrom || ''} (${record.memorization.ayahFrom || 1}-${record.memorization.ayahTo || 1}) [${record.memorization.score || 0}%]`
      : '';
    const revText = record.revision
      ? `مراجعة ${record.revision.type || ''}: ${record.revision.surahFrom || ''} - ${record.revision.surahTo || ''} [${record.revision.score || 0}%]`
      : '';
    const summary = [memText, revText].filter(Boolean).join(' | ') || 'لم يُرصد';

    return {
      hasData,
      data: {
        memorization: record.memorization,
        revision: record.revision,
      },
      title: 'القرآن الكريم',
      summaryText: summary,
    };
  }

  // 2. مسار الهجاء القرآني (قراءة من حقل الهجاء القديم 100%)
  if (trackId === 'track_spelling') {
    const hasData = !!record.spelling;
    const summary = record.spelling
      ? `درس ${record.spelling.lessonNumber}: ${record.spelling.statusTag} [${record.spelling.finalScore}%]`
      : 'لم يُرصد';

    return {
      hasData,
      data: record.spelling,
      title: 'الهجاء القرآني',
      summaryText: summary,
    };
  }

  // 3. مسارات ديناميكية / مستقبلية (قراءة من customTracks)
  const customData = record.customTracks?.[trackId];
  if (customData) {
    return {
      hasData: true,
      data: customData,
      title: customData.title || 'مسار مخصص',
      summaryText: customData.summaryText || 'تم الرصد',
    };
  }

  return {
    hasData: false,
    data: null,
    title: '',
    summaryText: 'لم يُرصد',
  };
}

/** Platform default subscription — mirrors the `halaqahs.active_track_ids` DB default */
export const DEFAULT_TRACK_IDS = ['track_quran', 'track_spelling', 'track_virtues'];

/**
 * Single source of truth for a halaqah's ACTIVE TRACK subscription.
 * An explicit `activeTrackIds` subscription is honored exactly; when the
 * subscription is absent the platform default set applies (same as the DB
 * column default). Every consumer MUST resolve tracks through here instead
 * of re-implementing its own fallback.
 */
export function getHalaqahActiveTrackIds(
  halaqah: Pick<Halaqah, 'activeTrackIds'> | null | undefined
): string[] {
  if (halaqah?.activeTrackIds && halaqah.activeTrackIds.length > 0) {
    return [...halaqah.activeTrackIds];
  }
  return [...DEFAULT_TRACK_IDS];
}

// -------------------------------------------------------------
// HELPER: Get active tracks for a Halaqah
// -------------------------------------------------------------
export function getHalaqahActiveTracks(
  halaqah: Halaqah | undefined,
  allTracks: TrackDefinition[] = BUILT_IN_TRACKS
): TrackDefinition[] {
  if (!halaqah) return allTracks;

  const ids = getHalaqahActiveTrackIds(halaqah);
  const filtered = allTracks.filter((t) => ids.includes(t.id));
  if (filtered.length > 0) return filtered;

  // Fallback: إذا لم تطابق الاشتراكات أي مسار معروف، المسارات الافتراضية الأساسية
  return allTracks.filter((t) => DEFAULT_TRACK_IDS.includes(t.id));
}

// -------------------------------------------------------------
// HELPER: Scope RBAC Data Filter
// -------------------------------------------------------------
export function filterAccessibleTracksForUser(
  user: User | null | undefined,
  allTracks: TrackDefinition[] = BUILT_IN_TRACKS
): TrackDefinition[] {
  if (!user) return allTracks;

  // المدراء والمشرف العام يرون كافة المسارات
  if (user.role === 'system_admin' || user.role === 'campus_admin' || user.role === 'admin') {
    return allTracks;
  }

  // المشرف حسب نطاق تخصصه (SupervisorScope)
  if (user.role === 'supervisor') {
    const scope = user.supervisorScope;
    if (!scope || scope.type === 'general_supervisor') {
      return allTracks;
    }

    if (scope.type === 'quran_supervisor') {
      return allTracks.filter((t) => t.id === 'track_quran');
    }

    if (scope.type === 'spelling_supervisor') {
      return allTracks.filter((t) => t.id === 'track_spelling');
    }

    if (scope.type === 'educational_supervisor') {
      return allTracks.filter((t) => t.id === 'track_virtues');
    }

    if (scope.trackIds && scope.trackIds.length > 0) {
      return allTracks.filter((t) => scope.trackIds!.includes(t.id));
    }
  }

  return allTracks;
}

// -------------------------------------------------------------
// HELPER: Filter Nominations for Supervisor Scope
// -------------------------------------------------------------
export function filterNominationsForSupervisor(
  nominations: TrackNomination[],
  scope?: SupervisorScope | null
): TrackNomination[] {
  if (!scope || scope.type === 'general_supervisor') {
    return nominations;
  }

  return nominations.filter((n) => {
    // Check Track ID constraint
    if (scope.type === 'quran_supervisor') {
      if (n.trackId && n.trackId !== 'track_quran') return false;
    } else if (scope.type === 'spelling_supervisor') {
      if (n.trackId !== 'track_spelling') return false;
    } else if (scope.type === 'educational_supervisor') {
      if (n.trackId !== 'track_virtues') return false;
    } else if (scope.trackIds && scope.trackIds.length > 0) {
      if (!scope.trackIds.includes(n.trackId)) return false;
    }

    // Check Halaqah constraint
    if (scope.halaqahIds && scope.halaqahIds.length > 0) {
      if (!scope.halaqahIds.includes(n.halaqahId)) return false;
    }

    return true;
  });
}

// -------------------------------------------------------------
// HELPER: Filter Halaqahs for Supervisor Scope
// -------------------------------------------------------------
export function filterHalaqahsForSupervisor(
  halaqahs: Halaqah[],
  scope?: SupervisorScope | null
): Halaqah[] {
  if (!scope || scope.type === 'general_supervisor') {
    return halaqahs;
  }

  return halaqahs.filter((h) => {
    // Specific halaqahs
    if (scope.halaqahIds && scope.halaqahIds.length > 0) {
      if (!scope.halaqahIds.includes(h.id)) return false;
    }

    // Specific stage
    if (scope.stageIds && scope.stageIds.length > 0) {
      if (h.stageId && !scope.stageIds.includes(h.stageId)) return false;
    }

    return true;
  });
}

// -------------------------------------------------------------
// SUPERVISOR ROLES LABELS & DESCRIPTIONS
// -------------------------------------------------------------
export const SUPERVISOR_ROLES_CONFIG: {
  type: SupervisorScope['type'];
  label: string;
  badgeColor: string;
  description: string;
  defaultTrackIds: string[];
}[] = [
  {
    type: 'general_supervisor',
    label: 'مشرف عام (شامل لكافة المسارات)',
    badgeColor: 'blue',
    description: 'صلاحية إشرافية كاملة ومتابعة جميع الحلقات والمسارات والترشيحات',
    defaultTrackIds: ['track_quran', 'track_spelling', 'track_virtues', 'track_tilawah'],
  },
  {
    type: 'quran_supervisor',
    label: 'مشرف المسار القرآني',
    badgeColor: 'emerald',
    description: 'متابعة خطط الحفظ والمراجعة، إسناد مختبري القرآن، واعتماد ترشيحات الجمعية',
    defaultTrackIds: ['track_quran'],
  },
  {
    type: 'spelling_supervisor',
    label: 'مشرف الهجاء القرآني والتأسيس',
    badgeColor: 'amber',
    description: 'متابعة بنك دروس الهجاء، مستويات التأسيس، واختبارات إتقان القراءة والتهجي',
    defaultTrackIds: ['track_spelling'],
  },
  {
    type: 'educational_supervisor',
    label: 'المشرف التربوي والقيمي',
    badgeColor: 'purple',
    description: 'متابعة تنفيذ الخطة القيمية والأنشطة الأسبوعية وميزانياتها وشعاراتها',
    defaultTrackIds: ['track_virtues'],
  },
  {
    type: 'stage_supervisor',
    label: 'مشرف مرحلة تعليمية',
    badgeColor: 'indigo',
    description: 'الإشراف على مرحلة محددة (مثل مرحلة البراعم أو الأشبال) بكافة مساراتها',
    defaultTrackIds: ['track_quran', 'track_spelling', 'track_virtues'],
  },
  {
    type: 'admissions_supervisor',
    label: 'مشرف القبول والتسجيل',
    badgeColor: 'rose',
    description: 'إدارة طلبات التسجيل الإلكترونية، جدولة المقابلات وتحديد المستوى، وتسكين الطلاب',
    defaultTrackIds: [],
  },
  {
    type: 'finance_supervisor',
    label: 'مشرف الشؤون المالية والرسوم',
    badgeColor: 'emerald',
    description: 'متابعة الرسوم الدراسية وسندات التحصيل، الاشتراكات الفصلية والإعفاءات المالية للطلاب',
    defaultTrackIds: [],
  },
];
