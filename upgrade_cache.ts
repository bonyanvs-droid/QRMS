import fs from 'fs';
let file = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
file = file.replace(/_v3'/g, '_v4\'');
file = file.replace(/_v1'/g, '_v2\'');
fs.writeFileSync('src/context/AppContext.tsx', file);

let appFile = fs.readFileSync('src/App.tsx', 'utf8');
appFile = appFile.replace(/_v3'/g, '_v4\'');
fs.writeFileSync('src/App.tsx', appFile);
