import fs from 'fs';

let content = fs.readFileSync('src/data/multiStageRoster.ts', 'utf-8');
content = content.replace(/export const ADDITIONAL_STAGE_STUDENTS: Student\[\] = \[[\s\S]*?\];/g, 'export const ADDITIONAL_STAGE_STUDENTS: Student[] = [];');
content = content.replace(/export const MULTI_STAGE_RECORDS: DailySessionRecord\[\] = \[[\s\S]*?\];/g, 'export const MULTI_STAGE_RECORDS: DailySessionRecord[] = [];');
fs.writeFileSync('src/data/multiStageRoster.ts', content);
console.log('Arrays wiped 4.');
