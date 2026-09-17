import fs from 'fs';

let content = fs.readFileSync('src/data/initialData.ts', 'utf-8');
content = content.replace(/export const SEED_STUDENTS: Student\[\] = \[[\s\S]*?\];/g, 'export const SEED_STUDENTS: Student[] = [];');
content = content.replace(/export const SEED_SESSION_RECORDS: DailySessionRecord\[\] = \[[\s\S]*?\];/g, 'export const SEED_SESSION_RECORDS: DailySessionRecord[] = [];');
content = content.replace(/export const SEED_REPORT_LOGS: ReportLog\[\] = \[[\s\S]*?\];/g, 'export const SEED_REPORT_LOGS: ReportLog[] = [];');
content = content.replace(/export const SEED_BADGES: StudentBadge\[\] = \[[\s\S]*?\];/g, 'export const SEED_BADGES: StudentBadge[] = [];');
content = content.replace(/export const SEED_REMEDIAL_PLANS: RemedialActionPlan\[\] = \[[\s\S]*?\];/g, 'export const SEED_REMEDIAL_PLANS: RemedialActionPlan[] = [];');
fs.writeFileSync('src/data/initialData.ts', content);

let content2 = fs.readFileSync('src/data/studentsRoster.ts', 'utf-8');
content2 = content2.replace(/export const SEED_BARAEM_STUDENTS: Student\[\] = \[[\s\S]*?\];/g, 'export const SEED_BARAEM_STUDENTS: Student[] = [];');
fs.writeFileSync('src/data/studentsRoster.ts', content2);
console.log('Arrays wiped.');
