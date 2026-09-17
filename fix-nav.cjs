const fs = require('fs');
let code = fs.readFileSync('src/lib/navigationConfig.ts', 'utf8');

code = code.replace(/      \] as NavigationItem\[\]\n      \.filter/g, "      ] as NavigationItem[]).filter");
code = code.replace(/items: \[\n/g, "items: ([\n");

fs.writeFileSync('src/lib/navigationConfig.ts', code);
