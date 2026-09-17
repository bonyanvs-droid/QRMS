import * as XLSX from 'xlsx';
import printJS from 'print-js';
import { EducationalPlanWeek, EducationalStage, Teacher } from '../types';

/**
 * Generate AI prompt customized with actual stage details, traits, and system teachers
 */
export function generateEducationalPlanAIPrompt(
  stage: EducationalStage | undefined,
  teachers: Teacher[],
  totalWeeks: number = 14
): string {
  const stageName = stage?.name || 'مرحلة البراعم';
  const stageSummary = stage?.outcomeSummary || 'طفل متقن لهجاء القرآن وحفظه إلى الغاشية، محبّ لله ورسوله ﷺ والقرآن وأهله، آمن منتمٍ لمحِضنه، متحلّ ببعض الآداب، محسن لوضوئه.';
  const stageTraits = stage?.traits?.length ? stage.traits.join('، ') : 'متقن لهجاء القرآن، يحفظ إلى سورة الغاشية، محب لله ورسوله، آمن منتم لمحِضنه';
  const stageFocus = stage?.curriculumFocus || 'الهجاء القرآني المتدرج، وتصحيح المخارج، والآداب، والوضوء والصلاة';
  const teachersList = teachers.map((t) => t.name).join('، ') || 'أ. صالح بشير، أ. عثمان محمد، أ. عبدالله الغريبي، د. نور إبراهيم';

  return `أنت خبير ومخطط تربوي متخصص في مراكز ومجمعات تحفيظ القرآن الكريم والأنشطة التربوية الأسبوعية (أنشطة نهاية الأسبوع: الخميس والجمعة والسبت).
المطلوب منك توليد خطة تربوية متكاملة للفصل الدراسي بالكامل لمرحلة: "${stageName}".

📌 بيانات المرحلة المعتمدة من النظام:
- مخرج المرحلة المستهدف: "${stageSummary}"
- السمات والصفات المرجوة: "${stageTraits}"
- التركيز التربوي والمنهجي: "${stageFocus}"
- عدد أسابيع الفصل الدراسي: ${totalWeeks} أسبوعاً.
- أسماء الكادر والمعلمين المتاحين بالمرحلة للاختيار منهم: [${teachersList}].

📌 هيكل الخطة المطلوب لكل أسبوع:
1. رقم الأسبوع (weekNumber) من 1 إلى ${totalWeeks}.
2. تواريخ الأسبوع وأيام النشاط (الخميس، الجمعة، السبت).
3. نوع الأسبوع (weekType): إما 'normal' (عادي)، أو 'long_weekend' (إجازة مطولة)، أو 'founding_day' (يوم التأسيس)، أو 'dead_week' (الأسبوع الميت)، أو 'exams' (اختبارات نهائية)، أو 'midterm_break' (إجازة بين الفصلين).
4. المجال التربوي (domain): مثل "إيماني"، "سلوكي"، "مهاري"، "قرآني".
5. القيمة التربوية (valueTitle): مثل "تعظيم القرآن"، "بر الوالدين"، "الصدق والأمانة"، "إتقان الصلاة"، "الأخوة والتعاون".
6. الشعار الأسبوعي (motto): شعار قصير وجذاب ومحفز (بين علامتي تنصيص).
7. موضوع الهدف المعتمد (educationalGoal / goalTopic): قصة أو فيديو أو تطبيق عملي.
8. مقدم الموضوع (goalPresenter) ومكانه (goalLocation).
9. الفقرة الثقافية والتفاعلية (activity): ألعاب تحدي، كراديس، مانيوليز، الجرس الثقافي، بدون كلام، إلخ، مع مقدمها ومكانها.
10. البرنامج القرآني المصاحب (quranicProgram): مسابقات الحفظ، استيكرات، تثبيت.
11. الميزانية التقديرية المقترحة (budget): بالريال السعودي (مثلاً 50 إلى 500 ريال).

⚠️ هام جداً: قم بالرد بصيغة JSON Array نقية ومباشرة بدون أي شروحات أو نصوص إضافية، بحيث تكون مطابقة للهيكل البرمجي التالي:

\`\`\`json
[
  {
    "weekNumber": 1,
    "startDate": "1447-06-01",
    "endDate": "1447-06-03",
    "dayDates": { "thursday": "6/1", "friday": "6/2", "saturday": "6/3" },
    "weekType": "normal",
    "domain": "faith",
    "domainLabel": "إيماني",
    "valueTitle": "القرآن كلام الله",
    "motto": "«قرآني نوري وكلام ربي»",
    "educationalGoal": "غرس تعظيم القرآن الكريم وبيان أنه كلام الله المُنزل",
    "goalTopic": "قصة الوحي وتنزيل القرآن",
    "goalPresenter": "أ. صالح بشير",
    "goalLocation": "القاعة الرئيسية",
    "activity": "كراديس وبناء أبراج القيم",
    "activityPresenter": "أ. عثمان محمد",
    "activityLocation": "الساحة التفاعلية",
    "responsiblePerson": "أ. صالح بشير",
    "quranicProgram": "مسابقة نحو المعالي - تدشين المسار",
    "budget": 100,
    "notes": "الالتزام بتوزيع بطاقات الآداب"
  }
]
\`\`\`
يرجى توليد جميع الأسابيع الـ ${totalWeeks} الآن بصيغة JSON.`;
}

