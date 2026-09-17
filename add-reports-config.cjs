const fs = require('fs');
let typesCode = fs.readFileSync('src/types/index.ts', 'utf8');

if (!typesCode.includes('interface TenantReportsConfig')) {
  const reportsConfigType = `
export interface TenantReportsConfig {
  headerImageUrl?: string;
  signatureImageUrl?: string;
  footerText?: string;
}
`;
  typesCode = typesCode.replace(/export interface MosqueComplexTenant \{/, reportsConfigType + '\nexport interface MosqueComplexTenant {');
  typesCode = typesCode.replace(/admissionsConfig\?: TenantAdmissionsConfig;/g, 'admissionsConfig?: TenantAdmissionsConfig;\n  reportsConfig?: TenantReportsConfig;');
  fs.writeFileSync('src/types/index.ts', typesCode);
}
