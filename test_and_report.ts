import { config } from './server/config/env';
import fs from 'fs';

const REMOTE_URL = 'https://qrms-dev.schoolscreen.sa/api';
const TOKEN = 'cXJtc2RldjpmMVNvTTZLY1AyQVhZeWFhelQ0TA=='; // Basic auth for qrmsdev:f1SoM6KcP2AXYyaazT4L
const TENANT_ID = 'tenant_1789346881267';

async function remoteFetch(path: string, options: any = {}) {
  const url = `${REMOTE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${TOKEN}`,
      'Accept': 'application/json',
      'X-Tenant-Id': TENANT_ID,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return { status: res.status, data: await res.json() };
}

async function runAudit() {
  const authResults: any = {};

  // Scenario A
  const loginA = await remoteFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '0540647097', password: 'Admin@123456' })
  });
  authResults.A = { status: loginA.status, ok: loginA.data.ok, user: loginA.data.user };

  // Scenario B
  const loginB = await remoteFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '0540647097', password: 'WrongPassword' })
  });
  authResults.B = { status: loginB.status, ok: loginB.data.ok };

  // Scenario C
  const loginC = await remoteFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '0599999999', password: 'Admin@123456' })
  });
  authResults.C = { status: loginC.status, ok: loginC.data.ok };

  // Scenario D
  const loginD = await remoteFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: '0540647097', password: 'PasswordOfAnotherAccount' })
  });
  authResults.D = { status: loginD.status, ok: loginD.data.ok };

  // Find another real user phone
  const allUsersResult = await remoteFetch(`/users?tenantId=${TENANT_ID}`);
  const allUsers: any[] = allUsersResult.data.data || [];
  
  const anotherUser = allUsers.find(u => u.phone && u.phone !== '0540647097' && u.isActive);
  if (anotherUser) {
    // We try to log in with another account if we know password, or just test its identifier with a wrong password to get 401
    const loginE = await remoteFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: anotherUser.phone, password: 'Admin@123456' })
    });
    authResults.E = { status: loginE.status, ok: loginE.data.ok, phone: anotherUser.phone, fullName: anotherUser.fullName };
  } else {
    authResults.E = { status: 'N/A', ok: false, details: 'No other active user found with distinct phone' };
  }

  // Fetch /api/students
  const studentsResult = await remoteFetch(`/students?tenantId=${TENANT_ID}`);
  const remoteStudents: any[] = studentsResult.data.data || [];

  // Fetch /api/halaqahs
  const halaqahsResult = await remoteFetch(`/halaqahs?tenantId=${TENANT_ID}`);
  const halaqahs: any[] = halaqahsResult.data.data || [];

  // Fetch /api/users filtered by tenant
  const activeUsersResult = await remoteFetch(`/users?tenantId=${TENANT_ID}&isArchived=false`);
  const activeUsers: any[] = activeUsersResult.data.data || [];

  const usersWithRoleStudent = allUsers.filter(u => u.role === 'student');
  const activeUsersWithRoleStudent = activeUsers.filter(u => u.role === 'student');

  // Let's filter students inside tenant_1789346881267
  const studentsInTenant = remoteStudents.filter(s => s.tenantId === TENANT_ID);
  const activeStudentsInTenant = studentsInTenant.filter(s => !s.isArchived);

  // Let's perform a comprehensive ID matching between /api/students and /api/users where role = 'student'
  const studentIdsFromStudents = new Set(remoteStudents.map(s => s.id));
  const studentIdsFromUsers = new Set(usersWithRoleStudent.map(u => u.studentId || u.id));

  const missingInStudents = usersWithRoleStudent.filter(u => u.studentId && !studentIdsFromStudents.has(u.studentId));
  const missingInUsers = remoteStudents.filter(s => !studentIdsFromUsers.has(s.id));

  const auditReport = {
    authResults,
    counts: {
      studentsFromStudentsEndpoint: remoteStudents.length,
      studentsFilteredByTenant: studentsInTenant.length,
      activeStudentsFilteredByTenant: activeStudentsInTenant.length,
      allUsers: allUsers.length,
      activeUsers: activeUsers.length,
      allUsersRoleStudent: usersWithRoleStudent.length,
      activeUsersRoleStudent: activeUsersWithRoleStudent.length,
      halaqahs: halaqahs.length,
      teachers: allUsers.filter(u => u.role === 'teacher').length,
      activeTeachers: activeUsers.filter(u => u.role === 'teacher').length
    },
    discrepancy: {
      missingInStudents,
      missingInUsers
    },
    studentsList: remoteStudents.map(s => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      isArchived: s.isArchived,
      tenantId: s.tenantId,
      halaqahId: s.halaqahId,
      halaqahName: s.halaqahName
    })),
    usersStudentList: usersWithRoleStudent.map(u => ({
      id: u.id,
      studentId: u.studentId,
      name: u.name,
      isActive: u.isActive,
      isArchived: u.isArchived,
      tenantId: u.tenantId,
      halaqahId: u.halaqahId,
      halaqahName: u.halaqahName
    }))
  };

  fs.writeFileSync('./audit_results.json', JSON.stringify(auditReport, null, 2));
  console.log('Audit completed and results written to ./audit_results.json successfully.');
}

runAudit().catch(console.error);
