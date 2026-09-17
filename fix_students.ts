import fs from 'fs';
let file = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

file = file.replace(/\} else if \(remoteStudents\.length > 0 \|\| activeTenantId === \(INITIAL_TENANTS\[0\]\?\.id \|\| 'ghazzawi'\)\) \{\s*setStudents\(remoteStudents\);\s*\}/g, '} else { setStudents(remoteStudents); }');

file = file.replace(/if \(remoteRecords\.length > 0 \|\| activeTenantId === \(INITIAL_TENANTS\[0\]\?\.id \|\| 'ghazzawi'\)\) \{\s*setSessionRecords\(remoteRecords\);\s*\}/g, 'if (true) { setSessionRecords(remoteRecords); }');

fs.writeFileSync('src/context/AppContext.tsx', file);
