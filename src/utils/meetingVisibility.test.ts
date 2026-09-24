import { canUserViewMeeting, isSupervisorResponsibleForUser } from './meetingVisibility';
import { Meeting, User, Halaqah } from '../types';

// Mock Data
const halaqah1: Halaqah = {
  id: 'hal_1',
  name: 'حلقة الإمام عاصم',
  teacherId: 'teacher_a',
  teacherName: 'أحمد المعلم',
  location: 'المسجد - الجناح الأيمن',
  daysPerWeek: 5,
  tenantId: 'ghazzawi',
  stageId: 'stage_braem',
  isActive: true,
};

const halaqah2: Halaqah = {
  id: 'hal_2',
  name: 'حلقة الإمام نافع',
  teacherId: 'teacher_c',
  teacherName: 'علي المعلم',
  location: 'المسجد - الجناح الأيسر',
  daysPerWeek: 5,
  tenantId: 'ghazzawi',
  stageId: 'stage_ashbal',
  isActive: true,
};

const allHalaqahs = [halaqah1, halaqah2];

const teacherA: User = {
  id: 'teacher_a',
  name: 'أحمد المعلم',
  phone: '0500000001',
  role: 'teacher',
  halaqahId: 'hal_1',
  tenantId: 'ghazzawi',
  isActive: true,
};

const teacherC: User = {
  id: 'teacher_c',
  name: 'علي المعلم',
  phone: '0500000003',
  role: 'teacher',
  halaqahId: 'hal_2',
  tenantId: 'ghazzawi',
  isActive: true,
};

const teacherUnrelated: User = {
  id: 'teacher_unrelated',
  name: 'معلم غير مدعو',
  phone: '0500000004',
  role: 'teacher',
  halaqahId: 'hal_2',
  tenantId: 'ghazzawi',
  isActive: true,
};

const supervisorB_Braem: User = {
  id: 'supervisor_b',
  name: 'خالد المشرف (مشرف البراعم)',
  phone: '0500000002',
  role: 'supervisor',
  tenantId: 'ghazzawi',
  supervisorScope: {
    type: 'stage_supervisor',
    stageIds: ['stage_braem'],
    halaqahIds: ['hal_1'],
  },
  isActive: true,
};

const supervisorC_Ashbal: User = {
  id: 'supervisor_c',
  name: 'سالم المشرف (مشرف الأشبال)',
  phone: '0500000005',
  role: 'supervisor',
  tenantId: 'ghazzawi',
  supervisorScope: {
    type: 'stage_supervisor',
    stageIds: ['stage_ashbal'],
    halaqahIds: ['hal_2'],
  },
  isActive: true,
};

const campusAdmin: User = {
  id: 'campus_admin_1',
  name: 'مدير المجمع',
  phone: '0500000010',
  role: 'campus_admin',
  tenantId: 'ghazzawi',
  isActive: true,
};

const campusAdminOtherTenant: User = {
  id: 'campus_admin_other',
  name: 'مدير مجمع آخر',
  phone: '0500000011',
  role: 'campus_admin',
  tenantId: 'tenant_furqan',
  isActive: true,
};

const systemAdmin: User = {
  id: 'sys_admin_1',
  name: 'مدير النظام العام',
  phone: '0500000099',
  role: 'system_admin',
  isActive: true,
};

const allUsers = [
  teacherA,
  teacherC,
  teacherUnrelated,
  supervisorB_Braem,
  supervisorC_Ashbal,
  campusAdmin,
  campusAdminOtherTenant,
  systemAdmin,
];

// Meeting 1: Created by Teacher A (Braem) with Teacher C invited.
// Supervisor B (Braem supervisor) is NOT in attendees!
// Campus Admin is NOT in attendees!
const meeting1: Meeting = {
  id: 'meet_1',
  tenantId: 'ghazzawi',
  title: 'اجتماع تنسيق خطة الأسبوع',
  date: '2026-09-15',
  startTime: '16:30',
  locationType: 'in_person',
  location: 'قاعة الاجتماعات',
  objectives: ['مراجعة خطة التهجي'],
  agenda: [{ id: 'ag_1', title: 'افتتاحية وتوزيع المهام' }],
  attendees: [
    {
      userId: 'teacher_a',
      name: 'أحمد المعلم',
      role: 'teacher',
      attendanceStatus: 'attended',
    },
    {
      userId: 'teacher_c',
      name: 'علي المعلم',
      role: 'teacher',
      attendanceStatus: 'invited',
    },
  ],
  decisions: [],
  recommendations: [],
  postponedItems: [],
  status: 'scheduled',
  createdBy: 'teacher_a',
  createdByName: 'أحمد المعلم',
  createdByRole: 'teacher',
  createdAt: '2026-09-13T00:00:00Z',
  updatedAt: '2026-09-13T00:00:00Z',
};

// Test Runner
function runTests() {
  console.log('=== STARTING MEETINGS & VISIBILITY UNIT TESTS ===\n');

  let passed = 0;
  let total = 0;

  function assert(testName: string, condition: boolean) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // 1. Creator Visibility
  assert(
    'Creator (Teacher A) can view the meeting',
    canUserViewMeeting(meeting1, teacherA, allHalaqahs, allUsers) === true
  );

  // 2. Invited Attendee Visibility
  assert(
    'Invited Attendee (Teacher C) can view the meeting',
    canUserViewMeeting(meeting1, teacherC, allHalaqahs, allUsers) === true
  );

  // 3. Supervisory Hierarchy: Supervisor B (responsible for Teacher A's stage/halaqah) CAN view even if NOT invited
  assert(
    'Supervisor B (Responsible for Teacher A) can view meeting WITHOUT invitation',
    canUserViewMeeting(meeting1, supervisorB_Braem, allHalaqahs, allUsers) === true
  );

  // 4. Campus Admin: Campus Admin of the tenant CAN view even if NOT invited
  assert(
    'Campus Admin can view meeting in their tenant WITHOUT invitation',
    canUserViewMeeting(meeting1, campusAdmin, allHalaqahs, allUsers) === true
  );

  // 5. Unrelated Supervisor: Supervisor C (responsible for Ashbal only) CANNOT view if not supervising creator and not invited
  // Note: Since Teacher C (Ashbal) is invited in meeting1, Supervisor C is responsible for Teacher C.
  // Let's create meeting2 with only Teacher A invited to test Supervisor C exclusion strictly.
  const meeting2: Meeting = {
    ...meeting1,
    id: 'meet_2',
    attendees: [
      {
        userId: 'teacher_a',
        name: 'أحمد المعلم',
        role: 'teacher',
        attendanceStatus: 'attended',
      },
    ],
  };

  assert(
    'Supervisor C (Ashbal) CANNOT view Teacher A (Braem) meeting when neither invited nor supervising',
    canUserViewMeeting(meeting2, supervisorC_Ashbal, allHalaqahs, allUsers) === false
  );

  // 6. Unrelated Teacher in same tenant CANNOT view
  assert(
    'Unrelated Teacher in same tenant CANNOT view meeting',
    canUserViewMeeting(meeting2, teacherUnrelated, allHalaqahs, allUsers) === false
  );

  // 7. Tenant Isolation: Campus Admin from another tenant CANNOT view
  assert(
    'Campus Admin from another tenant CANNOT view meeting (Tenant Isolation)',
    canUserViewMeeting(meeting1, campusAdminOtherTenant, allHalaqahs, allUsers) === false
  );

  // 8. System Admin can view across the system
  assert(
    'System Admin can view meeting',
    canUserViewMeeting(meeting1, systemAdmin, allHalaqahs, allUsers) === true
  );

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
