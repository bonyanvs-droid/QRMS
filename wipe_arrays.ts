import fs from 'fs';

let content = fs.readFileSync('src/data/multiStageRoster.ts', 'utf-8');
content = content.replace(/export const COMPREHENSIVE_HALAQAHS: Halaqah\[\] = \[[\s\S]*?\];/g, 'export const COMPREHENSIVE_HALAQAHS: Halaqah[] = [];');
content = content.replace(/export const COMPREHENSIVE_TEACHERS: Teacher\[\] = \[[\s\S]*?\];/g, 'export const COMPREHENSIVE_TEACHERS: Teacher[] = [];');
content = content.replace(/export const COMPREHENSIVE_USERS: User\[\] = \[[\s\S]*?\];/g, 'export const COMPREHENSIVE_USERS: User[] = [];');
fs.writeFileSync('src/data/multiStageRoster.ts', content);

let content2 = fs.readFileSync('src/data/studentsRoster.ts', 'utf-8');
content2 = content2.replace(/export const INITIAL_STUDENTS: Student\[\] = \[[\s\S]*?\];/g, 'export const INITIAL_STUDENTS: Student[] = [];');
content2 = content2.replace(/export const INITIAL_SESSION_RECORDS: DailySessionRecord\[\] = \[[\s\S]*?\];/g, 'export const INITIAL_SESSION_RECORDS: DailySessionRecord[] = [];');
fs.writeFileSync('src/data/studentsRoster.ts', content2);
console.log('Arrays wiped.');
