const fs = require('fs');
let typesCode = fs.readFileSync('src/types/index.ts', 'utf8');

if (!typesCode.includes('interface TenantAdmissionsConfig')) {
  const admissionsConfigType = `
export interface TenantAdmissionsConfig {
  isOpen: boolean;
  maxOpenApplications: number;
  openTracks: string[];
  termsAndConditions?: string;
}
`;
  typesCode = typesCode.replace(/export interface MosqueComplexTenant \{/, admissionsConfigType + '\nexport interface MosqueComplexTenant {');
  typesCode = typesCode.replace(/attendanceConfig\?: TenantAttendanceConfig;/g, 'attendanceConfig?: TenantAttendanceConfig;\n  admissionsConfig?: TenantAdmissionsConfig;');
  fs.writeFileSync('src/types/index.ts', typesCode);
}
