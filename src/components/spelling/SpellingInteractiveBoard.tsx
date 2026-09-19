import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle2,
  Award,
  Info,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Save,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { safeStorage } from '../../lib/safeStorage';

export interface OrthographyItem {
  id?: string;
  letterOrWord: string;
  phoneticTitle: string;
  spellingMethod: string;
  quranicExample: string;
  surahRef: string;
  tajweedRule: string;
  color: string;
}

export interface OrthographyCategory {
  id: string;
  title: string;
  description: string;
  badge: string;
  items: OrthographyItem[];
}

const DEFAULT_ORTHOGRAPHY_CATEGORIES: OrthographyCategory[] = [
  {
    id: 'single_letters',
    title: 'الحروف الهجائية المفردة',
    description: 'نطق الحروف العربية بأسمائها الفصيحة مع مراعاة مخارج الحروف وصفات التفخيم والترقيق',
    badge: 'الدرس 1',
    items: [
      { id: 'item_1_1', letterOrWord: 'أ', phoneticTitle: 'أَلِف', spellingMethod: 'همزة فتحة (أَ) أو ألف مجردة', quranicExample: 'أَنْعَمْتَ', surahRef: 'الفاتحة: 7', tajweedRule: 'حرف مرقق مستفل', color: 'emerald' },
      { id: 'item_1_2', letterOrWord: 'ب', phoneticTitle: 'بَاء', spellingMethod: 'باء مرققة من الشفتين', quranicExample: 'بِسْمِ اللَّهِ', surahRef: 'الفاتحة: 1', tajweedRule: 'حرف شفوي شديد مرقق', color: 'emerald' },
      { id: 'item_1_3', letterOrWord: 'ت', phoneticTitle: 'تَاء', spellingMethod: 'تاء من طرف اللسان مع أصول الثنايا', quranicExample: 'تَبَّتْ', surahRef: 'المسد: 1', tajweedRule: 'حرف مرقق مهموس', color: 'emerald' },
      { id: 'item_1_4', letterOrWord: 'ث', phoneticTitle: 'ثَاء', spellingMethod: 'ثاء لثوية من طرف اللسان مع أطراف الثنايا', quranicExample: 'ثُمَّ', surahRef: 'التكاثر: 3', tajweedRule: 'حرف لثوي رخو مرقق', color: 'emerald' },
      { id: 'item_1_5', letterOrWord: 'ج', phoneticTitle: 'جِيم', spellingMethod: 'جيم شديدة من وسط اللسان', quranicExample: 'جَنَّاتٍ', surahRef: 'البروج: 11', tajweedRule: 'حرف شديد مجهور مرقق', color: 'emerald' },
      { id: 'item_1_6', letterOrWord: 'ح', phoneticTitle: 'حَاء', spellingMethod: 'حاء حلقية من وسط الحلق', quranicExample: 'الْحَمْدُ', surahRef: 'الفاتحة: 2', tajweedRule: 'حرف حلقي مهموس مرقق', color: 'emerald' },
      { id: 'item_1_7', letterOrWord: 'خ', phoneticTitle: 'خَاء', spellingMethod: 'خاء مفخمة من أدنى الحلق', quranicExample: 'خَلَقَ', surahRef: 'العلق: 1', tajweedRule: 'حرف استعلاء مفخم دائماً', color: 'amber' },
      { id: 'item_1_8', letterOrWord: 'د', phoneticTitle: 'دَال', spellingMethod: 'دال شديدة من طرف اللسان', quranicExample: 'الدِّينِ', surahRef: 'الفاتحة: 4', tajweedRule: 'حرف شديد مجهور مقلقل عند السكون', color: 'emerald' },
      { id: 'item_1_9', letterOrWord: 'ر', phoneticTitle: 'رَاء', spellingMethod: 'راء مع تكرير خفيف', quranicExample: 'الرَّحْمَٰنِ', surahRef: 'الفاتحة: 1', tajweedRule: 'يفخم بالفتح والضم ويرقق بالكسر', color: 'blue' },
      { id: 'item_1_10', letterOrWord: 'ص', phoneticTitle: 'صَاد', spellingMethod: 'صاد مفخمة مطبقة من حروف الصفير', quranicExample: 'صِرَاطَ', surahRef: 'الفاتحة: 6', tajweedRule: 'حرف استعلاء وإطباق مفخم', color: 'amber' },
      { id: 'item_1_11', letterOrWord: 'ض', phoneticTitle: 'ضَاد', spellingMethod: 'ضاد من إحدى حافتي اللسان', quranicExample: 'الضَّالِّينَ', surahRef: 'الفاتحة: 7', tajweedRule: 'حرف استطالة وإطباق مفخم', color: 'amber' },
      { id: 'item_1_12', letterOrWord: 'ط', phoneticTitle: 'طَاء', spellingMethod: 'أقوى الحروف تفخيماً وإطباقاً', quranicExample: 'طَهَّرَا', surahRef: 'البقرة: 125', tajweedRule: 'حرف استعلاء وإطباق شديد', color: 'amber' },
      { id: 'item_1_13', letterOrWord: 'ق', phoneticTitle: 'قَاف', spellingMethod: 'قاف من أقصى اللسان فوق الكاف', quranicExample: 'قُلْ', surahRef: 'الإخلاص: 1', tajweedRule: 'حرف استعلاء مفخم مقلقل', color: 'amber' },
    ],
  },
  {
    id: 'movements',
    title: 'الحركات الثلاث (الفتح، الكسر، الضم)',
    description: 'تمكين الطالب من وزن زمن الحركة الواحدة بدقة دون تمطيطها لحرف مد أو اختلاسها',
    badge: 'الدروس 3 و 4',
    items: [
      { id: 'item_2_1', letterOrWord: 'كَتَبَ', phoneticTitle: 'كَـ - تَـ - بَ', spellingMethod: 'كاف فتحة (كَ) - تاء فتحة (تَ) -> كَتَ - باء فتحة (بَ) -> كَتَبَ', quranicExample: 'كَتَبَ رَبُّكُمْ', surahRef: 'الأنعام: 54', tajweedRule: 'توالي حركات مفتوحة متساوية في الزمن', color: 'emerald' },
      { id: 'item_2_2', letterOrWord: 'عَمِلَ', phoneticTitle: 'عَـ - مِـ - لَ', spellingMethod: 'عين فتحة (عَ) - ميم كسرة (مِ) -> عَمِ - لام فتحة (لَ) -> عَمِلَ', quranicExample: 'عَمِلَ صَالِحًا', surahRef: 'البقرة: 62', tajweedRule: 'خفض الفك السفلي عند نطق الميم المكسورة', color: 'emerald' },
      { id: 'item_2_3', letterOrWord: 'رُسُلُ', phoneticTitle: 'رُ - سُ - لُ', spellingMethod: 'راء ضمة (رُ) مفخمة - سين ضمة (سُ) - لام ضمة (لُ) -> رُسُلُ', quranicExample: 'رُسُلُ اللَّهِ', surahRef: 'النساء: 171', tajweedRule: 'ضم الشفتين للأمام ضماً محكماً', color: 'blue' },
      { id: 'item_2_4', letterOrWord: 'جُعِلَ', phoneticTitle: 'جُ - عِـ - لَ', spellingMethod: 'جيم ضمة (جُ) - عين كسرة (عِ) -> جُعِ - لام فتحة (لَ) -> جُعِلَ', quranicExample: 'جُعِلَ لَكُمُ', surahRef: 'النحل: 78', tajweedRule: 'الانتقال السلس بين الضم والكسر والفتح', color: 'emerald' },
      { id: 'item_2_5', letterOrWord: 'خُلِقَ', phoneticTitle: 'خُ - لِـ - قَ', spellingMethod: 'خاء ضمة (خُ) مفخمة - لام كسرة (لِ) مرققة - قاف فتحة (قَ) مفخمة', quranicExample: 'خُلِقَ الْإِنسَانُ', surahRef: 'الطارق: 5', tajweedRule: 'تخليص المرقق (لِ) بين مفخمين (خُ، قَ)', color: 'amber' },
    ],
  },
  {
    id: 'tanween',
    title: 'التنوين (فتح، ضم، كسر)',
    description: 'نون ساكنة زائدة تلحق آخر الأسماء لفظاً لا خطاً ووصلاً لا وقفاً',
    badge: 'الدرس 5',
    items: [
      { id: 'item_3_1', letterOrWord: 'أَحَدٌ', phoneticTitle: 'أَ - حَ - دٌ [دُنْ]', spellingMethod: 'همزة فتحة (أَ) - حاء فتحة (حَ) -> أَحَ - دال تنوين ضم (دٌ) -> أَحَدٌ', quranicExample: 'قُلْ هُوَ اللَّهُ أَحَدٌ', surahRef: 'الإخلاص: 1', tajweedRule: 'تنوين ضم وصلاً / قلقلة الدال وقفاً', color: 'emerald' },
      { id: 'item_3_2', letterOrWord: 'غَفُورًا', phoneticTitle: 'غَـ - فُـ - ورًا', spellingMethod: 'غين فتحة (غَ) - فاء واو سكون (فُو) - راء تنوين فتح مع ألف العوض (رًا)', quranicExample: 'وَكَانَ اللَّهُ غَفُورًا رَّحِيمًا', surahRef: 'النساء: 96', tajweedRule: 'مد عوض حركتين عند الوقف (غَفُورَا)', color: 'blue' },
      { id: 'item_3_3', letterOrWord: 'كِتَابٍ', phoneticTitle: 'كِـ - تَـ - ابٍ', spellingMethod: 'كاف كسرة (كِ) - تاء ألف صغيرة (تَا) - باء تنوين كسر (بٍ)', quranicExample: 'فِي كِتَابٍ مَّكْنُونٍ', surahRef: 'الواقعة: 78', tajweedRule: 'كسر الحرف وتنوينه بالنون الساكنة وصلاً', color: 'emerald' },
      { id: 'item_3_4', letterOrWord: 'مَرَضٌ', phoneticTitle: 'مَـ - رَ - ضٌ', spellingMethod: 'ميم فتحة (مَ) - راء فتحة (رَ) مفخمة - ضاد تنوين ضم (ضٌ) مفخمة', quranicExample: 'فِي قُلُوبِهِم مَّرَضٌ', surahRef: 'البقرة: 10', tajweedRule: 'تفخيم الضاد مع التنوين', color: 'amber' },
    ],
  },
  {
    id: 'small_letters_rasm',
    title: 'الألف الخنجرية والرسم العثماني (المدود الصغرى)',
    description: 'علامات الضبط القرآني الخاصة: الألف الخنجرية (ٰ)، والياء الصغيرة (ۦ)، والواو الصغيرة (ۥ)',
    badge: 'الدرس 7',
    items: [
      { id: 'item_4_1', letterOrWord: 'هٰذَا', phoneticTitle: 'هَا - ذَا', spellingMethod: 'هاء ألف صغيرة خنجرية (هَا) - ذال ألف فتحة (ذَا) -> هٰذَا', quranicExample: 'هٰذَا بَيَانٌ لِّلنَّاسِ', surahRef: 'آل عمران: 138', tajweedRule: 'مد طبيعي حركتان ثابت لفظاً محذوف رسماً', color: 'purple' },
      { id: 'item_4_2', letterOrWord: 'إِبْرَاهِيمَ', phoneticTitle: 'إِبْـ - رَا - هِيـ - مَ', spellingMethod: 'همزة كسرة باء سكون مقلقلة (إِبْ) - راء ألف (رَا) - هاء ياء (هِي) - ميم فتحة (مَ)', quranicExample: 'مِلَّةَ أَبِيكُمْ إِبْرَاهِيمَ', surahRef: 'الحج: 78', tajweedRule: 'قلقلة الباء ثم مد حركتين بالألف والياء', color: 'purple' },
      { id: 'item_4_3', letterOrWord: 'دَاوُۥدَ', phoneticTitle: 'دَا - وُو - دَ', spellingMethod: 'دال ألف (دَا) - واو مع واو صغيرة ملحقة (وُو) - دال فتحة (دَ)', quranicExample: 'وَآتَيْنَا دَاوُۥدَ زَبُورًا', surahRef: 'النساء: 163', tajweedRule: 'صلة وواو صغيرة ملحقة تلفظ واواً ممدودة', color: 'purple' },
      { id: 'item_4_4', letterOrWord: 'بِهِۦ', phoneticTitle: 'بِـ - هِي', spellingMethod: 'باء كسرة (بِ) - هاء كسرة مع ياء صغيرة ملحقة (هِي)', quranicExample: 'يُضِلُّ بِهِۦ كَثِيرًا', surahRef: 'البقرة: 26', tajweedRule: 'مد صلة صغرى بمقدار حركتين وصلاً', color: 'purple' },
      { id: 'item_4_5', letterOrWord: 'الرَّحْمَٰنِ', phoneticTitle: 'الـ - رَّحْـ - مَـا - نِ', spellingMethod: 'لام شمسية مدغمة - راء مشددة - حاء سكون - ميم ألف خنجرية (مَا) - نون كسرة', quranicExample: 'الرَّحْمَٰنِ الرَّحِيمِ', surahRef: 'الفاتحة: 3', tajweedRule: 'ألف خنجرية ثابتة لفظاً', color: 'purple' },
    ],
  },
  {
    id: 'madd_leen',
    title: 'حروف المد واللين (ـَا ، ـُو ، ـِي)',
    description: 'أحرف المد الثلاثة الساكنة بعد حركة مجانسة، وحرفا اللين (الواو والياء الساكنتان بعد فتح)',
    badge: 'الدرس 8',
    items: [
      { id: 'item_5_1', letterOrWord: 'قَالَ', phoneticTitle: 'قَا - لَ', spellingMethod: 'قاف ألف مد فتحة (قَا) - لام فتحة (لَ) -> قَالَ', quranicExample: 'قَالَ رَبِّ اغْفِرْ لِي', surahRef: 'ص: 35', tajweedRule: 'مد طبيعي في أعلى مراتب التفخيم (قاف بعدها ألف)', color: 'blue' },
      { id: 'item_5_2', letterOrWord: 'يَقُولُ', phoneticTitle: 'يَـ - قُو - لُ', spellingMethod: 'ياء فتحة (يَ) - قاف واو مد ضمة (قُو) - لام ضمة (لُ)', quranicExample: 'وَمِنَ النَّاسِ مَن يَقُولُ', surahRef: 'البقرة: 8', tajweedRule: 'مد طبيعي حركتان للواو الساكنة المضموم ما قبلها', color: 'blue' },
      { id: 'item_5_3', letterOrWord: 'قِيلَ', phoneticTitle: 'قِي - لَ', spellingMethod: 'قاف ياء مد كسرة (قِي) - لام فتحة (لَ)', quranicExample: 'وَإِذَا قِيلَ لَهُمْ', surahRef: 'البقرة: 11', tajweedRule: 'مد طبيعي حركتان مع تفخيم القاف في أدنى مراتبه', color: 'blue' },
      { id: 'item_5_4', letterOrWord: 'خَوْفٍ', phoneticTitle: 'خَـ - وْ - فٍ', spellingMethod: 'خاء فتحة واو سكون لين (خَوْ) - فاء تنوين كسر (فٍ)', quranicExample: 'وَآمَنَهُم مِّنْ خَوْفٍ', surahRef: 'قريش: 4', tajweedRule: 'حرف لين / مد لين 2-4-6 حركات عند الوقف', color: 'amber' },
      { id: 'item_5_5', letterOrWord: 'بَيْتٍ', phoneticTitle: 'بَـ - يْـ - تٍ', spellingMethod: 'باء فتحة ياء سكون لين (بَيْ) - تاء تنوين كسر (تٍ)', quranicExample: 'فَلْيَعْبُدُوا رَبَّ هٰذَا الْبَيْتِ', surahRef: 'قريش: 3', tajweedRule: 'حرف لين يجري فيه الصوت بلين وسهولة', color: 'emerald' },
    ],
  },
  {
    id: 'sukoon_qalqalah',
    title: 'السكون وأحكام القلقلة (قُطْبُ جَدٍّ)',
    description: 'تجريد الحرف من الحركة، وضبط نبرة واضطراب مخرج حروف القلقلة الخمسة حال سكونها',
    badge: 'الدرس 9',
    items: [
      { id: 'item_6_1', letterOrWord: 'يَلِدْ', phoneticTitle: 'يَـ - لِـ - دْ', spellingMethod: 'ياء فتحة (يَ) - لام كسرة (لِ) -> يَلِ - دال سكون مقلقلة (دْ) -> يَلِدْ', quranicExample: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', surahRef: 'الإخلاص: 3', tajweedRule: 'قلقلة صغرى في وسط الآية / سكون عارض', color: 'emerald' },
      { id: 'item_6_2', letterOrWord: 'الْفَلَقِ', phoneticTitle: 'الْـ - فَـ - لَـ - قْ', spellingMethod: 'همزة وصل تسقط - لام قمرية (الْ) - فاء فتحة (فَ) - لام فتحة (لَ) - قاف سكون وقفاً', quranicExample: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', surahRef: 'الفلق: 1', tajweedRule: 'قلقلة كبرى عند الوقف على القاف المخففة', color: 'amber' },
      { id: 'item_6_3', letterOrWord: 'وَتَبَّ', phoneticTitle: 'وَ - تَـ - بَّ [بْ]', spellingMethod: 'واو فتحة (وَ) - تاء فتحة (تَ) - باء مشددة موقوف عليها بالسكون والشدة', quranicExample: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ', surahRef: 'المسد: 1', tajweedRule: 'قلقلة أكبر / أشد عند الوقف على الحرف المشدد', color: 'rose' },
      { id: 'item_6_4', letterOrWord: 'يَجْعَل', phoneticTitle: 'يَـ - جْـ - عَـ - لْ', spellingMethod: 'ياء فتحة جيم سكون مقلقلة (يَجْ) - عين فتحة لام سكون (عَلْ)', quranicExample: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ', surahRef: 'الفيل: 2', tajweedRule: 'قلقلة صغرى في وسط الكلمة', color: 'emerald' },
      { id: 'item_6_5', letterOrWord: 'أَطْعَمَهُم', phoneticTitle: 'أَ - طْـ - عَـ - مَـ - هُمْ', spellingMethod: 'همزة فتحة طاء سكون مقلقلة مفخمة (أَطْ) - عين فتحة (عَ) - ميم فتحة (مَ)', quranicExample: 'الَّذِي أَطْعَمَهُم مِّن جُوعٍ', surahRef: 'قريش: 4', tajweedRule: 'قلقلة الطاء مع الاحتفاظ بتفخيمها وإطباقها', color: 'amber' },
    ],
  },
  {
    id: 'shaddah_ghunnah',
    title: 'الشدة مع الغنة والحركات (ـّ)',
    description: 'إدغام حرفين أولهما ساكن وثانيهما متحرك، مع الغنة بمقدار حركتين في النون والميم المشددتين',
    badge: 'الدروس 10 و 11',
    items: [
      { id: 'item_7_1', letterOrWord: 'إِنَّ', phoneticTitle: 'إِ - نْـ - نَ [غنة]', spellingMethod: 'همزة كسرة (إِ) - نون مشددة بالفتح مع غنة حركتين (نَّ) -> إِنَّ', quranicExample: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', surahRef: 'الكوثر: 1', tajweedRule: 'نون مشددة أكمل ما تكون الغنة (حركتان)', color: 'emerald' },
      { id: 'item_7_2', letterOrWord: 'عَمَّ', phoneticTitle: 'عَ - مْـ - مَ [غنة]', spellingMethod: 'عين فتحة (عَ) - ميم مشددة بالفتح مع غنة حركتين (مَّ) -> عَمَّ', quranicExample: 'عَمَّ يَتَسَاءَلُونَ', surahRef: 'النبأ: 1', tajweedRule: 'ميم مشددة حكمها وجوب الغنة بمقدار حركتين', color: 'emerald' },
      { id: 'item_7_3', letterOrWord: 'رَبِّ', phoneticTitle: 'رَ - بْـ - بِ', spellingMethod: 'راء فتحة مفخمة (رَ) - باء مشددة بالكسر مرققة (بِّ) -> رَبِّ', quranicExample: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', surahRef: 'الناس: 1', tajweedRule: 'الضغط على مخرج الشفتين بالشدة دون غنة', color: 'blue' },
      { id: 'item_7_4', letterOrWord: 'مُحَمَّدٌ', phoneticTitle: 'مُـ - حَـ - مْـ - مَـ - دٌ', spellingMethod: 'ميم ضمة (مُ) - حاء فتحة (حَ) - ميم مشددة بالفتح مع غنة (مَّ) - دال تنوين ضم (دٌ)', quranicExample: 'مُّحَمَّدٌ رَّسُولُ اللَّهِ', surahRef: 'الفتح: 29', tajweedRule: 'غنة الميم المشددة ثم تنوين الدال', color: 'emerald' },
    ],
  },
];

export const SpellingInteractiveBoard: React.FC = () => {
  const { currentUser, currentRole } = useApp();

  // Determine if user has permission to edit / add / delete content
  const canManage =
    currentUser &&
    ['system_admin', 'campus_admin', 'admin', 'supervisor', 'charity_supervisor'].includes(
      currentUser.role || currentRole
    );

  const [categories, setCategories] = useState<OrthographyCategory[]>(() => {
    const saved = safeStorage.getItem('qrms_orthography_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved orthography categories', e);
      }
    }
    return DEFAULT_ORTHOGRAPHY_CATEGORIES;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return categories[0]?.id || 'single_letters';
  });

  const [activeItem, setActiveItem] = useState<OrthographyItem | null>(() => {
    return categories[0]?.items[0] || null;
  });

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OrthographyCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    title: '',
    description: '',
    badge: '',
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrthographyItem | null>(null);
  const [itemForm, setItemForm] = useState<OrthographyItem>({
    letterOrWord: '',
    phoneticTitle: '',
    spellingMethod: '',
    quranicExample: '',
    surahRef: '',
    tajweedRule: '',
    color: 'emerald',
  });

  // Save to localStorage whenever categories change
  const saveCategoriesToStorage = (updated: OrthographyCategory[]) => {
    setCategories(updated);
    safeStorage.setItem('qrms_orthography_categories', JSON.stringify(updated));
  };

  const currentCategory =
    categories.find((c) => c.id === selectedCategory) || categories[0] || DEFAULT_ORTHOGRAPHY_CATEGORIES[0];

  useEffect(() => {
    if (!currentCategory) return;
    if (!activeItem || !currentCategory.items.some((it) => it.letterOrWord === activeItem.letterOrWord)) {
      setActiveItem(currentCategory.items[0] || null);
    }
  }, [selectedCategory, categories]);

  const handlePronounce = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Category Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      title: '',
      description: '',
      badge: `الدرس ${categories.length + 1}`,
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: OrthographyCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      title: cat.title,
      description: cat.description,
      badge: cat.badge,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.title.trim()) return;

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              title: categoryForm.title.trim(),
              description: categoryForm.description.trim(),
              badge: categoryForm.badge.trim(),
            }
          : c
      );
      saveCategoriesToStorage(updated);
    } else {
      const newCatId = `cat_${Date.now()}`;
      const newCat: OrthographyCategory = {
        id: newCatId,
        title: categoryForm.title.trim(),
        description: categoryForm.description.trim(),
        badge: categoryForm.badge.trim() || `الدرس ${categories.length + 1}`,
        items: [],
      };
      const updated = [...categories, newCat];
      saveCategoriesToStorage(updated);
      setSelectedCategory(newCatId);
      setActiveItem(null);
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (catId: string, title: string) => {
    if (categories.length <= 1) {
      alert('يجب الإبقاء على تصنيف واحد على الأقل في اللوحة التفاعلية.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف قسم «${title}» وجميع النماذج التابعة له؟`)) {
      const updated = categories.filter((c) => c.id !== catId);
      saveCategoriesToStorage(updated);
      if (selectedCategory === catId) {
        setSelectedCategory(updated[0]?.id || '');
        setActiveItem(updated[0]?.items[0] || null);
      }
    }
  };

  // Item Handlers
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      letterOrWord: '',
      phoneticTitle: '',
      spellingMethod: '',
      quranicExample: '',
      surahRef: 'الفاتحة: 1',
      tajweedRule: '',
      color: 'emerald',
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: OrthographyItem) => {
    setEditingItem(item);
    setItemForm({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.letterOrWord.trim()) return;

    const targetCatId = currentCategory.id;

    if (editingItem) {
      const updated = categories.map((cat) => {
        if (cat.id !== targetCatId) return cat;
        return {
          ...cat,
          items: cat.items.map((it) =>
            (it.id && it.id === editingItem.id) || it.letterOrWord === editingItem.letterOrWord
              ? { ...itemForm, id: it.id || `item_${Date.now()}` }
              : it
          ),
        };
      });
      saveCategoriesToStorage(updated);
      setActiveItem(itemForm);
    } else {
      const newItem: OrthographyItem = {
        ...itemForm,
        id: `item_${Date.now()}`,
      };
      const updated = categories.map((cat) => {
        if (cat.id !== targetCatId) return cat;
        return {
          ...cat,
          items: [...cat.items, newItem],
        };
      });
      saveCategoriesToStorage(updated);
      setActiveItem(newItem);
    }
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (item: OrthographyItem) => {
    if (confirm(`هل أنت متأكد من حذف بطاقة «${item.letterOrWord}»؟`)) {
      const updated = categories.map((cat) => {
        if (cat.id !== currentCategory.id) return cat;
        return {
          ...cat,
          items: cat.items.filter((it) => it.letterOrWord !== item.letterOrWord),
        };
      });
      saveCategoriesToStorage(updated);
      const remaining = currentCategory.items.filter((it) => it.letterOrWord !== item.letterOrWord);
      setActiveItem(remaining[0] || null);
    }
  };

  const handleRestoreDefaults = () => {
    if (confirm('هل تريد استعادة جميع النماذج والتصنيفات الهجائية الافتراضية المعتمدة؟')) {
      saveCategoriesToStorage(DEFAULT_ORTHOGRAPHY_CATEGORIES);
      setSelectedCategory(DEFAULT_ORTHOGRAPHY_CATEGORIES[0].id);
      setActiveItem(DEFAULT_ORTHOGRAPHY_CATEGORIES[0].items[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner for Admins & Supervisors */}
      {canManage && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              صلاحية التعديل والإشراف مفعلة (المدير والمشرفون): يمكنك إضافة أو تعديل أو حذف الأقسام والنماذج وحفظها فورياً.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة قسم جديد</span>
            </button>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              title="استعادة النماذج القياسية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>
        </div>
      )}

      {/* Categories Horizontal Tabs */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategory;
            return (
              <div key={cat.id} className="relative group shrink-0 flex items-center">
                <button
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setActiveItem(cat.items[0] || null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {cat.badge}
                  </span>
                  <span>{cat.title}</span>
                </button>

                {canManage && isSelected && (
                  <div className="flex items-center gap-1 mr-1.5">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg shadow-2xs transition-colors"
                      title="تعديل هذا القسم"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.title)}
                      className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg shadow-2xs transition-colors"
                      title="حذف هذا القسم"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Overview & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Cards Board (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{currentCategory.title}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    {currentCategory.items.length} نماذج تطبيقية
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1">{currentCategory.description}</p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة بطاقة</span>
                </button>
              )}
            </div>

            {/* Grid of letter/word cards */}
            {currentCategory.items.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                لا توجد نماذج في هذا القسم حالياً.
                {canManage && (
                  <div className="mt-3">
                    <button
                      onClick={handleOpenAddItem}
                      className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      إضافة أول نموذج
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {currentCategory.items.map((item, idx) => {
                  const isActive = activeItem?.letterOrWord === item.letterOrWord;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveItem(item)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all text-center flex flex-col justify-between relative overflow-hidden group ${
                        isActive
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                        <span>نموذج {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          {canManage && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditItem(item);
                                }}
                                className="p-1 hover:bg-white rounded text-slate-700 hover:text-emerald-700"
                                title="تعديل البطاقة"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item);
                                }}
                                className="p-1 hover:bg-white rounded text-slate-700 hover:text-rose-600"
                                title="حذف البطاقة"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePronounce(item.letterOrWord);
                            }}
                            className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700"
                            title="نطق"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="my-3">
                        <span className="text-3xl font-black font-serif text-slate-900 block group-hover:scale-110 transition-transform">
                          {item.letterOrWord}
                        </span>
                        <span className="text-xs font-bold text-emerald-800 mt-1 block">
                          {item.phoneticTitle}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium truncate">
                        {item.surahRef}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Pronunciation & Spelling Analysis (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {activeItem ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>التحليل الصوتي والتجويدي النموذجي</span>
                </span>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditItem(activeItem)}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Big Letter Display & Pronounce Button */}
              <div className="text-center py-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <span className="text-5xl font-black font-serif text-emerald-950 block mb-2">
                  {activeItem.letterOrWord}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {activeItem.phoneticTitle}
                </span>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePronounce(activeItem.letterOrWord)}
                    disabled={isPlayingAudio}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isPlayingAudio ? 'جاري النطق...' : 'استمع للنطق النموذجي'}</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Spelling Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>طريقة التهجئة النموذجية للطالب:</span>
                </div>
                <p className="text-xs font-mono font-bold text-emerald-900 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                  « {activeItem.spellingMethod} »
                </p>
              </div>

              {/* Quranic Context & Verse */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>الشاهد القرآني من المصحف:</span>
                  </span>
                  <span className="text-[11px] text-slate-700">{activeItem.surahRef}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                  <p className="text-sm font-serif font-bold text-slate-900">
                    ﴿ {activeItem.quranicExample} ﴾
                  </p>
                </div>
              </div>

              {/* Tajweed & Pronunciation Rule */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>الضابط الصوتي والتجويدي:</span>
                </span>
                <p className="text-amber-950 font-medium leading-relaxed">
                  {activeItem.tajweedRule}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
              اختر أي حرف أو كلمة لعرض التحليل التجويدي وطريقة الهجاء بالتفصيل.
            </div>
          )}
        </div>
      </div>

      {/* Category Modal (Add / Edit) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory ? 'تعديل قسم اللوحة التفاعلية' : 'إضافة قسم تفاعلي جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم القسم / الباب *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.title}
                  onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                  placeholder="مثال: الحروف اللثوية والقلقلة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شارة الدرس أو الترتيب</label>
                <input
                  type="text"
                  value={categoryForm.badge}
                  onChange={(e) => setCategoryForm({ ...categoryForm, badge: e.target.value })}
                  placeholder="مثال: الدرس 2"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف التعليمي والأهداف</label>
                <textarea
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="شرح موجز لأهداف هذا الباب وضوابطه..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ القسم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal (Add / Edit) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'تعديل بطاقة الحرف / الكلمة' : 'إضافة نموذج نطق وهجاء جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الحرف أو الكلمة *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.letterOrWord}
                    onChange={(e) => setItemForm({ ...itemForm, letterOrWord: e.target.value })}
                    placeholder="مثال: قُتِلَ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-serif font-bold text-sm text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">العنوان الصوتي والمقطعي *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.phoneticTitle}
                    onChange={(e) => setItemForm({ ...itemForm, phoneticTitle: e.target.value })}
                    placeholder="مثال: قُـ - تِـ - لَ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">طريقة التهجئة النموذجية للطالب *</label>
                <textarea
                  rows={2}
                  required
                  value={itemForm.spellingMethod}
                  onChange={(e) => setItemForm({ ...itemForm, spellingMethod: e.target.value })}
                  placeholder="مثال: قاف ضمة (قُ) - تاء كسرة (تِ) -> قُتِ - لام فتحة (لَ) -> قُتِلَ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">الشاهد القرآني من المصحف</label>
                  <input
                    type="text"
                    value={itemForm.quranicExample}
                    onChange={(e) => setItemForm({ ...itemForm, quranicExample: e.target.value })}
                    placeholder="مثال: قُتِلَ أَصْحَابُ الْأُخْدُودِ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600 font-serif font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">السورة والآية</label>
                  <input
                    type="text"
                    value={itemForm.surahRef}
                    onChange={(e) => setItemForm({ ...itemForm, surahRef: e.target.value })}
                    placeholder="مثال: البروج: 4"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الضابط الصوتي والتجويدي</label>
                <textarea
                  rows={2}
                  value={itemForm.tajweedRule}
                  onChange={(e) => setItemForm({ ...itemForm, tajweedRule: e.target.value })}
                  placeholder="مثال: ضم الشفتين للقاف مع تفخيمها ثم ترقيق التاء واللام المكسورة"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ البطاقة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