/**
 * Export educational plan to an Excel file
 */
export function exportEducationalPlanToExcel(
  weeks: EducationalPlanWeek[],
  stageName: string = 'الخطة التربوية'
): void {
  const rows = weeks.map((w) => {
    let weekTypeArabic = 'أسبوع عادي';
    if (w.weekType === 'long_weekend') weekTypeArabic = 'إجازة مطولة';
    else if (w.weekType === 'founding_day') weekTypeArabic = 'إجازة يوم التأسيس';
    else if (w.weekType === 'national_day') weekTypeArabic = 'إجازة اليوم الوطني';
    else if (w.weekType === 'dead_week') weekTypeArabic = 'الأسبوع الميت';
    else if (w.weekType === 'exams') weekTypeArabic = 'فترة الاختبارات';
    else if (w.weekType === 'midterm_break') weekTypeArabic = 'إجازة ما بين الترمين';
    else if (w.weekType === 'vacation') weekTypeArabic = 'إجازة رسمية';

    return {
      'رقم الأسبوع': w.weekNumber,
      'نوع الأسبوع': weekTypeArabic,
      'تاريخ البداية': w.startDate,
      'تاريخ النهاية': w.endDate,
      'تاريخ الخميس': w.dayDates?.thursday || '',
      'تاريخ الجمعة': w.dayDates?.friday || '',
      'تاريخ السبت': w.dayDates?.saturday || '',
      'المجال': w.domainLabel || (w.domain === 'faith' ? 'إيماني' : w.domain === 'behavioral' ? 'سلوكي' : w.domain === 'skills' ? 'مهاري' : 'تربوي'),
      'القيمة': w.valueTitle || '',
      'شعار الأسبوع': w.motto || '',
      'مواضيع الهدف والهدف المعتمد': w.educationalGoal || w.goalTopic || '',
      'مقدم الموضوع': w.goalPresenter || '',
      'مكان الموضوع': w.goalLocation || '',
      'الفقرة التفاعلية': w.activity || '',
      'مقدم الفقرة': w.activityPresenter || '',
      'مكان الفقرة': w.activityLocation || '',
      'المشرف المسؤول': w.responsiblePerson || '',
      'البرنامج القرآني': w.quranicProgram || '',
      'الميزانية المقترحة (ر.س)': w.budget || 0,
      'حالة التنفيذ': w.status === 'completed' ? 'تم التنفيذ' : w.status === 'in_progress' ? 'جارٍ التنفيذ' : 'مجدول',
      'ملاحظات': w.notes || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الخطة التربوية');

  const fileName = `${stageName}_الخطة_التربوية_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Generate a blank Excel template for users to fill and upload
 */
export function downloadEducationalPlanTemplate(stageName: string = 'مرحلة'): void {
  const sampleRows = [
    {
      'رقم الأسبوع': 1,
      'نوع الأسبوع': 'أسبوع عادي',
      'تاريخ البداية': '1447-06-01',
      'تاريخ النهاية': '1447-06-03',
      'تاريخ الخميس': '6/1',
      'تاريخ الجمعة': '6/2',
      'تاريخ السبت': '6/3',
      'المجال': 'إيماني',
      'القيمة': 'القرآن كلام الله',
      'شعار الأسبوع': '«قرآني نوري وكلام ربي»',
      'مواضيع الهدف والهدف المعتمد': 'قصة الوحي وفضل تعظيم كلام الله تعالى',
      'مقدم الموضوع': 'أ. صالح بشير',
      'مكان الموضوع': 'القاعة الرئيسية',
      'الفقرة التفاعلية': 'كراديس وتحديات حركية',
      'مقدم الفقرة': 'أ. عثمان محمد',
      'مكان الفقرة': 'الساحة',
      'المشرف المسؤول': 'أ. صالح بشير',
      'البرنامج القرآني': 'مسابقة نحو المعالي',
      'الميزانية المقترحة (ر.س)': 100,
      'ملاحظات': 'تجهيز الهدايا مسبقاً',
    },
    {
      'رقم الأسبوع': 2,
      'نوع الأسبوع': 'أسبوع عادي',
      'تاريخ البداية': '1447-06-08',
      'تاريخ النهاية': '1447-06-10',
      'تاريخ الخميس': '6/8',
      'تاريخ الجمعة': '6/9',
      'تاريخ السبت': '6/10',
      'المجال': 'سلوكي',
      'القيمة': 'الأدب مع القرآن الكريم',
      'شعار الأسبوع': '«أتأدب مع كتاب ربي»',
      'مواضيع الهدف والهدف المعتمد': 'تجليد المصحف وحمله باليمين والطهارة',
      'مقدم الموضوع': 'أ. أحمد سالم',
      'مكان الموضوع': 'قاعة 1',
      'الفقرة التفاعلية': 'مانيوليز وتجميع النقاط',
      'مقدم الفقرة': 'أ. عبدالله الغريبي',
      'مكان الفقرة': 'الصالة الرياضية',
      'المشرف المسؤول': 'أ. أحمد سالم',
      'البرنامج القرآني': 'استيكرات المتقنين',
      'الميزانية المقترحة (ر.س)': 150,
      'ملاحظات': 'توزيع أكياس حفظ المصاحف',
    },
    {
      'رقم الأسبوع': 3,
      'نوع الأسبوع': 'إجازة مطولة',
      'تاريخ البداية': '1447-06-15',
      'تاريخ النهاية': '1447-06-17',
      'تاريخ الخميس': '6/15',
      'تاريخ الجمعة': '6/16',
      'تاريخ السبت': '6/17',
      'المجال': '',
      'القيمة': 'إجازة نهاية أسبوع مطولة',
      'شعار الأسبوع': '«إجازة سعيدة»',
      'مواضيع الهدف والهدف المعتمد': 'لا توجد دروس حضورية (إجازة مطولة)',
      'مقدم الموضوع': '',
      'مكان الموضوع': '',
      'الفقرة التفاعلية': '',
      'مقدم الفقرة': '',
      'مكان الفقرة': '',
      'المشرف المسؤول': 'إدارة المجمع',
      'البرنامج القرآني': 'ورد المراجعة المنزلية',
      'الميزانية المقترحة (ر.س)': 0,
      'ملاحظات': 'إشعار أولياء الأمور عبر الواتساب',
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_الخطة_التربوية');
  XLSX.writeFile(workbook, `نموذج_تعبئة_خطة_${stageName}.xlsx`);
}

/**
 * Helper to get the formatted day & date string for a week based on chosen reference day
 */
export function formatWeekDayDate(
  w: EducationalPlanWeek,
  selectedDay: 'saturday' | 'thursday' | 'friday' | 'full' = 'saturday'
): string {
  if (selectedDay === 'saturday') {
    const raw = w.dayDates?.saturday || w.endDate || w.startDate || '';
    if (!raw) return 'السبت';
    const clean = raw.replace(/^السبت\s*:?\s*/, '').trim();
    return clean ? `السبت ${clean}` : 'السبت';
  } else if (selectedDay === 'thursday') {
    const raw = w.dayDates?.thursday || w.startDate || '';
    if (!raw) return 'الخميس';
    const clean = raw.replace(/^الخميس\s*:?\s*/, '').trim();
    return clean ? `الخميس ${clean}` : 'الخميس';
  } else if (selectedDay === 'friday') {
    const raw = w.dayDates?.friday || '';
    if (!raw) return 'الجمعة';
    const clean = raw.replace(/^الجمعة\s*:?\s*/, '').trim();
    return clean ? `الجمعة ${clean}` : 'الجمعة';
  } else {
    const d1 = w.dayDates?.thursday || w.startDate || '';
    const d2 = w.dayDates?.saturday || w.endDate || '';
    return d1 && d2 ? `${d1} - ${d2}` : (d1 || d2 || '-');
  }
}

/**
 * Generate a standalone, styled HTML document strictly fitted for SINGLE PAGE A4 landscape printing
 */
export function generateEducationalPlanPrintHTML(
  weeks: EducationalPlanWeek[],
  stage?: EducationalStage,
  semesterName: string = 'الفصل الدراسي الحالي',
  selectedDay: 'saturday' | 'thursday' | 'friday' | 'full' = 'saturday'
): string {
  const stageName = stage?.name || 'جميع المراحل';
  const stageSummary = stage?.outcomeSummary || stage?.subtitle || '';
  const totalBudget = weeks.reduce((sum, w) => sum + (w.budget || 0), 0);
  const nowStr = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const weekCount = weeks.length;
  // Mathematical scaling to guarantee strictly ONE single page A4 (Landscape)
  const baseFontSize = weekCount > 15 ? '7.8pt' : weekCount > 12 ? '8.2pt' : '9pt';
  const cellPadding = weekCount > 15 ? '1.5px 2px' : weekCount > 12 ? '2px 3px' : '3px 4px';
  const lineSpacing = weekCount > 15 ? '1.1' : '1.18';

  const dayHeaderLabel =
    selectedDay === 'saturday'
      ? 'يوم وتاريخ النشاط (السبت)'
      : selectedDay === 'thursday'
      ? 'يوم وتاريخ النشاط (الخميس)'
      : selectedDay === 'friday'
      ? 'يوم وتاريخ النشاط (الجمعة)'
      : 'تاريخ الأسبوع';

  const tableRows = weeks
    .map((w) => {
      const formattedDate = formatWeekDayDate(w, selectedDay);
      const isVacation = w.weekType && w.weekType !== 'normal';

      if (isVacation) {
        let label = 'إجازة رسمية';
        if (w.weekType === 'long_weekend') label = 'إجازة نهاية أسبوع مطولة ☕';
        else if (w.weekType === 'founding_day') label = 'إجازة يوم التأسيس السعودي 🇸🇦';
        else if (w.weekType === 'national_day') label = 'إجازة اليوم الوطني 🇸🇦';
        else if (w.weekType === 'dead_week') label = 'الأسبوع الميت والمراجعة المكثفة 📖';
        else if (w.weekType === 'exams') label = 'فترة الاختبارات النهائية وتكريم المتميزين 🎯';
        else if (w.weekType === 'midterm_break') label = 'إجازة ما بين الفصلين الدراسيين 🌴';

        return `
          <tr class="vacation-row">
            <td class="w-num vacation-num">${w.weekNumber}</td>
            <td class="w-date">${formattedDate}</td>
            <td colspan="7" class="vacation-desc">
              ${w.specialEventTitle || label}
            </td>
            <td class="w-budget">${w.budget ? `${w.budget} ر.س` : '-'}</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="w-num">${w.weekNumber}</td>
          <td class="w-date">${formattedDate}</td>
          <td class="w-domain">
            <span class="domain-tag">
              ${w.domainLabel || (w.domain === 'faith' ? 'إيماني' : w.domain === 'behavioral' ? 'سلوكي' : w.domain === 'skills' ? 'مهاري' : 'قرآني')}
            </span>
          </td>
          <td class="w-val"><strong>${w.valueTitle || '-'}</strong></td>
          <td class="w-motto"><strong>${w.motto || '-'}</strong></td>
          <td class="w-goal">
            <div>${w.educationalGoal || w.goalTopic || '-'}</div>
            ${w.goalPresenter ? `<div class="sub-person">المقدم: ${w.goalPresenter}${w.goalLocation ? ` (${w.goalLocation})` : ''}</div>` : ''}
          </td>
          <td class="w-activity">
            <div>${w.activity || '-'}</div>
            ${w.activityPresenter ? `<div class="sub-person">المقدم: ${w.activityPresenter}${w.activityLocation ? ` (${w.activityLocation})` : ''}</div>` : ''}
          </td>
          <td class="w-resp">${w.responsiblePerson || '-'}</td>
          <td class="w-quran">${w.quranicProgram || '-'}</td>
          <td class="w-budget">${w.budget ? `${w.budget} ر.س` : '-'}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>الخطة التربوية ومصفوفة القيم - ${stageName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 3mm 4mm 2mm 4mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      max-height: 100%;
      overflow: hidden !important;
      background: #ffffff;
      color: #0f172a;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Kufi Arabic", "Traditional Arabic", sans-serif;
      font-size: ${baseFontSize};
      line-height: ${lineSpacing};
    }
    body {
      padding: 2mm 3mm;
    }
    .page-wrapper {
      width: 100%;
      height: 100vh;
      max-height: 100vh;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }
    .no-print-toolbar {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 12px;
      margin-bottom: 6px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #065f46;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .header-title-box h1 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 900;
      color: #065f46;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .header-title-box p {
      margin: 1px 0 0 0;
      font-size: 8.5px;
      color: #475569;
      font-weight: 600;
    }
    .header-meta-box {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 8.5px;
    }
    .meta-pill {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2px 6px;
      border-radius: 5px;
      font-weight: 700;
      color: #1e293b;
    }
    .meta-pill strong {
      color: #065f46;
    }
    ${
      stageSummary
        ? `.stage-outcome-strip {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 3px;
            font-size: 8.5px;
            color: #064e3b;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }`
        : ''
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 2px;
      page-break-inside: avoid !important;
    }
    tr {
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: ${cellPadding};
      vertical-align: middle;
      text-align: right;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 8.5px;
      text-align: center;
      padding: 3px 2px;
      letter-spacing: 0.1px;
    }
    .w-num {
      width: 2.5%;
      text-align: center;
      font-weight: 900;
      background: #f8fafc;
    }
    .w-date {
      width: 8.5%;
      text-align: center;
      font-weight: 700;
      color: #0f172a;
      font-size: 8pt;
      white-space: nowrap;
    }
    .w-domain {
      width: 5%;
      text-align: center;
    }
    .domain-tag {
      display: inline-block;
      padding: 1px 3px;
      border-radius: 3px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      font-size: 7.5pt;
    }
    .w-val {
      width: 8%;
      color: #0f172a;
    }
    .w-motto {
      width: 9%;
      color: #065f46;
      font-size: 8pt;
    }
    .w-goal {
      width: 22%;
      line-height: 1.1;
    }
    .w-activity {
      width: 17%;
      background: #fffdf5;
      color: #78350f;
      line-height: 1.1;
    }
    .w-resp {
      width: 8%;
      font-weight: 700;
      text-align: center;
    }
    .w-quran {
      width: 15%;
      background: #faf5ff;
      color: #581c87;
      font-size: 8pt;
      line-height: 1.1;
    }
    .w-budget {
      width: 5%;
      text-align: center;
      font-weight: 900;
      color: #065f46;
      white-space: nowrap;
    }
    .sub-person {
      font-size: 7pt;
      color: #64748b;
      margin-top: 1px;
    }
    .vacation-row {
      background-color: #fef3c7;
    }
    .vacation-num {
      background-color: #fde68a;
    }
    .vacation-desc {
      text-align: center;
      font-weight: 900;
      color: #78350f;
      padding: 3px;
      font-size: 9px;
    }
    .print-footer {
      margin-top: 2px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 2px;
      border-top: 1px dashed #94a3b8;
      font-size: 8.5px;
      font-weight: 700;
      color: #334155;
    }
    .sign-box {
      text-align: center;
      min-width: 150px;
    }
    .sign-space {
      height: 14px;
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
      }
      html, body {
        overflow: hidden !important;
        height: 100% !important;
      }
      .page-wrapper {
        height: 100vh !important;
        max-height: 100vh !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div style="font-weight: bold;">
      🖨️ معاينة طباعة الخطة التربوية صفحة واحدة A4 (${stageName})
    </div>
    <div>
      <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 5px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px; margin-left: 6px;">
        طباعة الآن (Ctrl + P)
      </button>
      <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">
        إغلاق النافذة
      </button>
    </div>
  </div>

  <div class="page-wrapper">
    <div>
      <div class="print-header">
        <div class="header-title-box">
          <h1>📘 مصفوفة وخطة البرامج التربوية الأسبوعية</h1>
          <p>مجمع القرآن الكريم والبرامج التربوية المصاحبة • ${semesterName}</p>
        </div>
        <div class="header-meta-box">
          <div class="meta-pill">المرحلة: <strong>${stageName}</strong></div>
          <div class="meta-pill">الأسابيع: <strong>${weekCount}</strong></div>
          <div class="meta-pill">الميزانية المعتمدة: <strong>${totalBudget} ر.س</strong></div>
          <div class="meta-pill">التاريخ: ${nowStr}</div>
        </div>
      </div>

      ${
        stageSummary
          ? `<div class="stage-outcome-strip">
              <div><strong>مخرج المرحلة المستهدف:</strong> ${stageSummary}</div>
              <div><strong>تخطيط الطباعة:</strong> صفحة واحدة A4 Landscape</div>
            </div>`
          : ''
      }

      <table>
        <thead>
          <tr>
            <th style="width: 2.5%;">م</th>
            <th style="width: 8.5%;">${dayHeaderLabel}</th>
            <th style="width: 5%;">المجال</th>
            <th style="width: 8%;">القيمة</th>
            <th style="width: 9%;">الشعار</th>
            <th style="width: 22%;">الهدف والموضوع التربوي المعتمد</th>
            <th style="width: 17%;">الفقرة التفاعلية</th>
            <th style="width: 8%;">المسؤول</th>
            <th style="width: 15%;">البرنامج القرآني</th>
            <th style="width: 5%;">الميزانية</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <div class="print-footer">
      <div class="sign-box">
        <div>مشرف المرحلة التربوية</div>
        <div class="sign-space"></div>
        <div>التوقيع: .................................</div>
      </div>
      <div class="sign-box">
        <div>المشرف التعليمي والتربوي</div>
        <div class="sign-space"></div>
        <div>التوقيع: .................................</div>
      </div>
      <div class="sign-box">
        <div>مدير المجمع القرآني</div>
        <div class="sign-space"></div>
        <div>الختم والاعتماد: .................................</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Executes a clean, robust print operation using print-js library with multiple fallbacks
 */
export function printEducationalPlanDocument(
  weeks: EducationalPlanWeek[],
  stage?: EducationalStage,
  semesterName: string = 'الفصل الدراسي الحالي',
  selectedDay: 'saturday' | 'thursday' | 'friday' | 'full' = 'saturday'
): void {
  const htmlContent = generateEducationalPlanPrintHTML(weeks, stage, semesterName, selectedDay);

  // Method 1: Try printJS first (dedicated print library)
  try {
    printJS({
      printable: htmlContent,
      type: 'raw-html',
      scanStyles: false,
    });
    return;
  } catch (err) {
    console.warn('printJS call failed, trying iframe fallback:', err);
  }

  // Method 2: Hidden Iframe fallback
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.id = 'print-plan-iframe';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print error, falling back to new window:', err);
          openPrintWindow(htmlContent);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 500);
      return;
    }
  } catch (e) {
    console.warn('Could not print via iframe, falling back to window:', e);
  }

  // Method 3: Fallback open in new window
  openPrintWindow(htmlContent);
}

function openPrintWindow(htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // 3. Last fallback: download HTML file
    downloadPrintableHTMLFile(htmlContent, 'خطة_البرنامج_التربوي.html');
  }
}

export function downloadPrintableHTMLFile(htmlContent: string, fileName: string = 'خطة_البرنامج_التربوي.html') {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse uploaded Excel file to EducationalPlanWeek[]
 */
export function parseEducationalPlanExcel(
  fileData: ArrayBuffer,
  stageId?: string
): Omit<EducationalPlanWeek, 'id'>[] {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map((row, idx) => {
    const rawWeekNum = row['رقم الأسبوع'] || row['الأسبوع'] || row['weekNumber'] || idx + 1;
    const weekNumber = typeof rawWeekNum === 'number' ? rawWeekNum : parseInt(rawWeekNum) || idx + 1;

    const rawType = String(row['نوع الأسبوع'] || row['weekType'] || '').trim();
    let weekType = 'normal';
    if (rawType.includes('مطولة')) weekType = 'long_weekend';
    else if (rawType.includes('تأسيس')) weekType = 'founding_day';
    else if (rawType.includes('وطني')) weekType = 'national_day';
    else if (rawType.includes('ميت')) weekType = 'dead_week';
    else if (rawType.includes('اختبار')) weekType = 'exams';
    else if (rawType.includes('ترمين') || rawType.includes('فصلين')) weekType = 'midterm_break';
    else if (rawType.includes('إجازة')) weekType = 'vacation';

    const domainLabel = row['المجال'] || row['domainLabel'] || 'إيماني';
    const domain = domainLabel.includes('سلوك') ? 'behavioral' : domainLabel.includes('مهار') ? 'skills' : domainLabel.includes('قرآن') ? 'quranic' : 'faith';

    const motto = row['شعار الأسبوع'] || row['الشعار'] || row['motto'] || `الأسبوع ${weekNumber}`;
    const educationalGoal = row['مواضيع الهدف والهدف المعتمد'] || row['الهدف التربوي'] || row['educationalGoal'] || row['goalTopic'] || '';
    const activity = row['الفقرة التفاعلية'] || row['النشاط'] || row['activity'] || '';
    const responsiblePerson = row['المشرف المسؤول'] || row['المسؤول'] || row['responsiblePerson'] || 'مشرف المرحلة';
    const budget = parseFloat(row['الميزانية المقترحة (ر.س)'] || row['الميزانية'] || row['budget'] || '0') || 0;

    return {
      stageId,
      weekNumber,
      weekType,
      specialEventTitle: weekType !== 'normal' ? (row['القيمة'] || rawType) : undefined,
      startDate: row['تاريخ البداية'] || row['startDate'] || '',
      endDate: row['تاريخ النهاية'] || row['endDate'] || '',
      dayDates: {
        thursday: row['تاريخ الخميس'] || row['thursday'] || '',
        friday: row['تاريخ الجمعة'] || row['friday'] || '',
        saturday: row['تاريخ السبت'] || row['saturday'] || '',
      },
      domain,
      domainLabel,
      valueTitle: row['القيمة'] || row['valueTitle'] || '',
      motto,
      educationalGoal,
      goalTopic: row['مواضيع الهدف والهدف المعتمد'] || row['goalTopic'] || educationalGoal,
      goalPresenter: row['مقدم الموضوع'] || row['goalPresenter'] || '',
      goalLocation: row['مكان الموضوع'] || row['goalLocation'] || '',
      activity,
      activityPresenter: row['مقدم الفقرة'] || row['activityPresenter'] || '',
      activityLocation: row['مكان الفقرة'] || row['activityLocation'] || '',
      responsiblePerson,
      quranicProgram: row['البرنامج القرآني'] || row['quranicProgram'] || '',
      budget,
      notes: row['ملاحظات'] || row['notes'] || '',
      status: 'scheduled',
    };
  });
}
