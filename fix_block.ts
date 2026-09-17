import fs from 'fs';
let file = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

file = file.replace(/\} else \{ setStudents\(remoteStudents\); \} else if \(activeTenantId === 'al-furqan'\) \{\s*setStudents\(AL_FURQAN_STUDENTS\);\s*\} else \{\s*setStudents\(remoteStudents\);\s*\}/g, '} else { setStudents(remoteStudents); }');

file = file.replace(/if \(true\) \{ setSessionRecords\(remoteRecords\); \} else if \(activeTenantId === 'al-furqan'\) \{\s*setSessionRecords\(AL_FURQAN_SESSION_RECORDS\);\s*\} else \{\s*setSessionRecords\(remoteRecords\);\s*\}/g, 'setSessionRecords(remoteRecords);');

fs.writeFileSync('src/context/AppContext.tsx', file);
