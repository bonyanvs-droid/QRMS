import fs from 'fs';
let file = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
file = file.replace(/\(INITIAL_TENANTS\[0\]\?\.id \|\| 'ghazzawi'\)/g, '(INITIAL_TENANTS[0]?.id)');
fs.writeFileSync('src/context/AppContext.tsx', file);

let appFile = fs.readFileSync('src/App.tsx', 'utf8');
appFile = appFile.replace(/\(INITIAL_TENANTS\[0\]\?\.id \|\| 'ghazzawi'\)/g, '(INITIAL_TENANTS[0]?.id)');
fs.writeFileSync('src/App.tsx', appFile);
