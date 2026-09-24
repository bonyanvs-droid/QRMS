import * as XLSX from 'xlsx';
import {
  Student,
  DailySessionRecord,
  SpellingLesson,
  AcademicYearConfig,
} from '../types';
import { evaluateStudentStatus } from './statusCalculator';

/**
 * Generates and downloads an Excel spreadsheet for a halaqah or all students
 */
export function exportStudentsToExcel(
  students: Student[],
  records: DailySessionRecord[],
  spellingLessons: SpellingLesson[],
  academicConfig: AcademicYearConfig,
  options?: {
    halaqahName?: string;
    fileName?: string;
  }
) {
  const data = students.map((student, idx) => {
    const evalResult = evaluateStudentStatus(student, records, spellingLessons, academicConfig);
    const currentLesson = spellingLessons.find((l) => l.id === student.currentSpellingLessonId);

    return {
      'م': idx + 1,
      'اسم الطالب': student.fullName,
      'الحلقة': options?.halaqahName || student.halaqahId || '',
      'المرحلة الدراسية': student.grade,
      'رقم هاتف ولي الأمر': student.parentPhone || '—',
      'حالة الطالب': evalResult.statusLabel,
      'الدرس الحالي للهجاء': currentLesson ? `درس ${currentLesson.lessonNumber}: ${currentLesson.title}` : '—',
      'نسبة إتقان الهجاء': `${evalResult.spellingMasteryRate}%`,
      'السورة الحالية': `سورة ${student.currentSurah || '—'} (آية ${student.currentAyah || 1})`,
      'الحد الأدنى المستهدف': `سورة ${student.minimumTargetSurah || '—'}`,
      'الهدف الشخصي': student.personalTargetSurah ? `سورة ${student.personalTargetSurah}` : '—',
      'نسبة تحقيق الحفظ': `${evalResult.memorizationProgressRate}%`,
      'نسبة الحضور والمواظبة': `${evalResult.attendanceRate}%`,
      'أيام الحضور': evalResult.totalAttendedDays,
      'أيام الغياب': evalResult.totalAbsentDays,
      'تاريخ التسجيل': student.createdAt || '—',
      'ملاحظات المعلم': student.notes || '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // م
    { wch: 25 }, // اسم الطالب
    { wch: 18 }, // الحلقة
    { wch: 14 }, // المرحلة
    { wch: 16 }, // هاتف ولي الأمر
    { wch: 18 }, // الحالة
    { wch: 28 }, // درس الهجاء
    { wch: 14 }, // نسبة إتقان الهجاء
    { wch: 22 }, // السورة الحالية
    { wch: 18 }, // الحد الأدنى
    { wch: 18 }, // الهدف الشخصي
    { wch: 14 }, // نسبة الحفظ
    { wch: 16 }, // نسبة الحضور
    { wch: 12 }, // أيام الحضور
    { wch: 12 }, // أيام الغياب
    { wch: 14 }, // تاريخ التسجيل
    { wch: 30 }, // ملاحظات
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = options?.halaqahName ? options.halaqahName.slice(0, 30) : 'كشف الطلاب';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = options?.fileName || `تقرير_طلاب_المجمع_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports detailed weekly session records to Excel
 */
export function exportAttendanceToExcel(
  records: DailySessionRecord[],
  students: Student[],
  weekNumber: number
) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const data = records.map((r, idx) => {
    const student = studentMap.get(r.studentId);
    let dayName = '';
    try {
      dayName = new Date(r.date).toLocaleDateString('ar-SA', { weekday: 'long' });
    } catch {
      dayName = '';
    }

    return {
      'م': idx + 1,
      'التاريخ': r.date,
      'الأسبوع': r.weekNumber,
      'اليوم': dayName,
      'اسم الطالب': student?.fullName || '—',
      'الحلقة': student?.halaqahId || '—',
      'حالة الحضور': r.attendance === 'present' ? 'حاضر' : r.attendance === 'excused' ? 'استئذان' : 'غائب',
      'دقائق تدريب الهجاء': 10,
      'إتقان الهجاء': r.spelling ? `${r.spelling.finalScore}% (${r.spelling.statusTag})` : '—',
      'موضع الحفظ اليومي': r.memorization ? `${r.memorization.surahTo} (${r.memorization.score}%)` : '—',
      'موضع المراجعة': r.revision ? `${r.revision.surahTo} (${r.revision.score}%)` : '—',
      'ملاحظات المعلم': r.teacherRemarks || '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },  // م
    { wch: 14 }, // التاريخ
    { wch: 8 },  // الأسبوع
    { wch: 12 }, // اليوم
    { wch: 25 }, // الاسم
    { wch: 18 }, // الحلقة
    { wch: 12 }, // الحضور
    { wch: 16 }, // دقائق الهجاء
    { wch: 20 }, // إتقان الهجاء
    { wch: 22 }, // الحفظ
    { wch: 22 }, // المراجعة
    { wch: 30 }, // الملاحظات
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `حضور_أسبوع_${weekNumber}`);
  XLSX.writeFile(workbook, `سجل_حضور_الطلاب_أسبوع_${weekNumber}.xlsx`);
}

/**
 * Exports Staff Geo-Attendance records to Excel
 */
export function exportStaffAttendanceToExcel(
  records: any[],
  options?: { title?: string; fileName?: string }
) {
  const data = records.map((r, idx) => {
    let dayName = '';
    try {
      dayName = new Date(r.timestamp || r.date).toLocaleDateString('ar-SA', { weekday: 'long' });
    } catch {
      dayName = '';
    }

    const timeStr = r.timestamp
      ? new Date(r.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : '—';

    return {
      'م': idx + 1,
      'التاريخ': r.date || '—',
      'اليوم': dayName,
      'اسم الموظف / الكادر': r.userName || '—',
      'الدور الوظيفي': r.userRole || '—',
      'وقت التسجيل': timeStr,
      'نوع اليوم': r.isRegularDay ? 'معتاد' : `غير معتاد (${r.reason || 'نشاط'})`,
      'المسافة عن المقر': r.locationData?.distanceMeters ? `${r.locationData.distanceMeters} متر` : '—',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },  // م
    { wch: 14 }, // التاريخ
    { wch: 12 }, // اليوم
    { wch: 25 }, // الاسم
    { wch: 16 }, // الدور
    { wch: 14 }, // الوقت
    { wch: 22 }, // نوع اليوم
    { wch: 16 }, // المسافة
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = options?.title ? options.title.slice(0, 30) : 'تقرير حضور الكادر';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = options?.fileName || `تقرير_حضور_الكادر_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Printable HTML report helper for PDF export / printing
 */
export function printAttendanceReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  tenantName: string = 'المجمع القرآني'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 30px;
          color: #1e293b;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #059669;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header-title {
          text-align: right;
        }
        .header-title h1 {
          margin: 0;
          font-size: 20px;
          color: #065f46;
        }
        .header-title p {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #475569;
        }
        .meta {
          text-align: left;
          font-size: 12px;
          color: #64748b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 13px;
        }
        th {
          background-color: #f0fdf4;
          color: #065f46;
          border: 1px solid #cbd5e1;
          padding: 8px 10px;
          text-align: right;
          font-weight: bold;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          text-align: right;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #475569;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
        }
        @media print {
          body { margin: 15px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <h1>${tenantName}</h1>
          <p><strong>${title}</strong> - ${subtitle}</p>
        </div>
        <div class="meta">
          <div>تاريخ التقرير: ${dateStr}</div>
          <div>عدد السجلات: ${rows.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, idx) => `
            <tr>
              <td>${idx + 1}</td>
              ${r.map((cell) => `<td>${cell || '—'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>توقيع المسؤول: ___________________</div>
        <div>ختم المجمع: ___________________</div>
        <div>منظومة إدارة المجمعات القرآنية</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

