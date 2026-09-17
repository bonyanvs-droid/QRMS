import fs from 'fs';

let content = fs.readFileSync('src/data/studentsRoster.ts', 'utf-8');
content = content.replace(/export const RAW_BARAEM_STUDENTS: Student\[\] = \[[\s\S]*?\];/g, 'export const RAW_BARAEM_STUDENTS: Student[] = [];');
content = content.replace(/export const AL_FURQAN_STUDENTS: Student\[\] = \[[\s\S]*?\];/g, 'export const AL_FURQAN_STUDENTS: Student[] = [];');
content = content.replace(/export const AL_FURQAN_SESSION_RECORDS: DailySessionRecord\[\] = \[[\s\S]*?\];/g, 'export const AL_FURQAN_SESSION_RECORDS: DailySessionRecord[] = [];');
fs.writeFileSync('src/data/studentsRoster.ts', content);
console.log('Arrays wiped 3.');
